import {Ref} from "vue"

import {PuzzleFile, AssemblyPieceGroup} from "~lib"

import {Action} from "~/ui/actions.ts"
import {ActionManager} from "~/ui/ActionManager.ts"
import {
    NewPieceAction, DeletePiecesAction, DuplicatePieceAction,
    NewPieceGroupAction, NewProblemAction, DeleteProblemsAction,
    DuplicateProblemAction, DeletePieceGroupsAction
} from "~/ui/actions.ts"
import {downloadPuzzle} from "~/ui/utils/download.ts"
import {PuzzleStorage} from "~/ui/storage.ts"
import {taskRunner} from "~/ui/globals.ts"
import {ProblemSolveTask} from "~/ui/tasks.ts"
import PuzzleSaveModal from "~/ui/components/PuzzleSaveModal.vue"
import PuzzleMetadataModal from "~/ui/components/PuzzleMetadataModal.vue"
import RawDataModal from "~/ui/components/RawDataModal.vue"
import PuzzleEditor from "~/ui/components/PuzzleEditor.vue"
import GridEditModal from "~/ui/components/GridEditModal.vue"

export type UiButtonDefinition = {
    text: string | (() => string),
    icon?: string,
    perform: () => void,
    enabled?: () => boolean,
    alwaysShowTooltip?: boolean,
}

export function useUiButtonComposible(
    puzzleFile: Ref<PuzzleFile | null>,
    storage: Ref<PuzzleStorage | null>,
    actionManager: ActionManager,
    performAction: (action: Action) => void,
    puzzleEditor: Ref<InstanceType<typeof PuzzleEditor> | null>,
    saveModal: Ref<InstanceType<typeof PuzzleSaveModal> | null>,
    metadataModal: Ref<InstanceType<typeof PuzzleMetadataModal> | null>,
    rawDataModal: Ref<InstanceType<typeof RawDataModal> | null>,
    gridEditModal: Ref<InstanceType<typeof GridEditModal> | null>,
): Record<string, UiButtonDefinition> {

    function getNewPieceBounds() {
        if(puzzleEditor.value?.selectedPieceIds.length === 1) {
            const id = puzzleEditor.value?.selectedPieceIds[0]
            const piece = puzzleFile.value?.puzzle.getPiece(id)
            if(piece && piece.bounds) {
                return Object.assign({}, piece.bounds)
            }
        }
        return undefined
    }

    function getCurrentItemType() {
        if(!puzzleEditor.value) { return null }

        switch(puzzleEditor.value.currentTabId) {
            case "pieces":
                if(puzzleEditor.value?.selectedPieceGroup) {
                    return "piece-group"
                } else {
                    return "piece"
                }
            case "problems":
            case "solutions":
                return "problem"
            default: return null
        }
    }

    function getCurrentItemDeleteButton() {
        const type = getCurrentItemType()
        switch(type) {
            case "piece":
                return uiButtons.deletePiece
            case "piece-group":
                return uiButtons.deletePieceGroup
            case "problem":
                return uiButtons.deleteProblem
            default:
                return null
        }
    }

    const uiButtons: Record<string, UiButtonDefinition> = {

        newPuzzle: {
            text: "New",
            icon: "mdi-file-plus",
            enabled: () => storage.value !== null,
            perform() {
                if(storage.value) {
                    saveModal.value?.openNew(storage.value)
                }
            },
        },

        puzzleMetadata: {
            text: "Metadata",
            icon: "mdi-file-code",
            perform() {
                metadataModal.value?.open()
            },
        },

        gridEdit: {
            text: "Edit Grid",
            icon: "mdi-grid",
            perform() {
                gridEditModal.value?.open()
            },
        },

        saveAs: {
            text: "Save As...",
            icon: "mdi-content-save-plus",
            enabled: () => storage.value !== null,
            perform() {
                if(puzzleFile.value && storage.value) {
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

        deleteSelectedItem: {
            text: () => {
                const button = getCurrentItemDeleteButton()
                if(!button) { return "Delete" }
                return typeof button.text === "string" ? button.text : button.text()
            },
            icon: "mdi-minus",
            perform: () => {
                const button = getCurrentItemDeleteButton()
                if(!button) { return }
                button.perform()
            },
            enabled: () => {
                const button = getCurrentItemDeleteButton()
                if(!button) { return false }
                return button.enabled === undefined ? true : button.enabled()
            }
        },

        newPiece: {
            text: "New Piece",
            icon: "mdi-plus",
            perform: () => {
                const bounds = getNewPieceBounds()
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

        newPieceAssembly: {
            text: "New Piece Assembly",
            icon: "mdi-plus",
            perform: () => {
                puzzleEditor.value?.setUiFocus("pieces")
                performAction(
                    new NewPieceGroupAction(new AssemblyPieceGroup())
                )
            }
        },

        newPieceInPieceGroup: {
            text: "Add Piece to Assembly",
            icon: "mdi-plus",
            perform: () => {
                const bounds = getNewPieceBounds()
                const group = puzzleEditor.value?.selectedPieceGroupId
                if(group === null) return
                performAction(
                    new NewPieceAction(bounds, group)
                )
            },
            enabled: () => {
                const group = puzzleEditor.value?.selectedPieceGroup
                if(!group) return false
                return group.canManuallyAddPieces
            }
        },

        deletePieceGroup: {
            text: "Delete Piece Group",
            icon: "mdi-minus",
            perform: () => {
                if(puzzleEditor.value?.selectedPieceGroupIds.length) {
                    performAction(
                        new DeletePieceGroupsAction(puzzleEditor.value.selectedPieceGroupIds)
                    )
                }
            },
            enabled: () => (puzzleEditor.value?.selectedPieceGroupIds.length || 0) > 0,
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
            enabled: () => {
                const problemId = puzzleEditor.value?.selectedProblemIds[0]
                if(problemId === undefined) { return false }
                for(const taskInfo of taskRunner.getTasks()) {
                    if(
                        taskInfo.task instanceof ProblemSolveTask && 
                        taskInfo.task.problemId === puzzleEditor.value?.selectedProblemIds[0] && 
                        ["running", "queued"].includes(taskInfo.status)
                    ) {
                        return false
                    }
                }
                return true
            }
        },

    }
    return uiButtons
}