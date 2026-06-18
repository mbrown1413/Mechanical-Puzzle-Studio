<script setup lang="ts">
import {WatchStopHandle, ref, watch} from "vue"
import {VCard, VDialog, VForm} from "vuetify/components"

withDefaults(
    defineProps<{
        title: string,
        persistent?: boolean,
        icon?: string

        okText?: string,
        okColor?: string,
        okShow?: boolean,

        cancelText?: string,
        cancelShow?: boolean,

        dialogMaxWidth?: VDialog["maxWidth"],
    }>(), {
        persistent: false,

        okText: "Ok",
        okColor: "blue-darken-1",
        okShow: true,

        cancelText: "Cancel",
        cancelShow: true,

        dialogMaxWidth: "500px",
    }
)

defineEmits<{
    ok: []
    cancel: []
}>()

const modalOpen = ref(false)

let closeResolve: (() => void) | null = null
function onAfterLeave() {
    if(closeResolve) {
        closeResolve()
    }
}

defineExpose({

    /** Opens modal and returns a promise which resolves when dialog starts closing. */
    open() {
        modalOpen.value = true
        return new Promise<void>(resolve => {
            let stopHandle: WatchStopHandle
            stopHandle = watch(modalOpen, newValue => {
                if(!newValue) {
                    resolve()
                    stopHandle()
                }
            })
        })
    },

    /** Closes modal and returns a promise which resolves when close transition finishes. */
    close() {
        const promise = new Promise<void>((resolve) => {
            closeResolve = resolve
        })
        modalOpen.value = false
        return promise
    },

})
</script>

<template>
    <VDialog
        v-model="modalOpen"
        :maxWidth="dialogMaxWidth"
        :persistent="persistent"
        @afterLeave="onAfterLeave"
    >
        <VForm @submit.prevent="$emit('ok')">
            <VCard>
                <VCardTitle>
                    <VIcon v-if="icon" :icon="icon" />
                    <span class="text-h5">{{ title }}</span>
                </VCardTitle>

                <VCardText>
                    <slot></slot>
                </VCardText>

                <VCardActions>
                    <VSpacer />
                    <VBtn
                            v-if="cancelShow"
                            color="blue-darken-1"
                            variant="outlined"
                            @click="modalOpen = false; $emit('cancel')"
                    >
                        {{ cancelText }}
                    </VBtn>
                    <VBtn
                            v-if="okShow"
                            :color="okColor"
                            variant="elevated"
                            type="submit"
                            @click="$emit('ok')"
                    >
                        {{ okText }}
                    </VBtn>
                </VCardActions>
            </VCard>
        </VForm>
    </VDialog>
</template>