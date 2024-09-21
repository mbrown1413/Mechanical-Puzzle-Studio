<script setup lang="ts">
import {computed, inject, ref} from "vue"

import {Puzzle, ProblemId} from "~lib"

import {Action} from "~/ui/actions.ts"
import {UiButtonDefinition} from "~/ui/ui-buttons.ts"
import ListSelect from "~/ui/common/ListSelect.vue"

const props = defineProps<{
    puzzle: Puzzle,
    selectedProblemId: ProblemId | null,
}>()

const emit = defineEmits<{
    "update:selectedProblemId": [problemId: ProblemId | null],
    action: [action: Action]
}>()

const focused = ref(false)

defineExpose({
    setFocus(focus: boolean) {
        focused.value = focus
    }
})

const allUiButtons = inject("uiButtons") as Record<string, UiButtonDefinition>
const uiButtons = computed(() => {
    const newProblemButton = {...allUiButtons.newProblem}
    if(
        focused.value &&
        props.puzzle.problems.length === 0
    ) {
        newProblemButton.alwaysShowTooltip = true
    }

    return [
        allUiButtons.duplicateProblem,
        allUiButtons.deleteProblem,
        newProblemButton,
    ]
})
</script>

<template>
    <ListSelect
        :items="Array.from(puzzle.problems.values())"
        :selectedItemId="selectedProblemId"
        :uiButtons="uiButtons"
        @update:selectedItemId="emit('update:selectedProblemId', $event)"
    />
</template>