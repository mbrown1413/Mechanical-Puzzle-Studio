import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises"
import { createServer, type IncomingMessage, type ServerResponse } from "node:http"
import path from "node:path"

import { PuzzleMetadata } from "~lib"


const host = process.env.VITE_BACKEND_HOST ?? "127.0.0.1"
const port = Number.parseInt(process.env.VITE_BACKEND_PORT ?? "8787", 10)
const urlBase = "/api"
const puzzlesPrefix = `${urlBase}/puzzles`
const dataDir = path.resolve(process.cwd(), process.env.VITE_BACKEND_PUZZLE_STORAGE ?? "data/puzzles")

const maxBodyBytes = 20 * 1024 * 1024

function sendJson(response: ServerResponse<IncomingMessage>, status: number, payload: unknown): void {
    const body = JSON.stringify(payload)
    sendText(response, status, body, "application/json; charset=utf-8")
}

function sendText(
    response: ServerResponse<IncomingMessage>,
    status: number,
    body: string,
    contentType = "text/plain; charset=utf-8",
): void {
    response.writeHead(status, {
        "Content-Type": contentType,
        "Content-Length": Buffer.byteLength(body).toString(),
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
    })
    response.end(body)
}

function fileNameFromPuzzleName(name: string): string {
    return `${encodeURIComponent(name)}.json`
}

function puzzleNameFromFileName(fileName: string): string | null {
    if(!fileName.endsWith(".json")) {
        return null
    }
    try {
        return decodeURIComponent(fileName.slice(0, -".json".length))
    } catch {
        return null
    }
}

async function readRequestBody(request: IncomingMessage): Promise<string> {
    return await new Promise<string>((resolve, reject) => {
        const chunks: Uint8Array[] = []
        let bytes = 0
        request.on("data", (chunk: Uint8Array) => {
            bytes += chunk.length
            if(bytes > maxBodyBytes) {
                reject(new Error(`Request body too large (max ${maxBodyBytes} bytes)`))
                request.destroy()
                return
            }
            chunks.push(chunk)
        })
        request.on("end", () => {
            resolve(Buffer.concat(chunks).toString("utf-8"))
        })
        request.on("error", reject)
    })
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

async function handleListPuzzles(request: IncomingMessage, response: ServerResponse<IncomingMessage>) {
    if(request.method !== "GET") {
        sendJson(response, 405, {error: "Method not allowed"})
        return
    }

    const entries = await readdir(dataDir, {withFileTypes: true})
    const puzzles: PuzzleMetadata[] = []
    for(const entry of entries) {
        if(!entry.isFile()) {
            continue
        }
        const puzzleName = puzzleNameFromFileName(entry.name)
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

    sendJson(response, 200, {puzzles})
    return
}

async function handlePuzzleRequest(request: IncomingMessage, response: ServerResponse<IncomingMessage>, puzzleName: string) {
    const filePath = path.join(dataDir, fileNameFromPuzzleName(puzzleName))

    if(request.method === "GET") {
        try {
            const raw = await readFile(filePath, "utf-8")
            sendText(response, 200, raw, "application/json; charset=utf-8")
        } catch(error) {
            if(isErrnoException(error) && error.code === "ENOENT") {
                sendJson(response, 404, {error: `Puzzle not found: "${puzzleName}"`})
                return
            }
            throw error
        }
        return
    }

    if(request.method === "PUT") {
        let raw = ""
        try {
            raw = await readRequestBody(request)
            JSON.parse(raw)
        } catch(error) {
            sendJson(response, 400, {error: `Invalid puzzle JSON: ${String(error)}`})
            return
        }

        await writeFile(filePath, raw, "utf-8")
        sendJson(response, 200, {ok: true})
        return
    }

    if(request.method === "DELETE") {
        try {
            await rm(filePath)
        } catch(error) {
            if(isErrnoException(error) && error.code === "ENOENT") {
                sendJson(response, 404, {error: `Puzzle not found: "${puzzleName}"`})
                return
            }
            throw error
        }
        sendJson(response, 200, {ok: true})
        return
    }

    sendJson(response, 405, {error: "Method not allowed"})
    return
}

function getPuzzleName(pathname: string): {puzzleName?: string, error?: string} {
    const encodedName = pathname.slice(`${puzzlesPrefix}/`.length)
    let name: string
    try {
        name = decodeURIComponent(encodedName)
    } catch {
        return {error: "Invalid puzzle name encoding"}
    }

    if(!name || name === "." || name === ".." ||
        name.includes("/") || name.includes("\\")
    ) {
        return {error: "Invalid puzzle name"}
    }

    return {puzzleName: name}
}

async function handleRequest(request: IncomingMessage, response: ServerResponse<IncomingMessage>): Promise<void> {
    if(!request.url) {
        sendJson(response, 400, {error: "Missing request URL"})
        return
    }

    await mkdir(dataDir, {recursive: true})

    const requestUrl = new URL(request.url, "http://localhost")
    const pathname = requestUrl.pathname

    if(request.method === "OPTIONS") {
        response.writeHead(204, {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, PUT, DELETE, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
        })
        response.end()

    } else if(pathname === puzzlesPrefix) {
        handleListPuzzles(request, response)

    } else if(pathname.startsWith(`${puzzlesPrefix}/`)) {
        const {puzzleName, error} = getPuzzleName(pathname)
        if(error || !puzzleName) {
            sendJson(response, 400, {error: error || "Invalid puzzle name"})
        } else {
            handlePuzzleRequest(request, response, puzzleName)
        }

    } else {
        sendJson(response, 404, {error: "Not found"})
    }
}

const server = createServer((request, response) => {
    console.log(`${request.method} ${request.url}`)
    void handleRequest(request, response).catch((error: unknown) => {
        console.error("Unhandled error", error)
        sendJson(response, 500, {error: String(error)})
    })
})

server.listen(port, host, () => {
    console.log(`Puzzle backend listening at http://${host}:${port}${urlBase}`)
    console.log(`Storage directory: ${dataDir}\n`)
})