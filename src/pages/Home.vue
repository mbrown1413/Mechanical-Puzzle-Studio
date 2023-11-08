<script setup lang="ts">
import {ref, Ref, reactive} from "vue"
import {useRouter} from "vue-router"

import {getStorageInstances, PuzzleStorage} from "../storage"
import {PuzzleFile} from "../PuzzleFile.ts"
import {Puzzle} from "../puzzle.ts"
import {RectGrid} from "../grids/rect"
import Modal from "../components/Modal.vue"

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

function openNewPuzzleModal(storage: PuzzleStorage) {
    newPuzzleFields.storage = storage
    newPuzzleModal.value?.open()
}

function newPuzzleSubmit() {
    if(!newPuzzleForm.value?.checkValidity()) {
        newPuzzleForm.value?.reportValidity()
        return
    }

    const puzzleFile = new PuzzleFile(
        new Puzzle(
            "puzzle-0",
            new RectGrid("grid-0", [3, 3, 3])
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
</script>

<template>
    <div class="container-md">
        <h1>Riddlewood Studio</h1>

        <div
            v-for="{storage, puzzles} of puzzlesByStorage"
        >
            <h2 class="float-start">{{ storage.name }}</h2>
            <button
                class="btn btn-primary float-end"
                type="button"
                @click="openNewPuzzleModal(storage)"
            >New</button>
            <table class="table table-striped table-hover">
                <thead>
                    <tr>
                        <th scope="col">Name</th>
                        <th scope="col">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    <tr
                        v-for="puzzle in puzzles"
                    >
                        <td>
                            <RouterLink :to="{name: 'puzzle', params: {storageId: storage.id, puzzleId: puzzle.id}}">
                                {{ puzzle.name }}
                            </RouterLink>
                        </td>
                        <td>
                            <button
                                type="button"
                                class="btn btn-danger"
                                @click="deletePuzzle(storage, puzzle.id)"
                            >
                                Delete
                            </button>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>

    <Modal
        ref="newPuzzleModal"
        title="New Puzzle"
        okText="Create"
        @ok="newPuzzleSubmit"
    >
        <form ref="newPuzzleForm">

            <div class="mb-3">
                <label for="newPuzzle-name" class="form-label">
                    Name
                </label>
                <input
                    type="text"
                    class="form-control"
                    id="newPuzzle-name"
                    required
                    v-model="newPuzzleFields.name"
                />
            </div>

            <div class="mb-3">
                <label for="newPuzzle-storage" class="form-label">
                    Storage Backend
                </label>
                <select
                    id="newPuzzle-storage"
                    class="form-select"
                    v-model="newPuzzleFields.storage"
                >
                    <option v-for="{storage} of puzzlesByStorage" :value="storage">
                        {{ storage.name }}
                    </option>
                </select>
            </div>
            
        </form>
    </Modal>

</template>