import {serialize, deserialize} from "~lib"

import {
    StartMessage,
    RunnerToWorkerMessage,
    WorkerToRunnerMessage,
} from "./TaskRunner.ts"

// Imports needed for registered classes which may be deserialized
import "~lib"
import "~/ui/tasks.ts"

function sendMessage(message: WorkerToRunnerMessage) {
    postMessage(serialize(message))
}

const callbacks = {
    progressCallback(percent: number, progressMessage?: string | null) {
        sendMessage({msgType: "progress", percent, progressMessage})
    },
    logCallback(message: string) {
        sendMessage({msgType: "log", message})
    },
}

function onStart(data: StartMessage) {
    const result = data.task.run(callbacks)
    sendMessage({
        msgType: "finished",
        result,
    })
}

self.onmessage = (event: MessageEvent) => {
    try {
        const handlers: {[msgType: string]: (data: RunnerToWorkerMessage) => void} = {
            start: onStart
        }
        const message = deserialize(event.data) as RunnerToWorkerMessage
        const handler = handlers[message.msgType]
        handler(message)
    } catch(e) {
        console.error(e)
        sendMessage({
            msgType: "error",
            message: String(e)
        })
    }
}