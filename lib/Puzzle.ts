import {SerializableClass, registerClass} from "~/lib/serialize.ts"
import {Grid} from "~/lib/Grid.ts"
import {Problem} from "~/lib/Problem.ts"
import {getNextColor} from "~/lib/colors.ts"

import {Piece, PieceId, PieceWithId} from "~/lib/Piece.ts"
import {ProblemId} from "~/lib/Problem.ts"


/** An item is one thing inside a puzzle collection attribute (e.g. a piece or
 * a problem). */
export type Item = Piece | Problem
export type ItemId = PieceId | ProblemId

export class Puzzle extends SerializableClass {
    grid: Grid
    pieces: PieceWithId[]
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
        piece: number,
        problem: number,
    }

    constructor(grid: Grid) {
        super()
        this.grid = grid
        this.pieces = []
        this.problems = []
        this.idCounters = {
            piece: 0,
            problem: 0,
        }
    }

    generatePieceId(): PieceId {
        return this.generateNewId("piece")
    }

    generateProblemId(): ProblemId {
        return this.generateNewId("problem")
    }

    private generateNewId(
        type: "piece" | "problem"
    ): ItemId {
        return this.idCounters[type]++
    }

    getNewPieceColor(): string {
        const piecesList = Array.from(this.pieces.values())
        const existingColors = piecesList.map((piece) => piece.color)
        return getNextColor(existingColors)
    }

    addPiece(piece: Piece, index?: number): Piece {
        if(!piece.hasId()) {
            throw new Error("Cannot add piece without ID")
        }
        if(this.hasPiece(piece.id)) {
            throw new Error(`Duplicate piece ID: ${piece.id}`)
        }
        if(index === undefined) {
            this.pieces.push(piece)
        } else {
            this.pieces.splice(index, 0, piece)
        }
        return piece
    }

    getPiece(pieceOrId: Piece | PieceId): PieceWithId | null {
        const id = typeof pieceOrId === "number" ? pieceOrId : pieceOrId.id
        if(id === null) return null
        return this.pieces.find(piece => piece.id === id) || null
    }

    hasPiece(pieceOrId: Piece | PieceId): boolean {
        return Boolean(this.getPiece(pieceOrId))
    }

    removePiece(pieceOrId: Piece | PieceId, throwErrors=true) {
        const id = typeof pieceOrId === "number" ? pieceOrId : pieceOrId.id
        if(id === null) {
            if(throwErrors) {
                throw new Error("Cannot remove piece without ID")
            }
            return
        }
        const idx = this.pieces.findIndex(piece => piece.id === id)
        if(throwErrors && idx === -1) {
            throw new Error(`Piece ID not found: ${id}`)
        }
        if(idx !== -1) {
            this.pieces.splice(idx, 1)
        }
    }

    addProblem(problem: Problem, index?: number): Problem {
        if(this.hasProblem(problem.id)) {
            throw new Error(`Duplicate problem ID: ${problem.id}`)
        }
        if(index === undefined) {
            this.problems.push(problem)
        } else {
            this.problems.splice(index, 0, problem)
        }
        return problem
    }

    getProblem(problemOrId: Problem | ProblemId): Problem | null {
        const id = typeof problemOrId === "number" ? problemOrId : problemOrId.id
        return this.problems.find(problem => problem.id === id) || null
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
}

registerClass(Puzzle)