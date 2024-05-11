import {SerializableClass, registerClass} from "~/lib/serialize.ts"
import {Piece, PieceWithId, PieceCompleteId} from "~/lib/Piece.ts"
import {Grid, Transform, Bounds} from "~/lib/Grid.ts"
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

    /**
     * Get each intermediate placement of pieces between the start and
     * disassembly.
     */
    getState(grid: Grid, start: PieceWithId[], stateNumber: number): PieceWithId[] {
        const state = start.map(piece => piece.copy())
        for(const step of this.steps.slice(0, stateNumber)) {
            for(const piece of state) {
                if(step.movedPieces.includes(piece.completeId)) {
                    for(let i=0; i<(step.repeat || 1); i++) {
                        piece.transform(grid, step.transform)
                    }
                }
            }
        }
        return state
    }

    *getAllStates(grid: Grid, start: PieceWithId[]): Iterable<PieceWithId[]> {
        for(let i=0; i<this.nStates; i++) {
            yield this.getState(grid, start, i)
        }
    }

    getBounds(grid: Grid, start: PieceWithId[]): Bounds {
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
     * depth-first, instead of whatever came out of the assembler (likely
     * breadth-first).
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
}
registerClass(Disassembly)