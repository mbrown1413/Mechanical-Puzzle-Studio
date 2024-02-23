import {Ref, reactive} from "vue"
import {diff, unpatch, Delta} from "jsondiffpatch"

import {PuzzleFile, deserialize, serialize} from "~lib"
import {Action} from "~/ui/actions.ts"
import {PuzzleStorage} from "~/ui/storage.ts"

type PerformedAction = {
    action: Action,
    patch: Delta,
}

/**
 * Handles editing a puzzle file, including saving to the storage and undo/redo
 * functionality.
 */
export class ActionManager {
    storage: PuzzleStorage
    puzzleFileRef: Ref<PuzzleFile | null>

    performedActions: PerformedAction[]

    constructor(storage: PuzzleStorage, puzzleFileRef: Ref<PuzzleFile | null>) {
        this.storage = storage
        this.puzzleFileRef = puzzleFileRef
        this.performedActions = reactive([])
    }

    get puzzleFile() {
        if(!this.puzzleFileRef.value) {
            throw new Error("Cannot edit when puzzle file is not set")
        }
        return this.puzzleFileRef.value
    }

    set puzzleFile(value: PuzzleFile) {
        this.puzzleFileRef.value = value
    }

    performAction(action: Action) {
        const before = serialize(this.puzzleFile)

        action.perform(this.puzzleFile.puzzle)

        const after = serialize(this.puzzleFile)
        this.storage.save(this.puzzleFile)
        this.performedActions.push({
            action: action,
            patch: diff(before, after),
        })
    }

    undo() {
        const performedAction = this.performedActions.pop()
        if(!performedAction) { return }

        const serialized = serialize(this.puzzleFile)
        unpatch(serialized, performedAction.patch)
        this.puzzleFile = deserialize<PuzzleFile>(serialized, "PuzzleFile")
        this.storage.save(this.puzzleFile)
    }

    getUndoAction(): Action | null {
        if(!this.performedActions.length) { return null }
        return this.performedActions[this.performedActions.length-1].action
    }

    canUndo(): boolean {
        return this.getUndoAction() !== null
    }

    redo() {
    }

    getRedoAction(): Action | null {
        return null
    }

    canRedo(): boolean {
        return this.getRedoAction() !== null
    }
}