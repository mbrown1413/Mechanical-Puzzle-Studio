<script setup lang="ts">
import {getStorageInstances, PuzzleStorage} from '../storage';
import {PuzzleFile} from "../PuzzleFile.ts"
import {Puzzle} from "../puzzle.ts"
import {RectGrid} from '../grids/rect';
import {useRouter} from 'vue-router';
import {reactive} from 'vue';

const router = useRouter()

function newPuzzle(storage: PuzzleStorage) {
    const puzzleFile = new PuzzleFile(
        new Puzzle(
            "puzzle-0",
            new RectGrid("grid-0", [3, 3, 3])
        ),
        "New Puzzle",
    )
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

const puzzlesByStorage = reactive(
    Object.values(getStorageInstances()).map((storage) => {
        return {
            storage,
            puzzles: storage.list(),
        }
    })
)
</script>

<template>
    <div>
        <div
            v-for="{storage, puzzles} of puzzlesByStorage"
        >
            {{ storage.name }}
            <ul>
                <li
                    v-for="puzzle in puzzles"
                >
                    <RouterLink :to="{name: 'puzzle', params: {storageId: storage.id, puzzleId: puzzle.id}}">
                        {{ puzzle.name }}
                    </RouterLink>
                    <button
                        @click="deletePuzzle(storage, puzzle.id)"
                        style="margin-left: 1em;"
                    >
                        delete
                    </button>
                </li>
                <li>
                    <button @click="newPuzzle(storage)">New</button>
                </li>
            </ul>
        </div>
    </div>
</template>