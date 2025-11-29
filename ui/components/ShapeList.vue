<script setup lang="ts">
import {computed, inject, ref} from "vue"

import {Puzzle, Shape, ShapeId} from "~lib"

import {Action} from "~/ui/actions.ts"
import {UiButtonDefinition} from "~/ui/ui-buttons.ts"
import ListSelect from "~/ui/common/ListSelect.vue"

const props = defineProps<{
    puzzle: Puzzle,
    selectedShapeId: ShapeId | null,
    selectedShapeGroupId: ShapeId | null,
}>()

const emit = defineEmits<{
    "update:selectedShapeId": [shapeId: ShapeId | null],
    "update:selectedShapeGroupId": [shapeGroupIdx: number | null],
    action: [action: Action]
}>()

const focused = ref(false)

defineExpose({
    setFocus(focus: boolean) {
        focused.value = focus
    }
})

const allUiButtons = inject("uiButtons") as Record<string, UiButtonDefinition>
const uiButtons = computed(() => {
    const newShapeButton = {...allUiButtons.newShape}
    if(
        focused.value &&
        props.puzzle.shapes.length === 0
    ) {
        newShapeButton.alwaysShowTooltip = true
    }

    return [
        allUiButtons.duplicateShape,
        allUiButtons.deleteSelectedItem,
        newShapeButton,
    ]
})

const items = computed(() => {
    return props.puzzle.shapeTree.map((item) => {
        if(item instanceof Shape) {
            return item
        } else {
            return {
                isGroup: true,
                id: item.id,
                label: item.label,
                items: item.shapes,
            }
        }
    })
})
</script>

<template>
    <ListSelect
        :items="items"
        :selectedItemId="selectedShapeId"
        :selectedGroupId="selectedShapeGroupId"
        :uiButtons="uiButtons"
        :upButton="allUiButtons.shapeListMoveUp"
        :downButton="allUiButtons.shapeListMoveDown"
        @update:selectedItemId="emit('update:selectedShapeId', $event)"
        @update:selectedGroupId="emit('update:selectedShapeGroupId', $event)"
    />
</template>