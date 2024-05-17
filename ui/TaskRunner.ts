import {serialize, deserialize, Serializable} from "~lib"

import {Task} from "~/ui/tasks.ts"

// See options for importing workers with Vite
// https://vitejs.dev/guide/features.html#web-workers
import TaskWorker from "./TaskRunner_worker.ts?worker"

export type StartMessage = {
    msgType: "start",
    task: Task<Serializable>,
}

type ProgressMessage = {
    msgType: "progress",
    percent: number,
    progressMessage?: string | null,
}

type LogMessage = {
    msgType: "log",
    message: string,
}

type FinishedMessage = {
    msgType: "finished",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    result: any,
}

type ErrorMessage = {
    msgType: "error",
    message: string,
}

export type RunnerToWorkerMessage = StartMessage
export type WorkerToRunnerMessage = ProgressMessage | FinishedMessage | ErrorMessage | LogMessage

export type TaskInfo = {
    task: Task<Serializable>,
    status: "queued" | "running" | "finished" | "canceled"
    progressPercent: number | null,  // Null before progress is set by task
    progressMessage: string | null,
    messages: string[],
    error: string | null,
}

/**
 * Singleton class which queues and runs tasks in a web worker. You will find
 * the single instance of this in globals.ts
 */
export class TaskRunner {
    queue: TaskInfo[]
    current: TaskInfo | null
    finished: TaskInfo[]

    worker: Worker | null

    constructor() {
        this.queue = []
        this.current = null
        this.finished = []
        this.worker = null
    }

    getTasks(): TaskInfo[] {
        const tasks = []
        tasks.push(...this.queue)
        if(this.current) {
            tasks.push(this.current)
        }
        tasks.push(...Array.from(this.finished).reverse())
        return tasks
    }

    submitTask(task: Task<Serializable>) {
        this.queue.push({
            task,
            status: "queued",
            progressPercent: null,
            progressMessage: null,
            messages: [],
            error: null,
        })

        if(this.current === null && this.queue.length === 1) {
            this.startNextTask()
        }
    }

    terminateRunningTask() {
        this.worker?.terminate()
        this.log("Terminated worker")
        this.worker = null
        if(this.current) {
            this.current.status = "canceled"
            this.finished.push(this.current)
        }
        this.current = null
        if(this.queue.length === 1) {
            this.startNextTask()
        }
    }

    private log(message: string) {
        let taskStr
        if(this.current) {
            taskStr = this.current?.task.getDescription()
        } else {
            taskStr = "TaskRunner"
        }
        console.log(`[${taskStr}] ${message}`)
    }

    private createWorker(): Worker {
        const worker = new TaskWorker()
        worker.onmessage = this.handleMessage.bind(this)
        worker.onerror = this.handleWorkerError.bind(this)
        worker.onmessageerror = this.handleMessageError.bind(this)
        return worker
    }

    private startNextTask() {
        if(this.current) {
            throw new Error("Cannot start new task while one is running")
        }
        const nextTask = this.queue.shift()
        if(!nextTask) {
            throw new Error("No task in queue to start")
        }
        this.current = nextTask
        this.current.status = "running"
        try {
            this.current.task.setup()
            this.log("Starting task")
            this.sendMessage({
                msgType: "start",
                task: this.current.task,
            })
        } catch(e) {
            this.finishTask(false, null, String(e))
        }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private finishTask(success: boolean, result: any, error: string | null) {
        if(!this.current) {
            throw new Error("Cannot finish current task, none is running!")
        }

        if(success) {
            try {
                this.current?.task.processResult(result)
                this.current?.task.onSuccess()
            } catch(e) {
                success = false
                error = String(e)
            }
        }

        this.current.error = error
        this.current.status = "finished"
        if(success) {
            this.log("Task finished successfully")
        } else {
            this.log("Task failed")
        }

        if(!success) {
            console.error(error)
            try {
                this.current?.task.onFailure(
                    error || "Unknown worker error"
                )
            } catch(e) {
                console.error(e)
            }
        }

        this.finished.push(this.current)
        this.current = null

        if(this.queue.length) {
            this.startNextTask()
        }
    }

    private sendMessage(message: RunnerToWorkerMessage) {
        if(!this.worker) {
            this.worker = this.createWorker()
        }
        this.worker.postMessage(serialize(message))
    }

    private handleWorkerError(event: ErrorEvent) {
        this.finishTask(false, null, event.message)
    }

    private handleMessageError() {
        this.finishTask(false, null, "Error deserializing worker message")
    }

    private handleMessage(event: MessageEvent) {
        const message = deserialize(event.data) as WorkerToRunnerMessage
        let _exhaustiveCheck: never
        switch(message.msgType) {
            case "progress": this.onProgressMessage(message); break
            case "log": this.onLogMessage(message); break
            case "finished": this.onFinishedMessage(message); break
            case "error": this.onErrorMessage(message); break
            default:
                _exhaustiveCheck = message
                return _exhaustiveCheck
        }
    }

    private onProgressMessage(data: ProgressMessage) {
        if(this.current) {
            this.current.progressPercent = data.percent
            if(data.progressMessage !== undefined) {
                this.current.progressMessage = data.progressMessage
            }
        }
    }

    private onLogMessage(data: LogMessage) {
        this.current?.messages.push(data.message)
    }

    private onFinishedMessage(data: FinishedMessage) {
        this.finishTask(true, data.result, null)
    }

    private onErrorMessage(data: ErrorMessage) {
        this.finishTask(false, null, data.message)
    }

}