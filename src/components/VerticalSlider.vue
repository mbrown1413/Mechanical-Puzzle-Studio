<script setup lang="ts">
    
import { ref, watch } from "vue"

import { makeUniqueId } from "../tools.ts"

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

</script>

<template>
    <div class="vertical-slider">
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
                v-for="(option, i) in options.reverse()"
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
  height: calc(100% - 4em);
  margin: 0;
  margin-top: 2em;
  margin-bottom: 2em;
}

datalist {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  height: calc(100% - 4em);
  margin-top: 2em;
  margin-bottom: 2em;
}

option {
  padding: 0;
}

</style>