import {test, expect, describe} from "vitest"

import {Puzzle} from "~/lib/Puzzle.ts"
import {Shape} from "~/lib/Shape.ts"
import {CubicGrid} from "~/lib/grids/CubicGrid.ts"

const grid = new CubicGrid()

describe("Puzzle", () => {
    test("shapes", () => {
        const puzzle = new Puzzle(grid)

        const shapeWithId = new Shape(0)
        expect(puzzle.hasShape(0)).toBeFalsy()
        expect(puzzle.hasShape(shapeWithId)).toBeFalsy()
        puzzle.addShape(shapeWithId)
        expect(puzzle.hasShape(0)).toBeTruthy()
        expect(puzzle.hasShape(shapeWithId)).toBeTruthy()

        const shapeWithSameId = new Shape(0)
        expect(() => {
            puzzle.addShape(shapeWithSameId)
        }).toThrow("Duplicate shape ID: 0")

        expect(puzzle.hasShape(shapeWithId)).toBeTruthy()
        puzzle.removeShape(shapeWithId)
        expect(puzzle.hasShape(shapeWithId)).toBeFalsy()
        puzzle.removeShape(shapeWithId, false)
        expect(() => {
            puzzle.removeShape(shapeWithId)
        }).toThrow("Shape ID not found: 0")

        puzzle.addShape(shapeWithId)
        expect(puzzle.hasShape(0)).toBeTruthy()
        puzzle.removeShape(0)
        expect(puzzle.hasShape(0)).toBeFalsy()
    })
})
