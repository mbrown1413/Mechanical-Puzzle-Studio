<script setup lang="ts">

withDefaults(
    defineProps<{
        tabs: {id: string, text: string}[],
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
</script>

<template>
    <VTabs
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
        :model-value="currentTabId"
    >
        <VWindowItem
                v-for="tab in tabs"
                :value="tab.id"
        >
            <slot :name="tab.id"></slot>
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