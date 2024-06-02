import {ComputedRef, Ref} from "vue"

import {PuzzleFile} from "~lib"

import {Action} from "~/ui/actions.ts"
import {ActionManager} from "~/ui/ActionManager.ts"
import {NewPieceAction, DeletePiecesAction, DuplicatePieceAction, NewProblemAction, DeleteProblemsAction, DuplicateProblemAction} from "~/ui/actions.ts"
import {downloadPuzzle} from "~/ui/utils/download.ts"
import {PuzzleStorage} from "~/ui/storage.ts"
import {taskRunner} from "~/ui/globals.ts"
import {ProblemSolveTask} from "~/ui/tasks.ts"
import PuzzleSaveModal from "~/ui/components/PuzzleSaveModal.vue"
import PuzzleMetadataModal from "~/ui/components/PuzzleMetadataModal.vue"
import RawDataModal from "~/ui/components/RawDataModal.vue"
import PuzzleEditor from "~/ui/components/PuzzleEditor.vue"

export type UiButtonDefinition = {
    text: string | (() => string),
    icon?: string,
    perform: () => void,
    enabled?: () => boolean,
    alwaysShowTooltip?: boolean,
}

export function useUiButtonComposible(
    puzzleFile: Ref<PuzzleFile | null>,
    storage: ComputedRef<PuzzleStorage>,
    actionManager: ActionManager,
    performAction: (action: Action) => void,
    puzzleEditor: Ref<InstanceType<typeof PuzzleEditor> | null>,
    saveModal: Ref<InstanceType<typeof PuzzleSaveModal> | null>,
    metadataModal: Ref<InstanceType<typeof PuzzleMetadataModal> | null>,
    rawDataModal: Ref<InstanceType<typeof RawDataModal> | null>,
): Record<string, UiButtonDefinition> {
    return {

        newPuzzle: {
            text: "New",
            icon: "mdi-file-plus",
            perform() {
                saveModal.value?.openNew(storage.value)
            },
        },

        puzzleMetadata: {
            text: "Metadata",
            icon: "mdi-file-code",
            perform() {
                metadataModal.value?.open()
            },
        },

        saveAs: {
            text: "Save As...",
            icon: "mdi-content-save-plus",
            perform() {
                if(puzzleFile.value) {
                    saveModal.value?.openSaveAs(storage.value, puzzleFile.value)
                }
            },
        },

        puzzleRawData: {
            text: "Raw Data",
            icon: "mdi-code-braces",
            perform() {
                if(puzzleFile.value) {
                    rawDataModal.value?.openFromPuzzle(puzzleFile.value)
                }
            },
            enabled: () => Boolean(puzzleFile.value),
        },

        downloadPuzzle: {
            text: "Download",
            icon: "mdi-download",
            perform() {
                if(puzzleFile.value) {
                    downloadPuzzle(puzzleFile.value)
                }
            },
            enabled: () => Boolean(puzzleFile.value)
        },

        undo: {
            text: () => {
                const action = actionManager.getUndoAction()
                const actionString = action ? ` "${action.toString()}"` : ""
                return "Undo" + actionString
            },
            icon: "mdi-undo",
            perform: () => actionManager.undo(),
            enabled: () => actionManager.canUndo(),
        },

        redo: {
            text: () => {
                const action = actionManager.getRedoAction()
                const actionString = action ? ` "${action.toString()}"` : ""
                return "Redo" + actionString
            },
            icon: "mdi-redo",
            perform: () => actionManager.redo(),
            enabled: () => actionManager.canRedo(),
        },

        newPiece: {
            text: "New Piece",
            icon: "mdi-plus",
            perform: () => {
                let bounds = undefined
                if(puzzleEditor.value?.selectedPieceIds.length === 1) {
                    const id = puzzleEditor.value?.selectedPieceIds[0]
                    const piece = puzzleFile.value?.puzzle.getPiece(id)
                    if(piece && piece.bounds) {
                        bounds = Object.assign({}, piece.bounds)
                    }
                }
                performAction(new NewPieceAction(bounds))
            }
        },

        deletePiece: {
            text: "Delete Piece",
            icon: "mdi-minus",
            perform: () => {
                if(puzzleEditor.value?.selectedPieceIds.length) {
                    performAction(
                        new DeletePiecesAction(puzzleEditor.value.selectedPieceIds)
                    )
                }
            },
            enabled: () => (puzzleEditor.value?.selectedPieceIds.length || 0) > 0,
        },

        duplicatePiece: {
            text: "Duplicate Piece",
            icon: "mdi-content-duplicate",
            perform: () => {
                if(puzzleEditor.value?.selectedPieceIds.length) {
                    performAction(
                        new DuplicatePieceAction(puzzleEditor.value.selectedPieceIds[0])
                    )
                }
            },
            enabled: () => (puzzleEditor.value?.selectedPieceIds.length || 0) > 0,
        },

        newProblem: {
            text: "New Problem",
            icon: "mdi-plus",
            perform: () => {
                performAction(new NewProblemAction())
            }
        },

        deleteProblem: {
            text: "Delete Problem",
            icon: "mdi-minus",
            perform: () => {
                if(puzzleEditor.value?.selectedProblemIds.length) {
                    performAction(
                        new DeleteProblemsAction(puzzleEditor.value.selectedProblemIds)
                    )
                }
            },
            enabled: () => (puzzleEditor.value?.selectedProblemIds.length || 0) > 0,
        },

        duplicateProblem: {
            text: "Duplicate Problem",
            icon: "mdi-content-duplicate",
            perform: () => {
                if(puzzleEditor.value?.selectedProblemIds.length) {
                    performAction(
                        new DuplicateProblemAction(puzzleEditor.value.selectedProblemIds[0])
                    )
                }
            },
            enabled: () => (puzzleEditor.value?.selectedProblemIds.length || 0) > 0,
        },

        startSolve: {
            text: "Solve",
            icon: "",
            perform: () => {
                if(!puzzleFile.value) { return }
                for(const problemId of puzzleEditor.value?.selectedProblemIds || []) {
                    taskRunner.submitTask(
                        new ProblemSolveTask(puzzleFile.value.puzzle, problemId)
                    )
                }
            },
            enabled: () => (puzzleEditor.value?.selectedProblemIds.length || 0) > 0,
        },

    }
}