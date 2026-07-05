import {registerClass, SerializableClass} from "~lib"

/**
 * Stores a FileSystemHandle in indexedDB. By storing a handle here it can be
 * serialized and retrieved later with getHandle().
 */
export class StoredFileSystemHandle extends SerializableClass {
    static dbName = "StoredFileSystemHandles"
    static storeName = "handles"

    name: string
    storageKey: number

    constructor(name: string, storageKey: number) {
        super()
        this.name = name
        this.storageKey = storageKey
    }

    static async create(handle: FileSystemHandle): Promise<StoredFileSystemHandle> {
        const key = await StoredFileSystemHandle.storeHandle(handle)
        return new StoredFileSystemHandle(handle.name, key)
    }

    private static getStore(writable: boolean): Promise<IDBObjectStore> {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(StoredFileSystemHandle.dbName, 1)

            request.onupgradeneeded = () => {
                const db = request.result
                db.createObjectStore(
                    StoredFileSystemHandle.storeName,
                    {autoIncrement: true}
                )
            }

            request.onsuccess = () => {
                const db = request.result
                const transaction = db.transaction(
                    StoredFileSystemHandle.storeName,
                    writable ? "readwrite" : "readonly"
                )
                resolve(transaction.objectStore(StoredFileSystemHandle.storeName))
            }

            request.onerror = () => reject(request.error)
        })
    }

    static async storeHandle(handle: FileSystemHandle): Promise<number> {
        const store = await StoredFileSystemHandle.getStore(true)
        const request = store.put(handle)

        await new Promise<void>((resolve, reject) => {
            request.onsuccess = () => resolve()
            request.onerror = () => reject(request.error)
        })
        return request.result as number
    }

    async getHandle(): Promise<FileSystemHandle> {
        const store = await StoredFileSystemHandle.getStore(false)
        const request = store.get(this.storageKey)

        await new Promise<void>((resolve, reject) => {
            request.onsuccess = () => resolve()
            request.onerror = () => reject(request.error)
        })

        return request.result
    }

}
registerClass(StoredFileSystemHandle)