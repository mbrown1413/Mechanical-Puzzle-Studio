<script setup lang="ts">
import {computed} from "vue"

import {taskRunner} from "~/ui/globals.ts"
import ConfirmButton from "~/ui/common/ConfirmButton.vue"
import {VTable} from "vuetify/components";

const info = computed(() => taskRunner.currentTaskInfo)
</script>

<template>
    <div class="task-status">
        <VBtn
            v-if="info !== null"
            class="main-button"
            variant="outlined"
            color="blue-darken-1"
        >
            <VProgressCircular
                :indeterminate="info.progressPercent === null"
                :model-value="info.progressPercent === null ? 360 : info.progressPercent"
                :size="25"
                class="progress"
            />

            {{ info.task.getDescription() }}

            <VMenu
                activator="parent"
                :close-on-content-click="false"
                location="bottom"
            >
                <VCard>

                    <VCardActions style="float: right;">
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
                        {{ info.task.getDescription() }}
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