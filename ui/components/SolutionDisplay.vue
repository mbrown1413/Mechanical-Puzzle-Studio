<script setup lang="ts">
import {computed, ref} from "vue"

import {Puzzle, AssemblySolution} from "~lib"

import GridDisplay from "~/ui/components/GridDisplay.vue"

const props = defineProps<{
    puzzle: Puzzle,
    solution: AssemblySolution | null,
}>()

const disassemblyNumber = ref(0)
const disassemblyStep = ref(0)

const pieces = computed(() => {
    if(props.solution === null) {
        return []
    }
    if(disassembly.value) {
        return disassembly.value.getState(disassemblyStep.value)
    } else {
        return props.solution.placements
    }
})

const disassemblySet = computed(() => props.solution?.disassemblies)
const disassemblyList = computed(() => {
    if(!disassemblySet.value || !props.solution) { return null }
    return disassemblySet.value.getDisassemblies(
        props.puzzle.grid,
        props.solution.placements
    )
})
const disassembly = computed(() => 
    disassemblyList.value ? disassemblyList.value[disassemblyNumber.value] : null
)
</script>

<template>
    <GridDisplay
            :grid="puzzle.grid"
            :pieces="pieces"
            displayOnly
            :boundsSizing="disassembly ? disassembly.getBounds() : 'voxels'"
            highlightBy="piece"
            :showTools="disassemblySet !== undefined"
    >

        <template v-slot:tools v-if="disassemblyList">
            <VSlider
                v-model="disassemblyNumber"
                min="0"
                :max="disassemblyList.length - 1"
                step="1"
                showTicks="always"
                trackSize="8"
                thumbSize="25"
                tickSize="4"
                style="width: 500px;"
                :label="`Dissassembly: ${disassemblyNumber}`"
            />
            <VSlider
                v-if="disassembly"
                v-model="disassemblyStep"
                min="0"
                :max="disassembly.steps.length"
                step="1"
                showTicks="always"
                trackSize="8"
                thumbSize="25"
                tickSize="4"
                style="width: 500px;"
                :label="`Step: ${disassemblyStep}`"
            />
        </template>

    </GridDisplay>
</template>