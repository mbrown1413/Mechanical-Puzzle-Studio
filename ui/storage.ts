
import {PuzzleFile, PuzzleMetadata} from "~lib"

export class PuzzleNotFoundError extends Error {
    constructor(id: string) {
        super(`Puzzle id not found: "${id}"`)
    }
}

export function getStorageInstances(): {[id: string]: PuzzleStorage} {
    const storages = [
        new LocalPuzzleStorage()
    ]
    return Object.fromEntries(storages.map(
        (storage: PuzzleStorage) => [storage.id, storage]
    ))
}

export abstract class PuzzleStorage {
    /** Unique identifier used for this storage. */
    abstract get id(): string

    /** Name to display to the user for this storage. */
    abstract get name(): string

    /** List puzzles in this storage.
     * 
     * Failure to retrieve or deserialize any individual puzzle should never
     * cause this to throw an error. `PuzzleMetadata.error` should be set for
     * any puzzle which cannot be cleanly read, and whatever data can be read
     * should be used to fill out the rest of the return fields.
     */
    abstract list(): PuzzleMetadata[]

    /**
     * Retrieve puzzle from storage.
     * 
     * @throws PuzzleNotFoundError - When a puzzle with the given ID does not
     * exist in the storage.
     * @param ignoreErorrs - Ignore any errors that can be ignored. This should
     * only be used after trying without it, then catching and displaying the
     * error to the user.
     */
    abstract get(id: string, ignoreErrors: boolean): PuzzleFile

    /** Save a puzzle, using `PuzzleFile.id` as a key which can be used to
     * retrieve it later. */
    abstract save(puzzleFile: PuzzleFile): void

    abstract delete(id: string): void
}

export class LocalPuzzleStorage extends PuzzleStorage {

    get id() {
        return "local"
    }

    get name() {
        return "Local Storage"
    }

    list(): PuzzleMetadata[] {
        const ret = []
        for(let i=0; i<localStorage.length; i++) {
            const key = localStorage.key(i)
            if(!key?.startsWith("puzzle:")) {
                continue
            }
            const id = key.slice("puzzle:".length)
            const item = localStorage.getItem(key)
            if(item !== null) {
                ret.push(
                    PuzzleFile.getMetadataSafe(item, id)
                )
            }
        }
        return ret
    }

    get(id: string, ignoreErrors: boolean): PuzzleFile {
        const item = localStorage.getItem(this._getKey(id))
        if(item === null) {
            throw new PuzzleNotFoundError(id)
        }
        if(ignoreErrors) {
            return PuzzleFile.deserializeIgnoreErrors(item)
        } else {
            return PuzzleFile.deserialize(item)
        }
    }

    save(puzzleFile: PuzzleFile) {
        localStorage.setItem(
            this._getKey(puzzleFile),
            puzzleFile.serialize()
        )
    }

    delete(id: string) {
        localStorage.removeItem(
            this._getKey(id)
        )
    }

    _getKey(puzzleFile: PuzzleFile): string
    _getKey(puzzleFileId: string): string
    _getKey(puzzleFileOrId: PuzzleFile | string): string {
        if(typeof puzzleFileOrId === "string") {
            return "puzzle:" + puzzleFileOrId
        } else {
            return "puzzle:" + puzzleFileOrId.id
        }
    }

}