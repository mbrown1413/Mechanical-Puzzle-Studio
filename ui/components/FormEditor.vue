<script setup lang="ts">
import {computed} from "vue"

import {FormContext, FormEditable} from "~lib"

import DynamicField from "~/ui/components/fields/DynamicField.vue"
import UiButton from "~/ui/components/UiButton.vue"
import {UiButtonDefinition} from "~/ui/ui-buttons.ts"

const props = withDefaults(
    defineProps<{
        item: FormEditable
        title?: string
        context?: FormContext
        floatingButton?: UiButtonDefinition
    }>(),
    {
        context: () => ({}),
    }
)

defineEmits<{
    "edit": [editData: object]
}>()

const form = computed(() => props.item.getForm(props.context))
</script>

<template>
    <div class="formEditor">
        <div
            v-if="title || floatingButton"
            class="formEditor-title"
        >
            <h4 v-if="title">{{ title }}</h4>
            <UiButton v-if="floatingButton" :uiButton="floatingButton" />
        </div>

        <DynamicField
            v-for="field of form.fields"
            :field="field"
            :item="item"
            :context="context"
            @edit="$emit('edit', $event)"
        />
    </div>
</template>

<style scoped>
.formEditor {
    width: fit-content;
}

.formEditor-title {
    display: flex;
    justify-content: space-between;
    width: fit-content;

    margin-bottom: 0.5em;
}
</style>