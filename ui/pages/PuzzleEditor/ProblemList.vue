<script setup lang="ts">
import {Puzzle} from "~lib/Puzzle.ts"
import {Action} from "~ui/actions.ts"

defineProps<{
    puzzle: Puzzle,
    selectedProblemIds: string[]
}>()

const emit = defineEmits<{
    "update:selectedPieceIds": [pieceIds: string[]],
    action: [action: Action]
}>()
</script>

<template>
    (problems list placeholder)
</template>