<script setup lang="ts">
import {computed, ref, Ref} from "vue"

import {Puzzle, PieceId, Voxel} from  "~lib"

import {Action, EditPieceAction} from "~/ui/actions.ts"
import GridDisplay from "~/ui/components/GridDisplay.vue"

const props = defineProps<{
    puzzle: Puzzle,
    pieceId: PieceId | null,
}>()

const emit = defineEmits<{
    action: [action: Action]
}>()

const toggles: Ref<string[]> = ref([])

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

    const action = new EditPieceAction(
        piece.value.id,
        toAdd,
        toRemove,
        toggles.value.includes("optional"),
    )
    if(action.wouldModify(props.puzzle)) {
        emit("action", action)
    }
}

</script>

<template>
    <GridDisplay
            :puzzle="puzzle"
            :pieces="pieces"
            @voxelClicked="voxelClicked"
            boundsSizing="pieceBounds"
            showTools
    >
        <template v-slot:tools>

            <VBtnToggle
                v-model="toggles"
                multiple
            >

                <VTooltip
                    text="Optional voxel draw"
                    location="left"
                >
                    <template v-slot:activator="{props}">
                        <VBtn
                            rounded
                            @click=""
                            value="optional"
                            v-bind="props"
                        >
                            <VIcon
                                icon="mdi-checkerboard"
                                size="x-large"
                                aria-label="Optional voxel draw"
                                aria-hidden="false"
                            />
                        </VBtn>
                    </template>
                </VTooltip>

            </VBtnToggle>

        </template>
    </GridDisplay>
</template>

<style>
.v-btn--active {
    background: #b3b3b3;
}
</style>