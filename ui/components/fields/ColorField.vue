<script setup lang="ts">
import {computed, ref, Ref} from "vue"

import {ColorField, FormEditable, swatches} from "~lib"

import Modal from "~/ui/common/Modal.vue"

const props = defineProps<{
    item: FormEditable
    field: ColorField
}>()

const emit = defineEmits<{
    "edit": [editData: object]
}>()

const currentColor = computed(() => (props.item as any)[props.field.property])
const temporaryColor = ref(currentColor.value)
const modal: Ref<InstanceType<typeof Modal> | null> = ref(null)

function onOpen() {
    temporaryColor.value = currentColor.value
    modal.value?.open()
}

function onOk() {
    modal.value?.close()
    const editData: any = {}
    editData[props.field.property] = temporaryColor.value
    emit("edit", editData)
}
</script>

<template>
    <VBtn
        :color="currentColor"
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