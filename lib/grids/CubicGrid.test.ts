import {test, expect, describe} from "vitest"

import {Voxel} from "~/lib/Grid.ts"
import {CubicGrid} from "./CubicGrid.ts"

export function makePlacementSet(voxelLists: Voxel[][]): Set<string> {
    const set: Set<string> = new Set()
    for(const voxels of voxelLists) {
        const sortedVoxels = [...voxels].sort()
        set.add(
            sortedVoxels.join("; ")
        )
    }
    return set
}

export const rotationTestData = {
    originalPiece: ["0,0,0", "1,0,0", "1,1,0"],
    allOrientations: [
        // Original +X facing in +X
        ["0,0,0", "1,0,0", "1,1,0"],
        ["0,0,1", "1,0,1", "1,0,0"],
        ["0,1,0", "1,1,0", "1,0,0"],
        ["0,0,0", "1,0,0", "1,0,1"],

        // Original -X facing in +X
        ["1,1,0", "0,1,0", "0,0,0"],
        ["1,0,0", "0,0,0", "0,0,1"],
        ["1,0,0", "0,0,0", "0,1,0"],
        ["1,0,1", "0,0,1", "0,0,0"],

        // Original +Y facing in +X
        ["0,1,0", "0,0,0", "1,0,0"],
        ["0,0,0", "0,0,1", "1,0,1"],
        ["0,0,0", "0,1,0", "1,1,0"],
        ["0,0,1", "0,0,0", "1,0,0"],

        // Original -Y facing in +X
        ["1,0,0", "1,1,0", "0,1,0"],
        ["1,0,1", "1,0,0", "0,0,0"],
        ["1,1,0", "1,0,0", "0,0,0"],
        ["1,0,0", "1,0,1", "0,0,1"],

        // Original +Z facing in +X
        ["0,0,1", "0,0,0", "0,1,0"],
        ["0,1,1", "0,0,1", "0,0,0"],
        ["0,1,0", "0,1,1", "0,0,1"],
        ["0,0,0", "0,1,0", "0,1,1"],

        // Original -Z facing in +X
        ["0,0,0", "0,0,1", "0,1,1"],
        ["0,0,1", "0,1,1", "0,1,0"],
        ["0,1,1", "0,1,0", "0,0,0"],
        ["0,1,0", "0,0,0", "0,0,1"],
    ],

    /* Like `allOrientations` but removes placements which are equal
    * due to symmetries in the original piece. */
    orientationsMinusSymmetries: [
        // Sticking up in +Z direction
        ["0,0,1", "0,0,0", "1,0,0"],
        ["0,1,1", "0,1,0", "0,0,0"],
        ["1,0,1", "1,0,0", "0,0,0"],
        ["0,0,1", "0,0,0", "0,1,0"],

        // Sticking down in -Z direction
        ["0,0,0", "0,0,1", "1,0,1"],
        ["0,1,0", "0,1,1", "0,0,1"],
        ["1,0,0", "1,0,1", "0,0,1"],
        ["0,0,0", "0,0,1", "0,1,1"],

        // Completely in the X/Y plane
        ["0,1,0", "0,0,0", "1,0,0"],
        ["0,0,0", "0,1,0", "1,1,0"],
        ["0,1,0", "1,1,0", "1,0,0"],
        ["0,0,0", "1,0,0", "1,1,0"],
    ]
}

describe("Cubic grid", () => {
    const grid = new CubicGrid()

    test("bounds", () => {
        expect(grid.isInBounds("0,0,0", [0, 0, 0])).toBeFalsy()
        expect(grid.isInBounds("0,0,0", [1, 1, 1])).toBeTruthy()
        expect(grid.isInBounds("0,0,-1", [1, 1, 1])).toBeFalsy()
        expect(grid.isInBounds("0,0,1", [1, 1, 1])).toBeFalsy()
        expect(grid.isInBounds("0,0,1", [1, 1, 2])).toBeTruthy()
        expect(grid.isInBounds("0,0,2", [1, 1, 2])).toBeFalsy()
    })

    test("getVoxels()", () => {
        expect(
            grid.getVoxels([2, 2, 2])
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
            grid.getVoxels([1, 1, 1])
        ).toEqual(["0,0,0"])
        expect(
            grid.getVoxels([0, 0, 0])
        ).toEqual([])
    })

    test("getAdjacent()", () => {
        expect(grid.getAdjacent("0,0,0", "+X")).toEqual(["1,0,0", "-X"])
        expect(grid.getAdjacent("0,0,0", "-X")).toEqual(["-1,0,0", "+X"])

        expect(grid.getAdjacent("5,5,5", "+X")).toEqual(["6,5,5", "-X"])
        expect(grid.getAdjacent("5,5,5", "-X")).toEqual(["4,5,5", "+X"])
        expect(grid.getAdjacent("5,5,5", "+Y")).toEqual(["5,6,5", "-Y"])
        expect(grid.getAdjacent("5,5,5", "-Y")).toEqual(["5,4,5", "+Y"])
        expect(grid.getAdjacent("5,5,5", "+Z")).toEqual(["5,5,6", "-Z"])
        expect(grid.getAdjacent("5,5,5", "-Z")).toEqual(["5,5,4", "+Z"])
    })

    test("rotations", () => {
        const rotations = grid.getRotations()
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