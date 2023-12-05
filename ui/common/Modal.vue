<script setup lang="ts">
import {ref} from "vue"

withDefaults(
    defineProps<{
        title: string,
        okText?: string,
        cancelShow?: boolean,
    }>(), {
        okText: "Ok",
        cancelShow: true,
    }
)

defineEmits<{
    ok: []
}>()

const modalOpen = ref(false)

defineExpose({
    open() { modalOpen.value = true },
    close() { modalOpen.value = false }
})
</script>

<template>
    <VDialog
            v-model="modalOpen"
            max-width="500px"
    >
        <VCard>
            <VCardTitle>
                <span class="text-h5">{{ title }}</span>
            </VCardTitle>

            <VCardText>
                <slot></slot>
            </VCardText>

            <VCardActions>
                <VSpacer />
                <VBtn
                        v-if="cancelShow"
                        color="blue-darken-1"
                        variant="text"
                        @click="modalOpen = false"
                >
                    Cancel
                </VBtn>
                <VBtn
                        color="blue-darken-1"
                        variant="text"
                        @click="$emit('ok')"
                >
                    {{ okText }}
                </VBtn>
            </VCardActions>
        </VCard>
    </VDialog>
</template>