<!--
    Displays a list of items which can be selected, with optional buttons for
    adding and removing items.
-->

<script setup lang="ts">
import {ref, Ref, watch} from "vue"

const el: Ref<HTMLSelectElement | null> = ref(null)

type Item = {
    id: number,
    label?: string,
    color?: string,
}

const props = withDefaults(
    defineProps<{
        items: Item[],
        selectedIds: number[],
        showButtons?: boolean,
    }>(), {
        showButtons: false,
    }
)

const emit = defineEmits<{
    "update:selectedIds": [ids: number[]],
    add: [],
    remove: [],
}>()

function arraysEqual<T>(array1: Array<T>, array2: Array<T>) {
    if(array1.length !== array2.length) { return false }
    return array1.every(x => array2.indexOf(x) !== -1)
}

let oldItems = [...props.items]
watch(() => props.items, () => {
    const oldSet = new Set(oldItems.map(item => item.id))
    const newSet = new Set(props.items.map(item => item.id))
    let newSelectedIds: number[]

    if(newSet.size === oldSet.size + 1) {
        // Added item: Select item that was added
        newSelectedIds = [...newSet].filter(
            item => !oldSet.has(item)
        )

    } else if(oldSet.size === newSet.size + 1) {
        // Deleted item: Select item closest to it
        const deletedId = [...oldSet].filter(
            item => !newSet.has(item)
        )[0]
        const deletedItemIdx = oldItems.findIndex(item => item.id === deletedId)
        const newSelectedIdx = Math.min(props.items.length-1, Math.max(0, deletedItemIdx))
        const newSelectedItem = props.items[newSelectedIdx]
        newSelectedIds = newSelectedItem ? [newSelectedItem.id] : []

    } else {
        newSelectedIds = props.selectedIds
    }

    newSelectedIds = newSelectedIds.filter(id => newSet.has(id))
    if(!arraysEqual(newSelectedIds, props.selectedIds)) {
        emit("update:selectedIds", newSelectedIds)
    }
    oldItems = [...props.items]
})

function onItemsSelect() {
    if(el.value === null) return
    const selectedValues = Array.from(el.value.selectedOptions).map(option => Number(option.value))
    emit('update:selectedIds', selectedValues)
}
</script>

<template>
    <div class="list-container">
        <div class="buttons" v-if="showButtons">
            <button
                class="action-button del-button"
                @click="emit('remove')"
            >-</button>
            <button
                class="action-button add-button"
                @click="emit('add')"
            >+</button>
        </div>
        <select
            ref="el"
            multiple
            :value="selectedIds"
            @change="onItemsSelect"
        >
            <option
                v-for="item in items"
                :value="item.id"
                :class="{'empty-label': !item.label}"
                :style="'--data-color:' + (item.color || '#000000')"
            >
                {{ item.label }}
                <span
                    v-if="!item.label"
                >
                    (empty name)
                </span>
            </option>
        </select>
    </div>
</template>

<style scoped>
.list-container {
    height: 100%;
    display: flex;
    flex-direction: column;
}

select {
    width: 100%;
    height: 100%;
    border: 0;
}
select .empty-label {
    color: #606060;
}
select .empty-label span {
    font-size: 75%;
}

.action-button {
    width: 50%;
}
.add-button {
    background-color: green;
}
.del-button {
    background-color: red;
}

/* Colored block showing the item color. */
option::before {
    content: "";
    display: inline-block;
    vertical-align: middle;
    width: 1em;
    height: 1em;
    margin-left: 0.5em;
    margin-right: 0.5em;
    border: var(--bs-border-width) solid var(--bs-border-color);
    border-radius: 5px;
    background-color: var(--data-color); /* Var set by <option> */
}
</style>