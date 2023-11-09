<script setup lang="ts">
import { ref, Ref, reactive, onMounted } from "vue"
import Split from "split-grid"

import PieceEditor from "./PuzzleEditor/PieceEditor.vue"
import PieceMetadataEditor from "./PuzzleEditor/PieceMetadataEditor.vue"
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

const columnSlider: Ref<HTMLDivElement | null> = ref(null)
const rowSlider: Ref<HTMLDivElement | null> = ref(null)
onMounted(() => {
    if(columnSlider.value && rowSlider.value) {
        Split({
            columnGutters: [{
                track: 1,
                element: columnSlider.value
            }],
            rowGutters: [{
                track: 2,
                element: rowSlider.value
            }]
        })
    }
})
</script>

<template>
    <div class="puzzleEditor-container">
        <div class="grid-cell nav">
            <div class="home-link">
                <RouterLink to="/">&larrhk; Puzzles</RouterLink>
            </div>
            <div>
                {{ puzzleFile.name }}
            </div>
        </div>
        <div class="slider col-slide" ref="columnSlider"></div>
        <div class="grid-cell side-top">
            <PiecesList
                :puzzle="puzzleFile.puzzle"
                v-model:selectedPieceIds="selectedPieceIds"
                @action="performAction"
            />
        </div>
        <div class="slider row-slide" ref="rowSlider"></div>
        <div class="grid-cell side-bot">
            <PieceMetadataEditor
                :puzzle="puzzleFile.puzzle"
                :pieceId="selectedPieceIds.length === 1 ? selectedPieceIds[0] : null"
                @action="performAction"
            />
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

.puzzleEditor-container {
    display: grid;
    height: 100vh;
    grid-template:
        "nav       nav       nav " 100px
        "side-top  col-slide main" 1fr
        "row-slide col-slide main" 5px
        "side-bot  col-slide main" 1fr
        / 200px    5px       4fr;
}

.nav {
    grid-area: nav;
}

.slider {
    background-color: #909090;
    border: 2px black groove;
    cursor: scr
}

.col-slide {
    grid-area: col-slide;
    cursor: col-resize;
    border-top: none;
    border-bottom: none;
}

.row-slide {
    grid-area: row-slide;
    cursor: row-resize;
    border-left: none;
    border-right: none;
}

.side-top {
    grid-area: side-top;
}

.side-bot {
    grid-area: side-bot;
}

.main {
    grid-area: main;
    overflow: auto;
}
    
.home-link {
    font-size: 200%;
}

</style>