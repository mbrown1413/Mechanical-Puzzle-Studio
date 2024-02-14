import {test, expect, describe} from "vitest"

import {Piece, Puzzle} from "./Puzzle.ts"
import {Voxel} from "./Grid.ts"
import {CubicGrid} from "./grids/CubicGrid.ts"
import {orientationTestResultingShapes, orientationTestShape} from "./grids/CubicGrid.test.ts"

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

describe("Puzzle", () => {
    test("Piece editing", () => {
        const puzzle = new Puzzle(new CubicGrid())

        const pieceWithId = new Piece("piece-0", puzzle.grid.getDefaultPieceBounds())
        expect(puzzle.hasPiece("piece-0")).toBeFalsy()
        expect(puzzle.hasPiece(pieceWithId)).toBeFalsy()
        puzzle.addPiece(pieceWithId)
        expect(puzzle.hasPiece("piece-0")).toBeTruthy()
        expect(puzzle.hasPiece(pieceWithId)).toBeTruthy()

        const pieceWithSameId = new Piece("piece-0", puzzle.grid.getDefaultPieceBounds())
        expect(() => {
            puzzle.addPiece(pieceWithSameId)
        }).toThrow("Duplicate piece ID: piece-0")

        const pieceWithoutId = new Piece(null, puzzle.grid.getDefaultPieceBounds())
        expect(() => {
            puzzle.addPiece(pieceWithoutId)
        }).toThrow("Cannot add piece without ID")
        expect(puzzle.hasPiece(pieceWithoutId)).toBeFalsy()

        puzzle.removePiece(pieceWithoutId, false)
        expect(() => {
            puzzle.removePiece(pieceWithoutId)
        }).toThrow("Cannot remove piece without ID")

        expect(puzzle.hasPiece(pieceWithId)).toBeTruthy()
        puzzle.removePiece(pieceWithId)
        expect(puzzle.hasPiece(pieceWithId)).toBeFalsy()
        puzzle.removePiece(pieceWithId, false)
        expect(() => {
            puzzle.removePiece(pieceWithId)
        }).toThrow("Piece ID not found: piece-0")

        puzzle.addPiece(pieceWithId)
        expect(puzzle.hasPiece("piece-0")).toBeTruthy()
        puzzle.removePiece("piece-0")
        expect(puzzle.hasPiece("piece-0")).toBeFalsy()
    })

    test("Piece copy", () => {
        const piece0 = new Piece("piece-0", [])
        const copy0 = piece0.copy()
        expect(copy0).not.toBe(piece0)
        expect(copy0).toEqual(Object.assign(piece0, {id: null}))

        const piece1 = new Piece(null, [])
        const copy1 = piece1.copy()
        expect(copy1).not.toBe(piece1)
        expect(copy1).toEqual(piece1)
    })

    test("Piece variations", () => {
        const puzzle = new Puzzle(new CubicGrid())
        const piece = new Piece(
            "piece-0",
            puzzle.grid.getDefaultPieceBounds(),
            orientationTestShape
        )
        const variations = Array.from(puzzle.getPieceOrientations(piece))
        expect(variations.length).toEqual(24)
        expect(variations[0].originalPiece).toEqual(Object.assign({}, piece, {id: null}))
        expect(variations[0].transformedPiece).not.toEqual(piece)
        for(let i=0; i<24; i++) {
            expect(
                variations[i].transformedPiece.voxels
            ).toEqual(orientationTestResultingShapes[i])
        }
    })

    test("Piece translations", () => {
        let puzzle = new Puzzle(new CubicGrid())
        let piece = new Piece(
            "piece-0",
            puzzle.grid.getDefaultPieceBounds(),
            ["0,0,0", "1,0,0"]
        )
        let placements = Array.from(puzzle.getPieceTranslations(
            piece,
            puzzle.grid.getVoxels([3, 2, 2])
        ))
        expect(placements.length).toEqual(8)

        expect(placements[0].translation).toEqual([0, 0, 0])
        expect(placements[1].translation).toEqual([0, 0, 1])
        expect(placements[2].translation).toEqual([0, 1, 0])
        expect(placements[3].translation).toEqual([0, 1, 1])
        expect(placements[4].translation).toEqual([1, 0, 0])
        expect(placements[5].translation).toEqual([1, 0, 1])
        expect(placements[6].translation).toEqual([1, 1, 0])
        expect(placements[7].translation).toEqual([1, 1, 1])

        expect(placements[0].transformedPiece.voxels).toEqual(["0,0,0", "1,0,0"])
        expect(placements[1].transformedPiece.voxels).toEqual(["0,0,1", "1,0,1"])
        expect(placements[2].transformedPiece.voxels).toEqual(["0,1,0", "1,1,0"])
        expect(placements[3].transformedPiece.voxels).toEqual(["0,1,1", "1,1,1"])
        expect(placements[4].transformedPiece.voxels).toEqual(["1,0,0", "2,0,0"])
        expect(placements[5].transformedPiece.voxels).toEqual(["1,0,1", "2,0,1"])
        expect(placements[6].transformedPiece.voxels).toEqual(["1,1,0", "2,1,0"])
        expect(placements[7].transformedPiece.voxels).toEqual(["1,1,1", "2,1,1"])

        puzzle = new Puzzle(new CubicGrid())
        piece = new Piece(
            "piece-0",
            puzzle.grid.getDefaultPieceBounds(),
            ["0,0,0", "0,0,1"]
        )
        placements = Array.from(puzzle.getPieceTranslations(
            piece,
            puzzle.grid.getVoxels([3, 2, 2])
        ))
        expect(placements.length).toEqual(6)
        expect(placements[0].transformedPiece.voxels).toEqual(["0,0,0", "0,0,1"])
        expect(placements[1].transformedPiece.voxels).toEqual(["0,1,0", "0,1,1"])
        expect(placements[2].transformedPiece.voxels).toEqual(["1,0,0", "1,0,1"])
        expect(placements[3].transformedPiece.voxels).toEqual(["1,1,0", "1,1,1"])
        expect(placements[4].transformedPiece.voxels).toEqual(["2,0,0", "2,0,1"])
        expect(placements[5].transformedPiece.voxels).toEqual(["2,1,0", "2,1,1"])
    })

    test("Piece placements", () => {
        let puzzle = new Puzzle(new CubicGrid())
        let piece = new Piece(
            "piece-0",
            puzzle.grid.getDefaultPieceBounds(),
            ["0,0,0", "0,0,1"]
        )
        let placements = Array.from(puzzle.getPiecePlacements(
            piece,
            puzzle.grid.getVoxels([3, 2, 2])
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

        puzzle = new Puzzle(new CubicGrid())
        piece = new Piece(
            "piece-0",
            puzzle.grid.getDefaultPieceBounds(),
            ["0,0,0", "0,1,0", "1,1,0"]
        )
        placements = Array.from(puzzle.getPiecePlacements(
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