/**
 * Main entry-point for reading puzzle files in any supported format, including
 * gzip compressed files.
 */

import {gunzipSync, strFromU8, strToU8} from "fflate"

import {PuzzleFile} from "~/lib/PuzzleFile.ts"
import {readBurrTools, readXmlForBurrTools} from "~/lib/burrtools.ts"

type PuzzleFileReadResult = {
    fileType: "BurrTools" | "Native"
    puzzleFile: PuzzleFile
    unsupportedFeatures?: string[]
}

/**
 * Read a puzzle from a File object in any supported format.
 */
export async function readPuzzleFile(file: File): Promise<PuzzleFileReadResult> {
    const buffer = await asyncFileRead(file)
    return readPuzzleFileBuffer(buffer, file.name)
}

/**
 * Read a puzzle from a string in any supported format.
 */
export async function readPuzzleFileString(contents: string, filename: string): Promise<PuzzleFileReadResult> {
    const buffer = strToU8(contents)
    return readPuzzleFileBuffer(buffer.buffer, filename)
}

/**
 * Read a puzzle from an ArrayBuffer in any supported format.
 */
export async function readPuzzleFileBuffer(buffer: ArrayBuffer, filename: string): Promise<PuzzleFileReadResult> {
    const bufferU8 = new Uint8Array(buffer)

    // Try gzip decompression, or assume uncompresed if it fails
    let uncompressed
    let gzipError
    try {
        // Note: Async gunzip would be better here, but for some reason it
        // doesn't work in the final build.
        uncompressed = gunzipSync(bufferU8)
    } catch(e) {
        uncompressed = bufferU8
        gzipError = e
    }
    const stringContents = strFromU8(uncompressed)

    // Try parsing as JSON first
    let jsonData
    let jsonError
    try {
        jsonData = JSON.parse(stringContents)
    } catch(e) {
        jsonData = false
        jsonError = e
    }

    // We have a native format PuzzleFile if JSON worked
    if(jsonData) {
        if(jsonData.type === undefined) {
            throw new Error(
                "File appears to be JSON but not a PuzzleFile.\n" +
                `The "type" key should be "PuzzleFile", but it is not present.`
            )
        }
        if(jsonData.type !== "PuzzleFile") {
            throw new Error(
                "File appears to be JSON but not a PuzzleFile.\n" +
                `The "type" key should be "PuzzleFile", not "${jsonData.type}".`
            )
        }
        const puzzleFile = PuzzleFile.deserialize(jsonData)
        return {
            fileType: "Native",
            puzzleFile,
        }
    }

    // Try XML
    let xmlData
    let xmlError
    try {
        xmlData = await readXmlForBurrTools(stringContents)
    } catch(e) {
        xmlData = false as const
        xmlError = e
    }

    if(xmlData) {
        const result = await readBurrTools(filename, xmlData)
        return {
            fileType: "BurrTools",
            ...result
        }
    }

    let gzipMsg: string
    if(gzipError) {
        gzipMsg = `Appears not to be gzip compressed due to gzip error: ${stripIfStartsWith(String(gzipError), "Error: ")}`
    } else {
        gzipMsg = `Successfully gzip decompressed`
    }
    throw new Error(
        `Could not read file format\n` +
        `${gzipMsg}\n` +
        `Could not parse as JSON: ${stripIfStartsWith(String(jsonError), "Error: ")}\n` +
        `Could not parse as XML: ${stripIfStartsWith(String(xmlError), "Error: ")}`
    )

}

function stripIfStartsWith(input: string, toStrip: string) {
    return input.startsWith(toStrip) ?
        input.slice(toStrip.length).trimStart()
        : input
}

async function asyncFileRead(file: File): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => {
            resolve(reader.result as ArrayBuffer)
        }
        reader.onerror = reject
        reader.readAsArrayBuffer(file)
    })
}