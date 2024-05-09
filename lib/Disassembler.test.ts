import {test, expect, describe} from "vitest"

import {SimpleDisassembler} from "./Disassembler.ts"
import {SquareGrid} from "~/lib/grids/SquareGrid.ts"
import {serialize} from "~/lib/serialize.ts"

describe("Disassembler", () => {
    const grid = new SquareGrid()

    test("Disassembles in one move", () => {
        const pieces = grid.piecesFromString(`
            00
            01
            00
        `)
        const disassembler = new SimpleDisassembler(grid, pieces)
        const disassemblies = disassembler.disassemble()
        expect(serialize(disassembler.nodes)).toMatchInlineSnapshot(`
          [
            {
              "children": [
                {
                  "movedPieces": [
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

        expect(
          disassemblies.map(d => d.steps)
        ).toMatchInlineSnapshot(`
          [
            [
              {
                "movedPieces": [
                  "0",
                ],
                "repeat": 1,
                "separates": true,
                "transform": "t:-1,0,0",
              },
            ],
          ]
        `)
    })


    test("Disassembles in two moves", () => {
        const pieces = grid.piecesFromString(`
            00
             10
            00
        `)
        const disassembler = new SimpleDisassembler(grid, pieces)
        const disassemblies = disassembler.disassemble()
        expect(serialize(disassembler.nodes)).toMatchInlineSnapshot(`
          [
            {
              "children": [
                {
                  "movedPieces": [
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

        expect(
          disassemblies.map(d => d.steps)
        ).toMatchInlineSnapshot(`
          [
            [
              {
                "movedPieces": [
                  "0",
                ],
                "repeat": 2,
                "separates": true,
                "transform": "t:1,0,0",
              },
            ],
          ]
        `)
    })


    test("Not disassemblable", () => {
        const pieces = grid.piecesFromString(`
            0000
            01 0
            0000
        `)
        const disassembler = new SimpleDisassembler(grid, pieces)
        const disassemblies = disassembler.disassemble()
        expect(serialize(disassembler.nodes)).toMatchInlineSnapshot(`
          [
            {
              "children": [
                {
                  "movedPieces": [
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

        expect(
          disassemblies.map(d => d.steps)
        ).toMatchInlineSnapshot(`[]`)
    })


    test("Disassemble 3 pieces", () => {
        const pieces = grid.piecesFromString(`
            012
        `)
        const disassembler = new SimpleDisassembler(grid, pieces)
        const disassemblies = disassembler.disassemble()
        expect(serialize(disassembler.nodes)).toMatchInlineSnapshot(`
          [
            {
              "children": [
                {
                  "movedPieces": [
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
                  "movedPieces": [
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

        expect(
          disassemblies.map(d => d.steps)
        ).toMatchInlineSnapshot(`
          [
            [
              {
                "movedPieces": [
                  "0",
                ],
                "repeat": 1,
                "separates": true,
                "transform": "t:-1,0,0",
              },
              {
                "movedPieces": [
                  "1",
                ],
                "repeat": 1,
                "separates": true,
                "transform": "t:-1,0,0",
              },
            ],
          ]
        `)
    })


    test("Complex disassembly 1", () => {
        const pieces = grid.piecesFromString(`
            00000
            02320
            02321
            02221
            01111
            00000
        `)
        const disassembler = new SimpleDisassembler(grid, pieces)
        disassembler.findAll = true
        const disassemblies = disassembler.disassemble()
        expect(serialize(disassembler.nodes)).toMatchInlineSnapshot(`
          [
            {
              "children": [
                {
                  "movedPieces": [
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
                  "movedPieces": [
                    "0",
                  ],
                  "parts": [
                    2,
                  ],
                  "repeat": 1,
                  "transform": "t:0,1,0",
                },
                {
                  "movedPieces": [
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
                  "movedPieces": [
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
                  "movedPieces": [
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
                  "movedPieces": [
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
                  "movedPieces": [
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

        expect(
          disassemblies.map(d => d.steps)
        ).toMatchInlineSnapshot(`
          [
            [
              {
                "movedPieces": [
                  "1",
                ],
                "repeat": 4,
                "separates": true,
                "transform": "t:1,0,0",
              },
              {
                "movedPieces": [
                  "0",
                ],
                "repeat": 1,
                "separates": false,
                "transform": "t:0,1,0",
              },
              {
                "movedPieces": [
                  "0",
                ],
                "repeat": 4,
                "separates": true,
                "transform": "t:-1,0,0",
              },
              {
                "movedPieces": [
                  "2",
                ],
                "repeat": 2,
                "separates": true,
                "transform": "t:0,-1,0",
              },
            ],
          ]
        `)
    })


    test("Complex disassembly 2", () => {
        const pieces = grid.piecesFromString(`
            0000
            0111
            0121
            0330
            0000
        `)
        const disassembler = new SimpleDisassembler(grid, pieces)
        disassembler.findAll = true
        const disassemblies = disassembler.disassemble()
        expect(serialize(disassembler.nodes)).toMatchInlineSnapshot(`
          [
            {
              "children": [
                {
                  "movedPieces": [
                    "0",
                    "3",
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
                  "movedPieces": [
                    "0",
                  ],
                  "parts": [
                    3,
                  ],
                  "repeat": 1,
                  "transform": "t:0,-1,0",
                },
                {
                  "movedPieces": [
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
                  "movedPieces": [
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
                  "movedPieces": [
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
                  "movedPieces": [
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

        expect(
          disassemblies.map(d => d.steps)
        ).toMatchInlineSnapshot(`
          [
            [
              {
                "movedPieces": [
                  "0",
                  "3",
                ],
                "repeat": 3,
                "separates": true,
                "transform": "t:-1,0,0",
              },
              {
                "movedPieces": [
                  "0",
                ],
                "repeat": 2,
                "separates": false,
                "transform": "t:0,-1,0",
              },
              {
                "movedPieces": [
                  "1",
                ],
                "repeat": 1,
                "separates": true,
                "transform": "t:0,1,0",
              },
              {
                "movedPieces": [
                  "0",
                ],
                "repeat": 3,
                "separates": true,
                "transform": "t:-1,0,0",
              },
            ],
            [
              {
                "movedPieces": [
                  "0",
                  "3",
                ],
                "repeat": 3,
                "separates": true,
                "transform": "t:-1,0,0",
              },
              {
                "movedPieces": [
                  "0",
                ],
                "repeat": 1,
                "separates": false,
                "transform": "t:0,-1,0",
              },
              {
                "movedPieces": [
                  "1",
                ],
                "repeat": 1,
                "separates": true,
                "transform": "t:0,1,0",
              },
              {
                "movedPieces": [
                  "0",
                ],
                "repeat": 3,
                "separates": true,
                "transform": "t:-1,0,0",
              },
            ],
          ]
        `)
    })
})