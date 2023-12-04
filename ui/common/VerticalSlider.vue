<script setup lang="ts">
import {ref, watch, computed} from "vue"

import {makeUniqueId} from "~lib/utils.ts"

const toReversed = (array: any[]) => new Array(...array).reverse()

const props = defineProps<{
    modelValue: any,
    options: any[],
}>()

const emit = defineEmits<{
    "update:modelValue": [value: any]
}>()

const datalistId = makeUniqueId()
const selectedIndex = ref(props.options.indexOf(props.modelValue))

if(selectedIndex.value === undefined) {
    selectedIndex.value = 0
}

watch(selectedIndex, (newIndex) => {
    emit("update:modelValue", props.options[newIndex])
})

const containerStyle = computed(() => {
    return {
        "height": `min(100%, ${props.options.length*5}rem)`,
    }
})

</script>

<template>
    <div class="vertical-slider" :style="containerStyle">
        <input
            v-model="selectedIndex"
            type="range"
            orient="vertical"
            min="0"
            :max="options.length-1"
            :list="datalistId"
        />
        <datalist :id="datalistId">
            <option
                v-for="(option, i) in toReversed(options)"
                :value="i"
                :label="option.toString()"
            ></option>
        </datalist>
    </div>
</template>

<style scoped>

.vertical-slider {
    width: fit-content;
    display: grid;
    grid-template:
        "slider labels" 1fr
        / 1fr 1fr ;
}

input {
    height: calc(100% - 4rem);
    margin: 0;
    margin-top: 2rem;
    margin-bottom: 2rem;
}

datalist {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    height: calc(100% - 4rem);
    margin: 0;
    margin-top: 2rem;
    margin-bottom: 2rem;
}

option {
    padding: 0;
    padding-left: 0.25rem;
}

</style>