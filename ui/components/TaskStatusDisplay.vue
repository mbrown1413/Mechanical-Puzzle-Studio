<script setup lang="ts">
import {taskRunner} from "~/ui/globals.ts"
import ConfirmButton from "~/ui/common/ConfirmButton.vue"
import {TaskInfo} from "~/ui/TaskRunner.ts"

function getPercentString(info: TaskInfo): string {
    const percent = info.progressPercent || 0
    return (percent * 100).toFixed(2) + "%"
}

function getProgressString(info: TaskInfo): string {
    if(info.error) {
        return "Errored"
    }
    return {
        "queued": "Queued",
        "running": (info.progressMessage || "Running") + ": " + getPercentString(info),
        "finished": "Finished",
        "canceled": "Canceled",
    }[info.status]
}

function getColor(info: TaskInfo): string | undefined {
    if(info.error) {
        return "red-darken-3"
    }
    return {
        "queued": undefined,
        "running": "blue-lighten-4",
        "finished": "green-lighten-4",
        "canceled": "red-darken-3",
    }[info.status]
}
</script>

<template>
    <div class="task-status">
        <VBtn
            v-if="taskRunner.getTasks().length !== 0"
            class="main-button"
            variant="outlined"
            color="blue-darken-1"
        >

            <template v-if="!taskRunner.current">
                No tasks running
            </template>

            <template v-if="taskRunner.current">
                <VProgressCircular
                    :indeterminate="taskRunner.current.progressPercent === null"
                    :model-value="(taskRunner.current.progressPercent || 0) * 100"
                    :title="getProgressString(taskRunner.current)"
                    :size="25"
                    class="progress"
                />
                {{ taskRunner.current.task.getDescription() }}
                <template v-if="taskRunner.current.progressMessage">
                    <br>
                    {{ taskRunner.current.progressMessage }}
                </template>
            </template>

            <VMenu
                activator="parent"
                :close-on-content-click="false"
                location="bottom"
            >

                <VCard
                    v-for="info in taskRunner.getTasks()"
                    :color="getColor(info)"
                    class="mb-2"
                >
                    <VCardActions
                        v-if="info.status === 'running'"
                        style="float: right;"
                    >
                        <VSpacer />
                        <ConfirmButton
                            title="Stop running task?"
                            text=""
                            buttonColor="red-darken-1"
                            buttonVariant="outlined"
                            confirmText="Stop"
                            confirmButtonColor="red"
                            @confirm="taskRunner.terminateRunningTask()"
                        >
                            Stop
                        </ConfirmButton>

                    </VCardActions>

                    <VCardTitle>
                        {{ info.task.getDescription() }}<br>
                        <small>{{ getProgressString(info) }}</small>
                    </VCardTitle>

                    <VCardText>
                        <VTable>
                            <tbody>
                                <tr
                                    v-for="(message, i) in info.messages"
                                    :key="i"
                                >
                                    <td>{{ message }}</td>
                                </tr>
                                <tr v-if="info.error">
                                    <td><pre>{{ info.error }}</pre></td>
                                </tr>
                            </tbody>
                        </VTable>
                    </VCardText>
                </VCard>

            </VMenu>
        </VBtn>
    </div>
</template>

<style>
.task-status {
    text-align: right;
    margin-right: 1em;
}
.main-button .v-btn__content {
    text-transform: none;
}
.progress {
    margin-right: 0.5em;
}
</style>