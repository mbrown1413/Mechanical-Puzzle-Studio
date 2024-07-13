<script setup lang="ts">
import {computed} from "vue"
import {VBtn} from "vuetify/components/VBtn"

import {UiButtonDefinition} from "~/ui/ui-buttons.ts"

const props = withDefaults(
    defineProps<{
        uiButton: UiButtonDefinition,
        disabled?: boolean,
        variant?: "icon" | "text",
        vBtnVariant?: VBtn["$props"]["variant"]
    }>(), {
        disabled: false,
        variant: "icon",
        vBtnVariant: undefined,
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
                    @click="$emit('click'); uiButton.perform()"
                    :variant="vBtnVariant"
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