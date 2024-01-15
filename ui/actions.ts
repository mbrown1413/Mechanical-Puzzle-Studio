import {Voxel, BoolWithReason} from "~lib/types.ts"
import {Puzzle, Piece} from "~lib/Puzzle.ts"
import {AssemblyProblem, Problem} from "~lib/Problem.ts"


////////// Base Classes //////////

export abstract class Action {
    abstract perform(puzzle: Puzzle): BoolWithReason
}

export abstract class EditItemMetadataAction<T extends Object> extends Action {
    itemId: string
    metadata: any
    
    static itemName: string
    static itemAttribute: string
    
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
        const itemContainer = puzzle[constructor.itemAttribute] as Map<string, T>
        const item = itemContainer.get(this.itemId)
        if(item === undefined) {
            return {
                bool: false,
                reason: `${constructor.itemName} with ID ${this.itemId} not found`
            }
        }
        
        Object.assign(item, this.metadata)
        this.postEdit(item, puzzle)
        return {bool: true}
    }

    postEdit(_item: T, _puzzle: Puzzle) { }
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
    addVoxels: Voxel[]
    removeVoxels: Voxel[]
    
    constructor(
        pieceId: string,
        addVoxels: Voxel[],
        removeVoxels: Voxel[],
    ) {
        super()
        this.pieceId = pieceId
        this.addVoxels = addVoxels
        this.removeVoxels = removeVoxels
    }
    
    perform(puzzle: Puzzle): BoolWithReason {
        const piece = puzzle.pieces.get(this.pieceId)
        if(piece === undefined) {
            return {
                bool: false,
                reason: `Piece with ID ${this.pieceId} not found`
            }
        }

        piece.voxels = piece.voxels.filter(
            (voxel) => !this.removeVoxels.includes(voxel)
        )
        piece.voxels.push(...this.addVoxels)
        return {bool: true}
    }
}

export class EditPieceMetadataAction extends EditItemMetadataAction<Piece> {
    static itemAttribute: "pieces" = "pieces"
    static itemName: "Piece" = "Piece"
    static metadata: {
        label?: string
        color?: string
    }

    postEdit(piece: Piece, puzzle: Puzzle) {
        // Remove voxels out of piece's bounds
        piece.voxels = piece.voxels.filter((voxel) =>
            puzzle.grid.isInBounds(voxel, piece.bounds)
        )
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

export class EditProblemMetadataAction extends EditItemMetadataAction<Problem> {
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