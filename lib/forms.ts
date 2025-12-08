import {Grid} from "~/lib/Grid.ts"
import {Problem} from "~/lib/Problem.ts"
import {Puzzle} from "./Puzzle"

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

export type Field = 
    StringField
    | IntegerField
    | CheckboxField
    | ColorField
    | SectionField
    | BoundsField
    | ConstraintsField
    | ProblemPiecesField

export type Form = {
    fields: Field[]
}

export type FormContext = {
    puzzle?: Puzzle
    grid?: Grid
    problem?: Problem
}

export interface FormEditable {
    getForm(context: FormContext): Form
}