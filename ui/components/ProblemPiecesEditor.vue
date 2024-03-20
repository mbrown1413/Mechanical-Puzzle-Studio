<!--
    Edit the pieces used and the goal piece in an AssemblyProblem.
-->

<script setup lang="ts">
import {computed} from "vue"
import {VDataTable} from "vuetify/components/VDataTable"
import {VToolbar} from "vuetify/components/VToolbar"

import {Puzzle, AssemblyProblem} from '~lib'

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

const tableHeaders: VDataTable["headers"] = [
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
            count: props.problem?.usedPieceCounts.get(piece.id) || 0,
            isGoal: piece.id === props.problem?.goalPieceId,
        }
    })
})

function updatePieceCount(pieceId: string, count: number) {
    if(props.problem === null) { return }
    const newPieceCounts = new Map(props.problem.usedPieceCounts)
    newPieceCounts.set(pieceId, count)
    const action = new EditProblemMetadataAction(
        props.problem.id, {
            usedPieceCounts: newPieceCounts
        }
    )
    emit("action", action)
}

function updateGoal(pieceId: string | null) {
    if(props.problem === null) { return }
    const action = new EditProblemMetadataAction(
        props.problem.id, {
            goalPieceId: pieceId
        }
    )
    emit("action", action)
}
</script>

<template>
    <VDataTable
            :headers="tableHeaders"
            :items="tableItems"
            items-per-page="-1"
            no-data-text="No pieces in puzzle!"
            style="width: fit-content;"
    >
        <template v-slot:top>
            <VToolbar flat density="compact" :title="label" />
        </template>
        <template v-slot:bottom />

        <template v-slot:item.count="{item}">
            <VTextField
                    type="number"
                    min="0"
                    :disabled="item.isGoal"
                    :value="item.isGoal ? '' : item.count"
                    @update:model-value="updatePieceCount(item.id, Number($event))"
                    hide-details="auto"
                    variant="solo-filled"
            />
        </template>

        <template v-slot:item.display="{item}">
            <GridDisplay
                    :puzzle="puzzle"
                    :pieces="[item.piece]"
                    displayOnly
                    boundsSizing="voxels"
                    :size="200"
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
                @click:close="updateGoal(null)"
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