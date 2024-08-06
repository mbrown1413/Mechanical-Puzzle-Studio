<!--
    Modal for either creating a new empty puzzle, or uploading a puzzle file.
-->

<script setup lang="ts">
import {ref, Ref, computed, reactive, watch, nextTick} from "vue"
import {useRouter} from "vue-router"
import {VTextField, VFileInput, VForm} from "vuetify/components"

import {Puzzle, PuzzleFile, CubicGrid, readPuzzleFile} from "~lib"

import {getStorageInstances, PuzzleStorage} from "~/ui/storage.ts"
import Modal from "~/ui/common/Modal.vue"

const router = useRouter()

const emit = defineEmits<{
    save: [PuzzleFile]
}>()

defineExpose({
    openNew(storage: PuzzleStorage) {
        title.value = "New Puzzle"
        createButtonText.value = "Create"
        open("new", storage)
    },

    openUpload(storage: PuzzleStorage) {
        title.value = "Upload Puzzle"
        fields.name = ""
        createButtonText.value = "Upload"
        open("upload", storage)
    },

    openCopy(storage: PuzzleStorage, copyFrom: string) {
        title.value = `Copy "${copyFrom}"`
        fields.name = copyFrom + " (copy)"
        copyFromStorage = storage
        copyFromPuzzleName = copyFrom
        createButtonText.value = "Copy"
        open("copy", storage)
    },

    openSaveAs(storage: PuzzleStorage, puzzleFile: PuzzleFile) {
        title.value = "Save As"
        fields.name = puzzleFile.name + " (copy)"
        saveAsPuzzleFileToSave = puzzleFile
        createButtonText.value = "Save As"
        open("saveas", storage)
    },
})

function open(newMode: Mode, storage: PuzzleStorage) {
    mode.value = newMode
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
let copyFromStorage: PuzzleStorage
let copyFromPuzzleName = ""

const storages = getStorageInstances()

const modal: Ref<InstanceType<typeof Modal> | null> = ref(null)
const form: Ref<InstanceType<typeof VForm> | null> = ref(null)
const formValid = ref(false)
const fields: {
    name: string,
    storage: PuzzleStorage,
    files: File[],
} = reactive({
    name: "",
    storage: Object.values(storages)[0],
    files: [],
})
const uploadedPuzzle: Ref<PuzzleFile | null> = ref(null)

const unsupportedWarningModal: Ref<InstanceType<typeof Modal> | null> = ref(null)
const unsupportedFeatures: Ref<string[]> = ref([])

watch(uploadedPuzzle, (newPuzzle, oldPuzzle) => {
    if(mode.value === "upload") {
        // Automatically set puzzle name from uploaded file, but only if user
        // has not manually modified name.
        if(
            fields.name === "" ||
            fields.name === oldPuzzle?.name
        ) {
            fields.name = newPuzzle ? newPuzzle.name : ""
        }
    }
})

const storageSelectItems = computed(() =>
    Object.values(storages).filter(s => !s.readOnly).map((storage) => {
        return {
            title: storage.name,
            value: storage,
        }
    })
)

const nameRules: VTextField["rules"] = [
    (name: string) => {
        if(!name) {
            return false
        }
        const allPuzzleMeta = fields.storage.list()
        const allNames = allPuzzleMeta.map(puzzleMeta => puzzleMeta.name)
        if(allNames.includes(name)) {
            return "Puzzle name already exists"
        }
        return true
    }
]

const fileUploadRules: VFileInput["rules"] = [
    async (files: File[]) => {
        if(files.length !== 1) {
            return "Select a puzzle to upload"
        }
        try {
            const readResult = await readPuzzleFile(files[0])
            uploadedPuzzle.value = readResult.puzzleFile
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

    let puzzleFile: PuzzleFile
    switch(mode.value) {
        case "new":
            puzzleFile = new PuzzleFile(
                new Puzzle(
                    new CubicGrid()
                ),
                fields.name
            )
            // Uncomment the next line to pop up the grid configure dialog when
            // a puzzle is created. For now, there aren't enough grids
            // implemented for it to be useful.
            //puzzleFile.needsInitialConfigure = true
        break

        case "upload":
            const readResult = await readPuzzleFile(fields.files[0])
            puzzleFile = readResult.puzzleFile
            if(readResult.unsupportedFeatures?.length) {
                unsupportedFeatures.value = readResult.unsupportedFeatures
                await unsupportedWarningModal.value?.openAsync()
            }
        break

        case "copy":
            puzzleFile = copyFromStorage.get(copyFromPuzzleName, true)
        break

        case "saveas":
            puzzleFile = saveAsPuzzleFileToSave
        break

        default:
            const _exhaustiveCheck: never = mode.value
            return _exhaustiveCheck
    }

    puzzleFile.name = fields.name
    fields.storage.save(puzzleFile)

    router.push({
        name: "puzzle",
        params: {storageId: fields.storage.id, puzzleName: fields.name}
    })
    modal.value?.close()
    emit("save", puzzleFile)
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

            <template v-if="mode === 'upload'">
                Upload a .json puzzle file or BurrTools .xmpuzzle
            </template>
            <VFileInput
                v-if="mode === 'upload'"
                label="File"
                v-model="fields.files"
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