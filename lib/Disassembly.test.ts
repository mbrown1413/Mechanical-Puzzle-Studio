import {test, expect, describe} from "vitest"

import {serialize, deserialize} from "~/lib/serialize.ts"
import {SquareGrid} from "~/lib/grids/SquareGrid.ts"
import {Disassembly} from "./Disassembly.ts"

describe("Disassembly", () => {
    const grid = new SquareGrid()

    const disassembly = new Disassembly([
        {
            movedShapes: ["0-0", "0-1", "2"],
            transform: "t:0,0,1",
            repeat: 3,
            separates: true
        },
        {
            movedShapes: ["3"],
            transform: "t:-1,0,0",
            repeat: 1,
            separates: true
        },
        {
            movedShapes: ["0-0", "0-1", "2"],
            transform: "t:0,0,1",
            repeat: 3,
            separates: false
        },
        {
            movedShapes: ["3"],
            transform: "t:-1,0,0",
            repeat: 1,
            separates: false
        },
    ])

    test("compact serialization", () => {
        expect(serialize(disassembly)).toMatchInlineSnapshot(`
          {
            "steps": [
              "shapes=0-0,0-1,2 transform=t:0,0,1 repeat=3 separates",
              "shapes=3 transform=t:-1,0,0 separates",
              "shapes=0-0,0-1,2 transform=t:0,0,1 repeat=3",
              "shapes=3 transform=t:-1,0,0",
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
                    movedShapes: ["0-0", "0-1", "2"],
                    repeat: 3,
                    transform: "t:0,0,1",
                    separates: true
                },
                {
                    movedShapes: ["3"],
                    repeat: 1,
                    transform: "t:-1,0,0",
                    separates: true
                },
                {
                    movedShapes: ["0-0", "0-1", "2"],
                    repeat: 3,
                    transform: "t:0,0,1",
                    separates: false
                },
                {
                    movedShapes: ["3"],
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
              "shapes=0,5 transform=t:1,0,0",
              "shapes=0,1,2 transform=t:1,0,0 separates",
              "shapes=0 transform=t:1,0,0",
              "shapes=1 transform=t:1,0,0",
              "shapes=2 transform=t:1,0,0",
              "shapes=3 transform=t:1,0,0",
              "shapes=4 transform=t:1,0,0",
              "shapes=0 transform=t:1,0,0 separates",
              "shapes=1 transform=t:1,0,0",
              "shapes=2 transform=t:1,0,0",
              "shapes=3 transform=t:1,0,0",
              "shapes=4 transform=t:1,0,0",
              "shapes=4,5 transform=t:1,0,0 separates",
              "shapes=1 transform=t:1,0,0",
              "shapes=2 transform=t:1,0,0",
              "shapes=3 transform=t:1,0,0",
              "shapes=4 transform=t:1,0,0",
              "shapes=5 transform=t:1,0,0",
              "shapes=1 transform=t:1,0,0 separates",
              "shapes=4 transform=t:1,0,0 separates"
            ],
            "type": "Disassembly"
          }
        `)) as Disassembly
        disassembly.reorder()
        expect(serialize(disassembly)).toMatchInlineSnapshot(`
          {
            "steps": [
              "shapes=0,5 transform=t:1,0,0",
              "shapes=0,1,2 transform=t:1,0,0 separates",
              "shapes=0 transform=t:1,0,0",
              "shapes=1 transform=t:1,0,0",
              "shapes=2 transform=t:1,0,0",
              "shapes=0 transform=t:1,0,0 separates",
              "shapes=1 transform=t:1,0,0",
              "shapes=2 transform=t:1,0,0",
              "shapes=1 transform=t:1,0,0",
              "shapes=2 transform=t:1,0,0",
              "shapes=1 transform=t:1,0,0 separates",
              "shapes=3 transform=t:1,0,0",
              "shapes=4 transform=t:1,0,0",
              "shapes=3 transform=t:1,0,0",
              "shapes=4 transform=t:1,0,0",
              "shapes=4,5 transform=t:1,0,0 separates",
              "shapes=4 transform=t:1,0,0",
              "shapes=5 transform=t:1,0,0",
              "shapes=4 transform=t:1,0,0 separates",
              "shapes=3 transform=t:1,0,0",
            ],
            "type": "Disassembly",
          }
        `)
    })

    test("spaceSeparatedParts with one separation", () => {
        const shapes = grid.shapesFromString(`
            0000
            0111
            0000
        `)
        const disassembly = deserialize(JSON.parse(`
        {
            "steps": [
                "shapes=1 transform=t:1,0,0 repeat=3 separates"
            ],
            "type": "Disassembly"
        }
        `)) as Disassembly
        disassembly.spaceSepratedParts(grid, shapes)
        expect(serialize(disassembly)).toMatchInlineSnapshot(`
          {
            "steps": [
              "shapes=1 transform=t:1,0,0 repeat=4 separates",
            ],
            "type": "Disassembly",
          }
        `)
    })

    test("spaceSeparatedParts with two separations", () => {
        const shapes = grid.shapesFromString(`
            0000
            0111
            0221
            0111
            0000
        `)
        const disassembly = deserialize(JSON.parse(`
        {
            "steps": [
                "shapes=0 transform=t:-1,0,0 repeat=3 separates",
                "shapes=2 transform=t:-1,0,0 repeat=2 separates"
            ],
            "type": "Disassembly"
        }
        `)) as Disassembly
        disassembly.spaceSepratedParts(grid, shapes)
        expect(serialize(disassembly)).toMatchInlineSnapshot(`
          {
            "steps": [
              "shapes=0 transform=t:-1,0,0 repeat=7 separates",
              "shapes=2 transform=t:-1,0,0 repeat=3 separates",
            ],
            "type": "Disassembly",
          }
        `)
    })

    test("spaceSeparatedParts with an intersection in the orthogonal direction thep parts separated", () => {
        const shapes = grid.shapesFromString(`
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
            "shapes=1,2 transform=t:1,0,0 repeat=3 separates",
            "shapes=3,4 transform=t:1,0,0 repeat=3 separates",
            "shapes=2 transform=t:0,1,0 repeat=2 separates",
            "shapes=4 transform=t:0,-1,0 repeat=2 separates"
            ],
            "type": "Disassembly"
        }
        `)) as Disassembly
        disassembly.spaceSepratedParts(grid, shapes)
        expect(serialize(disassembly)).toMatchInlineSnapshot(`
          {
            "steps": [
              "shapes=1,2 transform=t:1,0,0 repeat=8 separates",
              "shapes=3,4 transform=t:1,0,0 repeat=4 separates",
              "shapes=2 transform=t:0,1,0 repeat=3 separates",
              "shapes=4 transform=t:0,-1,0 repeat=3 separates",
            ],
            "type": "Disassembly",
          }
        `)
    })

    test("spaceSeparatedParts with an intersection that happens during a separation but not after the separation", () => {
        const shapes = grid.shapesFromString(`
            012
        `)
        const disassembly = deserialize(JSON.parse(`
        {
          "steps": [
            "shapes=2 transform=t:1,0,0 separates",
            "shapes=1 transform=t:1,0,0 repeat=4 separates"
          ],
          "type": "Disassembly"
        }
        `)) as Disassembly
        disassembly.spaceSepratedParts(grid, shapes)
        expect(serialize(disassembly)).toMatchInlineSnapshot(`
          {
            "steps": [
              "shapes=2 transform=t:1,0,0 repeat=5 separates",
              "shapes=1 transform=t:1,0,0 repeat=4 separates",
            ],
            "type": "Disassembly",
          }
        `)
    })

    test("spaceSeparatedParts with malformed disassembly", () => {
        const shapes = grid.shapesFromString(`
            0000
            01 0
            0000
        `)
        const disassembly = deserialize(JSON.parse(`
        {
          "steps": [
            "shapes=1 transform=t:1,0,0 separates"
          ],
          "type": "Disassembly"
        }
        `)) as Disassembly
        disassembly.spaceSepratedParts(grid, shapes)
        expect(serialize(disassembly)).toMatchInlineSnapshot(`
          {
            "steps": [
              "shapes=1 transform=t:1,0,0 repeat=4 separates",
            ],
            "type": "Disassembly",
          }
        `)
    })

    test("applyWeights", () => {
        let shapes = grid.shapesFromString(`
            00001
        `)
        let disassembly = deserialize({
            "type": "Disassembly",
            "steps": [
                "shapes=0 transform=t:1,0,0 repeat=3 separates"
            ]
        }) as Disassembly
        disassembly.applyWeights(grid, shapes)
        expect(serialize(disassembly)).toEqual({
            "type": "Disassembly",
            "steps": [
                "shapes=1 transform=t:-1,0,0 repeat=3 separates"
            ]
        })

        // Already weighted correctly, so it should not be modified
        disassembly = deserialize({
            "type": "Disassembly",
            "steps": [
                "shapes=1 transform=t:-1,0,0 repeat=3 separates"
            ]
        }) as Disassembly
        disassembly.applyWeights(grid, shapes)
        expect(serialize(disassembly)).toEqual({
            "type": "Disassembly",
            "steps": [
                "shapes=1 transform=t:-1,0,0 repeat=3 separates"
            ]
        })

        // Individual shapes add their voxels to be "heavier"
        shapes = grid.shapesFromString(`
            0123444
        `)
        disassembly = deserialize({
            "type": "Disassembly",
            "steps": [
                "shapes=0,1,2,3 transform=t:1,0,0"
            ]
        }) as Disassembly
        disassembly.applyWeights(grid, shapes)
        expect(serialize(disassembly)).toEqual({
            "type": "Disassembly",
            "steps": [
                "shapes=4 transform=t:-1,0,0"
            ]
        })
    })
})