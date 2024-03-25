import {SerializableClass, deserialize, registerClass, serialize} from "~/lib/serialize.ts"
import {Grid, Bounds, Voxel, Transform} from "~/lib/Grid.ts"
import {Problem} from "~/lib/Problem.ts"
import {getNextColor} from "~/lib/colors.ts"

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

    generatePieceId() {
        return this.generateNewId("piece")
    }

    generateProblemId() {
        return this.generateNewId("problem")
    }

    private generateNewId(
        type: "piece" | "problem"
    ): string {
        const id = `${type}-${this.idCounters[type]}`
        this.idCounters[type] += 1
        return id
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

    getPiece(pieceOrId: Piece | string): PieceWithId | null {
        const id = typeof pieceOrId === "string" ? pieceOrId : pieceOrId.id
        if(id === null) return null
        return this.pieces.find(piece => piece.id === id) || null
    }

    hasPiece(pieceOrId: Piece | string): boolean {
        return Boolean(this.getPiece(pieceOrId))
    }

    removePiece(pieceOrId: Piece | string, throwErrors=true) {
        const id = typeof pieceOrId === "string" ? pieceOrId : pieceOrId.id
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

    getProblem(problemOrId: Problem | string): Problem | null {
        const id = typeof problemOrId === "string" ? problemOrId : problemOrId.id
        return this.problems.find(problem => problem.id === id) || null
    }

    hasProblem(problemOrId: Problem | string): boolean {
        return Boolean(this.getProblem(problemOrId))
    }

    removeProblem(problemOrId: Problem | string, throwErrors=true) {
        const id = typeof problemOrId === "string" ? problemOrId : problemOrId.id
        const idx = this.problems.findIndex(problem => problem.id === id)
        if(throwErrors && idx === -1) {
            throw new Error(`Problem ID not found: ${id}`)
        }
        if(idx !== -1) {
            this.problems.splice(idx, 1)
        }
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

    transform(transform: Transform): this {
        this.voxels = transform.mapVoxels(this.voxels)
        return this
    }
}

export type PieceWithId = Piece & {id: string}

registerClass(Puzzle)
registerClass(Piece)