<script setup lang="ts">
import {ref, Ref, computed} from "vue"

import {Coordinate} from "~lib/types.ts"
import {Puzzle} from  "~lib/Puzzle.ts"
import {Action} from "~ui/actions.ts"

import {useGridDrawComposible} from "./PieceEditor_draw.ts"
import {useMouseEventsComposible} from "./PieceEditor_mouse.ts"

const props = defineProps<{
    puzzle: Puzzle,
    pieceId: string | null,
}>()

const emit = defineEmits<{
    action: [action: Action]
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

const piece = computed(() =>
    props.pieceId === null ? null : props.puzzle.pieces.get(props.pieceId) || null
)

const {
    renderer,
    camera,
    hitTestObjects,
    redraw,
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
    (action) => { emit("action", action) },
    highlightedCoordinate,  // Output ref
)

defineExpose({
    redraw,
})
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
                    v-if="piece && viewpoint.getNLayers(piece.bounds) > 1"
                    :ticks="[...Array(viewpoint.getNLayers(piece.bounds)).keys()]"
                    showTicks="always"
                    direction="vertical"
                    v-model="layerN"
                    min="0"
                    :max="viewpoint.getNLayers(piece.bounds)-1"
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
</style>