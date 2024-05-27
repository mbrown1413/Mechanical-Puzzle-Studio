<script setup lang="ts">
import {computed, inject} from "vue"

import {PuzzleFile} from "~lib"
import {ActionManager} from "~/ui/ActionManager.ts"
import TaskStatusDisplay from "./TaskStatusDisplay.vue";

withDefaults(
    defineProps<{
        puzzleFile?: PuzzleFile | null,
        flat?: boolean,
    }>(), {
        flat: false,
    }
)

const appTitle = import.meta.env.VITE_APP_TITLE

const actionManager = inject("actionManager") as ActionManager | null

const savePill = computed(() => {
    if(!actionManager) {
        return null
    }
    switch(actionManager.saveState.value) {
        case "readOnly":
            return {
                color: "red",
                text: "Read Only",
                tooltip: 'Select "Save As" under the File menu to save changes'
            }
        case "saved":
            return {
                color: "green",
                text: "Saved",
                tooltip: "Auto-saving after every change"
            }
        default:
            const exhaustiveCheck: never = actionManager.saveState.value
            return exhaustiveCheck
    }
})
</script>

<template>
    <VAppBar class="title-bar" :flat="flat">
        <div class="main-logo">
            <RouterLink to="/">
                <img src="/logo/logo-98x50.png" :alt="appTitle" />
            </RouterLink>
        </div>

        <VAppBarTitle v-if="puzzleFile" class="page-title">
            {{ puzzleFile.name }}

            <VTooltip v-if="savePill">
                <template v-slot:activator="{props}">
                    <VChip
                        v-bind="props"
                        :color="savePill.color"
                        density="compact"
                        class="ml-2"
                    >
                        {{ savePill.text }}
                    </VChip>
                </template>
                <template v-slot>
                    {{ savePill.tooltip }}
                </template>
            </VTooltip>

        </VAppBarTitle>

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