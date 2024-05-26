<script setup lang="ts">
import {computed} from 'vue'


const props = withDefaults(
    defineProps<{
        tabs: {
            id: string,
            text: string
            slot?: string,
        }[],
        currentTabId: string,
        contentStyle: any,
    }>(), {
        contentStyle: {},
        currentTabId: undefined,
    }
)

const emit = defineEmits<{
    "update:currentTabId": [value: string]
}>()

const slotNames = computed(() =>
    [...new Set(
        props.tabs.map(tab => tab.slot || tab.id)
    )]
)

const currentWindowSlot = computed(() => {
    const tab = props.tabs.find(
        tab => tab.id === props.currentTabId
    )
    if(tab === undefined) { return null }
    return tab.slot || tab.id
})
</script>

<template>
    <VTabs
            v-bind:model-value="currentTabId"
            @update:model-value="emit('update:currentTabId', $event as string)"
    >
        <VTab
                v-for="tab in tabs"
                :value="tab.id"
        >
            {{ tab.text }}
        </VTab>
    </VTabs>

    <VWindow
        :modelValue="currentWindowSlot"
    >
        <VWindowItem
                v-for="slotName in slotNames"
                :value="slotName"
        >
            <slot :name="slotName"></slot>
        </VWindowItem>
    </VWindow>
</template>

<style scoped>
.v-tabs:deep(.v-btn) {
  padding: 0 8px;
}

.v-window {
    flex-grow: 1;
}
.v-window:deep(.v-window__container), .v-window-item {
    height: 100%;
}
</style>