import {SerializableClass, registerClass} from "~/lib/serialize.ts"
import {Shape, ShapeCompleteId} from "~/lib/Shape.ts"
import {Grid, Transform, Bounds, Voxel} from "~/lib/Grid.ts"
import {clone} from "~/lib/serialize.ts"

export type DisassemblyStep = {
    movedShapes: ShapeCompleteId[]
    transform: Transform
    repeat: number  // Number of times `transform` is repeated
    separates: boolean
}

type StoredDisassemblyData = {
    steps: (DisassemblyStep | string)[]
}

/**
 * A single way to completely disassemble a set of shapes.
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

    /**
     * Perform non-functional edits to make the disassembly read more
     * logically.
     */
    prepareForStorage(grid: Grid, start: Shape[]) {
        this.applyWeights(grid, start)
        this.reorder()
    }

    /**
     * Perform non-functional edits in addition to those done by
     * `prepareForStorage()` to make the disassembly make more sense for
     * display purposes.
     */
    prepareForDisplay(grid: Grid, start: Shape[]) {
        this.spaceSepratedParts(grid, start)
    }

    static postSerialize(disassembly: Disassembly) {
        const stored = disassembly as unknown as StoredDisassemblyData

        stored.steps = disassembly.steps.map(s => {
            const repeatStr = s.repeat !== 1 ? ` repeat=${s.repeat}` : ""
            const separatesStr = s.separates ? " separates" : ""
            return `shapes=${s.movedShapes.join(",")} transform=${s.transform}${repeatStr}${separatesStr}`
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

            // Backwards compatibility: old name for "shapes"
            if(dict.pieces !== undefined && dict.shapes === undefined) {
                dict.shapes = dict.pieces
                delete dict["pieces"]
            }

            disassemblyData.steps[i] = {
                movedShapes: dict.shapes.split(",") as ShapeCompleteId[],
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
     * Get each intermediate placement of shapes between the start and
     * disassembly.
     */
    getState(grid: Grid, start: Shape[], stateNumber: number): Shape[] {
        const state = start.map(shape => shape.copy())
        for(const step of this.steps.slice(0, stateNumber)) {
            performStep(grid, state, step)
        }
        return state
    }

    *getAllStates(grid: Grid, start: Shape[]): Iterable<Shape[]> {
        for(let i=0; i<this.nStates; i++) {
            yield this.getState(grid, start, i)
        }
    }

    getBounds(grid: Grid, start: Shape[]): Bounds {
        const allShapes: Shape[] = []
        for(const state of this.getAllStates(grid, start)) {
            allShapes.push(...state)
        }
        const allShapeBounds = allShapes.map(shape => grid.getVoxelBounds(shape.voxels))
        return grid.getBoundsMax(...allShapeBounds)
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
            //   2. group 1: after the first separation, with shapes moved in the separating step
            //   3. group 2: after the first separation, with shapes not moved in the separating step
            const group1Shapes = steps[separatingIndex].movedShapes
            const group1 = []
            const group2 = []
            for(let i=separatingIndex+1; i<steps.length; i++) {
                const step = steps[i]
                const inGroup1 = group1Shapes.some(
                    idInGroup1 => step.movedShapes.includes(idInGroup1)
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
    spaceSepratedParts(grid: Grid, start: Shape[]) {

        type SeparationEvent = {
            step: DisassemblyStep
            shapeIds1: ShapeCompleteId[]
            shapeIds2: ShapeCompleteId[]
            partIndexes: [number, number]
        }

        let state: Shape[]
        let parts: ShapeCompleteId[][]
        let separations: SeparationEvent[]

        function splitParts(step: DisassemblyStep, movedPartIdx: number) {
            parts.push(parts[movedPartIdx].filter(
                shapeId => !step.movedShapes.includes(shapeId)
            ))
            parts[movedPartIdx] = [...step.movedShapes]
            separations.push({
                step,
                shapeIds1: [...parts[movedPartIdx]],
                shapeIds2: [...parts[parts.length-1]],
                partIndexes: [movedPartIdx, parts.length-1]
            })
        }

        /** Return the latest separation event in which the two given shapes
         * separated. */
        function findSeparationEvent(
            shapeId1: ShapeCompleteId,
            shapeId2: ShapeCompleteId
        ): SeparationEvent | null {
            return separations.findLast((separation) => {
                if(separation.shapeIds1.includes(shapeId1)) {
                    if(separation.shapeIds2.includes(shapeId2)) {
                        return true
                    }
                }
                if(separation.shapeIds2.includes(shapeId1)) {
                    if(separation.shapeIds1.includes(shapeId2)) {
                        return true
                    }
                }
            }) || null
        }

        /** Get all voxels in the given part. */
        function getPartVoxels(part: ShapeCompleteId[]): Voxel[] {
            const voxels = []
            for(const shape of state) {
                if(part.includes(shape.completeId)) {
                    voxels.push(...shape.voxels)
                }
            }
            return voxels
        }

        function findCollidingPart(
            movedPart: ShapeCompleteId[],
            ignoreLatestSeparation: boolean,
        ): ShapeCompleteId[] | null {
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
        const nShapes = start.length
        const nTotalVoxels = start.map(
            shape => shape.voxels.length
        ).reduce(
            (a, b) => a+b
        )
        // Each shape will at most have to move nTotalVoxels plus a spacing of
        // 2 to keep each shape separated on both sides by 1.
        const iterationUpperBound = nShapes * (nTotalVoxels + 2*nShapes)

        iteration: for(let iteration=0; iteration<iterationUpperBound; iteration++) {
            state = start.map(shape => shape.copy())
            parts = [start.map(shape => shape.completeId)]
            separations = []

            for(const step of this.steps) {
                const movedPartIdx = parts.findIndex(
                    part => part.includes(step.movedShapes[0])
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

    /**
     * Flips the movements so each individual step will tend to move lower
     * weighted shapes, rather than move the inverse set of shapes in the
     * opposite direction.
     */
    applyWeights(grid: Grid, shapes: Shape[]) {

        const getShapeFromId = (shapeId: ShapeCompleteId) => {
            const shape = shapes.find(shape => shape.completeId === shapeId)
            if(!shape) {
                throw new Error(`Could not find shape id "${shapeId}" referenced in disassembly`)
            }
            return shape
        }

        const parts = [shapes.map(shape => shape.completeId)]
        for(const step of this.steps) {

            // Find part that this step acts on
            const movedPartIdx = parts.findIndex(
                part => part.includes(step.movedShapes[0])
            )
            const movedPart = parts[movedPartIdx]

            // Consider inverting this step
            const movedShapeIds = movedPart.filter(shapeId => step.movedShapes.includes(shapeId))
            const stationaryShapeIds = movedPart.filter(shapeId => !step.movedShapes.includes(shapeId))
            const movedShapes = movedShapeIds.map(getShapeFromId)
            const stationaryShapes = stationaryShapeIds.map(getShapeFromId)
            if(stepNeedsInverting(movedShapes, stationaryShapes)) {
                step.transform = grid.scaleTransform(step.transform, -1)
                step.movedShapes = stationaryShapeIds
            }

            // Split parts
            if(step.separates) {
                parts.push(parts[movedPartIdx].filter(
                    shapeId => !step.movedShapes.includes(shapeId)
                ))
                parts[movedPartIdx] = [...step.movedShapes]
            }

        }

    }

}
registerClass(Disassembly)

function performStep(
    grid: Grid,
    state: Shape[],
    step: DisassemblyStep,
    ignoreRepeat=false
) {
    const repeat = ignoreRepeat ? 1 : step.repeat || 1
    for(const shape of state) {
        if(step.movedShapes.includes(shape.completeId)) {
            for(let i=0; i<repeat; i++) {
                shape.doTransform(grid, step.transform)
            }
        }
    }
}

function stepNeedsInverting(movedShapes: Shape[], stationaryShapes: Shape[]): boolean {

    function countVoxels(shapes: Shape[]) {
        let nVoxels = 0
        for(const shape of shapes) {
            nVoxels += shape.voxels.length
        }
        return nVoxels
    }

    return countVoxels(movedShapes) > countVoxels(stationaryShapes)
}