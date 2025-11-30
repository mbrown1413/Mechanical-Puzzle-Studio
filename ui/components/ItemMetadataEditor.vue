<script setup lang="ts">
import {computed, ComputedRef} from "vue"

import {Puzzle, Problem, AssemblyProblem, ItemId, ShapeId} from  "~lib"

import {Action, EditProblemMetadataAction} from "~/ui/actions.ts"
import ProblemPiecesEditor from "~/ui/components/ProblemPiecesEditor.vue"
import ProblemConstraintEditor from "~/ui/components/ProblemConstraintEditor.vue"

const props = defineProps<{
    puzzle: Puzzle,
    itemType: "problem",
    itemId: ItemId | null,
}>()

const emit = defineEmits<{
    action: [action: Action]
}>()

type Field = {
    property: string,
    label: string,
    type: "string" | "pieces" | "constraints",

    //TODO: Field-specific stuff that should be factored out when a proper form
    //system is written.
    getDisabledShapeIds?: (problem: AssemblyProblem) => ShapeId[]
}

let title: string
let actionClass: {new(itemId: ItemId, metadata: any): Action}
let fields: Field[]
switch(props.itemType) {

    case "problem":
        title = "Problem Data"
        actionClass = EditProblemMetadataAction
        fields = [
            {
                property: "label",
                label: "Name",
                type: "string",
            }, {
                property: "constraints",
                label: "Constraints",
                type: "constraints",
            }, {
                property: "",
                label: "Pieces",
                type: "pieces",
                getDisabledShapeIds: (item: AssemblyProblem) => item.goalShapeId !== undefined ? [item.goalShapeId] : []
            }
        ]
        break;

    default:
        throw new Error("Invalid itemType")
}

const item: ComputedRef<Problem | null> = computed(() => {
    if(props.itemId === null) {
        return null
    }
    return props.puzzle.getProblem(props.itemId)
})

/* Until we get a proper form system, there's not really a way to make this
 * type safe without a ton of code repetition. We should be able to make the
 * base class for objects enforce the type safety. */
const typeUnsafeItem = item as ComputedRef<any>

function handleTextInput(field: Field, value: string) {
    if(props.itemId === null) return
    const metadata: any = {}
    metadata[field.property] = value
    const action = new actionClass(props.itemId, metadata)
    emit("action", action)
}
</script>

<template>
    <div class="metadata-form">
        <h4>{{ title }}</h4>

        <template v-for="field in fields">

            <VTextField
                    v-if="item && field.type === 'string'"
                    :label="field.label"
                    :model-value="typeUnsafeItem[field.property]"
                    @input="handleTextInput(field, $event.target.value)"
            />

            <ProblemConstraintEditor
                    v-if="item && field.type ==='constraints'"
                    :puzzle="puzzle"
                    :problem="item as AssemblyProblem"
                    :label="field.label"
                    @action="emit('action', $event)"
            />

            <!--
                Note: This must render when item is null, since if there are
                many shapes, this would have to initialize many grid displays
                at once when item is set. We just hide it instead if item isn't
                set.
            -->
            <ProblemPiecesEditor
                    v-if="field.type === 'pieces'"
                    v-show="item"
                    :puzzle="puzzle"
                    :problem="item as AssemblyProblem"
                    :label="field.label"
                    @action="emit('action', $event)"
                    class="mt-6"
            />

        </template>

    </div>
</template>

<style scoped>
.metadata-form {
    margin: 1em;
    width: fit-content;
}
.metadata-form h4 {
    margin-bottom: 0.5em;
}
</style>