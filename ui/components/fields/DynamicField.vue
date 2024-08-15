<!-- Renders the correct field component according to the field type. -->
<script lang="ts">
import {FunctionalComponent, createVNode} from "vue"

import {Field, FormEditable} from "~lib"

import CheckboxField from "~/ui/components/fields/CheckboxField.vue"
import Section from "~/ui/components/fields/Section.vue"

type Props = {
    item: FormEditable
    field: Field
}

type Events = {
  edit(editData: object): void
}

const DynamicField: FunctionalComponent<Props, Events> = (props, context) => {
    return createVNode(
        getComponent(props.field),
        {
            ...props,
            onEdit: (editData: object) => context.emit("edit", editData),
        }
    )
}

DynamicField.props = {
  item: {type: Object, required: true},
  field: {type: Object, required: true},
}

DynamicField.emits = ["edit"]

function getComponent(field: Field) {
    const type = field.type
    switch(type) {
        case "checkbox": return CheckboxField
        case "section": return Section
        default:
            throw new Error(`Unrecognized field type "${type}"`)
    }
}

export default DynamicField
</script>