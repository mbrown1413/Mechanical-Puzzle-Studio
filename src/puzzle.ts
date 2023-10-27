import { Coordinate } from "./types.ts"
import { Grid } from "./grid.js"

export class Puzzle {
    grid: Grid
    pieces: Piece[]
    
    constructor(grid: Grid, pieces: Piece[]=[]) {
        this.grid = grid
        this.pieces = pieces
    }
    
    /*
    addPiece(piece: Piece) {
        this.pieces.push(piece)
    }
    */
    
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