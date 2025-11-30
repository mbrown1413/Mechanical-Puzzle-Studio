

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

export type Field = StringField | IntegerField | CheckboxField | ColorField | SectionField | BoundsField

export type Form = {
    fields: Field[]
}

export interface FormEditable {
    getForm(): Form
}