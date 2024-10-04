import {SerializableClass, registerClass} from "~/lib/serialize.ts"
import {Grid} from "~/lib/Grid.ts"
import {Problem} from "~/lib/Problem.ts"
import {getNextColor} from "~/lib/colors.ts"

import {Piece, PieceId} from "~/lib/Piece.ts"
import {PieceGroup, PieceGroupId} from "~/lib/PieceGroup.ts"
import {ProblemId} from "~/lib/Problem.ts"


/** An item is one thing inside a puzzle collection attribute (e.g. a piece or
 * a problem). */
export type Item = Piece | PieceGroup | Problem
export type ItemId = PieceId | PieceGroupId | ProblemId

type PuzzleStoredData = {
    pieces?: Piece[]
    pieceTree: (Piece | PieceGroup)[]
}

export class Puzzle extends SerializableClass {
    grid: Grid
    pieceTree: (Piece | PieceGroup)[]
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
        piece?: number,
        pieceGroup?: number,
        problem?: number,
    }

    constructor(grid: Grid) {
        super()
        this.grid = grid
        this.pieceTree = []
        this.problems = []
        this.idCounters = {}
    }

    static preDeserialize(data: PuzzleStoredData) {
        // Backwards compatibility: pieces used to be a flat list, now it's
        // named pieceTree and includes groups in a tree structure.
        if(data.pieces && data.pieceTree === undefined) {
            data.pieceTree = data.pieces
            delete data["pieces"]
        }
    }

    get pieces(): readonly Piece[] {
        const pieces = []
        for(const item of this.pieceTree) {
            if(item instanceof Piece) {
                pieces.push(item)
            } else {
                pieces.push(...item.pieces)
            }
        }
        return Object.freeze(pieces)
    }

    get pieceGroups(): readonly PieceGroup[] {
        const groups = []
        for(const item of this.pieceTree) {
            if(item instanceof PieceGroup) {
                groups.push(item)
            }
        }
        return Object.freeze(groups)
    }

    generatePieceId(): PieceId {
        return this.generateNewId("piece")
    }

    generatePieceGroupId(): PieceGroupId {
        return this.generateNewId("pieceGroup")
    }

    generateProblemId(): ProblemId {
        return this.generateNewId("problem")
    }

    private generateNewId(
        type: "piece" | "pieceGroup" | "problem"
    ): ItemId {
        const id = this.idCounters[type] || 0
        this.idCounters[type] = id + 1
        return id
    }

    getNewPieceColor(): string {
        const piecesList = Array.from(this.pieces.values())
        const existingColors = piecesList.map(
            (piece) => piece.color
        ).filter(
            (color): color is string => typeof color === "string"
        )
        return getNextColor(existingColors)
    }

    addPiece(piece: Piece, after: Piece|PieceGroup|null = null): Piece {
        if(this.hasPiece(piece.id)) {
            throw new Error(`Duplicate piece ID: ${piece.id}`)
        }
        if(after === null) {
            this.pieceTree.push(piece)
        } else if(after instanceof PieceGroup) {
            after.pieces.unshift(piece)
        } else {
            const group = this.getPieceGroupFromPiece(after)
            if(group) {
                const index = group.pieces.findIndex(p => p === after)
                group.pieces.splice(index + 1, 0, piece)
            } else {
                const index = this.pieceTree.findIndex(p => p === after)
                this.pieceTree.splice(index + 1, 0, piece)
            }
        }
        return piece
    }

    /**
     * Gets a Piece object from the puzzle, given a PieceId, piece label, or an
     * existing Piece object. `null` is returned if there is no matching piece
     * in the puzzle.
     */
    getPiece(identifier: PieceId | string | Piece): Piece | null {
        if(typeof identifier === "string") {
            return this.pieces.find(piece => piece.label === identifier) || null
        }
        const pieceId = typeof identifier === "number" ? identifier : identifier.id
        if(pieceId === undefined) return null
        return this.pieces.find(piece => piece.id === pieceId) || null
    }

    hasPiece(pieceOrId: Piece | PieceId): boolean {
        return Boolean(this.getPiece(pieceOrId))
    }

    removePiece(pieceOrId: Piece | PieceId, throwErrors=true) {
        const id = typeof pieceOrId === "number" ? pieceOrId : pieceOrId.id
        if(id === undefined) {
            if(throwErrors) {
                throw new Error("Cannot remove piece without ID")
            }
            return
        }

        const group = this.getPieceGroupFromPiece(id)
        let index
        if(group) {
            index = group.pieces.findIndex(p => p.id === id)
        } else {
            index = this.pieceTree.findIndex(p => p instanceof Piece && p.id === id)
        }

        if(throwErrors && index === -1) {
            throw new Error(`Piece ID not found: ${id}`)
        }
        if(index !== -1) {
            if(group) {
                group.pieces.splice(index, 1)
            } else {
                this.pieceTree.splice(index, 1)
            }
        }
    }

    addPieceGroup(pieceGroup: PieceGroup, after: Piece|PieceGroup|null = null): PieceGroup {
        if(this.hasPieceGroup(pieceGroup.id)) {
            throw new Error(`Duplicate piece group ID: ${pieceGroup.id}`)
        }
        for(const piece of pieceGroup.pieces) {
            if(this.hasPiece(piece)) {
                throw new Error(`Duplicate piece ID: ${piece.id}`)
            }
        }

        if(after === null) {
            this.pieceTree.push(pieceGroup)
        } else {
            if(after instanceof Piece && this.getPieceGroupFromPiece(after)) {
                after = this.getPieceGroupFromPiece(after)
            }
            const index = this.pieceTree.findIndex(p => p === after)
            this.pieceTree.splice(index + 1, 0, pieceGroup)
        }
        return pieceGroup
    }

    getPieceGroup(identifier: PieceGroupId | string | PieceGroup): PieceGroup | null {
        if(typeof identifier === "string") {
            return this.pieceGroups.find(group => group.label === identifier) || null
        }
        const groupId = typeof identifier === "number" ? identifier : identifier.id
        if(groupId === undefined) return null
        return this.pieceGroups.find(group => group.id === groupId) || null
    }

    getPieceGroupFromPiece(pieceOrId: Piece|PieceId): PieceGroup | null {
        const id = typeof pieceOrId === "number" ? pieceOrId : pieceOrId.id
        if(id === undefined) {
            throw new Error("Cannot remove piece without ID")
        }

        for(const group of this.pieceGroups) {
            if(group.pieces.find(p => p.id === id)) {
                return group
            }
        }
        return null
    }

    hasPieceGroup(pieceGroupOrId: PieceGroup | PieceGroupId) {
        return Boolean(this.getPieceGroup(pieceGroupOrId))
    }

    removePieceGroup(pieceGroupOrId: PieceGroup | PieceGroupId, throwErrors=true) {
        const id = typeof pieceGroupOrId === "number" ? pieceGroupOrId : pieceGroupOrId.id
        if(id === undefined) {
            if(throwErrors) {
                throw new Error("Cannot remove piece group without ID")
            }
            return
        }
        const index = this.pieceTree.findIndex(
            item => item instanceof PieceGroup && item.id === id
        )
        if(throwErrors && index === -1) {
            throw new Error(`Piece group ID not found: ${id}`)
        }
        if(index !== -1) {
            this.pieceTree.splice(index, 1)
        }
    }

    movePieceListItem(direction: "up"|"down", item: Piece|PieceGroup) {
        const delta = direction === "up" ? -1 : 1

        if(item instanceof PieceGroup) {
            moveInList(this.pieceTree, item, delta)
            return
        }

        const group = this.getPieceGroupFromPiece(item)
        if(group) {

            // Moving a piece in a group. We may move it out of the group
            const index = group.pieces.indexOf(item)
            if(direction === "up" && index === 0) {
                // Move piece out of group and above it
                const groupIndex = this.pieceTree.indexOf(group)
                group.pieces.splice(index, 1)
                this.pieceTree.splice(groupIndex, 0, item)
            } else if(direction === "down" && index === group.pieces.length - 1) {
                // Move piece out of group and below it
                const groupIndex = this.pieceTree.indexOf(group)
                group.pieces.splice(index, 1)
                this.pieceTree.splice(groupIndex + 1, 0, item)
            } else {
                // Move piece within group
                moveInList(group.pieces, item, delta)
            }

        } else {

            // Moving a piece outside a group. We may move it into a group
            const index = this.pieceTree.indexOf(item)
            const intoGroup = this.pieceTree[index + delta]
            if(intoGroup instanceof PieceGroup) {
                // Move piece from pieceTree into a group
                const index = this.pieceTree.indexOf(item)
                this.pieceTree.splice(index, 1)
                if(direction === "up") {
                    intoGroup.pieces.push(item)
                } else {
                    intoGroup.pieces.unshift(item)
                }
            } else {
                // Move piece within pieceTree
                moveInList(this.pieceTree, item, delta)
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
