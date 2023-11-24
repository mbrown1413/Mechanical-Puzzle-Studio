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
    <ul class="nav nav-tabs" role="tablist">
        <li v-for="tab in tabs" role="presentation">
            <button
                class="nav-link"
                :class="{active: tab.id === currentTabId}"
                :aria-selected="tab.id === currentTabId"
                @click="emit('update:currentTabId', tab.id)"
            >
                {{ tab.text }}
            </button>
        </li>
    </ul>

    <div class="tab-content" :style="contentStyle">
        <template v-for="tab in tabs">
            <slot
                :name="tab.id"
                v-if="tab.id === currentTabId"
            ></slot>
        </template>
    </div>
</template>

<style scoped>
ul {
    background-color: #dddddd;
}
</style>