import {SerializableClass, deserialize, registerClass, serialize} from "~/lib/serialize.ts"
import {Grid, Bounds, Voxel} from "~/lib/Grid.ts"
import {Problem} from "~/lib/Problem.ts"
import {getNextColor} from "~/lib/colors.ts"

export class Puzzle extends SerializableClass {
    grid: Grid
    pieces: Map<string, PieceWithId>
    problems: Map<string, Problem>

    constructor(grid: Grid) {
        super()
        this.grid = grid
        this.pieces = new Map()
        this.problems = new Map()
    }

    generateId(
        prefix: string,
        listAttribute: "pieces" | "problems"
    ): string {
        //TODO: Make this O(1), not O(n)
        for(let i=0; ; i++) {
            const id = prefix+"-"+i
            if(!this[listAttribute].has(id)) {
                return id
            }
        }
    }

    getNewPieceColor(): string {
        const piecesList = Array.from(this.pieces.values())
        const existingColors = piecesList.map((piece) => piece.color)
        return getNextColor(existingColors)
    }

    addPiece(piece: Piece): Piece {
        if(!piece.hasId()) {
            throw new Error("Cannot add piece without ID")
        }
        if(this.pieces.has(piece.id)) {
            throw new Error(`Duplicate piece ID: ${piece.id}`)
        }
        this.pieces.set(piece.id, piece)
        return piece
    }

    hasPiece(pieceOrId: Piece | string): boolean {
        const id = typeof pieceOrId === "string" ? pieceOrId : pieceOrId.id
        if(id === null) return false
        return this.pieces.has(id)
    }

    removePiece(pieceOrId: Piece | string, throwErrors=true) {
        const id = typeof pieceOrId === "string" ? pieceOrId : pieceOrId.id
        if(id === null) {
            if(throwErrors) {
                throw new Error("Cannot remove piece without ID")
            }
            return
        }
        if(throwErrors && !this.pieces.has(id)) {
            throw new Error(`Piece ID not found: ${id}`)
        }
        this.pieces.delete(id)
    }

    getPieceFromPieceOrId(pieceOrId: Piece | string): Piece {
        if(typeof pieceOrId === "string") {
            const piece = this.pieces.get(pieceOrId)
            if(!piece) {
                throw new Error(`Piece ID not found: ${pieceOrId}`)
            }
            return piece
        } else {
            return pieceOrId
        }
    }

    addProblem(problem: Problem): Problem {
        if(this.problems.has(problem.id)) {
            throw new Error(`Duplicate problem ID: ${problem.id}`)
        }
        this.problems.set(problem.id, problem)
        return problem
    }

    hasProblem(problemOrId: Problem | string): boolean {
        const id = typeof problemOrId === "string" ? problemOrId : problemOrId.id
        return this.problems.has(id)
    }

    removeProblem(problemOrId: Problem | string, throwErrors=true) {
        const id = typeof problemOrId === "string" ? problemOrId : problemOrId.id
        if(throwErrors && !this.problems.has(id)) {
            throw new Error(`Problem ID not found: ${id}`)
        }
        this.problems.delete(id)
    }
}

export class Piece extends SerializableClass {
    id: string | null

    bounds: Bounds
    voxels: Voxel[]
    label: string
    color: string

    constructor(id: string | null, bounds: Bounds, voxels: Voxel[]=[]) {
        super()
        this.id = id
        this.bounds = bounds
        this.voxels = voxels
        this.label = id || "unlabeled-piece"
        this.color = "#00ff00"
    }

    hasId(): this is PieceWithId {
        return typeof this.id === "string"
    }

    copy(): Piece {
        const coppied = deserialize<Piece>(serialize(this), "Piece")
        coppied.id = null
        return coppied
    }

    equals(other: Piece): boolean {
        // Use sets so duplicate voxels don't affect equality
        const thisVoxels = new Set(this.voxels)
        const otherVoxels = new Set(other.voxels)
        return thisVoxels.size === otherVoxels.size && [...thisVoxels].every(
            v => otherVoxels.has(v)
        )
    }
}

export type PieceWithId = Piece & {id: string}

registerClass(Puzzle)
registerClass(Piece)