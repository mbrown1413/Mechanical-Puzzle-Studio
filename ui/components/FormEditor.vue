<script setup lang="ts">
import {computed} from "vue"

import {Form, FormContext, isFormEditable} from "~lib"

import DynamicField from "~/ui/components/fields/DynamicField.vue"
import UiButton from "~/ui/components/UiButton.vue"
import {UiButtonDefinition} from "~/ui/ui-buttons.ts"

const props = withDefaults(
    defineProps<{
        item: object
        form?: Form
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

const activeForm = computed(() => {
    if(props.form) {
        return props.form
    } else if(isFormEditable(props.item)) {
        return props.item.getForm(props.context)
    } else {
        throw new Error("Item is not form editable and no form was provided.")
    }
})
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
            v-for="field of activeForm.fields"
            :field="field"
            :item="item"
            :context="context"
            @edit="$emit('edit', $event)"
        />
    </div>
</template>

<style scoped>
.formEditor {
    width: 100%;
}

.formEditor-title {
    display: flex;
    justify-content: space-between;
    width: fit-content;

    margin-bottom: 0.5em;
}
</style>