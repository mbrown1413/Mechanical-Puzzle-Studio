<script setup lang="ts">
import {FormEditable, SectionField} from "~lib"

import DynamicField from "~/ui/components/fields/DynamicField.vue"

defineProps<{
    item: FormEditable
    field: SectionField
}>()

defineEmits<{
    "edit": [editData: object]
}>()
</script>

<template>
    <fieldset>
        <legend>{{ field.label }}</legend>
        <DynamicField
            v-for="subField of field.fields"
            :field="subField"
            :item="item"
            @edit="$emit('edit', $event)"
        />
    </fieldset>
</template>

<style scoped>
fieldset {
    padding: 0.5em;
}
legend {
    margin-left: 48px;
}
</style>