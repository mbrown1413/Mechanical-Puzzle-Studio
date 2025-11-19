import {saveAs} from "file-saver"

import {PuzzleFile} from "~lib"
import {PuzzleStorage} from "~/ui/storage.ts"

export function downloadPuzzle(puzzleFile: PuzzleFile) {
    downloadString(
        puzzleFile.serialize(true),
        puzzleFile.name + ".json",
        "application/json"
    )
}

export function downloadPuzzleFromStorage(storage: PuzzleStorage, puzzleName: string) {
    const [raw, error] = storage.getRawFormatted(puzzleName)
    if(error) {
        console.error(error)
    }
    downloadString(raw, puzzleName + ".json", "application/json")
}

export function downloadString(
    raw: string,
    filename: string,
    mimetype: string
) {
    const blob = new Blob([raw], {type: `${mimetype};charset=utf-8`})
    saveAs(blob, filename)
}