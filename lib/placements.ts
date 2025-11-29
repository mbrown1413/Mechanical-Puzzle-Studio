import {Shape, ShapeId} from "~/lib/Shape.ts"
import {Grid, Voxel, Transform} from "~/lib/Grid.ts"
import {findSymmetryShape, SymmetryShapeInfo} from "~/lib/symmetry.ts"

type PlacementsByShape = {[shapeId: ShapeId]: Shape[]}

/**
 * Get all possible orientations a shape may be in.
 */
export function getShapeOrientations(
    grid: Grid,
    shape: Shape,
    allowedRotations: Transform[] | null = null
): Shape[] {
    if(allowedRotations === null) {
        allowedRotations = grid.getRotations(false)
    }

    const placements: Shape[] = []
    for(const rotation of allowedRotations) {
        const transformedShape = shape.copy().doTransform(grid, rotation)

        placements.push(transformedShape)
    }
    return placements
}

/**
 * Get all possible translations for a shape (without changing
 * orientations), given that the voxels in the resulting placement must be
 * in `availableVoxels`.
 */
export function getShapeTranslations(
    grid: Grid,
    shape: Shape,
    availableVoxels: Voxel[],
): Shape[] {
    if(shape.voxels.length === 0) {
        throw new Error(`Shape has no voxels: ${shape.label}`)
    }
    const translations = []
    availableVoxels = [...new Set(availableVoxels)]
    for(const toVoxel of availableVoxels) {
        const translation = grid.getTranslation(shape.voxels[0], toVoxel)
        if(translation === null) { continue }
        const newShape = shape.copy().doTransform(grid, translation)
        if(newShape.voxels.every(v => availableVoxels.includes(v))) {
            translations.push(newShape)
        }
    }
    return translations
}

/**
 * Get all possible placements for a single shape, given that all of the
 * transformed shape's voxels must be in `availableVoxels`.
 */
export function getShapePlacements(
    grid: Grid,
    shape: Shape,
    availableVoxels: Voxel[],
    allowedRotations: Transform[] | null = null
): Shape[] {
    const placements = []

    const orientationPlacements = filterTranslationCongruentPlacements(
        grid,
        getShapeOrientations(grid, shape, allowedRotations)
    )
    for(const shapeOrientation of orientationPlacements) {
        placements.push(...getShapeTranslations(
            grid,
            shapeOrientation,
            availableVoxels
        ))
    }
    return placements
}

/**
 * For each shape given, return the valid placements of that shape given that
 * it must fit into the goal shape.
 */
export function getPlacements(
    grid: Grid,
    goal: Shape,
    shapes: Shape[],
    symmetryReductionCandidates?: Shape[],
): {
    placementsByShape: PlacementsByShape,
    symmetryInfo: SymmetryShapeInfo | null,
} {
    const rotations = grid.getRotations(false)

    let symmetryInfo = null
    if(symmetryReductionCandidates) {
        symmetryInfo = findSymmetryShape(grid, goal, symmetryReductionCandidates, rotations)
    }

    // Enumerate shape placements
    const placementsByShape: PlacementsByShape = {}
    let symmetryBroken = false
    for(const shape of shapes) {
        let allowedRotations: Transform[] | null
        if(
            !symmetryBroken &&
            symmetryInfo?.shape &&
            shape.id === symmetryInfo.shape.id
        ) {
            allowedRotations = symmetryInfo.allowedRotations
            symmetryBroken = true
        } else {
            allowedRotations = null
        }

        placementsByShape[shape.id] = getShapePlacements(
            grid,
            shape,
            goal.voxels,
            allowedRotations
        )
    }

    return {
        placementsByShape: placementsByShape,
        symmetryInfo,
    }
}

/** Filter out placements which are congruent via translation. */
function filterTranslationCongruentPlacements(
    grid: Grid,
    placements: Shape[]
): Shape[] {
    const newPlacements: Shape[] = []
    for(const placement of placements) {
        const existingCongruent = newPlacements.some(
            p => isTranslationCongruent(grid, p, placement)
        )
        if(!existingCongruent) {
            newPlacements.push(placement)
        }
    }
    return newPlacements
}

/** Can one of the shapes be translated to match the other exactly? */
export function isTranslationCongruent(grid: Grid, shape1: Shape, shape2: Shape): boolean {
    const translation1 = grid.getOriginTranslation(shape1.voxels)
    const translation2 = grid.getOriginTranslation(shape2.voxels)
    const shape1Translated = shape1.copy().doTransform(grid, translation1)
    const shape2Translated = shape2.copy().doTransform(grid, translation2)
    return shape1Translated.equals(shape2Translated)
}
