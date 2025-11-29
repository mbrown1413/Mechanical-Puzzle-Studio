<!--
    Main component for editing a puzzle. Uses grid-based layout intended to
    take most of the page.
-->

<script setup lang="ts">
import {computed, ref, Ref, watch, watchEffect} from "vue"
import Split from "split-grid"

import {Puzzle, ShapeId, ProblemId, AssemblySolution} from "~lib"

import {Action, EditShapeGroupMetadataAction} from "~/ui/actions.ts"
import TabLayout from "~/ui/common/TabLayout.vue"
import ShapeEditor from "~/ui/components/ShapeEditor.vue"
import SolutionDisplay from "~/ui/components/SolutionDisplay.vue"
import ItemMetadataEditor from "~/ui/components/ItemMetadataEditor.vue"
import ShapeList from "~/ui/components/ShapeList.vue"
import ProblemList from "~/ui/components/ProblemList.vue"
import ProblemSolverForm from "~/ui/components/ProblemSolverForm.vue"
import SolutionList from "~/ui/components/SolutionList.vue"
import FormEditor from "~/ui/components/FormEditor.vue"

const props = defineProps<{
    puzzle: Puzzle,
}>()

const emit = defineEmits<{
    action: [action: Action]
}>()

const selectedShapeId: Ref<ShapeId | null> = ref(
    props.puzzle.shapes.length ? props.puzzle.shapes[0].id : null
)
const selectedShapeGroupId: Ref<number | null> = ref(null)
const selectedProblemId: Ref<ProblemId | null> = ref(
    props.puzzle.problems.length ? props.puzzle.problems[0].id : null
)
const selectedSolutionId: Ref<number | null> = ref(null)

const shapeEditor: Ref<InstanceType<typeof ShapeEditor> | null> = ref(null)
const shapeList: Ref<InstanceType<typeof ShapeList> | null> = ref(null)
const problemList: Ref<InstanceType<typeof ProblemList> | null> = ref(null)
const solutionList: Ref<InstanceType<typeof SolutionList> | null> = ref(null)
const auxEditArea: Ref<HTMLElement | null> = ref(null)

const currentTabId: Ref<"shapes" | "problems" | "solutions"> = ref("shapes")
const sideTabs = [
    {id: "shapes", text: "Shapes"},
    {id: "problems", text: "Problems"},
    {id: "solutions", text: "Solutions", slot: "problems"},
]

const selectedShape = computed(() => {
    if(selectedShapeId.value === null) { return null }
    return props.puzzle.getShape(selectedShapeId.value)
})
const selectedShapeGroup = computed(() => {
    if(selectedShapeGroupId.value === null) { return null }
    return props.puzzle.getShapeGroup(selectedShapeGroupId.value)
})
const selectedProblem = computed(() => {
    if(selectedProblemId.value === null) { return null }
    return props.puzzle.getProblem(selectedProblemId.value)
})
const selectedSolution = computed(() => {
    return selectedProblem.value?.solutions?.find(
        solution => solution.id === selectedSolutionId.value
    ) || null
})

/* Get currently selected shape group, or the shape group inside the selected
 * shape if a shape group is not selected directly. */
const activeShapeGroup = computed(() => {
    if(selectedShapeGroup.value) {
        return selectedShapeGroup.value
    }
    if(selectedShape.value) {
        return props.puzzle.getShapeGroupFromShape(selectedShape.value)
    }
    return null
})

defineExpose({
    currentTabId,
    selectedShape: selectedShape,
    selectedShapeGroup: selectedShapeGroup,
    activeShapeGroup: activeShapeGroup,
    selectedProblem,
    selectedSolution,
    setUiFocus,
})

const columnSlider: Ref<HTMLDivElement | null> = ref(null)
const rowSlider: Ref<HTMLDivElement | null> = ref(null)

runOnceOnCondition(
    () => Boolean(columnSlider.value && rowSlider.value),
    () => {
        if(!columnSlider.value || !rowSlider.value) { return }
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
)

/* Run func once when condition is met. Condition should read vue references.
 * Whenever those references change, the condition will be rerun until it
 * returns true. Then func will be called. */
function runOnceOnCondition(
    condition: () => boolean,
    func: () => void,
) {
    const cancel = watchEffect(() => {
        if(condition()) {
            func()
            cancel()
        }
    })
}

function performAction(action: Action) {
    emit("action", action)
}

function setUiFocus(focus: "shapes" | "problems" | "solutions") {
    currentTabId.value = focus
}

// Set focus on shapes and problems list.
// We unfocus immediately when tab changes, but don't re-focus until after a
// delay because of the transition effect.
watch(currentTabId, (tabId) => {
    shapeList.value?.setFocus(false)
    problemList.value?.setFocus(false)

    setTimeout(() => {
        if(tabId !== currentTabId.value) {
            return
        }
        if(tabId === "shapes") { shapeList.value?.setFocus(true) }
        if(tabId === "problems") { problemList.value?.setFocus(true) }
    }, 500)
}, {immediate: true})
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
                <template v-slot:shapes>
                    <ShapeList
                        ref="shapeList"
                        :puzzle="puzzle"
                        v-model:selectedShapeId="selectedShapeId"
                        v-model:selectedShapeGroupId="selectedShapeGroupId"
                        @action="performAction"
                    />
                </template>
                <template v-slot:problems>
                    <ProblemList
                        ref="problemList"
                        :puzzle="puzzle"
                        v-model:selectedProblemId="selectedProblemId"
                        @action="performAction"
                    />
                </template>
            </TabLayout>
        </div>

        <div class="slider row-slide" ref="rowSlider"></div>

        <div class="grid-cell side-bot">
            <div
                v-show="currentTabId === 'shapes'"
                style="height: 100%; display: flex; flex-direction: column;"
            >
                <ItemMetadataEditor
                    v-if="selectedShape"
                    :puzzle="puzzle"
                    itemType="shape"
                    :itemId="selectedShape.id"
                    @action="performAction"
                />
                <FormEditor
                    v-if="selectedShapeGroup && selectedShapeGroupId !== null"
                    :item="selectedShapeGroup"
                    @edit="performAction(new EditShapeGroupMetadataAction(selectedShapeGroupId, $event))"
                    title="Shape Group"
                    style="margin: 1em;"
                />
                <div ref="auxEditArea" style="flex-grow: 1;"></div>
            </div>
            <ProblemSolverForm
                v-show="currentTabId === 'problems' && selectedProblemId !== null"
                :puzzle="puzzle"
                :problemId="selectedProblemId"
                @action="performAction"
                @setUiFocus="setUiFocus"
            />
            <SolutionList
                ref="solutionList"
                v-show="currentTabId === 'solutions'"
                :puzzle="puzzle"
                :problemId="selectedProblemId"
                v-model:selectedSolutionId="selectedSolutionId"
                @action="performAction"
            />
        </div>

        <div class="grid-cell main">
            <ShapeEditor
                ref="shapeEditor"
                v-show="currentTabId === 'shapes'"
                :puzzle="puzzle"
                :shapeId="selectedShapeId"
                :auxEditArea="auxEditArea"
                :displayShapeIds="selectedShapeGroup?.displayCombined ?
                        selectedShapeGroup.shapes.map(p => p.id) :
                        undefined
                "
                @action="performAction"
            />
            <ItemMetadataEditor
                v-show="currentTabId === 'problems'"
                :puzzle="puzzle"
                itemType="problem"
                :itemId="selectedProblemId"
                @action="performAction"
            />
            <SolutionDisplay
                v-show="currentTabId === 'solutions' && selectedSolution"
                :puzzle="puzzle"
                :solution="selectedSolution as AssemblySolution || null"
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
        "side-bot  col-slide main" 2.5fr
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