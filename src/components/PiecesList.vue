<script setup lang="ts">
import { ref, Ref } from "vue"

import { Puzzle } from "../puzzle.ts"
import { Action, AddPieceAction, DeletePiecesAction } from "../actions.ts"

const el: Ref<HTMLSelectElement | null> = ref(null)

defineProps<{
    puzzle: Puzzle,
    selectedPieceIds: string[],
}>()

const emit = defineEmits<{
    "update:selectedPieceIds": [pieceIds: string[]],
    action: [action: Action]
}>()

function onItemsSelect() {
    if(el.value === null) return
    const selectedValues = Array.from(el.value.selectedOptions).map(option => option.value)
    emit('update:selectedPieceIds', selectedValues)
}
</script>

<template>
    <div class="piece-list-container">
        <button
            class="action-btn add-piece-btn"
            @click="emit('action', new AddPieceAction())"
        >+</button>
        <button
            class="action-btn del-piece-btn"
            @click="emit('action', new DeletePiecesAction(selectedPieceIds))"
        >-</button>
        <select
            ref="el"
            multiple
            :value="selectedPieceIds"
            @change="onItemsSelect"
        >
            <option
                v-for="piece in puzzle.pieces.values()"
                :value="piece.id"
            >
                <i class="piece-color-indicator">&nbsp;</i>
                {{ piece.id }}
            </option>
        </select>
    </div>
</template>

<style scoped>
.piece-list-container {
    height: 100%;
}

select {
    width: 100%;
    height: 100%;
}

.action-btn {
    width: 50%;
}
.add-piece-btn {
    background-color: green;
}
.del-piece-btn {
    background-color: red;
}

.piece-color-indicator {
    display: inline-block;
    vertical-align: middle;
    width: 1em;
    height: 1em;
    margin-right: 0.5em;
    background-color: black;
}
</style>