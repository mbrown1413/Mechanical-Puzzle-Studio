<script setup lang="ts">
import {computed} from "vue"

import {BoundsField, FormContext, FormEditable} from "~lib"

const props = defineProps<{
    item: FormEditable
    field: BoundsField
    context: FormContext
}>()

if(!props.context.grid) {
    throw new Error("BoundsField requires a grid context")
}

const emit = defineEmits<{
    "edit": [editData: object]
}>()

const currentValue = computed(() =>
    (props.item as any)[props.field.property]
)

function handleBoundsInput(boundsProperty: string, value: number) {
    const editData: any = {}
    editData[props.field.property] = Object.assign({}, currentValue.value)
    editData[props.field.property][boundsProperty] = value
    emit("edit", editData)
}
</script>

<template>
    <VContainer v-if="context.grid">
        <VRow>
            <VCol
                v-for="dimension in context.grid.boundsEditInfo.dimensions"
                style="padding: 4px;"
            >
                <VNumberInput
                    control-variant="stacked"
                    :label="dimension.name"
                    :min="1"
                    :max="99"
                    :model-value="currentValue[dimension.boundsProperty]"
                    @update:model-value="handleBoundsInput(dimension.boundsProperty, $event)"
                />
            </VCol>
        </VRow>
    </VContainer>
</template>