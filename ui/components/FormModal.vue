<script setup lang="ts">
import {ref, Ref, toRaw} from "vue"

import {Form, FormContext} from "~lib"

import Modal from "~/ui/common/Modal.vue"
import FormEditor from "~/ui/components/FormEditor.vue"

const isOpen = ref(false)
const modal: Ref<InstanceType<typeof Modal> | null> = ref(null)
const currentItem: Ref<object | undefined> = ref()
const currentForm: Ref<Form | undefined> = ref()
const currentTitle: Ref<string | undefined> = ref()
const currentContext: Ref<FormContext | undefined> = ref()

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

function defaultCloneItem(item: object): object {
    if(item === null || typeof item !== "object") {
        return item
    }
    const raw = toRaw(item)

    if(Array.isArray(raw)) {
        const copy: unknown[] = []
        for(const item of raw) {
            copy.push(defaultCloneItem(item))
        }
        return copy

    } else if(raw instanceof Date) {
        return new Date(raw)

    } else if(raw instanceof Map) {
        const copy = new Map()
        for(const [key, mapValue] of raw) {
            copy.set(
                defaultCloneItem(key),
                defaultCloneItem(mapValue),
            )
        }
        return copy

    } else if(raw instanceof Set) {
        const copy = new Set()
        for(const item of raw) {
            copy.add(defaultCloneItem(item))
        }
        return copy
    }

    const copy = Object.create(Object.getPrototypeOf(raw))
    for(const key of Reflect.ownKeys(raw)) {
        const descriptor = Object.getOwnPropertyDescriptor(raw, key)
        if(!descriptor || !descriptor.enumerable) {
            continue
        }
        if("value" in descriptor) {
            descriptor.value = defaultCloneItem(descriptor.value)
        }
        Object.defineProperty(copy, key, descriptor)
    }
    return copy
}

type OpenFormModalOptions = {
    item: object
    form?: Form
    title?: string
    context?: FormContext
    cloneItem?: (item: object) => object
}

defineExpose({
    /** Open the modal with the given form, or use item.getForm() if no form is
     * given. A promise is returned which resolves when the modal is closed,
     * resolving to an edited version of the object, or null if the modal
     * was canceled. */
    open({item, form, title="Edit Form", context, cloneItem=defaultCloneItem}: OpenFormModalOptions): Promise<object | null> {
        currentItem.value = cloneItem(item)
        currentForm.value = form
        currentTitle.value = title
        currentContext.value = context

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