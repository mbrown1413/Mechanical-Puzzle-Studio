<script setup lang="ts">
import {computed} from "vue"
import {VNumberInput} from "vuetify/labs/VNumberInput"

import {Range} from "~lib"

const props = withDefaults(
    defineProps<{
        value: Range,
        disabled?: boolean,
        hideLabels?: boolean,
    }>(), {
        disabled: false,
        hideLabels: false,
    }
)

const emit = defineEmits<{
    "update:value": [range: Range]
}>()

const range = computed(() =>
    typeof props.value === "number" ? {min: props.value, max: props.value} : props.value
)

function update(field: "min" | "max", value: number) {
    const newRange = {...range.value}
    newRange[field] = value
    if(field === "min" && newRange.max < newRange.min) {
        newRange.max = newRange.min
    }
    if(field === "max" && newRange.min > newRange.max) {
        newRange.min = newRange.max
    }
    emit("update:value", newRange)
}
</script>

<template>
    <VRow class="row">
        <VCol class="col">
            <VNumberInput
                    :label="hideLabels ? '' : 'min'"
                    :min="0"
                    :disabled="disabled"
                    :model-value="disabled ? '' : range.min"
                    :hide-details="true"
                    @update:model-value="update('min', Number($event))"
                    control-variant="stacked"
                    variant="outlined"
                    reverse
            />
        </VCol>
        <VCol class="col">
            <VNumberInput
                    :label="hideLabels ? '' : 'max'"
                    :min="0"
                    :disabled="disabled"
                    :model-value="disabled ? '' : range.max"
                    :hide-details="true"
                    @update:model-value="update('max', Number($event))"
                    control-variant="stacked"
                    variant="outlined"
            />
        </VCol>
    </VRow>
</template>

<style>
.row {
    align-items: center;
    min-width: 13em;
    width: fit-content;
}
.col {
    padding: 0 2px;
}
</style>