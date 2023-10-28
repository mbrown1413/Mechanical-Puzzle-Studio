<script setup lang="ts">
import { ref, Ref, computed } from "vue"

import { Coordinate } from "../../types.ts"
import { Action } from "../../actions.ts"
import { Puzzle } from  "../../puzzle.ts"
import VerticalSlider from "./../VerticalSlider.vue"

import { useGridDrawComposible } from "./grid_draw.ts"
import { useMouseEventsComposible } from "./mouse_events.ts"

const props = defineProps<{
    puzzle: Puzzle,
    pieceId: string,
}>()

const emit = defineEmits<{
    action: [action: Action]
}>()

const el = ref()
const viewpoints = props.puzzle.grid.getViewpoints()
const viewpointId = ref(viewpoints[0].id)
const layerN = ref(0)
const highlightedCoordinate: Ref<Coordinate | null> = ref(null)

const viewpoint = computed(() =>
    viewpoints.find(v => v.id === viewpointId.value) || viewpoints[0]
)

const piece = computed(() =>
    props.puzzle.pieces.find((p) => p.id === props.pieceId) || null
)

const {
    renderer,
    camera,
    hitTestObjects,
    rebuildScene,
} = useGridDrawComposible(
    el,
    props.puzzle.grid,
    piece,
    layerN,
    viewpoint,
    highlightedCoordinate,
)

useMouseEventsComposible(
    piece,
    renderer,
    camera,
    hitTestObjects,
    (action) => {
        emit("action", action)
        rebuildScene()
    },
    highlightedCoordinate,  // Output ref
)
</script>

<template>
    <div class="display2d" ref="el">
        <div class="controls">
            <select v-model="viewpointId">
                <option
                    v-for="viewpoint in viewpoints"
                    :value="viewpoint.id"
                >
                    {{ viewpoint.name }}
                </option>
            </select>
            <VerticalSlider
                v-if="viewpoint.nLayers > 1"
                v-model="layerN"
                :options="[...Array(viewpoint.nLayers).keys()]"
            />
        </div>
    </div>
</template>

<style scoped>
.display2d {
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
</style>
./drawing.ts./grid_draw_composible.ts