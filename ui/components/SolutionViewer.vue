<script setup lang="ts">
import {computed, ref, Ref} from "vue"

import {Coordinate} from "~lib/types.ts"
import {Puzzle} from "~lib/Puzzle.ts"
import {AssemblySolution, Solution} from "~lib/Solution.ts"

import {useGridDrawComposible} from "~ui/composibles/drawGrid.ts"

const props = defineProps<{
    puzzle: Puzzle,
    solution: Solution | null,
}>()

const el = ref()
const viewpoints = props.puzzle.grid.getViewpoints()
const viewpoint = ref(viewpoints[0])
const layerN = ref(0)
const highlightedCoordinate: Ref<Coordinate | null> = ref(null)

const pieces = computed(() => {
    if(props.solution === null) {
        return []
    }
    const solution = props.solution as AssemblySolution
    const placements = Array.from(solution.placements.values())
    return placements.map((placement) => placement.transformedPiece)
})

useGridDrawComposible(
    el,
    props.puzzle.grid,
    pieces,
    layerN,
    viewpoint,
    highlightedCoordinate,
)

</script>

<template>
    <div class="pieceDisplay" ref="el"></div>
</template>

<style>
.pieceDisplay {
    width: 100%;
    height: 100%;
}
</style>