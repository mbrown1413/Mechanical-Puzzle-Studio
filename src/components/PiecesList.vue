<script setup lang="ts">
import { ref, Ref } from "vue"

import { Puzzle } from "../puzzle.ts"

const el: Ref<HTMLSelectElement | null> = ref(null)

defineProps<{
    puzzle: Puzzle,
    selectedPieceIds: string[],
}>()

const emit = defineEmits<{
    "update:selectedPieceIds": [pieceIds: string[]],
}>()

function onItemsSelect() {
    if(el.value === null) return
    const selectedValues = Array.from(el.value.selectedOptions).map(option => option.value)
    emit('update:selectedPieceIds', selectedValues)
}

</script>

<template>
    <select
        ref="el"
        multiple
        :value="selectedPieceIds"
        @change="onItemsSelect"
    >
        <option
            v-for="piece in puzzle.pieces"
            :value="piece.id"
        >
            <i class="piece-color-indicator">&nbsp;</i>
            {{ piece.id }}
        </option>
    </select>
</template>

<style scoped>
select {
    width: 100%;
    height: 100%;
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