<script setup lang="ts">
import {computed, Ref, ref} from "vue"
import {VDataTable} from "vuetify/components/VDataTable"

import {FormEditable, FormContext, ConstraintsField, ProblemConstraint, clone, AssemblyProblem} from "~lib"

import {UiButtonDefinition} from "~/ui/ui-buttons.ts"
import Modal from "~/ui/common/Modal.vue"
import UiButton from "~/ui/components/UiButton.vue"
import PieceGroupConstraintEditor from "~/ui/components/PieceGroupConstraintEditor.vue"

const props = defineProps<{
    item: FormEditable
    field: ConstraintsField
    context: FormContext
}>()

if(!props.context.puzzle) {
    throw new Error("ConstraintsField requires a puzzle context")
}
if(!props.context.problem) {
    throw new Error("ConstraintsField requires a problem context")
}

const emit = defineEmits<{
    "edit": [editData: object]
}>()

const newConstraintModal: Ref<InstanceType<typeof Modal> | null> = ref(null)

const currentValue = computed(() =>
    (props.item as any)[props.field.property] as ProblemConstraint[] || []
)

const tableHeaders: VDataTable["$props"]["headers"] = [
    {title: "type", key: "type"},
    {title: "", key: "editor"},
    {title: "", key: "actions", sortable: false, align: "end"},
]

const tableItems = computed(() => {
    return currentValue.value.map((constraint) => {
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
    const constraints = clone(currentValue.value)
    constraints.push({
        type: "piece-group",
        shapeIds: [],
        count: 1
    })

    const editData: any = {}
    editData[props.field.property] = constraints
    emit("edit", editData)
    newConstraintModal.value?.close()
}

function updateConstraint(oldConstraint: ProblemConstraint, newConstraint: ProblemConstraint) {
    const index = currentValue.value.indexOf(oldConstraint)
    const constraints = clone(currentValue.value)
    constraints[index] = newConstraint

    const editData: any = {}
    editData[props.field.property] = constraints
    emit("edit", editData)
}

function deleteConstraint(constraint: ProblemConstraint) {
    const index = currentValue.value.indexOf(constraint)
    const constraints = clone(currentValue.value)
    constraints.splice(index, 1)

    const editData: any = {}
    editData[props.field.property] = constraints
    emit("edit", editData)
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
            <VToolbar flat density="compact" :title="field.label">

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
                v-if="context.puzzle && context.problem && item.constraint.type === 'piece-group'"
                :puzzle="context.puzzle"
                :problem="context.problem as AssemblyProblem"
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
            the problem's piece ranges.
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