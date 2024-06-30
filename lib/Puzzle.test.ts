import {test, expect, describe} from "vitest"

import {Puzzle} from "~/lib/Puzzle.ts"
import {Piece} from "~/lib/Piece.ts"
import {CubicGrid} from "~/lib/grids/CubicGrid.ts"

const grid = new CubicGrid()

describe("Puzzle", () => {
    test("pieces", () => {
        const puzzle = new Puzzle(grid)

        const pieceWithId = new Piece(0)
        expect(puzzle.hasPiece(0)).toBeFalsy()
        expect(puzzle.hasPiece(pieceWithId)).toBeFalsy()
        puzzle.addPiece(pieceWithId)
        expect(puzzle.hasPiece(0)).toBeTruthy()
        expect(puzzle.hasPiece(pieceWithId)).toBeTruthy()

        const pieceWithSameId = new Piece(0)
        expect(() => {
            puzzle.addPiece(pieceWithSameId)
        }).toThrow("Duplicate piece ID: 0")

        expect(puzzle.hasPiece(pieceWithId)).toBeTruthy()
        puzzle.removePiece(pieceWithId)
        expect(puzzle.hasPiece(pieceWithId)).toBeFalsy()
        puzzle.removePiece(pieceWithId, false)
        expect(() => {
            puzzle.removePiece(pieceWithId)
        }).toThrow("Piece ID not found: 0")

        puzzle.addPiece(pieceWithId)
        expect(puzzle.hasPiece(0)).toBeTruthy()
        puzzle.removePiece(0)
        expect(puzzle.hasPiece(0)).toBeFalsy()
    })
})
