<!--
    Edit the pieces used and the goal piece in an AssemblyProblem.
-->

<script setup lang="ts">
import {computed, ref, Ref} from "vue"
import {VDataTable} from "vuetify/components/VDataTable"
import {VToolbar} from "vuetify/components/VToolbar"

import {Puzzle, AssemblyProblem, PieceId, Range} from '~lib'

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

const selectedPieceIds: Ref<PieceId[]> = ref([])

const tableHeaders: VDataTable["$props"]["headers"] = [
    {title: "Name", key: "label"},
    {title: "Voxels", key: "nVoxels", align: "center"},
    {title: "Count", key: "count", align: "center"},
    {title: "", key: "display", sortable: false},
    {title: "", key: "actions", sortable: false, align: "center"},
]

const tableItems = computed(() => {
    return props.puzzle.pieces.map((piece) => {
        const nVoxelsMin = getPieceNVoxels(piece.id, false)
        const nVoxelsMax = getPieceNVoxels(piece.id)
        return {
            id: piece.id,
            piece: piece,
            label: piece.label,
            nVoxels: nVoxelsMin === nVoxelsMax ? nVoxelsMin : `${nVoxelsMin}-${nVoxelsMax}`,
            range: props.problem?.getPieceRange(piece.id) || {min: 0, max: 0},
            isGoal: piece.id === props.problem?.goalPieceId,
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

function getPieceNVoxels(pieceId: string | number, includeOptionalVoxels=true) {
    pieceId = Number(pieceId)
    const piece = props.puzzle.getPiece(Number(pieceId))
    if(!piece) { return 0 }

    if(includeOptionalVoxels) {
        return piece.voxels.length
    } else {
        let n = 0
        for(const voxel of piece.voxels) {
            if(!piece.getVoxelAttribute("optional", voxel)) {
                n++
            }
        }
        return n
    }
}

function updatePieceCount(pieceId: PieceId, newRange: Range) {
    if(props.problem === null) { return }
    const newPieceCounts = Object.assign({}, props.problem.usedPieceCounts)
    newPieceCounts[pieceId] = newRange
    const action = new EditProblemMetadataAction(
        props.problem.id, {
            usedPieceCounts: newPieceCounts
        }
    )
    emit("action", action)
}

function updateGoal(pieceId: PieceId | undefined) {
    if(props.problem === null) { return }
    const action = new EditProblemMetadataAction(
        props.problem.id, {
            goalPieceId: pieceId
        }
    )
    emit("action", action)
}

function selectionCountAction(actionType: "-1"|"0"|"+1"|"min=0") {
    if(props.problem === null) { return }
    const newPieceCounts = Object.assign({}, props.problem.usedPieceCounts)

    let selected
    if(selectedPieceIds.value.length === 0) {
        selected = props.puzzle.pieces.map(p => p.id)
    } else {
        selected = selectedPieceIds.value
    }

    for(const pieceId of selected) {
        const range = props.problem.getPieceRange(pieceId)

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

        newPieceCounts[pieceId] = range
    }
    const action = new EditProblemMetadataAction(
        props.problem.id, {
            usedPieceCounts: newPieceCounts
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
            v-model="selectedPieceIds"
            items-per-page="-1"
            no-data-text="No pieces in puzzle!"
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
                @update:value="updatePieceCount(item.id, $event)"
            />
        </template>

        <template v-slot:item.display="{item}">
            <GridDisplay
                    :grid="puzzle.grid"
                    :pieces="[item.piece]"
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