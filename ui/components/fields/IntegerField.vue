<script setup lang="ts">
import {FormEditable, FormContext, IntegerField} from "~lib"

const props = defineProps<{
    item: FormEditable
    field: IntegerField
    context: FormContext
}>()

const emit = defineEmits<{
    "edit": [editData: object]
}>()

function setValue(value: number) {
    const editData: any = {}
    editData[props.field.property] = value
    emit("edit", editData)
}
</script>

<template>
    <VNumberInput
        control-variant="stacked"
        :label="props.field.label || props.field.property"
        :min="field.min"
        :max="field.max"
        :messages="field.description"
        :model-value="(item as any)[field.property]"
        @update:model-value="setValue($event)"
    />
</template>