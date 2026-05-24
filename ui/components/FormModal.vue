<script setup lang="ts">
import {ref, Ref} from "vue"

import {Form, FormContext} from "~lib"

import Modal from "~/ui/common/Modal.vue"
import FormEditor from "~/ui/components/FormEditor.vue"

const isOpen = ref(false)
const modal: Ref<InstanceType<typeof Modal> | null> = ref(null)
const currentItem: Ref<object | undefined> = ref()
const currentForm: Ref<Form | undefined> = ref()
const currentTitle: Ref<string | undefined> = ref()
const currentContext: Ref<FormContext | undefined> = ref()

let currentResolve: ((item: object) => void) | null = null
let currentReject: (() => void) | null = null
function handleEdit(editData: object) {
    if(!currentItem) { return }
    Object.assign(currentItem, editData)
}

function handleOk() {
    if(currentResolve) {
        currentResolve(currentItem)
    }
    currentResolve = null
    currentReject = null
    isOpen.value = false
    modal.value?.close()
}

function handleCancel() {
    if(currentReject) {
        currentReject()
    }
    currentResolve = null
    currentReject = null
    isOpen.value = false
    modal.value?.close()
}

type OpenFormModalOptions = {
    item?: object
    form?: Form
    title?: string
    context?: FormContext
}

defineExpose({
    open({item, form, title="Edit Form", context}: OpenFormModalOptions): Promise<object> {
        currentItem.value = item
        currentForm.value = form
        currentTitle.value = title
        currentContext.value = context

        isOpen.value = true
        modal.value?.open()
        return new Promise((resolve, reject) => {
            currentResolve = resolve
            currentReject = reject
        })
    }
})
</script>

<template>
    <Modal
        ref="modal"
        :title="currentTitle || 'Edit Form'"
        @cancel="handleCancel"
        @ok="handleOk"
    >
        <FormEditor
            v-if="currentItem"
            :item="currentItem"
            :context="currentContext"
            @edit="handleEdit"
        />
    </Modal>
</template>
