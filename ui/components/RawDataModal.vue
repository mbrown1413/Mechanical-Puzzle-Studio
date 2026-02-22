<script setup lang="ts">
import {ref, Ref} from "vue"

import {PuzzleFile} from "~lib"
import Modal from "~/ui/common/Modal.vue"
import {PuzzleStorage} from "~/ui/storage"

const modal: Ref<InstanceType<typeof Modal> | null> = ref(null)
const raw = ref("")
const error: Ref<string | null> = ref(null)

defineExpose({

    async openFromStorage(storage: PuzzleStorage, puzzleName: string) {
        [raw.value, error.value] = await storage.getRawFormatted(puzzleName)
        modal.value?.open()
    },

    openFromPuzzle(puzzleFile: PuzzleFile) {
        raw.value = puzzleFile.serialize(true)
        error.value = null
        modal.value?.open()
    },

})
</script>

<template>
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