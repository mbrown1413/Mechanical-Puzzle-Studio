import {reactive, ref, watch} from "vue"

import {serialize, deserialize} from "~lib"

import {SaveManager} from "~/ui/SaveManager"
import {TaskRunner} from "~/ui/TaskRunner.ts"
import {PuzzleStudioApi} from "~/ui/api.ts"
import {makeProxy} from "~/ui/utils/proxy.ts"
import FormModal from "~/ui/components/FormModal.vue"
import {Storage, LocalStorage, SampleStorage, BackendStorage, StorageId} from "~/ui/storage.ts"

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

/** Opens a global instance of FormModal. */
export const openGlobalModal: OpenModal = (...args: Parameters<OpenModal>) => {
    if(!globalFormModal) {
        return Promise.reject()
    }
    return globalFormModal.open(...args)
}
let globalFormModal: InstanceType<typeof FormModal> | null = null
export function setGlobalFormModal(formModal: InstanceType<typeof FormModal>) {
    globalFormModal = formModal
}
type OpenModal = InstanceType<typeof FormModal>["open"]

/** Storage instances saved in browser's LocalStorage. */
let savedStorages: Storage[] | null = null
export function getSavedStorages() {
    if(savedStorages !== null) {
        return savedStorages
    }

    const serializedValue = localStorage.getItem("storages")
    if(serializedValue !== null) {
        try {
            savedStorages = deserialize(JSON.parse(serializedValue))
        } catch(e) {
            console.error("Failed to load saved storage instances", e)
        }
    }

    if(
        !Array.isArray(savedStorages) ||
        savedStorages.length == 0 ||
        !savedStorages.every(item => item instanceof Storage)
    ) {
        savedStorages = [
            new LocalStorage(),
            new SampleStorage(),
            new BackendStorage(""),
        ]
        setSavedStorages()
    }

    return savedStorages
}
/** Set the storages saved in browser's LocalStorage. Without an argument the
 * saved storages returned from getSavedStorages is saved, presumably mutated
 * from when it was retrieved. */
export function setSavedStorages(storages?: Storage[]) {
    if(storages !== undefined) {
        savedStorages = storages
    }
    localStorage.setItem(
        "storages",
        JSON.stringify(serialize(savedStorages))
    )
}
export function getSavedStorage(storageId: StorageId): Storage | null {
    return getSavedStorages().find((s) => (
        s.id[0] === storageId[0] &&
        s.id[1] === storageId[1]
    )) || null
}