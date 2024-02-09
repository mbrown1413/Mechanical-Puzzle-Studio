<script setup lang="ts">
import {ref, Ref, watch, watchEffect, onErrorCaptured} from "vue"

import {PuzzleFile} from "~lib"

import {title} from "~/ui/globals.ts"
import {getStorageInstances, PuzzleNotFoundError} from "~/ui/storage.ts"
import {Action} from "~/ui/actions.ts"
import TitleBar from "~/ui/components/TitleBar.vue"
import PuzzleEditor from "~/ui/components/PuzzleEditor.vue"
import Modal from "~/ui/common/Modal.vue"
import {onMounted} from "vue"

const props = defineProps<{
    storageId: string,
    puzzleId: string,
}>()

type PuzzleErrorInfo = {
    title: string,
    recoverable: boolean,
    errorMessage: string,
    userMessage?: string,
}
const puzzleError: Ref<PuzzleErrorInfo | null> = ref(null)
const puzzleErrorModal: Ref<InstanceType<typeof Modal> | null> = ref(null)

watch(puzzleError, () => {
    if(puzzleError.value === null) {
        puzzleErrorModal.value?.close()
    } else {
        puzzleErrorModal.value?.open()
    }
})

const puzzleStorage = getStorageInstances()[props.storageId]

onMounted(() => {
    setPuzzleFile()
    watchEffect(() => {
        title.value = puzzleFile.value?.name || ""
    })
})

let puzzleFile: Ref<PuzzleFile | null> = ref(null)
function setPuzzleFile(ignoreErrors=false) {
    puzzleError.value = null
    puzzleFile.value = null
    try {
        puzzleFile.value = puzzleStorage.get(props.puzzleId, ignoreErrors)
    } catch(e) {
        console.error(e)
        if(e instanceof PuzzleNotFoundError) {
            puzzleError.value = {
                title: "Puzzle not found",
                errorMessage: stripIfStartsWith(String(e), "Error:"),
                userMessage: "Return home to select another puzzle.",
                recoverable: false,
            }
            return
        }

        // Try again immediately with ignoreErrors set.
        // If it fails now, we know it's unrecoverable.
        let recoverable = true
        try {
            puzzleStorage.get(props.puzzleId, true)
        } catch {
            recoverable = false
        }

        puzzleError.value = {
            title: "Puzzle read error",
            errorMessage: stripIfStartsWith(String(e), "Error:"),
            recoverable: recoverable,
        }
    }
}

onErrorCaptured((error: unknown) => {
    console.error(error)
    puzzleError.value = {
        title: "Puzzle render error",
        errorMessage: stripIfStartsWith(String(error), "Error:"),
        recoverable: false,
    }
    puzzleFile.value = null
    return false
})

const actionErrorShow = ref(false)
const actionErrorMessage = ref("")

function performAction(action: Action) {
    if(puzzleFile.value === null) { return }
    try {
        action.perform(puzzleFile.value.puzzle)
    } catch(e) {
        const msg = `Error performing action: ${action.toString()}`
        actionErrorShow.value = true
        actionErrorMessage.value = msg + "\n" + stripIfStartsWith(String(e), "Error:")
        console.error(msg, "\n", e)
    }
    puzzleStorage.save(puzzleFile.value)
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
        :puzzle="puzzleFile.puzzle"
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

    <Modal
        ref="puzzleErrorModal"
        @ok="puzzleErrorModal?.close(); setPuzzleFile(true)"
        @cancel="$router.push({name: 'home'})"
        :title="puzzleError?.title || ''"
        persistent
        okText="Continue"
        :okShow="puzzleError?.recoverable"
        cancelText="Home"
    >
        <code>{{ puzzleError?.errorMessage }}</code>

        <p v-if="puzzleError?.userMessage">
            {{ puzzleError?.userMessage }}
        </p>
        <p v-else-if="puzzleError?.recoverable">
            If you continue, things may not work correctly.
        </p>
        <p v-else>
            Since this error cannot be ignored, the puzzle cannot be viewed.
        </p>
    </Modal>
</template>

<style scoped>
code {
    display: block;
    white-space: pre-wrap;
    margin-bottom: 1em;
    padding-left: 2em;
}
</style>