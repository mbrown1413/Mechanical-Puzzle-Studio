<script setup lang="ts">
import {ref, Ref, reactive, computed} from "vue"
import {useRouter} from "vue-router"
import {saveAs} from "file-saver"

import {Puzzle, PuzzleFile, CubicGrid, PuzzleMetadata} from "~lib"

import {title} from "~/ui/globals.ts"
import {getStorageInstances, PuzzleStorage} from "~/ui/storage.ts"
import Modal from "~/ui/common/Modal.vue"
import ConfirmButton from "~/ui/common/ConfirmButton.vue"
import TitleBar from "~/ui/components/TitleBar.vue"
import RawDataButton from "~/ui/components/RawDataButton.vue"
import {VDataTable} from "vuetify/components"

title.value = ""

const router = useRouter()

const puzzlesByStorage = reactive(
    Object.values(getStorageInstances()).map((storage) => {
        return {
            storage,
            puzzles: storage.list(),
        }
    })
)

// Refs for puzzle creation
const newPuzzleModal: Ref<InstanceType<typeof Modal> | null> = ref(null)
const newPuzzleForm: Ref<HTMLFormElement | null> = ref(null)
const newPuzzleFields = reactive({
    name: "",
    storage: puzzlesByStorage[0].storage,
})

const storageSelectItems = computed(() =>
    Object.values(getStorageInstances()).map((storage) => {
        return {
            title: storage.name,
            value: storage,
        }
    })
)

function openNewPuzzleModal(storage: PuzzleStorage) {
    newPuzzleFields.storage = storage
    newPuzzleModal.value?.open()
}

function newPuzzleSubmit(event?: Event) {
    event?.preventDefault()
    if(!newPuzzleForm.value?.checkValidity()) {
        newPuzzleForm.value?.reportValidity()
        return
    }

    const puzzleFile = new PuzzleFile(
        new Puzzle(
            "puzzle-0",
            new CubicGrid()
        ),
        newPuzzleFields.name
    )
    const storage = newPuzzleFields.storage
    storage.save(puzzleFile)
    router.push({
        name: "puzzle",
        params: {storageId: storage.id, puzzleId: puzzleFile.id}
    })
}

function deletePuzzle(storage: PuzzleStorage, puzzleId: string) {
    storage.delete(puzzleId)

    // Remove puzzle from puzzlesByStorage
    const entry = puzzlesByStorage.find(
        (item) => item.storage === storage
    )
    if(entry !== undefined) {
        entry.puzzles = entry.puzzles.filter(
            (puzzle) => puzzle.id !== puzzleId
        )
    }
}

function downloadPuzzle(storage: PuzzleStorage, meta: PuzzleMetadata) {
    const [raw, _error] = storage.getRawFormatted(meta.id)
    const blob = new Blob([raw], {type: "application/json;charset=utf-8"})
    const filename = (meta.name || meta.id) + ".json"
    saveAs(blob, filename)
}

const tableHeaders: VDataTable["headers"] = [
    {title: "Name", key: "name", align: "start"},
    //{title: "Created", key: "createdUTCString"},
    //{title: "Modified", key: "modifiedUTCString"},
    {title: "", key: "actions", sortable: false, align: "end"},
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
                        <strong>Note: This software is in pre-alpha development.</strong><br>
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
                            color="primary"
                            dark
                            style="flex: 0 0 auto;"
                            @click="openNewPuzzleModal(storage)"
                        >
                            New Puzzle
                        </VBtn>
                    </VToolbar>
                </template>

                <template v-slot:item.name="{item}">

                    <RouterLink :to="{name: 'puzzle', params: {storageId: storage.id, puzzleId: item.id}}">
                        {{ item.name === null ? "(unknown name)" : item.name }}
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
                    <RawDataButton :storage="storage" :id="item.id" />
                    <ConfirmButton
                        :text="`Delete Puzzle ${item.name}?`"
                        tooltip="Delete"
                        confirmText="Delete"
                        confirmButtonColor="red"
                        @confirm="deletePuzzle(storage, item.id)"
                    >
                        <VIcon icon="mdi-delete" aria-label="Delete" aria-hidden="false" />
                    </ConfirmButton>
                </template>

            </VDataTable>
        </VRow>
    </VMain>

    <Modal
            ref="newPuzzleModal"
            title="New Puzzle"
            okText="Create"
            dialogMaxWidth="500px"
            @ok="newPuzzleSubmit()"
    >
        <form ref="newPuzzleForm" :onSubmit="newPuzzleSubmit">
            <VTextField
                    label="Name"
                    required
                    v-model="newPuzzleFields.name"
                    autofocus
            />
            <VSelect
                    label="Storage Location"
                    required
                    v-model="newPuzzleFields.storage"
                    :items="storageSelectItems"
            />
            <input type="submit" style="display: none;" />
        </form>
    </Modal>
</template>