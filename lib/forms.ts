

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

export type SectionField = {
    type: "section"
    label: string
    fields: Field[]
}

export type Field = StringField | IntegerField | CheckboxField | SectionField

export type Form = {
    fields: Field[]
}

export interface FormEditable {
    getForm(): Form
}