<script setup lang="ts">
import {ref, Ref, inject} from "vue"

import {PuzzleFile} from "~lib"
import {UiButtonDefinition} from "~/ui/ui-buttons.ts"
import Modal from "~/ui/common/Modal.vue"
import UiButton from "./UiButton.vue";

defineProps<{
    puzzleFile: PuzzleFile,
}>()

defineExpose({
    open() {
        modal.value?.open()
    }
})

const modal: Ref<InstanceType<typeof Modal> | null> = ref(null)
const exportPuzzlecadButton: Ref<InstanceType<typeof UiButton> | null> = ref(null)

const allUiButtons = inject("uiButtons") as Record<string, UiButtonDefinition>
const exportPuzzlecad = allUiButtons.exportPuzzlecad

</script>

<template>
    <Modal
        ref="modal"
        title="Export Puzzle"
        :cancelShow="false"
        @ok="modal?.close()"
    >
        <VTable>
            <tbody>
                <tr>
                    <td>
                        <UiButton
                            ref="exportPuzzlecadButton"
                            :ui-button="exportPuzzlecad"
                            variant="text"
                            @click="modal?.close()"
                        />
                    </td>
                    <td>
                        Export to <a href="https://www.puzzlehub.org/puzzlecad" target="_blank">Puzzlecad</a>,
                        an OpenSCAD library for modeling puzzles.
                        Only available for Cubic and Square grids.
                        <VChip
                            v-if="exportPuzzlecadButton?.disabled"
                            color="red"
                        >
                            Disabled: Incompatible Grid
                        </VChip>
                    </td>
                </tr>
            </tbody>
        </VTable>
    </Modal>
</template>