<script setup lang="ts">
import {ref, Ref} from "vue"

import {PuzzleFile} from "~lib"
import {EditPuzzleMetadataAction} from "~/ui/actions.ts"
import {PuzzleStorage} from "~/ui/storage.ts"
import Modal from "~/ui/common/Modal.vue"

defineProps<{
    puzzleFile: PuzzleFile,
    storage: PuzzleStorage,
}>()

defineExpose({
    open() {
        modal.value?.open()
    }
})

const emit = defineEmits<{
    action: [EditPuzzleMetadataAction]
}>()

const modal: Ref<InstanceType<typeof Modal> | null> = ref(null)

function handleTextInput(attribute: string, value: string) {
    const metadata: any = {}
    metadata[attribute] = value
    const action = new EditPuzzleMetadataAction(metadata)
    emit("action", action)
}
</script>

<template>
    <Modal
        ref="modal"
        :title="puzzleFile.name"
        :cancelShow="false"
        @ok="modal?.close()"
    >

        <VTable>
            <tr>
                <th>Save Location</th>
                <td>{{ storage.name }}</td>
            </tr>
            <tr>
                <th>Created</th>
                <td>{{ puzzleFile.createdUTCString }}</td>
            </tr>
            <tr>
                <th>Modified</th>
                <td>{{ puzzleFile.modifiedUTCString }}</td>
            </tr>
        </VTable>

        <VTextField
            label="Author"
            :model-value="puzzleFile.author"
            @input="handleTextInput('author', $event.target.value)"
        />

        <VTextarea
            label="Description"
            :model-value="puzzleFile.description"
            @input="handleTextInput('description', $event.target.value)"
        />

    </Modal>
</template>

<style scoped>
.v-table {
    margin-bottom: 2em;
}
.v-table th {
    text-align: right;
    padding-right: 1.5em;
}
.v-table td {
    text-align: left;
}
</style>