import {Puzzle} from "~/lib/Puzzle.ts"
import {SerializableClass, deserialize, deserializeIgnoreErrors, registerClass, serialize, SerializedData} from "~/lib/serialize.ts"

function stripIfStartsWith(input: string, toStrip: string) {
    return input.startsWith(toStrip) ?
        input.slice(toStrip.length).trimStart()
        : input
}

export type PuzzleMetadata = {
    error: string | null,

    author: string | null,
    description: string | null,

    createdUTCString: string | null,
    modifiedUTCString: string | null,
}

/** A `Puzzle` with some extra metadata and conveniences for dealing with
* saving/loading puzzles. */
export class PuzzleFile extends SerializableClass {
    puzzle: Puzzle

    author?: string
    description?: string
    createdUTCString?: string
    modifiedUTCString?: string

    // If true, indicates that initial configuration such as specifying the
    // grid should be done when the user opens the puzzle file.
    needsInitialConfigure: undefined | true

    constructor(
        puzzle: Puzzle,
    ) {
        super()
        this.createdUTCString = new Date().toUTCString()
        this.puzzle = puzzle
    }

    serialize(formatted=false) {
        return JSON.stringify(
            serialize(this),
            null,
            formatted ? 4 : undefined
        )
    }

    static deserialize(data: object): PuzzleFile {
        return deserialize<PuzzleFile>(data as SerializedData, "PuzzleFile")
    }

    /** Tries to retrieve as much data as possible when deserializing, setting
     * errored parts to null. */
    static deserializeIgnoreErrors(data: string): PuzzleFile {
        return deserializeIgnoreErrors(JSON.parse(data)) as PuzzleFile
    }

    /**
     * Attempts to get metadata from a possibly corrupted serialized
     * PuzzleFile.
     */
    static getMetadataSafe(data: string): PuzzleMetadata {
        try {
            return this.deserialize(JSON.parse(data)).getMetadata()
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
                return metadata
            } else {
                return {
                    error: stripIfStartsWith(String(e), "Error:"),
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
            author: this.author || null,
            description: this.description || null,
            createdUTCString: this.createdUTCString || null,
            modifiedUTCString: this.modifiedUTCString || null,
        }
    }
}

registerClass(PuzzleFile)