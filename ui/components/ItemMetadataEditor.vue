<script setup lang="ts">
import {computed} from "vue"

import {Puzzle} from  "~lib/Puzzle.ts"
import {Action, EditPieceMetadataAction, EditProblemMetadataAction} from "~ui/actions.ts"

const props = defineProps<{
    puzzle: Puzzle,
    itemType: "piece" | "problem",
    itemId: string | null,
}>()

type Field = {
    property: string,
    label: string,
    type: "string" | "color",
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
            }
        ]
        break;

    default:
        throw "Invalid itemType"
}

const emit = defineEmits<{
    action: [action: Action]
}>()

const item = computed(() =>
    props.itemId === null ?
        null :
        props.puzzle[puzzleProperty].get(props.itemId) || null
)

function handleTextInput(field: Field, el: HTMLInputElement) {
    if(props.itemId === null) return
    const metadata: any = {}
    metadata[field.property] = el.value
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

            <template v-if="field.type === 'string'">
                <label
                    :for="getElId(field)"
                    class="form-label"
                >{{ field.label }}</label>
                <input
                    :id="getElId(field)"
                    class="form-control"
                    type="text"
                    :required="field.required === true"
                    :value="item[field.property]"
                    @input="handleTextInput(field, $event.target as HTMLInputElement)"
                />
            </template>

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