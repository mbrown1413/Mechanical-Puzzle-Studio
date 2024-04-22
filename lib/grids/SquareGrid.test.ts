import {test, expect, describe} from "vitest"

import {SquareGrid} from "./SquareGrid.ts"

import {makePlacementSet} from "./CubicGrid.test.ts"

describe("Square grid", () => {
    const grid = new SquareGrid()

    test("bounds", () => {
        expect(grid.isInBounds("0,0,0", [0, 0, 0])).toBeFalsy()
        expect(grid.isInBounds("0,0,0", [1, 1, 1])).toBeTruthy()
        expect(grid.isInBounds("0,-1,0", [1, 1, 1])).toBeFalsy()
        expect(grid.isInBounds("0,1,0", [1, 1, 1])).toBeFalsy()
        expect(grid.isInBounds("0,1,0", [1, 2, 1])).toBeTruthy()
        expect(grid.isInBounds("0,2,0", [1, 2, 1])).toBeFalsy()
    })

    test("getVoxels()", () => {
        expect(
            grid.getVoxels([2, 2, 2])
        ).toEqual([
            "0,0,0",
            "0,1,0",
            "1,0,0",
            "1,1,0",
        ])
        expect(
            grid.getVoxels([1, 1, 1])
        ).toEqual(["0,0,0"])
        expect(
            grid.getVoxels([0, 0, 0])
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