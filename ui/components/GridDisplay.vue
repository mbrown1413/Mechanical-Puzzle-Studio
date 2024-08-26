<!--
    Main component for displaying a WebGL canvas of the puzzle grid including
    pieces placed on that grid.
-->

<script setup lang="ts">
import {ref, Ref, toRef, computed, watch, watchEffect} from "vue"

import {Grid, Piece, Voxel, Bounds, Viewpoint} from "~lib"

import {useGridDisplayRenderComposible} from "./GridDisplay_render.ts"
import {useGridDisplayMouseComposible} from "./GridDisplay_mouse.ts"
import {CameraSchemeName} from "./GridDisplay_camera.ts"

const props = withDefaults(
    defineProps<{
        grid: Grid,
        pieces: Piece[],
        displayOnly?: boolean,
        noLayers?: boolean,
        boundsSizing: "voxels" | "pieceBounds" | Bounds,
        size?: "fill" | number,
        highlightBy?: "voxel" | "piece",
        showTools?: boolean,
        showLayerSlider?: boolean,
        cameraScheme?: CameraSchemeName,
        highlightedVoxels?: Voxel[],
        viewpoint?: Viewpoint,
        layerN?: number,
        boxToolEnabled?: boolean,
    }>(), {
        displayOnly: false,
        noLayers: false,
        size: "fill",
        highlightBy: "voxel",
        showTools: false,
        showLayerSlider: true,
        cameraScheme: "3D",
        boxToolEnabled: false,
    }
)

const emit = defineEmits<{
    voxelsClicked: [mouseEvent: MouseEvent, voxels: Voxel[]]
    "update:highlightedVoxels": [Voxel[]]
    "update:viewpoint": [Viewpoint]
    "update:layerN": [number]
}>()

const pieceDisplayStyle = computed(() => {
    return {
        width: props.size === "fill" ? "100%" : props.size+"px",
        height: props.size === "fill" ? "100%" : props.size+"px",
    }
})

const viewpoints = computed(() => props.grid.getViewpoints())

const drawElement = ref()
const viewpoint = ref(viewpoints.value[0])
const layerN = ref(0)
const highlightedVoxels: Ref<Voxel[]> = ref([])

watchEffect(() => {
    if(props.highlightedVoxels !== undefined) {
        highlightedVoxels.value = props.highlightedVoxels
    }
})
watch(highlightedVoxels, () => emit("update:highlightedVoxels", highlightedVoxels.value))

watchEffect(() => {
    if(props.viewpoint !== undefined) {
        viewpoint.value = props.viewpoint
    }
})
watch(viewpoint, () => emit("update:viewpoint", viewpoint.value))

watchEffect(() => {
    if(props.layerN !== undefined) {
        layerN.value = props.layerN
    }
})
watch(layerN, () => emit("update:layerN", layerN.value))

watch(viewpoints, () => {
    viewpoint.value = viewpoints.value[0]
})

const viewpointOptions = computed(() =>
    viewpoints.value.map((viewpoint) => {
        return {
            title: viewpoint.name,
            value: viewpoint,
        }
    })
)

const pieces = computed(() => props.pieces)

const bounds = computed(() => {
    if(props.boundsSizing === "voxels") {
        const allVoxels = []
        for(const piece of pieces.value) {
            allVoxels.push(...piece.voxels)
        }
        if(allVoxels.length === 0) {
            return props.grid.getDefaultPieceBounds()
        }
        return props.grid.getVoxelBounds(allVoxels)

    } else if(props.boundsSizing === "pieceBounds") {
        return props.grid.getBoundsMax(
            ...pieces.value.map(
                (piece) => piece.bounds
            ).filter(
                (bounds): bounds is Bounds => typeof bounds !== "undefined"
            )
        )

    } else {
        return props.boundsSizing
    }
})

watchEffect(() => {
    const maxLayerN = viewpoint.value.getNLayers(bounds.value) - 1
    if(layerN.value > maxLayerN) {
        layerN.value = maxLayerN
    }
})

const {
    camera,
    hitTestObjects,
} = useGridDisplayRenderComposible(
    drawElement,
    toRef(props, "grid"),
    pieces,
    bounds,
    props.displayOnly,
    layerN,
    viewpoint,
    highlightedVoxels,
    props.highlightBy,
    toRef(props, "cameraScheme"),
)

useGridDisplayMouseComposible(
    drawElement,
    camera,
    toRef(props, "grid"),
    hitTestObjects,
    toRef(props, "boxToolEnabled"),
    (mouseEvent, voxels) => emit("voxelsClicked", mouseEvent, voxels),
    highlightedVoxels,  // Output ref
)
</script>

<template>
    <div class="grid-display" :style="pieceDisplayStyle">
        <div class="draw-element" ref="drawElement"></div>
        <div class="overlay controls" v-if="!displayOnly && showLayerSlider">
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
                    trackSize="8"
                    thumbSize="25"
                    tickSize="4"
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
    background-color: #e0e0e0;
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