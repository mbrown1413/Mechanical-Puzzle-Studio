<script setup lang="ts">
import { ref, Ref, reactive } from "vue"

import PieceEditor from "./PieceEditor/PieceEditor.vue"
import PiecesList from "./PiecesList.vue"
import { RectGrid } from "../grids/rect.ts"
import { Puzzle, Piece } from  "../puzzle.ts"

const puzzle = reactive(new Puzzle(
    new RectGrid([3, 3, 3]),
    [
        new Piece("piece-0", [[0, 0, 0], [1, 0, 0], [0, 1, 0], [2, 0, 0]]),
        new Piece("piece-1", [[0, 0, 1], [1, 0, 1], [0, 1, 1], [2, 0, 1]]),
    ]
))

const selectedPieceIds: Ref<string[]> = ref([])

</script>

<template>
    <div class="container">
        <div class="grid-cell nav">
        </div>
        <div class="grid-cell side-top">
            <PiecesList
                :puzzle="puzzle"
                v-model:selectedPieceIds="selectedPieceIds"
                @action="$event.perform(puzzle)"
            />
        </div>
        <div class="grid-cell side-bot">
        </div>
        <div class="grid-cell main">
            <PieceEditor
                :puzzle="puzzle"
                :pieceId="selectedPieceIds.length === 1 ? selectedPieceIds[0] : null"
                @action="$event.perform(puzzle)"
            />
        </div>
    </div>
</template>

<style scoped>

.container {
    display: grid;
    height: 100vh;
    grid-template:
        "nav      nav " 100px
        "side-top main" 1fr
        "side-bot main" 1fr
        / minmax(150px, 1fr) 4fr ;
}

.nav {
    grid-area: nav;
    background-color: purple;
}

.side-top {
    grid-area: side-top;
}

.side-bot {
    grid-area: side-bot;
    background-color: green;
}

.main {
    grid-area: main;
    background-color: rgb(255, 255, 255);
    overflow: auto;
}

</style>