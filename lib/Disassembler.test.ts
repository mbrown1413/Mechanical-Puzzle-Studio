import {test, expect, describe} from "vitest"

import {SimpleDisassembler} from "./Disassembler.ts"
import {SquareGrid} from "~/lib/grids/SquareGrid.ts"
import {serialize} from "~/lib/serialize.ts"

describe("Disassembler", () => {
    const grid = new SquareGrid()
    test("Disassembles in one move", () => {
        const disassembler = new SimpleDisassembler(grid)
        const pieces = grid.piecesFromString(`
            00
            01
            00
        `)
        const disassemblySet = disassembler.disassemble(pieces)
        expect(serialize(disassemblySet)).toMatchInlineSnapshot(`
          {
            "nodes": [
              {
                "children": [
                  {
                    "movedPieces": [
                      "0",
                    ],
                    "transform": "t:-1,0,0",
                  },
                ],
                "depth": 0,
              },
            ],
            "type": "DisassemblySet",
          }
        `)

        const disassemblies = disassemblySet.getDisassemblies(grid, pieces)
        expect(
          disassemblies.map(d => d.steps)
        ).toMatchInlineSnapshot(`
          [
            [
              {
                "movedPieces": [
                  "0",
                ],
                "transform": "t:-1,0,0",
              },
            ],
          ]
        `)
    })


    test("Disassembles in two moves", () => {
        const disassembler = new SimpleDisassembler(grid)
        const pieces = grid.piecesFromString(`
            00
             10
            00
        `)
        const disassemblySet = disassembler.disassemble(pieces)
        expect(serialize(disassemblySet)).toMatchInlineSnapshot(`
          {
            "nodes": [
              {
                "children": [
                  {
                    "movedPieces": [
                      "0",
                    ],
                    "repeat": 2,
                    "transform": "t:1,0,0",
                  },
                ],
                "depth": 0,
              },
            ],
            "type": "DisassemblySet",
          }
        `)

        const disassemblies = disassemblySet.getDisassemblies(grid, pieces)
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
                "transform": "t:1,0,0",
              },
            ],
          ]
        `)
    })


    test("Not disassemblable", () => {
        const disassembler = new SimpleDisassembler(grid)
        const pieces = grid.piecesFromString(`
            0000
            01 0
            0000
        `)
        const disassemblySet = disassembler.disassemble(pieces)
        expect(serialize(disassemblySet)).toMatchInlineSnapshot(`
          {
            "nodes": [
              {
                "children": [
                  {
                    "movedPieces": [
                      "0",
                    ],
                    "parts": [
                      1,
                    ],
                    "transform": "t:-1,0,0",
                  },
                ],
                "depth": 0,
              },
              {
                "children": [],
                "depth": 1,
              },
            ],
            "type": "DisassemblySet",
          }
        `)

        const disassemblies = disassemblySet.getDisassemblies(grid, pieces)
        expect(
          disassemblies.map(d => d.steps)
        ).toMatchInlineSnapshot(`[]`)
    })


    test("Disassemble 3 pieces", () => {
        const disassembler = new SimpleDisassembler(grid)
        const pieces = grid.piecesFromString(`
            012
        `)
        const disassemblySet = disassembler.disassemble(pieces)
        expect(serialize(disassemblySet)).toMatchInlineSnapshot(`
          {
            "nodes": [
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
                    "transform": "t:-1,0,0",
                  },
                ],
                "depth": 0,
              },
              {
                "children": [
                  {
                    "movedPieces": [
                      "1",
                    ],
                    "transform": "t:-1,0,0",
                  },
                ],
                "depth": 1,
              },
            ],
            "type": "DisassemblySet",
          }
        `)

        const disassemblies = disassemblySet.getDisassemblies(grid, pieces)
        expect(
          disassemblies.map(d => d.steps)
        ).toMatchInlineSnapshot(`
          [
            [
              {
                "movedPieces": [
                  "0",
                ],
                "parts": [
                  -1,
                  1,
                ],
                "transform": "t:-1,0,0",
              },
              {
                "movedPieces": [
                  "1",
                ],
                "transform": "t:-1,0,0",
              },
            ],
          ]
        `)
    })


    test("Complex disassembly 1", () => {
        const disassembler = new SimpleDisassembler(grid)
        const pieces = grid.piecesFromString(`
            00000
            02320
            02321
            02221
            01111
            00000
        `)
        const disassemblySet = disassembler.disassemble(pieces)
        expect(serialize(disassemblySet)).toMatchInlineSnapshot(`
          {
            "nodes": [
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
                    "transform": "t:0,1,0",
                  },
                  {
                    "movedPieces": [
                      "2",
                    ],
                    "parts": [
                      3,
                    ],
                    "transform": "t:0,-1,0",
                  },
                ],
                "depth": 1,
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
                    "repeat": 2,
                    "transform": "t:0,-1,0",
                  },
                ],
                "depth": 3,
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
                    "transform": "t:0,1,0",
                  },
                ],
                "depth": 3,
              },
              {
                "children": [],
                "depth": 4,
              },
            ],
            "type": "DisassemblySet",
          }
        `)

        const disassemblies = disassemblySet.getDisassemblies(grid, pieces)
        expect(
          disassemblies.map(d => d.steps)
        ).toMatchInlineSnapshot(`
          [
            [
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
              {
                "movedPieces": [
                  "0",
                ],
                "parts": [
                  2,
                ],
                "transform": "t:0,1,0",
              },
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
              {
                "movedPieces": [
                  "2",
                ],
                "repeat": 2,
                "transform": "t:0,-1,0",
              },
            ],
          ]
        `)
    })


    test("Complex disassembly 2", () => {
        const disassembler = new SimpleDisassembler(grid)
        const pieces = grid.piecesFromString(`
            0000
            0111
            0121
            0330
            0000
        `)
        const disassemblySet = disassembler.disassemble(pieces)
        expect(serialize(disassemblySet)).toMatchInlineSnapshot(`
          {
            "nodes": [
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
              },
              {
                "children": [
                  {
                    "movedPieces": [
                      "1",
                    ],
                    "transform": "t:0,1,0",
                  },
                ],
                "depth": 1,
              },
              {
                "children": [
                  {
                    "movedPieces": [
                      "0",
                    ],
                    "repeat": 3,
                    "transform": "t:-1,0,0",
                  },
                ],
                "depth": 2,
              },
              {
                "children": [
                  {
                    "movedPieces": [
                      "0",
                    ],
                    "repeat": 3,
                    "transform": "t:-1,0,0",
                  },
                ],
                "depth": 2,
              },
            ],
            "type": "DisassemblySet",
          }
        `)

        const disassemblies = disassemblySet.getDisassemblies(grid, pieces)
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
                "parts": [
                  1,
                  2,
                ],
                "repeat": 3,
                "transform": "t:-1,0,0",
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
              {
                "movedPieces": [
                  "1",
                ],
                "transform": "t:0,1,0",
              },
              {
                "movedPieces": [
                  "0",
                ],
                "repeat": 3,
                "transform": "t:-1,0,0",
              },
            ],
            [
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
              {
                "movedPieces": [
                  "0",
                ],
                "parts": [
                  3,
                ],
                "transform": "t:0,-1,0",
              },
              {
                "movedPieces": [
                  "1",
                ],
                "transform": "t:0,1,0",
              },
              {
                "movedPieces": [
                  "0",
                ],
                "repeat": 3,
                "transform": "t:-1,0,0",
              },
            ],
          ]
        `)
    })
})