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

type AttributeValue = boolean

export class Piece extends SerializableClass {
    id: string | null

    bounds: Bounds
    voxels: Voxel[]
    label: string
    color: string

    voxelAttributes?: {
        [attribute: string]: {
            [voxel: Voxel]: AttributeValue
        }
    }

    constructor(id: string | null, bounds: Bounds, voxels: Voxel[]=[]) {
        super()
        this.id = id
        this.bounds = bounds
        this.voxels = voxels
        this.label = id || "unlabeled-piece"
        this.color = "#00ff00"
        this.voxelAttributes = undefined
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
        if(
            thisVoxels.size !== otherVoxels.size ||
            [...thisVoxels].some(v => !otherVoxels.has(v))
        ) {
            return false
        }

        const thisAttrs = this.voxelAttributes || {}
        const otherAttrs = other.voxelAttributes || {}
        const attrNames = new Set([
            ...Object.keys(thisAttrs),
            ...Object.keys(otherAttrs)
        ])
        for(const attr of attrNames.keys()) {
            const thisVoxelValues = thisAttrs[attr] || {}
            const otherVoxelValues = otherAttrs[attr] || {}
            const voxels = new Set([
                ...Object.keys(thisVoxelValues),
                ...Object.keys(otherVoxelValues)
            ])
            for(const voxel of voxels.keys()) {
                if(!thisVoxels.has(voxel)) {
                    continue
                }

                const thisValue = thisVoxelValues[voxel]
                const otherValue = otherVoxelValues[voxel]
                if(thisValue !== otherValue) {
                    return false
                }
            }
        }

        return true
    }

    transform(transform: Transform): this {
        const newVoxels = transform.mapVoxels(this.voxels)

        // Transform attributes based map of old to new voxels
        const newAttrs: {
            [attribute: string]: {
                [voxel: Voxel]: AttributeValue
            }
        } = {}
        for(const [attrName, attrValues] of Object.entries(this.voxelAttributes || {})) {
            newAttrs[attrName] = {}
            for(const [voxel, value] of Object.entries(attrValues)) {
                const voxelIdx = this.voxels.indexOf(voxel)
                if(voxelIdx === -1) {
                    continue
                }
                const newVoxel = newVoxels[voxelIdx]
                newAttrs[attrName][newVoxel] = value
            }
        }
        this.voxelAttributes = newAttrs

        this.voxels = newVoxels
        return this
    }

    setVoxelAttribute(attribute: string, voxel: Voxel, value: AttributeValue) {
        if(!this.voxelAttributes) {
            this.voxelAttributes = {}
        }
        if(!this.voxelAttributes[attribute]) {
            this.voxelAttributes[attribute] = {}
        }
        this.voxelAttributes[attribute][voxel] = value
    }
}

export type PieceWithId = Piece & {id: string}

registerClass(Puzzle)
registerClass(Piece)