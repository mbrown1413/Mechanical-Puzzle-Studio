<script setup lang="ts">
import {computed, watch, inject} from "vue"

import {Puzzle, ProblemId, AssemblySolution} from "~lib"
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
    selectedSolutionId: number | null,
}>()

const emit = defineEmits<{
    "update:selectedSolutionId": [id: number | null]
    action: [action: SolutionListAction]
}>()

/** Map a problem's ID to its last selected record. */
const lastSelectedIdByProblem: Record<ProblemId, number | null> = {}
watch(() => props.selectedSolutionId, () => {
    if(props.problemId !== null) {
        lastSelectedIdByProblem[props.problemId] = props.selectedSolutionId
    }
})

const problem = computed(() =>
    props.problemId === null ? null : props.puzzle.getProblem(props.problemId)
)

const solutionItems = computed(() => {
    if(!problem.value || problem.value.solutions === undefined) {
        return []
    }
    return problem.value.solutions.map(solution => {
        const assemblySolution = solution as AssemblySolution

        let detailString: string | null = null
        if(assemblySolution.disassemblies) {
            if(assemblySolution.disassemblies.length === 0) {
                detailString = "No disassembly"
            } else {
                const disassembly = assemblySolution.disassemblies[0]
                detailString = disassembly.detailString
            }
        }

        return {
            id: solution.id,
            label: `Solution ${solution.id}${detailString ? ' — '+detailString : ''}`,
            solution,
        }
    })
})

// Since solution IDs are only unique within a given problem, we don't want
// ListSelect to treat them as such. We set the `ListSelect.selectOnItemChange`
// prop to false so it never changes selection, and handle some cases here
// instead.
watch(solutionItems, (newItems, oldItems) => {
    // Auto-select first piece when solutions are added
    if(
        props.selectedSolutionId === null &&
        (oldItems === undefined || oldItems.length === 0) &&
        newItems.length > 0
    ) {
        emit("update:selectedSolutionId", newItems[0].id)
    }
    // Clear selection when solutions are cleared
    if(newItems.length === 0) {
        emit("update:selectedSolutionId", null)
    }
}, {immediate: true})
watch(() => props.problemId, () => {
    // Select solution ID that was last selected for this problem, falling back
    // to the first solution.
    if(props.problemId === null) {
        emit("update:selectedSolutionId", null)
    } else if(Number.isInteger(lastSelectedIdByProblem[props.problemId])) {
        emit("update:selectedSolutionId", lastSelectedIdByProblem[props.problemId])
    } else {
        emit("update:selectedSolutionId", solutionItems.value[0]?.id || null)
    }
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
            :selectedItemId="selectedSolutionId"
            :selectOnItemChange="false"
            @update:selectedItemId="emit('update:selectedSolutionId', $event)"
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