<script setup lang="ts">
import {Modal} from "bootstrap"

import {makeUniqueId} from '../tools';
import {computed, onBeforeUnmount, ref, Ref} from "vue";

withDefaults(
    defineProps<{
        title: string,
        okText?: string,
        cancelShow?: boolean,
    }>(), {
        okText: "Ok",
        cancelShow: true,
    }
)

defineEmits<{
    ok: []
}>()

const labelId = makeUniqueId()
const modalElement: Ref<HTMLDivElement | null> = ref(null)

const modal = computed(() => {
    if(modalElement.value === null) return null
    return new Modal(modalElement.value)
})

onBeforeUnmount(() => {
    modal.value?.dispose()
})

defineExpose({
    open() {
        modal.value?.show()
    }
})
</script>

<template>
    <div
        class="modal fade"
        tabindex="-1"
        ref="modalElement"
        :aria-labelledby="labelId"
        aria-hidden="true"
    >
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header">
                    <h1
                        class="modal-title fs-5"
                        :id="labelId"
                    >
                        {{ title }}
                    </h1>
                    <button
                        type="button"
                        class="btn-close"
                        data-bs-dismiss="modal"
                        aria-label="Close"
                    ></button>
                </div>
                <div class="modal-body">
                    <slot></slot>
                </div>
                <div class="modal-footer">
                    <button
                        type="button"
                        class="btn btn-secondary"
                        data-bs-dismiss="modal"
                        v-if="cancelShow"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        class="btn btn-primary"
                        @click="$emit('ok')"
                    >
                        {{ okText }}
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>