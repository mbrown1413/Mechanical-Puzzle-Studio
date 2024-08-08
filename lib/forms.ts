
export type CheckboxField = {
    type: "checkbox"
    property: string
    label?: string
}

export type SectionField = {
    type: "section"
    label: string
    fields: Field[]
}

export type Field = CheckboxField | SectionField

export type Form = {
    fields: Field[]
}

export interface FormEditable {
    getForm(): Form
}