import {Ref, reactive, toRaw} from "vue"
import {diff, patch as doPatch, unpatch as doUnpatch, Delta} from "jsondiffpatch"

import {PuzzleFile, serialize} from "~lib"
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
        const before = structuredClone(toRaw(this.puzzleFile))
        action.perform(this.puzzleFile.puzzle, this.puzzleFile)
        const after = structuredClone(toRaw(this.puzzleFile))

        const serialized = serialize(this.puzzleFile)
        if(!this.storage.readOnly) {
            this.storage.save(this.puzzleFile, JSON.stringify(serialized))
        }

        // Remove solutions from diff calculation
        // This should be purely an optimization and not affect any
        // functionality. The solver runs outside of the action undo system, so
        // we don't the diff algorithm wasting time searching through
        // solutions.
        function clearSolutions(puzzleFile: PuzzleFile) {
            for(const problem of puzzleFile.puzzle.problems) {
                problem.solutions = []
            }
        }
        clearSolutions(before)
        clearSolutions(after)

        const patch = diff(before, after)

        this.performedActions.push({action, patch})
        this.undoneActions.length = 0
    }

    private performPatch(patch: Delta, reverse: boolean) {
        if(reverse) {
            doUnpatch(this.puzzleFile, patch)
        } else {
            doPatch(this.puzzleFile, patch)
        }
        if(!this.storage.readOnly) {
            this.storage.save(this.puzzleFile)
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