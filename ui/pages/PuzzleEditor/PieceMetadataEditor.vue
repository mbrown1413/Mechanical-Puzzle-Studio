<script setup lang="ts">
import {computed} from "vue"

import {Puzzle} from  "~lib/Puzzle.ts"
import {Action} from "~ui/actions.ts"

const props = defineProps<{
    puzzle: Puzzle,
    pieceId: string | null,
}>()

const emit = defineEmits<{
    action: [action: Action]
}>()

const piece = computed(() =>
    props.pieceId === null ? null : props.puzzle.pieces.get(props.pieceId) || null
)
</script>

<template>
    <div>
        <h3>{{ piece?.id }}</h3>
    </div>
</template>