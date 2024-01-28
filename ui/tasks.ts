import {SerializableClass, registerClass, SerializableType} from "~lib/serialize.ts"
import {Puzzle} from "~lib/Puzzle.ts"
import {Problem} from "~lib/Problem.ts"
import {Solver} from "~lib/Solver.ts"
import {Solution} from "~lib/Solution.ts"

type TaskCallbacks = {
    updateProgress: (percent: number) => void,
}

/**
 * Encapsulates all of the code and data to run a specific task.
 *
 * When a task is run by `TaskRunner`, the `Task` is serialized and sent to a
 * worker process. `run()` is executed in the worker process where it cannot
 * access any global state. Any data needed here should be a property of the
 * task and assigned in the constructor so it is serialized and available. The
 * return value from `run()` is serialized and passed to `processResult()`,
 * which runs in the main thread.
 *
 * The typical workflow is for `run()` to handle long-running processing so it
 * doesn't block the main thread, then have `processResult()` modify global
 * state based on the result.
 */

export abstract class Task extends SerializableClass {
    constructor() {
        super(null)
    }

    /** 
     * Set up any state needed in the main thread before the worker is run.
     */
    setup(): void {}

    /**
     * Perform blocking/long-running processing, called in a worker.
     */
    abstract run(callbacks: TaskCallbacks): SerializableType
    
    /**
     * Process results returned from `run()` in main thread.
     */
    abstract processResult(result: SerializableType): void

    /**
     * One of these methods is always called main thread when the task
     * is done running, whether if it succeeds or has an error.
     */
    onSuccess() { }
    onFailure(_error: string) { }
}

export class ProblemSolveTask extends Task {
    puzzle: Puzzle
    problemId: string

    constructor(puzzle: Puzzle, problemId: string) {
        super()
        this.puzzle = puzzle
        this.problemId = problemId
    }
    
    getProblem(): Problem {
        const problem = this.puzzle.problems.get(this.problemId)
        if(!problem) {
            throw `Problem ID ${this.problemId} not found`
        }
        return problem
    }
    
    getSolver(): Solver {
        const problem = this.getProblem()
        const solvers = problem.getSolvers()
        if(problem.solverId === null) {
            throw "No solver selected"
        }
        const solverInfo = solvers[problem.solverId]
        if(!solverInfo) {
            throw "Selected solver is not found"
        }
        if(!solverInfo.isUsable.bool) {
            throw "Solver not usable: " + solverInfo.isUsable.reason
        }
        return new solverInfo.solver()
    }
    
    setup() {
        const problem = this.getProblem()
        problem.solutions = null
    }

    run() {
        const problem = this.getProblem()
        const solver = this.getSolver()
        const solutions = solver.solve(this.puzzle, problem)
        return solutions
    }

    processResult(result: Solution[]) {
        const problem = this.getProblem()
        problem.solutions = result
    }
}
registerClass(ProblemSolveTask)