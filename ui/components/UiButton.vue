<script setup lang="ts">
import { computed } from "vue";
import {UiButtonDefinition} from "~/ui/ui-buttons.ts"

const props = withDefaults(
    defineProps<{
        uiButton: UiButtonDefinition,
        disabled?: boolean,
    }>(), {
        disabled: false,
    }
)

const disabled = computed(() => {
    if(props.disabled || props.uiButton.enabled === undefined) {
        return false
    } else {
        return !props.uiButton.enabled()
    }
})
</script>

<template>
    <VTooltip
        :text="typeof uiButton.text === 'string' ? uiButton.text : uiButton.text()"
        location="bottom"
    >
        <template v-slot:activator="{props}">
            <!-- Wrap in span so tooltips show on disabled buttons -->
            <span v-bind="props">
                <VBtn
                    rounded
                    :disabled="disabled"
                    @click="uiButton.perform()"
                >
                    <VIcon v-if="uiButton.icon" :icon="uiButton.icon" :aria-label="uiButton.text" aria-hidden="false" />
                </VBtn>
            </span>
        </template>
    </VTooltip>
</template>