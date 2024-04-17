<script setup lang="ts">
import {computed, ComputedRef} from "vue"

import {Bounds, Piece, Puzzle, Problem, AssemblyProblem, ItemId, PieceId} from  "~lib"

import {Action, EditPieceMetadataAction, EditProblemMetadataAction} from "~/ui/actions.ts"
import ProblemPiecesEditor from "~/ui/components/ProblemPiecesEditor.vue"
import ColorInput from "~/ui/common/ColorInput.vue"

const props = defineProps<{
    puzzle: Puzzle,
    itemType: "piece" | "problem",
    itemId: ItemId | null,
}>()

const emit = defineEmits<{
    action: [action: Action]
}>()

type Field = {
    property: string,
    label: string,
    type: "string" | "color" | "piece" | "pieces" | "bounds",
    required?: boolean,

    //TODO: Field-specific stuff that should be factored out when a proper form
    //system is written.
    getDisabledPieceIds?: (problem: AssemblyProblem) => PieceId[]
}

let title: string
let puzzleProperty: "pieces" | "problems"
let actionClass: {new(itemId: ItemId, metadata: any): Action}
let fields: Field[]
switch(props.itemType) {

    case "piece":
        title = "Piece Data"
        puzzleProperty = "pieces"
        actionClass = EditPieceMetadataAction
        fields = [
            {
                property: "label",
                label: "Name",
                type: "string",
            }, {
                property: "bounds",
                label: "Size",
                type: "bounds",
            }, {
                property: "color",
                label: "Color",
                type: "color",
            }
        ]
        break;

    case "problem":
        title = "Problem Data"
        puzzleProperty = "problems"
        actionClass = EditProblemMetadataAction
        fields = [
            {
                property: "label",
                label: "Name",
                type: "string",
            }, {
                property: "piecesId",
                label: "Pieces Used",
                type: "pieces",
                getDisabledPieceIds: (item: AssemblyProblem) => item.goalPieceId !== undefined ? [item.goalPieceId] : []
            }
        ]
        break;

    default:
        throw new Error("Invalid itemType")
}

const item: ComputedRef<Piece | Problem | null> = computed(() => {
    if(props.itemId === null) {
        return null
    }
    if(puzzleProperty === "pieces") {
        return props.puzzle.getPiece(props.itemId as PieceId)
    } else {
        return props.puzzle.getProblem(props.itemId)
    }
})

/* Until we get a proper form system, there's not really a way to make this
 * type safe without a ton of code repetition. We should be able to make the
 * base class for objects enforce the type safety. */
const typeUnsafeItem = item as ComputedRef<any>

const pieceItems = computed(() => {
    const pieces = Array.from(props.puzzle.pieces.values())
    return pieces.map((piece) => {
        return {
            title: piece.label,
            value: piece,
        }
    })
})

function handleTextInput(field: Field, value: string) {
    if(props.itemId === null) return
    const metadata: any = {}
    metadata[field.property] = value
    const action = new actionClass(props.itemId, metadata)
    emit("action", action)
}

function handlePieceInput(field: Field, piece: Piece) {
    if(props.itemId === null) return
    const metadata: any = {}
    metadata[field.property] = piece.id
    const action = new actionClass(props.itemId, metadata)
    emit("action", action)
}

function handleBoundsInput(field: Field, dimensionIndex: number, el: HTMLInputElement) {
    if(props.itemId === null || item.value === null) return
    const metadata: any = {}
    metadata[field.property] = [...typeUnsafeItem.value[field.property]]
    metadata[field.property][dimensionIndex] = Number(el.value)
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
                    :required="field.required === true"
                    :model-value="typeUnsafeItem[field.property]"
                    @input="handleTextInput(field, $event.target.value)"
            />

            <ColorInput
                    v-if="item && field.type === 'color'"
                    :value="typeUnsafeItem[field.property] as string"
                    @input="handleTextInput(field, $event)"
            />

            <VSelect
                    v-if="item && field.type === 'piece'"
                    :label="field.label"
                    :required="field.required !== false"
                    :items="pieceItems"
                    :modelValue="puzzle.getPiece(typeUnsafeItem[field.property])"
                    no-data-text="No pieces in puzzle!"
                    @update:modelValue="handlePieceInput(field, $event as Piece)"
            />

            <!--
                Note: This must render when item is null, since if there are
                many pieces, this would have to initialize many grid displays
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
            />

            <VContainer
                    v-if="item && field.type === 'bounds' && puzzle !== null && item instanceof Piece"
            >
                <VRow>
                    <VCol
                            v-for="(dimension, i) in puzzle.grid.getDimensions()"
                    >
                        <VTextField
                                :label="dimension.name"
                                type="number"
                                min="1"
                                :model-value="(typeUnsafeItem[field.property] as Bounds)[i]"
                                @input="handleBoundsInput(field, i, $event.target as HTMLInputElement)"
                        />
                    </VCol>
                </VRow>
            </VContainer>
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