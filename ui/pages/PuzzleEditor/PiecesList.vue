<script setup lang="ts">
import {ref, Ref} from "vue"

import {Puzzle} from "~lib/Puzzle.ts"
import {Action, AddPieceAction, DeletePiecesAction} from "~ui/actions.ts"

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
        <div class="buttons">
            <button
                class="action-btn del-piece-btn"
                @click="emit('action', new DeletePiecesAction(selectedPieceIds))"
            >-</button>
            <button
                class="action-btn add-piece-btn"
                @click="emit('action', new AddPieceAction())"
            >+</button>
        </div>
        <select
            ref="el"
            multiple
            :value="selectedPieceIds"
            @change="onItemsSelect"
        >
            <option
                v-for="piece in puzzle.pieces.values()"
                :value="piece.id"
                :class="{'empty-label': !piece.label}"
            >
                <i
                    class="piece-color-indicator"
                    :style="{'background-color': piece.color || '#000000'}"
                >&nbsp;</i>
                {{ piece.label }}
                <span
                    v-if="!piece.label"
                >
                    (empty name)
                </span>
            </option>
        </select>
    </div>
</template>

<style scoped>
.piece-list-container {
    height: 100%;
    display: flex;
    flex-direction: column;
}

select {
    width: 100%;
    height: 100%;
    border: 0;
}
select .empty-label {
    color: #606060;
}
select .empty-label span {
    font-size: 75%;
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
    border: var(--bs-border-width) solid var(--bs-border-color);
}
</style>