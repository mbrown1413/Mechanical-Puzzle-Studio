<script setup lang="ts">
import {inject} from "vue"

import {Puzzle, ProblemId} from "~lib"

import {Action} from "~/ui/actions.ts"
import {UiButtonDefinition} from "~/ui/ui-buttons.ts"
import ListSelect from "~/ui/common/ListSelect.vue"

defineProps<{
    puzzle: Puzzle,
    selectedProblemIds: ProblemId[],
}>()

const emit = defineEmits<{
    "update:selectedProblemIds": [problemIds: ProblemId[]],
    action: [action: Action]
}>()

const allUiButtons = inject("uiButtons") as Record<string, UiButtonDefinition>
const uiButtons = [
    allUiButtons.duplicateProblem,
    allUiButtons.deleteProblem,
    allUiButtons.newProblem,
]
</script>

<template>
    <ListSelect
        :items="Array.from(puzzle.problems.values())"
        :selectedIds="selectedProblemIds"
        :uiButtons="uiButtons"
        @update:selectedIds="emit('update:selectedProblemIds', $event)"
    />
</template>