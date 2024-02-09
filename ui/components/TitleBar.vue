<script setup lang="ts">
import {PuzzleFile} from "~lib"
import TaskStatusDisplay from "./TaskStatusDisplay.vue";

withDefaults(
    defineProps<{
        puzzleFile?: PuzzleFile | null,
    }>(), {
        puzzleFile: null,
    }
)

const app_title = import.meta.env.VITE_APP_TITLE
</script>

<template>
    <VAppBar class="title-bar">
        <div class="main-logo">
            <RouterLink to="/">
                <img src="/logo/logo-98x50.png" :alt="app_title" />
            </RouterLink>
        </div>

        <VAppBarTitle v-if="puzzleFile" class="page-title">
            {{ puzzleFile.name }}
        </VAppBarTitle>

        <TaskStatusDisplay />
    </VAppBar>
</template>

<style>

/* Evenly space item centers so when the task display changes size, the title
 * does not shift over. */
.v-toolbar__content {
    align-items: center;
}
.v-toolbar__content > * {
    flex-basis: 0;
    flex-grow: 1;
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