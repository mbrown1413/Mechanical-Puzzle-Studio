<script setup lang="ts">
import {FormContext, SectionField} from "~lib"

import DynamicField from "~/ui/components/fields/DynamicField.vue"

defineProps<{
    item: object
    field: SectionField
    context: FormContext
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
            :context="context"
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