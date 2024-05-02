import {test, expect, describe} from "vitest"

import {Piece, PieceWithId} from "~/lib/Piece.ts"
import {CubicGrid} from "~/lib/grids/CubicGrid.ts"
import {
    rotationTestData,
    makePlacementSet,
} from "~/lib/grids/CubicGrid.test.ts"
import {
    getPieceOrientations,
    getPieceTranslations,
    getPiecePlacements
} from "~/lib/placements.ts"

const grid = new CubicGrid()

describe("getPieceOrientations()", () => {
    test("simple orientation", () => {
        const piece = new Piece(
            0,
            rotationTestData.originalPiece
        ) as PieceWithId
        const orientations = getPieceOrientations(grid, piece)
        const actualOrientations = makePlacementSet(
            orientations.map((placement) => placement.voxels)
        )
        const expectedOrientations = makePlacementSet(
            rotationTestData.orientationsMinusSymmetries
        )
        expect(actualOrientations).toEqual(expectedOrientations)
        expect(orientations[0].id).toEqual(piece.id)
        expect(orientations[0]).toEqual(piece)
    })

})

describe("getPieceTranslations()", () => {
    test("simple translation", () => {
        let piece = new Piece(
            0,
            ["0,0,0", "1,0,0"]
        ) as PieceWithId
        let placements = Array.from(getPieceTranslations(
            grid,
            piece,
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

        piece = new Piece(
            0,
            ["0,0,0", "0,0,1"]
        ) as PieceWithId
        placements = Array.from(getPieceTranslations(
            grid,
            piece,
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

describe("getPiecePlacements()", () => {
    test("simple piece", () => {
        let piece = new Piece(
            0,
            ["0,0,0", "0,0,1"]
        ) as PieceWithId
        let placements = Array.from(getPiecePlacements(
            grid,
            piece,
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

        piece = new Piece(
            0,
            ["0,0,0", "0,1,0", "1,1,0"]
        ) as PieceWithId
        placements = Array.from(getPiecePlacements(
            grid,
            piece,
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