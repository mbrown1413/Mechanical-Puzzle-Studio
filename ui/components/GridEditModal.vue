<script setup lang="ts">
import {ref, Ref} from "vue"

import {Grid, CubicGrid, Puzzle, clone, listSubclasses, getRegisteredClass} from "~lib"

import {GridSetAction} from "~/ui/actions.ts"
import Modal from "~/ui/common/Modal.vue"

const props = defineProps<{
    puzzle: Puzzle,
}>()

const emit = defineEmits<{
    action: [GridSetAction]
}>()

defineExpose({
    open() {
        grid.value = clone(props.puzzle.grid)
        modal.value?.open()
    },
})

const modal: Ref<InstanceType<typeof Modal> | null> = ref(null)
const grid = ref(new CubicGrid() as never) as Ref<Grid>

const gridItems = listSubclasses(Grid).map((gridClass) => {
    return {
        title: gridClass.name,
        value: gridClass.name,
    }
})

function changeGridType(gridClassName: string) {
    const gridClass = getRegisteredClass(Grid, gridClassName)
    if(gridClass) {
        grid.value = new gridClass()
    } else {
        throw new Error(`Grid type ${gridClassName} not found`)
    }
}

function onSubmit() {
    const action = new GridSetAction(grid.value)
    emit("action", action)
    modal.value?.close()
}
</script>

<template>
    <Modal
        ref="modal"
        title="Configure Grid"
        :cancelShow="false"
        @ok="onSubmit"
        persistent
    >
        <VSelect
            label="Grid Type"
            :items="gridItems"
            :model-value="grid.constructor.name"
            @update:modelValue="changeGridType($event)"
        />
    </Modal>
</template>