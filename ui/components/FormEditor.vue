<script setup lang="ts">
import {computed} from "vue"

import {FormEditable, Grid} from "~lib"

import DynamicField from "~/ui/components/fields/DynamicField.vue"
import UiButton from "~/ui/components/UiButton.vue"
import {UiButtonDefinition} from "~/ui/ui-buttons.ts"

const props = defineProps<{
    item: FormEditable
    title?: string
    grid?: Grid
    floatingButton?: UiButtonDefinition
}>()

defineEmits<{
    "edit": [editData: object]
}>()

const form = computed(() => props.item.getForm())
</script>

<template>
    <div>
        <div
            v-if="title || floatingButton"
            class="title-div"
        >
            <h4 v-if="title">{{ title }}</h4>
            <UiButton v-if="floatingButton" :uiButton="floatingButton" />
        </div>

        <DynamicField
            v-for="field of form.fields"
            :field="field"
            :item="item"
            :grid="grid"
            @edit="$emit('edit', $event)"
        />
    </div>
</template>

<style scoped>
.title-div {
    display: flex;
    justify-content: space-between;

    margin-bottom: 0.5em;
}
</style>