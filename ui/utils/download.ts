import {saveAs} from "file-saver"

import {PuzzleFile} from "~lib"
import {Storage} from "~/ui/storage.ts"

export function downloadPuzzle(puzzleName: string, puzzleFile: PuzzleFile) {
    downloadString(
        puzzleFile.serialize(true),
        puzzleName + ".json",
        "application/json"
    )
}

export async function downloadPuzzleFromStorage(storage: Storage, puzzleName: string): Promise<void> {
    const [raw, error] = await storage.getRawFormatted(puzzleName)
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