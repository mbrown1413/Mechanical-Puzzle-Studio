<script setup lang="ts">
import {onMounted, Ref, ref} from "vue"

import {loadPlugins} from "~/ui/plugin.ts"
import FormModal from "~/ui/components/FormModal.vue"
import {setGlobalFormModal} from "~/ui/globals.ts"

const formModal: Ref<InstanceType<typeof FormModal> | null> = ref(null)

let pluginsLoaded = ref(false)
loadPlugins().then(() => {
    pluginsLoaded.value = true
})

onMounted(() => {
    if(formModal.value) {
        setGlobalFormModal(formModal.value)
    }
})
</script>

<template>
    <VApp>
        <RouterView v-if="pluginsLoaded" />
        <FormModal ref="formModal" />
    </VApp>
</template>