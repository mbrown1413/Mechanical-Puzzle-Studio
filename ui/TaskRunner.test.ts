import {test, expect, describe} from "vitest"
import "@vitest/web-worker"

import {registerClass} from "~lib"

import {TaskRunner} from "./TaskRunner.ts"
import {Task} from "./tasks.ts"

type TaskErrorLocation = null | "setup" | "run" | "processResult" | "onSuccess" | "onFailure"

class TestTask extends Task<string> {
    errorAt: TaskErrorLocation
    input: string

    result: string
    state: null | "running" | "succeeded" | "failed"
    error: string | null

    constructor(
        input: string,
        errorAt: TaskErrorLocation = null,
    ) {
        super()
        this.input = input
        this.errorAt = errorAt

        this.result = ""
        this.state = null
        this.error = null
    }

    getDescription(): string { return "Test Task" }

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

    processResult(result: string) {
        if(this.errorAt === "processResult") {
            throw "Error in processResult!"
        }
        this.result = result
    }

    onSuccess() {
        this.state = "succeeded"
        if(this.errorAt === "onSuccess" || this.errorAt === "onFailure") {
            throw "Error in onSuccess!"
        }
    }

    onFailure(error: string) {
        this.state = "failed"
        this.error = error
        if(this.errorAt === "onFailure") {
            throw "Error in onFailure!"
        }
    }
}
registerClass(TestTask)

describe("TestRunner", () => {
    const taskRunner = new TaskRunner()

    test("basic functionality", async () => {
        const task = new TestTask("Hello")
        await taskRunner.submitTask(task)
        expect(task.state).toEqual("succeeded")
        expect(task.result).toEqual("Hello, world!")
    })

    test("error in task.setup()", async () => {
        const task = new TestTask("Hello", "setup")
        await expect(taskRunner.submitTask(task)).rejects.toEqual("Error in setup!")
        expect(task.state).toEqual("failed")
        expect(task.error).toEqual("Error in setup!")
    })

    test("error in task.run()", async () => {
        const task = new TestTask("Hello", "run")
        await expect(taskRunner.submitTask(task)).rejects.toEqual("Error in run!")
        expect(task.state).toEqual("failed")
        expect(task.error).toEqual("Error in run!")
    })

    test("error in task.processResult()", async () => {
        const task = new TestTask("Hello", "processResult")
        await expect(taskRunner.submitTask(task)).rejects.toEqual("Error in processResult!")
        expect(task.state).toEqual("failed")
        expect(task.error).toEqual("Error in processResult!")
    })

    test("error in task.onSuccess()", async () => {
        const task = new TestTask("Hello", "onSuccess")
        await expect(taskRunner.submitTask(task)).rejects.toEqual("Error in onSuccess!")
        expect(task.state).toEqual("failed")
        expect(task.error).toEqual("Error in onSuccess!")
    })

    test("error in task.onFailure()", async () => {
        const task = new TestTask("Hello", "onFailure")
        await expect(taskRunner.submitTask(task)).rejects.toEqual("Error in onSuccess!")
        expect(task.state).toEqual("failed")
        // Error in onFailure leaves the original error intact
        expect(task.error).toEqual("Error in onSuccess!")
    })

    test("canceling rejects the submitted task promise", async () => {
        const task = new TestTask("Hello")
        const taskPromise = taskRunner.submitTask(task)
        taskRunner.terminateRunningTask()
        await expect(taskPromise).rejects.toEqual("Task canceled")
        expect(task.state).toEqual("canceled")
    })
})