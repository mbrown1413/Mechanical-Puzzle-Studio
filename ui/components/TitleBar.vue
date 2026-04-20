<script setup lang="ts">
import {computed, inject} from "vue"

import {PuzzleFile} from "~lib"
import {SaveManager} from "~/ui/SaveManager"
import TaskStatusDisplay from "./TaskStatusDisplay.vue";

withDefaults(
    defineProps<{
        puzzleName?: string | null,
        puzzleFile?: PuzzleFile | null,
        flat?: boolean,
    }>(), {
        flat: false,
    }
)

const appTitle = import.meta.env.PZS_APP_TITLE

const saveManager = inject("saveManager") as SaveManager | null

const savePill = computed(() => {
    if(!saveManager) {
        return null
    }
    switch(saveManager.saveState.value) {
        case "saved":
            return {
                color: "green",
                text: "Saved",
                tooltip: "Auto-saving after every change"
            }
        case "pending":
            return {
                color: "yellow",
                text: "Saving shortly...",
                textColor: "#F57F17",
            }
        case "saving":
            return {
                color: "blue",
                text: "Saving...",
            }
        case "error":
            return {
                color: "red",
                text: "Save Error",
                tooltip: "An error occurred when saving. See console for details."
            }
        case "readOnly":
            return {
                color: "red",
                text: "Read Only",
                tooltip: 'Select "Save As" under the File menu to save changes'
            }
        default:
            const exhaustiveCheck: never = saveManager.saveState.value
            return exhaustiveCheck
    }
})
</script>

<template>
    <VAppBar class="title-bar" :flat="flat">
        <div class="main-logo">
            <RouterLink to="/">
                <img src="/logo/logo-101x50.png" :alt="appTitle" />
            </RouterLink>
        </div>

        <VAppBarTitle v-if="puzzleFile" class="page-title">
            {{ puzzleName }}

            <VChip
                v-if="savePill"
                :color="savePill.color"
                density="compact"
                class="ml-2"
                v-tooltip="savePill.tooltip"
            >
                <span :style="{color: savePill.textColor || 'inherit'}">
                    {{ savePill.text }}
                </span>
            </VChip>

        </VAppBarTitle>
        <VSpacer v-else />

        <TaskStatusDisplay />
    </VAppBar>
</template>

<style scoped>

/* Evenly space item centers so when the task display changes size, the title
 * does not shift over. */
.v-toolbar__content {
    align-items: center;
}
.v-toolbar__content > * {
    flex-basis: 0;
    flex-grow: 1;
}

.v-toolbar__content > .v-toolbar-title {
    margin-inline-start: 0;
}

.main-logo {
    height: 60px;
    padding-left: 1em;

    /* Style alt text as a title */
    font-size: 1.25rem;
    color: rgba(0, 0, 0, 0.87);
    text-decoration: none;
}
.main-logo img {
    height: 50px;
    margin-top: 3px;

    /* Vertically center alt text */
    line-height: 60px;
}

.page-title {
    text-align: center;
}
</style>