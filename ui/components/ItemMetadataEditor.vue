<script setup lang="ts">
import {computed} from "vue"

import {Piece, Puzzle} from  "~lib/Puzzle.ts"
import {Problem} from "~lib/Problem.ts"
import {Action, EditPieceMetadataAction, EditProblemMetadataAction} from "~ui/actions.ts"
import ProblemPiecesEditor from "~ui/components/ProblemPiecesEditor.vue"
import {Bounds} from "~lib/types"

const props = defineProps<{
    puzzle: Puzzle,
    itemType: "piece" | "problem",
    itemId: string | null,
}>()

const emit = defineEmits<{
    action: [action: Action]
}>()

type Field = {
    property: string,
    label: string,
    type: "string" | "color" | "piece" | "pieces" | "bounds",
    required?: boolean,
}

let title: string
let puzzleProperty: "pieces" | "problems"
let actionClass: {new(itemId: string, metadata: any): Action}
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
                property: "color",
                label: "Color",
                type: "color",
            }, {
                property: "bounds",
                label: "Size",
                type: "bounds",
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
                property: "goalPieceId",
                label: "Goal",
                type: "piece",
            }, {
                property: "piecesId",
                label: "Pieces Used",
                type: "pieces",
            }
        ]
        break;

    default:
        throw "Invalid itemType"
}

const item = computed(() =>
    props.itemId === null ?
        null :
        props.puzzle[puzzleProperty].get(props.itemId) || null
)

const pieceItems = computed(() => {
    const pieces = Array.from(props.puzzle.pieces.values())
    return pieces.map((piece) => {
        return {
            title: piece.label,
            value: piece,
        }
    })
})

function handleTextInput(field: Field, el: HTMLInputElement) {
    if(props.itemId === null) return
    const metadata: any = {}
    metadata[field.property] = el.value
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
    metadata[field.property] = item.value[field.property]
    metadata[field.property][dimensionIndex] = Number(el.value)
    const action = new actionClass(props.itemId, metadata)
    emit("action", action)
    
}

function getElId(field: Field) {
    return `metadataEditor-field-${props.itemId}-${field.property}`
}
</script>

<template>
    <div v-if="item">
        <h4>{{ title }}</h4>
        
        <template v-for="field in fields">
            
            <VTextField
                    v-if="field.type === 'string'"
                    :label="field.label"
                    :required="field.required === true"
                    :model-value="item[field.property]"
                    @input="handleTextInput(field, $event.target as HTMLInputElement)"
            />

            <div
                v-if="field.type === 'color'"
                class="row mt-2 align-items-center g-3"
            >
                <div class="col-auto">
                    <label
                            :for="getElId(field)"
                            class="form-label"
                    >{{ field.label }}</label>
                </div>
                <div class="col-auto">
                    <input
                            :id="getElId(field)"
                            type="color"
                            class="form-control"
                            :value="item[field.property]"
                            @input="handleTextInput(field, $event.target as HTMLInputElement)"
                    />
                </div>
                <div class="col-auto">
                    {{ item[field.property] }}
                </div>
            </div>
            
            <VSelect
                    v-if="field.type === 'piece'"
                    :label="field.label"
                    :required="field.required !== false"
                    :items="pieceItems"
                    :modelValue="puzzle.pieces.get(item[field.property] as string)"
                    no-data-text="No pieces in puzzle!"
                    @update:modelValue="handlePieceInput(field, $event as Piece)"
            />
            
            <ProblemPiecesEditor
                    v-if="field.type === 'pieces' && item instanceof Problem"
                    :puzzle="puzzle"
                    :problem="item"
                    :label="field.label"
                    @action="emit('action', $event)"
            />
            
            <VContainer
                    v-if="field.type === 'bounds' && puzzle !== null && item instanceof Piece"
            >
                <VRow>
                    <VCol
                            v-for="(dimension, i) in puzzle.grid.getDimensions()"
                    >
                        <VTextField
                                :label="dimension.name"
                                type="number"
                                min="1"
                                :model-value="(item[field.property] as Bounds)[i]"
                                @input="handleBoundsInput(field, i, $event.target as HTMLInputElement)"
                        />
                    </VCol>
                </VRow>
            </VContainer>
        </template>

    </div>
</template>

<style scoped>
input[type="color"] {
    width: 50px;
    height: 50px;
    border-radius: 50%;
    border: var(--bs-border-width) solid var(--bs-border-color);
    padding: 10px;
}
</style>