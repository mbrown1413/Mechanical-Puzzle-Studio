<!--
    Edit the pieces used and the goal piece in an AssemblyProblem.
-->

<script setup lang="ts">
import {computed, ref, Ref} from "vue"
import {VDataTable} from "vuetify/components/VDataTable"
import {VToolbar} from "vuetify/components/VToolbar"
import {VNumberInput} from "vuetify/labs/VNumberInput"

import {Puzzle, AssemblyProblem, PieceId} from '~lib'

import {Action, EditProblemMetadataAction} from "~/ui/actions.ts"
import GridDisplay from "~/ui/components/GridDisplay.vue"

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
    {title: "Piece Name", key: "label"},
    {title: "Count", key: "count", align: "center"},
    {title: "", key: "display", sortable: false},
    {title: "", key: "actions", sortable: false, align: "center"},
]

const tableItems = computed(() => {
    return props.puzzle.pieces.map((piece) => {
        return {
            id: piece.id,
            piece: piece,
            label: piece.label,
            count: props.problem?.usedPieceCounts[piece.id] || 0,
            isGoal: piece.id === props.problem?.goalPieceId,
        }
    })
})

const piecesVoxelCount: Ref<number> = computed(() => {
    if(!props.problem) { return 0 }
    let n = 0
    for(const [pieceId, count] of Object.entries(props.problem.usedPieceCounts)) {
        n += count * getPieceNVoxels(pieceId)
    }
    return n
})

const goalVoxelCount = computed(() => {
    if(!props.problem) return { goalMin: 0, goalMax: 0 }

    let goalMin: number = 0
    let goalMax: number = 0
    if(props.problem.goalPieceId !== undefined) {
        goalMin = getPieceNVoxels(props.problem.goalPieceId, false)
        goalMax = getPieceNVoxels(props.problem.goalPieceId)
    }
    return { goalMin, goalMax }
})

const voxelCountInfo = computed(() => {
    const pieceN = piecesVoxelCount.value
    const goalMin = goalVoxelCount.value.goalMin
    const goalMax = goalVoxelCount.value.goalMax

    let summary: string
    let description: string
    if(goalMin === goalMax) {
        summary = `${pieceN || "-"} / ${goalMin || "-"}`
        description = `${pieceN} voxels in pieces and ${goalMin} voxels in goal`
    } else {
        summary = `${pieceN || "-"} / ${goalMin}-${goalMax}`
        description = `${pieceN} voxels in pieces and ${goalMin} to ${goalMax} voxels in goal`
    }

    let warning: boolean = (
        pieceN < goalMin ||
        pieceN > goalMax ||
        pieceN === 0 ||
        goalMax === 0
    )

    return {
        pieceN, goalMin, goalMax,
        warning, summary, description
    }
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

function updatePieceCount(pieceId: PieceId, count: number) {
    if(props.problem === null) { return }
    const newPieceCounts = Object.assign({}, props.problem.usedPieceCounts)
    newPieceCounts[pieceId] = count
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

function selectionCountAction(newCountFunc: (oldCount: number) => number) {
    if(props.problem === null) { return }
    const newPieceCounts = Object.assign({}, props.problem.usedPieceCounts)

    let selected
    if(selectedPieceIds.value.length === 0) {
        selected = props.puzzle.pieces.map(p => p.id)
    } else {
        selected = selectedPieceIds.value
    }

    for(const pieceId of selected) {
        const oldCount = newPieceCounts[pieceId] || 0
        newPieceCounts[pieceId] = newCountFunc(oldCount)
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
        action: () => selectionCountAction((oldCount) => oldCount - 1),
    },
    {
        text: "0",
        color: undefined,
        action: () => selectionCountAction(() => 0),
    },
    {
        text: "+1",
        color: "green",
        action: () => selectionCountAction((oldCount) => oldCount + 1),
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

                <VTooltip
                    :text="voxelCountInfo.description"
                    location="top"
                >
                    <template v-slot:activator="{props}">
                        <VChip
                            v-bind="props"
                            :color="voxelCountInfo.warning ? 'red' : undefined"
                            density="compact"
                            class="mr-6"
                        >
                            {{ voxelCountInfo.summary }}
                        </VChip>
                    </template>
                </VTooltip>

                <VBtn
                    v-for="button in selectionButtons"
                    variant="tonal"
                    :color="button.color"
                    @click="button.action"
                    class="ml-2"
                >
                    {{ button.text }}
                </VBtn>

            </VToolbar>
        </template>

        <template v-slot:bottom />

        <template v-slot:item.count="{item}">
            <VNumberInput
                    control-variant="stacked"
                    :min="0"
                    :disabled="item.isGoal"
                    :model-value="item.isGoal ? '' : item.count"
                    @update:model-value="updatePieceCount(item.id, Number($event))"
                    hide-details="auto"
                    variant="solo-filled"
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