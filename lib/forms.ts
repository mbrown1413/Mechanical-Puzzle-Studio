import {Grid} from "~/lib/Grid.ts"
import {Problem} from "~/lib/Problem.ts"
import {Puzzle} from "~/lib/Puzzle.ts"
import {BoolWithReason} from "~/lib/types.ts"

export type StringField = {
    type: "string"
    property: string
    label?: string
    description?: string
}

export type IntegerField = {
    type: "integer"
    property: string
    label?: string
    description?: string
    min?: number
    max?: number
}

export type CheckboxField = {
    type: "checkbox"
    property: string
    label?: string
    description?: string
}

export type ColorField = {
    type: "color"
    property: string
    label?: string
}

export type SectionField = {
    type: "section"
    label: string
    fields: Field[]
}

export type BoundsField = {
    type: "bounds"
    property: string
}

export type ConstraintsField = {
    type: "constraints"
    property: string
    label: string
}

export type ProblemPiecesField = {
    type: "problemPieces"
    label: string
    shapeCountsField: string
    goalShapeIdField: string
    infoChip?: {
        text: string
        tooltip?: string
        color?: string
    }
}

export type FormClassInfo<Class extends FormEditable> = {
    name: string
    description?: string
    newInstance: () => Class
    enabled?: (objects: Class[]) => BoolWithReason
}
export type ClassListField<Class extends FormEditable> = {
    type: "classList"
    property: string
    getLabel: (object: Class) => string
    getSubtitle?: (object: Class) => string
    newInstance:
        | (() => Class)
        | FormClassInfo<Class>[]
    initialSelectionIndex?(objects: Class[]): number
}

export type FileSystemFolderField = {
    type: "fileSystemFolder"
    property: string
    label: string
}

export type Field =
    | StringField
    | IntegerField
    | CheckboxField
    | ColorField
    | SectionField
    | BoundsField
    | ConstraintsField
    | ProblemPiecesField
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    | ClassListField<any>
    | FileSystemFolderField

export type Form = {
    fields: Field[]
    validate?: (item: object, context?: FormContext) => string[]
}

export type FormContext = {
    puzzle?: Puzzle
    grid?: Grid
    problem?: Problem
}

export interface FormEditable {
    getForm(context: FormContext): Form
}

export function isFormEditable(value: object): value is FormEditable {
    return typeof (value as unknown as FormEditable).getForm === "function"
}