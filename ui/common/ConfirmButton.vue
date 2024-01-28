<script setup lang="ts">
import {ref, Ref} from "vue"

import Modal from "~/ui/common/Modal.vue"

withDefaults(
    defineProps<{
        title?: string,
        text?: string,
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
        @click="modal?.open()"
    >
        <slot></slot>
    </VBtn>
    <Modal
            ref="modal"
            :title="title"
            :okText="confirmText"
            @ok="$emit('confirm')"
            :okColor="confirmButtonColor"
    >
        {{ text }}
    </Modal>
</template>