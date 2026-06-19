<script setup lang="ts">
import {ref, Ref, ExtractPropTypes} from "vue"

import {Form, FormContext} from "~lib"

import {objectClone} from "~/ui/utils/objectClone.ts"
import Modal from "~/ui/common/Modal.vue"
import FormEditor from "~/ui/components/FormEditor.vue"

const modal: Ref<InstanceType<typeof Modal> | null> = ref(null)

type CurrentData = {
    item: object,
    form: Form
    title: string
    context: FormContext
    modalProps: ExtractPropTypes<typeof Modal>
    resolve: ((item: object | null) => void)
}

const current = ref<CurrentData | null>(null)


function handleEdit(editData: object) {
    if(!current.value) { return }
    Object.assign(current.value.item, editData)
}

function handleOk() {
    if(current.value) {
        current.value.resolve(current.value.item)
    }
    modal.value?.close().then(() => {
        current.value = null
    })
}

function handleCancel() {
    if(current.value) {
        current.value.resolve(null)
    }
    modal.value?.close().then(() => {
        current.value = null
    })
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
        return new Promise<object | null>((resolve) => {
            current.value = {
                item: cloneItem(item),
                form,
                title,
                context,
                modalProps,
                resolve,
            } as CurrentData
            modal.value?.open()
        })
    }
})
</script>

<template>
    <Modal
        ref="modal"
        :title="current?.title || 'Edit Form'"
        @cancel="handleCancel"
        @ok="handleOk"
        v-bind="current?.modalProps"
    >
        <FormEditor
            v-if="current?.item"
            :item="current?.item"
            :form="current?.form"
            :context="current?.context as FormContext"
            @edit="handleEdit"
        />
    </Modal>
</template>