<script setup lang="ts">
import {computed, ref, Ref} from "vue"

import {Puzzle, PieceId, Voxel, Viewpoint} from  "~lib"

import {Action, EditPieceAction} from "~/ui/actions.ts"
import GridDisplay from "~/ui/components/GridDisplay.vue"

const props = defineProps<{
    puzzle: Puzzle,
    pieceId: PieceId | null,
    auxEditArea: HTMLElement | null,
}>()

const emit = defineEmits<{
    action: [action: Action]
}>()

const toggles: Ref<string[]> = ref([])
const highlightedVoxels: Ref<Voxel[]> = ref([])
const viewpoint: Ref<Viewpoint | undefined> = ref()
const layerN: Ref<number | undefined> = ref()

const piece = computed(() =>
    props.pieceId === null ? null : props.puzzle.getPiece(props.pieceId) || null
)

const pieces = computed(() =>
    piece.value === null ? [] : [piece.value]
)

function voxelsClicked(event: MouseEvent, voxels: Voxel[]) {
    if(piece.value === null) { return }

    let toAdd: Voxel[] = []
    let toRemove: Voxel[] = []
    if(event.ctrlKey || event.button === 2) {
        toRemove = voxels
    } else {
        toAdd = voxels
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

const cameraSchemeName = computed(() =>
    toggles.value.includes("twoDimensional") ? "2D" : "3D"
)

const cameraSchemeIcon = computed(() =>
    toggles.value.includes("twoDimensional") ? "mdi-cube-off-outline" : "mdi-cube-outline"
)

</script>

<template>
    <div style="width: 100%; height: 100%;">
        <GridDisplay
            :grid="puzzle.grid"
            :pieces="pieces"
            :cameraScheme="cameraSchemeName"
            :highlightedVoxels="highlightedVoxels"
            :viewpoint="viewpoint"
            :layerN="layerN"
            @update:highlightedVoxels="highlightedVoxels = $event"
            @update:viewpoint="viewpoint = $event"
            @update:layerN="layerN = $event"
            @voxelsClicked="voxelsClicked"
            boundsSizing="pieceBounds"
            :boxToolEnabled="cameraSchemeName === '2D'"
            showTools
        >
            <template v-slot:tools>

                <VBtnToggle
                    v-model="toggles"
                    multiple
                >

                    <VTooltip
                        text="Optional voxel draw"
                        location="bottom"
                        contentClass="tooltip-arrow-up"
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

                    <VTooltip
                        :text="cameraSchemeName"
                        location="bottom"
                        contentClass="tooltip-arrow-up"
                    >
                        <template v-slot:activator="{props}">
                            <VBtn
                                rounded
                                @click=""
                                value="twoDimensional"
                                v-bind="props"
                            >
                                <VIcon
                                    :icon="cameraSchemeIcon"
                                    size="x-large"
                                    :aria-label="cameraSchemeName"
                                    aria-hidden="false"
                                />
                            </VBtn>
                        </template>
                    </VTooltip>

                </VBtnToggle>

            </template>
        </GridDisplay>

        <Teleport v-if="auxEditArea" :to="auxEditArea">
            <GridDisplay
                :grid="puzzle.grid"
                :pieces="pieces"
                :cameraScheme="cameraSchemeName === '3D' ? '2D' : '3D'"
                :showLayers="false"
                :highlightedVoxels="highlightedVoxels"
                :viewpoint="viewpoint"
                :layerN="layerN"
                @update:highlightedVoxels="highlightedVoxels = $event"
                @update:viewpoint="viewpoint = $event"
                @update:layerN="layerN = $event"
                @voxelsClicked="voxelsClicked"
                boundsSizing="pieceBounds"
                :boxToolEnabled="cameraSchemeName === '3D'"
            />
        </Teleport>
    </div>
</template>

<style>
.v-btn--active {
    background: #b3b3b3;
}
</style>