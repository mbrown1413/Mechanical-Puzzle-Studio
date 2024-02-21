import {gzipSync, gunzipSync, strToU8, strFromU8} from "fflate"

import {PuzzleFile, PuzzleMetadata} from "~lib"

export class PuzzleNotFoundError extends Error {
    constructor(puzzleName: string) {
        super(`Puzzle not found: "${puzzleName}"`)
    }
}

let _storageInstances: {[id: string]: PuzzleStorage} | undefined = undefined
export function getStorageInstances(): {[id: string]: PuzzleStorage} {
    if(!_storageInstances) {
        const storages = [
            new LocalPuzzleStorage()
        ]
        _storageInstances = Object.fromEntries(storages.map(
            (storage: PuzzleStorage) => [storage.id, storage]
        ))
    }
    return _storageInstances
}

function compress(strIn: string): string {
    const bufIn = strToU8(strIn)
    const bufOut = gzipSync(bufIn)
    const strOut = strFromU8(bufOut, true)
    return strOut
}

function decompress(compressed: string): string {
    const bufIn = strToU8(compressed, true)
    const bufOut = gunzipSync(bufIn)
    const strOut = strFromU8(bufOut)
    return strOut
}

const compressBytesThreshold = 1024*1024
const compressedPrefix = "compressed:"

/** Compress if larger than a `compressBytesThreshold`. Compressed strings are
 * prefixed with `compressedPrefix`. */
function compressIfNeeded(strIn: string): string {
    const isLarge = strIn.length > compressBytesThreshold
    if(isLarge) {
        return compressedPrefix + compress(strIn)
    } else {
        return strIn
    }
}

/* Decompress string if it's prefixed with `compressedPrefix`, otherwise return
 * the input string. */
function decompressIfNeeded(strIn: string): string {
    if(strIn.startsWith(compressedPrefix)) {
        return decompress(
            strIn.slice(compressedPrefix.length)
        )
    } else {
        return strIn
    }
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
     * @throws PuzzleNotFoundError - When a puzzle with the given name does not
     * exist in the storage.
     */
    abstract getRaw(puzzleName: string): string

    /**
     * Get unserialized PuzzleFile instance from storage.
     *
     * @param ignoreErorrs - Ignore any deserialization errors that can be
     * ignored. This should only be used after trying without it, then catching
     * and displaying the error to the user.
     */
    get(puzzleName: string, ignoreErrors=false): PuzzleFile {
        const str = this.getRaw(puzzleName)
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
    getRawFormatted(puzzleName: string): [formatted: string, error: string | null] {
        const raw = this.getRaw(puzzleName)

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

    /** Save a puzzle, using `PuzzleFile.name` as a key which can be used to
     * retrieve it later. */
    abstract save(puzzleFile: PuzzleFile): void

    abstract delete(puzzleName: string): void
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
            const puzzleName = key.slice("puzzle:".length)
            const item = localStorage.getItem(key)
            if(item !== null) {
                const decompressed = decompressIfNeeded(item)
                ret.push(
                    PuzzleFile.getMetadataSafe(decompressed, puzzleName)
                )
            }
        }
        return ret
    }

    getRaw(puzzleName: string): string {
        const str = localStorage.getItem(this._getKey(puzzleName))
        if(str === null) {
            throw new PuzzleNotFoundError(puzzleName)
        }
        return decompressIfNeeded(str)
    }

    save(puzzleFile: PuzzleFile) {
        localStorage.setItem(
            this._getKey(puzzleFile),
            compressIfNeeded(puzzleFile.serialize())
        )
    }

    delete(puzzleName: string) {
        localStorage.removeItem(
            this._getKey(puzzleName)
        )
    }

    _getKey(puzzleFile: PuzzleFile): string
    _getKey(puzzleFileName: string): string
    _getKey(puzzleFileOrName: PuzzleFile | string): string {
        if(typeof puzzleFileOrName === "string") {
            return "puzzle:" + puzzleFileOrName
        } else {
            return "puzzle:" + puzzleFileOrName.name
        }
    }

}