<script setup lang="ts">
import {FormContext, StringField} from "~lib"

const props = defineProps<{
    item: object
    field: StringField
    context: FormContext
}>()

const emit = defineEmits<{
    "edit": [editData: object]
}>()

function setValue(value: string) {
    const editData: any = {}
    editData[props.field.property] = value
    emit("edit", editData)
}
</script>

<template>
    <VTextField
        :label="props.field.label || props.field.property"
        :messages="field.description"
        :model-value="(item as any)[field.property]"
        @update:model-value="setValue($event)"
    />
</template>