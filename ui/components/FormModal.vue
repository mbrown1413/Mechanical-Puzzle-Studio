<script setup lang="ts">
import {ref, Ref, ExtractPropTypes, computed} from "vue"

import {Form, FormContext, isFormEditable} from "~lib"

import {objectClone} from "~/ui/utils/objectClone.ts"
import Modal from "~/ui/common/Modal.vue"
import FormEditor from "~/ui/components/FormEditor.vue"

const modal: Ref<InstanceType<typeof Modal> | null> = ref(null)

type CurrentData = {
    item: object,
    form?: Form
    title: string
    context: FormContext
    modalProps: ExtractPropTypes<typeof Modal>
    errors: string[]
    resolve: ((item: object | null) => void)
}

const current = ref<CurrentData | null>(null)

const activeForm = computed(() => {
    if(current.value === null) { return null }
    if(current.value.form) { return current.value.form }
    if(isFormEditable(current.value.item)) {
        return current.value.item.getForm(current.value.context as FormContext)
    }
    throw new Error("Item is not form editable and no form was provided.")
})


function handleEdit(editData: object) {
    if(!current.value) { return }
    Object.assign(current.value.item, editData)
}

function handleOk() {
    if(!current.value) { return }
    current.value.errors = []

    const validate = activeForm.value?.validate
    if(validate) {
        current.value.errors = validate(current.value.item, current.value.context as FormContext)
        if(current.value.errors.length) {
            return
        }
    }

    current.value.resolve(current.value.item)
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
                errors: [],
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
        <VAlert
            v-if="current?.errors.length"
            type="error"
            variant="tonal"
            density="compact"
            class="mt-4"
        >
            <div v-for="error in current.errors">
                {{ error }}
            </div>
        </VAlert>
    </Modal>
</template>