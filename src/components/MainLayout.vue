<script setup lang="ts">
import Display2DSvg from "./Display2DSvg.vue"
import { RectGrid } from "../grids/rect.ts"
import { Piece } from  "../puzzle.ts"

const grid = new RectGrid([3, 3, 1]);
const piece = new Piece([[0, 0, 0], [1, 0, 0], [0, 1, 0], [2, 0, 0]]);
</script>

<template>
    <div class="container">
        <div class="grid-cell nav">
        </div>
        <div class="grid-cell side-top">
        </div>
        <div class="grid-cell side-bot">
        </div>
        <div class="grid-cell main">
            <Display2DSvg :grid="grid" :piece="piece" />
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
    background-color: red;
    overflow: scroll;
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