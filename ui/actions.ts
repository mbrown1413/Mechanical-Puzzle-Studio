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
        const id = prefix+"-"+i
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


////////// Base Classes //////////

export abstract class Action {
    abstract perform(puzzle: Puzzle): BoolWithReason
}

export abstract class EditItemMetadataAction extends Action {
    itemId: string
    metadata: any
    
    static itemName: "Piece" | "Problem"
    static itemAttribute: "pieces" | "problems"
    
    constructor(
        itemId: string,
        metadata: any,
    ) {
        super()
        this.itemId = itemId
        this.metadata = metadata
    }

    perform(puzzle: Puzzle): BoolWithReason {
        const constructor = <typeof EditItemMetadataAction> this.constructor
        const item = puzzle[constructor.itemAttribute].get(this.itemId)
        if(item === undefined) {
            return {
                bool: false,
                reason: `${constructor.itemName} with ID ${this.itemId} not found`
            }
        }
        
        Object.assign(item, this.metadata)
        return {bool: true}
    }
}


////////// Piece Actions //////////

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

export class EditPieceMetadataAction extends EditItemMetadataAction {
    static itemAttribute: "pieces" = "pieces"
    static itemName: "Piece" = "Piece"
    static metadata: {
        label?: string
        color?: string
    }
}


////////// Problem Actions //////////

export class NewProblemAction extends Action {
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

export class EditProblemMetadataAction extends EditItemMetadataAction {
    static itemAttribute: "problems" = "problems"
    static itemName: "Problem" = "Problem"
    static metadata: {
        label?: string
    }
}