<script setup lang="ts">
import {computed} from "vue"

import {Puzzle} from  "~lib/Puzzle.ts"
import {EditPieceMetadata, PieceMetadata} from "~ui/actions.ts"

const props = defineProps<{
    puzzle: Puzzle,
    pieceId: string | null,
}>()

const emit = defineEmits<{
    action: [action: EditPieceMetadata]
}>()

const piece = computed(() =>
    props.pieceId === null ? null : props.puzzle.pieces.get(props.pieceId) || null
)

function handleTextInput(field: keyof PieceMetadata, el: HTMLInputElement) {
    if(props.pieceId === null) return
    const metadata: PieceMetadata = {}
    metadata[field] = el.value
    const action = new EditPieceMetadata(props.pieceId, metadata)
    emit("action", action)
}
</script>

<template>
    <div v-if="piece">
        <h4>Piece Metadata</h4>
        
        <label
            for="pieceMetadataEditor-label-input"
            class="form-label"
        >Name</label>
        <input
            id="pieceMetadataEditor-label-input"
            class="form-control"
            type="text"
            required
            :value="piece.label"
            @input="handleTextInput('label', $event.target as HTMLInputElement)"
        />
        
        <!--
        <label for="pieceMetadataEditor-color-input">Color</label>
        <input
            id="pieceMetadataEditor-color-input"
            type="color"
        />
        -->
    </div>
</template>