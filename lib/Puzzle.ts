import {SerializableClass, deserialize, registerClass, serialize} from "~/lib/serialize.ts"
import {Grid, Bounds, Voxel, Translation} from "~/lib/Grid.ts"
import {Problem} from "~/lib/Problem.ts"
import {getNextColor} from "~/lib/colors.ts"

/**
 * Defines a piece's position and orientation on the puzzle's grid.
 */
export class PiecePlacement extends SerializableClass {

    /** The piece as defined in the puzzle. */
    originalPieceId: string | null
    originalPiece: Piece

    /**
     * A copy of the piece after it is transformed and moved to a new location.
     */
    transformedPiece: Piece

    /**
     * The translation used to move from originalPiece to transformedPiece.
     */
    translation: Translation | null

    constructor(
        originalPiece: Piece,
        transformedPiece: Piece,
        translation: Translation | null = null,
    ) {
        super()
        this.originalPieceId = originalPiece.id
        this.originalPiece = originalPiece.copy()
        this.transformedPiece = transformedPiece
        this.translation = translation
    }
}
registerClass(PiecePlacement)

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

    /**
     * Get all possible orientations a piece may be in.
     */
    *getPieceOrientations(pieceOrId: Piece | string): Iterable<PiecePlacement> {
        const piece = this.getPieceFromPieceOrId(pieceOrId)
        const orientations = this.grid.getOrientations()
        for(const orientation of orientations) {
            const newVoxels = orientation.orientationFunc(piece.voxels)
            if(newVoxels === null) { continue }
            const transformedPiece = piece.copy()
            transformedPiece.voxels = newVoxels
            yield new PiecePlacement(piece, transformedPiece)
        }
    }

    /**
     * Get all possible translations for a piece (without changing
     * orientations), given that the voxels in the resulting placement must be
     * in `availableVoxels`.
     */
    *getPieceTranslations(
        pieceOrId: Piece | string,
        availableVoxels: Voxel[]
    ): Iterable<PiecePlacement> {
        const piece = this.getPieceFromPieceOrId(pieceOrId)

        for(const toVoxel of availableVoxels) {
            const translation = this.grid.getTranslation(piece.voxels[0], toVoxel)
            if(translation === null) { continue }

            const newVoxels = []
            for(const oldVoxel of piece.voxels) {
                const newVoxel = this.grid.translate(oldVoxel, translation)
                if(newVoxel === null || !availableVoxels.includes(newVoxel)) {
                    break
                }
                newVoxels.push(newVoxel)
            }
            if(newVoxels.length !== piece.voxels.length) {
                continue
            }

            const newPiece = piece.copy()
            newPiece.voxels = newVoxels
            yield new PiecePlacement(piece, newPiece, translation)
        }
    }

    /**
     * Get all possible placements for a piece, given that all of the
     * transformed piece's voxels must be in `availableVoxels`.
     */
    *getPiecePlacements(
        pieceOrId: Piece | string,
        availableVoxels: Voxel[]
    ): Iterable<PiecePlacement> {

        // Deduplicate returned placements
        const usedPlacements: Set<string> = new Set()
        function getPlacementKey(piece: Piece): string {
            const sortedVoxels = [...piece.voxels].sort()
            return sortedVoxels.join(";")
        }

        const piece = this.getPieceFromPieceOrId(pieceOrId)
        for(const pieceVariation of this.getPieceOrientations(piece)) {
            const pieceTranslations = Array.from(this.getPieceTranslations(
                pieceVariation.transformedPiece,
                availableVoxels
            ))
            for(const pieceTranslation of pieceTranslations) {
                const key = getPlacementKey(pieceTranslation.transformedPiece)
                if(usedPlacements.has(key)) continue
                usedPlacements.add(key)

                yield new PiecePlacement(
                    piece,
                    pieceTranslation.transformedPiece,
                    pieceTranslation.translation,
                )
            }
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
}

export type PieceWithId = Piece & {id: string}

registerClass(Puzzle)
registerClass(Piece)