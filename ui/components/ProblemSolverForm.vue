<script setup lang="ts">
import {computed, inject} from "vue"

import {Puzzle, ProblemId} from "~lib"

import {UiButtonDefinition} from "~/ui/ui-buttons.ts"
import {Action, EditProblemMetadataAction} from "~/ui/actions.ts"
import UiButton from "~/ui/components/UiButton.vue"


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

function toggleDisassemble() {
    if(!problem.value) { return }
    emit("action", new EditProblemMetadataAction(
        problem.value.id,
        {disassemble: !problem.value.disassemble}
    ))
}

const allUiButtons = inject("uiButtons") as Record<string, UiButtonDefinition>
const solveButton = allUiButtons.startSolve
</script>

<template>
    <div class="solver-form">
        <div style="display: flex; justify-content: space-between;">
            <h4>Solver</h4>
            <UiButton
                :uiButton="solveButton"
                variant="text"
                @click="emit('setUiFocus', 'solutions')"
            />
        </div>

        <VCheckbox
            label="Perform Disassembly"
            :model-value="problem?.disassemble"
            @click="toggleDisassemble"
        />
    </div>
</template>

<style>
.solver-form {
    margin: 1em;
}
.solver-form h4 {
    margin-bottom: 0.5em;
}
</style>