<!--
    Modal for either creating a new empty puzzle, or uploading a puzzle file.
-->

<script setup lang="ts">
import {ref, Ref, computed, reactive, nextTick} from "vue"
import {useRouter} from "vue-router"
import {VAlert, VTextField, VFileInput, VForm} from "vuetify/components"

import {Puzzle, PuzzleFile, CubicGrid, readPuzzleFile} from "~lib"

import {getStorageInstances, PuzzleListing, Storage} from "~/ui/storage.ts"
import Modal from "~/ui/common/Modal.vue"
import {getSaveManager} from "~/ui/globals.ts"

const router = useRouter()

defineExpose({
    openNew(storage: Storage) {
        title.value = "New Puzzle"
        createButtonText.value = "Create"
        open("new", storage)
    },

    openUpload(storage: Storage) {
        title.value = "Upload Puzzle"
        fields.name = ""
        createButtonText.value = "Upload"
        open("upload", storage)
    },

    openCopy(storage: Storage, copyFrom: string) {
        title.value = `Copy "${copyFrom}"`
        fields.name = copyFrom + " (copy)"
        copyFromStorage = storage
        copyFromPuzzleName = copyFrom
        createButtonText.value = "Copy"
        open("copy", storage)
    },

    openSaveAs(storage: Storage, puzzleName: string, puzzleFile: PuzzleFile) {
        title.value = "Save As"
        fields.name = puzzleName + " (copy)"
        saveAsPuzzleFileToSave = puzzleFile
        createButtonText.value = "Save As"
        open("saveas", storage)
    },
})

function open(newMode: Mode, storage: Storage) {
    mode.value = newMode
    submitError.value = null
    if(storage.readOnly) {
        fields.storage = Object.values(storages)[0]
    } else {
        fields.storage = storage
    }

    modal.value?.open()
    nextTick(() => {
        form.value?.validate()
    })
}

const createButtonText = ref("Create")
type Mode = "new" | "upload" | "copy" | "saveas"
const mode: Ref<Mode> = ref("new")
const title = ref("")
let saveAsPuzzleFileToSave: PuzzleFile
let copyFromStorage: Storage
let copyFromPuzzleName = ""

const storages = getStorageInstances()

const modal: Ref<InstanceType<typeof Modal> | null> = ref(null)
const form: Ref<InstanceType<typeof VForm> | null> = ref(null)
const formValid = ref(false)
const submitError: Ref<string | null> = ref(null)
const fields: {
    name: string,
    storage: Storage,
    file?: File,
} = reactive({
    name: "",
    storage: Object.values(storages)[0],
    file: undefined,
})
const uploadedPuzzle: Ref<PuzzleFile | null> = ref(null)

const unsupportedWarningModal: Ref<InstanceType<typeof Modal> | null> = ref(null)
const unsupportedFeatures: Ref<string[]> = ref([])

const storageSelectItems = computed(() =>
    Object.values(storages).filter(s => !s.readOnly).map((storage) => {
        return {
            title: storage.name,
            value: storage,
        }
    })
)

const nameRules: VTextField["rules"] = [
    async (name: string) => {
        if(!name) {
            return false
        }
        let allPuzzleMeta: PuzzleListing
        try {
            allPuzzleMeta = await fields.storage.list()
        } catch(e) {
            submitError.value = String(e)
            throw e
        }
        const allNames = Object.keys(allPuzzleMeta)
        if(allNames.includes(name)) {
            return "Puzzle name already exists"
        }
        return true
    }
]

const fileUploadRules: VFileInput["rules"] = [
    async (file: File) => {
        if(!file) {
            return "Select a puzzle to upload"
        }
        try {
            const readResult = await readPuzzleFile(file)
            uploadedPuzzle.value = readResult.puzzleFile
            fields.name = file.name
        } catch(e) {
            console.error(e)
            return String(e).split("\n")[0]
        }
        return true
    }
]

async function submit(event?: Event) {
    event?.preventDefault()
    if(!formValid.value) {
        return
    }
    submitError.value = null

    let puzzleFile: PuzzleFile
    switch(mode.value) {
        case "new":
            puzzleFile = new PuzzleFile(
                new Puzzle(
                    new CubicGrid()
                ),
            )
            // Uncomment the next line to pop up the grid configure dialog when
            // a puzzle is created. For now, there aren't enough grids
            // implemented for it to be useful.
            //puzzleFile.needsInitialConfigure = true
        break

        case "upload":
            if(!fields.file) { return }
            const readResult = await readPuzzleFile(fields.file)
            puzzleFile = readResult.puzzleFile
            if(readResult.unsupportedFeatures?.length) {
                unsupportedFeatures.value = readResult.unsupportedFeatures
                await unsupportedWarningModal.value?.openAsync()
            }
        break

        case "copy":
            try {
                puzzleFile = await copyFromStorage.get(copyFromPuzzleName, true)
            } catch(e) {
                submitError.value = String(e)
                throw e
            }
        break

        case "saveas":
            puzzleFile = saveAsPuzzleFileToSave
        break

        default:
            const _exhaustiveCheck: never = mode.value
            return _exhaustiveCheck
    }

    try {
        await fields.storage.save(fields.name, puzzleFile)
    } catch(e) {
        submitError.value = String(e)
        console.error(`Storage backend errored creating puzzle: ${submitError.value}`)
        return
    }

    getSaveManager()?.setSaveLocation(fields.storage, fields.name)

    router.push({
        name: "puzzle",
        params: {storageId: fields.storage.id, puzzleName: fields.name}
    })
    modal.value?.close()
}
</script>

<template>
    <Modal
        ref="modal"
        :title="title"
        :okText="createButtonText"
        dialogMaxWidth="500px"
        @ok="submit()"
    >
        <VForm
            ref="form"
            v-model="formValid"
            validateOn="input lazy"
            @submit="submit"
        >
            <VAlert
                v-if="submitError"
                type="error"
                variant="tonal"
                density="compact"
                class="mb-3"
            >
                {{ submitError }}
            </VAlert>

            <template v-if="mode === 'upload'">
                Upload a .json puzzle file or BurrTools .xmpuzzle
            </template>
            <VFileInput
                v-if="mode === 'upload'"
                label="File"
                v-model="fields.file"
                :rules="fileUploadRules"
                prepend-icon=""
                prepend-inner-icon="mdi-paperclip"
            />
            <VTextField
                label="Name"
                required
                v-model="fields.name"
                :rules="nameRules"
                :autofocus="mode === 'new'"
            />
            <VSelect
                label="Storage Location"
                required
                v-model="fields.storage"
                :items="storageSelectItems"
            />
            <input type="submit" style="display: none;" />
        </VForm>
    </Modal>

    <Modal
        ref="unsupportedWarningModal"
        title="Warning"
        icon="mdi-alert-outline"
        okText="Continue"
        :cancelShow="false"
        @ok="unsupportedWarningModal?.close()"
    >
        The uploaded BurrTools file uses the following features which we do not
        yet support importing:
        <ul style="margin-left: 2em;">
            <li v-for="feature in unsupportedFeatures">
                {{ feature }}
            </li>
        </ul>
    </Modal>
</template>