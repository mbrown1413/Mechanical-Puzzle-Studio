<script setup lang="ts">
import {computed, inject} from "vue"

import {Puzzle, ProblemId, AssemblyProblem, SymmetryReduction} from "~lib"

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

type ProblemMetadata = {
    symmetryReduction?: SymmetryReduction
    disassemble?: boolean
    removeNoDisassembly?: boolean
}
function toggleBoolean(field: "disassemble" | "removeNoDisassembly") {
    if(!problem.value) { return }
    const metadataEdit: ProblemMetadata = {}
    metadataEdit[field] = !problem.value[field]
    emit("action", new EditProblemMetadataAction(
        problem.value.id,
        metadataEdit
    ))
}

function setSymmetryReduction(value: SymmetryReduction) {
    if(!problem.value) { return }
    const metadataEdit: ProblemMetadata = {}
    metadataEdit.symmetryReduction = value
    emit("action", new EditProblemMetadataAction(
        problem.value.id,
        metadataEdit
    ))
}

const symmetryReductionItems = [
    {title: "None", value: null},
    {title: "Rotation", value: "rotation"},
    {title: "Rotation + Mirror", value: "rotation+mirror"},
]

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
            <legend>Assembly</legend>
            <VSelect
                label="Symmetry Reduction"
                :items="symmetryReductionItems"
                :model-value="problem?.symmetryReduction || null"
                @update:model-value="setSymmetryReduction($event)"
            />
        </fieldset>

        <fieldset>
            <legend class="legend-with-checkbox">
                <VCheckbox
                    label="Disassembly"
                    :model-value="problem?.disassemble"
                    @click="toggleBoolean('disassemble')"
                    hide-details
                />
            </legend>
            <VCheckbox
                label="Remove solutions with no disassemblies"
                :model-value="problem?.removeNoDisassembly"
                :disabled="!problem?.disassemble"
                @click="toggleBoolean('removeNoDisassembly')"
                hide-details
                class="mb-2"
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
.solver-form:deep(.v-selection-control) {
    min-height: unset;
}

fieldset {
    margin-top: 1em;
    padding: 0.5em;
}
legend {
    margin-left: 48px;
}
.legend-with-checkbox {
    margin-left: 8px;
}
</style>