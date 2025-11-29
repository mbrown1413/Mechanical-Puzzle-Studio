import {test, expect, describe} from "vitest"

import {SimpleDisassembler} from "./Disassembler.ts"
import {SquareGrid} from "~/lib/grids/SquareGrid.ts"
import {serialize} from "~/lib/serialize.ts"

describe("Disassembler", () => {
    const grid = new SquareGrid()

    test("Disassembles in one move", () => {
        const shapes = grid.shapesFromString(`
            00
            01
            00
        `)
        const disassembler = new SimpleDisassembler(grid, shapes)
        const disassemblies = disassembler.disassemble()
        expect(serialize(disassembler.nodes)).toMatchInlineSnapshot(`
          [
            {
              "children": [
                {
                  "movedShapes": [
                    "0",
                  ],
                  "parts": [
                    -1,
                    -1,
                  ],
                  "repeat": 1,
                  "transform": "t:-1,0,0",
                },
              ],
              "depth": 0,
              "solved": true,
            },
          ]
        `)

        expect(serialize(disassemblies)).toMatchInlineSnapshot(`
          [
            {
              "steps": [
                "shapes=1 transform=t:1,0,0 separates",
              ],
              "type": "Disassembly",
            },
          ]
        `)
    })


    test("Disassembles in two moves", () => {
        const shapes = grid.shapesFromString(`
            00
             10
            00
        `)
        const disassembler = new SimpleDisassembler(grid, shapes)
        const disassemblies = disassembler.disassemble()
        expect(serialize(disassembler.nodes)).toMatchInlineSnapshot(`
          [
            {
              "children": [
                {
                  "movedShapes": [
                    "0",
                  ],
                  "parts": [
                    -1,
                    -1,
                  ],
                  "repeat": 2,
                  "transform": "t:1,0,0",
                },
              ],
              "depth": 0,
              "solved": true,
            },
          ]
        `)

        expect(serialize(disassemblies)).toMatchInlineSnapshot(`
          [
            {
              "steps": [
                "shapes=1 transform=t:-1,0,0 repeat=2 separates",
              ],
              "type": "Disassembly",
            },
          ]
        `)
    })


    test("Not disassemblable", () => {
        const shapes = grid.shapesFromString(`
            0000
            01 0
            0000
        `)
        const disassembler = new SimpleDisassembler(grid, shapes)
        const disassemblies = disassembler.disassemble()
        expect(serialize(disassembler.nodes)).toMatchInlineSnapshot(`
          [
            {
              "children": [
                {
                  "movedShapes": [
                    "0",
                  ],
                  "parts": [
                    1,
                  ],
                  "repeat": 1,
                  "transform": "t:-1,0,0",
                },
              ],
              "depth": 0,
            },
            {
              "children": [],
              "depth": 1,
            },
          ]
        `)

        expect(disassemblies).toEqual([])
    })


    test("Disassemble 3 shapes", () => {
        const shapes = grid.shapesFromString(`
            012
        `)
        const disassembler = new SimpleDisassembler(grid, shapes)
        const disassemblies = disassembler.disassemble()
        expect(serialize(disassembler.nodes)).toMatchInlineSnapshot(`
          [
            {
              "children": [
                {
                  "movedShapes": [
                    "0",
                  ],
                  "parts": [
                    -1,
                    1,
                  ],
                  "repeat": 1,
                  "transform": "t:-1,0,0",
                },
              ],
              "depth": 0,
              "solved": true,
            },
            {
              "children": [
                {
                  "movedShapes": [
                    "1",
                  ],
                  "parts": [
                    -1,
                    -1,
                  ],
                  "repeat": 1,
                  "transform": "t:-1,0,0",
                },
              ],
              "depth": 1,
              "solved": true,
            },
          ]
        `)

        expect(serialize(disassemblies)).toMatchInlineSnapshot(`
          [
            {
              "steps": [
                "shapes=0 transform=t:-1,0,0 separates",
                "shapes=1 transform=t:-1,0,0 separates",
              ],
              "type": "Disassembly",
            },
          ]
        `)
    })


    test("Complex disassembly 1", () => {
        const shapes = grid.shapesFromString(`
            00000
            02320
            02321
            02221
            01111
            00000
        `)
        const disassembler = new SimpleDisassembler(grid, shapes)
        disassembler.findAll = true
        const disassemblies = disassembler.disassemble()
        expect(serialize(disassembler.nodes)).toMatchInlineSnapshot(`
          [
            {
              "children": [
                {
                  "movedShapes": [
                    "1",
                  ],
                  "parts": [
                    -1,
                    1,
                  ],
                  "repeat": 4,
                  "transform": "t:1,0,0",
                },
              ],
              "depth": 0,
              "solved": true,
            },
            {
              "children": [
                {
                  "movedShapes": [
                    "0",
                  ],
                  "parts": [
                    2,
                  ],
                  "repeat": 1,
                  "transform": "t:0,1,0",
                },
                {
                  "movedShapes": [
                    "2",
                  ],
                  "parts": [
                    3,
                  ],
                  "repeat": 1,
                  "transform": "t:0,-1,0",
                },
              ],
              "depth": 1,
              "solved": true,
            },
            {
              "children": [
                {
                  "movedShapes": [
                    "0",
                  ],
                  "parts": [
                    -1,
                    4,
                  ],
                  "repeat": 4,
                  "transform": "t:-1,0,0",
                },
              ],
              "depth": 2,
              "solved": true,
            },
            {
              "children": [
                {
                  "movedShapes": [
                    "0",
                  ],
                  "parts": [
                    5,
                  ],
                  "repeat": 1,
                  "transform": "t:-1,0,0",
                },
              ],
              "depth": 2,
            },
            {
              "children": [
                {
                  "movedShapes": [
                    "2",
                  ],
                  "parts": [
                    -1,
                    -1,
                  ],
                  "repeat": 2,
                  "transform": "t:0,-1,0",
                },
              ],
              "depth": 3,
              "solved": true,
            },
            {
              "children": [
                {
                  "movedShapes": [
                    "0",
                    "2",
                  ],
                  "parts": [
                    6,
                  ],
                  "repeat": 1,
                  "transform": "t:0,1,0",
                },
              ],
              "depth": 3,
            },
            {
              "children": [],
              "depth": 4,
            },
          ]
        `)

        expect(serialize(disassemblies)).toMatchInlineSnapshot(`
          [
            {
              "steps": [
                "shapes=1 transform=t:1,0,0 repeat=4 separates",
                "shapes=2,3 transform=t:0,-1,0",
                "shapes=2,3 transform=t:1,0,0 repeat=4 separates",
                "shapes=3 transform=t:0,1,0 repeat=2 separates",
              ],
              "type": "Disassembly",
            },
          ]
        `)
    })


    test("Complex disassembly 2", () => {
        const shapes = grid.shapesFromString(`
            0000
            0111
            0121
            0330
            0000
        `)
        const disassembler = new SimpleDisassembler(grid, shapes)
        disassembler.findAll = true
        const disassemblies = disassembler.disassemble()
        expect(serialize(disassembler.nodes)).toMatchInlineSnapshot(`
          [
            {
              "children": [
                {
                  "movedShapes": [
                    "3",
                    "0",
                  ],
                  "parts": [
                    1,
                    2,
                  ],
                  "repeat": 3,
                  "transform": "t:-1,0,0",
                },
              ],
              "depth": 0,
              "solved": true,
            },
            {
              "children": [
                {
                  "movedShapes": [
                    "0",
                  ],
                  "parts": [
                    3,
                  ],
                  "repeat": 1,
                  "transform": "t:0,-1,0",
                },
                {
                  "movedShapes": [
                    "0",
                  ],
                  "parts": [
                    4,
                  ],
                  "repeat": 2,
                  "transform": "t:0,-1,0",
                },
              ],
              "depth": 1,
              "solved": true,
            },
            {
              "children": [
                {
                  "movedShapes": [
                    "1",
                  ],
                  "parts": [
                    -1,
                    -1,
                  ],
                  "repeat": 1,
                  "transform": "t:0,1,0",
                },
              ],
              "depth": 1,
              "solved": true,
            },
            {
              "children": [
                {
                  "movedShapes": [
                    "0",
                  ],
                  "parts": [
                    -1,
                    -1,
                  ],
                  "repeat": 3,
                  "transform": "t:-1,0,0",
                },
              ],
              "depth": 2,
              "solved": true,
            },
            {
              "children": [
                {
                  "movedShapes": [
                    "0",
                  ],
                  "parts": [
                    -1,
                    -1,
                  ],
                  "repeat": 3,
                  "transform": "t:-1,0,0",
                },
              ],
              "depth": 2,
              "solved": true,
            },
          ]
        `)

        expect(serialize(disassemblies)).toMatchInlineSnapshot(`
          [
            {
              "steps": [
                "shapes=1,2 transform=t:1,0,0 repeat=3 separates",
                "shapes=2 transform=t:0,-1,0 separates",
                "shapes=3 transform=t:0,1,0 repeat=2",
                "shapes=3 transform=t:1,0,0 repeat=3 separates",
              ],
              "type": "Disassembly",
            },
            {
              "steps": [
                "shapes=1,2 transform=t:1,0,0 repeat=3 separates",
                "shapes=2 transform=t:0,-1,0 separates",
                "shapes=3 transform=t:0,1,0",
                "shapes=3 transform=t:1,0,0 repeat=3 separates",
              ],
              "type": "Disassembly",
            },
          ]
        `)
    })
})