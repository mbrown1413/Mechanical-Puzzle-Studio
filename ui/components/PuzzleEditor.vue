<!--
    Main component for editing a puzzle. Uses grid-based layout intended to
    take most of the page.
-->

<script setup lang="ts">
import {ref, Ref, onMounted} from "vue"
import Split from "split-grid"

import {Puzzle, PieceId, ProblemId} from "~lib"

import {Action, NewPieceAction} from "~/ui/actions.ts"
import TabLayout from "~/ui/common/TabLayout.vue"
import PieceEditor from "~/ui/components/PieceEditor.vue"
import SolutionDisplay from "~/ui/components/SolutionDisplay.vue"
import ItemMetadataEditor from "~/ui/components/ItemMetadataEditor.vue"
import PieceList from "~/ui/components/PieceList.vue"
import ProblemList from "~/ui/components/ProblemList.vue"
import ProblemSolverForm from "~/ui/components/ProblemSolverForm.vue"
import SolutionList from "~/ui/components/SolutionList.vue"

const props = defineProps<{
    puzzle: Puzzle,
}>()

const emit = defineEmits<{
    action: [action: Action]
}>()

const selectedPieceIds: Ref<PieceId[]> = ref(
    props.puzzle.pieces.length ? [props.puzzle.pieces[0].id] : []
)
const selectedProblemIds: Ref<ProblemId[]> = ref(
    props.puzzle.problems.length ? [props.puzzle.problems[0].id] : []
)

const pieceEditor: Ref<InstanceType<typeof PieceEditor> | null> = ref(null)
const solutionList: Ref<InstanceType<typeof SolutionList> | null> = ref(null)

const currentTabId = ref("pieces")
const sideTabs = [
    {id: "pieces", text: "Pieces"},
    {id: "problems", text: "Problems"},
    {id: "solutions", text: "Solutions"},
]

defineExpose({
    currentTabId,
    selectedPieceIds,
    selectedProblemIds,
})

const columnSlider: Ref<HTMLDivElement | null> = ref(null)
const rowSlider: Ref<HTMLDivElement | null> = ref(null)
onMounted(() => {
    if(columnSlider.value && rowSlider.value) {
        Split({
            minSize: 315,
            columnGutters: [{
                track: 1,
                element: columnSlider.value
            }],
            rowGutters: [{
                track: 1,
                element: rowSlider.value
            }]
        })
    }
})

function performAction(action: Action) {
    if(action instanceof NewPieceAction && selectedPieceIds.value.length === 1) {
        const id = selectedPieceIds.value[0]
        const piece = props.puzzle.getPiece(id)
        if(piece && piece.bounds !== undefined) {
            action.bounds = Object.assign({}, piece.bounds)
        }
    }

    emit("action", action)
}

function setUiFocus(focus: "pieces" | "problems" | "solutions") {
    currentTabId.value = focus
}
</script>

<template>
    <VMain class="puzzleEditor-container">

        <div class="slider col-slide" ref="columnSlider"></div>

        <div class="grid-cell side-top">
            <TabLayout
                :tabs="sideTabs"
                v-model:currentTabId="currentTabId"
                :contentStyle="{'flex-grow': 1}"
            >
                <template v-slot:pieces>
                    <PieceList
                        :puzzle="puzzle"
                        v-model:selectedPieceIds="selectedPieceIds"
                        @action="performAction"
                    />
                </template>
                <template v-slot:problems>
                    <ProblemList
                        :puzzle="puzzle"
                        :allowCreateDelete="true"
                        v-model:selectedProblemIds="selectedProblemIds"
                        @action="performAction"
                    />
                </template>
                <template v-slot:solutions>
                    <ProblemList
                        :puzzle="puzzle"
                        :allowCreateDelete="false"
                        v-model:selectedProblemIds="selectedProblemIds"
                        @action="performAction"
                    />
                </template>
            </TabLayout>
        </div>

        <div class="slider row-slide" ref="rowSlider"></div>

        <div class="grid-cell side-bot">
            <ItemMetadataEditor
                v-show="currentTabId === 'pieces' && selectedPieceIds.length"
                :puzzle="puzzle"
                itemType="piece"
                :itemId="selectedPieceIds.length === 1 ? selectedPieceIds[0] : null"
                @action="performAction"
            />
            <ProblemSolverForm
                v-show="currentTabId === 'problems' && selectedProblemIds.length"
                :puzzle="puzzle"
                :problemId="selectedProblemIds.length === 1 ? selectedProblemIds[0] : null"
                @setUiFocus="setUiFocus"
            />
            <SolutionList
                ref="solutionList"
                v-show="currentTabId === 'solutions'"
                :puzzle="puzzle"
                :problemId="selectedProblemIds.length === 1 ? selectedProblemIds[0] : null"
            />
        </div>

        <div class="grid-cell main">
            <PieceEditor
                ref="pieceEditor"
                v-show="currentTabId === 'pieces'"
                :puzzle="puzzle"
                :pieceId="selectedPieceIds.length === 1 ? selectedPieceIds[0] : null"
                @action="performAction"
            />
            <ItemMetadataEditor
                v-show="currentTabId === 'problems'"
                :puzzle="puzzle"
                itemType="problem"
                :itemId="selectedProblemIds.length === 1 ? selectedProblemIds[0] : null"
                @action="performAction"
            />
            <SolutionDisplay
                v-show="currentTabId === 'solutions' && solutionList?.selectedSolutions.length === 1"
                :puzzle="puzzle"
                :solution="solutionList?.selectedSolutions[0] || null"
            />
        </div>
    </VMain>
</template>

<style scoped>

.puzzleEditor-container {
    display: grid;
    height: 100vh;
    transition: none;
    grid-template:
        "side-top  col-slide main" 1fr
        "row-slide col-slide main" 5px
        "side-bot  col-slide main" 1fr
        / 315px    5px       4fr;
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