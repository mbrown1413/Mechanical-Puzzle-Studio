import { Coordinate } from "./types.ts"
import { Grid } from "./grid.js"

export class Puzzle {
    grid: Grid
    pieces: Piece[]
    
    constructor(grid: Grid) {
        this.grid = grid
        this.pieces = []
    }
    
    /*
    addPiece(piece: Piece) {
        this.pieces.push(piece)
    }
    */
    
}

export class Piece {
    coordinates: Coordinate[]

    constructor(coordinates: Coordinate[]) {
        this.coordinates = coordinates
    }
    
    /*
    getVariations() {
    }
    */

}