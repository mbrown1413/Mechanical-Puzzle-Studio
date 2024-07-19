import {Piece, PieceId} from "~/lib/Piece.ts"
import {Grid, Voxel, Transform} from "~/lib/Grid.ts"
import {findSymmetryPiece, SymmetryPieceInfo} from "~/lib/symmetry.ts"

type PlacementsByPiece = {[pieceId: PieceId]: Piece[]}

/**
 * Get all possible orientations a piece may be in.
 */
export function getPieceOrientations(
    grid: Grid,
    piece: Piece,
    allowedRotations: Transform[] | null = null
): Piece[] {
    if(allowedRotations === null) {
        allowedRotations = grid.getRotations(false)
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
 * Get all possible placements for a single piece, given that all of the
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

/**
 * For each piece given, return the valid placements of that piece given that
 * it must fit into the goal piece.
 */
export function getPlacements(
    grid: Grid,
    goal: Piece,
    pieces: Piece[],
    symmetryReductionCandidates?: Piece[],
): {
    placementsByPiece: PlacementsByPiece,
    symmetryInfo: SymmetryPieceInfo | null,
} {
    const rotations = grid.getRotations(false)

    let symmetryInfo = null
    if(symmetryReductionCandidates) {
        symmetryInfo = findSymmetryPiece(grid, goal, symmetryReductionCandidates, rotations)
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

        placementsByPiece[piece.id] = getPiecePlacements(
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
export function isTranslationCongruent(grid: Grid, piece1: Piece, piece2: Piece): boolean {

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
