import {test, expect, describe} from "vitest"
import "@vitest/web-worker"

import {registerClass} from "~lib"

import {TaskRunner} from "./TaskRunner.ts"
import {Task} from "./tasks.ts"

type TaskErrorLocation = null | "setup" | "run"

class TestTask extends Task<string> {
    errorAt: TaskErrorLocation
    input: string

    constructor(
        input: string,
        errorAt: TaskErrorLocation = null,
    ) {
        super()
        this.input = input
        this.errorAt = errorAt
    }

    getDescription() { return "Test Task" }

    setup() {
        if(this.errorAt === "setup") {
            throw "Error in setup!"
        }
    }

    run() {
        if(this.errorAt === "run") {
            throw "Error in run!"
        }
        return `${this.input}, world!`
    }
}
registerClass(TestTask)

describe("TestRunner", () => {
    const taskRunner = new TaskRunner()
    function lastTaskInfo() {
        return taskRunner.finished[taskRunner.finished.length-1]
    }

    test("basic functionality", async () => {
        const task = new TestTask("Hello")
        await expect(taskRunner.submitTask(task)).resolves.toEqual("Hello, world!")
        expect(lastTaskInfo().status).toBe("finished")
        expect(lastTaskInfo().error).toBe(null)
    })

    test("error in task.setup()", async () => {
        const task = new TestTask("Hello", "setup")
        await expect(taskRunner.submitTask(task)).rejects.toEqual("Error in setup!")
        expect(lastTaskInfo().status).toBe("finished")
        expect(lastTaskInfo().error).toBe("Error in setup!")
    })

    test("error in task.run()", async () => {
        const task = new TestTask("Hello", "run")
        await expect(taskRunner.submitTask(task)).rejects.toEqual("Error in run!")
        expect(lastTaskInfo().status).toBe("finished")
        expect(lastTaskInfo().error).toBe("Error in run!")
    })

    test("canceling rejects the submitted task promise", async () => {
        const task = new TestTask("Hello")
        const taskPromise = taskRunner.submitTask(task)
        taskRunner.terminateRunningTask()
        await expect(taskPromise).rejects.toEqual("Task canceled")
        expect(lastTaskInfo().status).toBe("canceled")
        expect(lastTaskInfo().error).toBe("Task canceled")
    })

})