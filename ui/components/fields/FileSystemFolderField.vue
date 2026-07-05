<script setup lang="ts">
import {computed} from "vue"

import {StoredFileSystemHandle} from "~/ui/utils/StoredFileSystemHandle.ts"
import {FileSystemFolderField} from "~lib"

const props = defineProps<{
    item: object
    field: FileSystemFolderField
}>()

const emit = defineEmits<{
    "edit": [editData: object]
}>()

const value = computed(() => {
    const value = (props.item as any)[props.field.property]
    return value instanceof StoredFileSystemHandle ? value : null
})

async function pickFolder() {
    const handle = await (window as any).showDirectoryPicker({mode: "readwrite"})
    const editData: any = {}
    editData[props.field.property] = await StoredFileSystemHandle.create(handle)
    emit("edit", editData)
}
</script>

<template>
    <VRow>
        <VCol>
            <VBtn
                prepend-inner-icon="mdi-paperclip"
                @click="pickFolder"
            >
                Folder: {{ value?.name || "-" }}
            </VBtn>
        </VCol>
    </VRow>
</template>