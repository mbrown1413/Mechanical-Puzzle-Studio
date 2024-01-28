<script setup lang="ts">
import {computed} from "vue"

import {Puzzle, Solution, AssemblySolution} from "~lib"

import GridDisplay from "~/ui/components/GridDisplay.vue";

const props = defineProps<{
    puzzle: Puzzle,
    solution: Solution | null,
}>()

const pieces = computed(() => {
    if(props.solution === null) {
        return []
    }
    const solution = props.solution as AssemblySolution
    const placements = Array.from(solution.placements.values())
    return placements.map((placement) => placement.transformedPiece)
})
</script>

<template>
    <GridDisplay
            :puzzle="puzzle"
            :pieces="pieces"
    />
</template>