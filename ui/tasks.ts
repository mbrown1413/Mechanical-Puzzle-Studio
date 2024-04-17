import {SerializableClass, registerClass, Serializable, ProblemId} from "~lib"
import {Puzzle, Problem, Solver, Solution, TaskCallbacks} from "~lib"

import {saveCurrentPuzzle} from "~/ui/ActionManager.ts"

/**
 * Encapsulates all of the code and data to run a specific task.
 *
 * When a task is run by `TaskRunner`, the `Task` is serialized and sent to a
 * worker process. `run()` is executed in the worker process where it cannot
 * access any global state. Any data needed here should be a property of the
 * task and assigned in the constructor so it is serialized and available.
 *
 * The typical workflow is for `run()` to handle long-running processing so it
 * doesn't block the main thread, then have `processResult()` modify global
 * state based on the result.
 */

export abstract class Task<Result extends Serializable> extends SerializableClass {

    /** User-displayed description of the task. */
    abstract getDescription(): string

    /**
     * Set up any state needed in the main thread before the worker is run.
     */
    setup(): void {}

    /**
     * Perform blocking/long-running processing, called in a worker.
     */
    abstract run(_callbacks: TaskCallbacks): Result

    /**
     * Process results returned from `run()` in main thread.
     */
    abstract processResult(result: Result): void

    /**
     * One of these methods is always called main thread when the task
     * is done running, whether if it succeeds or has an error.
     */
    onSuccess() { }
    onFailure(_error: string) { }
}

export class ProblemSolveTask extends Task<Solution[]> {
    puzzle: Puzzle
    problemId: ProblemId

    constructor(puzzle: Puzzle, problemId: ProblemId) {
        super()
        this.puzzle = puzzle
        this.problemId = problemId

        // Throw error if misconfigured
        this.getSolver()
    }

    getDescription(): string {
        const problem = this.getProblem()
        return `Solving ${problem.label}`
    }

    getProblem(): Problem {
        const problem = this.puzzle.getProblem(this.problemId)
        if(!problem) {
            throw new Error(`Problem ID ${this.problemId} not found`)
        }
        return problem
    }

    getSolver(): Solver {
        const problem = this.getProblem()
        const solvers = problem.getSolvers()
        if(problem.solverId === null) {
            throw new Error("No solver selected")
        }
        const solverInfo = solvers[problem.solverId]
        if(!solverInfo) {
            throw new Error("Selected solver is not found")
        }
        if(!solverInfo.isUsable.bool) {
            throw new Error("Solver not usable: " + solverInfo.isUsable.reason)
        }
        return new solverInfo.solver()
    }

    setup() {
        const problem = this.getProblem()
        problem.solutions = undefined
        saveCurrentPuzzle()
    }

    run(callbacks: TaskCallbacks): Solution[] {
        const problem = this.getProblem()
        const solver = this.getSolver()
        const solutions = solver.solve(this.puzzle, problem, callbacks)
        return solutions
    }

    processResult(result: Solution[]) {
        const problem = this.getProblem()
        problem.solutions = result
        saveCurrentPuzzle()
    }
}
registerClass(ProblemSolveTask)