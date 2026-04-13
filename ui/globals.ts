import {reactive, ref, watch} from "vue"

import {TaskRunner} from "~/ui/TaskRunner.ts"
import {PuzzleStudioApi} from "~/ui/api.ts"

/** HTML page title */
export const title = ref("")

// Set <title> element whenever `title` ref changes
if(typeof document !== "undefined") {
    watch(title, () => {
        if(title.value) {
            document.title = title.value + " | " + import.meta.env.PZS_APP_TITLE
        } else {
            document.title = import.meta.env.PZS_APP_TITLE
        }
    }, {immediate: true})
}

/** Global singleton instance of `TaskRunner()`. This is a reactive proxy, so
 * you can use it directly with Vue as expected. */
export const taskRunner = reactive(
    new TaskRunner() as never
) as TaskRunner


let currentApi: PuzzleStudioApi | null = null

function requireApi(): PuzzleStudioApi {
    if(!currentApi) {
        throw new Error(
            "Puzzle API is not available because no puzzle edit page is currently open."
        )
    }
    return currentApi
}

/** Proxy to PuzzleStudioApi which throws an error if accessed when to puzzle
 * is open. */
export const api = new Proxy({} as PuzzleStudioApi, {
    get(_target, property) {
        const currentApi = requireApi()
        const value = Reflect.get(currentApi, property, currentApi)
        return typeof value === "function" ? value.bind(currentApi) : value
    },

    set(_target, property, value) {
        return Reflect.set(requireApi(), property, value)
    },

    has(_target, property) {
        return property in requireApi()
    },

    ownKeys() {
        return Reflect.ownKeys(requireApi())
    },

    getOwnPropertyDescriptor(_target, property) {
        return Object.getOwnPropertyDescriptor(requireApi(), property)
    },
})

export function setApi(value: PuzzleStudioApi) { currentApi = value }
export function getApi(): PuzzleStudioApi | null { return currentApi }
export function clearApi() { currentApi = null }