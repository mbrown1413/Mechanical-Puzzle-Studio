import {test, expect, describe} from "vitest"

import {SquareGrid} from "~/lib/grids/SquareGrid.ts"
import {serialize} from "~/lib/serialize.ts"

import {getMovements} from "./movement.ts"

const grid = new SquareGrid()

describe("getMovements()", () => {

    test("No movement", () => {
        const shapes = grid.shapesFromString(`
            000
            010
            000
        `)
        const movements = getMovements(grid, shapes)
        expect(serialize(movements)).toEqual([])
    })

    test("Separates in one move", () => {
        const shapes = grid.shapesFromString(`
            00
            01
            00
        `)
        const movements = getMovements(grid, shapes)
        expect(serialize(movements)).toMatchInlineSnapshot(`
          [
            {
              "movedShapes": [
                "0",
              ],
              "placements": [
                {
                  "id": 0,
                  "type": "Shape",
                  "voxels": "-1,2,0; 0,2,0; -1,1,0; -1,0,0; 0,0,0",
                },
                {
                  "id": 1,
                  "type": "Shape",
                  "voxels": "1,1,0",
                },
              ],
              "repeat": 1,
              "separates": true,
              "transform": "t:-1,0,0",
            },
            {
              "movedShapes": [
                "1",
              ],
              "placements": [
                {
                  "id": 0,
                  "type": "Shape",
                  "voxels": "0,2,0; 1,2,0; 0,1,0; 0,0,0; 1,0,0",
                },
                {
                  "id": 1,
                  "type": "Shape",
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
        const shapes = grid.shapesFromString(`
            00
             10
            00
        `)
        const movements = getMovements(grid, shapes)
        expect(serialize(movements)).toMatchInlineSnapshot(`
          [
            {
              "movedShapes": [
                "0",
              ],
              "placements": [
                {
                  "id": 0,
                  "type": "Shape",
                  "voxels": "1,2,0; 2,2,0; 3,1,0; 1,0,0; 2,0,0",
                },
                {
                  "id": 1,
                  "type": "Shape",
                  "voxels": "1,1,0",
                },
              ],
              "repeat": 1,
              "separates": false,
              "transform": "t:1,0,0",
            },
            {
              "movedShapes": [
                "0",
              ],
              "placements": [
                {
                  "id": 0,
                  "type": "Shape",
                  "voxels": "2,2,0; 3,2,0; 4,1,0; 2,0,0; 3,0,0",
                },
                {
                  "id": 1,
                  "type": "Shape",
                  "voxels": "1,1,0",
                },
              ],
              "repeat": 2,
              "separates": true,
              "transform": "t:1,0,0",
            },
            {
              "movedShapes": [
                "1",
              ],
              "placements": [
                {
                  "id": 0,
                  "type": "Shape",
                  "voxels": "0,2,0; 1,2,0; 2,1,0; 0,0,0; 1,0,0",
                },
                {
                  "id": 1,
                  "type": "Shape",
                  "voxels": "0,1,0",
                },
              ],
              "repeat": 1,
              "separates": false,
              "transform": "t:-1,0,0",
            },
            {
              "movedShapes": [
                "1",
              ],
              "placements": [
                {
                  "id": 0,
                  "type": "Shape",
                  "voxels": "0,2,0; 1,2,0; 2,1,0; 0,0,0; 1,0,0",
                },
                {
                  "id": 1,
                  "type": "Shape",
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
        const shapes = grid.shapesFromString(`
            0000
            01 0
            0000
        `)
        const movements = getMovements(grid, shapes)
        expect(serialize(movements)).toMatchInlineSnapshot(`
          [
            {
              "movedShapes": [
                "0",
              ],
              "placements": [
                {
                  "id": 0,
                  "type": "Shape",
                  "voxels": "-1,2,0; 0,2,0; 1,2,0; 2,2,0; -1,1,0; 2,1,0; -1,0,0; 0,0,0; 1,0,0; 2,0,0",
                },
                {
                  "id": 1,
                  "type": "Shape",
                  "voxels": "1,1,0",
                },
              ],
              "repeat": 1,
              "separates": false,
              "transform": "t:-1,0,0",
            },
            {
              "movedShapes": [
                "1",
              ],
              "placements": [
                {
                  "id": 0,
                  "type": "Shape",
                  "voxels": "0,2,0; 1,2,0; 2,2,0; 3,2,0; 0,1,0; 3,1,0; 0,0,0; 1,0,0; 2,0,0; 3,0,0",
                },
                {
                  "id": 1,
                  "type": "Shape",
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

    test("Moving multiple shapes at once", () => {
        const shapes = grid.shapesFromString(`
            00000
            012 0
            00000
        `)
        const movements = getMovements(grid, shapes)
        expect(serialize(movements)).toMatchInlineSnapshot(`
          [
            {
              "movedShapes": [
                "0",
              ],
              "placements": [
                {
                  "id": 0,
                  "type": "Shape",
                  "voxels": "-1,2,0; 0,2,0; 1,2,0; 2,2,0; 3,2,0; -1,1,0; 3,1,0; -1,0,0; 0,0,0; 1,0,0; 2,0,0; 3,0,0",
                },
                {
                  "id": 1,
                  "type": "Shape",
                  "voxels": "1,1,0",
                },
                {
                  "id": 2,
                  "type": "Shape",
                  "voxels": "2,1,0",
                },
              ],
              "repeat": 1,
              "separates": false,
              "transform": "t:-1,0,0",
            },
            {
              "movedShapes": [
                "1",
                "2",
              ],
              "placements": [
                {
                  "id": 0,
                  "type": "Shape",
                  "voxels": "0,2,0; 1,2,0; 2,2,0; 3,2,0; 4,2,0; 0,1,0; 4,1,0; 0,0,0; 1,0,0; 2,0,0; 3,0,0; 4,0,0",
                },
                {
                  "id": 1,
                  "type": "Shape",
                  "voxels": "2,1,0",
                },
                {
                  "id": 2,
                  "type": "Shape",
                  "voxels": "3,1,0",
                },
              ],
              "repeat": 1,
              "separates": false,
              "transform": "t:1,0,0",
            },
            {
              "movedShapes": [
                "1",
                "0",
              ],
              "placements": [
                {
                  "id": 0,
                  "type": "Shape",
                  "voxels": "-1,2,0; 0,2,0; 1,2,0; 2,2,0; 3,2,0; -1,1,0; 3,1,0; -1,0,0; 0,0,0; 1,0,0; 2,0,0; 3,0,0",
                },
                {
                  "id": 1,
                  "type": "Shape",
                  "voxels": "0,1,0",
                },
                {
                  "id": 2,
                  "type": "Shape",
                  "voxels": "2,1,0",
                },
              ],
              "repeat": 1,
              "separates": false,
              "transform": "t:-1,0,0",
            },
            {
              "movedShapes": [
                "2",
              ],
              "placements": [
                {
                  "id": 0,
                  "type": "Shape",
                  "voxels": "0,2,0; 1,2,0; 2,2,0; 3,2,0; 4,2,0; 0,1,0; 4,1,0; 0,0,0; 1,0,0; 2,0,0; 3,0,0; 4,0,0",
                },
                {
                  "id": 1,
                  "type": "Shape",
                  "voxels": "1,1,0",
                },
                {
                  "id": 2,
                  "type": "Shape",
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