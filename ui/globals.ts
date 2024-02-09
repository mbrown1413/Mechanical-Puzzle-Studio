import {reactive, ref, watch} from "vue"

import {TaskRunner} from "~/ui/TaskRunner.ts"

/** HTML page title */
export const title = ref("")

// Set <title> element whenever `title` ref changes
watch(title, () => {
    if(title.value) {
        document.title = title.value + " | " + import.meta.env.VITE_APP_TITLE
    } else {
        document.title = import.meta.env.VITE_APP_TITLE
    }
}, {immediate: true})

/** Global singleton instance of `TaskRunner()`. This is a reactive proxy, so
 * you can use it directly with Vue as expected. */
export const taskRunner = reactive(
    new TaskRunner() as never
) as TaskRunner