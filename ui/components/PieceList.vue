<script setup lang="ts">
import {Puzzle} from "~lib/Puzzle.ts"
import {Action, NewPieceAction, DeletePiecesAction} from "~ui/actions.ts"
import ListSelect from "~ui/common/ListSelect.vue"

defineProps<{
    puzzle: Puzzle,
    selectedPieceIds: string[],
}>()

const emit = defineEmits<{
    "update:selectedPieceIds": [pieceIds: string[]],
    action: [action: Action]
}>()
</script>

<template>
    <ListSelect
        :items="Array.from(puzzle.pieces.values())"
        :selectedIds="selectedPieceIds"
        @update:selectedIds="emit('update:selectedPieceIds', $event)"
        @add="emit('action', new NewPieceAction())"
        @remove="emit('action', new DeletePiecesAction(selectedPieceIds))"
    />
</template>