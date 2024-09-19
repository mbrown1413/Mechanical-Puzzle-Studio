<!--
    Displays a list of items which can be selected, with optional buttons for
    adding and removing items.

    Groups can be given in the same flat list as the items. Groups are similar
    to items, but they have a different ID namespace and they contain a nested
    list of items. Groups may not contain other groups.
-->

<script setup lang="ts">
import {computed, ref, Ref, watch} from "vue"

import UiButton from "~/ui/components/UiButton.vue"
import {UiButtonDefinition} from "~/ui/ui-buttons.ts"

const el: Ref<HTMLSelectElement | null> = ref(null)

type Item = {
    isGroup?: false
    id: number
    label?: string
    color?: string
}

type Group = {
    isGroup: true
    id: number
    label?: string
    color?: string
    items: Item[]
}

const props = withDefaults(
    defineProps<{
        items: (Item | Group)[]
        selectedItems: number[]
        selectedGroups?: number[]
        uiButtons?: UiButtonDefinition[]
    }>(), {
        selectedGroups: () => [],
        uiButtons: () => [],
    }
)

const emit = defineEmits<{
    "update:selectedItems": [ids: number[]],
    "update:selectedGroups": [ids: number[]],
}>()

const flatItems = computed(() => {
    const flat: ((Item | Group) & {inGroup?: boolean})[] = []
    for(const itemOrGroup of props.items) {
        flat.push(itemOrGroup)
        if(itemOrGroup.isGroup) {
            for(const item of itemOrGroup.items) {
                flat.push(Object.assign({inGroup: true}, item))
            }
        }
    }
    return flat
})

const flatSelectedIds = computed(() => {
    const selected = []
    for(const itemId of props.selectedItems) {
        selected.push("item-"+itemId)
    }
    for(const groupId of props.selectedGroups) {
        selected.push("group-"+groupId)
    }
    return selected
})

// Detect added/deleted items/groups and change selection accordingly
let oldItems = [...flatItems.value]
watch(() => flatItems.value, () => {
    const itemDelta = getItemIdDelta(oldItems, flatItems.value, item => !(item.isGroup || false))
    const groupDelta = getItemIdDelta(oldItems, flatItems.value, item => item.isGroup || false)

    let newSelectedItems: number[] = props.selectedItems
    let newSelectedGroups: number[] = props.selectedGroups
    if(
        itemDelta.added.length === 1 &&
        itemDelta.removed.length === 0 &&
        groupDelta.added.length === 0 &&
        groupDelta.removed.length === 0
    ) {
        // Added item
        newSelectedItems = itemDelta.added
        newSelectedGroups = []

    } else if(
        itemDelta.added.length === 0 &&
        itemDelta.removed.length === 0 &&
        groupDelta.added.length === 1 &&
        groupDelta.removed.length === 0
    ) {
        // Added group
        newSelectedItems = []
        newSelectedGroups = groupDelta.added

    } else if(
        itemDelta.added.length + groupDelta.added.length === 0 &&
        itemDelta.removed.length + groupDelta.removed.length === 1
    ) {
        // Deleted item or group
        const deletedIsGroup = groupDelta.removed.length === 1
        const deletedIndex = oldItems.findIndex(
            item => (
                (item.isGroup || false) === deletedIsGroup &&
                item.id === itemDelta.removed[0]
            )
        )
        const newSelectedIndex = Math.max(0, Math.min(deletedIndex, flatItems.value.length-1))
        const newSelected = flatItems.value[newSelectedIndex]
        if(newSelected) {
            newSelectedItems = newSelected.isGroup ? [] : [newSelected.id]
            newSelectedGroups = newSelected.isGroup ? [newSelected.id] : []
        } else {
            newSelectedItems = []
            newSelectedGroups = []
        }
    }

    if(newSelectedItems && !arraysEqual(newSelectedItems, props.selectedItems)) {
        emit("update:selectedItems", newSelectedItems)
    }
    if(newSelectedGroups && !arraysEqual(newSelectedGroups, props.selectedGroups)) {
        emit("update:selectedGroups", newSelectedGroups)
    }

    oldItems = [...flatItems.value]
})

function onItemsSelect() {
    if(el.value === null) return

    const selectedItems = []
    const selectedGroups = []
    for(const option of el.value.selectedOptions) {
        const {isGroup, id} = splitCombinedId(option.value)
        if(isGroup) {
            selectedGroups.push(Number(id))
        } else {
            selectedItems.push(Number(id))
        }
    }

    emit('update:selectedItems', selectedItems)
    emit('update:selectedGroups', selectedGroups)
}

/* Get an ID which is unique between both items and groups. */
function getCombinedId(item: Item | Group): string {
    return (item.isGroup ? 'group-' : 'item-') + item.id
}

function splitCombinedId(combinedId: string) {
    const [prefix, id] = combinedId.split("-")
    return {
        id,
        isGroup: prefix === "group",
    }
}

function arraysEqual<T>(array1: Array<T>, array2: Array<T>) {
    if(array1.length !== array2.length) { return false }
    return array1.every(x => array2.indexOf(x) !== -1)
}

function getItemIdDelta<T extends Item | Group>(
    oldItems: T[],
    newItems: T[],
    predicate: (item: T) => boolean
){
    oldItems = oldItems.filter(predicate)
    newItems = newItems.filter(predicate)

    const added = []
    for(const newItem of newItems) {
        if(!oldItems.find(oldItem => oldItem.id === newItem.id)) {
            added.push(newItem.id)
        }
    }

    const removed = []
    for(const oldItem of oldItems) {
        if(!newItems.find(newItem => newItem.id === oldItem.id)) {
            removed.push(oldItem.id)
        }
    }

    return {added, removed}
}
</script>

<template>
    <div class="list-container">
        <div class="buttons" v-if="uiButtons.length">
            <UiButton
                v-for="uiButton in uiButtons"
                :uiButton="uiButton"
            />
        </div>
        <select
            ref="el"
            multiple
            :value="flatSelectedIds"
            @change="onItemsSelect"
        >

            <template v-for="item in flatItems">

                <option
                    :value="getCombinedId(item)"
                    :style="'--data-color:' + (item.color || '#000000')"
                    :class="[
                        item.color ? 'colored' : 'uncolored',
                        item.isGroup ? 'group' : 'item',
                        item.inGroup ? 'inGroup' : '',
                    ]"
                >
                    {{ item.label }}
                    <span
                        v-if="!item.label"
                        class="empty-label"
                    >
                        (empty name)
                    </span>
                </option>

            </template>

        </select>
    </div>
</template>

<style scoped>
.buttons {
    display: flex;
    justify-content: center;
    padding-top: 0.5em;
    padding-bottom: 0.5em;
}

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
.empty-label {
    color: #606060;
    font-size: 75%;
}

/* Colored block showing the item color. */
option.colored::before {
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
option.uncolored {
    padding-left: 0.75em;
}

.group {
    font-weight: bold;
}
.inGroup {
    margin-left: 1.5em;
}
</style>