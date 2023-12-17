import {Coordinate, BoolWithReason} from "~lib/types.ts"
import {arraysEqual} from "~lib/utils.ts"
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
        this.postEdit(item)
        return {bool: true}
    }

    postEdit(_item: Piece | Problem) { }
}

abstract class DeleteItemsAction extends Action {
    static itemAttribute: "pieces" | "problems"
    static itemName: "Piece" | "Problem"
    itemIds: string[]

    constructor(itemIds: string[]) {
        super()
        this.itemIds = itemIds
    }
    
    perform(puzzle: Puzzle): BoolWithReason {
        const constructor = <typeof DeleteItemsAction> this.constructor
        const itemMap = puzzle[constructor.itemAttribute]

        const missingIds = []
        for(const id of this.itemIds) {
            if(!itemMap.has(id)) {
                missingIds.push(id)
            }
        }
        if(missingIds.length) {
            return {
                bool: false,
                reason: `${constructor.itemName} IDs not found: ${missingIds}`
            }
        }
        
        for(const id of this.itemIds) {
            itemMap.delete(id)
        }
        return {bool: true}
    }

}


////////// Piece Actions //////////

export class NewPieceAction extends Action {
    perform(puzzle: Puzzle): BoolWithReason {
        const piece = new Piece(
            generateId(puzzle, "piece", "pieces"),
            puzzle.grid.getDefaultPieceBounds()
        )
        piece.color = getNewPieceColor(puzzle)
        puzzle.pieces.set(piece.id, piece)
        return {bool: true}
    }
}

export class DeletePiecesAction extends DeleteItemsAction {
    static itemAttribute: "pieces" = "pieces"
    static itemName: "Piece" = "Piece"
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
        )
        puzzle.problems.set(problem.id, problem)
        return {bool: true}
    }
}

export class DeleteProblemsAction extends DeleteItemsAction {
    static itemAttribute: "problems" = "problems"
    static itemName: "Problem" = "Problem"
}

export class EditProblemMetadataAction extends EditItemMetadataAction {
    static itemAttribute: "problems" = "problems"
    static itemName: "Problem" = "Problem"
    static metadata: {
        label?: string
    }
    
    postEdit(problem: Problem) {
        // Remove used piece entries with "0" count
        for(const [pieceId, count] of problem.usedPieceCounts.entries()) {
            if(count <= 0) {
                problem.usedPieceCounts.delete(pieceId)
            }
        }
    }
}