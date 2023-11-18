<script setup lang="ts">
import {ref, Ref, computed} from "vue"

import {Coordinate} from "~lib/types.ts"
import {Puzzle} from  "~lib/Puzzle.ts"
import {Action} from "~ui/actions.ts"
import VerticalSlider from "~ui/components/VerticalSlider.vue"

import {useGridDrawComposible} from "./PieceEditor/grid_draw.ts"
import {useMouseEventsComposible} from "./PieceEditor/mouse_events.ts"

const props = defineProps<{
    puzzle: Puzzle,
    pieceId: string | null,
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
    props.pieceId === null ? null : props.puzzle.pieces.get(props.pieceId) || null
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
    <div class="pieceDisplay" ref="el">
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
</style>