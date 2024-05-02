import {test, expect, describe} from "vitest"

import {SquareGrid} from "~/lib/grids/SquareGrid.ts"
import {serialize} from "~/lib/serialize.ts"

import {getMovements} from "./movement.ts"

const grid = new SquareGrid()

describe("getMovements()", () => {

    test("No movement", () => {
        const pieces = grid.piecesFromString(`
            000
            010
            000
        `)
        const movements = getMovements(grid, pieces)
        expect(serialize(movements)).toEqual([])
    })

    test("Separates in one move", () => {
        const pieces = grid.piecesFromString(`
            00
            01
            00
        `)
        const movements = getMovements(grid, pieces)
        expect(serialize(movements)).toMatchInlineSnapshot(`
          [
            {
              "movedPieces": [
                "0",
              ],
              "placements": [
                {
                  "id": 0,
                  "type": "Piece",
                  "voxels": "-1,2,0; 0,2,0; -1,1,0; -1,0,0; 0,0,0",
                },
                {
                  "id": 1,
                  "type": "Piece",
                  "voxels": "1,1,0",
                },
              ],
              "repeat": 1,
              "separates": true,
              "transform": "t:-1,0,0",
            },
            {
              "movedPieces": [
                "1",
              ],
              "placements": [
                {
                  "id": 0,
                  "type": "Piece",
                  "voxels": "0,2,0; 1,2,0; 0,1,0; 0,0,0; 1,0,0",
                },
                {
                  "id": 1,
                  "type": "Piece",
                  "voxels": "2,1,0",
                },
              ],
              "repeat": 1,
              "separates": true,
              "transform": "t:1,0,0",
            },
          ]
        `)
    })

    test("Separates in two moves", () => {
        const pieces = grid.piecesFromString(`
            00
             10
            00
        `)
        const movements = getMovements(grid, pieces)
        expect(serialize(movements)).toMatchInlineSnapshot(`
          [
            {
              "movedPieces": [
                "0",
              ],
              "placements": [
                {
                  "id": 0,
                  "type": "Piece",
                  "voxels": "1,2,0; 2,2,0; 3,1,0; 1,0,0; 2,0,0",
                },
                {
                  "id": 1,
                  "type": "Piece",
                  "voxels": "1,1,0",
                },
              ],
              "repeat": 1,
              "separates": false,
              "transform": "t:1,0,0",
            },
            {
              "movedPieces": [
                "0",
              ],
              "placements": [
                {
                  "id": 0,
                  "type": "Piece",
                  "voxels": "2,2,0; 3,2,0; 4,1,0; 2,0,0; 3,0,0",
                },
                {
                  "id": 1,
                  "type": "Piece",
                  "voxels": "1,1,0",
                },
              ],
              "repeat": 2,
              "separates": true,
              "transform": "t:1,0,0",
            },
            {
              "movedPieces": [
                "1",
              ],
              "placements": [
                {
                  "id": 0,
                  "type": "Piece",
                  "voxels": "0,2,0; 1,2,0; 2,1,0; 0,0,0; 1,0,0",
                },
                {
                  "id": 1,
                  "type": "Piece",
                  "voxels": "0,1,0",
                },
              ],
              "repeat": 1,
              "separates": false,
              "transform": "t:-1,0,0",
            },
            {
              "movedPieces": [
                "1",
              ],
              "placements": [
                {
                  "id": 0,
                  "type": "Piece",
                  "voxels": "0,2,0; 1,2,0; 2,1,0; 0,0,0; 1,0,0",
                },
                {
                  "id": 1,
                  "type": "Piece",
                  "voxels": "-1,1,0",
                },
              ],
              "repeat": 2,
              "separates": true,
              "transform": "t:-1,0,0",
            },
          ]
        `)
    })

    test("Move one square, then blocked", () => {
        const pieces = grid.piecesFromString(`
            0000
            01 0
            0000
        `)
        const movements = getMovements(grid, pieces)
        expect(serialize(movements)).toMatchInlineSnapshot(`
          [
            {
              "movedPieces": [
                "0",
              ],
              "placements": [
                {
                  "id": 0,
                  "type": "Piece",
                  "voxels": "-1,2,0; 0,2,0; 1,2,0; 2,2,0; -1,1,0; 2,1,0; -1,0,0; 0,0,0; 1,0,0; 2,0,0",
                },
                {
                  "id": 1,
                  "type": "Piece",
                  "voxels": "1,1,0",
                },
              ],
              "repeat": 1,
              "separates": false,
              "transform": "t:-1,0,0",
            },
            {
              "movedPieces": [
                "1",
              ],
              "placements": [
                {
                  "id": 0,
                  "type": "Piece",
                  "voxels": "0,2,0; 1,2,0; 2,2,0; 3,2,0; 0,1,0; 3,1,0; 0,0,0; 1,0,0; 2,0,0; 3,0,0",
                },
                {
                  "id": 1,
                  "type": "Piece",
                  "voxels": "2,1,0",
                },
              ],
              "repeat": 1,
              "separates": false,
              "transform": "t:1,0,0",
            },
          ]
        `)
    })

    test("Moving multiple pieces at once", () => {
        const pieces = grid.piecesFromString(`
            00000
            012 0
            00000
        `)
        const movements = getMovements(grid, pieces)
        expect(serialize(movements)).toMatchInlineSnapshot(`
          [
            {
              "movedPieces": [
                "0",
              ],
              "placements": [
                {
                  "id": 0,
                  "type": "Piece",
                  "voxels": "-1,2,0; 0,2,0; 1,2,0; 2,2,0; 3,2,0; -1,1,0; 3,1,0; -1,0,0; 0,0,0; 1,0,0; 2,0,0; 3,0,0",
                },
                {
                  "id": 1,
                  "type": "Piece",
                  "voxels": "1,1,0",
                },
                {
                  "id": 2,
                  "type": "Piece",
                  "voxels": "2,1,0",
                },
              ],
              "repeat": 1,
              "separates": false,
              "transform": "t:-1,0,0",
            },
            {
              "movedPieces": [
                "1",
                "2",
              ],
              "placements": [
                {
                  "id": 0,
                  "type": "Piece",
                  "voxels": "0,2,0; 1,2,0; 2,2,0; 3,2,0; 4,2,0; 0,1,0; 4,1,0; 0,0,0; 1,0,0; 2,0,0; 3,0,0; 4,0,0",
                },
                {
                  "id": 1,
                  "type": "Piece",
                  "voxels": "2,1,0",
                },
                {
                  "id": 2,
                  "type": "Piece",
                  "voxels": "3,1,0",
                },
              ],
              "repeat": 1,
              "separates": false,
              "transform": "t:1,0,0",
            },
            {
              "movedPieces": [
                "1",
                "0",
              ],
              "placements": [
                {
                  "id": 0,
                  "type": "Piece",
                  "voxels": "-1,2,0; 0,2,0; 1,2,0; 2,2,0; 3,2,0; -1,1,0; 3,1,0; -1,0,0; 0,0,0; 1,0,0; 2,0,0; 3,0,0",
                },
                {
                  "id": 1,
                  "type": "Piece",
                  "voxels": "0,1,0",
                },
                {
                  "id": 2,
                  "type": "Piece",
                  "voxels": "2,1,0",
                },
              ],
              "repeat": 1,
              "separates": false,
              "transform": "t:-1,0,0",
            },
            {
              "movedPieces": [
                "2",
              ],
              "placements": [
                {
                  "id": 0,
                  "type": "Piece",
                  "voxels": "0,2,0; 1,2,0; 2,2,0; 3,2,0; 4,2,0; 0,1,0; 4,1,0; 0,0,0; 1,0,0; 2,0,0; 3,0,0; 4,0,0",
                },
                {
                  "id": 1,
                  "type": "Piece",
                  "voxels": "1,1,0",
                },
                {
                  "id": 2,
                  "type": "Piece",
                  "voxels": "3,1,0",
                },
              ],
              "repeat": 1,
              "separates": false,
              "transform": "t:1,0,0",
            },
          ]
        `)
    })


})