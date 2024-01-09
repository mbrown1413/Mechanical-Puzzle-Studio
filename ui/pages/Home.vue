<script setup lang="ts">
import {ref, Ref, reactive, computed} from "vue"
import {useRouter} from "vue-router"

import {PuzzleFile} from "~lib/PuzzleFile.ts"
import {Puzzle} from "~lib/Puzzle.ts"
import {CubicGrid} from "~lib/grids/CubicGrid.ts"

import {getStorageInstances, PuzzleStorage} from "~ui/storage.ts"
import Modal from "~ui/common/Modal.vue"
import ConfirmButton from "~ui/common/ConfirmButton.vue"
import TitleBar from "~ui/components/TitleBar.vue"

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

const tableHeaders: {
    title: string,
    key?: string,
    sortable?: boolean,
    align?: "start" | "center"
}[] = [
    {title: "Name", key: "name", align: "start"},
    //{title: "Created", key: "created"},
    //{title: "Modified", key: "modified"},
    {title: "Actions", key: "actions", sortable: false, align: "center"},
]
</script>

<template>
    <TitleBar />
    <VMain>
        <VRow justify="center">
            <VDataTable
                    v-for="{storage, puzzles} of puzzlesByStorage"
                    :headers="tableHeaders"
                    :items="puzzles"
                    no-data-text="No puzzles in this storage location"
                    class="mt-10 ml-10 mr-10"
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
                            @click="openNewPuzzleModal(storage)"
                        >
                            New Puzzle
                        </VBtn>
                    </VToolbar>
                </template>
                <template v-slot:item.name="{item}">
                    <RouterLink :to="{name: 'puzzle', params: {storageId: storage.id, puzzleId: item.id}}">
                        {{ item.name }}
                    </RouterLink>
                </template>
                <template v-slot:item.actions="{item}">
                    <ConfirmButton
                        :text="`Delete Puzzle ${item.name}?`"
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