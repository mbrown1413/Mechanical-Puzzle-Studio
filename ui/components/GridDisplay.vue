<script setup lang="ts">
import {ref, Ref, computed} from "vue"

import {Puzzle, Piece, Voxel} from "~lib"

import {useGridDrawComposible} from "./GridDisplay_draw.ts"
import {useGridMouseComposible} from "./GridDisplay_mouse.ts"

const props = withDefaults(
    defineProps<{
        puzzle: Puzzle,
        pieces: (Piece | string)[],
        displayOnly?: boolean,
        size?: "fill" | number,
    }>(), {
        displayOnly: false,
        size: "fill",
    }
)

const emit = defineEmits<{
    voxelClicked: [mouseEvent: MouseEvent, voxel: Voxel]
}>()

const pieceDisplayStyle = computed(() => {
    return {
        width: props.size === "fill" ? "100%" : props.size+"px",
        height: props.size === "fill" ? "100%" : props.size+"px",
    }
})

const el = ref()
const viewpoints = props.puzzle.grid.getViewpoints()
const viewpoint = ref(viewpoints[0])
const layerN = ref(0)
const highlightedVoxel: Ref<Voxel | null> = ref(null)

const viewpointOptions = computed(() =>
    viewpoints.map((viewpoint) => {
        return {
            title: viewpoint.name,
            value: viewpoint,
        }
    })
)

const pieces = computed(() =>
    props.pieces.map(props.puzzle.getPieceFromPieceOrId)
)

const bounds = computed(() =>
    props.puzzle.grid.getMaxBounds(
        ...pieces.value.map(piece => piece.bounds)
    )
)

const {
    renderer,
    camera,
    hitTestObjects,
} = useGridDrawComposible(
    el,
    props.puzzle.grid,
    pieces,
    layerN,
    viewpoint,
    highlightedVoxel,
)

useGridMouseComposible(
    renderer,
    camera,
    hitTestObjects,
    (mouseEvent, voxel) => emit("voxelClicked", mouseEvent, voxel),
    highlightedVoxel,  // Output ref
)
</script>

<template>
    <div class="grid-display" :style="pieceDisplayStyle" ref="el">
        <div class="controls" v-if="!displayOnly">
            <VSelect
                    v-model="viewpoint"
                    :items="viewpointOptions"
                    density="compact"
            />
            <VSlider
                    v-if="viewpoint.getNLayers(bounds) > 1"
                    :ticks="[...Array(viewpoint.getNLayers(bounds)).keys()]"
                    v-model="layerN"
                    min="0"
                    :max="viewpoint.getNLayers(bounds)-1"
                    step="1"
                    showTicks="always"
                    direction="vertical"
                    track-size="8"
                    thumb-size="25"
                    tick-size="4"
            />
        </div>
    </div>
</template>

<style scoped>
.grid-display {
    position: relative;  /* Make this the containing block for .controls */
}
.controls {
    position: absolute;
    top: 0;
    left: 0;
    background: rgba(255, 255, 255, 0.5);
    border-bottom-right-radius: 10px;
}
.controls > * {
    margin: 0 auto;
}
</style>