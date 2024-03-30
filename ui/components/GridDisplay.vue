<!--
    Main component for displaying a WebGL canvas of the puzzle grid including
    pieces placed on that grid.
-->

<script setup lang="ts">
import {ref, Ref, computed} from "vue"

import {Puzzle, Piece, Voxel, Bounds} from "~lib"

import {useGridDrawComposible} from "./GridDisplay_draw.ts"
import {useGridMouseComposible} from "./GridDisplay_mouse.ts"

const props = withDefaults(
    defineProps<{
        puzzle: Puzzle,
        pieces: Piece[],
        displayOnly?: boolean,
        noLayers?: boolean,
        boundsSizing: "voxels" | "pieceBounds",
        size?: "fill" | number,
        highlightBy?: "voxel" | "piece",
        showTools?: boolean,
    }>(), {
        displayOnly: false,
        noLayers: false,
        size: "fill",
        highlightBy: "voxel",
        showTools: false,
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

const drawElement = ref()
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

const pieces = computed(() => props.pieces)

const bounds = computed(() => {
    let bounds: Bounds
    if(props.boundsSizing === "voxels") {
        const allVoxels = []
        for(const piece of pieces.value) {
            allVoxels.push(...piece.voxels)
        }
        bounds = props.puzzle.grid.getVoxelBounds(...allVoxels)
    } else {
        bounds = props.puzzle.grid.getBoundsMax(
            ...pieces.value.map(piece => piece.bounds)
        )
    }

    if(bounds.some(b => b === 0)) {
        bounds = props.puzzle.grid.getDefaultPieceBounds()
    }
    return bounds
})

const {
    camera,
    hitTestObjects,
} = useGridDrawComposible(
    drawElement,
    props.puzzle.grid,
    pieces,
    bounds,
    props.displayOnly,
    layerN,
    viewpoint,
    highlightedVoxel,
    props.highlightBy,
)

useGridMouseComposible(
    drawElement,
    camera,
    hitTestObjects,
    (mouseEvent, voxel) => emit("voxelClicked", mouseEvent, voxel),
    highlightedVoxel,  // Output ref
)
</script>

<template>
    <div class="grid-display" :style="pieceDisplayStyle">
        <div class="draw-element" ref="drawElement"></div>
        <div class="overlay controls" v-if="!displayOnly">
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
        <div class="overlay tools" v-if="showTools">
            <slot name="tools"></slot>
        </div>
    </div>
</template>

<style scoped>
.grid-display {
    position: relative;  /* Make this the containing block for .controls */
    background-color: #dddddd;
}
.draw-element {
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    right: 0;
}

.overlay {
    position: absolute;
    z-index: 1001;  /* Greater than the MultiRenderer <canvas> */
    background: rgba(255, 255, 255, 0.5);
}

.controls {
    top: 0;
    left: 0;
    border-bottom-right-radius: 10px;
}
.controls > * {
    margin: 0 auto;
}

.tools {
    top: 0;
    right: 0;
    padding: 0.5em;
    border-bottom-left-radius: 10px;
}
</style>