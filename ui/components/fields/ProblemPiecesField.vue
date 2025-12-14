<script setup lang="ts">
import {computed, ref, Ref, ComputedRef} from "vue"
import {VDataTable} from "vuetify/components"

import {ShapeId, FormEditable, ProblemPiecesField, Range, FormContext} from "~lib"

import GridDisplay from "~/ui/components/GridDisplay.vue"
import RangeEditor from "~/ui/common/RangeEditor.vue"

const props = defineProps<{
    item: FormEditable
    field: ProblemPiecesField
    context: FormContext
}>()

if(!props.context.puzzle) {
    throw new Error("ProblemPiecesField requires a puzzle context")
}

const emit = defineEmits<{
    "edit": [editData: object]
}>()

const selectedShapeIds: Ref<ShapeId[]> = ref([])

const currentGoalShapeId = computed(() => {
    return (props.item as any)[props.field.goalShapeIdField] as ShapeId | undefined
})
const currentShapeCounts: ComputedRef<{[shapeId: ShapeId]: Range}> = computed(() => {
    return (props.item as any)[props.field.shapeCountsField] || {}
})

const tableHeaders: VDataTable["$props"]["headers"] = [
    {title: "Shape", key: "label"},
    {title: "Voxels", key: "nVoxels", align: "center"},
    {title: "Count", key: "count", align: "center"},
    {title: "", key: "display", sortable: false},
    {title: "", key: "actions", sortable: false, align: "center"},
]

const tableItems = computed(() => {
    if(!props.context.puzzle) { return [] }
    return props.context.puzzle.shapes.map((shape) => {
        const nVoxelsMin = getShapeNVoxels(shape.id, false)
        const nVoxelsMax = getShapeNVoxels(shape.id)
        return {
            id: shape.id,
            shape: shape,
            label: shape.label,
            nVoxels: nVoxelsMin === nVoxelsMax ? nVoxelsMin : `${nVoxelsMin}-${nVoxelsMax}`,
            range: getPieceRange(shape.id) || {min: 0, max: 0},
            isGoal: shape.id === currentGoalShapeId.value,
        }
    })
})

function getPieceRange(shapeId: ShapeId): {min: number, max: number} {
    const count = (props.item as any)[props.field.shapeCountsField][shapeId]
    if(count === undefined) return {min: 0, max: 0}
    if(typeof count === "number") return {min: count, max: count}
    return count
}

function getShapeNVoxels(shapeId: string | number, includeOptionalVoxels=true) {
    if(!props.context.puzzle) { return 0 }
    shapeId = Number(shapeId)
    const shape = props.context.puzzle.getShape(shapeId)
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
    const newShapeCounts = Object.assign({}, currentShapeCounts.value)
    newShapeCounts[shapeId] = newRange

    const editData: any = {}
    editData[props.field.shapeCountsField] = newShapeCounts
    emit("edit", editData)
}

function updateGoal(shapeId: ShapeId | undefined) {
    const editData: any = {}
    editData[props.field.goalShapeIdField] = shapeId
    emit("edit", editData)
}

function selectionCountAction(actionType: "-1"|"0"|"+1"|"min=0") {
    if(!props.context.puzzle) { return }
    const newShapeCounts = Object.assign({}, currentShapeCounts.value)

    let selected
    if(selectedShapeIds.value.length === 0) {
        selected = props.context.puzzle.shapes.map(p => p.id)
    } else {
        selected = selectedShapeIds.value
    }

    for(const shapeId of selected) {
        const range = getPieceRange(shapeId)

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

    const editData: any = {}
    editData[props.field.shapeCountsField] = newShapeCounts
    emit("edit", editData)
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
            v-if="context.puzzle"
            :headers="tableHeaders"
            :items="tableItems"
            v-model="selectedShapeIds"
            items-per-page="-1"
            no-data-text="No shapes in puzzle!"
            style="width: fit-content;"
            class="mt-6"
            show-select
    >
        <template v-slot:top>
            <VToolbar flat density="compact" :title="props.field.label">

                <VChip
                    v-if="field.infoChip"
                    :color="field.infoChip.color"
                    density="compact"
                    class="mr-6"
                    v-tooltip.top="field.infoChip.tooltip"
                >
                    {{ field.infoChip.text }}
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
                :grid="context.puzzle.grid"
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