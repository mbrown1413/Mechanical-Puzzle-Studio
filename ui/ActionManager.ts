import {Ref, reactive} from "vue"
import {diff, patch as doPatch, unpatch as doUnpatch, Delta} from "jsondiffpatch"

import {PuzzleFile, serialize, deserialize} from "~lib"
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
    storageRef: Ref<PuzzleStorage>
    puzzleFileRef: Ref<PuzzleFile | null>

    performedActions: PerformedAction[]
    undoneActions: PerformedAction[]

    constructor(storageRef: Ref<PuzzleStorage>, puzzleFileRef: Ref<PuzzleFile | null>) {
        this.storageRef = storageRef
        this.puzzleFileRef = puzzleFileRef
        this.performedActions = reactive([])
        this.undoneActions = reactive([])
    }

    get storage() {
        return this.storageRef.value
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
        action.perform(this.puzzleFile.puzzle, this.puzzleFile)
        const after = serialize(this.puzzleFile)

        if(!this.storage.readOnly) {
            this.storage.save(this.puzzleFile, JSON.stringify(after))
        }

        const patch = diff(before, after)
        this.performedActions.push({action, patch})
        this.undoneActions.length = 0
    }

    private performPatch(patch: Delta, reverse: boolean) {
        const serialized = serialize(this.puzzleFile)
        if(reverse) {
            doUnpatch(serialized, patch)
        } else {
            doPatch(serialized, patch)
        }
        this.puzzleFile = deserialize(serialized)

        if(!this.storage.readOnly) {
            this.storage.save(this.puzzleFile, JSON.stringify(serialized))
        }
    }

    undo() {
        const performedAction = this.performedActions.pop()
        if(!performedAction) { return }
        this.performPatch(performedAction.patch, true)
        this.undoneActions.push(performedAction)
    }

    getUndoAction(): Action | null {
        if(!this.performedActions.length) { return null }
        return this.performedActions[this.performedActions.length-1].action
    }

    canUndo(): boolean {
        return this.getUndoAction() !== null
    }

    redo() {
        const undoneAction = this.undoneActions.pop()
        if(!undoneAction) { return }
        this.performPatch(undoneAction.patch, false)
        this.performedActions.push(undoneAction)
    }

    getRedoAction(): Action | null {
        if(!this.undoneActions.length) { return null }
        return this.undoneActions[this.undoneActions.length-1].action
    }

    canRedo(): boolean {
        return this.getRedoAction() !== null
    }
}