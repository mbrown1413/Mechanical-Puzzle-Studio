import {Piece, PieceWithId, PieceId, PieceCompleteId} from "~/lib/Piece.ts"
import {Grid, Voxel, Transform} from "~/lib/Grid.ts"

type PlacementsByPiece = {[pieceId: PieceCompleteId]: Piece[]}

type SymmetryInfo = {
    piece: Piece,
    allowedRotations: Transform[],
    reduction: number,
}

/**
 * Get all possible orientations a piece may be in.
 */
export function getPieceOrientations(
    grid: Grid,
    piece: Piece,
    allowedRotations: Transform[] | null = null
): Piece[] {
    if(allowedRotations === null) {
        allowedRotations = grid.getRotations()
    }

    const placements: Piece[] = []
    for(const rotation of allowedRotations) {
        const transformedPiece = piece.copy().transform(grid, rotation)

        placements.push(transformedPiece)
    }
    return placements
}

/**
 * Get all possible translations for a piece (without changing
 * orientations), given that the voxels in the resulting placement must be
 * in `availableVoxels`.
 */
export function getPieceTranslations(
    grid: Grid,
    piece: Piece,
    availableVoxels: Voxel[],
): Piece[] {
    const translations = []
    availableVoxels = [...new Set(availableVoxels)]
    for(const toVoxel of availableVoxels) {
        const translation = grid.getTranslation(piece.voxels[0], toVoxel)
        const newPiece = piece.copy().transform(grid, translation)
        if(newPiece.voxels.every(v => availableVoxels.includes(v))) {
            translations.push(newPiece)
        }
    }
    return translations
}

/**
 * Get all possible placements for a piece, given that all of the
 * transformed piece's voxels must be in `availableVoxels`.
 */
export function getPiecePlacements(
    grid: Grid,
    piece: Piece,
    availableVoxels: Voxel[],
    allowedRotations: Transform[] | null = null
): Piece[] {
    const placements = []

    const orientationPlacements = filterTranslationCongruentPlacements(
        grid,
        getPieceOrientations(grid, piece, allowedRotations)
    )
    for(const pieceOrientation of orientationPlacements) {
        placements.push(...getPieceTranslations(
            grid,
            pieceOrientation,
            availableVoxels
        ))
    }
    return placements
}

export function getPlacements(
    grid: Grid,
    goal: Piece,
    pieces: PieceWithId[],
    removeSymmetries: boolean,
): {
    placementsByPiece: PlacementsByPiece,
    symmetryInfo: SymmetryInfo | null,
} {
    const rotations = grid.getRotations()

    let symmetryInfo = null
    if(removeSymmetries) {
        symmetryInfo = findSymmetryPiece(grid, goal, pieces, rotations)
    }

    // Enumerate piece placements
    const placementsByPiece: PlacementsByPiece = {}
    let symmetryBroken = false
    for(const piece of pieces) {
        let allowedRotations: Transform[] | null
        if(
            !symmetryBroken &&
            symmetryInfo?.piece &&
            piece.id === symmetryInfo.piece.id
        ) {
            allowedRotations = symmetryInfo.allowedRotations
            symmetryBroken = true
        } else {
            allowedRotations = null
        }

        placementsByPiece[piece.completeId] = getPiecePlacements(
            grid,
            piece,
            goal.voxels,
            allowedRotations
        )
    }

    return {
        placementsByPiece,
        symmetryInfo,
    }
}

/** Try to find the piece which reduces the problem space as much as possible
 * when used to break symmetry. */
function findSymmetryPiece(
    grid: Grid,
    goal: Piece,
    pieces: PieceWithId[],
    rotations: Transform[]
): SymmetryInfo | null {
    const goalGroups = getSymmetryGroups(grid, goal, rotations)

    const pieceCounts: Map<PieceId, number> = new Map()
    for(const piece of pieces) {
        const oldCount = pieceCounts.get(piece.id)
        pieceCounts.set(
            piece.id,
            oldCount ? oldCount + 1 : 1
        )
    }

    let bestSymmetry: SymmetryInfo | null = null

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
        const orientedPiece = piece.copy().transform(grid, orientation)

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

/** Filter out placements which are congruent via translation. */
function filterTranslationCongruentPlacements(
    grid: Grid,
    placements: Piece[]
): Piece[] {
    const newPlacements: Piece[] = []
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

/** Can one of the pieces be translated to match the other exactly? */
function isTranslationCongruent(grid: Grid, piece1: Piece, piece2: Piece): boolean {

    // Establish one as stationary and the other we try translating to every
    // voxel on the fixed piece to see if they match.
    let fixedPiece: Piece
    let nonFixedPiece: Piece
    if(piece1.voxels.length < piece2.voxels.length) {
        fixedPiece = piece1
        nonFixedPiece = piece2
    } else {
        fixedPiece = piece2
        nonFixedPiece = piece1
    }

    for(const dest of fixedPiece.voxels) {
        const translation = grid.getTranslation(nonFixedPiece.voxels[0], dest)
        const tempPiece = nonFixedPiece.copy().transform(grid, translation)

        if(tempPiece.equals(fixedPiece)) {
            return true
        }
    }

    return false
}
