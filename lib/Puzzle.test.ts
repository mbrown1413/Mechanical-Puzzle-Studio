import {test, expect, describe} from "vitest"

import {Piece, Puzzle} from "~/lib/Puzzle.ts"
import {CubicGrid} from "~/lib/grids/CubicGrid.ts"

const grid = new CubicGrid()

describe("Piece", () => {
    test("Piece editing", () => {
        const puzzle = new Puzzle(grid)

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
})

describe("Piece", () => {
    test("copy", () => {
        const piece0 = new Piece("piece-0", [])
        const copy0 = piece0.copy()
        expect(copy0).not.toBe(piece0)
        expect(copy0).toEqual(Object.assign(piece0, {id: null}))

        const piece1 = new Piece(null, [])
        const copy1 = piece1.copy()
        expect(copy1).not.toBe(piece1)
        expect(copy1).toEqual(piece1)
    })

    test("equality", () => {
        const piece1 = new Piece(null, grid.getDefaultPieceBounds())
        const piece2 = new Piece("withId", grid.getDefaultPieceBounds())

        piece1.voxels = ["0,0,0", "1,1,1"]
        piece2.voxels = ["1,1,1", "0,0,0"]
        expect(piece1.equals(piece2)).toBeTruthy()

        piece1.voxels.push("0,0,0")
        expect(piece1.equals(piece2)).toBeTruthy()

        piece1.voxels.push("0,1,0")
        expect(piece1.equals(piece2)).toBeFalsy()
    })

    test("equality with voxelAttribute", () => {
        const piece1 = new Piece(null, grid.getDefaultPieceBounds())
        const piece2 = new Piece(null, grid.getDefaultPieceBounds())

        piece1.voxels = ["0,0,0", "1,1,1"]
        piece2.voxels = ["0,0,0", "1,1,1"]
        expect(piece1.equals(piece2)).toBeTruthy()

        piece1.setVoxelAttribute("foo", "0,0,0", true)
        expect(piece1.equals(piece2)).toBeFalsy()

        piece2.setVoxelAttribute("foo", "0,0,0", false)
        expect(piece1.equals(piece2)).toBeFalsy()

        piece2.setVoxelAttribute("foo", "0,0,0", true)
        expect(piece1.equals(piece2)).toBeTruthy()

        piece1.setVoxelAttribute("bar", "0,0,0", true)
        expect(piece1.equals(piece2)).toBeFalsy()

        piece2.setVoxelAttribute("bar", "0,0,0", true)
        expect(piece1.equals(piece2)).toBeTruthy()

        // Attribute on non-existant voxel doesn't affect equality
        piece2.setVoxelAttribute("baz", "8,8,8", true)
        expect(piece1.equals(piece2)).toBeTruthy()
    })

    test("transform", () => {
        const piece = new Piece(null, grid.getDefaultPieceBounds())
        piece.voxels = ["0,0,0", "1,1,1"]

        const translate = grid.getTranslation("0,0,0", "1,0,0")
        piece.transform(translate)
        expect(piece.voxels).toEqual(["1,0,0", "2,1,1"])
    })

    test("transform with voxelAttributes", () => {
        const piece = new Piece(null, grid.getDefaultPieceBounds())
        piece.voxels = ["0,0,0", "1,1,1"]
        piece.setVoxelAttribute("foo", "0,0,0", true)

        const translate = grid.getTranslation("0,0,0", "1,0,0")
        piece.transform(translate)
        expect(piece.voxels).toEqual(["1,0,0", "2,1,1"])
        expect(piece.voxelAttributes).toEqual({
            "foo": {
                "1,0,0": true
            }
        })

        // Transform when voxel attribute on a voxel that's not a part of this
        // piece
        piece.setVoxelAttribute("foo", "9,9,9", true)
        piece.transform(translate)
        expect(piece.voxels).toEqual(["2,0,0", "3,1,1"])
        expect(piece.voxelAttributes).toEqual({
            "foo": {
                "2,0,0": true
            }
        })
    })
})