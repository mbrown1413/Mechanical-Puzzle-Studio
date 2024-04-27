import {test, expect, describe} from "vitest"

import {Piece, PieceWithId} from "~/lib/Piece.ts"
import {SimpleDisassembler} from "./Disassembler.ts"
import {SquareGrid} from "~/lib/grids/SquareGrid.ts"
import {serialize} from "~/lib/serialize.ts"

describe("Disassembler", () => {
    const grid = new SquareGrid()
    const disassembler = new SimpleDisassembler(grid)
    test("Disassembles in one move", () => {
        const pieces = [
            new Piece(
                0,
                [
                  "0,2,0", "1,2,0",
                  "0,1,0",
                  "0,0,0", "1,0,0",
                ]
            ) as PieceWithId,
            new Piece(
                1,
                ["1,1,0"]
            ) as PieceWithId,
        ]
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
                  {
                    "movedPieces": [
                      "1",
                    ],
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
                  "1",
                ],
                "transform": "t:1,0,0",
              },
            ],
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
        const pieces = [
            new Piece(
                0,
                [
                  "0,2,0", "1,2,0",
                                    "2,1,0",
                  "0,0,0", "1,0,0",
                ]
            ) as PieceWithId,
            new Piece(
                1,
                ["1,1,0"]
            ) as PieceWithId,
        ]
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
                    "transform": "t:1,0,0",
                  },
                  {
                    "movedPieces": [
                      "0",
                    ],
                    "repeat": 2,
                    "transform": "t:1,0,0",
                  },
                  {
                    "movedPieces": [
                      "1",
                    ],
                    "parts": [
                      1,
                    ],
                    "transform": "t:-1,0,0",
                  },
                  {
                    "movedPieces": [
                      "1",
                    ],
                    "repeat": 2,
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
                  "1",
                ],
                "repeat": 2,
                "transform": "t:-1,0,0",
              },
            ],
            [
              {
                "movedPieces": [
                  "1",
                ],
                "parts": [
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
            [
              {
                "movedPieces": [
                  "0",
                ],
                "repeat": 2,
                "transform": "t:1,0,0",
              },
            ],
            [
              {
                "movedPieces": [
                  "0",
                ],
                "parts": [
                  1,
                ],
                "transform": "t:1,0,0",
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
})