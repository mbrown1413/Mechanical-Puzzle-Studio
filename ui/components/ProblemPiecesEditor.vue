<!--
    Edit the shapes used and the goal shape in an AssemblyProblem.
-->

<script setup lang="ts">
import {computed, ref, Ref} from "vue"
import {VDataTable} from "vuetify/components/VDataTable"
import {VToolbar} from "vuetify/components/VToolbar"

import {Puzzle, AssemblyProblem, ShapeId, Range} from '~lib'

import {Action, EditProblemMetadataAction} from "~/ui/actions.ts"
import GridDisplay from "~/ui/components/GridDisplay.vue"
import RangeEditor from "~/ui/common/RangeEditor.vue"

const props = defineProps<{
    puzzle: Puzzle,
    problem: AssemblyProblem | null,
    label: string,
}>()

const emit = defineEmits<{
    action: [action: Action]
}>()

const selectedShapeIds: Ref<ShapeId[]> = ref([])

const tableHeaders: VDataTable["$props"]["headers"] = [
    {title: "Shape", key: "label"},
    {title: "Voxels", key: "nVoxels", align: "center"},
    {title: "Count", key: "count", align: "center"},
    {title: "", key: "display", sortable: false},
    {title: "", key: "actions", sortable: false, align: "center"},
]

const tableItems = computed(() => {
    return props.puzzle.shapes.map((shape) => {
        const nVoxelsMin = getShapeNVoxels(shape.id, false)
        const nVoxelsMax = getShapeNVoxels(shape.id)
        return {
            id: shape.id,
            shape: shape,
            label: shape.label,
            nVoxels: nVoxelsMin === nVoxelsMax ? nVoxelsMin : `${nVoxelsMin}-${nVoxelsMax}`,
            range: props.problem?.getPieceRange(shape.id) || {min: 0, max: 0},
            isGoal: shape.id === props.problem?.goalShapeId,
        }
    })
})

const voxelCountInfo = computed(() => {
    if(!props.problem) {
        return {warning: false, summary: "-/-", description: ""}
    }
    const counts = props.problem?.countVoxels(props.puzzle)

    const summary = `${counts.piecesString} / ${counts.goalString}`
    const description = `${counts.piecesString} voxels in pieces and ${counts.goalString} voxels in goal`

    return {summary, description, warning: counts.warning}
})

function getShapeNVoxels(shapeId: string | number, includeOptionalVoxels=true) {
    shapeId = Number(shapeId)
    const shape = props.puzzle.getShape(Number(shapeId))
    if(!shape) { return 0 }

    if(includeOptionalVoxels) {
        return shape.voxels.length
    } else {
        let n = 0
        for(const voxel of shape.voxels) {
            if(!shape.getVoxelAttribute("optional", voxel)) {
                n++
            }
        }
        return n
    }
}

function updateShapeRange(shapeId: ShapeId, newRange: Range) {
    if(props.problem === null) { return }
    const newShapeCounts = Object.assign({}, props.problem.shapeCounts)
    newShapeCounts[shapeId] = newRange
    const action = new EditProblemMetadataAction(
        props.problem.id, {
            shapeCounts: newShapeCounts
        }
    )
    emit("action", action)
}

function updateGoal(shapeId: ShapeId | undefined) {
    if(props.problem === null) { return }
    const action = new EditProblemMetadataAction(
        props.problem.id, {
            goalShapeId: shapeId
        }
    )
    emit("action", action)
}

function selectionCountAction(actionType: "-1"|"0"|"+1"|"min=0") {
    if(props.problem === null) { return }
    const newShapeCounts = Object.assign({}, props.problem.shapeCounts)

    let selected
    if(selectedShapeIds.value.length === 0) {
        selected = props.puzzle.shapes.map(p => p.id)
    } else {
        selected = selectedShapeIds.value
    }

    for(const shapeId of selected) {
        const range = props.problem.getPieceRange(shapeId)

        switch(actionType) {
            case "-1":
                range.min--
                range.max--
            break
            case "0":
                range.min = 0
                range.max = 0
            break
            case "+1":
                range.min++
                range.max++
            break
            case "min=0":
                range.min = 0
            break
        }

        newShapeCounts[shapeId] = range
    }
    const action = new EditProblemMetadataAction(
        props.problem.id, {
            shapeCounts: newShapeCounts
        }
    )
    emit("action", action)
}

const selectionButtons = [
    {
        text: "-1",
        color: "red",
        action: () => selectionCountAction("-1"),
    },
    {
        text: "0",
        color: undefined,
        action: () => selectionCountAction("0"),
    },
    {
        text: "+1",
        color: "green",
        action: () => selectionCountAction("+1"),
    },
    {
        text: "min=0",
        color: undefined,
        action: () => selectionCountAction("min=0"),
        class: "ml-8"
    },
]
</script>

<template>
    <VDataTable
            :headers="tableHeaders"
            :items="tableItems"
            v-model="selectedShapeIds"
            items-per-page="-1"
            no-data-text="No shapes in puzzle!"
            style="width: fit-content;"
            show-select
    >
        <template v-slot:top>
            <VToolbar flat density="compact" :title="label">

                <VChip
                    :color="voxelCountInfo.warning ? 'red' : undefined"
                    density="compact"
                    class="mr-6"
                    v-tooltip.top="voxelCountInfo.description"
                >
                    {{ voxelCountInfo.summary }}
                </VChip>

                <VBtn
                    v-for="button in selectionButtons"
                    variant="tonal"
                    :color="button.color"
                    @click="button.action"
                    :class="button.class || 'ml-2'"
                >
                    {{ button.text }}
                </VBtn>

            </VToolbar>
        </template>

        <template v-slot:bottom />

        <template v-slot:item.count="{item}">
            <RangeEditor
                :value="item.range"
                :disabled="item.isGoal"
                :hideLabels="item.isGoal"
                @update:value="updateShapeRange(item.id, $event)"
            />
        </template>

        <template v-slot:item.display="{item}">
            <GridDisplay
                    :grid="puzzle.grid"
                    :shapes="[item.shape]"
                    displayOnly
                    boundsSizing="voxels"
                    :size="140"
            />
        </template>

        <template v-slot:item.actions="{item}">
            <VBtn
                    v-if="!item.isGoal"
                    @click="updateGoal(item.id)"
            >
                Set Goal
            </VBtn>
            <VChip
                v-if="item.isGoal"
                closable
                size="x-large"
                @click:close="updateGoal(undefined)"
            >
                Goal
            </VChip>
        </template>
    </VDataTable>
</template>

<style>
.v-data-table-column--align-center .v-data-table-header__content span {
    /* We want the header text to be centered, not header text + sort icon. We
     * add left padding equal to the size of the icon on the right so the text
     * itself is centered. */
    padding-left: 21px;
}
</style>