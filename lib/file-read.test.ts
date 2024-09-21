import {test, expect, describe} from "vitest"
import {gzipSync, strToU8} from "fflate"

import {readPuzzleFileString, readPuzzleFileBuffer} from "./file-read.ts"
import {PuzzleFile} from "~/lib/PuzzleFile.ts"
import {Puzzle} from "~/lib/Puzzle.ts"
import {CubicGrid} from "~/lib/grids/CubicGrid.ts"

function compress(strIn: string) {
    const bufIn = strToU8(strIn)
    return gzipSync(bufIn)
}

const emptyPuzzle = new PuzzleFile(
    new Puzzle(new CubicGrid()),
    "empty_puzzle"
)
delete emptyPuzzle["createdUTCString"]

const emptyNativeFormat = `{
    "type": "PuzzleFile",
    "name": "empty_puzzle",
    "puzzle": {
        "type": "Puzzle",
        "grid": {
            "type": "CubicGrid"
        },
        "pieces": [],
        "problems": [],
        "idCounters": {}
    }
}`

const emptyBtFormat = `
    <?xml version="1.0"?>
    <puzzle version="2">
        <gridType type="0"/>
        <colors/>
        <shapes/>
        <problems/>
        <comment/>
    </puzzle>
`

describe("readPuzzleFile reading JSON", () => {

    test("empty string", () => {
        expect(
            readPuzzleFileString("", "puzzleFile.json")
        ).rejects.toThrowErrorMatchingInlineSnapshot(`
          [Error: Could not read file format
          Appears not to be gzip compressed due to gzip error: invalid gzip data
          Could not parse as JSON: SyntaxError: Unexpected end of JSON input
          Could not parse as XML: undefined]
        `)
    })

    test("empty puzzle", () => {
        expect(
            readPuzzleFileString(emptyNativeFormat, "puzzleFile.json")
        ).resolves.toEqual({
            fileType: "Native",
            puzzleFile: emptyPuzzle,
        })
    })

    test("empty puzzle compressed", () => {
        const compressed = compress(emptyNativeFormat)
        expect(
            readPuzzleFileBuffer(compressed, "puzzleFile.json")
        ).resolves.toEqual({
            fileType: "Native",
            puzzleFile: emptyPuzzle,
        })
    })

    test("json but not a PuzzleFile", () => {
        const notPuzzleFile = JSON.parse(emptyNativeFormat)
        notPuzzleFile.type = "NotPuzzleFile"
        expect(
            readPuzzleFileString(JSON.stringify(notPuzzleFile), "puzzleFile.json")
        ).rejects.toThrowErrorMatchingInlineSnapshot(`
          [Error: File appears to be JSON but not a PuzzleFile.
          The "type" key should be "PuzzleFile", not "NotPuzzleFile".]
        `)

        delete notPuzzleFile["type"]
        expect(
            readPuzzleFileString(JSON.stringify(notPuzzleFile), "puzzleFile.json")
        ).rejects.toThrowErrorMatchingInlineSnapshot(`
          [Error: File appears to be JSON but not a PuzzleFile.
          The "type" key should be "PuzzleFile", but it is not present.]
        `)
    })

    test("invalid json", () => {
        const notPuzzleFile = emptyNativeFormat.slice(1)
        expect(
            readPuzzleFileString(notPuzzleFile, "puzzleFile.json")
        ).rejects.toThrowErrorMatchingInlineSnapshot(`
          [Error: Could not read file format
          Appears not to be gzip compressed due to gzip error: invalid gzip data
          Could not parse as JSON: SyntaxError: Unexpected non-whitespace character after JSON at position 11
          Could not parse as XML: Non-whitespace before first tag.
          Line: 1
          Column: 5
          Char: "]
        `)
    })

})
describe("readPuzzleFile reading XML", () => {

    test("BurrTools", () => {
        expect(
            readPuzzleFileString(emptyBtFormat, "empty_puzzle")
        ).resolves.toEqual({
            fileType: "BurrTools",
            puzzleFile: emptyPuzzle,
        })
    })

    test("BurrTools compressed", () => {
        const compressed = compress(emptyBtFormat)
        expect(
            readPuzzleFileBuffer(compressed, "empty_puzzle")
        ).resolves.toEqual({
            fileType: "BurrTools",
            puzzleFile: emptyPuzzle,
        })
    })

    test("XML but not a PuzzleFile", () => {
        const notPuzzleFile = `
            <?xml version="1.0"?>
            <notpuzzle version="2">
                <gridType type="0"/>
                <colors/>
                <shapes/>
                <problems/>
                <comment/>
            </notpuzzle>
        `
        expect(
            readPuzzleFileString(notPuzzleFile, "empty_puzzle")
        ).rejects.toThrowErrorMatchingInlineSnapshot(`[Error: Malformatted BurrTools file: root xml element must be "puzzle", not "notpuzzle"]`)
    })

    test("invalid xml", () => {
        const notPuzzleFile = emptyBtFormat.slice(8)
        expect(
            readPuzzleFileString(notPuzzleFile, "empty_puzzle")
        ).rejects.toThrowErrorMatchingInlineSnapshot(`
          [Error: Could not read file format
          Appears not to be gzip compressed due to gzip error: invalid gzip data
          Could not parse as JSON: SyntaxError: Unexpected token 'm', "ml version"... is not valid JSON
          Could not parse as XML: Non-whitespace before first tag.
          Line: 0
          Column: 1
          Char: m]
        `)
    })

})