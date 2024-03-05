<!--
    Button which opens a confirmation dialog before performing an action
    (emitting the @confirm event).
-->

<script setup lang="ts">
import {ref, Ref} from "vue"
import {VBtn} from "vuetify/components"

import Modal from "~/ui/common/Modal.vue"

withDefaults(
    defineProps<{
        title?: string,
        tooltip?: string | null,
        text?: string,
        buttonColor?: VBtn["color"],
        buttonVariant?: VBtn["variant"],
        confirmText?: string,
        confirmButtonColor?: string,
        disabled?: boolean,
    }>(), {
        title: "Confirm",
        tooltip: null,
        text: "Are you sure?",
        confirmText: "Confirm",
        confirmButtonColor: undefined,
        disabled: false,
    }
)

defineEmits<{
    confirm: []
}>()

const modal: Ref<InstanceType<typeof Modal> | null> = ref(null)
</script>

<template>
    <VTooltip :text="tooltip || ''">
        <template v-slot:activator="{props}">
            <VBtn
                :color="buttonColor"
                :variant="buttonVariant"
                :disabled="disabled"
                @click="modal?.open()"
                v-bind="tooltip ? props : {}"
            >
                <slot></slot>
            </VBtn>
        </template>
    </VTooltip>

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