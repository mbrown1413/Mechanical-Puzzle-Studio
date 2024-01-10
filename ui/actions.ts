import {Coordinate, BoolWithReason} from "~lib/types.ts"
import {arraysEqual} from "~lib/utils.ts"
import {Puzzle, Piece} from "~lib/Puzzle.ts"
import {AssemblyProblem, Problem} from "~lib/Problem.ts"


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
            puzzle.generateId("piece", "pieces"),
            puzzle.grid.getDefaultPieceBounds()
        )
        piece.color = puzzle.getNewPieceColor()
        puzzle.addPiece(piece)
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
        const problem = new AssemblyProblem(
            puzzle.generateId("problem", "problems"),
        )
        puzzle.addProblem(problem)
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
        if(problem instanceof AssemblyProblem) {
            // Remove used piece entries with "0" count
            for(const [pieceId, count] of problem.usedPieceCounts.entries()) {
                if(count <= 0) {
                    problem.usedPieceCounts.delete(pieceId)
                }
            }
            // Remove "goal" piece from used pieces
            if(problem.goalPieceId !== null) {
                problem.usedPieceCounts.delete(problem.goalPieceId)
            }
        }
    }
}

export class ProblemSolveAction extends Action {
    problemId: string
    
    constructor(problemId: string) {
        super()
        this.problemId = problemId
    }

    perform(puzzle: Puzzle): BoolWithReason {
        const problem = puzzle.problems.get(this.problemId)
        if(!problem) {
            return {
                bool: false,
                reason: `Problem ID ${this.problemId} not found`
            }
        }
        problem.solutions = null

        const solvers = problem.getSolvers()
        if(problem.solverId === null) {
            return {
                bool: false,
                reason: `No solver selected`
            }
        }
        const solverInfo = solvers[problem.solverId]
        if(!solverInfo) {
            return {
                bool: false,
                reason: "Selected solver is not found"
            }
        }
        if(!solverInfo.isUsable.bool) {
            return {
                bool: false,
                reason: "Solver not usable: " + solverInfo.isUsable.reason
            }
        }
        const solver = new solverInfo.solver()
        const solutions = solver.solve(puzzle, problem)

        problem.solutions = solutions
        return {bool: true}
    }
}