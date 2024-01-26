import {serialize, deserialize} from "~lib/serialize.ts"

import {
    StartMessage,
    TaskToWorkerMessage,
    WorkerToTaskMessage,
} from "./TaskRunner.ts"

// Imports needed for solver in deserialization
import "~lib/Puzzle.ts"
import "~lib/grids/CubicGrid.ts"
import "~lib/Problem.ts"
import "~ui/tasks.ts"


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

onmessage = (event: MessageEvent) => {
    const handlers: {[type: string]: (data: any) => void} = {
        start: onStart,
    }
    const message = deserialize(event.data) as TaskToWorkerMessage
    const handler = handlers[message.type]
    handler(message)
}