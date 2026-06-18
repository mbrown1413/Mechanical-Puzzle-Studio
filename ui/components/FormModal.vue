<script setup lang="ts">
import {ref, Ref, ExtractPropTypes} from "vue"

import {Form, FormContext} from "~lib"

import {objectClone} from "~/ui/utils/objectClone.ts"
import Modal from "~/ui/common/Modal.vue"
import FormEditor from "~/ui/components/FormEditor.vue"

const isOpen = ref(false)
const modal: Ref<InstanceType<typeof Modal> | null> = ref(null)
const currentItem: Ref<object | undefined> = ref()
const currentForm: Ref<Form | undefined> = ref()
const currentTitle: Ref<string | undefined> = ref()
const currentContext: Ref<FormContext | undefined> = ref()
const currentModalProps: Ref<ExtractPropTypes<typeof Modal> | undefined> = ref()

let currentResolve: ((item: object | null) => void) | null = null

function handleEdit(editData: object) {
    if(!currentItem.value) { return }
    Object.assign(currentItem.value, editData)
}

function handleOk() {
    if(currentResolve && currentItem.value) {
        currentResolve(currentItem.value)
    }
    currentResolve = null
    isOpen.value = false
    modal.value?.close()
}

function handleCancel() {
    if(currentResolve) {
        currentResolve(null)
    }
    currentResolve = null
    isOpen.value = false
    modal.value?.close()
}

type OpenFormModalOptions = {
    item: object
    form?: Form
    title?: string
    context?: FormContext
    cloneItem?: (item: object) => object
    modalProps?: ExtractPropTypes<typeof Modal>
}

defineExpose({
    /** Open the modal with the given form, or use item.getForm() if no form is
     * given. A promise is returned which resolves when the modal is closed,
     * resolving to an edited version of the object, or null if the modal
     * was canceled. */
    open({
        item,
        form,
        title="Edit Form",
        context,
        cloneItem=objectClone,
        modalProps=undefined
    }: OpenFormModalOptions): Promise<object | null> {
        currentItem.value = cloneItem(item)
        currentForm.value = form
        currentTitle.value = title
        currentContext.value = context
        currentModalProps.value = modalProps

        isOpen.value = true
        modal.value?.open()
        return new Promise<object | null>((resolve) => {
            currentResolve = resolve
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
        v-bind="currentModalProps"
    >
        <FormEditor
            v-if="currentItem"
            :item="currentItem"
            :form="currentForm"
            :context="currentContext"
            @edit="handleEdit"
        />
    </Modal>
</template>