<script setup lang="ts">
import {computed, inject, ref} from "vue"

import {Puzzle, Piece, PieceId} from "~lib"

import {Action} from "~/ui/actions.ts"
import {UiButtonDefinition} from "~/ui/ui-buttons.ts"
import ListSelect from "~/ui/common/ListSelect.vue"

const props = defineProps<{
    puzzle: Puzzle,
    selectedPieceIds: PieceId[],
    selectedPieceGroupIds: PieceId[],
}>()

const emit = defineEmits<{
    "update:selectedPieceIds": [pieceIds: PieceId[]],
    "update:selectedPieceGroupIds": [pieceGroupIds: number[]],
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

    const pieceMap = new Map(props.puzzle.pieces.map(
        (piece) => [piece.id, piece]
    ))

    const groups = []
    for(const [i, pieceGroup] of props.puzzle.pieceGroups.entries()) {
        const piecesInGroup = pieceGroup.pieceIds.map((id) => {
            const piece = pieceMap.get(id)
            pieceMap.delete(id)
            return piece
        }).filter(
            (piece): piece is Piece => piece !== undefined
        )

        groups.push({
            isGroup: true,
            id: i,
            label: pieceGroup.label,
            items: piecesInGroup,
        })
    }

    const piecesNotInGroups = pieceMap.values()
    return [...piecesNotInGroups, ...groups]
})
</script>

<template>
    <ListSelect
        :items="items"
        :selectedItems="selectedPieceIds"
        :selectedGroups="selectedPieceGroupIds"
        :uiButtons="uiButtons"
        @update:selectedItems="emit('update:selectedPieceIds', $event)"
        @update:selectedGroups="emit('update:selectedPieceGroupIds', $event)"
    />
</template>