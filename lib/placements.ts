import {Piece} from "~/lib/Puzzle.ts"
import {Grid, Voxel} from "~/lib/Grid.ts"

/**
 * Defines a piece's position and orientation on the puzzle's grid.
 */
export type PiecePlacement = {

    /** The piece as defined in the puzzle. */
    originalPieceId: string | null
    originalPiece: Piece

    /**
     * A copy of the piece after it is transformed and moved to a new location.
     */
    transformedPiece: Piece
}

/**
 * Get all possible orientations a piece may be in.
 */
export function *getPieceOrientations(grid: Grid, piece: Piece): Iterable<PiecePlacement> {
    const orientations = grid.getOrientations()
    for(const orientation of orientations) {
        const newVoxels = orientation.orientationFunc(piece.voxels)
        if(newVoxels === null) { continue }
        const transformedPiece = piece.copy()
        transformedPiece.voxels = newVoxels
        yield {
            originalPieceId: piece.id,
            originalPiece: piece.copy(),
            transformedPiece: transformedPiece,
        }
    }
}

/**
 * Get all possible translations for a piece (without changing
 * orientations), given that the voxels in the resulting placement must be
 * in `availableVoxels`.
 */
export function *getPieceTranslations(
    grid: Grid,
    piece: Piece,
    availableVoxels: Voxel[]
): Iterable<PiecePlacement> {
    for(const toVoxel of availableVoxels) {
        const translation = grid.getTranslation(piece.voxels[0], toVoxel)
        if(translation === null) { continue }

        const newVoxels = []
        for(const oldVoxel of piece.voxels) {
            const newVoxel = grid.translate(oldVoxel, translation)
            if(newVoxel === null || !availableVoxels.includes(newVoxel)) {
                break
            }
            newVoxels.push(newVoxel)
        }
        if(newVoxels.length !== piece.voxels.length) {
            continue
        }

        const newPiece = piece.copy()
        newPiece.voxels = newVoxels
        yield {
            originalPieceId: piece.id,
            originalPiece: piece.copy(),
            transformedPiece: newPiece,
        }
    }
}

/**
    * Get all possible placements for a piece, given that all of the
    * transformed piece's voxels must be in `availableVoxels`.
    */
export function *getPiecePlacements(
    grid: Grid,
    piece: Piece,
    availableVoxels: Voxel[]
): Iterable<PiecePlacement> {

    // Deduplicate returned placements
    const usedPlacements: Set<string> = new Set()
    function getPlacementKey(piece: Piece): string {
        const sortedVoxels = [...piece.voxels].sort()
        return sortedVoxels.join(";")
    }

    for(const pieceVariation of getPieceOrientations(grid, piece)) {
        const pieceTranslations = Array.from(getPieceTranslations(
            grid,
            pieceVariation.transformedPiece,
            availableVoxels
        ))
        for(const pieceTranslation of pieceTranslations) {
            const key = getPlacementKey(pieceTranslation.transformedPiece)
            if(usedPlacements.has(key)) continue
            usedPlacements.add(key)

            yield {
                originalPieceId: piece.id,
                originalPiece: piece.copy(),
                transformedPiece: pieceTranslation.transformedPiece,
            }
        }
    }
}