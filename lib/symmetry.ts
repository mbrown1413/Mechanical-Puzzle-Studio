import {Piece, PieceId, Assembly} from "~/lib/Piece.ts"
import {Voxel, Grid, Transform} from "~/lib/Grid.ts"
import {isTranslationCongruent} from "~/lib/placements.ts"
import {clone} from "~/lib/serialize.ts"

export type SymmetryPieceInfo = {
    piece: Piece,
    allowedRotations: Transform[],
    reduction: number,
}

/** Try to find the piece which reduces the problem space as much as possible
 * when used to break symmetry. */
export function findSymmetryPiece(
    grid: Grid,
    goal: Piece,
    pieces: Piece[],
    rotations: Transform[]
): SymmetryPieceInfo | null {
    const goalGroups = getSymmetryGroups(grid, goal, rotations)

    const pieceCounts: Map<PieceId, number> = new Map()
    for(const piece of pieces) {
        const oldCount = pieceCounts.get(piece.id)
        pieceCounts.set(
            piece.id,
            oldCount ? oldCount + 1 : 1
        )
    }

    let bestSymmetry: SymmetryPieceInfo | null = null

    // Consider each piece to reduce symmetries and pick the best one.
    for(const piece of pieces) {

        // Can't use a piece for symmetry if it has more than one copy
        const pieceCount = pieceCounts.get(piece.id)
        if(pieceCount === undefined || pieceCount > 1) {
            continue
        }

        const pieceGroups = getSymmetryGroups(grid, piece, rotations)

        // An orientation is allowed if we'll actually try placing the piece in
        // that orientation, while it's covered if any of the allowed
        // orientations are equivilent to it after accounting for symmetry.
        const allowedOrientations = Array(rotations.length).fill(false)
        const coveredOrientations = Array(rotations.length).fill(false)

        let nPieceSymmetriesReduced = 0
        let nGoalSymmetriesReduced = 0
        for(let i=0; i<rotations.length; i++) {
            if(coveredOrientations[i]) {
                // We've already covered this by symmetry, we don't need to
                // allow it.
                continue
            }

            allowedOrientations[i] = true
            coveredOrientations[i] = true

            // Cover orientations which are equivalent in this piece.
            // We can do this because if the piece itself is symmetrical we
            // don't have to try all of its orientations.
            for(let j=i+1; j<rotations.length; j++) {
                if(!coveredOrientations[j] && pieceGroups[j] === pieceGroups[i]) {
                    coveredOrientations[j] = true
                    nPieceSymmetriesReduced++
                }
            }

            // Cover orientations which are equivalent in goal piece.
            // We can do this because applying an orientation of the goal piece
            // is the same as applying it to an individual piece.
            for(let j=i+1; j<rotations.length; j++) {
                if(!coveredOrientations[j] && goalGroups[j] === goalGroups[i]) {
                    coveredOrientations[j] = true
                    nGoalSymmetriesReduced++
                }
            }
        }

        // How much have we reduced the search space for this piece?
        // Calculate this as a ratio between the number of orientations we
        // have to consider with versus without accounting for goal
        // symmetry.
        const withoutGoalSymmetry = rotations.length - nPieceSymmetriesReduced
        const withGoalSymmetry = withoutGoalSymmetry - nGoalSymmetriesReduced
        const searchSpaceReduction = withoutGoalSymmetry / withGoalSymmetry

        if(searchSpaceReduction <= 1) {
            continue
        }

        if(bestSymmetry === null || searchSpaceReduction > bestSymmetry.reduction) {
            bestSymmetry = {
                piece: piece,
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
 * piece is in.
 */
function getSymmetryGroups(grid: Grid, piece: Piece, orientations: Transform[]): number[] {
    const groups: number[] = []
    const groupPieces: Map<number, Piece> = new Map()
    for(let i=0; i<orientations.length; i++) {
        const orientation = orientations[i]
        const orientedPiece = piece.copy().doTransform(grid, orientation)

        // Does this oriented piece match any previous group?
        let matchingGroup: number | null = null
        for(const [groupNum, groupPiece] of groupPieces.entries()) {
            if(isTranslationCongruent(grid, orientedPiece, groupPiece)) {
                matchingGroup = groupNum
                break
            }
        }

        if(matchingGroup === null) {
            groups[i] = i
            groupPieces.set(i, orientedPiece)
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
    const hashOrigin = grid.getBoundsOrigin(grid.getDefaultPieceBounds())
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
        const transformedAssembly = Piece.transformAssembly(grid, clone(assembly), symmetryTransforms[0])
        const hash = hashAssembly(grid, transformedAssembly, hashOrigin)
        if(assembliesExplored.has(hash)) { continue }
        assembliesExplored.add(hash)

        // We haven't seen any symmetry of this assembly before. We want to
        // output it and track all symmetries of this assembly so they aren't
        // covered again.
        uniqueAssemblies.push(assembly)
        for(const transform of symmetryTransforms.slice(1)) {
            const transformedAssembly = Piece.transformAssembly(grid, clone(assembly), transform)
            const hash = hashAssembly(grid, transformedAssembly, hashOrigin)
            assembliesExplored.add(hash)
        }

    }
    return uniqueAssemblies
}

/**
 * Returns a string representing the assembly which is invariant over
 * translation and piece IDs.
 *
 * This ignores piece IDs entirely and only considers the voxels each piece
 * fills. So if two pieces have an identical shape they will still be treated
 * as they same. This is important for detecting mirrored solutions: two
 * solutions which are mirrors of each other will be detected as the same,
 * even if a mirror pair of pieces makes it so the piece IDs don't match up
 * between them.
 *
 * The origin voxel parameter can be any voxel, but it should be the same each
 * time called so the hash is translation invariant.
 */
function hashAssembly(grid: Grid, assembly: Piece[], origin: Voxel): string {

    // Translate the assembly's bounds origin to `origin`
    const allVoxels = ([] as Voxel[]).concat(...assembly.map(piece => piece.voxels))
    const assemblyOrigin = grid.getBoundsOrigin(grid.getVoxelBounds(...allVoxels))
    const translation = grid.getTranslation(assemblyOrigin, origin)
    Piece.transformAssembly(grid, assembly, translation)

    // Normalize by sorting voxels within pieces, then pieces by their first voxel
    for(const piece of assembly) {
        piece.voxels.sort()
    }
    assembly.sort((piece1, piece2) => {
        // This is made simpler because we shouldn't ever have two pieces
        // covering the same voxel.
        return piece1.voxels[0] < piece2.voxels[0] ? -1 : 1
    })

    const pieceStrings = []
    for(const piece of assembly) {
        pieceStrings.push(piece.voxels.join(";"))
    }
    return pieceStrings.join("\n")
}