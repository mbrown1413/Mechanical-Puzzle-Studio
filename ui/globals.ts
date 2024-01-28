import {reactive, ref, watch} from "vue"

import {TaskRunner} from "~/ui/TaskRunner.ts"

export const title = ref("")
watch(title, () => {
    if(title.value) {
        document.title = title.value + " | " + import.meta.env.VITE_APP_TITLE
    } else {
        document.title = import.meta.env.VITE_APP_TITLE
    }
}, {immediate: true})

export const taskRunner = reactive(new TaskRunner())