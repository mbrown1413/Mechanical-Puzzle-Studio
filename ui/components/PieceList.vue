<script setup lang="ts">
import {Puzzle, PieceId} from "~lib"

import {Action, NewPieceAction, DeletePiecesAction} from "~/ui/actions.ts"
import ListSelect from "~/ui/common/ListSelect.vue"

defineProps<{
    puzzle: Puzzle,
    selectedPieceIds: PieceId[],
}>()

const emit = defineEmits<{
    "update:selectedPieceIds": [pieceIds: PieceId[]],
    action: [action: Action]
}>()
</script>

<template>
    <ListSelect
            showButtons
            :items="Array.from(puzzle.pieces.values())"
            :selectedIds="selectedPieceIds"
            @update:selectedIds="emit('update:selectedPieceIds', $event)"
            @add="emit('action', new NewPieceAction())"
            @remove="emit('action', new DeletePiecesAction(selectedPieceIds))"
    />
</template>