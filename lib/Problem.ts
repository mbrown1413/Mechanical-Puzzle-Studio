import {serialize, deserialize, SerializableClass, registerClass} from "~/lib/serialize.ts"
import {BoolWithReason, Range} from "~/lib/types.ts"
import {Solver, AssemblySolver, SymmetryReduction} from "~/lib/Solver.ts"
import {Solution} from "~/lib/Solution.ts"
import {Shape, ShapeId} from "~/lib/Shape.ts"
import {Puzzle} from "~/lib/Puzzle.ts"

export type ProblemId = number

type AssemblyProblemStoredData = {
    shapeCounts: {
        [shapeId: ShapeId]: Range
    }
    goalShapeId: ShapeId

    // Old names for `shapeCounts`
    usedPieceCounts?: {
        [shapeId: ShapeId]: Range
    }

    // Old names for `goalShapeId`
    goalPieceId?: ShapeId
}

type SolverInfo = {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    solver: { new(...args: any[]): Solver },
    isUsable: BoolWithReason,
    args: unknown[],
}

export type ProblemConstraint = {
    type: "piece-group"
    shapeIds: ShapeId[]
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
 * together into into the shape of a goal shape.
 */
export class AssemblyProblem extends Problem {
    goalShapeId?: ShapeId
    symmetryReduction: SymmetryReduction
    disassemble: boolean
    removeNoDisassembly: boolean

    /**
     * Defines the pieces of the problem in a map from shape ID to how many of
     * that shape are used as pieces.
     *
     * Value can either be a number indicating an exact amount, or min/max
     * range.
     */
    shapeCounts: {
        [shapeId: ShapeId]: Range
    }

    constraints: ProblemConstraint[] | undefined

    constructor(id: ProblemId) {
        super(id)
        this.symmetryReduction = "rotation+mirror"
        this.shapeCounts = {}
        this.disassemble = false
        this.removeNoDisassembly = true
    }

    static preDeserialize(data: AssemblyProblemStoredData) {
        // Backwards compatibility: convert old names for shapeCounts
        if(data.usedPieceCounts && data.shapeCounts === undefined) {
            data.shapeCounts = data.usedPieceCounts
            delete data["usedPieceCounts"]
        }
        // Backwards compatibility: convert old names for goalShapeId
        if(data.goalPieceId !== undefined && data.goalShapeId === undefined) {
            data.goalShapeId = data.goalPieceId
            delete data["goalPieceId"]
        }
    }

    static postSerialize(problem: AssemblyProblem) {
        const shapeIds = Object.keys(problem.shapeCounts).map(Number)
        for(const shapeId of shapeIds) {

            // Convert shape range to number if min === max
            const value = problem.shapeCounts[shapeId]
            if(
                typeof value === "object" &&
                value.min === value.max
            ) {
                problem.shapeCounts[shapeId] = value.min
            }

            // Remove used shape entries with "0" count
            if(problem.shapeCounts[shapeId] === 0) {
                delete problem.shapeCounts[shapeId]
            }
        }

        // Remove "goal" shape from used shapes
        if(problem.goalShapeId !== undefined) {
            delete problem.shapeCounts[problem.goalShapeId]
        }
    }

    getSolvers() {
        return {
            assembly: {
                solver: AssemblySolver,
                isUsable: {bool: true as const},

                args: [
                    this.symmetryReduction,
                    this.disassemble,
                    this.removeNoDisassembly
                ],
            },
        }
    }

    get usedShapeIds(): ShapeId[] {
        return Object.keys(this.shapeCounts).map(Number)
    }

    getUsedShapes(puzzle: Puzzle): Shape[] {
        const shapes = []
        for(const shapeId of this.usedShapeIds) {
            if(shapeId === this.goalShapeId) { continue }
            const shape = puzzle.getShape(shapeId)
            if(!shape) { continue }  // Ignore references to deleted shapes
            shapes.push(shape)
        }
        return shapes
    }

    getGoalShape(puzzle: Puzzle): Shape | null {
        if(this.goalShapeId === undefined) { return null }
        return puzzle.getShape(this.goalShapeId)
    }

    getPieceRange(shapeId: ShapeId): {min: number, max: number} {
        const count = this.shapeCounts[shapeId]
        if(count === undefined) return {min: 0, max: 0}
        if(typeof count === "number") return {min: count, max: count}
        return count
    }

    countVoxels(puzzle: Puzzle) {
        const countVoxels = (p: Shape) => new Set(p.voxels).size
        const countOptionalVoxels = (p: Shape) => {
            const optionalAttr = (p.voxelAttributes || {})["optional"] || {}
            const variable = p.voxels.filter(v => optionalAttr[v] === true)
            return new Set(variable).size
        }

        const shapes = this.getUsedShapes(puzzle)
        const piecesMin = shapes.map(
            piece => countVoxels(piece) * this.getPieceRange(piece.id).min
        ).reduce((a, b) => a + b, 0)
        const piecesMax = shapes.map(
            piece => countVoxels(piece) * this.getPieceRange(piece.id).max
        ).reduce((a, b) => a + b, 0)
        const piecesRange = {min: piecesMin, max: piecesMax}

        const goal = this.getGoalShape(puzzle)
        let goalRange = null
        if(goal) {
            const goalMax = countVoxels(goal)
            const goalOptional = countOptionalVoxels(goal)
            const goalMin = goalMax - goalOptional
            goalRange = {min: goalMin, max: goalMax}
        }

        const goalString = goalRange === null ? "-" : rangeToString(goalRange)
        const piecesString = shapes.length === 0 ? "-" : rangeToString(piecesRange)

        let warning: string | null = null

        if(goalRange === null) {
            warning = "Goal shape is not set"
        } else if(goalRange.max <= 0) {
            warning = "Goal shape is empty"
        } else if(piecesRange.max <= 0) {
            warning = "No voxels are present in used shapes"
        } else if(!rangesOverlap(goalRange, piecesRange)) {
            warning = (
                "Number of voxels in pieces don't add up to the voxels in the goal shape.\n\n" +
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
