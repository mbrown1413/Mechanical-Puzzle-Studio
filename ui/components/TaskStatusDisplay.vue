<script setup lang="ts">
import {taskRunner} from "~/ui/globals.ts"

</script>

<template>
    <div class="task-status">
        <div
            v-if="taskRunner.currentTask !== null"
            class="container"
        >
            <VProgressCircular
                indeterminate
                :size="25"
            />
            {{ taskRunner.currentTask.getDescription() }}
            <VBtn
                color="red-darken-1"
                variant="outlined"
                size="x-small"
                @click="taskRunner.terminateRunningTask()"
            >
                Stop
            </VBtn>
        </div>
    </div>
</template>

<style>
.task-status {
    text-align: right;
    margin-right: 1em;
}
</style>