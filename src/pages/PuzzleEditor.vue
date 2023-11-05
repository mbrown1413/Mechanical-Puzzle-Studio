<script setup lang="ts">
import { ref, Ref, reactive } from "vue"

import PieceEditor from "../components/PieceEditor.vue"
import PiecesList from "./PuzzleEditor/PiecesList.vue"
import { Action } from "../actions.ts"
import { getStorageInstances } from "../storage"
import {PuzzleFile} from "../PuzzleFile"


const props = defineProps<{
    storageId: string,
    puzzleId: string,
}>()

const puzzleStorage = getStorageInstances()[props.storageId]
const puzzleFile = reactive(
    puzzleStorage.get(props.puzzleId as string) as any
) as PuzzleFile

const selectedPieceIds: Ref<string[]> = ref(["piece-0"])

function performAction(action: Action) {
    action.perform(puzzleFile.puzzle)
    puzzleStorage.save(puzzleFile)
}

</script>

<template>
    <div class="container">
        <div class="grid-cell nav">
            <div class="home-link">
                <RouterLink to="/">&larrhk; Puzzles</RouterLink>
            </div>
            <div>
                {{ puzzleFile.name }}
            </div>
        </div>
        <div class="grid-cell side-top">
            <PiecesList
                :puzzle="puzzleFile.puzzle"
                v-model:selectedPieceIds="selectedPieceIds"
                @action="performAction"
            />
        </div>
        <div class="grid-cell side-bot">
        </div>
        <div class="grid-cell main">
            <PieceEditor
                :puzzle="puzzleFile.puzzle"
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