import {test, expect, describe} from "vitest"

import {serialize, deserialize} from "~/lib/serialize.ts"
import {SquareGrid} from "~/lib/grids/SquareGrid.ts"
import {Disassembly} from "./Disassembly.ts"

describe("Disassembly", () => {
    const grid = new SquareGrid()

    const disassembly = new Disassembly([
        {
            movedPieces: ["0-0", "0-1", "2"],
            transform: "t:0,0,1",
            repeat: 3,
            separates: true
        },
        {
            movedPieces: ["3"],
            transform: "t:-1,0,0",
            repeat: 1,
            separates: true
        },
        {
            movedPieces: ["0-0", "0-1", "2"],
            transform: "t:0,0,1",
            repeat: 3,
            separates: false
        },
        {
            movedPieces: ["3"],
            transform: "t:-1,0,0",
            repeat: 1,
            separates: false
        },
    ])

    test("compact serialization", () => {
        expect(serialize(disassembly)).toMatchInlineSnapshot(`
          {
            "steps": [
              "pieces=0-0,0-1,2 transform=t:0,0,1 repeat=3 separates",
              "pieces=3 transform=t:-1,0,0 separates",
              "pieces=0-0,0-1,2 transform=t:0,0,1 repeat=3",
              "pieces=3 transform=t:-1,0,0",
            ],
            "type": "Disassembly",
          }
        `)
        expect(deserialize(serialize(disassembly))).toEqual(disassembly)
    })

    test("deserialization from non-compact form", () => {
        const serialized = {
            type: "Disassembly",
            steps: [
                {
                    movedPieces: ["0-0", "0-1", "2"],
                    repeat: 3,
                    transform: "t:0,0,1",
                    separates: true
                },
                {
                    movedPieces: ["3"],
                    repeat: 1,
                    transform: "t:-1,0,0",
                    separates: true
                },
                {
                    movedPieces: ["0-0", "0-1", "2"],
                    repeat: 3,
                    transform: "t:0,0,1",
                    separates: false
                },
                {
                    movedPieces: ["3"],
                    repeat: 1,
                    transform: "t:-1,0,0",
                    separates: false
                },
            ],
        }
        expect(deserialize(serialized)).toEqual(disassembly)
    })

    test("reorder", () => {
        const disassembly = deserialize(JSON.parse(`
          {
            "steps": [
              "pieces=0,5 transform=t:1,0,0",
              "pieces=0,1,2 transform=t:1,0,0 separates",
              "pieces=0 transform=t:1,0,0",
              "pieces=1 transform=t:1,0,0",
              "pieces=2 transform=t:1,0,0",
              "pieces=3 transform=t:1,0,0",
              "pieces=4 transform=t:1,0,0",
              "pieces=0 transform=t:1,0,0 separates",
              "pieces=1 transform=t:1,0,0",
              "pieces=2 transform=t:1,0,0",
              "pieces=3 transform=t:1,0,0",
              "pieces=4 transform=t:1,0,0",
              "pieces=4,5 transform=t:1,0,0 separates",
              "pieces=1 transform=t:1,0,0",
              "pieces=2 transform=t:1,0,0",
              "pieces=3 transform=t:1,0,0",
              "pieces=4 transform=t:1,0,0",
              "pieces=5 transform=t:1,0,0",
              "pieces=1 transform=t:1,0,0 separates",
              "pieces=4 transform=t:1,0,0 separates"
            ],
            "type": "Disassembly"
          }
        `)) as Disassembly
        disassembly.reorder()
        expect(serialize(disassembly)).toMatchInlineSnapshot(`
          {
            "steps": [
              "pieces=0,5 transform=t:1,0,0",
              "pieces=0,1,2 transform=t:1,0,0 separates",
              "pieces=0 transform=t:1,0,0",
              "pieces=1 transform=t:1,0,0",
              "pieces=2 transform=t:1,0,0",
              "pieces=0 transform=t:1,0,0 separates",
              "pieces=1 transform=t:1,0,0",
              "pieces=2 transform=t:1,0,0",
              "pieces=1 transform=t:1,0,0",
              "pieces=2 transform=t:1,0,0",
              "pieces=1 transform=t:1,0,0 separates",
              "pieces=3 transform=t:1,0,0",
              "pieces=4 transform=t:1,0,0",
              "pieces=3 transform=t:1,0,0",
              "pieces=4 transform=t:1,0,0",
              "pieces=4,5 transform=t:1,0,0 separates",
              "pieces=4 transform=t:1,0,0",
              "pieces=5 transform=t:1,0,0",
              "pieces=4 transform=t:1,0,0 separates",
              "pieces=3 transform=t:1,0,0",
            ],
            "type": "Disassembly",
          }
        `)
    })

    test("spaceSeparatedParts with one separation", () => {
        const pieces = grid.piecesFromString(`
            0000
            0111
            0000
        `)
        const disassembly = deserialize(JSON.parse(`
        {
            "steps": [
                "pieces=1 transform=t:1,0,0 repeat=3 separates"
            ],
            "type": "Disassembly"
        }
        `)) as Disassembly
        disassembly.spaceSepratedParts(grid, pieces)
        expect(serialize(disassembly)).toMatchInlineSnapshot(`
          {
            "steps": [
              "pieces=1 transform=t:1,0,0 repeat=4 separates",
            ],
            "type": "Disassembly",
          }
        `)
    })

    test("spaceSeparatedParts with two separations", () => {
        const pieces = grid.piecesFromString(`
            0000
            0111
            0221
            0111
            0000
        `)
        const disassembly = deserialize(JSON.parse(`
        {
            "steps": [
                "pieces=0 transform=t:-1,0,0 repeat=3 separates",
                "pieces=2 transform=t:-1,0,0 repeat=2 separates"
            ],
            "type": "Disassembly"
        }
        `)) as Disassembly
        disassembly.spaceSepratedParts(grid, pieces)
        expect(serialize(disassembly)).toMatchInlineSnapshot(`
          {
            "steps": [
              "pieces=0 transform=t:-1,0,0 repeat=7 separates",
              "pieces=2 transform=t:-1,0,0 repeat=3 separates",
            ],
            "type": "Disassembly",
          }
        `)
    })

    test("spaceSeparatedParts with an intersection in the orthogonal direction thep parts separated", () => {
        const pieces = grid.piecesFromString(`
            0000
            0333
            0343
            0343
            0121
            0121
            0111
            0000
        `)
        const disassembly = deserialize(JSON.parse(`
        {
            "steps": [
            "pieces=1,2 transform=t:1,0,0 repeat=3 separates",
            "pieces=3,4 transform=t:1,0,0 repeat=3 separates",
            "pieces=2 transform=t:0,1,0 repeat=2 separates",
            "pieces=4 transform=t:0,-1,0 repeat=2 separates"
            ],
            "type": "Disassembly"
        }
        `)) as Disassembly
        disassembly.spaceSepratedParts(grid, pieces)
        expect(serialize(disassembly)).toMatchInlineSnapshot(`
          {
            "steps": [
              "pieces=1,2 transform=t:1,0,0 repeat=8 separates",
              "pieces=3,4 transform=t:1,0,0 repeat=4 separates",
              "pieces=2 transform=t:0,1,0 repeat=3 separates",
              "pieces=4 transform=t:0,-1,0 repeat=3 separates",
            ],
            "type": "Disassembly",
          }
        `)
    })

    test("spaceSeparatedParts with an intersection that happens during a separation but not after the separation", () => {
        const pieces = grid.piecesFromString(`
            012
        `)
        const disassembly = deserialize(JSON.parse(`
        {
          "steps": [
            "pieces=2 transform=t:1,0,0 separates",
            "pieces=1 transform=t:1,0,0 repeat=4 separates"
          ],
          "type": "Disassembly"
        }
        `)) as Disassembly
        disassembly.spaceSepratedParts(grid, pieces)
        expect(serialize(disassembly)).toMatchInlineSnapshot(`
          {
            "steps": [
              "pieces=2 transform=t:1,0,0 repeat=5 separates",
              "pieces=1 transform=t:1,0,0 repeat=4 separates",
            ],
            "type": "Disassembly",
          }
        `)
    })

    test("spaceSeparatedParts with malformed disassembly", () => {
        const pieces = grid.piecesFromString(`
            0000
            01 0
            0000
        `)
        const disassembly = deserialize(JSON.parse(`
        {
          "steps": [
            "pieces=1 transform=t:1,0,0 separates"
          ],
          "type": "Disassembly"
        }
        `)) as Disassembly
        disassembly.spaceSepratedParts(grid, pieces)
        expect(serialize(disassembly)).toMatchInlineSnapshot(`
          {
            "steps": [
              "pieces=1 transform=t:1,0,0 repeat=4 separates",
            ],
            "type": "Disassembly",
          }
        `)
    })
})