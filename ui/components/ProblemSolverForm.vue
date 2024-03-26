<script setup lang="ts">
import {Puzzle} from "~lib"

import {ProblemSolveTask} from "~/ui/tasks.ts"
import {taskRunner} from "~/ui/globals.ts"


const props = defineProps<{
    puzzle: Puzzle,
    problemId: string | null,
}>()

const emit = defineEmits<{
    setUiFocus: [focus: "solutions"]
}>()

function startSolve() {
    if(props.problemId === null) {
        return
    }
    taskRunner.submitTask(
        new ProblemSolveTask(props.puzzle, props.problemId)
    )
    emit("setUiFocus", "solutions")
}

</script>

<template>
    <div class="solver-form">
        <h4>Solver</h4>

        <VBtn
                enabled="problemId !== null"
                @click="startSolve"
        >
            Find Solutions
        </VBtn>
    </div>
</template>

<style>
.solver-form {
    margin: 1em;
    width: fit-content;
}
.solver-form h4 {
    margin-bottom: 0.5em;
}
</style>