import {test, expect, describe} from "vitest"

import {serialize} from "~/lib/serialize.ts"
import {Grid} from "~/lib/Grid.ts"
import {SquareGrid} from "./SquareGrid.ts"
import {makePlacementSet} from "./CubicGrid.test.ts"

describe("Square grid", () => {
    const grid = new SquareGrid()
    grid.flippable = true

    const gridUnflippable = new SquareGrid()
    gridUnflippable.flippable = false

    test("getVoxels()", () => {
        expect(
            grid.getVoxels({xSize: 2, ySize: 2, zSize: 2})
        ).toEqual([
            "0,0,0",
            "0,1,0",
            "1,0,0",
            "1,1,0",
        ])
        expect(
            grid.getVoxels({xSize: 1, ySize: 1, zSize: 1})
        ).toEqual(["0,0,0"])
        expect(
            grid.getVoxels({xSize: 0, ySize: 0, zSize: 0})
        ).toEqual([])
    })

    test("rotations", () => {
        const originalVoxels = [
            "0,1,0",
            "0,0,0", "1,0,0", "2,0,0",
        ]

        const getVoxelRotations = (grid: Grid, includeMirrors: boolean) => {
            const rotations = grid.getRotations(includeMirrors)
            return makePlacementSet(
                rotations.map(
                    (orientation) => grid.doTransform(orientation, originalVoxels)
                )
            )
        }

        expect(
            getVoxelRotations(grid, false)
        ).toEqual(new Set([
            "0,1,0; 0,0,0; 1,0,0; 2,0,0",
            "0,-1,0; 0,0,0; 1,0,0; 2,0,0",
            "0,-1,0; 0,0,0; -1,0,0; -2,0,0",
            "0,1,0; 0,0,0; -1,0,0; -2,0,0",
            "1,0,0; 0,0,0; 0,-1,0; 0,-2,0",
            "1,0,0; 0,0,0; 0,1,0; 0,2,0",
            "-1,0,0; 0,0,0; 0,1,0; 0,2,0",
            "-1,0,0; 0,0,0; 0,-1,0; 0,-2,0",
        ]))

        expect(
            getVoxelRotations(gridUnflippable, false)
        ).toEqual(new Set([
            "0,1,0; 0,0,0; 1,0,0; 2,0,0",
            "0,-1,0; 0,0,0; -1,0,0; -2,0,0",
            "1,0,0; 0,0,0; 0,-1,0; 0,-2,0",
            "-1,0,0; 0,0,0; 0,1,0; 0,2,0",
        ]))
    })

    test("piecesFromString()", () => {
        const pieces = grid.piecesFromString(`
            112
            233
        `)
        expect(serialize(pieces)).toMatchInlineSnapshot(`
          [
            {
              "id": 1,
              "type": "Piece",
              "voxels": "0,1,0; 1,1,0",
            },
            {
              "id": 2,
              "type": "Piece",
              "voxels": "2,1,0; 0,0,0",
            },
            {
              "id": 3,
              "type": "Piece",
              "voxels": "1,0,0; 2,0,0",
            },
          ]
        `)
    })
})