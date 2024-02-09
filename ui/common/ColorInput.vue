<!-- A button which opens a modal for picking a color. -->

<script setup lang="ts">
import {ref, Ref} from "vue"

import {swatches} from "~lib"
import Modal from "~/ui/common/Modal.vue"

const props = defineProps<{
    value: string,
}>()

const emit = defineEmits<{
    input: [value: string],
}>()

const modal: Ref<InstanceType<typeof Modal> | null> = ref(null)

const temporaryColor = ref(props.value)

function onOpen() {
    temporaryColor.value = props.value
    modal.value?.open()
}

function onOk() {
    modal.value?.close()
    emit("input", temporaryColor.value)
}

</script>

<template>
    <VBtn
        :color="value"
        @click="onOpen"
        class="color-input-button"
    >
        Color
    </VBtn>
    <Modal
        ref="modal"
        class="color-input-modal"
        title=""
        @ok="onOk"
    >
        <VColorPicker
            v-model="temporaryColor"
            :modes="['rgb', 'hsl', 'hex']"
            show-swatches
            :swatches="swatches"
        />
    </Modal>
</template>

<style>
.color-input-button {
    border-radius: 10px;
}
.color-input-modal .v-overlay__content {
    width: unset !important;
}
</style>