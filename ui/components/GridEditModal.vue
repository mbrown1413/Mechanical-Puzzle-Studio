<script setup lang="ts">
import {computed, ref, Ref} from "vue"

import {Grid, CubicGrid, Puzzle, clone, listSubclasses, getRegisteredClass} from "~lib"

import {GridSetAction} from "~/ui/actions.ts"
import Modal from "~/ui/common/Modal.vue"
import FormEditor from "./FormEditor.vue"

const props = defineProps<{
    puzzle: Puzzle,
    initialConfig: boolean
}>()

const emit = defineEmits<{
    action: [GridSetAction]
}>()

defineExpose({
    open() {
        grid.value = clone(props.puzzle.grid)
        gridTypeInstances[grid.value.constructor.name] = grid.value
        modal.value?.open()
    },
})

const modal: Ref<InstanceType<typeof Modal> | null> = ref(null)
const grid = ref(new CubicGrid() as never) as Ref<Grid>

// Maps grid class name to instance.
// Stores persistent instances for tracking grids which aren't currently
// selected. This prevents parameters from being cleared, so they are not
// changed if the user switches to another type and back.
const gridTypeInstances: Record<string, Grid> = {}

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

const showWarning = computed(() =>
    props.puzzle.pieces.filter(piece => piece.voxels.length > 0).length > 0
)

function changeGridType(gridClassName: string) {
    if(gridTypeInstances[gridClassName]) {
        grid.value = gridTypeInstances[gridClassName]
        return
    }

    const gridClass = getRegisteredClass(Grid, gridClassName)
    if(gridClass) {
        grid.value = new gridClass()
        gridTypeInstances[gridClassName] = grid.value
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
        :cancelShow="!initialConfig"
        :persistent="initialConfig"
        @ok="onSubmit"
    >
        <VSelect
            label="Grid Type"
            :items="gridItems"
            :model-value="grid.constructor.name"
            :hint="gridTypeDescription"
            persistent-hint
            @update:modelValue="changeGridType($event)"
        />
        <FormEditor
            :item="grid"
            @edit="Object.assign(grid, $event)"
        />
        <VAlert
            v-if="showWarning"
            type="warning"
            title="Warning!"
            class="mt-4"
        >
            Changing grid types and parameters may affect existing pieces in
            unexpected ways. Voxels which don't fit into the new grid's
            coordinate system, and all solutions will be removed.
        </VAlert>
    </Modal>
</template>