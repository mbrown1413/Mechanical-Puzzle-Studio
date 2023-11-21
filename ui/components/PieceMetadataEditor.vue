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
        <h4>Piece Data</h4>
        
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
        
        <div class="row mt-2 align-items-center g-3">
            <div class="col-auto">
                <label
                    for="pieceMetadataEditor-color-input"
                    class="form-label"
                >Color</label>
            </div>
            <div class="col-auto">
                <input
                    id="pieceMetadataEditor-color-input"
                    type="color"
                    class="form-control"
                    :value="piece.color"
                    @input="handleTextInput('color', $event.target as HTMLInputElement)"
                />
            </div>
            <div class="col-auto">
                {{ piece.color }}
            </div>
        </div>
    </div>
</template>

<style scoped>
input[type="color"] {
    width: 50px;
    height: 50px;
    border-radius: 50%;
    border: var(--bs-border-width) solid var(--bs-border-color);
    padding: 10px;
}
</style>