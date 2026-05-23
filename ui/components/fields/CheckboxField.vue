<script setup lang="ts">
import {FormContext, CheckboxField} from "~lib"

const props = defineProps<{
    item: object
    field: CheckboxField
    context: FormContext
}>()

const emit = defineEmits<{
    "edit": [editData: object]
}>()

function setValue(value: boolean) {
    const editData: any = {}
    editData[props.field.property] = value
    emit("edit", editData)
}
</script>

<template>
    <VCheckbox
        :label="props.field.label || props.field.property"
        :model-value="(item as any)[field.property]"
        :hide-details="field.description === undefined"
        :messages="field.description"
        @update:model-value="setValue($event)"
    />
</template>