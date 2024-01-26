import {serialize, deserialize} from "~lib/serialize.ts"

import {Task} from "~ui/tasks.ts"

// See options for importing workers with Vite
// https://vitejs.dev/guide/features.html#web-workers
import TaskWorker from "./TaskRunner_worker.ts?worker"

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