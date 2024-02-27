import {test, expect, describe} from "vitest"

import {Piece, Puzzle} from "~/lib/Puzzle.ts"
import {CubicGrid} from "~/lib/grids/CubicGrid.ts"

describe("Puzzle", () => {
    const grid = new CubicGrid()

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
})