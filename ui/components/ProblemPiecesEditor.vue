<script setup lang="ts">
import {computed} from "vue"
import {VDataTable} from "vuetify/components/VDataTable"
import {VToolbar} from "vuetify/components/VToolbar"

import {Puzzle} from '~lib/Puzzle.ts'
import {Problem} from '~lib/Problem.ts'
import {Action, EditProblemMetadataAction} from "~ui/actions.ts"
import GridDisplay from "./GridDisplay.vue"

const props = defineProps<{
    puzzle: Puzzle,
    problem: Problem,
    label: string,
}>()

const emit = defineEmits<{
    action: [action: Action]
}>()

const tableHeaders = [
    {title: "Piece Name", key: "label"},
    {title: "Count", key: "count"},
    {title: "", key: "display", sortable: false},
]

const tableItems = computed(() => {
    const pieces = Array.from(props.puzzle.pieces.values())
    return pieces.map((piece) => {
        return {
            id: piece.id,
            piece: piece,
            label: piece.label,
            count: props.problem.usedPieceCounts.get(piece.id) || 0,
        }
    })
})

function onUpdate(pieceId: string, count: number) {
    const newPieceCounts = new Map(props.problem.usedPieceCounts)
    newPieceCounts.set(pieceId, count)
    const action = new EditProblemMetadataAction(
        props.problem.id, {
            usedPieceCounts: newPieceCounts
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
    >
        <template v-slot:top>
            <VToolbar flat density="compact" :title="label" />
        </template>
        <template v-slot:bottom />
            
        <template v-slot:item.count="{item}">
            <VTextField
                    v-model="item.count"
                    hide-details
                    single-line
                    type="number"
                    min="0"
                    @update:model-value="onUpdate(item.id, Number($event))"
            />
        </template>
        
        <template v-slot:item.display="{item}">
            <GridDisplay
                    :puzzle="puzzle"
                    :pieces="[item.piece]"
                    displayOnly
                    :size="200"
            />
        </template>
    </VDataTable>
</template>