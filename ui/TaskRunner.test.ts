import {test, expect, describe} from "vitest"
import "@vitest/web-worker"

import {registerClass} from "~lib"

import {TaskRunner} from "./TaskRunner.ts"
import {Task} from "./tasks.ts"

type TaskErrorLocation = null | "setup" | "run" | "processResult" | "onSuccess" | "onFailure"

class TestTask extends Task {
    errorAt: TaskErrorLocation
    input: string
    doneCallback: (result: any) => void

    result: string | null
    state: null | "running" | "succeeded" | "failed"
    error: string | null
    
    constructor(
        input: string,
        doneCallback: (result: any) => void,
        errorAt: TaskErrorLocation = null,
    ) {
        super()
        this.input = input
        this.doneCallback = doneCallback
        this.errorAt = errorAt

        this.result = null
        this.state = null
        this.error = null
    }

    setup() {
        if(this.errorAt === "setup") {
            throw "Error in setup!"
        }
        this.state = "running"
    }
    
    run() {
        if(this.errorAt === "run") {
            throw "Error in run!"
        }
        return `${this.input}, world!`
    }
    
    processResult(result: any) {
        if(this.errorAt === "processResult") {
            throw "Error in processResult!"
        }
        this.result = result
    }

    onSuccess() {
        this.state = "succeeded"
        this.doneCallback(this.result)
        if(this.errorAt === "onSuccess" || this.errorAt === "onFailure") {
            throw "Error in onSuccess!"
        }
    }

    onFailure(error: string) {
        this.state = "failed"
        this.error = error
        this.doneCallback(this.result)
        if(this.errorAt === "onFailure") {
            throw "Error in onFailure!"
        }
    }
}
registerClass(TestTask)

describe("TestRunner", () => {
    const taskRunner = new TaskRunner()

    test("basic functionality", async () => {
        let task: TestTask | undefined
        await new Promise((resolve) => {
            task = new TestTask("Hello", resolve)
            taskRunner.submitTask(task)
        })
        expect(task?.state).toEqual("succeeded")
        expect(task?.result).toEqual("Hello, world!")
    })

    test("error in task.setup()", async () => {
        let task: TestTask | undefined
        const taskRunner = new TaskRunner()
        await new Promise((resolve) => {
            task = new TestTask("Hello", resolve, "setup")
            taskRunner.submitTask(task)
        })
        expect(task?.state).toEqual("failed")
        expect(task?.error).toEqual("Error in setup!")
    })

    test("error in task.run()", async () => {
        let task: TestTask | undefined
        await new Promise((resolve) => {
            task = new TestTask("Hello", resolve, "run")
            taskRunner.submitTask(task)
        })
        expect(task?.state).toEqual("failed")
        expect(task?.error).toEqual("Error in run!")
    })

    test("error in task.processResult()", async () => {
        let task: TestTask | undefined
        await new Promise((resolve) => {
            task = new TestTask("Hello", resolve, "processResult")
            taskRunner.submitTask(task)
        })
        expect(task?.state).toEqual("failed")
        expect(task?.error).toEqual("Error in processResult!")
    })

    test("error in task.onSuccess()", async () => {
        let task: TestTask | undefined
        await new Promise((resolve) => {
            task = new TestTask("Hello", resolve, "onSuccess")
            taskRunner.submitTask(task)
        })
        expect(task?.state).toEqual("failed")
        expect(task?.error).toEqual("Error in onSuccess!")
    })

    test("error in task.onFailure()", async () => {
        let task: TestTask | undefined
        await new Promise((resolve) => {
            task = new TestTask("Hello", resolve, "onFailure")
            taskRunner.submitTask(task)
        })
        expect(task?.state).toEqual("failed")
        // Error in onFailure leaves the original error intact
        expect(task?.error).toEqual("Error in onSuccess!")
    })
})