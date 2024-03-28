import {test, expect, describe} from "vitest"

import {Puzzle} from "~/lib/Puzzle.ts"
import {Piece} from "~/lib/Piece.ts"
import {CubicGrid} from "~/lib/grids/CubicGrid.ts"

const grid = new CubicGrid()

describe("Puzzle", () => {
    test("pieces", () => {
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
