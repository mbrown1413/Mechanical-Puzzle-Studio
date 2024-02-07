
import {PuzzleFile, PuzzleMetadata} from "~lib"

export function getStorageInstances(): {[id: string]: PuzzleStorage} {
    const storages = [
        new LocalPuzzleStorage()
    ]
    return Object.fromEntries(storages.map(
        (storage: PuzzleStorage) => [storage.id, storage]
    ))
}

export abstract class PuzzleStorage {
    abstract get id(): string
    abstract get name(): string
    abstract list(): PuzzleMetadata[]
    abstract get(id: string): PuzzleFile
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
    
    get(id: string): PuzzleFile {
        const item = localStorage.getItem(this._getKey(id))
        if(item === null) {
            throw new Error(`Puzzle id not found in local storage: "${id}"`)
        }
        return PuzzleFile.deserialize(item)
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