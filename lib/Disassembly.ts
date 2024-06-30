import {SerializableClass, registerClass} from "~/lib/serialize.ts"
import {Piece, PieceCompleteId} from "~/lib/Piece.ts"
import {Grid, Transform, Bounds, Voxel} from "~/lib/Grid.ts"
import {clone} from "~/lib/serialize.ts"

export type DisassemblyStep = {
    movedPieces: PieceCompleteId[]
    transform: Transform
    repeat: number  // Number of times `transform` is repeated
    separates: boolean
}

type StoredDisassemblyData = {
    steps: (DisassemblyStep | string)[]
}

/**
 * A single way to completely disassemble a set of pieces.
 */
export class Disassembly extends SerializableClass {
    steps: DisassemblyStep[]

    constructor(steps: DisassemblyStep[]) {
        super()
        this.steps = steps
    }

    copy() {
        return clone(this)
    }

    static postSerialize(disassembly: Disassembly) {
        const stored = disassembly as unknown as StoredDisassemblyData

        stored.steps = disassembly.steps.map(s => {
            const repeatStr = s.repeat > 1 ? ` repeat=${s.repeat}` : ""
            const separatesStr = s.separates ? " separates" : ""
            return `pieces=${s.movedPieces.join(",")} transform=${s.transform}${repeatStr}${separatesStr}`
        })
    }

    static preDeserialize(stored: StoredDisassemblyData) {
        const disassemblyData = stored as unknown as Disassembly

        for(let i=0; i<stored.steps.length; i++) {
            const storedStep = stored.steps[i]
            if(typeof storedStep !== "string") { continue }

            const parts = storedStep.split(" ")
            const dict: {[key: string]: string} = {}
            for(const part of parts) {
                const [key, value] = part.split("=", 2)
                dict[key] = value
            }

            disassemblyData.steps[i] = {
                movedPieces: dict.pieces.split(",") as PieceCompleteId[],
                transform: dict.transform,
                repeat: dict.repeat === undefined ? 1 : Number(dict.repeat),
                separates: "separates" in dict && dict.separates !== "false",
            }
        }
    }

    get nStates() {
        return this.steps.length + 1
    }

    /** Return the number of steps until the first part separates. */
    get stepsToFirstSeparation(): number {
        let i = 0
        for(const step of this.steps) {
            i++
            if(step.separates) return i
        }
        return Infinity
    }

    /** Returns a string describing the number of steps between each
     * separation.  */
    get detailString(): string {
        const movesBetweenSeparations: number[] = []

        let i = 0
        for(const step of this.steps) {
            i++
            if(step.separates) {
                movesBetweenSeparations.push(i)
                i = 0
            }
        }

        return movesBetweenSeparations.join(".")
    }

    /**
     * Get each intermediate placement of pieces between the start and
     * disassembly.
     */
    getState(grid: Grid, start: Piece[], stateNumber: number): Piece[] {
        const state = start.map(piece => piece.copy())
        for(const step of this.steps.slice(0, stateNumber)) {
            performStep(grid, state, step)
        }
        return state
    }

    *getAllStates(grid: Grid, start: Piece[]): Iterable<Piece[]> {
        for(let i=0; i<this.nStates; i++) {
            yield this.getState(grid, start, i)
        }
    }

    getBounds(grid: Grid, start: Piece[]): Bounds {
        const allPieces: Piece[] = []
        for(const state of this.getAllStates(grid, start)) {
            allPieces.push(...state)
        }
        const allPieceBounds = allPieces.map(piece => grid.getVoxelBounds(...piece.voxels))
        return grid.getBoundsMax(...allPieceBounds)
    }

    /**
     * Reorder steps so each time a move separates the assembly into two
     * subassemblies, all of the moves from the first subassembly are done
     * before the second. In order words, this orders the moves to be
     * depth-first.
     */
    reorder() {

        const recurse = (steps: DisassemblyStep[]): DisassemblyStep[] => {
            const separatingIndex = steps.findIndex(step => step.separates)
            if(separatingIndex === -1) {
                return steps
            }

            // Separate steps into 3 groups:
            //   1. up to and including the first separation
            //   2. group 1: after the first separation, with pieces moved in the separating step
            //   3. group 2: after the first separation, with pieces not moved in the separating step
            const group1Pieces = steps[separatingIndex].movedPieces
            const group1 = []
            const group2 = []
            for(let i=separatingIndex+1; i<steps.length; i++) {
                const step = steps[i]
                const inGroup1 = group1Pieces.some(
                    idInGroup1 => step.movedPieces.includes(idInGroup1)
                )
                if(inGroup1) {
                    group1.push(step)
                } else {
                    group2.push(step)
                }
            }

            return [
                ...steps.slice(0, separatingIndex+1),
                ...recurse(group1),
                ...recurse(group2),
            ]
        }

        this.steps = recurse(this.steps)
    }

    /**
     * Space parts during disassembly so separate parts don't touch even when
     * placed on the same grid.
     *
     * When a disassembly step separates one part into two, those parts are
     * logically considered to be on two separate grids. As such, it is fine if
     * one of the parts ends up touching another during further disassembly
     * steps. However, if we're trying to view this disassembly, we may want to
     * show all these parts on the same grid. This method increaces the
     * separation between separate parts so they can be placed on the same grid
     * and viewed proprely.
     */
    spaceSepratedParts(grid: Grid, start: Piece[]) {

        type SeparationEvent = {
            step: DisassemblyStep
            pieceIds1: PieceCompleteId[]
            pieceIds2: PieceCompleteId[]
            partIndexes: [number, number]
        }

        let state: Piece[]
        let parts: PieceCompleteId[][]
        let separations: SeparationEvent[]

        function splitParts(step: DisassemblyStep, movedPartIdx: number) {
            parts.push(parts[movedPartIdx].filter(
                pieceId => !step.movedPieces.includes(pieceId)
            ))
            parts[movedPartIdx] = [...step.movedPieces]
            separations.push({
                step,
                pieceIds1: [...parts[movedPartIdx]],
                pieceIds2: [...parts[parts.length-1]],
                partIndexes: [movedPartIdx, parts.length-1]
            })
        }

        /** Return the latest separation event in which the two given pieces
         * separated. */
        function findSeparationEvent(
            pieceId1: PieceCompleteId,
            pieceId2: PieceCompleteId
        ): SeparationEvent | null {
            return separations.findLast((separation) => {
                if(separation.pieceIds1.includes(pieceId1)) {
                    if(separation.pieceIds2.includes(pieceId2)) {
                        return true
                    }
                }
                if(separation.pieceIds2.includes(pieceId1)) {
                    if(separation.pieceIds1.includes(pieceId2)) {
                        return true
                    }
                }
            }) || null
        }

        /** Get all voxels in the given part. */
        function getPartVoxels(part: PieceCompleteId[]): Voxel[] {
            const voxels = []
            for(const piece of state) {
                if(part.includes(piece.completeId)) {
                    voxels.push(...piece.voxels)
                }
            }
            return voxels
        }

        function findCollidingPart(
            movedPart: PieceCompleteId[],
            ignoreLatestSeparation: boolean,
        ): PieceCompleteId[] | null {
            let partsForConsideration = parts
            if(ignoreLatestSeparation) {
                const separation = separations[separations.length-1]
                partsForConsideration = parts.filter(
                    (_, i) => !separation.partIndexes.includes(i)
                )
            }

            const movedPartVoxels = getPartVoxels(movedPart)
            for(const otherPart of partsForConsideration) {
                if(otherPart === movedPart) { continue }

                // We want separation with a 1-voxel gap, so we add voxels
                // around a 1-voxel border of otherPart.
                const otherPartVoxels = getPartVoxels(otherPart)
                for(const transform of grid.getDisassemblyTransforms()) {
                    otherPartVoxels.push(
                        ...grid.doTransform(transform, otherPartVoxels)
                    )
                }

                if(!grid.isSeparate(movedPartVoxels, otherPartVoxels)) {
                    return otherPart
                }
            }
            return null
        }

        // Establish an upper bound for how many iterations we may need. This
        // protects against bugs and possibly malformed disassemblies from
        // making an infinite loop
        const nPieces = start.length
        const nTotalVoxels = start.map(
            piece => piece.voxels.length
        ).reduce(
            (a, b) => a+b
        )
        // Each piece will at most have to move nTotalVoxels plus a spacing of
        // 2 to keep each piece separated on both sides by 1.
        const iterationUpperBound = nPieces * (nTotalVoxels + 2*nPieces)

        iteration: for(let iteration=0; iteration<iterationUpperBound; iteration++) {
            state = start.map(piece => piece.copy())
            parts = [start.map(piece => piece.completeId)]
            separations = []

            for(const step of this.steps) {
                const movedPartIdx = parts.findIndex(
                    part => part.includes(step.movedPieces[0])
                )

                if(step.separates) {
                    splitParts(step, movedPartIdx)
                }
                const movedPart = parts[movedPartIdx]

                for(let repeat=0; repeat<step.repeat; repeat++) {
                    performStep(grid, state, step, true)

                    const collidingPart = findCollidingPart(
                        movedPart,
                        // When separating, only consider collisions with the
                        // part you're separating with on last repeat.
                        step.separates && repeat<step.repeat-1
                    )
                    if(collidingPart) {
                        // Find the place where colliding parts separated and
                        // increase the distance between them
                        const separation = findSeparationEvent(
                            movedPart[0],
                            collidingPart[0]
                        )
                        if(!separation) { throw new Error("Bug: Separation not found") }
                        separation.step.repeat += 1
                        continue iteration
                    }
                }
            }

            // Completed all steps without any collisions! We're done
            return
        }
    }

}
registerClass(Disassembly)

function performStep(
    grid: Grid,
    state: Piece[],
    step: DisassemblyStep,
    ignoreRepeat=false
) {
    const repeat = ignoreRepeat ? 1 : step.repeat || 1
    for(const piece of state) {
        if(step.movedPieces.includes(piece.completeId)) {
            for(let i=0; i<repeat; i++) {
                piece.transform(grid, step.transform)
            }
        }
    }
}