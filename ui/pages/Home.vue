<script setup lang="ts">
import {ref, Ref, reactive} from "vue"
import {VDataTable} from "vuetify/components"
import {saveAs} from "file-saver"

import {PuzzleMetadata} from "~lib"

import {title} from "~/ui/globals.ts"
import {getStorageInstances, PuzzleStorage} from "~/ui/storage.ts"
import ConfirmButton from "~/ui/common/ConfirmButton.vue"
import TitleBar from "~/ui/components/TitleBar.vue"
import RawDataButton from "~/ui/components/RawDataButton.vue"
import NewPuzzleModal from "~/ui/components/NewPuzzleModal.vue"

title.value = ""

const newPuzzleModal: Ref<InstanceType<typeof NewPuzzleModal> | null> = ref(null)

const puzzlesByStorage = reactive(
    Object.values(getStorageInstances()).map((storage) => {
        return {
            storage,
            puzzles: storage.list(),
        }
    })
)

function deletePuzzle(storage: PuzzleStorage, puzzleName: string) {
    storage.delete(puzzleName)

    // Remove puzzle from puzzlesByStorage
    const storageEntry = puzzlesByStorage.find(
        (item) => item.storage === storage
    )
    if(storageEntry !== undefined) {
        storageEntry.puzzles = storageEntry.puzzles.filter(
            (puzzle) => puzzle.name !== puzzleName
        )
    }
}

function downloadPuzzle(storage: PuzzleStorage, meta: PuzzleMetadata) {
    const [raw, _error] = storage.getRawFormatted(meta.name)
    const blob = new Blob([raw], {type: "application/json;charset=utf-8"})
    const filename = meta.name + ".json"
    saveAs(blob, filename)
}

const tableHeaders: VDataTable["headers"] = [
    {title: "Name", key: "name", align: "start"},
    //{title: "Created", key: "createdUTCString"},
    //{title: "Modified", key: "modifiedUTCString"},
    {title: "", key: "actions", sortable: false, align: "end"},
]

const storageButtons = [
    {
        text: "Upload",
        icon: "mdi-file-upload",
        action: (storage: PuzzleStorage) => newPuzzleModal.value?.open("upload", storage),
    },
    {
        text: "New",
        icon: "mdi-plus-box",
        action: (storage: PuzzleStorage) => newPuzzleModal.value?.open("new", storage),
    },
]

const appTitle = import.meta.env.VITE_APP_TITLE
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
                        View the project on Github to read more about it and track progress.
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

        <VRow justify="center">
            <VDataTable
                    v-for="{storage, puzzles} of puzzlesByStorage"
                    :headers="tableHeaders"
                    :items="puzzles"
                    no-data-text="No puzzles in this storage location"
                    class="mt-10 ml-10 mr-10 table-striped"
                    style="max-width: 800px;"
            >
                <template v-slot:bottom v-if="puzzles.length <= 10" />

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

                    <VTooltip text="Download">
                        <template v-slot:activator="{props}">
                            <VBtn
                                v-bind="props"
                                @click="downloadPuzzle(storage, item)"
                            >
                                <VIcon icon="mdi-download" aria-label="Download" aria-hidden="false" />
                            </VBtn>
                        </template>
                    </VTooltip>

                    <RawDataButton :storage="storage" :puzzleName="item.name" />

                    <VTooltip text="Copy">
                        <template v-slot:activator="{props}">
                            <VBtn
                                v-bind="props"
                                @click="newPuzzleModal?.open('copy', storage, item.name)"
                            >
                                <VIcon icon="mdi-content-copy" aria-label="Copy" aria-hidden="false" />
                            </VBtn>
                        </template>
                    </VTooltip>

                    <ConfirmButton
                        :text="`Delete Puzzle ${item.name}?`"
                        :disabled="storage.readOnly"
                        tooltip="Delete"
                        confirmText="Delete"
                        confirmButtonColor="red"
                        @confirm="deletePuzzle(storage, item.name)"
                    >
                        <VIcon icon="mdi-delete" aria-label="Delete" aria-hidden="false" />
                    </ConfirmButton>

                </template>

            </VDataTable>
        </VRow>
    </VMain>

    <NewPuzzleModal ref="newPuzzleModal" />
</template>