<!-- Renders the correct field component according to the field type. -->
<script lang="ts">
import {FunctionalComponent, createVNode} from "vue"

import {Field, FormEditable, Grid} from "~lib"

import StringField from "~/ui/components/fields/StringField.vue"
import IntegerField from "~/ui/components/fields/IntegerField.vue"
import CheckboxField from "~/ui/components/fields/CheckboxField.vue"
import ColorField from "~/ui/components/fields/ColorField.vue"
import Section from "~/ui/components/fields/Section.vue"
import BoundsField from "~/ui/components/fields/BoundsField.vue"

type Props = {
    item: FormEditable
    field: Field
    grid?: Grid
}

type Events = {
    edit(editData: object): void
}

const DynamicField: FunctionalComponent<Props, Events> = (props) => {
    return createVNode(
        getComponent(props.field),
        props
    )
}

function getComponent(field: Field) {
    const type = field.type
    switch(type) {
        case "string": return StringField
        case "integer": return IntegerField
        case "checkbox": return CheckboxField
        case "color": return ColorField
        case "section": return Section
        case "bounds": return BoundsField
        default:
            throw new Error(`Unrecognized field type "${type}"`)
    }
}

export default DynamicField
</script>