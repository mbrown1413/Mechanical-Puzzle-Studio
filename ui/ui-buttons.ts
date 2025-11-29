import {Ref} from "vue"

import {PuzzleFile, ShapeAssembly, convertToPuzzlecad} from "~lib"

import {Action, ProblemListMoveAction} from "~/ui/actions.ts"
import {ActionManager} from "~/ui/ActionManager.ts"
import {
    NewShapeAction, DeleteShapeAction, DuplicateShapeAction,
    NewShapeGroupAction, NewProblemAction, DeleteProblemAction,
    DuplicateProblemAction, DeleteShapeGroupAction, ShapeListMoveAction
} from "~/ui/actions.ts"
import {downloadPuzzle, downloadString} from "~/ui/utils/download.ts"
import {PuzzleStorage} from "~/ui/storage.ts"
import {taskRunner} from "~/ui/globals.ts"
import {ProblemSolveTask} from "~/ui/tasks.ts"
import PuzzleSaveModal from "~/ui/components/PuzzleSaveModal.vue"
import PuzzleMetadataModal from "~/ui/components/PuzzleMetadataModal.vue"
import RawDataModal from "~/ui/components/RawDataModal.vue"
import ExportModal from "~/ui/components/ExportModal.vue"
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
    exportModal: Ref<InstanceType<typeof ExportModal> | null>,
    gridEditModal: Ref<InstanceType<typeof GridEditModal> | null>,
): Record<string, UiButtonDefinition> {

    function getNewShapeBounds() {
        const shape = puzzleEditor.value?.selectedShape
        if(shape && shape.bounds) {
            return Object.assign({}, shape.bounds)
        }
        return undefined
    }

    function getCurrentItemType() {
        if(!puzzleEditor.value) { return null }

        switch(puzzleEditor.value.currentTabId) {
            case "shapes":
                if(puzzleEditor.value?.selectedShapeGroup) {
                    return "shape-group"
                } else {
                    return "shape"
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
            case "shape":
                return uiButtons.deleteShape
            case "shape-group":
                return uiButtons.deleteShapeGroup
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

        export: {
            text: "Export",
            icon: "mdi-export",
            perform() {
                if(exportModal.value) {
                    exportModal.value.open()
                }
            },
        },

        exportPuzzlecad: {
            text: "Puzzlecad",
            icon: "mdi-export",
            perform() {
                if(puzzleFile.value) {
                    const puzzlecadString = convertToPuzzlecad(puzzleFile.value)
                    downloadString(
                        puzzlecadString,
                        (puzzleFile.value.name || "puzzle") + ".scad",
                        "application/x-openscad"
                    )
                }
            },
            enabled: () => ["CubicGrid", "SquareGrid"].includes(
                puzzleFile.value?.puzzle.grid.constructor.name || ""
            )
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

        newShape: {
            text: "New Shape",
            icon: "mdi-plus",
            perform: () => {
                const bounds = getNewShapeBounds()
                const selected = puzzleEditor.value?.selectedShape || puzzleEditor.value?.selectedShapeGroup
                performAction(new NewShapeAction(bounds, selected))
            }
        },

        deleteShape: {
            text: "Delete Shape",
            icon: "mdi-minus",
            perform: () => {
                if(puzzleEditor.value?.selectedShape) {
                    performAction(
                        new DeleteShapeAction(puzzleEditor.value.selectedShape.id)
                    )
                }
            },
            enabled: () => Boolean(puzzleEditor.value?.selectedShape),
        },

        duplicateShape: {
            text: "Duplicate Shape",
            icon: "mdi-content-duplicate",
            perform: () => {
                if(puzzleEditor.value?.selectedShape) {
                    performAction(
                        new DuplicateShapeAction(puzzleEditor.value.selectedShape.id)
                    )
                }
            },
            enabled: () => Boolean(puzzleEditor.value?.selectedShape),
        },

        newShapeAssembly: {
            text: "New Shape Assembly",
            icon: "mdi-plus",
            perform: () => {
                puzzleEditor.value?.setUiFocus("shapes")
                const selected = puzzleEditor.value?.selectedShape || puzzleEditor.value?.selectedShapeGroup
                performAction(
                    new NewShapeGroupAction(ShapeAssembly, selected)
                )
            }
        },

        deleteShapeGroup: {
            text: "Delete Shape Group",
            icon: "mdi-minus",
            perform: () => {
                if(puzzleEditor.value?.selectedShapeGroup) {
                    performAction(
                        new DeleteShapeGroupAction(puzzleEditor.value.selectedShapeGroup.id)
                    )
                }
            },
            enabled: () => Boolean(puzzleEditor.value?.selectedShapeGroup),
        },

        shapeListMoveUp: {
            text: () => puzzleEditor.value?.selectedShapeGroup ? "Move shape group up" : "Move shape up",
            icon: "mdi-menu-up-outline",
            perform: () => {
                const selected = puzzleEditor.value?.selectedShape || puzzleEditor.value?.selectedShapeGroup
                if(!selected) { return }
                performAction(
                    new ShapeListMoveAction("up", selected)
                )
            },
            enabled: () => Boolean(
                puzzleEditor.value?.selectedShape || puzzleEditor.value?.selectedShapeGroup
            ),
        },

        shapeListMoveDown: {
            text: () => puzzleEditor.value?.selectedShapeGroup ? "Move shape group down" : "Move shape down",
            icon: "mdi-menu-down-outline",
            perform: () => {
                const selected = puzzleEditor.value?.selectedShape || puzzleEditor.value?.selectedShapeGroup
                if(!selected) { return }
                performAction(
                    new ShapeListMoveAction("down", selected)
                )
            },
            enabled: () => Boolean(
                puzzleEditor.value?.selectedShape || puzzleEditor.value?.selectedShapeGroup
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

        problemListMoveUp: {
            text: () => "Move problem up",
            icon: "mdi-menu-up-outline",
            perform: () => {
                const selected = puzzleEditor.value?.selectedProblem
                if(!selected) { return }
                performAction(
                    new ProblemListMoveAction("up", selected)
                )
            },
            enabled: () => Boolean(puzzleEditor.value?.selectedProblem),
        },

        problemListMoveDown: {
            text: () => "Move problem down",
            icon: "mdi-menu-down-outline",
            perform: () => {
                const selected = puzzleEditor.value?.selectedProblem
                if(!selected) { return }
                performAction(
                    new ProblemListMoveAction("down", selected)
                )
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