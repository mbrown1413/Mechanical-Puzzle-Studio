import {saveAs} from "file-saver"

import {PuzzleFile} from "~lib"
import {PuzzleStorage} from "~/ui/storage.ts"

export function downloadPuzzle(puzzleFile: PuzzleFile) {
    downloadString(
        puzzleFile.serialize(true),
        puzzleFile.name
    )
}

export function downloadFromStorage(storage: PuzzleStorage, puzzleName: string) {
    const [raw, error] = storage.getRawFormatted(puzzleName)
    if(error) {
        console.error(error)
    }
    downloadString(raw, puzzleName)
}

function downloadString(raw: string, puzzleName: string) {
    const blob = new Blob([raw], {type: "application/json;charset=utf-8"})
    const filename = puzzleName + ".json"
    saveAs(blob, filename)
}