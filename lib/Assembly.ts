import {Coordinate} from "~lib/types.ts"
import {Piece} from "~lib/Puzzle.ts"

export class Assembly {
    // Map pieces to their location.
    // Unplaced pieces have no entry.
    placements: Map<Piece, Coordinate>
    
    // Map location to a piece and the specific unit of that piece which lies
    // in this coordinate. For coordinates with no placed pieces, there is no
    // entry.
    slots: Map<Coordinate, Piece>

    constructor() {
        this.placements = new Map()
        this.slots = new Map()
    }
    
    /*
    checkPieceFit(piece: Piece, coordinate: Coordinate): BoolWithReason {
    }
    
    placePiece(piece: Piece, coordinate: Coordinate, skipChecks=false) {
    }
    */
}