<script setup lang="ts">
import {PuzzleFile} from "~lib"
import TaskStatusDisplay from "./TaskStatusDisplay.vue";
import {PuzzleStorage} from "~/ui/storage.ts";

withDefaults(
    defineProps<{
        puzzleFile?: PuzzleFile | null,
        storage?: PuzzleStorage,
        flat?: boolean,
    }>(), {
        flat: false,
    }
)

const appTitle = import.meta.env.VITE_APP_TITLE
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

            <VTooltip v-if="storage?.readOnly">
                <template v-slot:activator="{props}">
                    <VChip
                        v-bind="props"
                        color="red"
                        density="compact"
                        class="ml-2"
                    >
                        Read Only
                    </VChip>
                </template>
                <template v-slot>
                    Select "Save As" under the File menu to save changes
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