import {Grid} from "~/lib/Grid.ts"
import {Piece, PieceWithId, PieceCompleteId} from "~/lib/Piece.ts"
import {Transform} from "~/lib/Grid.ts"

export type Movement = {
    movedPieces: PieceCompleteId[]
    transform: Transform
    placements: PieceWithId[]
    repeat: number
    separates: boolean
}

/**
 * List the ways any single movement can be applied to the given pieces.
 */
export function getMovements(grid: Grid, pieces: PieceWithId[]): Movement[] {
    const availableTransforms = grid.getDisassemblyTransforms()

    // If we're moving more than this many pieces as a group, it's the same as
    // moving the inverse set of pieces in the inverse transform.
    const maxGroupSize = Math.ceil(pieces.length / 2)

    const movements: Movement[] = []
    for(let pieceIdx=0; pieceIdx<pieces.length; pieceIdx++) {
        transformLoop:
        for(const transform of availableTransforms) {
            const piecesCopy = pieces.map(p => p.copy())

            // Indexes of the pieces which are moving together.
            // Although we'll add these pieces when needed, they'll all have
            // the same number of repeat transforms applied.
            const groupedIndexes = [pieceIdx]

            for(let repeat=1; ; repeat++) {

                // Move all pieces currently grouped together
                for(const i of groupedIndexes) {
                    piecesCopy[i].transform(grid, transform)
                }

                while(true) {  // eslint-disable-line no-constant-condition

                    // If transformed piece overlaps other pieces, grab any pieces
                    // which need to move together.
                    const overlappingPieceIndexes = getOverlapping(piecesCopy, groupedIndexes)
                    if(overlappingPieceIndexes.length === 0) {
                        // No overlapping pieces means this piece group is valid for this movement!
                        break
                    } else if(repeat > 1) {
                        // Later we'll have to move the overlapping pieces to
                        // have the same transform repeated the same number of
                        // steps. We could either check each step if the
                        // overlapping piece itself overlaps another, but
                        // instead we just limit ourselves to grouping on
                        // repeat=1. This makes the moves returned slightly
                        // different but still ultimately the same except some
                        // things will take more moves.
                        continue transformLoop
                    }
                    groupedIndexes.push(...overlappingPieceIndexes)

                    if(groupedIndexes.length > maxGroupSize) {
                        continue transformLoop
                    }

                    // Transform newly grouped pieces by the number of repeats
                    // that all the other pieces have already been transformed
                    // by.
                    for(const overlappingIndex of overlappingPieceIndexes) {
                        for(let i=0; i<repeat; i++) {
                            piecesCopy[overlappingIndex].transform(grid, transform)
                        }
                    }

                }

                const groupVoxels = []
                const otherVoxels = []
                for(let i=0; i<pieces.length; i++) {
                    if(groupedIndexes.includes(i)) {
                        groupVoxels.push(...piecesCopy[i].voxels)
                    } else {
                        otherVoxels.push(...piecesCopy[i].voxels)
                    }
                }
                const separates = grid.isSeparate(groupVoxels, otherVoxels)

                movements.push({
                    movedPieces: groupedIndexes.map(i => pieces[i].completeId),
                    transform,
                    placements: piecesCopy.map(p => p.copy()),
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

function getOverlapping(pieces: Piece[], movedIndexes: number[]): number[] {
    const overlappingIndexes: number[] = []

    const movedPieces = pieces.filter(
        (_, i) => movedIndexes.includes(i)
    )
    const unmovedPieces = pieces.filter(
        (_, i) => !movedIndexes.includes(i)
    )

    unmovedPieceLoop:
    for(const unmovedPiece of unmovedPieces) {
        for(const movedPiece of movedPieces) {

            for(const movedVoxel of movedPiece.voxels) {
                if(unmovedPiece.voxels.includes(movedVoxel)) {
                    overlappingIndexes.push(pieces.indexOf(unmovedPiece))
                    continue unmovedPieceLoop
                }
            }

        }
    }
    return overlappingIndexes
}