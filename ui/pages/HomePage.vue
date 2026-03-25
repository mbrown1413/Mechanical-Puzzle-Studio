<script setup lang="ts">
import {ref, Ref, reactive, provide, onMounted} from "vue"
import {VDataTable} from "vuetify/components"

import {PuzzleMetadata} from "~lib"
import {title} from "~/ui/globals.ts"
import {downloadPuzzleFromStorage} from "~/ui/utils/download.ts"
import {clearStorageCache, getStorageInstances, Storage} from "~/ui/storage.ts"
import ConfirmButton from "~/ui/common/ConfirmButton.vue"
import TitleBar from "~/ui/components/TitleBar.vue"
import RawDataModal from "~/ui/components/RawDataModal.vue"
import PuzzleSaveModal from "~/ui/components/PuzzleSaveModal.vue"
import Modal from "~/ui/common/Modal.vue"

title.value = ""

const saveModal: Ref<InstanceType<typeof PuzzleSaveModal> | null> = ref(null)
const rawDataModal: Ref<InstanceType<typeof RawDataModal> | null> = ref(null)
const deleteErrorModal: Ref<InstanceType<typeof Modal> | null> = ref(null)
const deleteError: Ref<string | null> = ref(null)

provide("actionManager", null)

const puzzlesByStorage: {
    storage: Storage,
    puzzles: PuzzleMetadata[],
    loading: boolean,
    error?: string,
}[] = reactive(
    Object.values(getStorageInstances()).map((storage) => {
        return {
            storage,
            puzzles: [],
            loading: false,
        }
    })
)

onMounted(() => {
    void loadPuzzles()
})

async function loadPuzzles() {
    await Promise.all(puzzlesByStorage.map(async (entry) => {
        entry.loading = true
        entry.error = undefined
        try {
            entry.puzzles = await entry.storage.list()
        } catch(e) {
            console.error(`Error listing puzzles on ${entry.storage.name} backend:\n${e}`)
            entry.error = String(e)
        }
        entry.loading = false
    }))
}

async function deletePuzzle(storage: Storage, puzzleName: string) {
    try {
        await storage.delete(puzzleName)
    } catch(e) {
        console.error(`Error deleting puzzles on ${storage.name} backend:\n${e}`)
        deleteError.value = String(e)
        deleteErrorModal.value?.open()
        return
    }

    // Remove puzzle from puzzlesByStorage
    const storageEntry = puzzlesByStorage.find(
        (item) => item.storage === storage
    )
    if(storageEntry !== undefined) {
        storageEntry.puzzles = storageEntry.puzzles.filter(
            (puzzle) => puzzle.name !== puzzleName
        )
    }

    clearStorageCache()
}

const tableHeaders: VDataTable["$props"]["headers"] = [
    {title: "Name", key: "name", align: "start"},
    //{title: "Created", key: "createdUTCString"},
    //{title: "Modified", key: "modifiedUTCString"},
    {title: "", key: "actions", sortable: false, align: "end"},
]

const storageButtons = [
    {
        text: "Upload",
        icon: "mdi-file-upload",
        action: (storage: Storage) => saveModal.value?.openUpload(storage),
    },
    {
        text: "New",
        icon: "mdi-plus-box",
        action: (storage: Storage) => saveModal.value?.openNew(storage),
    },
]

const appTitle = import.meta.env.PZS_APP_TITLE
</script>

<template>
    <TitleBar />
    <VMain>
        <VRow justify="center" align="center" class="mt-5">
            <VCol style="max-width: 425px;">
                <VCard
                    color="red-lighten-4"
                >
                    <template v-slot:text>
                        <strong>Note: This software is in early development.</strong><br>
                        View the project on GitHub to read more about it and track progress.
                    </template>
                </VCard>
            </VCol>
            <VCol style="max-width: 425px;">
                <VCard
                    :title="appTitle"
                    prepend-icon="mdi-github"
                    append-icon="mdi-open-in-new"
                    href="https://github.com/mbrown1413/Mechanical-Puzzle-Studio/#mechanical-puzzle-studio"
                    target="_blank"
                    rel="noopener"
                >
                    <template v-slot:text>
                        The Swiss Army knife of mechanical puzzle design.
                    </template>
                </VCard>
            </VCol>
        </VRow>

        <VRow
            v-for="{storage, puzzles, loading, error} of puzzlesByStorage"
            justify="center"
        >
            <VDataTable
                    :headers="tableHeaders"
                    :items="puzzles"
                    items-per-page="-1"
                    :loading="loading"
                    loading-text="Loading Puzzles..."
                    :no-data-text="error ? error : 'No puzzles in this storage location'"
                    class="mt-10 ml-10 mr-10 table-striped"
                    style="max-width: 800px;"
            >
                <template v-slot:bottom />

                <template v-slot:top>
                    <VToolbar
                            flat
                            density="compact"
                            :title="storage.name"
                    >
                        <VBtn
                            v-for="storageButton in storageButtons"
                            v-if="!storage.readOnly"
                            color="primary"
                            size="large"
                            style="flex: 0 0 auto;"
                            @click="storageButton.action(storage)"
                        >
                            <VIcon :icon="storageButton.icon" class="mr-1" />
                            {{ storageButton.text }}
                        </VBtn>
                    </VToolbar>
                </template>

                <template v-slot:item.name="{item}">

                    <RouterLink :to="{name: 'puzzle', params: {storageId: storage.id, puzzleName: item.name}}">
                        {{ item.name }}
                    </RouterLink>

                    <VTooltip v-if="item.error !== null">
                        <template v-slot:activator="{props}">
                            <VChip
                                v-if="item.error !== null"
                                v-bind="props"
                                color="red"
                                density="compact"
                                class="ml-2"
                            >
                                Error
                            </VChip>
                        </template>
                        <template v-slot>
                            <pre>{{ item.error }}</pre>
                        </template>
                    </VTooltip>

                </template>

                <template v-slot:item.actions="{item}">

                    <VBtn
                        @click="void downloadPuzzleFromStorage(storage, item.name)"
                        v-tooltip.top="'Download'"
                    >
                        <VIcon icon="mdi-download" aria-label="Download" aria-hidden="false" />
                    </VBtn>

                    <VBtn
                        @click="void rawDataModal?.openFromStorage(storage, item.name)"
                        v-tooltip.top="'Raw Data'"
                    >
                        <VIcon icon="mdi-code-braces" aria-label="Raw Data" aria-hidden="false" />
                    </VBtn>

                    <VBtn
                        @click="saveModal?.openCopy(storage, item.name)"
                        v-tooltip.top="'Copy'"
                    >
                        <VIcon icon="mdi-content-copy" aria-label="Copy" aria-hidden="false" />
                    </VBtn>

                    <ConfirmButton
                        :text="`Delete Puzzle ${item.name}?`"
                        :disabled="storage.readOnly"
                        confirmText="Delete"
                        confirmButtonColor="red"
                        @confirm="void deletePuzzle(storage, item.name)"
                        v-tooltip.top="'Delete'"
                    >
                        <VIcon icon="mdi-delete" aria-label="Delete" aria-hidden="false" />
                    </ConfirmButton>

                </template>

            </VDataTable>
        </VRow>
    </VMain>

    <RawDataModal ref="rawDataModal" />
    <PuzzleSaveModal ref="saveModal" />

    <Modal
        ref="deleteErrorModal"
        title="Error deleting puzzle"
        icon="mdi-alert-outline"
        :cancel-show="false"
        @ok="deleteErrorModal?.close()"
    >
        {{ deleteError }}
    </Modal>

</template>