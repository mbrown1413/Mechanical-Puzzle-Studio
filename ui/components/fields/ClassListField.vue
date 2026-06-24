<script setup lang="ts">
import {computed, onMounted, ref, Ref} from "vue"

import {FormContext, ClassListField, FormEditable} from "~lib"

import {objectClone} from "~/ui/utils/objectClone.ts"
import {UiButtonDefinition} from "~/ui/ui-buttons.ts"
import ListSelect from "~/ui/common/ListSelect.vue"
import FormEditor from "../FormEditor.vue"
import Modal from "~/ui/common/Modal.vue"

const props = defineProps<{
    item: object
    field: ClassListField<any>
    context: FormContext
}>()

const emit = defineEmits<{
    "edit": [editData: object]
}>()

const selectedIndex = ref<number | null>(0)
const chooseTypeModal: Ref<InstanceType<typeof Modal> | null> = ref(null)

onMounted(() => {
    if(props.field.initialSelectionIndex) {
        selectedIndex.value = props.field.initialSelectionIndex(items.value)
    }
})

function makeEdit(callback: (newItemList: FormEditable[]) => void) {
    const editData: any = {}
    const newItemList = objectClone(items.value)
    callback(newItemList)
    editData[props.field.property] = newItemList
    emit("edit", editData)
}

function onInstanceEdit(value: object) {
    makeEdit((newItemList) => {
        if(selectedIndex.value === null) { return }
        Object.assign(newItemList[selectedIndex.value], value)
    })
}

const selectedItem = computed(() => {
    if(selectedIndex.value === null) { return null }
    const inBoundsIndex = Math.max(0, Math.min(selectedIndex.value, numberedItems.value.length - 1))
    if(inBoundsIndex >= numberedItems.value.length) { return null }
    return numberedItems.value[inBoundsIndex].item
})

const items = computed(() => {
    return (props.item as any)[props.field.property] as FormEditable[]
})

/* Make a list of items with IDs because ListSelect expects iems to have an ID. */
const numberedItems = computed(() => {
    return items.value.map((item, id) => {
        return {
            id,
            item,
            label: props.field.getLabel(item)
        }
    })
})

function moveSelectedItem(delta: number) {
    makeEdit((newItemList) => {
        if(selectedIndex.value === null) { return }
        const item = newItemList[selectedIndex.value]
        newItemList.splice(selectedIndex.value, 1)
        newItemList.splice(Math.max(0, selectedIndex.value + delta), 0, item)
        selectedIndex.value = newItemList.indexOf(item)
    })
}

function onNewInstance(instanceFactory: () => any) {
    makeEdit((newItemList) => {
        const index = selectedIndex.value === null ? newItemList.length-1 : selectedIndex.value
        const newItem = instanceFactory()
        newItemList.splice(index+1, 0, newItem)
        selectedIndex.value = index+1
    })
    chooseTypeModal.value?.close()
}

const upButton: UiButtonDefinition = {
    text: "Move up",
    icon: "mdi-menu-up-outline",
    perform: () => {
        moveSelectedItem(-1)
    },
    enabled: () => selectedIndex.value !== null && selectedIndex.value > 0
}

const downButton: UiButtonDefinition = {
    text: "Move down",
    icon: "mdi-menu-up-outline",
    perform: () => {
        moveSelectedItem(1)
    },
    enabled: () => selectedIndex.value !== null && selectedIndex.value < items.value.length - 1
}

const duplicateButton: UiButtonDefinition = {
    text: "Duplicate item",
    icon: "mdi-content-duplicate",
    perform: () => {
        makeEdit((newItemList) => {
            if(selectedIndex.value === null) { return }
            const item = newItemList[selectedIndex.value]
            const duplicateItem = objectClone(item)
            newItemList.splice(selectedIndex.value, 0, duplicateItem)
            selectedIndex.value += 1
        })
    },
    enabled: () => selectedIndex.value !== null,
}

const newButton: UiButtonDefinition = {
    text: "New item",
    icon: "mdi-plus",
    perform: () => {
        if(Array.isArray(props.field.newInstance)) {
            chooseTypeModal.value?.open()
        } else {
            onNewInstance(props.field.newInstance)
        }
    },
}

const deleteButton: UiButtonDefinition = {
    text: "Delete item",
    icon: "mdi-minus",
    perform: () => {
        makeEdit((newItemList) => {
            if(selectedIndex.value === null) { return }
            if(selectedIndex.value === numberedItems.value.length - 1) {
                selectedIndex.value -= 1
            }
            newItemList.splice(selectedIndex.value, 1)
        })
    },
    enabled: () => selectedIndex.value !== null,
}
</script>

<template>
    <VContainer class="container">
        <VRow>
            <VCol>
                <ListSelect
                    class="select"
                    :items="numberedItems"
                    :selectedItemId="selectedIndex"
                    :selectOnItemChange="false"
                    :upButton="upButton"
                    :downButton="downButton"
                    :uiButtons="[duplicateButton, newButton, deleteButton]"
                    @update:selectedItemId="selectedIndex = $event"
                />
            </VCol>
            <VCol>
                <h4>{{ selectedItem?.constructor?.name }}</h4>
                <FormEditor
                    v-if="selectedItem"
                    :item="selectedItem"
                    @edit="onInstanceEdit"
                />
                <span
                    v-if="selectedItem && selectedItem.getForm(context).fields.length === 0"
                    class="no-configuration"
                >
                    (no configuration)
                </span>
            </VCol>
        </VRow>
    </VContainer>
    <Modal
        v-if="Array.isArray(field.newInstance)"
        ref="chooseTypeModal"
        title=""
        :okShow="false"
        dialogMaxWidth="600px"
    >
        <VTable>
            <tbody>
                <tr v-for="classInfo of field.newInstance">
                    <td>
                        <VBtn @click="onNewInstance(classInfo.newInstance)">
                            <VIcon icon="mdi-plus" class="mr-2" />
                            {{ classInfo.name }}
                        </VBtn>
                    </td>
                    <td>{{ classInfo.description }}</td>
                </tr>
            </tbody>
        </VTable>
    </Modal>
</template>

<style scoped>
.select {
    border: 1px solid #d5d5da;
}

.no-configuration {
    color: #606060;
}
</style>