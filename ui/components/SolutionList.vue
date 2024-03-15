<script setup lang="ts">
import {computed, ref, Ref} from "vue"

import {Puzzle} from "~lib"
import ListSelect from "~/ui/common/ListSelect.vue"

const props = defineProps<{
    puzzle: Puzzle,
    problemId: string | null,
}>()

const problem = computed(() =>
    props.problemId === null ? null : props.puzzle.getProblem(props.problemId)
)

const selectedSolutionIds: Ref<number[]> = ref([])

const solutionItems = computed(() => {
    if(!problem.value || problem.value.solutions === null) {
        return []
    }
    return problem.value.solutions.map((solution, i) => {
        return {
            id: String(i),
            label: `Solution ${i}`,
            solution,
        }
    })
})

const selectedSolutions = computed(() => {
    if(!problem.value || problem.value.solutions === null) {
        return []
    }

    const solutions = []
    for(const solutionId of selectedSolutionIds.value) {
        const solution = problem.value.solutions[solutionId]
        if(solution) {
            solutions.push(solution)
        }
    }
    return solutions
})

defineExpose({
    selectedSolutions
})
</script>

<template>
    <div class="solution-list">
        <h4>Solutions</h4>
        <ListSelect
            :items="solutionItems"
            :selectedIds="selectedSolutionIds.map(String)"
            @update:selectedIds="selectedSolutionIds = $event.map(Number)"
        />
    </div>
</template>

<style>
.solution-list h4 {
    margin: 1em 1em .5em 1em;
}
.solution-list {
    display: flex;
    flex-direction: column;
    height: 100%;
}
.solution-list .list-container {
    flex-grow: 1;
}
</style>