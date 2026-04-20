import {reactive, ref, watch} from "vue"

import {SaveManager} from "~/ui/SaveManager"
import {TaskRunner} from "~/ui/TaskRunner.ts"
import {PuzzleStudioApi} from "~/ui/api.ts"
import {makeProxy} from "~/ui/utils/proxy.ts"

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

/** Proxy to PuzzleStudioApi which throws an error if accessed when no puzzle
 * is open. */
export const api = makeProxy(requireApi)
export function getApi() { return currentApi }
export function setApi(value: PuzzleStudioApi) {
    currentApi = value
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(globalThis as any).api = api
}
export function clearApi() {
    currentApi = null
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(globalThis as any).api = undefined
}
export function requireApi(): PuzzleStudioApi {
    if(!currentApi) {
        throw new Error(
            "Puzzle API is not available because no puzzle edit page is currently open."
        )
    }
    return currentApi
}

let currentSaveManager: SaveManager | null = null

/** Proxy to PuzzleStudioApi which throws an error if accessed no save
 * manager is set. */
export const saveManager = makeProxy(requireSaveManager)
export function getSaveManager() { return currentSaveManager }
export function setSaveManager(value: SaveManager) { currentSaveManager = value }
export function clearSaveManager() { currentSaveManager = null }
export function requireSaveManager(): SaveManager {
    if(!currentSaveManager) {
        throw new Error("No current save manager")
    }
    return currentSaveManager
}