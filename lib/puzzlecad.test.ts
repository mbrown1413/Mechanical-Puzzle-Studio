import {test, expect, describe} from "vitest"

import {convertToPuzzlecad} from "~/lib/puzzlecad.ts"
import {Puzzle} from "~/lib/Puzzle.ts"
import {Shape} from "~/lib/Shape.ts"
import {CubicGrid} from "~/lib/grids/CubicGrid.ts"
import {SquareGrid} from "~/lib/grids/SquareGrid.ts"
import {CylindricalGrid} from "~/lib/grids/CylindricalGrid.ts"
import {AssemblyProblem} from "~/lib/Problem"
import {PuzzleFile} from "./PuzzleFile"

describe("puzzlecad export", () => {

    test("cubic puzzle", () => {
        const puzzle = new Puzzle(new CubicGrid())
        const puzzleFile = new PuzzleFile(puzzle, "Test Puzzle")

        const goal = puzzle.addShape(new Shape(
            3,
            ["0,0,0", "0,1,0", "1,1,0", "2,1,0", "2,0,0"]
        ))

        const shape0 = puzzle.addShape(new Shape(
            4,
            [
                "0,0,0", "1,0,0", "1,1,0",
                "0,0,1", "1,0,1"
            ]
        ))

        const shape1 = puzzle.addShape(new Shape(
            5,
            ["0,0,0", "0,1,0"]
        ))
        shape1.label = "Shape 1"
        const problem0 = new AssemblyProblem(0)
        problem0.goalShapeId = goal.id
        problem0.shapeCounts[shape0.id] = 1
        problem0.shapeCounts[shape1.id] = 1

        expect(convertToPuzzlecad(puzzleFile)).toMatchInlineSnapshot(`
          "/**
           * Test Puzzle
           * Exported from Puzzle Studio
           */

          // Get Puzzlecad from:
          //   https://github.com/aaron-siegel/puzzlecad/releases
          //   https://www.puzzlehub.org/puzzlecad
          include <puzzlecad.scad>

          burr_plate([
              [
                  "x.x|xxx",
              ],
              [
                  "xx|.x",
                  "xx|..",
              ],
              [  // Shape 1
                  "x|x",
              ],
          ], $auto_layout=true);"
        `);
    })

    test("square puzzle", () => {
        const puzzle = new Puzzle(new SquareGrid())
        const puzzleFile = new PuzzleFile(puzzle, "Test Puzzle")

        const goal = puzzle.addShape(new Shape(
            3,
            ["0,0,0", "0,1,0", "1,1,0", "2,1,0", "2,0,0"]
        ))

        const shape0 = puzzle.addShape(new Shape(
            4,
            ["0,0,0", "1,0,0", "1,1,0"]
        ))

        const shape1 = puzzle.addShape(new Shape(
            5,
            ["0,0,0", "0,1,0"]
        ))
        shape1.label = "Shape 1"
        const problem0 = new AssemblyProblem(0)
        problem0.goalShapeId = goal.id
        problem0.shapeCounts[shape0.id] = 1
        problem0.shapeCounts[shape1.id] = 1

        expect(convertToPuzzlecad(puzzleFile)).toMatchInlineSnapshot(`
          "/**
           * Test Puzzle
           * Exported from Puzzle Studio
           */

          // Get Puzzlecad from:
          //   https://github.com/aaron-siegel/puzzlecad/releases
          //   https://www.puzzlehub.org/puzzlecad
          include <puzzlecad.scad>

          burr_plate([
              [
                  "x.x|xxx",
              ],
              [
                  "xx|.x",
              ],
              [  // Shape 1
                  "x|x",
              ],
          ], $auto_layout=true);"
        `);
    })

    test("empty puzzle", () => {
        const puzzle = new Puzzle(new SquareGrid())
        const puzzleFile = new PuzzleFile(puzzle, "Test Puzzle")
        expect(convertToPuzzlecad(puzzleFile)).toMatchInlineSnapshot(`
          "/**
           * Test Puzzle
           * Exported from Puzzle Studio
           */

          // Get Puzzlecad from:
          //   https://github.com/aaron-siegel/puzzlecad/releases
          //   https://www.puzzlehub.org/puzzlecad
          include <puzzlecad.scad>

          burr_plate([
          ], $auto_layout=true);"
        `)
    })

    test("unsupported grid", () => {
        const puzzle = new Puzzle(new CylindricalGrid())
        const puzzleFile = new PuzzleFile(puzzle, "Test Puzzle")
        expect(() => convertToPuzzlecad(puzzleFile)).toThrowErrorMatchingInlineSnapshot(`[Error: Grid not compatible with Puzzlecad export]`)
    })

})