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
    progressCallback(percent: number) {
        sendMessage({type: "progress", percent})
    },
    logCallback(message: string) {
        sendMessage({type: "log", message})
    },
}

function onStart(data: StartMessage) {
    const result = data.task.run(callbacks)
    sendMessage({
        type: "finished",
        result,
    })
}

self.onmessage = (event: MessageEvent) => {
    try {
        const handlers: {[type: string]: (data: RunnerToWorkerMessage) => void} = {
            start: onStart,
        }
        const message = deserialize(event.data) as RunnerToWorkerMessage
        const handler = handlers[message.type]
        handler(message)
    } catch(e) {
        console.error(e)
        sendMessage({
            type: "error",
            message: String(e)
        })
    }
}