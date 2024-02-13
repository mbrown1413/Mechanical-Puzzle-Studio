
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
     * Retrieve serialized string form of the puzzle from storage.
     *
     * @throws PuzzleNotFoundError - When a puzzle with the given ID does not
     * exist in the storage.
     */
    abstract getRaw(id: string): string

    /**
     * Get unserialized PuzzleFile instance from storage.
     *
     * @param ignoreErorrs - Ignore any deserialization errors that can be
     * ignored. This should only be used after trying without it, then catching
     * and displaying the error to the user.
     */
    get(id: string, ignoreErrors=false): PuzzleFile {
        const str = this.getRaw(id)
        if(ignoreErrors) {
            return PuzzleFile.deserializeIgnoreErrors(str)
        } else {
            return PuzzleFile.deserialize(str)
        }
    }

    /**
     * Get a pretty-formatted string representation of the puzzle. On any
     * formatting issue, the returned `error` is a string containing the error
     * and `formatted` will be the raw unformatted string.
     */
    getRawFormatted(id: string): [formatted: string, error: string | null] {
        const raw = this.getRaw(id)

        // Try returning pretty formatted, but fail gracefully
        let formatted = null
        try {
            const deserialized = JSON.parse(raw)
            formatted = JSON.stringify(deserialized, null, 4)
            return [formatted, null]
        } catch(e) {
            return [raw, String(e)]
        }
    }

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

    getRaw(id: string): string {
        const str = localStorage.getItem(this._getKey(id))
        if(str === null) {
            throw new PuzzleNotFoundError(id)
        }
        return str
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