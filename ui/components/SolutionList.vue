<script setup lang="ts">
import {computed, ref, Ref} from "vue"

import {Puzzle, ProblemId} from "~lib"
import ListSelect from "~/ui/common/ListSelect.vue"
import {taskRunner} from "~/ui/globals.ts"
import {TaskInfo} from "~/ui/TaskRunner.ts"
import {ProblemSolveTask} from "~/ui/tasks.ts"

const props = defineProps<{
    puzzle: Puzzle,
    problemId: ProblemId | null,
}>()

const problem = computed(() =>
    props.problemId === null ? null : props.puzzle.getProblem(props.problemId)
)

const selectedSolutionIds: Ref<number[]> = ref([])

const solutionItems = computed(() => {
    if(!problem.value || problem.value.solutions === undefined) {
        return []
    }
    return problem.value.solutions.map((solution, i) => {
        return {
            id: i,
            label: `Solution ${i+1}`,
            solution,
        }
    })
})

const selectedSolutions = computed(() => {
    if(!problem.value || problem.value.solutions === undefined) {
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

function taskInfoMatchesProblem(taskInfo: TaskInfo): boolean {
    return taskInfo.task instanceof ProblemSolveTask && taskInfo.task.problemId === props.problemId
}

const taskInfo = computed(() => {
    const tasksToInspect = [
        taskRunner.current,
        ...taskRunner.queue,
        ...[...taskRunner.finished].reverse()
    ]
    for(const taskInfo of tasksToInspect) {
        if(taskInfo && taskInfoMatchesProblem(taskInfo)) {
            return taskInfo
        }
    }
    return null
})

defineExpose({
    selectedSolutions
})
</script>

<template>
    <div class="solution-list">
        <h4>Solutions</h4>

        <ListSelect
            v-if="solutionItems.length"
            :items="solutionItems"
            :selectedIds="selectedSolutionIds"
            @update:selectedIds="selectedSolutionIds = $event.map(Number)"
        />

        <div v-else class="no-solutions-message">
            <template v-if="problem?.solutions?.length === 0">
                (zero solutions)
            </template>

            <div v-else-if="taskInfo?.error" class="bg-red">
                Solver failed<br>
                <pre style="white-space: pre-wrap;">{{ taskInfo.error }}</pre>
            </div>

            <template v-else-if="taskInfo">
                Task {{ taskInfo.status }}
                <template v-if="taskInfo.status === 'running'">
                    <VProgressCircular
                        :indeterminate="taskInfo.progressPercent === null"
                        :model-value="(taskInfo.progressPercent || 0) * 100"
                        color="blue-darken-1"
                        :size="25"
                        class="progress"
                    />
                    <template v-if="taskInfo.progressPercent !== null">
                        {{ (taskInfo.progressPercent*100).toFixed(2) }}%
                    </template>
                </template>
            </template>

            <template v-else>
                Run the solver on the Problems tab
            </template>
        </div>
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
.solution-list .no-solutions-message {
    padding: 1em;
}
</style>