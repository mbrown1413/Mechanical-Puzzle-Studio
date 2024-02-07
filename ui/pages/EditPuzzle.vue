<script setup lang="ts">
import {ref, reactive, watchEffect} from "vue"

import {PuzzleFile} from "~lib"

import {title} from "~/ui/globals.ts"
import {getStorageInstances} from "~/ui/storage.ts"
import {Action} from "~/ui/actions.ts"
import TitleBar from "~/ui/components/TitleBar.vue"
import PuzzleEditor from "~/ui/components/PuzzleEditor.vue"

const props = defineProps<{
    storageId: string,
    puzzleId: string,
}>()

const puzzleStorage = getStorageInstances()[props.storageId]

const puzzleFile = reactive(
    puzzleStorage.get(props.puzzleId as string) as any
) as PuzzleFile

watchEffect(() => {
    title.value = puzzleFile.name
})

const actionErrorShow = ref(false)
const actionErrorMessage = ref("")

function performAction(action: Action) {
    try {
        action.perform(puzzleFile.puzzle)
    } catch(e) {
        const msg = `Error performing action: ${action.toString()}`
        actionErrorShow.value = true
        actionErrorMessage.value = msg + "\n" + stripIfStartsWith(String(e), "Error:")
        console.error(msg, "\n", e)
    }
    puzzleStorage.save(puzzleFile)
}

function stripIfStartsWith(input: string, toStrip: string) {
    return input.startsWith(toStrip) ?
        input.slice(toStrip.length).trimStart()
        : input
}
</script>

<template>
    <TitleBar :puzzleFile="puzzleFile" />
    <PuzzleEditor
        v-if="puzzleFile"
        :puzzleFile="puzzleFile"
        @action="performAction"
    />
    <VSnackbar
        v-model="actionErrorShow"
        timeout="5000"
        color="red"
        style="white-space: pre;"
    >
        {{ actionErrorMessage }}
    </VSnackbar>
</template>