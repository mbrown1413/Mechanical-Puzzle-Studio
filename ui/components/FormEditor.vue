<script setup lang="ts">
import {computed} from "vue"

import {FormEditable} from "~/lib/forms.ts"

import DynamicField from "~/ui/components/fields/DynamicField.vue"

const props = defineProps<{
    item: FormEditable
}>()

const emit = defineEmits<{
    "edit": [editData: object]
}>()

const form = computed(() => props.item.getForm())
</script>

<template>
    <div>
        <DynamicField
            v-for="field of form.fields"
            :field="field"
            :item="item"
            @edit="$emit('edit', $event)"
        />
    </div>
</template>