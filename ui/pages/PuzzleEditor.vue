<script setup lang="ts">
import {ref, Ref, reactive, onMounted} from "vue"
import Split from "split-grid"

import {PuzzleFile} from "~lib/PuzzleFile.ts"

import {Action} from "~ui/actions.ts"
import {getStorageInstances} from "~ui/storage.ts"
import TabLayout from "~ui/common/TabLayout.vue"
import PieceEditor from "~ui/components/PieceEditor.vue"
import PieceMetadataEditor from "~ui/components/PieceMetadataEditor.vue"
import PieceList from "~ui/components/PieceList.vue"
import ProblemList from "~ui/components/ProblemList.vue"

const props = defineProps<{
    storageId: string,
    puzzleId: string,
}>()

const puzzleStorage = getStorageInstances()[props.storageId]
const puzzleFile = reactive(
    puzzleStorage.get(props.puzzleId as string) as any
) as PuzzleFile

const selectedPieceIds: Ref<string[]> = ref(["piece-0"])
const selectedProblemIds: Ref<string[]> = ref(["problem-0"])

const sideTabs = [
    {id: 'pieces', text: 'Pieces'},
    {id: 'problems', text: 'Problems'},
]

function performAction(action: Action) {
    action.perform(puzzleFile.puzzle)
    puzzleStorage.save(puzzleFile)
}

const columnSlider: Ref<HTMLDivElement | null> = ref(null)
const rowSlider: Ref<HTMLDivElement | null> = ref(null)
onMounted(() => {
    if(columnSlider.value && rowSlider.value) {
        Split({
            minSize: 100,
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
            <TabLayout
                :tabs="sideTabs"
                :contentStyle="{'flex-grow': 1}"
            >
                <template v-slot:pieces>
                    <PieceList
                        :puzzle="puzzleFile.puzzle"
                        v-model:selectedPieceIds="selectedPieceIds"
                        @action="performAction"
                    />
                </template>
                <template v-slot:problems>
                    <ProblemList
                        :puzzle="puzzleFile.puzzle"
                        v-model:selectedProblemIds="selectedProblemIds"
                        @action="performAction"
                    />
                </template>
            </TabLayout>
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
    display: flex;
    flex-direction: column;
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