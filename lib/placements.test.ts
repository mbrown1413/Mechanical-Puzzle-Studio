import {test, expect, describe} from "vitest"

import {Shape} from "~/lib/Shape.ts"
import {CubicGrid} from "~/lib/grids/CubicGrid.ts"
import {
    rotationTestData,
    makePlacementSet,
} from "~/lib/grids/CubicGrid.test.ts"
import {
    getShapeOrientations,
    getShapeTranslations,
    getShapePlacements
} from "~/lib/placements.ts"

const grid = new CubicGrid()

describe("getShapeOrientations()", () => {
    test("simple orientation", () => {
        const shape = new Shape(
            0,
            rotationTestData.originalShape
        )
        const orientations = getShapeOrientations(grid, shape)
        const actualOrientations = makePlacementSet(
            orientations.map((placement) => placement.voxels)
        )
        const expectedOrientations = makePlacementSet(
            rotationTestData.allOrientations
        )
        expect(actualOrientations).toEqual(expectedOrientations)
        expect(orientations[0].id).toEqual(shape.id)
        expect(orientations[0]).toEqual(shape)
    })

})

describe("getShapeTranslations()", () => {
    test("simple translation", () => {
        let shape = new Shape(
            0,
            ["0,0,0", "1,0,0"]
        )
        let placements = Array.from(getShapeTranslations(
            grid,
            shape,
            grid.getVoxels({xSize: 3, ySize: 2, zSize: 2})
        ))
        expect(placements.length).toEqual(8)

        expect(placements[0].voxels).toEqual(["0,0,0", "1,0,0"])
        expect(placements[1].voxels).toEqual(["0,0,1", "1,0,1"])
        expect(placements[2].voxels).toEqual(["0,1,0", "1,1,0"])
        expect(placements[3].voxels).toEqual(["0,1,1", "1,1,1"])
        expect(placements[4].voxels).toEqual(["1,0,0", "2,0,0"])
        expect(placements[5].voxels).toEqual(["1,0,1", "2,0,1"])
        expect(placements[6].voxels).toEqual(["1,1,0", "2,1,0"])
        expect(placements[7].voxels).toEqual(["1,1,1", "2,1,1"])

        shape = new Shape(
            0,
            ["0,0,0", "0,0,1"]
        )
        placements = Array.from(getShapeTranslations(
            grid,
            shape,
            grid.getVoxels({xSize: 3, ySize: 2, zSize: 2})
        ))
        expect(placements.length).toEqual(6)
        expect(placements[0].voxels).toEqual(["0,0,0", "0,0,1"])
        expect(placements[1].voxels).toEqual(["0,1,0", "0,1,1"])
        expect(placements[2].voxels).toEqual(["1,0,0", "1,0,1"])
        expect(placements[3].voxels).toEqual(["1,1,0", "1,1,1"])
        expect(placements[4].voxels).toEqual(["2,0,0", "2,0,1"])
        expect(placements[5].voxels).toEqual(["2,1,0", "2,1,1"])
    })
})

describe("getShapePlacements()", () => {
    test("simple shape", () => {
        let shape = new Shape(
            0,
            ["0,0,0", "0,0,1"]
        )
        let placements = Array.from(getShapePlacements(
            grid,
            shape,
            grid.getVoxels({xSize: 3, ySize: 2, zSize: 2}),
        ))
        expect(
            makePlacementSet(placements.map((p) => p.voxels))
        ).toEqual(
            makePlacementSet([
                ["0,0,0", "1,0,0"],
                ["0,1,0", "1,1,0"],
                ["0,0,1", "1,0,1"],
                ["0,1,1", "1,1,1"],
                ["1,0,0", "2,0,0"],
                ["1,1,0", "2,1,0"],
                ["1,0,1", "2,0,1"],
                ["1,1,1", "2,1,1"],

                ["0,0,0", "0,0,1"],
                ["0,1,0", "0,1,1"],
                ["1,0,0", "1,0,1"],
                ["1,1,0", "1,1,1"],
                ["2,0,0", "2,0,1"],
                ["2,1,0", "2,1,1"],

                ["0,0,0", "0,1,0"],
                ["1,0,0", "1,1,0"],
                ["2,0,0", "2,1,0"],
                ["0,0,1", "0,1,1"],
                ["1,0,1", "1,1,1"],
                ["2,0,1", "2,1,1"],
            ])
        )

        shape = new Shape(
            0,
            ["0,0,0", "0,1,0", "1,1,0"]
        )
        placements = Array.from(getShapePlacements(
            grid,
            shape,
            ["0,0,0", "0,1,0", "1,1,0"],
        ))
        expect(placements.length).toEqual(1)
        expect(
            placements.map((p) => p.voxels)
        ).toEqual([
            ["0,0,0", "0,1,0", "1,1,0"],
        ])

   })
})