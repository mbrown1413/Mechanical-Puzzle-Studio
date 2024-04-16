import {serialize, deserialize, SerializableClass, registerClass} from "~/lib/serialize.ts"
import {BoolWithReason} from "~/lib/types.ts"
import {Solver, AssemblySolver} from "~/lib/Solver.ts"
import {Solution} from "~/lib/Solution.ts"
import {PieceId} from "~/lib/Piece.ts"

export type ProblemId = string

type SolverInfo = {
    solver: new(...args: unknown[]) => Solver,
    isUsable: BoolWithReason,
}

/**
 * Describes an objective of the puzzle.
 */
export abstract class Problem extends SerializableClass {
    id: ProblemId
    label: string
    solverId: string
    solutions: Solution[] | null

    constructor(id: ProblemId) {
        super()
        this.id = id
        this.label = id
        this.solverId = Object.keys(this.getSolvers())[0]
        this.solutions = null
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
    goalPieceId: PieceId | null

    /* Maps piece ID to how many of that piece are used in this problem. */
    usedPieceCounts: {[pieceId: string]: number}

    constructor(id: ProblemId) {
        super(id)
        this.goalPieceId = null
        this.usedPieceCounts = {}
    }

    getSolvers() {
        return {
            assembly: {
                solver: AssemblySolver,
                isUsable: {bool: true as const},
            },
        }
    }
}

registerClass(AssemblyProblem)