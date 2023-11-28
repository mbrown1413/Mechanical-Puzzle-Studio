<script setup lang="ts">
import {Puzzle} from "~lib/Puzzle.ts"
import {Action, NewProblemAction, DeleteProblemsAction} from "~ui/actions.ts"
import ListSelect from "~ui/common/ListSelect.vue"

defineProps<{
    puzzle: Puzzle,
    selectedProblemIds: string[],
}>()

const emit = defineEmits<{
    "update:selectedProblemIds": [problemIds: string[]],
    action: [action: Action]
}>()
</script>

<template>
    <ListSelect
        :items="Array.from(puzzle.problems.values())"
        :selectedIds="selectedProblemIds"
        @update:selectedIds="emit('update:selectedProblemIds', $event)"
        @add="emit('action', new NewProblemAction())"
        @remove="emit('action', new DeleteProblemsAction(selectedProblemIds))"
    />
</template>