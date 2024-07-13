<script setup lang="ts">
import {computed, ref, Ref} from "vue"
import {VDataTable} from "vuetify/components/VDataTable"

import RangeEditor from "~/ui/common/RangeEditor.vue"

import {Puzzle, PieceId, AssemblyProblem, ProblemConstraint, Range, clone} from "~lib"
import UiButton from "~/ui/components/UiButton.vue"
import Modal from "~/ui/common/Modal.vue"

const props = defineProps<{
    puzzle: Puzzle,
    problem: AssemblyProblem,
    constraint: ProblemConstraint
}>()

const emit = defineEmits<{
    "update:constraint": [constaint: ProblemConstraint]
}>()

const editPiecesModal: Ref<InstanceType<typeof Modal> | null> = ref(null)

const pieces = computed(() => {
    const pieces = []
    for(const id of props.constraint.pieceIds) {
        const piece = props.puzzle.getPiece(id)
        if(piece?.id === props.problem.goalPieceId) { continue }
        if(piece) { pieces.push(piece) }
    }
    return pieces
})

const editPiecesButton = {
    text: "Edit Pieces",
    icon: "mdi-pencil-outline",
    perform: () => {
        tempPieceIds.value = [...pieces.value.map(piece => piece.id)]
        editPiecesModal.value?.open()
    }
}

const piecesTableHeader: VDataTable["$props"]["headers"] = [
    {title: "Piece", key: "label"}
]

const tempPieceIds: Ref<PieceId[]> = ref([])

function updateRange(range: Range) {
    const newConstraint = clone(props.constraint)
    newConstraint.count = range
    emit("update:constraint", newConstraint)
}

function updatePieces(pieceIds: PieceId[]) {
    const newConstraint = clone(props.constraint)
    newConstraint.pieceIds = pieceIds
    emit("update:constraint", newConstraint)
    editPiecesModal.value?.close()
}
</script>

<template>
    <div>
        Limit set of pieces:<br>
        <VChip v-for="piece of pieces" class="mr-2">
            {{ piece.label }}
        </VChip>
        <span v-if="pieces.length === 0" class="mr-2">(no pieces)</span>
        <UiButton :ui-button="editPiecesButton" />
        <br><br>

        to amount used:
        <br><br>
        <RangeEditor
            :value="constraint.count"
            @update:value="updateRange($event)"
        />
    </div>

    <Modal
        ref="editPiecesModal"
        title="Piece Group Pieces"
        @ok="updatePieces(tempPieceIds)"
    >
        <VDataTable
            :headers="piecesTableHeader"
            :items="puzzle.pieces.filter(piece => piece.id !== problem.goalPieceId)"
            v-model="tempPieceIds"
            show-select
            no-data-text="No pieces in puzzle!"
            items-per-page="-1"
        >

            <template v-slot:bottom />

            <template v-slot:item.label="{item}">
                <template v-if="item.id !== problem.goalPieceId">
                    {{ item.label }}
                </template>
                <template v-else>
                    <span style="text-decoration: line-through;">{{ item.label }}</span>
                </template>
            </template>

        </VDataTable>
    </Modal>
</template>