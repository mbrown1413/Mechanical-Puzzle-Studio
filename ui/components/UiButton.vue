<script setup lang="ts">
import {computed} from "vue"
import {VBtn} from "vuetify/components/VBtn"

import {UiButtonDefinition} from "~/ui/ui-buttons.ts"

const props = withDefaults(
    defineProps<{
        uiButton: UiButtonDefinition,
        disabled?: boolean,
        btnClass?: string,
        variant?: "icon" | "text",
        vBtnVariant?: VBtn["$props"]["variant"]
        vBtnDensity?: VBtn["$props"]["density"]
    }>(), {
        disabled: false,
        btnClass: undefined,
        variant: "icon",
        vBtnVariant: undefined,
        vBtnDensity: undefined,
    }
)

defineEmits<{
    click: [],
}>()

const disabled = computed(() => {
    if(props.disabled || props.uiButton.enabled === undefined) {
        return false
    } else {
        return !props.uiButton.enabled()
    }
})

const text = computed(() =>
    typeof props.uiButton.text === 'string' ? props.uiButton.text : props.uiButton.text()
)
</script>

<template>
    <VTooltip
        :text="text"
        :modelValue="uiButton.alwaysShowTooltip ? true : undefined"
        contentClass="tooltip-arrow-up"
        location="bottom"
        :disabled="variant === 'text'"
    >
        <template v-slot:activator="{props}">
            <!-- Wrap in span so tooltips show on disabled buttons -->
            <span v-bind="props">
                <VBtn
                    rounded
                    :disabled="disabled"
                    :class="btnClass"
                    @click="$emit('click'); uiButton.perform()"
                    :variant="vBtnVariant"
                    :density="vBtnDensity"
                >
                    <VIcon
                        v-if="variant === 'icon' && uiButton.icon"
                        :icon="uiButton.icon"
                        :aria-label="text"
                        aria-hidden="false"
                    />
                    <template v-else>{{ text }}</template>
                </VBtn>
            </span>
        </template>
    </VTooltip>
</template>