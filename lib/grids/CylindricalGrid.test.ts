import {test, expect, describe} from "vitest"

import {CylindricalGrid} from "./CylindricalGrid.ts"

describe("CylindricalGrid", () => {

    test("isInBounds()", () => {
        const grid = new CylindricalGrid()
        grid.nDivisions = 4

        // Simple size 1,1,1 bounds at origin
        const unitBounds1 = {rho: 0, phi: 0, zed: 0, rhoSize: 1, phiSize: 1, zedSize: 1}
        const unitBounds2 = {rhoSize: 1, phiSize: 1, zedSize: 1}
        expect(grid.isInBounds("0,0,0", unitBounds1)).toEqual(true)
        expect(grid.isInBounds("0,0,0", unitBounds2)).toEqual(true)
        expect(grid.isInBounds("-1,0,0", unitBounds1)).toEqual(false)
        expect(grid.isInBounds("-1,0,0", unitBounds2)).toEqual(false)
        expect(grid.isInBounds("1,0,0", unitBounds1)).toEqual(false)
        expect(grid.isInBounds("1,0,0", unitBounds2)).toEqual(false)
        expect(grid.isInBounds("0,-1,0", unitBounds1)).toEqual(false)
        expect(grid.isInBounds("0,-1,0", unitBounds2)).toEqual(false)
        expect(grid.isInBounds("0,1,0", unitBounds1)).toEqual(false)
        expect(grid.isInBounds("0,1,0", unitBounds2)).toEqual(false)
        expect(grid.isInBounds("0,-1,0", unitBounds1)).toEqual(false)
        expect(grid.isInBounds("0,-1,0", unitBounds2)).toEqual(false)
        expect(grid.isInBounds("0,1,0", unitBounds1)).toEqual(false)
        expect(grid.isInBounds("0,1,0", unitBounds2)).toEqual(false)

        // Phi wraps around origin
        const phiWrappingBounds = {phi: 3, rhoSize: 1, phiSize: 2, zedSize: 2}
        expect(grid.isInBounds("0,0,0", phiWrappingBounds)).toEqual(true)
        expect(grid.isInBounds("0,1,0", phiWrappingBounds)).toEqual(false)
        expect(grid.isInBounds("0,2,0", phiWrappingBounds)).toEqual(false)
        expect(grid.isInBounds("0,3,0", phiWrappingBounds)).toEqual(true)

    })

    test("getVoxelBounds()", () => {
        const grid = new CylindricalGrid()
        grid.nDivisions = 4

        expect(grid.getVoxelBounds(["0,0,0", "1,1,1"])).toEqual({rho: 0, phi: 0, zed: 0, rhoSize: 2, phiSize: 2, zedSize: 2})
        expect(grid.getVoxelBounds(["1,0,0", "2,0,0"])).toEqual({rho: 1, phi: 0, zed: 0, rhoSize: 2, phiSize: 1, zedSize: 1})
        expect(grid.getVoxelBounds(["0,1,0", "0,2,0"])).toEqual({rho: 0, phi: 1, zed: 0, rhoSize: 1, phiSize: 2, zedSize: 1})
        expect(grid.getVoxelBounds(["0,0,1", "0,0,2"])).toEqual({rho: 0, phi: 0, zed: 1, rhoSize: 1, phiSize: 1, zedSize: 2})

        // Try one voxel for each phi value
        expect(grid.getVoxelBounds(["0,0,0"])).toEqual({rho: 0, phi: 0, zed: 0, rhoSize: 1, phiSize: 1, zedSize: 1})
        expect(grid.getVoxelBounds(["0,1,0"])).toEqual({rho: 0, phi: 1, zed: 0, rhoSize: 1, phiSize: 1, zedSize: 1})
        expect(grid.getVoxelBounds(["0,2,0"])).toEqual({rho: 0, phi: 2, zed: 0, rhoSize: 1, phiSize: 1, zedSize: 1})
        expect(grid.getVoxelBounds(["0,3,0"])).toEqual({rho: 0, phi: 3, zed: 0, rhoSize: 1, phiSize: 1, zedSize: 1})

        // Wrap-around phi
        expect(grid.getVoxelBounds(["0,3,0", "0,0,0"])).toEqual({rho: 0, phi: 3, zed: 0, rhoSize: 1, phiSize: 2, zedSize: 1})
    })

    test("validateVoxel()", () => {
        const grid = new CylindricalGrid()
        grid.nDivisions = 4

        expect(grid.validateVoxel("0,-1,0")).toEqual(false)
        expect(grid.validateVoxel("0,0,0")).toEqual(true)
        expect(grid.validateVoxel("0,1,0")).toEqual(true)
        expect(grid.validateVoxel("0,2,0")).toEqual(true)
        expect(grid.validateVoxel("0,3,0")).toEqual(true)
        expect(grid.validateVoxel("0,4,0")).toEqual(false)
        expect(grid.validateVoxel("100,0,100")).toEqual(true)
    })

    test("getBoundsMax()", () => {
        const grid = new CylindricalGrid()
        grid.nDivisions = 4

        expect(grid.getBoundsMax(
            {rho: 0, phi: 0, zed: 0, rhoSize: 1, phiSize: 1, zedSize: 1},
            {rho: 1, phi: 1, zed: 1, rhoSize: 1, phiSize: 1, zedSize: 1},
        )).toEqual(
            {rho: 0, phi: 0, zed: 0, rhoSize: 2, phiSize: 2, zedSize: 2},
        )

        expect(grid.getBoundsMax(
            {rho: -1, phi: 0, zed: -1, rhoSize: 1, phiSize: 1, zedSize: 1},
            {rho: 1, phi: 1, zed: 1, rhoSize: 1, phiSize: 1, zedSize: 1},
        )).toEqual(
            {rho: -1, phi: 0, zed: -1, rhoSize: 3, phiSize: 2, zedSize: 3},
        )

        // Input phi don't wrap around, but output should
        expect(grid.getBoundsMax(
            {rho: 0, phi: 3, zed: 0, rhoSize: 1, phiSize: 1, zedSize: 1},
            {rho: 0, phi: 0, zed: 0, rhoSize: 1, phiSize: 1, zedSize: 1},
        )).toEqual(
            {rho: 0, phi: 3, zed: 0, rhoSize: 1, phiSize: 2, zedSize: 1},
        )

        // Input phi wrap around
        expect(grid.getBoundsMax(
            {rho: 0, phi: 3, zed: 0, rhoSize: 1, phiSize: 2, zedSize: 1},
            {rho: 0, phi: 1, zed: 0, rhoSize: 1, phiSize: 1, zedSize: 1},
        )).toEqual(
            {rho: 0, phi: 3, zed: 0, rhoSize: 1, phiSize: 3, zedSize: 1},
        )
        expect(grid.getBoundsMax(
            {rho: 0, phi: 3, zed: 0, rhoSize: 1, phiSize: 2, zedSize: 1},
            {rho: 0, phi: 2, zed: 0, rhoSize: 1, phiSize: 1, zedSize: 1},
        )).toEqual(
            {rho: 0, phi: 2, zed: 0, rhoSize: 1, phiSize: 3, zedSize: 1},
        )

        // Large phi
        grid.nDivisions = 15
        expect(grid.getBoundsMax(
            {rho: 0, phi: 3, zed: 0, rhoSize: 1, phiSize: 3, zedSize: 1},
        )).toEqual(
            {rho: 0, phi: 3, zed: 0, rhoSize: 1, phiSize: 3, zedSize: 1},
        )
        expect(grid.getBoundsMax(
            {rho: 0, phi: 3, zed: 0, rhoSize: 1, phiSize: 10, zedSize: 1},
            {rho: 0, phi: 13, zed: 0, rhoSize: 1, phiSize: 5, zedSize: 1},
        )).toEqual(
            {rho: 0, phi: 0, zed: 0, rhoSize: 1, phiSize: 15, zedSize: 1},
        )
    })

    test("getVoxelInfo()", () => {
        const grid = new CylindricalGrid()
        expect(grid.getVoxelInfo("0,0,0")).toEqual({
            "voxel": "0,0,0",
            "sides": ["+rho", "+phi", "-phi", "+zed", "-zed"],
        })
        expect(grid.getVoxelInfo("1,0,0")).toEqual({
            "voxel": "1,0,0",
            "sides": ["+rho", "+phi", "-phi", "+zed", "-zed", "-rho"],
        })
        expect(grid.getVoxelInfo("2,0,0")).toEqual({
            "voxel": "2,0,0",
            "sides": ["+rho", "+phi", "-phi", "+zed", "-zed", "-rho"],
        })
    })

    test("getVoxels()", () => {
        const grid = new CylindricalGrid()
        grid.nDivisions = 4

        expect(new Set(grid.getVoxels(
            {rho: 0, phi: 0, zed: 0, rhoSize: 1, phiSize: 1, zedSize: 1}
        ))).toEqual(new Set([
            "0,0,0"
        ]))

        expect(new Set(grid.getVoxels(
            {rho: 1, phi: 2, zed: 3, rhoSize: 2, phiSize: 3, zedSize: 4}
        ))).toEqual(new Set([
            "1,2,3", "1,2,4", "1,2,5", "1,2,6",
            "1,3,3", "1,3,4", "1,3,5", "1,3,6",
            "1,0,3", "1,0,4", "1,0,5", "1,0,6",
            "2,2,3", "2,2,4", "2,2,5", "2,2,6",
            "2,3,3", "2,3,4", "2,3,5", "2,3,6",
            "2,0,3", "2,0,4", "2,0,5", "2,0,6",
        ]))
    })

    test("doTransform()", () => {
        const grid = new CylindricalGrid()
        grid.nDivisions = 4

        expect(grid.doTransform("t:0,0", ["0,0,0"])).toEqual(["0,0,0"])

        expect(grid.doTransform("t:1,0", ["0,0,0"])).toEqual(["0,1,0"])
        expect(grid.doTransform("t:3,0", ["0,4,0"])).toEqual(["0,3,0"])

        expect(grid.doTransform("t:0,1", ["0,0,0"])).toEqual(["0,0,1"])
        expect(grid.doTransform("t:0,3", ["0,0,4"])).toEqual(["0,0,7"])

        // When modulous is done on phi, it must always be positive
        expect(grid.doTransform("t:-7,0", ["0,0,0"])).toEqual(["0,1,0"])

        expect(grid.doTransform("flip", [
            "0,0,0",
            "1,0,0",
            "0,1,0",
            "0,0,1",
        ])).toEqual([
            "0,0,0",
            "1,0,0",
            "0,3,0",
            "0,0,-1",
        ])

        expect(grid.doTransform("mirror", [
            "0,0,0",
            "1,0,0",
            "0,1,0",
            "0,0,1",
            "1,2,3",
        ])).toEqual([
            "0,0,0",
            "1,0,0",
            "0,1,0",
            "0,0,-1",
            "1,2,-3",
        ])

        expect(grid.doTransform("flip+mirror", [
            "0,0,0",
            "1,0,0",
            "0,1,0",
            "0,0,1",
        ])).toEqual([
            "0,0,0",
            "1,0,0",
            "0,3,0",
            "0,0,1",
        ])

    })

    test("scaleTransform()", () => {
        const grid = new CylindricalGrid()
        grid.nDivisions = 4

        expect(grid.scaleTransform("t:1,2", 2)).toEqual("t:2,4")

        expect(() => {
            grid.scaleTransform("flip", 2)
        }).toThrowErrorMatchingInlineSnapshot(`[Error: Scaling not supported on transform: flip]`)
    })

    test("getTranslation()", () => {
        const grid = new CylindricalGrid()
        grid.nDivisions = 4

        expect(grid.getTranslation("1,0,0", "0,0,0")).toEqual(null)
        expect(grid.getTranslation("1,1,0", "1,0,0")).toEqual("t:-1,0")
        expect(grid.getTranslation("1,0,1", "1,0,0")).toEqual("t:0,-1")
        expect(grid.getTranslation("1,0,0", "1,3,0")).toEqual("t:3,0")
        expect(grid.getTranslation("1,3,0", "1,0,0")).toEqual("t:-3,0")
    })

    test("getOriginTranslation()", () => {
        const grid = new CylindricalGrid()
        grid.nDivisions = 4

        expect(grid.getOriginTranslation(["0,0,0"])).toEqual("t:0,0")
        expect(grid.getOriginTranslation(["1,2,3"])).toEqual("t:-2,-3")
        expect(grid.getOriginTranslation(["0,3,0"])).toEqual("t:-3,0")
    })

})