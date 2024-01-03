<script setup lang="ts">
import {computed, ref, Ref, reactive, onMounted} from "vue"
import Split from "split-grid"

import {PuzzleFile} from "~lib/PuzzleFile.ts"

import {Action, ProblemSolveAction} from "~ui/actions.ts"
import {getStorageInstances} from "~ui/storage.ts"
import TabLayout from "~ui/common/TabLayout.vue"
import PieceEditor from "~ui/components/PieceEditor.vue"
import SolutionViewer from "~ui/components/SolutionViewer.vue"
import ItemMetadataEditor from "~ui/components/ItemMetadataEditor.vue"
import PieceList from "~ui/components/PieceList.vue"
import ProblemList from "~ui/components/ProblemList.vue"
import ProblemSolverForm from "~ui/components/ProblemSolverForm.vue"
import ListSelect from "~ui/common/ListSelect.vue"

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
const selectedSolutionIds: Ref<string[]> = ref([])

const pieceEditor: Ref<InstanceType<typeof PieceEditor> | null> = ref(null)

const currentTabId = ref("pieces")
const sideTabs = [
    {id: "pieces", text: "Pieces"},
    {id: "problems", text: "Problems"},
    {id: "solutions", text: "Solutions"},
]

const solutionItems = computed(() => {
    if(selectedProblemIds.value.length !== 1) {
        return []
    }
    const problem = puzzleFile.puzzle.problems.get(selectedProblemIds.value[0])
    if(!problem || problem.solutions === null) {
        return []
    }
    return problem.solutions.map((solution, i) => {
        const id = `solution-${i}`
        return {
            id: id,
            label: id,
            solution,
        }
    })
})

const selectedSolutions = computed(() => {
    return solutionItems.value.filter(
        (item) => selectedSolutionIds.value.includes(item.id)
    ).map(
        (item) => item.solution
    )
})

function performAction(action: Action) {
    action.perform(puzzleFile.puzzle)
    pieceEditor.value?.redraw()
    puzzleStorage.save(puzzleFile)
    
    if(action instanceof ProblemSolveAction) {
        currentTabId.value = "solutions"
    }
}

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
</script>

<template>
    <VAppBar>
        <div class="home-link">
            <RouterLink to="/">&larrhk; Puzzles</RouterLink>
        </div>
        <div>
            {{ puzzleFile.name }}
        </div>
    </VAppBar>
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
                        :puzzle="puzzleFile.puzzle"
                        v-model:selectedPieceIds="selectedPieceIds"
                        @action="performAction"
                    />
                </template>
                <template v-slot:problems>
                    <ProblemList
                        :puzzle="puzzleFile.puzzle"
                        :allowCreateDelete="true"
                        v-model:selectedProblemIds="selectedProblemIds"
                        @action="performAction"
                    />
                </template>
                <template v-slot:solutions>
                    <ProblemList
                        :puzzle="puzzleFile.puzzle"
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
                v-show="currentTabId === 'pieces'"
                :puzzle="puzzleFile.puzzle"
                itemType="piece"
                :itemId="selectedPieceIds.length === 1 ? selectedPieceIds[0] : null"
                @action="performAction"
            />
            <ProblemSolverForm
                v-show="currentTabId === 'problems' && selectedProblemIds"
                :puzzle="puzzleFile.puzzle"
                :problemId="selectedProblemIds.length === 1 ? selectedProblemIds[0] : null"
                @action="performAction"
            />
            <div v-show="currentTabId === 'solutions'">
                <h4>Solutions</h4>
                <ListSelect
                        :items="solutionItems"
                        v-model:selectedIds="selectedSolutionIds"
                />
            </div>
        </div>

        <div class="grid-cell main">
            <PieceEditor
                ref="pieceEditor"
                v-show="currentTabId === 'pieces'"
                :puzzle="puzzleFile.puzzle"
                :pieceId="selectedPieceIds.length === 1 ? selectedPieceIds[0] : null"
                @action="performAction"
            />
            <ItemMetadataEditor
                v-show="currentTabId === 'problems'"
                :puzzle="puzzleFile.puzzle"
                itemType="problem"
                :itemId="selectedProblemIds.length === 1 ? selectedProblemIds[0] : null"
                @action="performAction"
            />
            <SolutionViewer
                v-show="currentTabId === 'solutions'"
                :puzzle="puzzleFile.puzzle"
                :solution="selectedSolutions[0] || null"
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