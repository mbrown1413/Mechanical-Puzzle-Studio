<script setup lang="ts">
import {ref} from "vue"

import {loadPlugins} from "~/ui/plugin.ts"

let pluginsLoaded = ref(false)
loadPlugins().then(() => {
    pluginsLoaded.value = true
})
</script>

<template>
    <VApp>
        <RouterView v-if="pluginsLoaded" />
    </VApp>
</template>