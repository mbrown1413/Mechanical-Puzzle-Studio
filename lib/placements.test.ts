import {test, expect, describe} from "vitest"

import {Piece} from "~/lib/Puzzle.ts"
import {Voxel} from "~/lib/Grid.ts"
import {CubicGrid} from "~/lib/grids/CubicGrid.ts"
import {
    orientationTestResultingShapes,
    orientationTestShape
} from "~/lib/grids/CubicGrid.test.ts"
import {
    getPieceOrientations,
    getPieceTranslations,
    getPiecePlacements
} from "~/lib/placements.ts"

function makePlacementSet(voxelLists: Voxel[][]): Set<string> {
    const set: Set<string> = new Set()
    for(const voxels of voxelLists) {
        const sortedVoxels = [...voxels].sort()
        set.add(
            sortedVoxels.join("; ")
        )
    }
    return set
}

describe("Piece placement", () => {
    const grid = new CubicGrid()

    test("orientations", () => {
        const piece = new Piece(
            "piece-0",
            [3, 3, 3],
            orientationTestShape
        )
        const orientations = Array.from(getPieceOrientations(grid, piece))
        expect(orientations.length).toEqual(24)
        expect(orientations[0].originalPiece).toEqual(Object.assign({}, piece, {id: null}))
        expect(orientations[0].transformedPiece).not.toEqual(piece)
        for(let i=0; i<24; i++) {
            expect(
                orientations[i].transformedPiece.voxels
            ).toEqual(orientationTestResultingShapes[i])
        }
    })

    test("translations", () => {
        let piece = new Piece(
            "piece-0",
            [3, 3, 3],
            ["0,0,0", "1,0,0"]
        )
        let placements = Array.from(getPieceTranslations(
            grid,
            piece,
            grid.getVoxels([3, 2, 2])
        ))
        expect(placements.length).toEqual(8)

        expect(placements[0].transformedPiece.voxels).toEqual(["0,0,0", "1,0,0"])
        expect(placements[1].transformedPiece.voxels).toEqual(["0,0,1", "1,0,1"])
        expect(placements[2].transformedPiece.voxels).toEqual(["0,1,0", "1,1,0"])
        expect(placements[3].transformedPiece.voxels).toEqual(["0,1,1", "1,1,1"])
        expect(placements[4].transformedPiece.voxels).toEqual(["1,0,0", "2,0,0"])
        expect(placements[5].transformedPiece.voxels).toEqual(["1,0,1", "2,0,1"])
        expect(placements[6].transformedPiece.voxels).toEqual(["1,1,0", "2,1,0"])
        expect(placements[7].transformedPiece.voxels).toEqual(["1,1,1", "2,1,1"])

        piece = new Piece(
            "piece-0",
            [3, 3, 3],
            ["0,0,0", "0,0,1"]
        )
        placements = Array.from(getPieceTranslations(
            grid,
            piece,
            grid.getVoxels([3, 2, 2])
        ))
        expect(placements.length).toEqual(6)
        expect(placements[0].transformedPiece.voxels).toEqual(["0,0,0", "0,0,1"])
        expect(placements[1].transformedPiece.voxels).toEqual(["0,1,0", "0,1,1"])
        expect(placements[2].transformedPiece.voxels).toEqual(["1,0,0", "1,0,1"])
        expect(placements[3].transformedPiece.voxels).toEqual(["1,1,0", "1,1,1"])
        expect(placements[4].transformedPiece.voxels).toEqual(["2,0,0", "2,0,1"])
        expect(placements[5].transformedPiece.voxels).toEqual(["2,1,0", "2,1,1"])
    })

    test("placements", () => {
        let piece = new Piece(
            "piece-0",
            grid.getDefaultPieceBounds(),
            ["0,0,0", "0,0,1"]
        )
        let placements = Array.from(getPiecePlacements(
            grid,
            piece,
            grid.getVoxels([3, 2, 2])
        ))
        expect(placements.length).toEqual(20)
        expect(
            makePlacementSet(placements.map((p) => p.transformedPiece.voxels))
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
            "piece-0",
            [3, 3, 3],
            ["0,0,0", "0,1,0", "1,1,0"]
        )
        placements = Array.from(getPiecePlacements(
            grid,
            piece,
            ["0,0,0", "0,1,0", "1,1,0"]
        ))
        expect(placements.length).toEqual(1)
        expect(
            placements.map((p) => p.transformedPiece.voxels)
        ).toEqual([
            ["0,0,0", "0,1,0", "1,1,0"],
        ])

   })

})