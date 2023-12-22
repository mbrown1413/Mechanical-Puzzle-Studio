import {Bounds, Coordinate} from "~lib/types.ts"
import {SerializableClass, registerClass} from "~lib/serialize.ts"
import {Grid} from "~lib/Grid.ts"
import {Problem} from "~lib/Problem.ts"

export class Puzzle extends SerializableClass {
    grid: Grid
    pieces: Map<string, Piece>
    problems: Map<string, Problem>
    
    constructor(id: string, grid: Grid) {
        super(id)
        this.grid = grid
        this.pieces = new Map()
        this.problems = new Map()
    }
    
    addPiece(piece: Piece) {
        if(this.pieces.has(piece.id)) {
            throw `Duplicate piece ID: ${piece.id}`
        }
        this.pieces.set(piece.id, piece)
    }
    
    hasPiece(pieceOrId: Piece | string): boolean {
        let id = typeof pieceOrId === "string" ? pieceOrId : pieceOrId.id
        return this.pieces.has(id)
    }
    
    removePiece(pieceOrId: Piece | string, throwErrors=true) {
        let id = typeof pieceOrId === "string" ? pieceOrId : pieceOrId.id
        if(throwErrors && !this.pieces.has(id)) {
            throw `Piece ID not found ${id}`
        }
        this.pieces.delete(id)
    }
    
    addProblem(problem: Problem): Problem {
        if(this.problems.has(problem.id)) {
            throw `Duplicate problem ID: ${problem.id}`
        }
        this.problems.set(problem.id, problem)
        return problem
    }
    
    hasProblem(problemOrId: Problem | string): boolean {
        let id = typeof problemOrId === "string" ? problemOrId : problemOrId.id
        return this.problems.has(id)
    }
    
    removeProblem(problemOrId: Problem | string, throwErrors=true) {
        let id = typeof problemOrId === "string" ? problemOrId : problemOrId.id
        if(throwErrors && !this.problems.has(id)) {
            throw `Problem ID not found ${id}`
        }
        this.problems.delete(id)
    }
}

export class Piece extends SerializableClass {
    declare id: string
    bounds: Bounds
    coordinates: Coordinate[]
    label: string
    color: string

    constructor(id: string, bounds: Bounds, coordinates: Coordinate[]=[]) {
        super(id)
        this.bounds = bounds
        this.coordinates = coordinates
        this.label = id
        this.color = "#00ff00"
    }

    /*
    getVariations() {
    }
    */

}

registerClass(Puzzle)
registerClass(Piece)