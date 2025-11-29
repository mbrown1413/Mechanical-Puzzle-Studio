<script setup lang="ts">
import {computed, ref, Ref} from "vue"

import {Puzzle, ShapeId, Voxel, Viewpoint} from  "~lib"

import {Action, EditShapeAction} from "~/ui/actions.ts"
import GridDisplay from "~/ui/components/GridDisplay.vue"

const props = defineProps<{
    puzzle: Puzzle,
    shapeId: ShapeId | null,
    auxEditArea: HTMLElement | null,
    displayShapeIds?: ShapeId[]  // Shapes to display but not edit
}>()

const emit = defineEmits<{
    action: [action: Action]
}>()

const toggles: Ref<string[]> = ref([])
const highlightedVoxels: Ref<Voxel[]> = ref([])
const viewpoint: Ref<Viewpoint | undefined> = ref()
const layerN: Ref<number | undefined> = ref()

const shape = computed(() =>
    props.shapeId === null ? null : props.puzzle.getShape(props.shapeId) || null
)

const group = computed(() => {
    if(!shape.value) { return null }
    return props.puzzle.getShapeGroupFromShape(shape.value)
})

const shapes = computed(() => {
    const shapes = shape.value === null ? [] : [shape.value]
    for(const displayShapeId of props.displayShapeIds || []) {
        if(displayShapeId === shape.value?.id) continue
        const displayShape = props.puzzle.getShape(displayShapeId)
        if(displayShape) {
            shapes.push(displayShape)
        }
    }

    if(togglePressed(groupVisibilityToggle.value) && group.value?.displayCombined) {
        shapes.push(...group.value.shapes)
    }

    return shapes
})

function voxelsClicked(event: MouseEvent, voxels: Voxel[]) {
    if(shape.value === null) { return }

    let toAdd: Voxel[] = []
    let toRemove: Voxel[] = []
    if(event.ctrlKey || event.button === 2) {
        toRemove = voxels
    } else {
        toAdd = voxels
    }
    if(shape.value.id === null) {
        throw new Error("Cannot edit shape with no ID")
    }

    const action = new EditShapeAction(
        shape.value.id,
        toAdd,
        toRemove,
        togglePressed(optionalVoxelToggle.value),
    )
    if(action.wouldModify(props.puzzle)) {
        emit("action", action)
    }
}

const optionalVoxelToggle = computed(() => {
    return {
        value: "optional",
        visible: true,
        icon: "mdi-checkerboard",
        text: "Optional voxel draw",
    }
})

const cameraSchemeToggle = computed(() => {
    const pressed = toggles.value.includes("2d")
    return {
        value: "2d",
        visible: true,
        icon: pressed ? "mdi-cube-off-outline" : "mdi-cube-outline",
        text: pressed ? "2D" : "3D"
    }
})

const groupVisibilityToggle = computed(() => {
    const pressed = toggles.value.includes("groupVisible")
    return {
        value: "groupVisible",
        visible: Boolean(group.value?.displayCombined),
        icon: pressed ? "mdi-vector-combine" : "mdi-vector-difference-ba",
        text: "Combined view",
    }
})

const toggleButtons = computed(() =>
    [
        groupVisibilityToggle,
        optionalVoxelToggle,
        cameraSchemeToggle,
    ].filter(
        button => button.value.visible
    ).map(
        button => button.value
    )
)

function togglePressed(toggle: {value: string}): boolean {
    return toggles.value.includes(toggle.value)
}

const gridDisplayProps = computed(() => {
    const common = {
        grid: props.puzzle.grid,
        shapes: shapes.value,
        highlightedVoxels: highlightedVoxels.value,
        viewpoint: viewpoint.value,
        layerN: layerN.value,
        boundsSizing: "shapeBounds" as const,
    }
    const threeD = {
        cameraScheme: "3D" as const,
    }
    const twoD = {
        cameraScheme: "2D" as const,
        boxToolEnabled: true,
    }
    return {
        main: {
            ...common,
            ...(togglePressed(cameraSchemeToggle.value) ? twoD : threeD),
            showTools: true,
        },
        aux: {
            ...common,
            ...(togglePressed(cameraSchemeToggle.value) ? threeD : twoD),
            showLayerSlider: false,
        },
    }
})
</script>

<template>
    <div style="width: 100%; height: 100%;">
        <GridDisplay
            v-bind="gridDisplayProps.main"
            @update:highlightedVoxels="highlightedVoxels = $event"
            @update:viewpoint="viewpoint = $event"
            @update:layerN="layerN = $event"
            @voxelsClicked="voxelsClicked"
        >
            <template v-slot:tools>

                <VBtnToggle
                    v-model="toggles"
                    multiple
                >

                    <VTooltip
                        v-for="toggle of toggleButtons"
                        :text="toggle.text"
                        location="bottom"
                        contentClass="tooltip-arrow-up"
                    >
                        <template v-slot:activator="{props}">
                            <VBtn
                                rounded
                                @click=""
                                :value="toggle.value"
                                v-bind="props"
                            >
                                <VIcon
                                    :icon="toggle.icon"
                                    size="x-large"
                                    :aria-label="toggle.text"
                                    aria-hidden="false"
                                />
                            </VBtn>
                        </template>
                    </VTooltip>

                </VBtnToggle>

            </template>
        </GridDisplay>

        <Teleport v-if="auxEditArea" :to="auxEditArea">
            <GridDisplay
                v-bind="gridDisplayProps.aux"
                @update:highlightedVoxels="highlightedVoxels = $event"
                @update:viewpoint="viewpoint = $event"
                @update:layerN="layerN = $event"
                @voxelsClicked="voxelsClicked"
            />
        </Teleport>
    </div>
</template>

<style>
.v-btn--active {
    background: #b3b3b3;
}
</style>