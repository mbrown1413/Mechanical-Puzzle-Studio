<script setup lang="ts">
import {ref, Ref, watch, reactive, watchEffect, onMounted, onErrorCaptured} from "vue"
import {diff, unpatch, Delta} from "jsondiffpatch"

import {PuzzleFile, deserialize, serialize} from "~lib"

import {taskRunner, title} from "~/ui/globals.ts"
import {getStorageInstances, PuzzleNotFoundError} from "~/ui/storage.ts"
import {Action} from "~/ui/actions.ts"
import TitleBar from "~/ui/components/TitleBar.vue"
import PuzzleEditor from "~/ui/components/PuzzleEditor.vue"
import Modal from "~/ui/common/Modal.vue"

const props = defineProps<{
    storageId: string,
    puzzleName: string,
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
        puzzleFile.value = puzzleStorage.get(props.puzzleName, ignoreErrors)
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
            puzzleStorage.get(props.puzzleName, true)
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

const errorShow = ref(false)
const errorMessage = ref("")

type PerformedAction = {
    action: Action,
    patch: Delta,
}
const performedActions: PerformedAction[] = reactive([])
const undoneActions: PerformedAction[] = reactive([])

function performAction(action: Action) {
    if(puzzleFile.value === null) { return }
    const before = serialize(puzzleFile.value)

    try {
        action.perform(puzzleFile.value.puzzle)
    } catch(e) {
        const msg = `Error performing action: ${action.toString()}`
        errorShow.value = true
        errorMessage.value = msg + "\n" + stripIfStartsWith(String(e), "Error:")
        console.error(msg, "\n", e)
    }
    const after = serialize(puzzleFile.value)
    puzzleStorage.save(puzzleFile.value)
    
    performedActions.push({
        action: action,
        patch: diff(before, after),
    })
    undoneActions.length = 0
}

function getLastAction(): Action | null {
    if(!performedActions.length) { return null }
    return performedActions[performedActions.length-1].action
}

function canUndo(): boolean {
    return puzzleFile.value !== null && performedActions.length > 0
}

function undo() {
    if(puzzleFile.value === null) { return }
    const performedAction = performedActions.pop()
    if(!performedAction) { return }
    undoneActions.push(performedAction)

    const serialized = serialize(puzzleFile.value)
    unpatch(serialized, performedAction.patch)
    puzzleFile.value = deserialize<PuzzleFile>(serialized, "PuzzleFile")
    puzzleStorage.save(puzzleFile.value)
}

function redo() {
    // Not Implemented
}

function stripIfStartsWith(input: string, toStrip: string) {
    return input.startsWith(toStrip) ?
        input.slice(toStrip.length).trimStart()
        : input
}

let oldFinishedLength = 0
watch(taskRunner.finished, () => {
    // Only show snackbar if new task was added to `finished` list
    const newLength = taskRunner.finished.length
    if(newLength === oldFinishedLength) {
        return
    }
    oldFinishedLength = newLength

    const finished = taskRunner.finished[taskRunner.finished.length-1]
    if(finished.error !== null) {
        errorShow.value = true
        errorMessage.value = finished.error
    }
})

const tools: {
    text: string | (() => string),
    icon: string,
    perform: () => void,
    enabled: () => boolean,
}[] = [
    {
        text: () => {
            const action = getLastAction()
            const actionString = action ? ` "${action.toString()}"` : ""
            return "Undo" + actionString
        },
        icon: "mdi-undo",
        perform: undo,
        enabled: canUndo,
    },
    {
        text: "Redo",
        icon: "mdi-redo",
        perform: () => redo,
        enabled: () => false,
    },
]
</script>

<template>
    <TitleBar :puzzleFile="puzzleFile" flat />
    <VAppBar
        density="compact"
        :height="48"
        class="toolbar"
    >

        <div class="left">
            <!--
            <VBtn>File</VBtn>
            <VBtn>Edit</VBtn>
            <VBtn>Settings</VBtn>
            -->
        </div>

        <div class="center">
            <VTooltip
                v-for="tool in tools"
                :text="typeof tool.text === 'string' ? tool.text : tool.text()"
                location="bottom"
            >
                <template v-slot:activator="{props}">
                    <!-- Wrap in span so tooltips show on disabled buttons -->
                    <span v-bind="props">
                        <VBtn
                            rounded
                            :disabled="!tool.enabled()"
                            @click="tool.perform()"
                        >
                            <VIcon :icon="tool.icon" :aria-label="tool.text" aria-hidden="false" />
                        </VBtn>
                    </span>
                </template>
            </VTooltip>
        </div>

        <div class="right">
        </div>

    </VAppBar>
    <PuzzleEditor
        v-if="puzzleFile"
        :puzzle="puzzleFile.puzzle"
        @action="performAction"
    />
    <VSnackbar
        v-model="errorShow"
        timeout="5000"
        color="red"
        style="white-space: pre;"
    >
        {{ errorMessage }}
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
.toolbar {
    align-items: center;
}
.toolbar div {
    flex-basis: 0;
    flex-grow: 1;
}
.toolbar .center {
    text-align: center;
}
.toolbar .right {
    text-align: right;
}
</style>