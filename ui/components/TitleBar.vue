<script setup lang="ts">
import {PuzzleFile} from "~lib"

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
    <VAppBar>
        <RouterLink to="/" style="height: 60px;" class="main-logo">
            <img src="/logo/logo-98x50.png" :alt="app_title" />
        </RouterLink>

        <VAppBarTitle v-if="puzzleFile" class="page-title">
            {{ puzzleFile.name }}
        </VAppBarTitle>
    </VAppBar>
</template>

<style>
.main-logo {
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