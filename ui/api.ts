import {Ref, nextTick} from "vue"

import {Shape, Problem, Puzzle} from "~lib"
import PuzzleEditor from "~/ui/components/PuzzleEditor.vue"
import {UiButtonDefinition} from "~/ui/ui-buttons.ts"
import {saveCurrentPuzzle} from "~/ui/ActionManager.ts"


/**
 * API for interacting with puzzles in the puzzle editor.
 *
 * Access an instance of this on a puzzle edit page by opening the browser's
 * developer console using the `api` object.
 *
 * There are some things to be aware of when using this API:
 *
 *   * Changes are not saved until another action is done in the UI or
 *     `api.save()` is called.
 *
 *   * Changes cannot be undone or redone with the undo/redo buttons.
 *
 *   * Objects returned may be mutated. These mutations will be reflected
 *     instantly on the UI, but as stated above the changes won't be saved
 *     automatically. Moreover, there is nothing stopping you from changing the
 *     data to have unexpected types or inconsistent data.
 *
 * Examples:
 *   * `api.puzzle.getShape("Shape 1")` - Get shape with label "Shape 1".
 *   * `api.selectedProblem` - A reference to the currently selected problem (or null).
 *   * `shape = await api.newShape()` - Creates a new shape and gets a reference to it.
 *   * `api.selectedShape.color = "orange"` - Sets current shape's color to orange.
 *   * `api.save()` - Saves the puzzle (if it isn't read-only).
 */
export class PuzzleStudioApi {
    uiActions: Record<string, () => void>

    private puzzleEditorRef: Ref<InstanceType<typeof PuzzleEditor> | null>

    constructor(
        puzzleEditorRef: Ref<InstanceType<typeof PuzzleEditor> | null>,
        uiButtons: Record<string, UiButtonDefinition>,
    ) {
        this.puzzleEditorRef = puzzleEditorRef

        this.uiActions = {}
        for(const [name, uiButton] of Object.entries(uiButtons)) {
            this.uiActions[name] = () => uiButton.perform()
        }
    }

    private get puzzleEditor(): InstanceType<typeof PuzzleEditor> {
        if(!this.puzzleEditorRef.value) {
            throw new Error("Puzzle editor not initialized")
        }
        return this.puzzleEditorRef.value
    }

    ////////// Puzzle //////////

    get puzzle(): Puzzle {
        return this.puzzleEditor.$props.puzzle
    }

    save() {
        saveCurrentPuzzle()
    }

    ////////// Shapes //////////

    get selectedShape(): Shape | null {
        return this.puzzleEditor.selectedShape
    }

    async newShape(): Promise<Shape> {
        this.uiActions.newShape()
        return new Promise((resolve, reject) => {
            nextTick(() => {
                const shape = this.selectedShape
                if(!shape) { reject(); return }
                resolve(shape)
            })
        })
    }

    ////////// Problems //////////

    get selectedProblem(): Problem | null {
        return this.puzzleEditor.selectedProblem
    }

    async newProblem(): Promise<Problem> {
        this.uiActions.newProblem()
        return new Promise((resolve, reject) => {
            nextTick(() => {
                const problem = this.selectedProblem
                if(!problem) { reject(); return }
                resolve(problem)
            })
        })
    }

}