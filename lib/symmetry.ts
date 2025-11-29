import {Shape, ShapeId, Assembly} from "~/lib/Shape.ts"
import {Voxel, Grid, Transform} from "~/lib/Grid.ts"
import {isTranslationCongruent} from "~/lib/placements.ts"
import {clone} from "~/lib/serialize.ts"

export type SymmetryShapeInfo = {
    shape: Shape,
    allowedRotations: Transform[],
    reduction: number,
}

/** Try to find the shape which reduces the problem space as much as possible
 * when used to break symmetry. */
export function findSymmetryShape(
    grid: Grid,
    goal: Shape,
    shapes: Shape[],
    rotations: Transform[]
): SymmetryShapeInfo | null {
    const goalGroups = getSymmetryGroups(grid, goal, rotations)

    const shapeCounts: Map<ShapeId, number> = new Map()
    for(const shape of shapes) {
        const oldCount = shapeCounts.get(shape.id)
        shapeCounts.set(
            shape.id,
            oldCount ? oldCount + 1 : 1
        )
    }

    let bestSymmetry: SymmetryShapeInfo | null = null

    // Consider each shape to reduce symmetries and pick the best one.
    for(const shape of shapes) {

        // Can't use a shape for symmetry if it has more than one copy
        const shapeCount = shapeCounts.get(shape.id)
        if(shapeCount === undefined || shapeCount > 1) {
            continue
        }

        const shapeGroups = getSymmetryGroups(grid, shape, rotations)

        // An orientation is allowed if we'll actually try placing the shape in
        // that orientation, while it's covered if any of the allowed
        // orientations are equivilent to it after accounting for symmetry.
        const allowedOrientations = Array(rotations.length).fill(false)
        const coveredOrientations = Array(rotations.length).fill(false)

        let nShapeSymmetriesReduced = 0
        let nGoalSymmetriesReduced = 0
        for(let i=0; i<rotations.length; i++) {
            if(coveredOrientations[i]) {
                // We've already covered this by symmetry, we don't need to
                // allow it.
                continue
            }

            allowedOrientations[i] = true
            coveredOrientations[i] = true

            // Cover orientations which are equivalent in this shape.
            // We can do this because if the shape itself is symmetrical we
            // don't have to try all of its orientations.
            for(let j=i+1; j<rotations.length; j++) {
                if(!coveredOrientations[j] && shapeGroups[j] === shapeGroups[i]) {
                    coveredOrientations[j] = true
                    nShapeSymmetriesReduced++
                }
            }

            // Cover orientations which are equivalent in goal shape.
            // We can do this because applying an orientation of the goal shape
            // is the same as applying it to an individual shape.
            for(let j=i+1; j<rotations.length; j++) {
                if(!coveredOrientations[j] && goalGroups[j] === goalGroups[i]) {
                    coveredOrientations[j] = true
                    nGoalSymmetriesReduced++
                }
            }
        }

        // How much have we reduced the search space for this shape?
        // Calculate this as a ratio between the number of orientations we
        // have to consider with versus without accounting for goal
        // symmetry.
        const withoutGoalSymmetry = rotations.length - nShapeSymmetriesReduced
        const withGoalSymmetry = withoutGoalSymmetry - nGoalSymmetriesReduced
        const searchSpaceReduction = withoutGoalSymmetry / withGoalSymmetry

        if(searchSpaceReduction <= 1) {
            continue
        }

        if(bestSymmetry === null || searchSpaceReduction > bestSymmetry.reduction) {
            bestSymmetry = {
                shape: shape,
                allowedRotations: rotations.filter((_, i) => allowedOrientations[i]),
                reduction: searchSpaceReduction,
            }
        }

    }

    return bestSymmetry
}

/**
 * Returns an array where the position in the array denotes the orientation and
 * the value represents which equivilence group that orientation of the given
 * shape is in.
 */
function getSymmetryGroups(grid: Grid, shape: Shape, orientations: Transform[]): number[] {
    const groups: number[] = []
    const groupShapes: Map<number, Shape> = new Map()
    for(let i=0; i<orientations.length; i++) {
        const orientation = orientations[i]
        const orientedShape = shape.copy().doTransform(grid, orientation)

        // Does this oriented shape match any previous group?
        let matchingGroup: number | null = null
        for(const [groupNum, groupShape] of groupShapes.entries()) {
            if(isTranslationCongruent(grid, orientedShape, groupShape)) {
                matchingGroup = groupNum
                break
            }
        }

        if(matchingGroup === null) {
            groups[i] = i
            groupShapes.set(i, orientedShape)
        } else {
            groups[i] = matchingGroup
        }

    }
    return groups
}

/**
 * Return a filtered list of the given assemblies with only one representative
 * from each group of solutions which are symmetrical to each other.
 */
export function filterSymmetricalAssemblies(
    grid: Grid,
    assemblies: Assembly[],
    mirrorSymmetry=true,
    progressCallback: (percent: number) => void = () => {}
): Assembly[] {
    const symmetryTransforms = grid.getRotations(mirrorSymmetry)

    const progressStepSize = Math.round(assemblies.length / 50)

    const uniqueAssemblies = []
    const assembliesExplored = new Set()
    let i = 0
    for(const assembly of assemblies) {

        // Progress updates
        i++
        if(i % progressStepSize === 0) {
            progressCallback(i / assemblies.length)
        }

        // Check first transform for an entry in `assembliesExplored`.
        // If we find a match, we've already explored all transforms of this
        // assembly.
        const transformedAssembly = Shape.transformAssembly(grid, clone(assembly), symmetryTransforms[0])
        const hash = hashAssembly(grid, transformedAssembly)
        if(assembliesExplored.has(hash)) { continue }
        assembliesExplored.add(hash)

        // We haven't seen any symmetry of this assembly before. We want to
        // output it and track all symmetries of this assembly so they aren't
        // covered again.
        uniqueAssemblies.push(assembly)
        for(const transform of symmetryTransforms.slice(1)) {
            const transformedAssembly = Shape.transformAssembly(grid, clone(assembly), transform)
            const hash = hashAssembly(grid, transformedAssembly)
            assembliesExplored.add(hash)
        }

    }
    return uniqueAssemblies
}

/**
 * Returns a string representing the assembly which is invariant over
 * translation and shape IDs.
 *
 * This ignores shape IDs entirely and only considers the voxels each shape
 * fills. So if two shape have an identical shape they will still be treated
 * as they same. This is important for detecting mirrored solutions: two
 * solutions which are mirrors of each other will be detected as the same,
 * even if a mirror pair of shapes makes it so the shape IDs don't match up
 * between them.
 *
 * The origin voxel parameter can be any voxel, but it should be the same each
 * time called so the hash is translation invariant.
 */
function hashAssembly(grid: Grid, assembly: Assembly): string {

    // Translate the assembly's bounds origin to `origin`
    const allVoxels = ([] as Voxel[]).concat(...assembly.map(shape => shape.voxels))
    const translation = grid.getOriginTranslation(allVoxels)
    Shape.transformAssembly(grid, assembly, translation)

    // Normalize by sorting voxels within shapes, then shapes by their first voxel
    for(const shape of assembly) {
        shape.voxels.sort()
    }
    assembly.sort((shape1, shape2) => {
        // This is made simpler because we shouldn't ever have two shapess
        // covering the same voxel.
        return shape1.voxels[0] < shape2.voxels[0] ? -1 : 1
    })

    const shapeStrings = []
    for(const shape of assembly) {
        shapeStrings.push(shape.voxels.join(";"))
    }
    return shapeStrings.join("\n")
}