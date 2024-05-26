<script setup lang="ts">
import {inject} from "vue"

import {Puzzle, PieceId} from "~lib"

import {Action} from "~/ui/actions.ts"
import {UiButtonDefinition} from "~/ui/ui-buttons.ts"
import ListSelect from "~/ui/common/ListSelect.vue"

defineProps<{
    puzzle: Puzzle,
    selectedPieceIds: PieceId[],
}>()

const emit = defineEmits<{
    "update:selectedPieceIds": [pieceIds: PieceId[]],
    action: [action: Action]
}>()

const allUiButtons = inject("uiButtons") as Record<string, UiButtonDefinition>
const uiButtons = [
    allUiButtons.duplicatePiece,
    allUiButtons.deletePiece,
    allUiButtons.newPiece,
]
</script>

<template>
    <ListSelect
        enableEditButtons
        :items="Array.from(puzzle.pieces.values())"
        :selectedIds="selectedPieceIds"
        :uiButtons="uiButtons"
        @update:selectedIds="emit('update:selectedPieceIds', $event)"
    />
</template>