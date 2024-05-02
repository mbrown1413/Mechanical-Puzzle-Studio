import {test, expect, describe} from "vitest"

import {Piece, PieceWithId} from "~/lib/Piece.ts"
import {SimpleDisassembler} from "./Disassembler.ts"
import {SquareGrid} from "~/lib/grids/SquareGrid.ts"
import {serialize} from "~/lib/serialize.ts"

describe("Disassembler", () => {
    const grid = new SquareGrid()
    test("Disassembles in one move", () => {
        const disassembler = new SimpleDisassembler(grid)
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
        const pieces = [
            new Piece(
                0,
                [
                  "0,2,0", "1,2,0", "2,2,0", "3,2,0",
                  "0,1,0",                   "3,1,0",
                  "0,0,0", "1,0,0", "2,0,0", "3,0,0",
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
        const pieces = [
            new Piece(
                0,
                [
                  "0,0,0",
                ]
            ) as PieceWithId,
            new Piece(
                1,
                [
                  "1,0,0",
                ]
            ) as PieceWithId,
            new Piece(
                2,
                [
                  "2,0,0",
                ]
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
        const pieces = [
            new Piece(
                0,
                [
                  "0,5,0", "1,5,0", "2,5,0", "3,5,0", "4,5,0",
                  "0,4,0",                            "4,4,0",
                  "0,3,0",
                  "0,2,0",
                  "0,1,0",
                  "0,0,0", "1,0,0", "2,0,0", "3,0,0", "4,0,0",
                ]
            ) as PieceWithId,
            new Piece(
                1,
                [


                                                      "4,3,0",
                                                      "4,2,0",
                           "1,1,0", "2,1,0", "3,1,0", "4,1,0",

                ]
            ) as PieceWithId,
            new Piece(
                2,
                [

                           "1,4,0",          "3,4,0",
                           "1,3,0",          "3,3,0",
                           "1,2,0", "2,2,0", "3,2,0",


                ]
            ) as PieceWithId,
            new Piece(
                3,
                [

                                    "2,4,0",
                                    "2,3,0",



                ]
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
        const pieces = [
            new Piece(
                0,
                [
                  "0,4,0", "1,4,0", "2,4,0", "3,4,0",
                  "0,3,0",
                  "0,2,0",
                  "0,1,0",                   "3,1,0",
                  "0,0,0", "1,0,0", "2,0,0", "3,0,0",
                ]
            ) as PieceWithId,
            new Piece(
                1,
                [

                           "1,3,0", "2,3,0", "3,3,0",
                           "1,2,0",          "3,2,0",


                ]
            ) as PieceWithId,
            new Piece(
                2,
                [


                                    "2,2,0",


                ]
            ) as PieceWithId,
            new Piece(
                3,
                [



                           "1,1,0", "2,1,0",

                ]
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