import {test, expect, describe} from "vitest"

import {Voxel} from "~/lib/Grid.ts"
import {CubicGrid} from "./CubicGrid.ts"

export function makePlacementSet(voxelLists: Voxel[][]): Set<string> {
    return new Set(voxelLists.map(voxels => voxels.join("; ")))
}

export const rotationTestData = {
    originalPiece: ["0,0,0", "1,0,0", "1,1,0"],
    allOrientations: [
        // Original +X facing in +X
        ["0,0,0", "1,0,0", "1,1,0"],
        ["0,0,0", "1,0,0", "1,0,-1"],
        ["0,0,0", "1,0,0", "1,-1,0"],
        ["0,0,0", "1,0,0", "1,0,1"],

        // Original -X facing in +X
        ["0,0,0", "-1,0,0", "-1,-1,0"],
        ["0,0,0", "-1,0,0", "-1,0,1"],
        ["0,0,0", "-1,0,0", "-1,1,0"],
        ["0,0,0", "-1,0,0", "-1,0,-1"],

        // Original +Y facing in +X
        ["0,0,0", "0,-1,0", "1,-1,0"],
        ["0,0,0", "0,0,1", "1,0,1"],
        ["0,0,0", "0,1,0", "1,1,0"],
        ["0,0,0", "0,0,-1", "1,0,-1"],

        // Original -Y facing in +X
        ["0,0,0", "0,1,0", "-1,1,0"],
        ["0,0,0", "0,0,-1", "-1,0,-1"],
        ["0,0,0", "0,-1,0", "-1,-1,0"],
        ["0,0,0", "0,0,1", "-1,0,1"],

        // Original +Z facing in +X
        ["0,0,0", "0,0,-1", "0,1,-1"],
        ["0,0,0", "0,-1,0", "0,-1,-1"],
        ["0,0,0", "0,0,1", "0,-1,1"],
        ["0,0,0", "0,1,0", "0,1,1"],

        // Original -Z facing in +X
        ["0,0,0", "0,0,1", "0,1,1"],
        ["0,0,0", "0,1,0", "0,1,-1"],
        ["0,0,0", "0,0,-1", "0,-1,-1"],
        ["0,0,0", "0,-1,0", "0,-1,1"],
    ],
}

describe("Cubic grid", () => {
    const grid = new CubicGrid()

    test("isInBounds()", () => {
        expect(grid.isInBounds("0,0,0", {x: 0, y: 0, z: 0, xSize: 0, ySize: 0, zSize: 0})).toBeFalsy()
        expect(grid.isInBounds("0,0,0", {                  xSize: 0, ySize: 0, zSize: 0})).toBeFalsy()

        expect(grid.isInBounds("0,0,0", {xSize: 1, ySize: 1, zSize: 1})).toBeTruthy()
        expect(grid.isInBounds("0,0,-1", {xSize: 1, ySize: 1, zSize: 1})).toBeFalsy()
        expect(grid.isInBounds("0,0,1", {xSize: 1, ySize: 1, zSize: 1})).toBeFalsy()

        expect(grid.isInBounds("0,0,1", {x: 0, y: 0, z: 0, xSize: 1, ySize: 1, zSize: 2})).toBeTruthy()
        expect(grid.isInBounds("0,0,1", {                  xSize: 1, ySize: 1, zSize: 2})).toBeTruthy()
        expect(grid.isInBounds("0,0,2", {x: 0, y: 0, z: 0, xSize: 1, ySize: 1, zSize: 2})).toBeFalsy()
        expect(grid.isInBounds("0,0,2", {                  xSize: 1, ySize: 1, zSize: 2})).toBeFalsy()

        expect(grid.isInBounds("0,0,0", {x: -2, y: -2, z: -2, xSize: 3, ySize: 3, zSize: 3})).toBeTruthy()
        expect(grid.isInBounds("-1,-1,-1", {x: -2, y: -2, z: -2, xSize: 3, ySize: 3, zSize: 3})).toBeTruthy()
        expect(grid.isInBounds("0,-2,-1", {x: -2, y: -2, z: -2, xSize: 3, ySize: 3, zSize: 3})).toBeTruthy()
        expect(grid.isInBounds("1,-2,-1", {x: -2, y: -2, z: -2, xSize: 3, ySize: 3, zSize: 3})).toBeFalsy()
    })

    test("getVoxelBounds()", () => {
        expect(grid.getVoxelBounds(["0,0,0"])).toEqual({x: 0, y: 0, z: 0, xSize: 1, ySize: 1, zSize: 1})
        expect(grid.getVoxelBounds(["1,1,1"])).toEqual({x: 1, y: 1, z: 1, xSize: 1, ySize: 1, zSize: 1})
        expect(grid.getVoxelBounds(["1,1,1", "2,2,2"])).toEqual({x: 1, y: 1, z: 1, xSize: 2, ySize: 2, zSize: 2})
    })

    test("getBoundsMax()", () => {
        expect(grid.getBoundsMax(
            {x: 0, y: 0, z: 0, xSize: 1, ySize: 1, zSize: 1},
        )).toEqual(
            {x: 0, y: 0, z: 0, xSize: 1, ySize: 1, zSize: 1},
        )
        expect(grid.getBoundsMax(
            {x: 0, y: 0, z: 0, xSize: 1, ySize: 1, zSize: 1},
            {x: 0, y: 0, z: 0, xSize: 2, ySize: 3, zSize: 4},
        )).toEqual(
            {x: 0, y: 0, z: 0, xSize: 2, ySize: 3, zSize: 4},
        )
        expect(grid.getBoundsMax(
            {x: 0, y: 0, z: 0, xSize: 1, ySize: 1, zSize: 1},
            {x: 2, y: 2, z: 2, xSize: 2, ySize: 2, zSize: 2},
        )).toEqual(
            {x: 0, y: 0, z: 0, xSize: 4, ySize: 4, zSize: 4},
        )
        expect(grid.getBoundsMax(
            {x: 2, y: 2, z: 2, xSize: 2, ySize: 2, zSize: 2},
            {x: 0, y: 0, z: 0, xSize: 1, ySize: 1, zSize: 1},
        )).toEqual(
            {x: 0, y: 0, z: 0, xSize: 4, ySize: 4, zSize: 4},
        )
    })

    test("getVoxels()", () => {
        expect(
            grid.getVoxels({x: 0, y: 0, z: 0, xSize: 2, ySize: 2, zSize: 2})
        ).toEqual([
            "0,0,0",
            "0,0,1",
            "0,1,0",
            "0,1,1",
            "1,0,0",
            "1,0,1",
            "1,1,0",
            "1,1,1",
        ])
        expect(
            grid.getVoxels({x: 0, y: 0, z: 0, xSize: 1, ySize: 1, zSize: 1})
        ).toEqual(["0,0,0"])
        expect(
            grid.getVoxels({x: 0, y: 0, z: 0, xSize: 0, ySize: 0, zSize: 0})
        ).toEqual([])
        expect(
            grid.getVoxels({x: -1, y: -1, z: -1, xSize: 2, ySize: 2, zSize: 2})
        ).toEqual([
            "-1,-1,-1",
            "-1,-1,0",
            "-1,0,-1",
            "-1,0,0",
            "0,-1,-1",
            "0,-1,0",
            "0,0,-1",
            "0,0,0",
        ])
    })

    test("rotations", () => {
        const rotations = grid.getRotations(false)
        const actualOrientations = makePlacementSet(
            rotations.map(
                (orientation) => grid.doTransform(orientation, rotationTestData.originalPiece)
            )
        )
        const expectedOrientations = makePlacementSet(
            rotationTestData.allOrientations
        )
        expect(actualOrientations).toEqual(expectedOrientations)
    })

    test("translations", () => {
        let transform = grid.getTranslation("0,0,0", "1,2,3")
        expect(transform).toEqual("t:1,2,3")
        expect(grid.doTransform(transform, [
            "0,0,0",
            "1,2,3",
        ])).toEqual([
            "1,2,3",
            "2,4,6",
        ])

        transform = grid.getTranslation("3,7,1", "1,2,3")
        expect(transform).toEqual("t:-2,-5,2")
        expect(grid.doTransform(transform, [
            "0,0,0",
            "10,10,10",
        ])).toEqual([
            "-2,-5,2",
            "8,5,12",
        ])
    })
})