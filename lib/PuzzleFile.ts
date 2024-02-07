import { v4 as uuid } from "uuid"

import {Puzzle} from "~/lib/Puzzle.ts"
import {SerializableClass, deserialize, deserializeIgnoreErrors, registerClass, serialize} from "~/lib/serialize.ts"

function stripIfStartsWith(input: string, toStrip: string) {
    return input.startsWith(toStrip) ?
        input.slice(toStrip.length).trimStart()
        : input
}

export type PuzzleMetadata = {
    error: string | null,

    id: string,
    name: string | null,
    author: string | null,
    description: string | null,

    // Dates in UTC timestamp strings
    created: string | null,
    modified: string | null,
}

export class PuzzleFile extends SerializableClass {
    declare id: string
    puzzle: Puzzle

    name: string
    author: string
    description: string
    created: string
    modified: string

    constructor(
        puzzle: Puzzle,
        name: string,
        author: string="",
        description: string="",
    ) {
        super(uuid())
        this.puzzle = puzzle
        this.name = name
        this.author = author
        this.description = description
        this.created = new Date().toUTCString()
        this.modified = this.created
    }

    serialize() {
        this.modified = new Date().toUTCString()
        return JSON.stringify(serialize(this))
    }

    static deserialize(data: string): PuzzleFile {
        return deserialize<PuzzleFile>(JSON.parse(data), "PuzzleFile")
    }

    static deserializeIgnoreErrors(data: string): PuzzleFile {
        return deserializeIgnoreErrors(JSON.parse(data)) as PuzzleFile
    }

    /**
     * Attempts to get metadata from a possibly corrupted serialized
     * PuzzleFile. Uses the `id` passed in if it can't be obtained from the
    * serialized data.
     */
    static getMetadataSafe(data: string, id: string): PuzzleMetadata {
        try {
            return this.deserialize(data).getMetadata()
        } catch(e) {
            console.error("Puzzle failed to deserialize:\n", e)
            let objData
            try {
                objData = JSON.parse(data)
            } catch {
                objData = {}
            }
            const puzzleFile = deserializeIgnoreErrors(objData)
            let metadata
            if(puzzleFile instanceof PuzzleFile) {
                metadata = puzzleFile.getMetadata()
                metadata.error = stripIfStartsWith(String(e), "Error:")
                if(typeof metadata.id !== "string") {
                    metadata.id = id
                }
                return metadata
            } else {
                return {
                    error: stripIfStartsWith(String(e), "Error:"),
                    id,
                    name: null,
                    author: null,
                    description: null,
                    created: null,
                    modified: null,
                }
            }
        }
    }
    
    getMetadata(): PuzzleMetadata {
        return {
            error: null,
            id: this.id,
            name: this.name,
            author: this.author,
            description: this.description,
            created: this.created,
            modified: this.modified,
        }
    }
}

registerClass(PuzzleFile)