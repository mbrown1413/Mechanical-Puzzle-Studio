<script setup lang="ts">
import {computed, inject, ref} from "vue"

import {Puzzle, Piece, PieceId} from "~lib"

import {Action} from "~/ui/actions.ts"
import {UiButtonDefinition} from "~/ui/ui-buttons.ts"
import ListSelect from "~/ui/common/ListSelect.vue"

const props = defineProps<{
    puzzle: Puzzle,
    selectedPieceId: PieceId | null,
    selectedPieceGroupId: PieceId | null,
}>()

const emit = defineEmits<{
    "update:selectedPieceId": [pieceId: PieceId | null],
    "update:selectedPieceGroupId": [pieceGroupIdx: number | null],
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
    const newPieceButton = {...allUiButtons.newPiece}
    if(
        focused.value &&
        props.puzzle.pieces.length === 0
    ) {
        newPieceButton.alwaysShowTooltip = true
    }

    return [
        allUiButtons.duplicatePiece,
        allUiButtons.deleteSelectedItem,
        newPieceButton,
    ]
})

const items = computed(() => {
    return props.puzzle.pieceTree.map((item) => {
        if(item instanceof Piece) {
            return item
        } else {
            return {
                isGroup: true,
                id: item.id,
                label: item.label,
                items: item.pieces,
            }
        }
    })
})
</script>

<template>
    <ListSelect
        :items="items"
        :selectedItemId="selectedPieceId"
        :selectedGroupId="selectedPieceGroupId"
        :uiButtons="uiButtons"
        :upButton="allUiButtons.pieceListMoveUp"
        :downButton="allUiButtons.pieceListMoveDown"
        @update:selectedItemId="emit('update:selectedPieceId', $event)"
        @update:selectedGroupId="emit('update:selectedPieceGroupId', $event)"
    />
</template>