import {SerializableClass, registerClass} from "~/lib/serialize.ts"
import {BoolWithReason} from "~/lib/types.ts"
import {Solver, AssemblySolver} from "~/lib/Solver.ts"
import {Solution} from "~/lib/Solution.ts"

type SolverInfo = {
    solver: new(...args: unknown[]) => Solver,
    isUsable: BoolWithReason,
}

/**
 * Describes an objective of the puzzle.
 */
export abstract class Problem extends SerializableClass {
    declare id: string
    label: string
    solverId: string
    solutions: Solution[] | null

    constructor(id: string) {
        super(id)
        this.label = id
        this.solverId = Object.keys(this.getSolvers())[0]
        this.solutions = null
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
    declare id: string
    label: string
    goalPieceId: string | null

    /* Maps piece ID to how many of that piece are used in this problem. */
    usedPieceCounts: Map<string, number>

    constructor(id: string) {
        super(id)
        this.label = id
        this.goalPieceId = null
        this.usedPieceCounts = new Map()
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