import {serialize, deserialize, SerializableClass, registerClass} from "~/lib/serialize.ts"
import {BoolWithReason} from "~/lib/types.ts"
import {Solver, AssemblySolver} from "~/lib/Solver.ts"
import {Solution} from "~/lib/Solution.ts"
import {PieceId} from "~/lib/Piece.ts"

export type ProblemId = number

type SolverInfo = {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    solver: { new(...args: any[]): Solver },
    isUsable: BoolWithReason,
    args: unknown[],
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

    /* Maps piece ID to how many of that piece are used in this problem.
     *
     * Note that since JS objects store keys as strings, you should use the
     * getters `usedPieces` and `getPieceCount()` if possible.
     */
    usedPieceCounts: {[pieceId: PieceId]: number}

    constructor(id: ProblemId) {
        super(id)
        this.usedPieceCounts = {}
        this.disassemble = false
        this.removeNoDisassembly = true
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

    get usedPieces(): PieceId[] {
        return Object.keys(this.usedPieceCounts).map(Number)
    }

    getPieceCount(pieceId: PieceId): number {
        return this.usedPieceCounts[pieceId] | 0
    }
}

registerClass(AssemblyProblem)