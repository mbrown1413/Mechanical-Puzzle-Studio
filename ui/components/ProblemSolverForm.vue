<script setup lang="ts">
import {computed, inject} from "vue"

import {Puzzle, ProblemId, AssemblyProblem} from "~lib"

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
    props.puzzle.problems.find(p => p.id === props.problemId) as AssemblyProblem || null
)

type BooleanMetadata = {
    disassemble?: boolean
    removeNoDisassembly?: boolean
}
function toggleBoolean(field: keyof BooleanMetadata) {
    if(!problem.value) { return }
    const metadataEdit: BooleanMetadata = {}
    metadataEdit[field] = !problem.value[field]
    emit("action", new EditProblemMetadataAction(
        problem.value.id,
        metadataEdit
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

        <fieldset>
            <legend>
                <VCheckbox
                    label="Disassembly"
                    :model-value="problem?.disassemble"
                    @click="toggleBoolean('disassemble')"
                />
            </legend>
            <VCheckbox
                label="Remove solutions with no disassemblies"
                :model-value="problem?.removeNoDisassembly"
                :disabled="!problem?.disassemble"
                @click="toggleBoolean('removeNoDisassembly')"
            />
        </fieldset>
    </div>
</template>

<style scoped>
.solver-form {
    margin: 1em;
}
.solver-form h4 {
    margin-bottom: 0.5em;
}

legend .v-input {
    grid-template-areas: unset;
}
</style>