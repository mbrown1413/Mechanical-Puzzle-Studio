import {Ref} from "vue"

import {PuzzleFile, AssemblyPieceGroup} from "~lib"

import {Action} from "~/ui/actions.ts"
import {ActionManager} from "~/ui/ActionManager.ts"
import {
    NewPieceAction, DeletePieceAction, DuplicatePieceAction,
    NewPieceGroupAction, NewProblemAction, DeleteProblemAction,
    DuplicateProblemAction, DeletePieceGroupAction, PieceListMoveAction
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
        const piece = puzzleEditor.value?.selectedPiece
        if(piece && piece.bounds) {
            return Object.assign({}, piece.bounds)
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
                const selected = puzzleEditor.value?.selectedPiece || puzzleEditor.value?.selectedPieceGroup
                performAction(new NewPieceAction(bounds, selected))
            }
        },

        deletePiece: {
            text: "Delete Piece",
            icon: "mdi-minus",
            perform: () => {
                if(puzzleEditor.value?.selectedPiece) {
                    performAction(
                        new DeletePieceAction(puzzleEditor.value.selectedPiece.id)
                    )
                }
            },
            enabled: () => Boolean(puzzleEditor.value?.selectedPiece),
        },

        duplicatePiece: {
            text: "Duplicate Piece",
            icon: "mdi-content-duplicate",
            perform: () => {
                if(puzzleEditor.value?.selectedPiece) {
                    performAction(
                        new DuplicatePieceAction(puzzleEditor.value.selectedPiece.id)
                    )
                }
            },
            enabled: () => Boolean(puzzleEditor.value?.selectedPiece),
        },

        newPieceAssembly: {
            text: "New Piece Assembly",
            icon: "mdi-plus",
            perform: () => {
                puzzleEditor.value?.setUiFocus("pieces")
                const selected = puzzleEditor.value?.selectedPiece || puzzleEditor.value?.selectedPieceGroup
                performAction(
                    new NewPieceGroupAction(AssemblyPieceGroup, selected)
                )
            }
        },

        deletePieceGroup: {
            text: "Delete Piece Group",
            icon: "mdi-minus",
            perform: () => {
                if(puzzleEditor.value?.selectedPieceGroup) {
                    performAction(
                        new DeletePieceGroupAction(puzzleEditor.value.selectedPieceGroup.id)
                    )
                }
            },
            enabled: () => Boolean(puzzleEditor.value?.selectedPieceGroup),
        },

        pieceListMoveUp: {
            text: () => puzzleEditor.value?.selectedPieceGroup ? "Move piece group up" : "Move piece up",
            icon: "mdi-menu-up-outline",
            perform: () => {
                const selected = puzzleEditor.value?.selectedPiece || puzzleEditor.value?.selectedPieceGroup
                if(!selected) { return }
                performAction(
                    new PieceListMoveAction("up", selected)
                )
            },
            enabled: () => Boolean(
                puzzleEditor.value?.selectedPiece || puzzleEditor.value?.selectedPieceGroup
            ),
        },

        pieceListMoveDown: {
            text: () => puzzleEditor.value?.selectedPieceGroup ? "Move piece group down" : "Move piece down",
            icon: "mdi-menu-down-outline",
            perform: () => {
                const selected = puzzleEditor.value?.selectedPiece || puzzleEditor.value?.selectedPieceGroup
                if(!selected) { return }
                performAction(
                    new PieceListMoveAction("down", selected)
                )
            },
            enabled: () => Boolean(
                puzzleEditor.value?.selectedPiece || puzzleEditor.value?.selectedPieceGroup
            ),
        },

        newProblem: {
            text: "New Problem",
            icon: "mdi-plus",
            perform: () => {
                performAction(
                    new NewProblemAction(puzzleEditor.value?.selectedProblem)
                )
            }
        },

        deleteProblem: {
            text: "Delete Problem",
            icon: "mdi-minus",
            perform: () => {
                if(puzzleEditor.value?.selectedProblem) {
                    performAction(
                        new DeleteProblemAction(puzzleEditor.value.selectedProblem.id)
                    )
                }
            },
            enabled: () => Boolean(puzzleEditor.value?.selectedProblem),
        },

        duplicateProblem: {
            text: "Duplicate Problem",
            icon: "mdi-content-duplicate",
            perform: () => {
                if(puzzleEditor.value?.selectedProblem) {
                    performAction(
                        new DuplicateProblemAction(puzzleEditor.value.selectedProblem.id)
                    )
                }
            },
            enabled: () => Boolean(puzzleEditor.value?.selectedProblem),
        },

        startSolve: {
            text: "Solve",
            icon: "",
            perform: () => {
                if(puzzleFile.value && puzzleEditor.value?.selectedProblem) {
                    taskRunner.submitTask(
                        new ProblemSolveTask(puzzleFile.value.puzzle, puzzleEditor.value.selectedProblem.id)
                    )
                }
            },
            enabled: () => {
                const problemId = puzzleEditor.value?.selectedProblem?.id
                if(problemId === undefined) { return false }
                for(const taskInfo of taskRunner.getTasks()) {
                    if(
                        taskInfo.task instanceof ProblemSolveTask && 
                        taskInfo.task.problemId === problemId && 
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