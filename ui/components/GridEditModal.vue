<script setup lang="ts">
import {computed, ref, Ref} from "vue"

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

const gridItems = listGridClasses().map((gridClass) => {
    return {
        title: gridClass.gridTypeName,
        value: gridClass.name,
        description: gridClass.gridTypeDescription,
    }
})

const gridTypeDescription = computed(() => {
    const item = gridItems.find(item => item.value === grid.value.constructor.name)
    return item?.description || ""
})

function changeGridType(gridClassName: string) {
    const gridClass = getRegisteredClass(Grid, gridClassName)
    if(gridClass) {
        grid.value = new gridClass()
    } else {
        throw new Error(`Grid type ${gridClassName} not found`)
    }
}

function listGridClasses() {
    const gridClasses = []
    for(const gridClass of listSubclasses(Grid)) {
        gridClasses.push(
            gridClass as unknown as typeof Grid
        )
    }
    return gridClasses
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
            :hint="gridTypeDescription"
            persistent-hint
            @update:modelValue="changeGridType($event)"
        />
    </Modal>
</template>