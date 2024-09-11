<!--
    Displays a list of items which can be selected, with optional buttons for
    adding and removing items.
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
        items: (Item | Group)[],
        selectedItems: number[],
        selectedGroups?: number[],
        uiButtons?: UiButtonDefinition[],
    }>(), {
        selectedGroups: () => [],
        uiButtons: () => [],
    }
)

const emit = defineEmits<{
    "update:selectedItems": [ids: number[]],
    "update:selectedGroups": [ids: number[]],
}>()

function arraysEqual<T>(array1: Array<T>, array2: Array<T>) {
    if(array1.length !== array2.length) { return false }
    return array1.every(x => array2.indexOf(x) !== -1)
}

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

let oldItems = [...flatItems.value]
watch(() => flatItems.value, () => {
    const oldSet = new Set(oldItems.map(item => item.id))
    const newSet = new Set(flatItems.value.map(item => item.id))
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
        const newSelectedIdx = Math.min(flatItems.value.length-1, Math.max(0, deletedItemIdx))
        const newSelectedItem = flatItems.value[newSelectedIdx]
        newSelectedIds = newSelectedItem ? [newSelectedItem.id] : []

    } else {
        newSelectedIds = props.selectedItems
    }

    newSelectedIds = newSelectedIds.filter(id => newSet.has(id))
    if(!arraysEqual(newSelectedIds, props.selectedItems)) {
        emit("update:selectedItems", newSelectedIds)
    }
    oldItems = [...flatItems.value]
})

function onItemsSelect() {
    if(el.value === null) return

    const selectedItems = []
    const selectedGroups = []
    for(const option of el.value.selectedOptions) {
        const [prefix, id] = option.value.split("-")
        if(prefix === "item") {
            selectedItems.push(Number(id))
        } else if(prefix === "group") {
            selectedGroups.push(Number(id))
        }
    }

    emit('update:selectedItems', selectedItems)
    emit('update:selectedGroups', selectedGroups)
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
                    :value="(item.isGroup ? 'group-' : 'item-') + item.id"
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