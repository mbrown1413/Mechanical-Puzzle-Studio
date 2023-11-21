<script setup lang="ts">
import {ref} from "vue"

const props = withDefaults(
    defineProps<{
        tabs: {id: string, text: string}[],
        contentStyle: any,
    }>(), {
        contentStyle: {}
    }
)

const currentTabId = ref(props.tabs[0].id)
</script>

<template>
    <ul class="nav nav-tabs" role="tablist">
        <li v-for="tab in tabs" role="presentation">
            <button
                class="nav-link"
                :class="{active: tab.id === currentTabId}"
                :aria-selected="tab.id === currentTabId"
                @click="currentTabId = tab.id"
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