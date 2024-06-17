<script setup lang="ts">
import {computed, ref, Ref, watch, inject} from "vue"

import {Puzzle, ProblemId} from "~lib"
import {taskRunner} from "~/ui/globals.ts"
import {TaskInfo} from "~/ui/TaskRunner.ts"
import {ProblemSolveTask} from "~/ui/tasks.ts"
import {UiButtonDefinition} from "~/ui/ui-buttons.ts"
import {SolutionListAction} from "~/ui/actions.ts"
import ListSelect from "~/ui/common/ListSelect.vue"
import UiButton from "~/ui/components/UiButton.vue"

const props = defineProps<{
    puzzle: Puzzle,
    problemId: ProblemId | null,
}>()

defineEmits<{
    action: [action: SolutionListAction]
}>()

const problem = computed(() =>
    props.problemId === null ? null : props.puzzle.getProblem(props.problemId)
)

const selectedSolutionIds: Ref<number[]> = ref([])

const solutionItems = computed(() => {
    if(!problem.value || problem.value.solutions === undefined) {
        return []
    }
    return problem.value.solutions.map(solution => {
        return {
            id: solution.id,
            label: `Solution ${solution.id}`,
            solution,
        }
    })
})

// Auto-select first piece when solutions are added
// ListSelect normally does this automatically, but only if items are added one
// at a time.
watch(solutionItems, (newItems, oldItems) => {
    if(
        selectedSolutionIds.value.length === 0 &&
        (oldItems === undefined || oldItems.length === 0) &&
        newItems.length > 0
    ) {
        selectedSolutionIds.value = [newItems[0].id]
    }
}, {immediate: true})

const selectedSolutions = computed(() => {
    if(!problem.value || problem.value.solutions === undefined) {
        return []
    }

    return problem.value.solutions.filter((solution) =>
        selectedSolutionIds.value.includes(solution.id)
    )
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

const allUiButtons = inject("uiButtons") as Record<string, UiButtonDefinition>
const solveButton = allUiButtons.startSolve

const actionCategories = [
    {
        text: "Sort by...",
        icon: "mdi-sort",
        actions: [
            new SolutionListAction(-1, "sortBy: movesToDisassemble"),
            new SolutionListAction(-1, "sortBy: movesToRemoveFirst"),
            new SolutionListAction(-1, "sortBy: orderFound"),
        ],
    },
    {
        text: "Delete solutions...",
        icon: "mdi-trash-can-outline",
        actions: [
            new SolutionListAction(-1, "delete: noDisassemblies"),
        ],
    },
]
</script>

<template>
    <div class="solution-list">
        <div class="header-row">
            <h4>Solutions</h4>

            <VMenu>
                <template v-slot:activator="{props: menuProps}">
                    <VBtn
                        v-bind="menuProps"
                        :disabled="problemId === null"
                        rounded
                    >
                        <VIcon
                            icon="mdi-playlist-edit"
                            aria-label="Solution list actions"
                            aria-hidden="false"
                        />
                    </VBtn>
                </template>

                <VCard v-if="problemId !== null">
                    <VList v-for="actionCategory of actionCategories">
                        <VListSubheader>
                            <VIcon :icon="actionCategory.icon" />
                            {{ actionCategory.text }}
                        </VListSubheader>
                        <VListItem
                            v-for="action of actionCategory.actions"
                            @click="$emit('action', new SolutionListAction(problemId, action.actionType))"
                        >
                            ...{{ action.getPartialString() }}
                        </VListItem>
                    </VList>
                </VCard>
            </VMenu>

            <UiButton :uiButton="solveButton" variant="text" />
        </div>

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
                    <br>
                    {{ taskInfo.progressMessage }}
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

            <template v-else-if="!problem">
                No problem selected
            </template>

            <template v-else>
                Solver has not been run
            </template>
        </div>
    </div>
</template>

<style scoped>
.header-row {
    display: flex;
    justify-content: space-between;
    margin: 1em 1em 0.5em 0;
}
.solution-list h4 {
    margin: 0 0 0 1em;
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