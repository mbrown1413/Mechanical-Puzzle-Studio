<script setup lang="ts">
import {computed, ref, Ref} from "vue"
import {VDataTable} from "vuetify/components/VDataTable"

import {Puzzle, AssemblyProblem, ProblemConstraint, clone} from "~lib"

import {Action, EditProblemMetadataAction} from "~/ui/actions.ts"
import {UiButtonDefinition} from "~/ui/ui-buttons.ts"
import PieceGroupConstraintEditor from "~/ui/components/PieceGroupConstraintEditor.vue"
import UiButton from "~/ui/components/UiButton.vue"
import Modal from "~/ui/common/Modal.vue"

const props = defineProps<{
    puzzle: Puzzle,
    problem: AssemblyProblem
    label: string,
}>()

const emit = defineEmits<{
    action: [action: Action]
}>()

const newConstraintModal: Ref<InstanceType<typeof Modal> | null> = ref(null)

const constraints = computed(() => props.problem.constraints || [])

const tableHeaders: VDataTable["$props"]["headers"] = [
    {title: "type", key: "type"},
    {title: "", key: "editor"},
    {title: "", key: "actions", sortable: false, align: "end"},
]

const tableItems = computed(() => {
    return constraints.value.map((constraint) => {
        return {
            type: constraint.type === "piece-group" ? "Piece Group" : constraint.type,
            constraint,
        }
    })
})

const addButton: UiButtonDefinition = {
    text: "Add Constraint",
    icon: "mdi-plus",
    perform: () => newConstraintModal.value?.open(),
}

function makeDeleteButton(constraint: ProblemConstraint) {
    return {
        text: "Delete Constraint",
        icon: "mdi-minus",
        perform: () => deleteConstraint(constraint),
    }
}

function addConstraint() {
    const constraints = clone(props.problem.constraints || [])
    constraints.push({
        type: "piece-group",
        pieceIds: [],
        count: 1
    })
    const action = new EditProblemMetadataAction(
        props.problem.id,
        {constraints}
    )
    emit("action", action)
    newConstraintModal.value?.close()
}

function updateConstraint(oldConstraint: ProblemConstraint, newConstraint: ProblemConstraint) {
    const index = (props.problem.constraints || []).indexOf(oldConstraint)
    const constraints = clone(props.problem.constraints || [])
    constraints[index] = newConstraint
    const action = new EditProblemMetadataAction(
        props.problem.id,
        {constraints}
    )
    emit("action", action)
}

function deleteConstraint(constraint: ProblemConstraint) {
    const index = (props.problem.constraints || []).indexOf(constraint)
    const constraints = clone(props.problem.constraints || [])
    constraints.splice(index, 1)
    const action = new EditProblemMetadataAction(
        props.problem.id,
        {constraints}
    )
    emit("action", action)
}
</script>

<template>
    <VDataTable
        :headers="tableHeaders"
        :items="tableItems"
        items-per-page="-1"
        no-data-text="No Constraints"
    >
        <template v-slot:top>
            <VToolbar flat density="compact" :title="label">

                <UiButton
                    :uiButton="addButton"
                    vBtnVariant="tonal"
                />

            </VToolbar>
        </template>

        <template v-slot:headers />
        <template v-slot:bottom />

        <template v-slot:item.editor="{item}">
            <PieceGroupConstraintEditor
                v-if="item.constraint.type === 'piece-group'"
                :puzzle="puzzle"
                :problem="problem"
                :constraint="item.constraint"
                @update:constraint="updateConstraint(item.constraint, $event)"
            />
            <br>
        </template>

        <template v-slot:item.actions="{item}">
            <UiButton
                :uiButton="makeDeleteButton(item.constraint)"
                btnVariant="tonal"
            />
        </template>

    </VDataTable>

    <Modal
        ref="newConstraintModal"
        title="New Constraint"
        :okShow="false"
    >
        <p>
            Constraints add a limit to the returned solutions, in addition to
            the problem's used pieces.
        </p>
        <VTable>
            <tbody>
                <tr>
                    <td>
                        <VBtn @click="addConstraint()">
                            <VIcon icon="mdi-plus" class="mr-2" />
                            Piece Group
                        </VBtn>
                    </td>
                    <td>
                        Limits the amount of pieces which can be used from a
                        given set of pieces.
                    </td>
                </tr>
            </tbody>
        </VTable>
    </Modal>
</template>

<style scoped>
.v-table:deep(td) {
    padding: 1em !important;
}
</style>