<script setup lang="ts">
import {computed, ComputedRef, ref, Ref, watch, watchEffect, onErrorCaptured, onUnmounted, nextTick, provide} from "vue"

import {PuzzleFile} from "~lib"

import {taskRunner, title} from "~/ui/globals.ts"
import {ActionManager, setActionManager, clearActionManager} from "~/ui/ActionManager.ts"
import {PuzzleStorage, getStorageInstances, PuzzleNotFoundError, StorageId} from "~/ui/storage.ts"
import {Action} from "~/ui/actions.ts"
import {UiButtonDefinition, useUiButtonComposible} from "~/ui/ui-buttons.ts"
import TitleBar from "~/ui/components/TitleBar.vue"
import PuzzleEditor from "~/ui/components/PuzzleEditor.vue"
import Modal from "~/ui/common/Modal.vue"
import RawDataModal from "~/ui/components/RawDataModal.vue"
import PuzzleSaveModal from "~/ui/components/PuzzleSaveModal.vue"
import PuzzleMetadataModal from "~/ui/components/PuzzleMetadataModal.vue"
import UiButton from "~/ui/components/UiButton.vue"

const props = defineProps<{
    storageId: StorageId,
    puzzleName: string,
}>()

const storage: Ref<PuzzleStorage | null> = computed(
    () => getStorageInstances()[props.storageId] || null
)
const puzzleFile: Ref<PuzzleFile | null> = ref(null)
const actionManager = new ActionManager(storage, puzzleFile)
provide("actionManager", actionManager)

setActionManager(actionManager)
onUnmounted(() => {
    clearActionManager()
})

type PuzzleErrorInfo = {
    title: string,
    recoverable: boolean,
    errorMessage: string,
    userMessage?: string,
}
const puzzleError: Ref<PuzzleErrorInfo | null> = ref(null)
const puzzleErrorModal: Ref<InstanceType<typeof Modal> | null> = ref(null)

const puzzleEditor: Ref<InstanceType<typeof PuzzleEditor> | null> = ref(null)
const metadataModal: Ref<InstanceType<typeof PuzzleMetadataModal> | null> = ref(null)
const rawDataModal: Ref<InstanceType<typeof RawDataModal> | null> = ref(null)
const saveModal: Ref<InstanceType<typeof PuzzleSaveModal> | null> = ref(null)

watch(puzzleError, () => {
    nextTick(() => {
        if(puzzleError.value === null) {
            puzzleErrorModal.value?.close()
        } else {
            puzzleErrorModal.value?.open()
        }
    })
})

watchEffect(() => {
    title.value = props.puzzleName
})

setPuzzleFile()

const uiButtons = useUiButtonComposible(
    puzzleFile,
    storage,
    actionManager,
    performAction,
    puzzleEditor,
    saveModal,
    metadataModal,
    rawDataModal,
)

provide("uiButtons", uiButtons)

function setPuzzleFile(ignoreErrors=false) {
    puzzleError.value = null
    puzzleFile.value = null
    if(!storage.value) {
        puzzleError.value = {
            title: "Storage not found",
            errorMessage: `The storage ID "${props.storageId}" does not exist in this browser.`,
            userMessage: "Return home to select another puzzle.",
            recoverable: false,
        }
        return
    }
    try {
        puzzleFile.value = storage.value.get(props.puzzleName, ignoreErrors)
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
            storage.value.get(props.puzzleName, true)
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

function performAction(action: Action) {
    try {
        actionManager.performAction(action)
    } catch(e) {
        const msg = `Error performing action: ${action.toString()}`
        errorShow.value = true
        errorMessage.value = msg + "\n" + stripIfStartsWith(String(e), "Error:")
        console.error(msg, "\n", e)
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

type Menu = {
    text: string,
    items: UiButtonDefinition[],
}

const menus: ComputedRef<Menu[]> = computed(() => {
    let pieceOrProblemMenuItems: UiButtonDefinition[]
    if(puzzleEditor.value?.currentTabId === "pieces") {
        pieceOrProblemMenuItems = [
            uiButtons.newPiece,
            uiButtons.deletePiece,
            uiButtons.duplicatePiece,
        ]
    } else {
        pieceOrProblemMenuItems = [
            uiButtons.newProblem,
            uiButtons.deleteProblem,
            uiButtons.duplicateProblem,
        ]
    }

    return [
        {
            text: "Puzzle",
            items: [
                uiButtons.newPuzzle,
                uiButtons.puzzleMetadata,
                uiButtons.puzzleRawData,
                uiButtons.downloadPuzzle,
                uiButtons.saveAs,
            ],
        },
        {
            text: "Edit",
            items: [
                uiButtons.undo,
                uiButtons.redo,
                ...pieceOrProblemMenuItems
            ],
        },
    ]
})

const toolbarButtons: UiButtonDefinition[] = [
    uiButtons.undo,
    uiButtons.redo,
]
</script>

<template>
    <TitleBar :puzzleFile="puzzleFile" :storage="storage" flat />
    <VAppBar
        density="compact"
        :height="48"
        class="toolbar"
    >

        <div class="toolbar-left">
            <VMenu v-for="menu in menus">
                <template v-slot:activator="{props}">
                    <VBtn v-bind="props">{{ menu.text }}</VBtn>
                </template>
                <VList>
                    <VListItem
                        v-for="menuItem in menu.items"
                        @click="menuItem.perform"
                        :disabled="menuItem.enabled === undefined ? false : !menuItem.enabled()"
                    >
                        <VIcon v-if="menuItem.icon" :icon="menuItem.icon" :aria-label="menuItem.text" aria-hidden="false" />
                        {{ typeof menuItem.text === 'string' ? menuItem.text : menuItem.text() }}
                    </VListItem>
                </VList>
            </VMenu>
        </div>

        <div class="toolbar-center">
            <UiButton
                v-for="toolbarButton in toolbarButtons"
                :uiButton="toolbarButton"
            />
        </div>

        <div class="toolbar-right">
        </div>

    </VAppBar>
    <PuzzleEditor
        v-if="puzzleFile"
        ref="puzzleEditor"
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

    <PuzzleMetadataModal
        v-if="puzzleFile && storage"
        ref="metadataModal"
        :puzzleFile="puzzleFile"
        :storage="storage"
        @action="performAction"
    />
    <RawDataModal ref="rawDataModal" />
    <PuzzleSaveModal ref="saveModal" @save="puzzleFile = $event" />
</template>

<style scoped>
.toolbar {
    align-items: center;
}
.toolbar div {
    flex-basis: 0;
    flex-grow: 1;
}
.toolbar .toolbar-center {
    text-align: center;
}
.toolbar .toolbar-right {
    text-align: right;
}
</style>