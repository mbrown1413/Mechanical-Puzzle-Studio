<script setup lang="ts">
withDefaults(
    defineProps<{
        puzzleFile?: PuzzleFile | null,
    }>(), {
        puzzleFile: null,
    }
)
</script>

<template>
    <VAppBar>
        <VAppBarTitle v-slot="title" class="main-title">
            <RouterLink to="/">
                Riddlewood Studio
            </RouterLink>
        </VAppBarTitle>

        <VAppBarTitle>
            {{ puzzleFile?.name }}
        </VAppBarTitle>
    </VAppBar>
</template>

<style>
.main-title a {
    /* Undo <a> changes to make it look like a plain <VAppBarTitle> */
    color: rgba(0, 0, 0, 0.87);
    text-decoration: none;
}
</style>