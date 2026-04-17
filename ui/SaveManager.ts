import {ref, Ref, reactive, watch} from "vue"
import {diff, patch as doPatch, unpatch as doUnpatch, Delta} from "jsondiffpatch"

import {PuzzleFile, serialize, deserialize} from "~lib"
import {defineHooks, EventHook} from "~/ui/hooks.ts"
import {Action} from "~/ui/actions.ts"
import {Storage} from "~/ui/storage.ts"

type PerformedAction = {
    action: Action,
    patch: Delta,
}

export const actionHooks = defineHooks("action", {

    /**
     * Emitted after an action is performed in the UI.
     *
     * Edits to the puzzle file during this hook will be included in the same
     * undo state as the action that triggered the hook.
     */
    performed: new EventHook<[action: Action, saveManager: SaveManager]>(),

})

/**
 * Handles editing a puzzle file, including saving to the storage and undo/redo
 * functionality.
 */
export class SaveManager {
    storageRef: Ref<Storage | null>
    puzzleFileRef: Ref<PuzzleFile | null>

    performedActions: PerformedAction[]
    undoneActions: PerformedAction[]

    saveState: Ref<"saved" | "pending" | "saving" | "error" | "readOnly">

    private saveDebouncer: SaveDebouncer

    constructor(storageRef: Ref<Storage | null>, puzzleFileRef: Ref<PuzzleFile | null>) {
        this.storageRef = storageRef
        this.puzzleFileRef = puzzleFileRef
        this.performedActions = reactive([])
        this.undoneActions = reactive([])
        this.saveState = ref(
            this.storage === null || this.storage.readOnly ? "readOnly" : "saved"
        )
        this.saveDebouncer = new SaveDebouncer(() => this.saveNow(), 2000, 10000)

        watch(storageRef, () => {
            if(this.storage === null) {
                this.saveState.value = "readOnly"
            } else {
                this.saveState.value = this.storage.readOnly ? "readOnly" : "saved"
            }
        })
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

        void this.requestSave()

        const patch = diff(before, after)
        this.performedActions.push({action, patch})
        this.undoneActions.length = 0
        actionHooks.performed.emit(action, this)
    }

    private performPatch(patch: Delta, reverse: boolean) {
        const serialized = serialize(this.puzzleFile)
        if(reverse) {
            doUnpatch(serialized, patch)
        } else {
            doPatch(serialized, patch)
        }
        this.puzzleFile = deserialize(serialized)

        void this.requestSave()
    }

    /**
     * Mark the puzzle file as out of date and save after a debounce period.
     */
    async requestSave(debounceTimeoutMs: number | null = null): Promise<void> {
        if(!this.storage || this.storage.readOnly) { return }

        if(this.saveState.value !== "saving") {
            this.saveState.value = "pending"
        }
        await this.saveDebouncer.requestSave(debounceTimeoutMs)
    }

    /**
     * Save immediately without regard to debouncing or currently in-flight
     * save requests.
     *
     * You probably want to call `requestSave()` instead, or `requestSave(0)`
     * if you want to save as soon as possible but want protection against
     * having multiple in-flight save requests.
     */
    private async saveNow(): Promise<void> {
        if(!this.storage || this.storage.readOnly) { return }
        this.saveState.value = "saving"

        this.puzzleFile.modifiedUTCString = new Date().toUTCString()
        const serialized = serialize(this.puzzleFile)

        try {
            await this.storage.save(this.puzzleFile, JSON.stringify(serialized))
        } catch(e) {
            this.saveState.value = "error"
            console.error("Error saving puzzle", e)
        }

        if(this.saveState.value !== "error") {
            this.saveState.value = "saved"
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

class SaveDebouncer {
    private saveFunc: () => Promise<void>
    private defaultDebounceTimeMs: number
    private maxDebounceTimeMs: number

    /** Timer via `setTimeout()` for debouncing saves. */
    private debounceTimeout: ReturnType<typeof setTimeout> | undefined

    /** Time we started debouncing */
    private debounceStartTime: number | null

    /* `savePromise` is shared betweer all calls to `requestSave()` until the
     * promise is resolved. It resolves after a save actually gets triggered
     * and finishes saving. */
    private savePromise: Promise<void> | null
    private savePromiseResolve: (() => void) | null

    /* When an actual save is in-flight, this promise will be set, then
     * resolved when the save finishes. */
    private saveInFlight: Promise<void> | null

    constructor(saveFunc: () => Promise<void>, defaultDebounceTimeMs: number, maxDebounceTimeMs: number) {
        this.saveFunc = saveFunc
        this.defaultDebounceTimeMs = defaultDebounceTimeMs
        this.maxDebounceTimeMs = maxDebounceTimeMs

        this.debounceTimeout = undefined
        this.debounceStartTime = null

        this.savePromise = null
        this.savePromiseResolve = null

        this.saveInFlight = null
    }

    /** Perform a save `debounceTimeMs` milliseconds after the last call to
     * this method. The save may be delayed longer if there is already an
     * in-flight request to save. */
    async requestSave(debounceTimeMs: number|null = null): Promise<void> {
        if(this.saveInFlight) {
            await this.saveInFlight
        }

        if(!this.savePromise) {
            this.savePromise = new Promise((resolve) => {
                this.savePromiseResolve = resolve
            })
        }

        clearTimeout(this.debounceTimeout)

        if(this.debounceStartTime === null) {
            this.debounceStartTime = Date.now()
        }

        if(debounceTimeMs === null) {
            debounceTimeMs = this.defaultDebounceTimeMs
        }

        // Cap debounceTimeMs so we don't spend more than
        // this.maxDebounceTimeMs debouncing.
        const maxSaveTime = this.debounceStartTime + this.maxDebounceTimeMs
        if(Date.now() + debounceTimeMs > maxSaveTime) {
            debounceTimeMs = Math.max(0, maxSaveTime - Date.now())
        }

        this.debounceTimeout = setTimeout(async () => {
            this.saveInFlight = this.saveFunc()
            await this.saveInFlight

            if(this.savePromiseResolve) {
                this.savePromiseResolve()
            }

            this.debounceStartTime = null
            this.saveInFlight = null
            this.savePromiseResolve = null
            this.savePromise = null

        }, debounceTimeMs)

        return this.savePromise
    }
}