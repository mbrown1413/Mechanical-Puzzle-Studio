import {Voxel, Puzzle, Piece, Problem, AssemblyProblem} from "~lib"

import {ProblemSolveTask} from "~/ui/tasks.ts"
import {taskRunner} from "~/ui/globals.ts"


////////// Base Classes //////////

export abstract class Action {
    abstract perform(puzzle: Puzzle): void
    abstract toString(): string
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
    
    toString() {
        const constructor = <typeof EditItemMetadataAction> this.constructor
        return `Edit ${constructor.itemName.toLowerCase()}`
    }

    perform(puzzle: Puzzle) {
        const constructor = <typeof EditItemMetadataAction> this.constructor
        const itemContainer = puzzle[constructor.itemAttribute] as Map<string, T>
        const item = itemContainer.get(this.itemId)
        if(item === undefined) {
            throw new Error(`${constructor.itemName} with ID ${this.itemId} not found`)
        }
        
        Object.assign(item, this.metadata)
        this.postEdit(item, puzzle)
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
    
    toString() {
        const constructor = <typeof DeleteItemsAction> this.constructor
        return `Delete ${constructor.itemName.toLowerCase()}`
    }

    perform(puzzle: Puzzle) {
        const constructor = <typeof DeleteItemsAction> this.constructor
        const itemMap = puzzle[constructor.itemAttribute]

        const missingIds = []
        for(const id of this.itemIds) {
            if(!itemMap.has(id)) {
                missingIds.push(id)
            }
        }
        if(missingIds.length) {
            throw new Error(`${constructor.itemName} IDs not found: ${missingIds}`)
        }
        
        for(const id of this.itemIds) {
            itemMap.delete(id)
        }
    }

}


////////// Piece Actions //////////

export class NewPieceAction extends Action {
    perform(puzzle: Puzzle) {
        const piece = new Piece(
            puzzle.generateId("piece", "pieces"),
            puzzle.grid.getDefaultPieceBounds()
        )
        piece.color = puzzle.getNewPieceColor()
        puzzle.addPiece(piece)
    }
    
    toString() {
        return "Create new piece"
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

    toString() {
        return "Edit piece"
    }
    
    perform(puzzle: Puzzle) {
        const piece = puzzle.pieces.get(this.pieceId)
        if(piece === undefined) {
            throw new Error(`Piece with ID ${this.pieceId} not found`)
        }

        piece.voxels = piece.voxels.filter(
            (voxel) => !this.removeVoxels.includes(voxel)
        )
        piece.voxels.push(...this.addVoxels)
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
    perform(puzzle: Puzzle) {
        const problem = new AssemblyProblem(
            puzzle.generateId("problem", "problems"),
        )
        puzzle.addProblem(problem)
    }

    toString() {
        return "Create new problem"
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

    toString() {
        return `Solve problem`
    }

    perform(puzzle: Puzzle) {
        taskRunner.submitTask(new ProblemSolveTask(puzzle, this.problemId))
    }
}