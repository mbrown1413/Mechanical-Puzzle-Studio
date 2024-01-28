import {serialize, deserialize} from "~lib"

import {
    StartMessage,
    TaskToWorkerMessage,
    WorkerToTaskMessage,
} from "./TaskRunner.ts"

// Imports needed for registered classes which may be deserialized
import "~lib"
import "~/ui/tasks.ts"

function sendMessage(message: WorkerToTaskMessage) {
    postMessage(serialize(message))
}

function onStart(data: StartMessage) {
    const callbacks = {
        updateProgress(percent: number) {
            sendMessage({type: "progress", percent: percent})
        }
    }
    const result = data.task.run(callbacks)
    sendMessage({
        type: "finished",
        result,
    })
}

self.onmessage = (event: MessageEvent) => {
    try {
        const handlers: {[type: string]: (data: any) => void} = {
            start: onStart,
        }
        const message = deserialize(event.data) as TaskToWorkerMessage
        const handler = handlers[message.type]
        handler(message)
    } catch(e) {
        sendMessage({
            type: "error",
            message: String(e)
        })
    }
}