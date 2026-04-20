import {gzipSync, gunzipSync, strToU8, strFromU8} from "fflate"

import {PuzzleFile, PuzzleMetadata} from "~lib"

export type StorageId = string

export type PuzzleListing = Record<string, PuzzleMetadata>

export class StorageError extends Error {
    toString() {
        return this.message
    }
}

export class PuzzleNotFoundError extends StorageError {
    constructor(puzzleName: string) {
        super(`Puzzle not found: "${puzzleName}"`)
    }
}

function stripIfStartsWith(input: string, toStrip: string) {
    return input.startsWith(toStrip) ?
        input.slice(toStrip.length).trimStart()
        : input
}

let _storageInstances: {[id: StorageId]: Storage} | undefined = undefined
export function getStorageInstances(): {[id: StorageId]: Storage} {
    if(!_storageInstances) {

        const storages: Storage[] = []

        storages.push(new LocalStorage())

        const apiBaseUrl = getApiStorageBaseUrl()
        if(apiBaseUrl) {
            storages.push(new BackendStorage(apiBaseUrl))
        }

        storages.push(new SampleStorage())

        _storageInstances = Object.fromEntries(storages.map(
            (storage: Storage) => [storage.id, storage]
        ))
    }
    return _storageInstances
}

function getApiStorageBaseUrl(): string | null {
    const baseUrl = import.meta.env.PZS_BACKEND_URL?.trim()
    if(!baseUrl) {
        return null
    }
    return baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl
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

let metadataCache: {[storageId: string]: Promise<PuzzleListing>} = {}

export function clearStorageCache() {
    metadataCache = {}
    _storageInstances = undefined
}

export abstract class Storage {
    /** Unique identifier used for this storage. */
    abstract get id(): StorageId

    /** Name to display to the user for this storage. */
    abstract get name(): string

    get readOnly(): boolean { return false }

    get notFoundErrorMessage(): string {
        return "The puzzle you're looking for may have been deleted or renamed in the selected storage."
    }

    /**
     * List puzzles in this storage.
     *
     * The results are cached, which is important if anything makes this method
     * slow, such as a large puzzle file or slow network speeds.
     *
     * Failure to retrieve or deserialize any individual puzzle should never
     * cause this to throw an error. `PuzzleMetadata.error` should be set for
     * any puzzle which cannot be cleanly read, and whatever data can be read
     * should be used to fill out the rest of the return fields.
     *
     * @throws StorageError
     */
    async list(): Promise<PuzzleListing> {
        if(metadataCache[this.id] === undefined) {
            metadataCache[this.id] = this.listWithoutCaching()
        }
        return await metadataCache[this.id]
    }

    /**
     * Raw version of `list()` which does not handle caching results.
     *
     * @throws StorageError
     */
    abstract listWithoutCaching(): Promise<PuzzleListing>

    /**
     * Retrieve serialized string form of the puzzle from storage.
     *
     * @throws PuzzleNotFoundError - When a puzzle with the given name does not
     * exist in the storage.
     *
     * @throws StorageError
     */
    abstract getRaw(puzzleName: string): Promise<string>

    /**
     * Get unserialized PuzzleFile instance from storage.
     *
     * @param ignoreErorrs - Ignore any deserialization errors that can be
     * ignored. This should only be used after trying without it, then catching
     * and displaying the error to the user.
     *
     * @throws StorageError
     */
    async get(puzzleName: string, ignoreErrors=false): Promise<PuzzleFile> {
        const str = await this.getRaw(puzzleName)
        if(ignoreErrors) {
            return PuzzleFile.deserializeIgnoreErrors(str)
        } else {
            return PuzzleFile.deserialize(JSON.parse(str))
        }
    }

    /**
     * Get a pretty-formatted string representation of the puzzle. On any
     * formatting issue, the returned `error` is a string containing the error
     * and `formatted` will be the raw unformatted string.
     *
     * @throws StorageError
     */
    async getRawFormatted(puzzleName: string): Promise<[formatted: string, error: string | null]> {
        const raw = await this.getRaw(puzzleName)

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

    /**
     * Save a puzzle, using `PuzzleFile.name` as a key which can be used to
     * retrieve it later.
     *
     * If `serialized` is given, it is assumed to be the same as `puzzleFile`
     * but already serialized.
     *
     * @throws StorageError
     */
    abstract save(puzzleName: string, puzzleFile: PuzzleFile, serialized?: string): Promise<void>

    /**
     * @throws StorageError
     */
    abstract delete(puzzleName: string): Promise<void>
}

export class LocalStorage extends Storage {

    get id() {
        return "local"
    }

    get name() {
        return "Browser Storage"
    }

    get notFoundErrorMessage() {
        return "The puzzle you're looking for may have been created in another browser, or your browser data may have been cleared."
    }

    async listWithoutCaching(): Promise<PuzzleListing> {
        const listing: PuzzleListing = {}
        for(let i=0; i<localStorage.length; i++) {
            const key = localStorage.key(i)
            if(!key?.startsWith("puzzle:")) {
                continue
            }
            const puzzleName = key.slice("puzzle:".length)
            const item = localStorage.getItem(key)
            if(item !== null) {
                const decompressed = decompressIfNeeded(item)
                listing[puzzleName] = PuzzleFile.getMetadataSafe(decompressed)
            }
        }
        return listing
    }

    async getRaw(puzzleName: string): Promise<string> {
        const str = localStorage.getItem(this.getKey(puzzleName))
        if(str === null) {
            throw new PuzzleNotFoundError(puzzleName)
        }
        return decompressIfNeeded(str)
    }

    async save(puzzleName: string, puzzleFile: PuzzleFile, serialized?: string): Promise<void> {
        if(!serialized) {
            serialized = puzzleFile.serialize()
        }
        localStorage.setItem(
            this.getKey(puzzleName),
            compressIfNeeded(serialized)
        )
    }

    async delete(puzzleName: string): Promise<void> {
        localStorage.removeItem(
            this.getKey(puzzleName)
        )
    }

    private getKey(puzzleName: string): string {
        return "puzzle:" + puzzleName
    }

}

export class BackendStorage extends Storage {
    private baseUrl: string

    constructor(baseUrl: string) {
        super()
        this.baseUrl = baseUrl
    }

    get id() {
        return "api"
    }

    get name() {
        return "Backend Storage"
    }

    async listWithoutCaching(): Promise<PuzzleListing> {
        const response = await this.request("")
        if(!response.ok) {
            throw new StorageError(await this.getErrorMessage(response))
        }
        const result = await response.json()
        if(typeof result?.puzzles !== "object" || result.puzzles === null) {
            throw new StorageError("Invalid API response")
        }
        return result.puzzles
    }

    async getRaw(puzzleName: string): Promise<string> {
        const response = await this.request(`/${encodeURIComponent(puzzleName)}`)
        if(response.status === 404) {
            throw new PuzzleNotFoundError(puzzleName)
        }
        if(!response.ok) {
            throw new StorageError(await this.getErrorMessage(response))
        }
        return await response.text()
    }

    async save(puzzleName: string, puzzleFile: PuzzleFile, serialized?: string): Promise<void> {
        if(!serialized) {
            serialized = puzzleFile.serialize()
        }
        this.errorOnInvalidPuzzleName(puzzleName)
        const response = await this.request(
            `/${encodeURIComponent(puzzleName)}`,
            {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                },
                body: serialized,
            }
        )
        if(!response.ok) {
            throw new StorageError(await this.getErrorMessage(response))
        }
    }

    async delete(puzzleName: string): Promise<void> {
        const response = await this.request(`/${encodeURIComponent(puzzleName)}`, {
            method: "DELETE",
        })
        if(response.status === 404) {
            return
        }
        if(!response.ok) {
            throw new StorageError(await this.getErrorMessage(response))
        }
    }

    private async request(path: string, options?: RequestInit): Promise<Response> {
        try {
            return await fetch(`${this.baseUrl}/puzzles${path}`, options)
        } catch(e) {
            throw new StorageError(stripIfStartsWith(String(e), "TypeError: "))
        }
    }

    private async getErrorMessage(response: Response): Promise<string> {
        const text = await response.text()
        if(!text) {
            return `Storage API request failed: ${response.status} ${response.statusText}`
        }
        try {
            const json = JSON.parse(text)
            if(typeof json.error === "string") {
                return json.error
            }
        } catch {
            // Ignore parse failures and return raw response text.
        }
        return text
    }

    private errorOnInvalidPuzzleName(puzzleName: string) {
        // Special case: The resulting URL would go the wrong location because
        // it's relative. We'll completely avoid this by disallowing this name.
        if(puzzleName === "..") {
            throw new StorageError("Invalid puzzle name")
        }
    }
}

/** Read-only storage of all puzzles in examples folder. */
class SampleStorage extends Storage {
    puzzleStrings: {[puzzleName: string]: string}

    constructor() {
        super()
        const modules = import.meta.glob(
            "../examples/*.json",
            {eager: true, import: "default"}
        )
        this.puzzleStrings = Object.fromEntries(
            Object.entries(modules).map(([filePath, puzzleObject]) => {
                const serializedString = JSON.stringify(puzzleObject)
                const puzzleName = SampleStorage.puzzleNameFromPath(filePath)
                return [puzzleName, serializedString]
            })
        )
    }

    private static puzzleNameFromPath(filePath: string): string {
        // Get filename
        const pathParts = filePath.split("/")
        const filename = pathParts[pathParts.length-1]
        // Remove extension
        const filenameParts = filename.split(".")
        return filenameParts.slice(0, -1).join(".")
    }

    get id() {
        return "sample"
    }

    get name() {
        return "Sample Puzzles"
    }

    get readOnly() { return true }

    async listWithoutCaching(): Promise<PuzzleListing> {
        const listing: PuzzleListing = {}
        for (const [name, serialized] of Object.entries(this.puzzleStrings)) {
            listing[name] = PuzzleFile.deserialize(JSON.parse(serialized)).getMetadata()
        }
        return listing
    }

    async getRaw(puzzleName: string): Promise<string> {
        const raw = this.puzzleStrings[puzzleName]
        if(!raw) {
            throw new PuzzleNotFoundError(puzzleName)
        }
        return raw
    }

    async save(): Promise<void> { }

    async delete(_puzzleName: string): Promise<void> { }
}