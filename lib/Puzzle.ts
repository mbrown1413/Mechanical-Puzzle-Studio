import {SerializableClass, registerClass} from "~/lib/serialize.ts"
import {Grid} from "~/lib/Grid.ts"
import {Problem} from "~/lib/Problem.ts"
import {getNextColor} from "~/lib/colors.ts"

import {Shape, ShapeId} from "~/lib/Shape.ts"
import {ShapeGroup, ShapeGroupId} from "~/lib/ShapeGroup.ts"
import {ProblemId} from "~/lib/Problem.ts"


/** An item is one thing inside a puzzle collection attribute (e.g. a shape or
 * a problem). */
export type Item = Shape | ShapeGroup | Problem
export type ItemId = ShapeId | ShapeGroupId | ProblemId

type PuzzleStoredData = {
    shapeTree: (Shape | ShapeGroup)[]
    idCounters: {
        shape: number,
        piece?: number,  // Old name for "shape"
        shapeGroup: number,
        pieceGroup?: number,  // Old name for "shapeGroup"
    }

    // Old names for `shapeTree`
    pieces?: Shape[]
    pieceTree?: (Shape | ShapeGroup)[]
}

export class Puzzle extends SerializableClass {
    grid: Grid
    shapeTree: (Shape | ShapeGroup)[]
    problems: Problem[]

    /**
     * Next ID number of the given type.
     *
     * We have to track these for items we reference by ID between saves.
     * Otherwise, we would have to enumerate all references in one way or
     * another, either to delete dead references or scan references for the
     * next unused ID.
     */
    private idCounters: {
        shape?: number,
        shapeGroup?: number,
        problem?: number,
    }

    constructor(grid: Grid) {
        super()
        this.grid = grid
        this.shapeTree = []
        this.problems = []
        this.idCounters = {}
    }

    static preDeserialize(data: PuzzleStoredData) {
        // Backwards compatibility: convert old names for shapeTree
        if(data.pieces && data.shapeTree === undefined) {
            data.shapeTree = data.pieces
            delete data["pieces"]
        } else if(data.pieceTree && data.shapeTree === undefined) {
            data.shapeTree = data.pieceTree
            delete data["pieceTree"]
        }
        // Backwards compatibility: old id counter names
        if(data.idCounters.piece !== undefined && data.idCounters.shape === undefined) {
            data.idCounters.shape = data.idCounters.piece
            delete data.idCounters["piece"]
        }
        if(data.idCounters.pieceGroup !== undefined && data.idCounters.shapeGroup === undefined) {
            data.idCounters.shapeGroup = data.idCounters.pieceGroup
            delete data.idCounters["pieceGroup"]
        }
    }

    get shapes(): readonly Shape[] {
        const shapes = []
        for(const item of this.shapeTree) {
            if(item instanceof Shape) {
                shapes.push(item)
            } else {
                shapes.push(...item.shapes)
            }
        }
        return Object.freeze(shapes)
    }

    get shapeGroups(): readonly ShapeGroup[] {
        const groups = []
        for(const item of this.shapeTree) {
            if(item instanceof ShapeGroup) {
                groups.push(item)
            }
        }
        return Object.freeze(groups)
    }

    generateShapeId(): ShapeId {
        return this.generateNewId("shape")
    }

    generateShapeGroupId(): ShapeGroupId {
        return this.generateNewId("shapeGroup")
    }

    generateProblemId(): ProblemId {
        return this.generateNewId("problem")
    }

    private generateNewId(
        type: "shape" | "shapeGroup" | "problem"
    ): ItemId {
        const id = this.idCounters[type] || 0
        this.idCounters[type] = id + 1
        return id
    }

    getNewShapeColor(): string {
        const shapeList = Array.from(this.shapes.values())
        const existingColors = shapeList.map(
            (shape) => shape.color
        ).filter(
            (color): color is string => typeof color === "string"
        )
        return getNextColor(existingColors)
    }

    addShape(shape: Shape, after: Shape|ShapeGroup|null = null): Shape {
        if(this.hasShape(shape.id)) {
            throw new Error(`Duplicate shape ID: ${shape.id}`)
        }
        if(after === null) {
            this.shapeTree.push(shape)
        } else if(after instanceof ShapeGroup) {
            after.shapes.unshift(shape)
        } else {
            const group = this.getShapeGroupFromShape(after)
            if(group) {
                const index = group.shapes.findIndex(p => p === after)
                group.shapes.splice(index + 1, 0, shape)
            } else {
                const index = this.shapeTree.findIndex(p => p === after)
                this.shapeTree.splice(index + 1, 0, shape)
            }
        }
        return shape
    }

    /**
     * Gets a Shape object from the puzzle, given a ShapeId, shape label, or an
     * existing Shape object. `null` is returned if there is no matching shape
     * in the puzzle.
     */
    getShape(identifier: ShapeId | string | Shape): Shape | null {
        if(typeof identifier === "string") {
            return this.shapes.find(shape => shape.label === identifier) || null
        }
        const shapeId = typeof identifier === "number" ? identifier : identifier.id
        if(shapeId === undefined) return null
        return this.shapes.find(shape => shape.id === shapeId) || null
    }

    hasShape(shapeOrId: Shape | ShapeId): boolean {
        return Boolean(this.getShape(shapeOrId))
    }

    removeShape(shapeOrId: Shape | ShapeId, throwErrors=true) {
        const id = typeof shapeOrId === "number" ? shapeOrId : shapeOrId.id
        if(id === undefined) {
            if(throwErrors) {
                throw new Error("Cannot remove shape without ID")
            }
            return
        }

        const group = this.getShapeGroupFromShape(id)
        let index
        if(group) {
            index = group.shapes.findIndex(p => p.id === id)
        } else {
            index = this.shapeTree.findIndex(p => p instanceof Shape && p.id === id)
        }

        if(throwErrors && index === -1) {
            throw new Error(`Shape ID not found: ${id}`)
        }
        if(index !== -1) {
            if(group) {
                group.shapes.splice(index, 1)
            } else {
                this.shapeTree.splice(index, 1)
            }
        }
    }

    addShapeGroup(shapeGroup: ShapeGroup, after: Shape|ShapeGroup|null = null): ShapeGroup {
        if(this.hasShapeGroup(shapeGroup.id)) {
            throw new Error(`Duplicate shape group ID: ${shapeGroup.id}`)
        }
        for(const shape of shapeGroup.shapes) {
            if(this.hasShape(shape)) {
                throw new Error(`Duplicate shape ID: ${shape.id}`)
            }
        }

        if(after === null) {
            this.shapeTree.push(shapeGroup)
        } else {
            if(after instanceof Shape && this.getShapeGroupFromShape(after)) {
                after = this.getShapeGroupFromShape(after)
            }
            const index = this.shapeTree.findIndex(p => p === after)
            this.shapeTree.splice(index + 1, 0, shapeGroup)
        }
        return shapeGroup
    }

    getShapeGroup(identifier: ShapeGroupId | string | ShapeGroup): ShapeGroup | null {
        if(typeof identifier === "string") {
            return this.shapeGroups.find(group => group.label === identifier) || null
        }
        const groupId = typeof identifier === "number" ? identifier : identifier.id
        if(groupId === undefined) return null
        return this.shapeGroups.find(group => group.id === groupId) || null
    }

    getShapeGroupFromShape(shapeOrId: Shape|ShapeId): ShapeGroup | null {
        const id = typeof shapeOrId === "number" ? shapeOrId : shapeOrId.id
        if(id === undefined) {
            throw new Error("Cannot remove shape without ID")
        }

        for(const group of this.shapeGroups) {
            if(group.shapes.find(p => p.id === id)) {
                return group
            }
        }
        return null
    }

    hasShapeGroup(shapeGroupOrId: ShapeGroup | ShapeGroupId) {
        return Boolean(this.getShapeGroup(shapeGroupOrId))
    }

    removeShapeGroup(shapeGroupOrId: ShapeGroup | ShapeGroupId, throwErrors=true) {
        const id = typeof shapeGroupOrId === "number" ? shapeGroupOrId : shapeGroupOrId.id
        if(id === undefined) {
            if(throwErrors) {
                throw new Error("Cannot remove shape group without ID")
            }
            return
        }
        const index = this.shapeTree.findIndex(
            item => item instanceof ShapeGroup && item.id === id
        )
        if(throwErrors && index === -1) {
            throw new Error(`Shape group ID not found: ${id}`)
        }
        if(index !== -1) {
            this.shapeTree.splice(index, 1)
        }
    }

    moveShapeListItem(direction: "up"|"down", item: Shape|ShapeGroup) {
        const delta = direction === "up" ? -1 : 1

        if(item instanceof ShapeGroup) {
            moveInList(this.shapeTree, item, delta)
            return
        }

        const group = this.getShapeGroupFromShape(item)
        if(group) {

            // Moving a shape in a group. We may move it out of the group
            const index = group.shapes.indexOf(item)
            if(direction === "up" && index === 0) {
                // Move shape out of group and above it
                const groupIndex = this.shapeTree.indexOf(group)
                group.shapes.splice(index, 1)
                this.shapeTree.splice(groupIndex, 0, item)
            } else if(direction === "down" && index === group.shapes.length - 1) {
                // Move shape out of group and below it
                const groupIndex = this.shapeTree.indexOf(group)
                group.shapes.splice(index, 1)
                this.shapeTree.splice(groupIndex + 1, 0, item)
            } else {
                // Move shape within group
                moveInList(group.shapes, item, delta)
            }

        } else {

            // Moving a shape outside a group. We may move it into a group
            const index = this.shapeTree.indexOf(item)
            const intoGroup = this.shapeTree[index + delta]
            if(intoGroup instanceof ShapeGroup) {
                // Move shape from shapeTree into a group
                const index = this.shapeTree.indexOf(item)
                this.shapeTree.splice(index, 1)
                if(direction === "up") {
                    intoGroup.shapes.push(item)
                } else {
                    intoGroup.shapes.unshift(item)
                }
            } else {
                // Move shape within shapeTree
                moveInList(this.shapeTree, item, delta)
            }

        }
    }

    addProblem(problem: Problem, after: Problem|null = null): Problem {
        if(this.hasProblem(problem.id)) {
            throw new Error(`Duplicate problem ID: ${problem.id}`)
        }
        if(after === null) {
            this.problems.push(problem)
        } else {
            const index = this.problems.findIndex(p => p === after)
            this.problems.splice(index + 1, 0, problem)
        }
        return problem
    }

    /**
     * Gets a Problem object from the puzzle, given a ProblemId, problem label,
     * or an existing Problem object. `null` is returned if there is no
     * matching problem in the puzzle.
     */
    getProblem(identifier: ProblemId | string | Problem): Problem | null {
        if(typeof identifier === "string") {
            return this.problems.find(problem => problem.label === identifier) || null
        }
        const problemId = typeof identifier === "number" ? identifier : identifier.id
        return this.problems.find(problem => problem.id === problemId) || null
    }

    hasProblem(problemOrId: Problem | ProblemId): boolean {
        return Boolean(this.getProblem(problemOrId))
    }

    removeProblem(problemOrId: Problem | ProblemId, throwErrors=true) {
        const id = typeof problemOrId === "number" ? problemOrId : problemOrId.id
        const idx = this.problems.findIndex(problem => problem.id === id)
        if(throwErrors && idx === -1) {
            throw new Error(`Problem ID not found: ${id}`)
        }
        if(idx !== -1) {
            this.problems.splice(idx, 1)
        }
    }

    moveProblemListItem(direction: "up"|"down", item: Problem) {
        const delta = direction === "up" ? -1 : 1
        moveInList(this.problems, item, delta)
    }
}

registerClass(Puzzle)


function moveInList<T>(list: T[], item: T, delta: number) {
    const index = list.indexOf(item)
    list.splice(index, 1)
    list.splice(Math.max(0, index + delta), 0, item)
}
