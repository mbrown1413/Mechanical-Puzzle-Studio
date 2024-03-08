import {Puzzle} from "~/lib/Puzzle.ts"
import {SerializableClass, deserialize, deserializeIgnoreErrors, registerClass, serialize} from "~/lib/serialize.ts"

function stripIfStartsWith(input: string, toStrip: string) {
    return input.startsWith(toStrip) ?
        input.slice(toStrip.length).trimStart()
        : input
}

export type PuzzleMetadata = {
    error: string | null,

    name: string,
    author: string | null,
    description: string | null,

    createdUTCString: string | null,
    modifiedUTCString: string | null,
}

/** A `Puzzle` with some extra metadata and conveniences for dealing with
* saving/loading puzzles. */
export class PuzzleFile extends SerializableClass {
    
    /**
     * Used both as an internal identifier, and a human-readable name.
     * Identifies the puzzle uniquely within a stroage. 
     */
    name: string

    author: string
    description: string
    createdUTCString: string
    modifiedUTCString: string
    puzzle: Puzzle

    constructor(
        puzzle: Puzzle,
        name: string,
        author: string="",
        description: string="",
    ) {
        super()
        this.name = name
        this.author = author
        this.description = description
        this.createdUTCString = new Date().toUTCString()
        this.modifiedUTCString = this.createdUTCString
        this.puzzle = puzzle
    }

    serialize(formatted=false) {
        this.modifiedUTCString = new Date().toUTCString()
        return JSON.stringify(
            serialize(this),
            null,
            formatted ? 4 : undefined
        )
    }

    static deserialize(data: string): PuzzleFile {
        return deserialize<PuzzleFile>(JSON.parse(data), "PuzzleFile")
    }

    /** Tries to retrieve as much data as possible when deserializing, setting
     * errored parts to null. */
    static deserializeIgnoreErrors(data: string): PuzzleFile {
        return deserializeIgnoreErrors(JSON.parse(data)) as PuzzleFile
    }

    /**
     * Attempts to get metadata from a possibly corrupted serialized
     * PuzzleFile. Uses the `name` passed in if it can't be obtained from the
     * serialized data.
     */
    static getMetadataSafe(data: string, name: string): PuzzleMetadata {
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
                if(typeof metadata.name !== "string") {
                    metadata.name = name
                }
                return metadata
            } else {
                return {
                    error: stripIfStartsWith(String(e), "Error:"),
                    name,
                    author: null,
                    description: null,
                    createdUTCString: null,
                    modifiedUTCString: null,
                }
            }
        }
    }

    getMetadata(): PuzzleMetadata {
        return {
            error: null,
            name: this.name,
            author: this.author,
            description: this.description,
            createdUTCString: this.createdUTCString,
            modifiedUTCString: this.modifiedUTCString,
        }
    }
}

registerClass(PuzzleFile)