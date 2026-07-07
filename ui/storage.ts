import {gzipSync, gunzipSync, strToU8, strFromU8} from "fflate"

import {FormClassInfo, Form, Field, FormContext, FormEditable, listSubclasses, PuzzleFile, PuzzleMetadata, registerClass, SerializableClass} from "~lib"

import {slugify} from "~/ui/utils/string.ts"
import {StoredFileSystemHandle} from "~/ui/utils/StoredFileSystemHandle.ts"

export type StorageId = [string, null] | [string, string]

export type PuzzleListing = Record<string, PuzzleMetadata>

export class StorageError extends Error {
    retryText?: string

    constructor(message: string, retryText?: string) {
        super(message)
        this.retryText = retryText
    }

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
}

function makeStorageListField(property: string, selectedStorage?: Storage): Field {
    const classInfos: FormClassInfo<Storage>[] = []
    for(const cls of listSubclasses(Storage)) {
        const storageCls = cls as unknown as typeof Storage
        classInfos.push({
            name: storageCls.storageTypeName,
            description: storageCls.storageTypeDescription,
            newInstance: () => { return new cls() },
            enabled: (storages) => {
                if(
                    storageCls.isSingleton &&
                    storages.some((s) => (s instanceof storageCls))
                ) {
                    return {
                        bool: false,
                        reason: "Only one storage may exist of this type"
                    }
                }
                return {bool: true}
            }
        })
    }
    return {
        type: "classList",
        property,
        getLabel: (storage: Storage) => storage.name,
        getSubtitle: (storage: Storage) => {
            const cls = storage.constructor as unknown as typeof Storage
            if(cls.isSingleton) {
                return `${cls.storageTypeDescription}`
            } else {
                return `${cls.storageTypeName}: ${cls.storageTypeDescription}`
            }
        },
        newInstance: classInfos,
        initialSelectionIndex(storages: Storage[]) {
            if(!selectedStorage) { return 0 }
            const selectedStorageId = storageIdToString(selectedStorage.id)
            return storages.findIndex((s) => storageIdToString(s.id) === selectedStorageId)
        }
    }
}

export function makeStorageListForm(property: string, selectedStorage?: Storage): Form {
    return {
        fields: [
            makeStorageListField(property, selectedStorage)
        ],
        validate: (item) => {
            const storages = (item as Record<string, Storage[]>)[property]
            return validateUniqueStorageIds(storages)
        }
    }
}

export function validateUniqueStorageIds(storages: Storage[]): string[] {
    const errors = new Set<string>()
    const seenIds = new Set()
    for(const storage of storages) {
        const id = storageIdToString(storage.id)
        if(seenIds.has(id)) {
            errors.add(`Duplicate storage ID ${id}. Please change storage's name to be unique.`)
        }
        seenIds.add(id)
    }
    return [...errors]
}

function storageIdToString(id: StorageId): string {
    return id.join("/")
}

export abstract class Storage extends SerializableClass implements FormEditable {
    static storageTypeName = "Unnamed Storage Type"
    static storageTypeDescription = ""
    static isSingleton = false

    /** Unique identifier for this storage instance.
     *
     * The `StorageId` type is a list of two parts to the identifier. Singleton
     * storages may just provide a single ID (and leave the second part as
     * null), while other storages may specify a ID for the type of storages,
     * and an ID for this specific instance. Either way, the value returned
     * must be unique for each instance.
     */
    abstract get id(): StorageId

    /** Name to display to the user for this storage. */
    abstract get name(): string

    getForm(_context: FormContext): Form {
        return {
            fields: []
        }
    }

    needsConfiguration(): "no-config" | "needs-config" | "valid-config" {
        return "no-config"
    }

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
    async list(clearCache=false): Promise<PuzzleListing> {
        const stringId = storageIdToString(this.id)
        if(clearCache) {
            delete metadataCache[stringId]
        }

        if(metadataCache[stringId] === undefined) {
            metadataCache[stringId] = this.listWithoutCaching()
        }
        return await metadataCache[stringId]
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

export class BrowserStorage extends Storage {
    static storageTypeName = "Browser Storage"
    static storageTypeDescription = "Stores puzzles in the browser's localStorage."
    static isSingleton = true

    get id() {
        return ["browser", null] as StorageId
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
registerClass(BrowserStorage)

export class BackendStorage extends Storage {
    static storageTypeName = "Backend Storage"
    static storageTypeDescription = "Stores puzzles on a server running the Puzzle Studio backend server."

    name: string
    baseUrl: string | undefined

    constructor(baseUrl?: string) {
        super()
        this.name = "Backend Storage"
        this.baseUrl = baseUrl
    }

    get id() {
        return ["backend", slugify(this.name)] as StorageId
    }

    getForm(): Form {
        return {
            fields: [
                {property: "name", type: "string", label: "Name"},
                {
                    property: "baseUrl",
                    type: "string",
                    label: "URL",
                    description: 'Typically "http://localhost:8787/api" if running a backend locally',
                },
            ]
        }
    }

    get normalizedBaseUrl(): string | null {
        if(typeof this.baseUrl !== "string") {
            return null
        }

        let normalized = this.baseUrl.trim()
        normalized = normalized.endsWith("/") ? normalized.slice(0, -1) : normalized
        if(normalized.length === 0) {
            return null
        }

        let url
        try {
            url = new URL(normalized)
        } catch {
            return null
        }
        if(!["http:", "https:"].includes(url.protocol)) {
            return null
        }

        return normalized
    }

    needsConfiguration() {
        return this.normalizedBaseUrl ? "valid-config" : "needs-config"
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
        if(!this.normalizedBaseUrl) {
            throw new StorageError("Needs configuration: invalid backend URL")
        }

        try {
            return await fetch(`${this.normalizedBaseUrl}/puzzles${path}`, options)
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
registerClass(BackendStorage)

/** Read-only storage of all puzzles in examples folder. */
export class SampleStorage extends Storage {
    static storageTypeName = "Sample Storage"
    static storageTypeDescription = "A set of example built-in puzzles."
    static isSingleton = true

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
        return ["sample", null] as StorageId
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
registerClass(SampleStorage)

export class FolderStorage extends Storage {
    static storageTypeName = "Folder Storage"
    static storageTypeDescription = "Stores puzzles in a local folder."

    storedFolderHandle?: StoredFileSystemHandle

    get name() {
        if(!this.storedFolderHandle) {
            return "Folder: (unconfigured)"
        }
        return `Folder: ${this.storedFolderHandle.name}`
    }

    get id() {
        let key
        if(this.storedFolderHandle) {
            key = this.storedFolderHandle.storageKey.toString()
        } else {
            key = null
        }
        return ["folder", key] as StorageId
    }

    getForm(_context: FormContext): Form {
        return {
            fields: [
                {property: "storedFolderHandle", type: "fileSystemFolder", label: "Folder"},
            ],
        }
    }

    needsConfiguration() {
        return this.storedFolderHandle ? "valid-config" : "needs-config"
    }

    static testSupport(): boolean {
         return typeof window !== 'undefined' && 'showDirectoryPicker' in window
    }

    private async getFolderHandle(): Promise<FileSystemDirectoryHandle> {
        if (!FolderStorage.testSupport()) {
            throw new StorageError("Folder Storage is not supported in this browser.")
        }
        if(!this.storedFolderHandle) {
            throw new StorageError("Folder selection needed.")
        }
        const handle = await this.storedFolderHandle.getHandle() as FileSystemDirectoryHandle

        const permissions: FileSystemHandlePermissionDescriptor = {mode: "readwrite"}
        if ((await handle.queryPermission(permissions)) === "granted") {
            return handle
        }
        try {
            if ((await handle.requestPermission(permissions)) === "granted") {
                return handle
            }
        } catch (e: unknown) {
            console.error("Permission required for storage", e)
            if (e instanceof Error && e.name === "SecurityError") {
                // requestPermission requires a transient user interaction,
                // otherwise it throws a SecurityError. Prompt the user to click
                // the retry button which will be the user interaction we need.
                throw new StorageError("Permission required", "Request Permission")
            }
            throw e
        }
        throw new StorageError("Permission to access the local folder was denied.", "Request Permission")
    }

    async listWithoutCaching(): Promise<PuzzleListing> {
        const handle = await this.getFolderHandle()
        const listing: PuzzleListing = {}
        try {
            for await (const entry of handle.values()) {
                if (entry.kind === "file" && entry.name.endsWith(".json")) {
                    const file = await entry.getFile()
                    const text = await file.text()
                    const puzzleName = entry.name.slice(0, -".json".length)
                    listing[puzzleName] = PuzzleFile.getMetadataSafe(text)
                }
            }
        } catch (e) {
            const message = "Failed to list folder contents"
            console.error(message, e)
            throw new StorageError(message)
        }
        return listing
    }

    async getRaw(puzzleName: string): Promise<string> {
        const handle = await this.getFolderHandle()
        try {
            const fileHandle = await handle.getFileHandle(`${puzzleName}.json`)
            const file = await fileHandle.getFile()
            return await file.text()
        } catch (e: unknown) {
            if (e instanceof Error && e.name === "NotFoundError") {
                throw new PuzzleNotFoundError(puzzleName)
            }
            console.error("Failed to read puzzle file", e)
            throw new StorageError(`Failed to read puzzle "${puzzleName}": ${String(e)}`)
        }
    }

    async save(puzzleName: string, puzzleFile: PuzzleFile, serialized?: string): Promise<void> {
        if (!serialized) {
            serialized = puzzleFile.serialize()
        }
        const handle = await this.getFolderHandle()
        try {
            const fileHandle = await handle.getFileHandle(`${puzzleName}.json`, { create: true })
            const writable = await fileHandle.createWritable()
            await writable.write(serialized)
            await writable.close()
        } catch (e) {
            throw new StorageError(`Failed to save puzzle "${puzzleName}": ${String(e)}`)
        }
    }

    async delete(puzzleName: string): Promise<void> {
        const handle = await this.getFolderHandle()
        try {
            await handle.removeEntry(`${puzzleName}.json`)
        } catch (e: unknown) {
            if (e instanceof Error && e.name === "NotFoundError") {
                return
            }
            console.error("Failed to delete puzzle", e)
            throw new StorageError(`Failed to delete puzzle "${puzzleName}": ${String(e)}`)
        }
    }
}
registerClass(FolderStorage)