import {serialize, deserialize, Serializable} from "~lib"

import {Task} from "~/ui/tasks.ts"

// See options for importing workers with Vite
// https://vitejs.dev/guide/features.html#web-workers
import TaskWorker from "./TaskRunner_worker.ts?worker"

export type StartMessage = {
    type: "start",
    task: Task<Serializable>,
}

type ProgressMessage = {
    type: "progress",
    percent: number,
}

type LogMessage = {
    type: "log",
    message: string,
}

type FinishedMessage = {
    type: "finished",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    result: any,
}

type ErrorMessage = {
    type: "error",
    message: string,
}

export type RunnerToWorkerMessage = StartMessage
export type WorkerToRunnerMessage = ProgressMessage | FinishedMessage | ErrorMessage | LogMessage

export type TaskInfo = {
    task: Task<Serializable>,
    progressPercent: number | null,  // Null before progress is set by task
    messages: string[],
}

/**
 * Singleton class which queues and runs tasks in a web worker. You will find
 * the single instance of this in globals.ts
 */
export class TaskRunner {
    queue: Task<Serializable>[]
    currentTaskInfo: TaskInfo | null
    worker: Worker | null

    constructor() {
        this.queue = []
        this.currentTaskInfo = null
        this.worker = null
    }

    submitTask(task: Task<Serializable>) {
        this.queue.push(task)

        if(this.currentTaskInfo === null && this.queue.length === 1) {
            this.startNextTask()
        }
    }
    
    terminateRunningTask() {
        this.worker?.terminate()
        this.worker = null
        this.currentTaskInfo = null
        if(this.queue.length === 1) {
            this.startNextTask()
        }
    }
    
    private createWorker(): Worker {
        const worker = new TaskWorker()
        worker.onmessage = this.handleMessage.bind(this)
        worker.onerror = this.handleWorkerError.bind(this)
        worker.onmessageerror = this.handleMessageError.bind(this)
        return worker
    }

    private startNextTask() {
        if(this.currentTaskInfo) {
            throw new Error("Cannot start new task while one is running")
        }
        const task = this.queue.shift()
        if(!task) {
            throw new Error("No task in queue to start")
        }
        this.currentTaskInfo = {
            task,
            progressPercent: null,
            messages: [],
        }
        try {
            this.currentTaskInfo.task.setup()
            this.sendMessage({
                type: "start",
                task: this.currentTaskInfo.task,
            })
        } catch(e) {
            this.finishTask(false, null, String(e))
        }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private finishTask(success: boolean, result: any, error: string | null) {
        if(success) {
            try {
                this.currentTaskInfo?.task.processResult(result)
                this.currentTaskInfo?.task.onSuccess()
            } catch(e) {
                success = false
                error = String(e)
            }
        }

        if(!success) {
            try {
                this.currentTaskInfo?.task.onFailure(
                    error || "Unknown worker error"
                )
            } catch(e) {
                console.error(e)
            }
        }
        this.currentTaskInfo = null

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
        switch(message.type) {
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
        if(this.currentTaskInfo) {
            this.currentTaskInfo.progressPercent = data.percent
        }
    }
    
    private onLogMessage(data: LogMessage) {
        this.currentTaskInfo?.messages.push(data.message)
    }

    private onFinishedMessage(data: FinishedMessage) {
        this.finishTask(true, data.result, null)
    }

    private onErrorMessage(data: ErrorMessage) {
        this.finishTask(false, null, data.message)
    }
    
}