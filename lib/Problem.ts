import {SerializableClass, registerClass} from "~lib/serialize.ts"
import {BoolWithReason} from "./types.ts"
import {Solver, AssemblySolver} from "./Solver.ts"
import {Solution} from "./Solution.ts"

type SolverInfo = {
    solver: new(...args: any) => Solver,
    isUsable: BoolWithReason,
}

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
    
    abstract getSolvers(): {[id: string]: SolverInfo}
}

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
                isUsable: {bool: true as true},
            },
        }
    }
}

registerClass(AssemblyProblem)