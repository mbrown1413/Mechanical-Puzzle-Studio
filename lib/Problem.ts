import {serialize, deserialize, SerializableClass, registerClass} from "~/lib/serialize.ts"
import {BoolWithReason, Range} from "~/lib/types.ts"
import {Solver, AssemblySolver} from "~/lib/Solver.ts"
import {Solution} from "~/lib/Solution.ts"
import {Piece, PieceId} from "~/lib/Piece.ts"
import {Puzzle} from "~/lib/Puzzle.ts"

export type ProblemId = number

type SolverInfo = {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    solver: { new(...args: any[]): Solver },
    isUsable: BoolWithReason,
    args: unknown[],
}

export type ProblemConstraint = {
    type: "piece-group"
    pieceIds: PieceId[]
    count: Range
}

/**
 * Describes an objective of the puzzle.
 */
export abstract class Problem extends SerializableClass {
    id: ProblemId
    label: string
    solverId: string
    solutions?: Solution[]

    constructor(id: ProblemId) {
        super()
        this.id = id
        this.label = `Problem ${id}`
        this.solverId = Object.keys(this.getSolvers())[0]
    }

    copy(): this {
        return deserialize(serialize(this))
    }

    /**
     * List all possible `Solver` classes which could be used for this problem.
     */
    abstract getSolvers(): {[id: string]: SolverInfo}
}

/**
 * A problem where the objective is to take a number of pieces and fit them
 * together into into the shape of a goal piece.
 */
export class AssemblyProblem extends Problem {
    goalPieceId?: PieceId
    disassemble: boolean
    removeNoDisassembly: boolean

    /**
     * Maps piece ID to how many of that piece are used in this problem.
     *
     * Value can either be a number indicating an exact amount, or min/max
     * range.
     */
    usedPieceCounts: {
        [pieceId: PieceId]: Range
    }

    constraints: ProblemConstraint[] | undefined

    constructor(id: ProblemId) {
        super(id)
        this.usedPieceCounts = {}
        this.disassemble = false
        this.removeNoDisassembly = true
    }

    static postSerialize(problem: AssemblyProblem) {
        const pieceIds = Object.keys(problem.usedPieceCounts).map(Number)
        for(const pieceId of pieceIds) {

            // Convert piece count to number if min === max
            const value = problem.usedPieceCounts[pieceId]
            if(
                typeof value === "object" &&
                value.min === value.max
            ) {
                problem.usedPieceCounts[pieceId] = value.min
            }

            // Remove used piece entries with "0" count
            if(problem.usedPieceCounts[pieceId] === 0) {
                delete problem.usedPieceCounts[pieceId]
            }
        }

        // Remove "goal" piece from used pieces
        if(problem.goalPieceId !== undefined) {
            delete problem.usedPieceCounts[problem.goalPieceId]
        }
    }

    getSolvers() {
        return {
            assembly: {
                solver: AssemblySolver,
                isUsable: {bool: true as const},
                args: [this.disassemble, this.removeNoDisassembly],
            },
        }
    }

    get usedPieceIds(): PieceId[] {
        return Object.keys(this.usedPieceCounts).map(Number)
    }

    getUsedPieces(puzzle: Puzzle): Piece[] {
        const pieces = []
        for(const pieceId of this.usedPieceIds) {
            if(pieceId === this.goalPieceId) { continue }
            const piece = puzzle.getPiece(pieceId)
            if(!piece) { continue }  // Ignore references to deleted pieces
            pieces.push(piece)
        }
        return pieces
    }

    getGoalPiece(puzzle: Puzzle): Piece | null {
        if(this.goalPieceId === undefined) { return null }
        return puzzle.getPiece(this.goalPieceId)
    }

    getPieceRange(pieceId: PieceId): {min: number, max: number} {
        const count = this.usedPieceCounts[pieceId]
        if(count === undefined) return {min: 0, max: 0}
        if(typeof count === "number") return {min: count, max: count}
        return count
    }

    countVoxels(puzzle: Puzzle) {
        const countVoxels = (p: Piece) => new Set(p.voxels).size
        const countOptionalVoxels = (p: Piece) => {
            const optionalAttr = (p.voxelAttributes || {})["optional"] || {}
            const variable = p.voxels.filter(v => optionalAttr[v] === true)
            return new Set(variable).size
        }

        const pieces = this.getUsedPieces(puzzle)
        const piecesMin = pieces.map(
            piece => countVoxels(piece) * this.getPieceRange(piece.id).min
        ).reduce((a, b) => a + b, 0)
        const piecesMax = pieces.map(
            piece => countVoxels(piece) * this.getPieceRange(piece.id).max
        ).reduce((a, b) => a + b, 0)
        const piecesRange = {min: piecesMin, max: piecesMax}

        const goal = this.getGoalPiece(puzzle)
        let goalRange = null
        if(goal) {
            const goalMax = countVoxels(goal)
            const goalOptional = countOptionalVoxels(goal)
            const goalMin = goalMax - goalOptional
            goalRange = {min: goalMin, max: goalMax}
        }

        const goalString = goalRange === null ? "-" : rangeToString(goalRange)
        const piecesString = pieces.length === 0 ? "-" : rangeToString(piecesRange)

        let warning: string | null = null

        if(goalRange === null) {
            warning = "Goal piece is not set"
        } else if(goalRange.max <= 0) {
            warning = "Goal piece is empty"
        } else if(piecesRange.max <= 0) {
            warning = "No voxels are present in used pieces"
        } else if(!rangesOverlap(goalRange, piecesRange)) {
            warning = (
                "Number of voxels in pieces don't add up to the voxels in the goal piece.\n\n" +
                `Voxels in goal: ${goalString}\n` +
                `Voxels in pieces: ${piecesString}`
            )
        }

        return {
            goal: goalRange,
            pieces: piecesRange,
            goalString,
            piecesString,
            warning,
        }

    }
}

registerClass(AssemblyProblem)

function rangesOverlap(
    r1: {min: number, max: number},
    r2: {min: number, max: number}
): boolean {
    return (
        r1.min <= r2.max &&
        r1.max >= r2.min
    )
}

function rangeToString(range: {min: number, max: number}): string {
    if(range.min === range.max) {
        return range.min.toString()
    } else {
        return `${range.min}-${range.max}`
    }
}
