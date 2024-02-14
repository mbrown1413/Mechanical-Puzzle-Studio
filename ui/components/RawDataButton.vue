<script setup lang="ts">
import {ref, Ref} from "vue"

import Modal from "~/ui/common/Modal.vue"
import {PuzzleStorage} from "~/ui/storage"

const props = defineProps<{
    storage: PuzzleStorage,
    puzzleName: string,
}>()

const modal: Ref<InstanceType<typeof Modal> | null> = ref(null)
const raw = ref("")
const error: Ref<string | null> = ref(null)

function open() {
    [raw.value, error.value] = props.storage.getRawFormatted(props.puzzleName)
    modal.value?.open()
}
</script>

<template>
    <VTooltip text="Raw Data">
        <template v-slot:activator="{props}">
            <VBtn
                @click="open"
                v-bind="props"
            >
                <VIcon icon="mdi-code-braces" aria-label="Raw Data" aria-hidden="false" />
            </VBtn>
        </template>
    </VTooltip>

    <Modal
            ref="modal"
            title="Raw Data"
            okText="Ok"
            :cancelShow="false"
            dialogMaxWidth=""
            @ok="modal?.close()"
    >
        <VCard
            v-if="error"
            class="mb-5"
            color="red-lighten-4"
        >
            Could not format raw data:<br>
            {{ error }}
        </VCard>
        <code>{{ raw }}</code>
    </Modal>
</template>