<!--
    Modal for either creating a new empty puzzle, or uploading a puzzle file.
-->

<script setup lang="ts">
import {ref, Ref, computed, reactive, watch, nextTick} from "vue"
import {useRouter} from "vue-router"
import {VTextField, VFileInput, VForm} from "vuetify/components"

import {Puzzle, PuzzleFile, CubicGrid} from "~lib"

import {getStorageInstances, PuzzleStorage} from "~/ui/storage.ts"
import Modal from "~/ui/common/Modal.vue"

const router = useRouter()

const emit = defineEmits<{
    save: [PuzzleFile]
}>()

defineExpose({
    open(newMode: Mode, storage: PuzzleStorage, copyFrom: string | null = null) {
        mode.value = newMode
        if(storage.readOnly) {
            fields.storage = Object.values(storages)[0]
        } else {
            fields.storage = storage
        }

        if(newMode === "new") {
            title.value = "New Puzzle"
            createButtonText.value = "Create"

        } else if(newMode === "upload") {
            title.value = "Upload Puzzle"
            fields.name = ""
            createButtonText.value = "Upload"

        } else if(newMode === "copy" || newMode === "saveas") {
            if(!copyFrom) {
                throw new Error("Copy mode reqires copyFrom argument")
            }
            title.value = newMode === "copy" ? `Copy "${copyFrom}"` : "Save As"
            fields.name = copyFrom + " (copy)"
            copyFromStorage = storage
            copyFromPuzzleName = copyFrom
            createButtonText.value = newMode === "copy" ? "Copy" : "Save As"

        }
        modal.value?.open()
        nextTick(() => {
            form.value?.validate()
        })
    }
})

const createButtonText = ref("Create")
type Mode = "new" | "upload" | "copy" | "saveas"
const mode: Ref<Mode> = ref("new")
const title = ref("")
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
            uploadedPuzzle.value = await readPuzzleFile(files[0])
        } catch(e) {
            console.error(e)
            return String(e)
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
        break

        case "upload":
            puzzleFile = await readPuzzleFile(fields.files[0])
        break

        case "copy":
        case "saveas":
            puzzleFile = copyFromStorage.get(copyFromPuzzleName, true)
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

function readPuzzleFile(file: File): Promise<PuzzleFile> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => {
            const contents = reader.result as string
            try {
                const puzzleFile = PuzzleFile.deserialize(contents)
                resolve(puzzleFile)
            } catch(e) {
                reject(e)
            }
        }
        reader.onerror = reject
        reader.readAsText(file)
    })
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
</template>