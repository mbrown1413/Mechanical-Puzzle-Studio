<script setup lang="ts">
import {ref, Ref} from "vue"
import {VBtn} from "vuetify/components"

import Modal from "~/ui/common/Modal.vue"

withDefaults(
    defineProps<{
        title?: string,
        text?: string,
        buttonColor?: VBtn["color"],
        buttonVariant?: VBtn["variant"],
        confirmText?: string,
        confirmButtonColor?: string,
    }>(), {
        title: "Confirm",
        text: "Are you sure?",
        confirmText: "Confirm",
        confirmButtonColor: undefined,
    }
)

defineEmits<{
    confirm: []
}>()

const modal: Ref<InstanceType<typeof Modal> | null> = ref(null)
</script>

<template>
    <VBtn
        :color="buttonColor"
        :variant="buttonVariant"
        @click="modal?.open()"
    >
        <slot></slot>
    </VBtn>
    <Modal
            ref="modal"
            :title="title"
            :okText="confirmText"
            @ok="$emit('confirm'); modal?.close()"
            :okColor="confirmButtonColor"
    >
        {{ text }}
    </Modal>
</template>