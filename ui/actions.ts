import {Voxel, Puzzle, Piece, Problem, AssemblyProblem, PuzzleFile, Bounds} from "~lib"


function getDuplicateItemLabel(
    labelToDuplicate: string,
    existingLabels: string[],
) {
    let i: number, prefix: string

    // Detect "<name> (copy)" or "<name> (copy <i>)" format and use that as a
    // starting point.
    const match = labelToDuplicate.match(/(.*) \(copy( \d+)?\)/)
    if(match) {
        prefix = match[1]
        i = match[2] ? Number(match[2]) + 1 : 2
    } else {
        prefix = labelToDuplicate
        i = 1
    }

    for(; ; i++) {
        const newName = `${prefix} (copy${i === 1 ? "" : " "+i})`
        if(!existingLabels.includes(newName)) {
            return newName
        }
    }
}


////////// Base Classes //////////

/**
 * Action instances represent a potential modification to a puzzle.
 *
 * Almost all modifications to a puzzle are done through actions instead of
 * modifying the puzzle itself. Keeping this rigid structure lends itself to
 * better error handling and allows for features such as undo.
 */
export abstract class Action {

    /**
     * Modify the puzzle file according to this action.
     *
     * The first argument is the Puzzle, since almost all actions won't need
     * access to the full PuzzleFile.
     */
    abstract perform(puzzle: Puzzle, puzzleFile: PuzzleFile): void

    /** A short string shown to the user which describes this action. */
    abstract toString(): string
}

export abstract class EditItemMetadataAction<T extends object> extends Action {
    itemId: string
    metadata: object

    static itemName: string

    constructor(
        itemId: string,
        metadata: object,
    ) {
        super()
        this.itemId = itemId
        this.metadata = metadata
    }

    toString() {
        const constructor = <typeof EditItemMetadataAction> this.constructor
        return `Edit ${constructor.itemName.toLowerCase()}`
    }

    getItem(puzzle: Puzzle, itemId: string): Piece | Problem | null {
        const constructor = <typeof DeleteItemsAction> this.constructor
        if(constructor.itemName === "Piece") {
            return puzzle.getPiece(itemId)
        } else {
            return puzzle.getProblem(itemId)
        }
    }

    perform(puzzle: Puzzle) {
        const constructor = <typeof EditItemMetadataAction> this.constructor
        const item = this.getItem(puzzle, this.itemId) as T
        if(item === null) {
            throw new Error(`${constructor.itemName} with ID ${this.itemId} not found`)
        }

        Object.assign(item, this.metadata)
        this.postEdit(item, puzzle)
    }

    postEdit(_item: T, _puzzle: Puzzle) { }
}

abstract class DeleteItemsAction extends Action {
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

    hasItem(puzzle: Puzzle, itemId: string) {
        const constructor = <typeof DeleteItemsAction> this.constructor
        if(constructor.itemName === "Piece") {
            return puzzle.hasPiece(itemId)
        } else {
            return puzzle.hasProblem(itemId)
        }
    }

    deleteItem(puzzle: Puzzle, itemId: string) {
        const constructor = <typeof DeleteItemsAction> this.constructor
        if(constructor.itemName === "Piece") {
            return puzzle.removePiece(itemId)
        } else {
            return puzzle.removeProblem(itemId)
        }
    }

    perform(puzzle: Puzzle) {
        const constructor = <typeof DeleteItemsAction> this.constructor

        const missingIds = []
        for(const id of this.itemIds) {
            if(!this.hasItem(puzzle, id)) {
                missingIds.push(id)
            }
        }
        if(missingIds.length) {
            throw new Error(`${constructor.itemName} IDs not found: ${missingIds}`)
        }

        for(const id of this.itemIds) {
            this.deleteItem(puzzle, id)
        }
    }

}

abstract class DuplicateItemAction<T extends Piece | Problem> extends Action {
    itemId: string

    constructor(itemId: string) {
        super()
        this.itemId = itemId
    }

    perform(puzzle: Puzzle) {
        const itemList = this.getItemList(puzzle)
        const idx = itemList.findIndex(item => item.id === this.itemId)
        const item = itemList[idx]
        if(idx === undefined || item === undefined) { return }

        const newItem = this.copyItem(puzzle, item)
        this.addItem(puzzle, newItem, idx+1)
    }

    abstract getItemList(puzzle: Puzzle): T[]

    abstract copyItem(puzzle: Puzzle, item: T): T

    abstract addItem(puzzle: Puzzle, item: T, index: number): void
}


////////// Puzzle Actions //////////

export class EditPuzzleMetadataAction extends Action {
    metadata: object

    constructor(
        metadata: object,
    ) {
        super()
        this.metadata = metadata
    }

    toString() {
        return "Edit puzzle metadata"
    }

    perform(_puzzle: Puzzle, puzzleFile: PuzzleFile) {
        Object.assign(puzzleFile, this.metadata)
    }
}


////////// Piece Actions //////////

export class NewPieceAction extends Action {
    bounds?: Bounds

    constructor() {
        super()
        this.bounds = undefined
    }

    perform(puzzle: Puzzle) {
        const piece = new Piece(
            puzzle.generatePieceId(),
            this.bounds || puzzle.grid.getDefaultPieceBounds()
        )
        piece.color = puzzle.getNewPieceColor()
        puzzle.addPiece(piece)
    }

    toString() {
        return "Create new piece"
    }
}

export class DeletePiecesAction extends DeleteItemsAction {
    static itemName = "Piece" as const
}

export class EditPieceAction extends Action {
    pieceId: string
    voxelsToAdd: Voxel[]
    voxelsToRemove: Voxel[]
    optionalVoxels: boolean

    constructor(
        pieceId: string,
        addVoxels: Voxel[],
        removeVoxels: Voxel[],
        optionalVoxels=false,
    ) {
        super()
        this.pieceId = pieceId
        this.voxelsToAdd = addVoxels
        this.voxelsToRemove = removeVoxels
        this.optionalVoxels = optionalVoxels
    }

    toString() {
        return "Edit piece"
    }

    getPiece(puzzle: Puzzle): Piece {
        const piece = puzzle.getPiece(this.pieceId)
        if(piece === null) {
            throw new Error(`Piece with ID ${this.pieceId} not found`)
        }
        return piece
    }

    perform(puzzle: Puzzle) {
        const piece = this.getPiece(puzzle)
        this.performOnPiece(piece)
    }

    performOnPiece(piece: Piece) {
        piece.addVoxel(...this.voxelsToAdd)
        piece.removeVoxel(...this.voxelsToRemove)

        for(const voxel of this.voxelsToAdd) {
            piece.setVoxelAttribute(
                "optional",
                voxel,
                this.optionalVoxels ? true : undefined
            )
        }
    }

    /** Would this action actually modify the piece? */
    wouldModify(puzzle: Puzzle): boolean {
        const piece = this.getPiece(puzzle)

        const modifiedPiece = piece.copy()
        this.performOnPiece(modifiedPiece)

        return !piece.equals(modifiedPiece)
    }
}

export class EditPieceMetadataAction extends EditItemMetadataAction<Piece> {
    static itemName = "Piece" as const
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

export class DuplicatePieceAction extends DuplicateItemAction<Piece> {

    toString() {
        return "Duplicate Piece"
    }

    getItemList(puzzle: Puzzle) {
        return puzzle.pieces
    }

    copyItem(puzzle: Puzzle, piece: Piece) {
        const newPiece = piece.copy()
        newPiece.id = puzzle.generatePieceId()
        newPiece.label = getDuplicateItemLabel(
            newPiece.label,
            puzzle.pieces.map(p => p.label)
        )
        newPiece.color = puzzle.getNewPieceColor()
        return newPiece
    }

    addItem(puzzle: Puzzle, piece: Piece, index: number) {
        puzzle.addPiece(piece, index)
    }

}


////////// Problem Actions //////////

export class NewProblemAction extends Action {
    perform(puzzle: Puzzle) {
        const problem = new AssemblyProblem(
            puzzle.generateProblemId()
        )
        puzzle.addProblem(problem)
    }

    toString() {
        return "Create new problem"
    }
}

export class DeleteProblemsAction extends DeleteItemsAction {
    static itemName = "Problem" as const
}

export class EditProblemMetadataAction extends EditItemMetadataAction<Problem> {
    static itemName = "Problem" as const
    static metadata: {
        label?: string
    }

    postEdit(problem: Problem) {
        if(problem instanceof AssemblyProblem) {
            // Remove used piece entries with "0" count
            for(const [pieceId, count] of Object.entries(problem.usedPieceCounts)) {
                if(count <= 0) {
                    delete problem.usedPieceCounts[pieceId]
                }
            }
            // Remove "goal" piece from used pieces
            if(problem.goalPieceId !== null) {
                delete problem.usedPieceCounts[problem.goalPieceId]
            }
        }
    }
}

export class DuplicateProblemAction extends DuplicateItemAction<Problem> {

    toString() {
        return "Duplicate Problem"
    }

    getItemList(puzzle: Puzzle) {
        return puzzle.problems
    }

    copyItem(puzzle: Puzzle, problem: Problem) {
        const newProblem = problem.copy()
        newProblem.id = puzzle.generateProblemId()
        newProblem.label = getDuplicateItemLabel(
            newProblem.label,
            puzzle.problems.map(p => p.label)
        )
        return newProblem
    }

    addItem(puzzle: Puzzle, problem: Problem, index: number) {
        puzzle.addProblem(problem, index)
    }

}