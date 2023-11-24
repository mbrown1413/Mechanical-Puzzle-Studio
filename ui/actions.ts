import {Coordinate, BoolWithReason} from "~lib/types.ts"
import {arraysEqual} from "~lib/tools.ts"
import {getNextColor} from "~lib/colors.ts"
import {Puzzle, Piece} from "~lib/Puzzle.ts"
import {Problem} from "~lib/Problem.ts"

function generateId(
    puzzle: Puzzle,
    prefix: string,
    listAttribute: "pieces"|"problems"
): string {
    //TODO: Make this O(1), not O(n)
    for(let i=0; ; i++) {
        const id = prefix+i
        if(!puzzle[listAttribute].has(id)) {
            return id
        }
    }
}

function getNewPieceColor(puzzle: Puzzle): string {
    const piecesList = Array.from(puzzle.pieces.values())
    const existingColors = piecesList.map((piece) => piece.color)
    return getNextColor(existingColors)
}

export abstract class Action {
    abstract perform(puzzle: Puzzle): BoolWithReason
}

export class NewPieceAction extends Action {
    perform(puzzle: Puzzle): BoolWithReason {
        const piece = new Piece(generateId(puzzle, "piece", "pieces"), [])
        piece.color = getNewPieceColor(puzzle)
        puzzle.addPiece(piece)
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
        const missingIds = []
        for(const id of this.pieceIds) {
            if(!puzzle.hasPiece(id)) {
                missingIds.push(id)
            }
        }
        if(missingIds.length) {
            return {
                bool: false,
                reason: `Piece IDs not found: ${missingIds}`
            }
        }
        
        for(const id of this.pieceIds) {
            puzzle.removePiece(id)
        }
        return {bool: true}
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

export class AddProblemAction extends Action {
    perform(puzzle: Puzzle): BoolWithReason {
        const problem = new Problem(
            generateId(puzzle, "problem", "problems"),
            []
        )
        puzzle.addProblem(problem)
        return {bool: true}
    }
}

export class DeleteProblemsAction extends Action {
    problemIds: string[]

    constructor(problemIds: string[]) {
        super()
        this.problemIds = problemIds
    }
    
    perform(puzzle: Puzzle): BoolWithReason {
        const missingIds = []
        for(const id of this.problemIds) {
            if(!puzzle.hasProblem(id)) {
                missingIds.push(id)
            }
        }
        if(missingIds.length) {
            return {
                bool: false,
                reason: `Problem IDs not found: ${missingIds}`
            }
        }
        
        for(const id of this.problemIds) {
            puzzle.removeProblem(id)
        }
        return {bool: true}
    }
}