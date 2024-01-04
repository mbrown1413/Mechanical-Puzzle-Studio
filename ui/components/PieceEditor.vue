<script setup lang="ts">
import {computed} from "vue"

import {Puzzle} from  "~lib/Puzzle.ts"

import {Action, EditPieceAction} from "~ui/actions.ts"
import GridDisplay from "./GridDisplay.vue"
import {Coordinate} from "~lib/types.ts"

const props = defineProps<{
    puzzle: Puzzle,
    pieceId: string | null,
}>()

const emit = defineEmits<{
    action: [action: Action]
}>()

const piece = computed(() =>
    props.pieceId === null ? null : props.puzzle.pieces.get(props.pieceId) || null
)

const pieces = computed(() =>
    piece.value === null ? [] : [piece.value]
)

function voxelClicked(event: MouseEvent, coordinate: Coordinate) {
    if(piece.value === null) { return }

    let toAdd: Coordinate[] = []
    let toRemove: Coordinate[] = []
    if(event.ctrlKey || event.button === 2) {
        toRemove = [coordinate]
    } else {
        toAdd = [coordinate]
    }
    if(piece.value.id === null) {
        throw "Cannot edit piece with no ID"
    }
    emit("action", new EditPieceAction(piece.value.id, toAdd, toRemove))
}

</script>

<template>
    <GridDisplay
            :puzzle="puzzle"
            :pieces="pieces"
            @voxelClicked="voxelClicked"
    />
</template>