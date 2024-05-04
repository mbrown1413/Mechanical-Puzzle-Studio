<script setup lang="ts">
import {Puzzle, ProblemId} from "~lib"

import {ProblemSolveTask} from "~/ui/tasks.ts"
import {taskRunner} from "~/ui/globals.ts"
import {Action, EditProblemMetadataAction} from "~/ui/actions.ts"

import {computed} from "vue"


const props = defineProps<{
    puzzle: Puzzle,
    problemId: ProblemId | null,
}>()

const emit = defineEmits<{
    setUiFocus: [focus: "solutions"]
    action: [action: Action]
}>()

const problem = computed(() =>
    props.puzzle.problems.find(p => p.id === props.problemId) || null
)

function startSolve() {
    if(props.problemId === null) {
        return
    }
    taskRunner.submitTask(
        new ProblemSolveTask(props.puzzle, props.problemId)
    )
    emit("setUiFocus", "solutions")
}

function toggleDisassemble() {
    if(!problem.value) { return }
    emit("action", new EditProblemMetadataAction(
        problem.value.id,
        {disassemble: !problem.value.disassemble}
    ))
}

</script>

<template>
    <div class="solver-form">
        <h4>Solver</h4>

        <VCheckbox
            label="Perform Disassembly"
            :model-value="problem?.disassemble"
            @click="toggleDisassemble"
        />

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