import {Coordinate, BoolWithReason} from "~lib/types.ts"
import {arraysEqual} from "~lib/tools.ts"
import {Puzzle} from "~lib/Puzzle.ts"

export abstract class Action {
    abstract perform(puzzle: Puzzle): BoolWithReason
}

export class AddPieceAction extends Action {
    perform(puzzle: Puzzle): BoolWithReason {
        puzzle.addPiece()
        return {bool: true}
    }
}

export class DeletePiecesAction extends Action {
    pieceIds: string[]

    constructor(pieceIds: string[]) {
        super()
        this.pieceIds = pieceIds
    }
    
    perform(puzzle: Puzzle): BoolWithReason {
        return puzzle.removePieces(this.pieceIds, false)
    }
}

export class EditPieceAction extends Action {
    pieceId: string
    addCoords: Coordinate[]
    removeCoords: Coordinate[]
    
    constructor(
        pieceId: string,
        addCoords: Coordinate[],
        removeCoords: Coordinate[],
    ) {
        super()
        this.pieceId = pieceId
        this.addCoords = addCoords
        this.removeCoords = removeCoords
    }
    
    perform(puzzle: Puzzle): BoolWithReason {
        const piece = puzzle.pieces.get(this.pieceId)
        if(piece === undefined) {
            return {
                bool: false,
                reason: `Piece with ID ${this.pieceId} not found`
            }
        }

        piece.coordinates = piece.coordinates.filter(
            (coord) => !this.removeCoords.some(removeCoord =>
                arraysEqual(removeCoord, coord)
            )
        )
        piece.coordinates.push(...this.addCoords)
        return {bool: true}
    }
}

export type PieceMetadata = {
    label?: string
    color?: string
}

export class EditPieceMetadata extends Action {
    pieceId: string
    metadata: PieceMetadata
    
    constructor(
        pieceId: string,
        metadata: PieceMetadata,
    ) {
        super()
        this.pieceId = pieceId
        this.metadata = metadata
    }
    
    perform(puzzle: Puzzle): BoolWithReason {
        const piece = puzzle.pieces.get(this.pieceId)
        if(piece === undefined) {
            return {
                bool: false,
                reason: `Piece with ID ${this.pieceId} not found`
            }
        }
        
        Object.assign(piece, this.metadata)
        return {bool: true}
    }
}