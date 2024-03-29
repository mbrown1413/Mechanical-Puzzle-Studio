<script setup lang="ts">
import {computed} from "vue"

import {Puzzle, Voxel} from  "~lib"

import {Action, EditPieceAction} from "~/ui/actions.ts"
import GridDisplay from "~/ui/components/GridDisplay.vue"

const props = defineProps<{
    puzzle: Puzzle,
    pieceId: string | null,
}>()

const emit = defineEmits<{
    action: [action: Action]
}>()

const piece = computed(() =>
    props.pieceId === null ? null : props.puzzle.getPiece(props.pieceId) || null
)

const pieces = computed(() =>
    piece.value === null ? [] : [piece.value]
)

function voxelClicked(event: MouseEvent, voxel: Voxel) {
    if(piece.value === null) { return }

    let toAdd: Voxel[] = []
    let toRemove: Voxel[] = []
    if(event.ctrlKey || event.button === 2) {
        toRemove = [voxel]
    } else {
        toAdd = [voxel]
    }
    if(piece.value.id === null) {
        throw new Error("Cannot edit piece with no ID")
    }

    if(
        toAdd.length === 1 &&
        toRemove.length === 0 &&
        piece.value.voxels.includes(toAdd[0])
    ) {
        // Voxel already exists in piece
        return
    }

    emit("action", new EditPieceAction(piece.value.id, toAdd, toRemove))
}

</script>

<template>
    <GridDisplay
            :puzzle="puzzle"
            :pieces="pieces"
            @voxelClicked="voxelClicked"
            boundsSizing="pieceBounds"
    />
</template>