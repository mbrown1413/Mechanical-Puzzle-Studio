import {serialize, deserialize, SerializableClass, registerClass, SerializableType} from "~lib/serialize.ts"
import {Puzzle} from "~lib/Puzzle.ts"
import {Problem} from "~lib/Problem.ts"
import {Solver} from "~lib/Solver.ts"
import {Solution} from "~lib/Solution.ts"

// See options for importing workers with Vite
// https://vitejs.dev/guide/features.html#web-workers
import TaskWorker from "./tasks_worker.ts?worker"

export type StartMessage = {
    type: "start",
    task: Task,
}

type ProgressMessage = {
    type: "progress",
    percent: number,
}

type FinishedMessage = {
    type: "finished",
    result: any,
}

export type TaskToWorkerMessage = StartMessage
export type WorkerToTaskMessage = ProgressMessage | FinishedMessage

type TaskCallbacks = {
    updateProgress: (percent: number) => void,
}

/**
 * Singleton class which queues and runs tasks in a web worker. You will find
 * the single instance of this in globals.ts
 */
export class TaskRunner {
    queue: Task[]
    currentTask: Task | null
    worker: Worker | null

    constructor() {
        this.queue = []
        this.currentTask = null
        this.worker = null
    }

    submitTask(task: Task) {
        this.queue.push(task)

        if(!this.isTaskRunning && this.queue.length === 1) {
            this.startNextTask()
        }
    }

    get isTaskRunning() {
        return this.worker || this.currentTask
    }

    private startNextTask() {
        const task = this.queue.shift()
        if(!task) {
            throw "No task in queue to start"
        }
        this.currentTask = task
        this.worker = new TaskWorker()
        this.worker.onmessage = this.handleMessage.bind(this)
        this.currentTask.setup()
        this.sendMessage({
            type: "start",
            task: this.currentTask,
        })
    }

    private sendMessage(message: TaskToWorkerMessage) {
        if(!this.worker) {
            throw "No running worker to send a message to"
        }
        this.worker.postMessage(serialize(message))
    }

    private handleMessage(event: MessageEvent) {
        const message = deserialize(event.data) as WorkerToTaskMessage
        switch(message.type) {
            case "progress": this.onProgress(message); break
            case "finished": this.onFinished(message); break
            default:
                const _exhaustiveCheck: never = message
                return _exhaustiveCheck
        }
    }

    private onProgress(data: ProgressMessage) {
        console.log("Progress:", data.percent)
    }

    private onFinished(data: FinishedMessage) {
        this.currentTask?.processResult(data.result)
        this.worker?.terminate()
        this.currentTask = null
        this.worker = null

        if(this.queue.length) {
            this.startNextTask()
        }
    }
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