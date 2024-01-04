<script setup lang="ts">
import {ref, Ref, computed} from "vue"

import {Coordinate} from "~lib/types.ts"
import {Puzzle, Piece} from  "~lib/Puzzle.ts"

import {useGridDrawComposible} from "./GridDisplay_draw.ts"
import {useGridMouseComposible} from "./GridDisplay_mouse.ts"

const props = defineProps<{
    puzzle: Puzzle,
    pieces: (Piece | string)[]
}>()

const emit = defineEmits<{
    voxelClicked: [mouseEvent: MouseEvent, coordinate: Coordinate]
}>()

const el = ref()
const viewpoints = props.puzzle.grid.getViewpoints()
const viewpoint = ref(viewpoints[0])
const layerN = ref(0)
const highlightedCoordinate: Ref<Coordinate | null> = ref(null)

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
    highlightedCoordinate,
)

useGridMouseComposible(
    renderer,
    camera,
    hitTestObjects,
    (mouseEvent, coordinate) => emit("voxelClicked", mouseEvent, coordinate),
    highlightedCoordinate,  // Output ref
)
</script>

<template>
    <div class="pieceDisplay" ref="el">
        <div class="controls">
            <VSelect
                    v-model="viewpoint"
                    :items="viewpointOptions"
                    density="compact"
            />
            <VSlider
                    v-if="viewpoint.getNLayers(bounds) > 1"
                    :ticks="[...Array(viewpoint.getNLayers(bounds)).keys()]"
                    showTicks="always"
                    direction="vertical"
                    v-model="layerN"
                    min="0"
                    :max="viewpoint.getNLayers(bounds)-1"
                    step="1"
            />
        </div>
    </div>
</template>

<style scoped>
.pieceDisplay {
    width: 100%;
    height: 100%;
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
</style>./drawGrid.ts