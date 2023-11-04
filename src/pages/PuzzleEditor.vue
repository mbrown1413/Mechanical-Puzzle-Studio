<script setup lang="ts">
import { ref, Ref, reactive } from "vue"

import PieceEditor from "../components/PieceEditor.vue"
import PiecesList from "./PuzzleEditor/PiecesList.vue"
import { RectGrid } from "../grids/rect.ts"
import { Puzzle } from  "../puzzle.ts"
import { Action } from "../actions.ts"

/* Load puzzle from localstorage, or create new empty puzzle. */
function loadPuzzle(): Puzzle {
    const data = localStorage.getItem("puzzle")
    if(data !== null) {
        return Puzzle.deserialize(JSON.parse(data))
    } else {
        return new Puzzle(
            "puzzle-0",
            new RectGrid("grid-0", [3, 3, 3]),
        ) as any
    }
}

const puzzle = reactive(loadPuzzle() as any) as Puzzle

const selectedPieceIds: Ref<string[]> = ref(["piece-0"])

function performAction(action: Action) {
    action.perform(puzzle)
    const data = puzzle.serialize()
    localStorage.setItem("puzzle", JSON.stringify(data))
}

</script>

<template>
    <div class="container">
        <div class="grid-cell nav">
            <div class="home-link">
                <RouterLink to="/">&larrhk; Puzzles</RouterLink>
            </div>
        </div>
        <div class="grid-cell side-top">
            <PiecesList
                :puzzle="puzzle"
                v-model:selectedPieceIds="selectedPieceIds"
                @action="performAction"
            />
        </div>
        <div class="grid-cell side-bot">
        </div>
        <div class="grid-cell main">
            <PieceEditor
                :puzzle="puzzle"
                :pieceId="selectedPieceIds.length === 1 ? selectedPieceIds[0] : null"
                @action="performAction"
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
    
.home-link {
    font-size: 200%;
}

</style>