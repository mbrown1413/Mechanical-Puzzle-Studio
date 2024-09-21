import {
    Voxel, Puzzle, Item, ItemId, Piece, PieceId, Problem, AssemblyProblem,
    PuzzleFile, Bounds, ProblemId, AssemblySolution, PieceGroup,
    Grid, clone
} from "~lib"


function getNewItemLabel(
    prefix: string,
    existingItems: {label?: string}[]
): string {
    const existingLabels = new Set(
        existingItems.map(item => item.label)
    )
    let label = prefix + (existingItems.length + 1)
    for(let i=existingItems.length + 1; i<existingItems.length * 2; i++) {
        label = prefix + i
        if(!existingLabels.has(label)) {
            break
        }
    }
    return label
}

function getDuplicateItemLabel(
    labelToDuplicate: string | undefined,
    existingLabels: (string| undefined)[],
) {
    let i: number, prefix: string
    if(labelToDuplicate === undefined) {
        labelToDuplicate = "Piece"
    }

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

export abstract class EditItemMetadataAction<T extends Item> extends Action {
    itemId: ItemId
    metadata: object

    static itemName: string

    constructor(
        itemId: ItemId,
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

    getItem(puzzle: Puzzle, itemId: T["id"]): T | null {
        if(itemId === undefined) { return null }
        const constructor = <typeof DeleteItemAction> this.constructor
        if(constructor.itemName === "Piece") {
            return puzzle.getPiece(itemId as PieceId) as T
        } else {
            return puzzle.getProblem(itemId) as T
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

abstract class DeleteItemAction extends Action {
    static itemName: "Piece" | "Piece Group" | "Problem"
    itemId: ItemId

    constructor(itemId: ItemId) {
        super()
        this.itemId = itemId
    }

    toString() {
        const constructor = <typeof DeleteItemAction> this.constructor
        return `Delete ${constructor.itemName.toLowerCase()}`
    }

    hasItem(puzzle: Puzzle, itemId: ItemId) {
        const constructor = <typeof DeleteItemAction> this.constructor
        switch(constructor.itemName) {
            case "Piece":
                return puzzle.hasPiece(itemId as PieceId)
            case "Piece Group":
                return itemId >= 0 && itemId < puzzle.pieceGroups.length
            case "Problem":
                return puzzle.hasProblem(itemId)
        }
    }

    deleteItem(puzzle: Puzzle, itemId: ItemId) {
        const constructor = <typeof DeleteItemAction> this.constructor
        switch(constructor.itemName) {
            case "Piece":
                return puzzle.removePiece(itemId as PieceId)
            case "Piece Group":
                puzzle.pieceGroups.splice(itemId, 1)
            break
            case "Problem":
                return puzzle.removeProblem(itemId)
        }
    }

    perform(puzzle: Puzzle) {
        const constructor = <typeof DeleteItemAction> this.constructor
        if(!this.hasItem(puzzle, this.itemId)) {
            throw new Error(`${constructor.itemName} IDs not found: ${this.itemId}`)
        }
        this.deleteItem(puzzle, this.itemId)
    }

}

abstract class DuplicateItemAction<T extends Piece | Problem> extends Action {
    itemId: ItemId

    constructor(itemId: ItemId) {
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

export class GridSetAction extends Action {
    grid: Grid

    constructor(grid: Grid) {
        super()
        this.grid = grid
    }

    toString() {
        return "Set grid"
    }

    perform(puzzle: Puzzle, _puzzleFile: PuzzleFile) {
        puzzle.grid = clone(this.grid)
        for(const piece of puzzle.pieces) {
            if(piece.bounds && !puzzle.grid.validateBounds(piece.bounds)) {
                piece.bounds = puzzle.grid.getDefaultPieceBounds()
            }
            piece.voxels = piece.voxels.filter(
                voxel => puzzle.grid.validateVoxel(voxel)
            )
        }
        for(const problem of puzzle.problems) {
            problem.solutions = undefined
        }
    }
}


////////// Piece Actions //////////

export class NewPieceAction extends Action {
    bounds?: Bounds
    pieceGroupId?: number

    constructor(bounds?: Bounds, pieceGroupId?: number) {
        super()
        this.bounds = bounds
        this.pieceGroupId = pieceGroupId
    }

    perform(puzzle: Puzzle) {
        const piece = new Piece(
            puzzle.generatePieceId(),
        )
        piece.label = getNewItemLabel("Piece ", puzzle.pieces)
        piece.color = puzzle.getNewPieceColor()
        piece.bounds = this.bounds || puzzle.grid.getDefaultPieceBounds()
        puzzle.addPiece(piece)

        if(this.pieceGroupId !== undefined) {
            const group = puzzle.pieceGroups[this.pieceGroupId]
            group.pieceIds.push(piece.id)
        }
    }

    toString() {
        return "Create new piece"
    }
}

export class DeletePieceAction extends DeleteItemAction {
    static itemName = "Piece" as const
}

export class EditPieceAction extends Action {
    pieceId: PieceId
    voxelsToAdd: Voxel[]
    voxelsToRemove: Voxel[]
    optionalVoxels: boolean

    constructor(
        pieceId: PieceId,
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
        this.callPieceGroupHook(puzzle, piece)
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

    callPieceGroupHook(puzzle: Puzzle, piece: Piece) {
        const group = puzzle.getPieceGroupFromPiece(piece)
        if(group !== null) {
            const groupPieces = group.pieceIds.map(
                id => puzzle.getPiece(id)
            ).filter(
                (piece): piece is Piece => piece !== null
            )
            group.onPieceEdit(
                piece,
                this.voxelsToAdd,
                this.voxelsToRemove,
                groupPieces
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
        const bounds = piece.bounds
        if(bounds !== undefined) { 
            piece.voxels = piece.voxels.filter((voxel) =>
                puzzle.grid.isInBounds(voxel, bounds)
            )
        }
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


////////// Piece Group Actions //////////

export class NewPieceGroupAction extends Action {
    pieceGroupInstance: PieceGroup

    constructor(groupObject: PieceGroup) {
        super()
        this.pieceGroupInstance = groupObject
    }

    toString() {
        return "New Piece Group"
    }

    perform(puzzle: Puzzle) {
        puzzle.pieceGroups.push(this.pieceGroupInstance)
    }
}

export class EditPieceGroupMetadataAction extends Action {
    pieceGroupId: number
    metadata: object

    constructor(
        pieceGroupId: number,
        metadata: object,
    ) {
        super()
        this.pieceGroupId = pieceGroupId
        this.metadata = metadata
    }

    toString() {
        return "Edit piece group metadata"
    }

    perform(puzzle: Puzzle) {
        Object.assign(
            puzzle.pieceGroups[this.pieceGroupId],
            this.metadata
        )
    }
}

export class DeletePieceGroupAction extends DeleteItemAction {
    static itemName = "Piece Group" as const
}


////////// Problem Actions //////////

export class NewProblemAction extends Action {
    perform(puzzle: Puzzle) {
        const problem = new AssemblyProblem(
            puzzle.generateProblemId()
        )
        problem.label = getNewItemLabel("Problem ", puzzle.problems)
        puzzle.addProblem(problem)
    }

    toString() {
        return "Create new problem"
    }
}

export class DeleteProblemAction extends DeleteItemAction {
    static itemName = "Problem" as const
}

export class EditProblemMetadataAction extends EditItemMetadataAction<Problem> {
    static itemName = "Problem" as const
    static metadata: {
        label?: string
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


////////// Solution Actions //////////

type SolutionListActionType = (
    "sortBy: movesToDisassemble" |
    "sortBy: movesToRemoveFirst" |
    "sortBy: orderFound" |
    "delete: noDisassemblies"
)

export class SolutionListAction extends Action {
    problemId: ProblemId
    actionType: SolutionListActionType

    constructor(problemId: ProblemId, actionType: SolutionListActionType) {
        super()
        this.problemId = problemId
        this.actionType = actionType
    }

    toString() {
        const categoryString = {
            "sortBy": "Sort solutions by ",
            "delete": "Delete solutions ",
        }[this.getCategory()]
        return categoryString + this.getPartialString()
    }

    getCategory() {
        const categories: Record<SolutionListActionType, string> = {
            "sortBy: movesToDisassemble": "sortBy",
            "sortBy: movesToRemoveFirst": "sortBy",
            "sortBy: orderFound": "sortBy",
            "delete: noDisassemblies": "delete",
        }
        return categories[this.actionType]
    }

    getPartialString() {
        const partialStrings: Record<SolutionListActionType, string> = {
            "sortBy: movesToDisassemble": "moves to completely disassemble (increasing)",
            "sortBy: movesToRemoveFirst": "moves until first separation (increasing)",
            "sortBy: orderFound": "order found",
            "delete: noDisassemblies": "with no disassemblies",
        }
        return partialStrings[this.actionType]
    }

    perform(puzzle: Puzzle) {
        const problem = puzzle.getProblem(this.problemId)
        if(!problem) {
            throw new Error(`Problem with ID ${this.problemId} not found`)
        }
        if(problem.solutions === undefined) {
            return
        }

        const keyFunc: (solution: AssemblySolution) => number = {
            "sortBy: movesToDisassemble": (s: AssemblySolution) => {
                if(!s.disassemblies || !s.disassemblies.length) return Infinity
                return s.disassemblies[0].steps.length
            },
            "sortBy: movesToRemoveFirst": (s: AssemblySolution) => {
                if(!s.disassemblies || !s.disassemblies.length) return Infinity
                const disassembly = s.disassemblies[0]
                return disassembly.stepsToFirstSeparation
            },
            "sortBy: orderFound": (s: AssemblySolution) => s.id,
            "delete: noDisassemblies": (s: AssemblySolution) =>
                s.disassemblies ? s.disassemblies.length : 1,
        }[this.actionType]

        if(this.actionType.startsWith("sortBy:")) {
            problem.solutions.sort(
                (a, b) => keyFunc(a as AssemblySolution) - keyFunc(b as AssemblySolution)
            )
        } else if(this.actionType.startsWith("delete:")) {
            problem.solutions = problem.solutions.filter((s) => keyFunc(s as AssemblySolution))
        }
    }

}