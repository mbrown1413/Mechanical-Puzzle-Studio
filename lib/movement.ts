import {Grid} from "~/lib/Grid.ts"
import {Shape, ShapeCompleteId} from "~/lib/Shape.ts"
import {Transform} from "~/lib/Grid.ts"

export type Movement = {
    movedShapes: ShapeCompleteId[]
    transform: Transform
    placements: Shape[]
    repeat: number
    separates: boolean
}

/**
 * List the ways any single movement can be applied to the given shapes.
 */
export function getMovements(grid: Grid, shapes: Shape[]): Movement[] {
    const availableTransforms = grid.getDisassemblyTransforms()

    // If we're moving more than this many shapes as a group, it's the same as
    // moving the inverse set of shapes in the inverse transform.
    const maxGroupSize = Math.ceil(shapes.length / 2)

    const movements: Movement[] = []
    for(let shapeIdx=0; shapeIdx<shapes.length; shapeIdx++) {
        transformLoop:
        for(const transform of availableTransforms) {
            const shapesCopy = shapes.map(p => p.copy())

            // Indexes of the shapes which are moving together.
            // Although we'll add these shapes when needed, they'll all have
            // the same number of repeat transforms applied.
            const groupedIndexes = [shapeIdx]

            for(let repeat=1; ; repeat++) {

                // Move all shapes currently grouped together
                for(const i of groupedIndexes) {
                    shapesCopy[i].doTransform(grid, transform)
                }

                while(true) {  // eslint-disable-line no-constant-condition

                    // If transformed shape overlaps other shapes, grab any shapes
                    // which need to move together.
                    const overlappingShapeIndexes = getOverlapping(shapesCopy, groupedIndexes)
                    if(overlappingShapeIndexes.length === 0) {
                        // No overlapping shapes means this shape group is valid for this movement!
                        break
                    } else if(repeat > 1) {
                        // Later we'll have to move the overlapping shapes to
                        // have the same transform repeated the same number of
                        // steps. We could either check each step if the
                        // overlapping shape itself overlaps another, but
                        // instead we just limit ourselves to grouping on
                        // repeat=1. This makes the moves returned slightly
                        // different but still ultimately the same except some
                        // things will take more moves.
                        continue transformLoop
                    }
                    groupedIndexes.push(...overlappingShapeIndexes)

                    if(groupedIndexes.length > maxGroupSize) {
                        continue transformLoop
                    }

                    // Transform newly grouped shapes by the number of repeats
                    // that all the other shapes have already been transformed
                    // by.
                    for(const overlappingIndex of overlappingShapeIndexes) {
                        for(let i=0; i<repeat; i++) {
                            shapesCopy[overlappingIndex].doTransform(grid, transform)
                        }
                    }

                }

                const groupVoxels = []
                const otherVoxels = []
                for(let i=0; i<shapes.length; i++) {
                    if(groupedIndexes.includes(i)) {
                        groupVoxels.push(...shapesCopy[i].voxels)
                    } else {
                        otherVoxels.push(...shapesCopy[i].voxels)
                    }
                }
                const separates = grid.isSeparate(groupVoxels, otherVoxels)

                movements.push({
                    movedShapes: groupedIndexes.map(i => shapes[i].completeId),
                    transform,
                    placements: shapesCopy.map(p => p.copy()),
                    repeat,
                    separates,
                })

                if(separates) {
                    continue transformLoop
                }

            }

        }
    }
    return movements
}

function getOverlapping(shapes: Shape[], movedIndexes: number[]): number[] {
    const overlappingIndexes: number[] = []

    const movedShapes = shapes.filter(
        (_, i) => movedIndexes.includes(i)
    )
    const unmovedShapes = shapes.filter(
        (_, i) => !movedIndexes.includes(i)
    )

    unmovedShapeLoop:
    for(const unmovedShape of unmovedShapes) {
        for(const movedShape of movedShapes) {

            for(const movedVoxel of movedShape.voxels) {
                if(unmovedShape.voxels.includes(movedVoxel)) {
                    overlappingIndexes.push(shapes.indexOf(unmovedShape))
                    continue unmovedShapeLoop
                }
            }

        }
    }
    return overlappingIndexes
}