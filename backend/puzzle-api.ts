import {mkdir, readdir, readFile, rm, writeFile} from "node:fs/promises"
import path from "node:path"

import express, {ErrorRequestHandler} from "express"
import cors from "cors"

import {PuzzleMetadata} from "~lib"


const host = process.env.PZS_BACKEND_HOST ?? "127.0.0.1"
const port = Number.parseInt(process.env.PZS_BACKEND_PORT ?? "8787", 10)
const urlBase = "/api"
const dataDir = path.resolve(process.cwd(), process.env.PZS_BACKEND_PUZZLE_STORAGE ?? "data/puzzles")

function puzzleNameToFilePath(name: string): string | null {
    if(name.includes("/") || name.includes("\\")) {
        return null
    }
    return path.join(dataDir, name + ".json")
}

function fileNameToPuzzleName(fileName: string): string | null {
    if(!fileName.endsWith(".json")) {
        return null
    }
    try {
        return fileName.slice(0, -".json".length)
    } catch {
        return null
    }
}

function extractMetadata(raw: string, fallbackName: string): PuzzleMetadata {

    function readStringField(data: unknown, field: string): string | null {
        if(typeof data !== "object" || data === null) {
            return null
        }
        const value = (data as Record<string, unknown>)[field]
        return typeof value === "string" ? value : null
    }

    try {
        const data: unknown = JSON.parse(raw)
        return {
            error: null,
            name: readStringField(data, "name") || fallbackName,
            author: readStringField(data, "author"),
            description: readStringField(data, "description"),
            createdUTCString: readStringField(data, "createdUTCString"),
            modifiedUTCString: readStringField(data, "modifiedUTCString"),
        }
    } catch(error) {
        return {
            error: String(error),
            name: fallbackName,
            author: null,
            description: null,
            createdUTCString: null,
            modifiedUTCString: null,
        }
    }
}

function isErrnoException(error: unknown): error is NodeJS.ErrnoException {
    return typeof error === "object" && error !== null && "code" in error
}

const app = express()
app.use(cors())
app.use(express.json())
app.use((request, _response, next) => {
    console.log(`${request.method} ${request.path}`)
    next()
})

app.get("/api/puzzles/", async (_request, response) => {
    const entries = await readdir(dataDir, {withFileTypes: true})
    const puzzles: PuzzleMetadata[] = []
    for(const entry of entries) {
        if(!entry.isFile()) {
            continue
        }
        const puzzleName = fileNameToPuzzleName(entry.name)
        if(!puzzleName) {
            continue
        }

        const filePath = path.join(dataDir, entry.name)
        try {
            const raw = await readFile(filePath, "utf-8")
            puzzles.push(extractMetadata(raw, puzzleName))
        } catch(error) {
            puzzles.push({
                error: String(error),
                name: puzzleName,
                author: null,
                description: null,
                createdUTCString: null,
                modifiedUTCString: null,
            })
        }
    }
    puzzles.sort((a, b) => a.name.localeCompare(b.name))

    response.json({puzzles})
})

app.get("/api/puzzles/:name", async (request, response) => {
    const puzzleName = request.params.name
    const filePath = puzzleNameToFilePath(puzzleName)
    if(!filePath) {
        response.status(400).json({error: `Invalid puzzle name: "${puzzleName}"`})
        return
    }

    let raw: string
    try {
        raw = await readFile(filePath, "utf-8")
    } catch(error) {
        if(isErrnoException(error) && error.code === "ENOENT") {
            response.status(404).json({error: `Puzzle not found: "${puzzleName}"`})
            return
        }
        throw error
    }
    response.type("application/json; charset=utf-8").send(raw)
})

app.put("/api/puzzles/:name", async (request, response) => {
    const puzzleName = request.params.name
    const filePath = puzzleNameToFilePath(puzzleName)
    if(!filePath) {
        response.status(400).json({error: `Invalid puzzle name: "${puzzleName}"`})
        return
    }

    await writeFile(filePath, JSON.stringify(request.body), "utf-8")
    response.json({ok: true})
})

app.delete("/api/puzzles/:name", async (request, response) => {
    const puzzleName = request.params.name
    const filePath = puzzleNameToFilePath(puzzleName)
    if(!filePath) {
        response.status(400).json({error: `Invalid puzzle name: "${puzzleName}"`})
        return
    }

    try {
        await rm(filePath)
    } catch(error) {
        if(isErrnoException(error) && error.code === "ENOENT") {
            response.status(404).json({error: `Puzzle not found: "${puzzleName}"`})
            return
        }
        throw error
    }
    response.json({ok: true})
})

app.all("*notfound", (_request, response) => {
    response.status(404).json({error: "Not found"})
})

const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
    if(error instanceof Error) {
        console.error(error.stack)
    } else {
        console.error(error)
    }
    response.status(500).json({error: String(error)})
}
app.use(errorHandler)

app.listen(port, host, async () => {
    await mkdir(dataDir, {recursive: true})
    console.log(`Puzzle backend listening at http://${host}:${port}${urlBase}`)
    console.log(`Storage directory: ${dataDir}`)
})