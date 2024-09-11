<script setup lang="ts">
import {computed, inject, ref, Ref} from "vue"

import {Puzzle, PieceId} from "~lib"

import {Action} from "~/ui/actions.ts"
import {UiButtonDefinition} from "~/ui/ui-buttons.ts"
import ListSelect from "~/ui/common/ListSelect.vue"

const props = defineProps<{
    puzzle: Puzzle,
    selectedPieceIds: PieceId[],
}>()

const emit = defineEmits<{
    "update:selectedPieceIds": [pieceIds: PieceId[]],
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
        allUiButtons.deletePiece,
        newPieceButton,
    ]
})
</script>

<template>
    <ListSelect
        :items="[...puzzle.pieces.values()]"
        :selectedItems="selectedPieceIds"
        :uiButtons="uiButtons"
        @update:selectedItems="emit('update:selectedPieceIds', $event)"
    />
</template>