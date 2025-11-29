import {
    Voxel, Puzzle, Item, ItemId, Shape, ShapeId, Problem, AssemblyProblem,
    PuzzleFile, Bounds, ProblemId, AssemblySolution, ShapeGroup,
    Grid, clone, ShapeGroupId
} from "~lib"


function getNewItemLabel(
    prefix: string,
    existingItems: readonly {label?: string}[]
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
        labelToDuplicate = "Shape"
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
        const constructor = <typeof EditItemMetadataAction> this.constructor
        if(constructor.itemName === "Shape") {
            return puzzle.getShape(itemId as ShapeId) as T
        } else if(constructor.itemName === "Shape Group") {
            return puzzle.getShapeGroup(itemId as ShapeGroupId) as T
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
    static itemName: "Shape" | "Shape Group" | "Problem"
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
            case "Shape":
                return puzzle.hasShape(itemId as ShapeId)
            case "Shape Group":
                return puzzle.hasShapeGroup(itemId as ShapeGroupId)
            case "Problem":
                return puzzle.hasProblem(itemId)
        }
    }

    deleteItem(puzzle: Puzzle, itemId: ItemId) {
        const constructor = <typeof DeleteItemAction> this.constructor
        switch(constructor.itemName) {
            case "Shape":
                return puzzle.removeShape(itemId as ShapeId)
            case "Shape Group":
                return puzzle.removeShapeGroup(itemId as ShapeGroupId)
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
        for(const shape of puzzle.shapes) {
            if(shape.bounds && !puzzle.grid.validateBounds(shape.bounds)) {
                shape.bounds = puzzle.grid.getDefaultShapeBounds()
            }
            shape.voxels = shape.voxels.filter(
                voxel => puzzle.grid.validateVoxel(voxel)
            )
        }
        for(const problem of puzzle.problems) {
            problem.solutions = undefined
        }
    }
}


////////// Shape Actions //////////

export class NewShapeAction extends Action {
    bounds?: Bounds
    afterType?: "shape" | "shapeGroup"
    afterId?: number

    constructor(bounds?: Bounds, after: Shape|ShapeGroup|null = null) {
        super()
        this.bounds = bounds
        if(after) {
            this.afterType = after instanceof Shape ? "shape" : "shapeGroup"
            this.afterId = after.id
        }
    }

    perform(puzzle: Puzzle) {
        const shape = new Shape(
            puzzle.generateShapeId(),
        )
        shape.label = getNewItemLabel("Shape ", puzzle.shapes)
        shape.color = puzzle.getNewShapeColor()
        shape.bounds = this.bounds || puzzle.grid.getDefaultShapeBounds()

        let after
        if(this.afterId !== undefined) {
            if(this.afterType === "shape") {
                after = puzzle.getShape(this.afterId)
            } else if(this.afterType === "shapeGroup") {
                after = puzzle.getShapeGroup(this.afterId)
            }
        }

        puzzle.addShape(shape, after)
    }

    toString() {
        return "Create new shape"
    }
}

export class DeleteShapeAction extends DeleteItemAction {
    static itemName = "Shape" as const
}

export class EditShapeAction extends Action {
    shapeId: ShapeId
    voxelsToAdd: Voxel[]
    voxelsToRemove: Voxel[]
    optionalVoxels: boolean

    constructor(
        shapeId: ShapeId,
        addVoxels: Voxel[],
        removeVoxels: Voxel[],
        optionalVoxels=false,
    ) {
        super()
        this.shapeId = shapeId
        this.voxelsToAdd = addVoxels
        this.voxelsToRemove = removeVoxels
        this.optionalVoxels = optionalVoxels
    }

    toString() {
        return "Edit shape"
    }

    getShape(puzzle: Puzzle): Shape {
        const shape = puzzle.getShape(this.shapeId)
        if(shape === null) {
            throw new Error(`Shape with ID ${this.shapeId} not found`)
        }
        return shape
    }

    perform(puzzle: Puzzle) {
        const shape = this.getShape(puzzle)
        this.performOnShape(shape)
        this.callShapeGroupHook(puzzle, shape)
    }

    performOnShape(shape: Shape) {
        shape.addVoxel(...this.voxelsToAdd)
        shape.removeVoxel(...this.voxelsToRemove)

        for(const voxel of this.voxelsToAdd) {
            shape.setVoxelAttribute(
                "optional",
                voxel,
                this.optionalVoxels ? true : undefined
            )
        }
    }

    callShapeGroupHook(puzzle: Puzzle, shape: Shape) {
        const group = puzzle.getShapeGroupFromShape(shape)
        if(group !== null) {
            group.onShapeEdit(
                shape,
                this.voxelsToAdd,
                this.voxelsToRemove,
            )
        }
    }

    /** Would this action actually modify the shape? */
    wouldModify(puzzle: Puzzle): boolean {
        const shape = this.getShape(puzzle)

        const modifiedShape = shape.copy()
        this.performOnShape(modifiedShape)

        return !shape.equals(modifiedShape)
    }
}

export class EditShapeMetadataAction extends EditItemMetadataAction<Shape> {
    static itemName = "Shape" as const
    static metadata: {
        label?: string
        color?: string
    }

    postEdit(shape: Shape, puzzle: Puzzle) {
        // Remove voxels out of shape's bounds
        const bounds = shape.bounds
        if(bounds !== undefined) { 
            shape.voxels = shape.voxels.filter((voxel) =>
                puzzle.grid.isInBounds(voxel, bounds)
            )
        }
    }
}

export class DuplicateShapeAction extends Action {
    shapeId: ShapeId

    constructor(shapeId: ShapeId) {
        super()
        this.shapeId = shapeId
    }

    toString() {
        return "Duplicate Shape"
    }

    perform(puzzle: Puzzle) {
        const shape = puzzle.getShape(this.shapeId)
        if(!shape) {
            throw new Error(
                `Could not find shape with ID ${this.shapeId} to duplicate`
            )
        }

        const newShape = shape.copy()
        newShape.id = puzzle.generateShapeId()
        newShape.label = getDuplicateItemLabel(
            newShape.label,
            puzzle.shapes.map(p => p.label)
        )
        newShape.color = puzzle.getNewShapeColor()

        puzzle.addShape(newShape, shape)
    }
}

export class ShapeListMoveAction extends Action {
    direction: "up" | "down"
    itemType: "shape" | "shapeGroup"
    itemId: number

    constructor(direction: "up"|"down", item: Shape|ShapeGroup) {
        super()
        this.direction = direction
        this.itemType = item instanceof Shape ? "shape" : "shapeGroup"
        this.itemId = item.id
    }

    toString() {
        return `Move ${this.itemType === "shape" ? "shape" : "shape group"} ${this.direction}`
    }

    perform(puzzle: Puzzle) {
        let item
        if(this.itemType === "shape") {
            item = puzzle.getShape(this.itemId)
        } else {
            item = puzzle.getShapeGroup(this.itemId)
        }
        if(!item) {
            throw new Error(
                `Could not find ${this.itemType === "shape" ? "shape" : "shape group"} to move with ID ${this.itemId}`
            )
        }
        puzzle.moveShapeListItem(this.direction, item)
    }
}


////////// Shape Group Actions //////////

type ShapeGroupClass = {new(id: ShapeGroupId): ShapeGroup}
export class NewShapeGroupAction extends Action {
    shapeGroupClass: ShapeGroupClass
    afterType?: "shape" | "shapeGroup"
    afterId?: number

    constructor(shapeGroupClass: ShapeGroupClass, after: Shape|ShapeGroup|null = null) {
        super()
        this.shapeGroupClass = shapeGroupClass
        if(after) {
            this.afterType = after instanceof Shape ? "shape" : "shapeGroup"
            this.afterId = after.id
        }
    }

    toString() {
        return "New Shape Group"
    }

    perform(puzzle: Puzzle) {
        const group = new this.shapeGroupClass(
            puzzle.generateShapeGroupId()
        )
        group.label = getNewItemLabel(
            group.label + " ",
            puzzle.shapeGroups.filter(group => group instanceof this.shapeGroupClass)
        )

        let after
        if(this.afterId !== undefined) {
            if(this.afterType === "shape") {
                after = puzzle.getShape(this.afterId)
            } else if(this.afterType === "shapeGroup") {
                after = puzzle.getShapeGroup(this.afterId)
            }
        }

        puzzle.addShapeGroup(group, after)
    }
}

export class EditShapeGroupMetadataAction extends EditItemMetadataAction<ShapeGroup> {
    static itemName = "Shape Group" as const
    static metadata: {
        label?: string
    }
}

export class DeleteShapeGroupAction extends DeleteItemAction {
    static itemName = "Shape Group" as const
}


////////// Problem Actions //////////

export class NewProblemAction extends Action {
    afterProblemId?: ProblemId

    constructor(after: Problem|null = null) {
        super()
        if(after) {
            this.afterProblemId = after.id
        }
    }

    perform(puzzle: Puzzle) {
        const problem = new AssemblyProblem(
            puzzle.generateProblemId()
        )
        problem.label = getNewItemLabel("Problem ", puzzle.problems)
        const after = this.afterProblemId === undefined ? null : puzzle.getProblem(this.afterProblemId)
        puzzle.addProblem(problem, after)
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

export class DuplicateProblemAction extends Action {
    problemId: ProblemId

    constructor(problemId: ProblemId) {
        super()
        this.problemId = problemId
    }

    toString() {
        return "Duplicate Problem"
    }

    perform(puzzle: Puzzle) {
        const problem = puzzle.getProblem(this.problemId)
        if(!problem) {
            throw new Error(
                `Could not find problem with ID ${this.problemId} to duplicate`
            )
        }

        const newProblem = problem.copy()
        newProblem.id = puzzle.generateProblemId()
        newProblem.label = getDuplicateItemLabel(
            newProblem.label,
            puzzle.problems.map(p => p.label)
        )

        puzzle.addProblem(newProblem, problem)
    }
}

export class ProblemListMoveAction extends Action {
    direction: "up" | "down"
    problemId: number

    constructor(direction: "up"|"down", problem: Problem) {
        super()
        this.direction = direction
        this.problemId = problem.id
    }

    toString() {
        return `Move problem ${this.direction}`
    }

    perform(puzzle: Puzzle) {
        const problem = puzzle.getProblem(this.problemId)
        if(!problem) {
            throw new Error(
                `Could not find problem to move with ID ${this.problemId}`
            )
        }
        puzzle.moveProblemListItem(this.direction, problem)
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