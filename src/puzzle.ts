import { Coordinate } from "./types.ts"
import { Grid } from "./grid.js"
import { BoolWithReason } from "./types.ts"

export class Puzzle {
    grid: Grid
    pieces: Map<string, Piece>
    
    constructor(grid: Grid, pieces: Piece[]=[]) {
        this.grid = grid
        this.pieces = new Map()

        for(const piece of pieces) {
            this.addPiece(piece)
        }
    }
    
    generatePieceId(): string {
        //TODO: Make this O(1), not O(n)
        for(let i=0; ; i++) {
            const id = "piece-"+i
            if(!this.pieces.has(id)) {
                return id
            }
        }
    }

    addPiece(piece: Piece | null = null): Piece {
        if(piece === null) {
            piece = new Piece(this.generatePieceId(), [])
        }
        if(this.pieces.has(piece.id)) {
            throw `Duplicate piece ID: ${piece.id}`
        }
        this.pieces.set(piece.id, piece)
        return piece
    }
    
    removePieces(pieceOrIds: Array<Piece | string>, throwErrors=true): BoolWithReason {
        // Get list of IDs and track ones we're missing
        const ids = []
        const missingIds = []
        for(const pieceOrId of pieceOrIds) {
            const id = typeof pieceOrId === "string" ? pieceOrId : pieceOrId.id
            const piece = this.pieces.get(id)
            if(piece === undefined) {
                missingIds.push(id)
            } else {
                ids.push(piece.id)
            }
        }

        if(missingIds.length) {
            const reason = `Piece IDs not found ${missingIds}`
            if(throwErrors) {
                throw reason
            }
            return {bool: false, reason}
        }
        
        for(const id of ids) {
            this.pieces.delete(id)
        }
        return {bool: true}
    }
}

export class Piece {
    id: string
    coordinates: Coordinate[]

    constructor(id: string, coordinates: Coordinate[]) {
        this.id = id
        this.coordinates = coordinates
    }
    
    /*
    getVariations() {
    }
    */

}