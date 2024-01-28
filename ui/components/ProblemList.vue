<script setup lang="ts">
import {Puzzle} from "~lib"

import {Action, NewProblemAction, DeleteProblemsAction} from "~/ui/actions.ts"
import ListSelect from "~/ui/common/ListSelect.vue"

defineProps<{
    puzzle: Puzzle,
    selectedProblemIds: string[],
    allowCreateDelete: boolean,
}>()

const emit = defineEmits<{
    "update:selectedProblemIds": [problemIds: string[]],
    action: [action: Action]
}>()
</script>

<template>
    <ListSelect
            :showButtons="allowCreateDelete"
            :items="Array.from(puzzle.problems.values())"
            :selectedIds="selectedProblemIds"
            @update:selectedIds="emit('update:selectedProblemIds', $event)"
            @add="emit('action', new NewProblemAction())"
            @remove="emit('action', new DeleteProblemsAction(selectedProblemIds))"
    />
</template>