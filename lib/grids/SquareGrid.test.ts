import {test, expect, describe} from "vitest"

import {SquareGrid} from "./SquareGrid.ts"

import {makePlacementSet} from "./CubicGrid.test.ts"

describe("Square grid", () => {
    const grid = new SquareGrid()

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
        const rotations = grid.getRotations()
        const actualOrientations = makePlacementSet(
            rotations.map(
                (orientation) => grid.doTransform(orientation, originalVoxels)
            )
        )
        expect(actualOrientations).toMatchInlineSnapshot(`
          Set {
            "0,0,0; 0,1,0; 1,0,0; 2,0,0",
            "0,0,0; 0,1,0; 1,1,0; 2,1,0",
            "0,1,0; 1,1,0; 2,0,0; 2,1,0",
            "0,0,0; 1,0,0; 2,0,0; 2,1,0",
            "0,0,0; 0,1,0; 0,2,0; 1,2,0",
            "0,0,0; 0,1,0; 0,2,0; 1,0,0",
            "0,0,0; 1,0,0; 1,1,0; 1,2,0",
            "0,2,0; 1,0,0; 1,1,0; 1,2,0",
          }
        `)
    })
})