<script setup lang="ts">
import {computed} from "vue"

import {FormEditable} from "~/lib/forms.ts"
import {CheckboxField} from "~/lib/forms.ts"

const props = defineProps<{
    item: FormEditable
    field: CheckboxField
}>()

const emit = defineEmits<{
    "edit": [editData: object]
}>()

const label = computed(() => props.field.label || props.field.property)

function setValue(value: boolean) {
    const editData: any = {}
    editData[props.field.property] = value
    emit("edit", editData)
}
</script>

<template>
    <VCheckbox
        :label="label"
        :model-value="(item as any)[field.property]"
        @update:model-value="setValue($event)"
        hide-details
    />
</template>