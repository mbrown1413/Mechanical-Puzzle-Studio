<script setup lang="ts">
import {ref} from "vue"
import {VDialog} from "vuetify/components"

withDefaults(
    defineProps<{
        title: string,
        persistent?: boolean,

        okText?: string,
        okColor?: string,
        okShow?: boolean,

        cancelText?: string,
        cancelShow?: boolean,

        dialogMaxWidth?: VDialog["maxWidth"],
    }>(), {
        persistent: false,

        okText: "Ok",
        okColor: "blue-darken-1",
        okShow: true,

        cancelText: "Cancel",
        cancelShow: true,

        dialogMaxWidth: "500px",
    }
)

defineEmits<{
    ok: []
    cancel: []
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
            :maxWidth="dialogMaxWidth"
            :persistent="persistent"
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
                        variant="outlined"
                        @click="modalOpen = false; $emit('cancel')"
                >
                    {{ cancelText }}
                </VBtn>
                <VBtn
                        v-if="okShow"
                        :color="okColor"
                        variant="elevated"
                        @click="$emit('ok')"
                >
                    {{ okText }}
                </VBtn>
            </VCardActions>
        </VCard>
    </VDialog>
</template>