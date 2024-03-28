<script setup lang="ts">
import {computed, ref, Ref, watch, watchEffect, onErrorCaptured, onUnmounted} from "vue"

import {PuzzleFile} from "~lib"

import {taskRunner, title} from "~/ui/globals.ts"
import {setActionManager, clearActionManager} from "~/ui/ActionManager.ts"
import {getStorageInstances, PuzzleNotFoundError} from "~/ui/storage.ts"
import {ActionManager} from "~/ui/ActionManager.ts"
import {Action, DuplicatePieceAction, DuplicateProblemAction} from "~/ui/actions.ts"
import {downloadPuzzle} from "~/ui/utils/download.ts"
import TitleBar from "~/ui/components/TitleBar.vue"
import PuzzleEditor from "~/ui/components/PuzzleEditor.vue"
import Modal from "~/ui/common/Modal.vue"
import RawDataModal from "~/ui/components/RawDataModal.vue"
import PuzzleSaveModal from "~/ui/components/PuzzleSaveModal.vue"
import PuzzleMetadataModal from "~/ui/components/PuzzleMetadataModal.vue"
import {nextTick} from "vue"

const props = defineProps<{
    storageId: string,
    puzzleName: string,
}>()

const storage = computed(() => getStorageInstances()[props.storageId])
const puzzleFile: Ref<PuzzleFile | null> = ref(null)
const actionManager = new ActionManager(storage, puzzleFile)

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

function setPuzzleFile(ignoreErrors=false) {
    puzzleError.value = null
    puzzleFile.value = null
    if(storage.value === undefined) {
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
    items: MenuItem[],
}

type MenuItem = {
    text: string | (() => string),
    icon?: string,
    perform: () => void,
    enabled?: () => boolean,
}

/** Flat list of all available menu items. */
const menuItems: {[name: string]: MenuItem} = {
    metadata: {
        text: "Metadata",
        icon: "mdi-file-code",
        perform() {
            metadataModal.value?.open()
        },
    },
    saveAs: {
        text: "Save As...",
        icon: "mdi-content-save-plus",
        perform() {
            if(puzzleFile.value) {
                saveModal.value?.openSaveAs(storage.value, puzzleFile.value)
            }
        },
    },
    rawData: {
        text: "Raw Data",
        icon: "mdi-code-braces",
        perform() {
            if(puzzleFile.value) {
                rawDataModal.value?.openFromPuzzle(puzzleFile.value)
            }
        },
        enabled: () => Boolean(puzzleFile.value),
    },
    download: {
        text: "Download",
        icon: "mdi-download",
        perform() {
            if(puzzleFile.value) {
                downloadPuzzle(puzzleFile.value)
            }
        },
        enabled: () => Boolean(puzzleFile.value)
    },
    undo: {
        text: () => {
            const action = actionManager.getUndoAction()
            const actionString = action ? ` "${action.toString()}"` : ""
            return "Undo" + actionString
        },
        icon: "mdi-undo",
        perform: () => actionManager.undo(),
        enabled: () => actionManager.canUndo(),
    },
    redo: {
        text: () => {
            const action = actionManager.getRedoAction()
            const actionString = action ? ` "${action.toString()}"` : ""
            return "Redo" + actionString
        },
        icon: "mdi-redo",
        perform: () => actionManager.redo(),
        enabled: () => actionManager.canRedo(),
    },
    duplicate: {
        text: () => {
            if(puzzleEditor.value?.currentTabId === "pieces") {
                return "Duplicate Piece"
            } else if(puzzleEditor.value?.currentTabId === "problems") {
                return "Duplicate Problem"
            } else {
                return "Duplicate"
            }
        },
        icon: "mdi-content-duplicate",
        perform: () => {
            let action: Action | null = null
            if(puzzleEditor.value?.currentTabId === "pieces") {
                action = new DuplicatePieceAction(
                    puzzleEditor.value.selectedPieceIds[0]
                )
            } else if(puzzleEditor.value?.currentTabId === "problems") {
                action = new DuplicateProblemAction(
                    puzzleEditor.value.selectedProblemIds[0]
                )
            }
            if(action) {
                actionManager.performAction(action)
            }
        },
        enabled: () => {
            if(puzzleEditor.value?.currentTabId === "pieces") {
                return puzzleEditor.value.selectedPieceIds.length == 1
            } else if(puzzleEditor.value?.currentTabId === "problems") {
                return puzzleEditor.value.selectedProblemIds.length == 1
            } else {
                return false
            }
        },
    },
}

const menus: Menu[] = [
    {
        text: "Puzzle",
        items: [
            menuItems.metadata,
            menuItems.rawData,
            menuItems.download,
            menuItems.saveAs,
        ],
    },
    {
        text: "Edit",
        items: [
            menuItems.undo,
            menuItems.redo,
            menuItems.duplicate,
        ],
    },
]

const tools: MenuItem[] = [
    menuItems.undo,
    menuItems.redo,
    menuItems.duplicate,
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
                            :disabled="tool.enabled === undefined ? false : !tool.enabled()"
                            @click="tool.perform()"
                        >
                            <VIcon v-if="tool.icon" :icon="tool.icon" :aria-label="tool.text" aria-hidden="false" />
                        </VBtn>
                    </span>
                </template>
            </VTooltip>
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
        v-if="puzzleFile"
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