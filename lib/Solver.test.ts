import {test, expect, describe} from "vitest"

import {Piece, Puzzle} from "~/lib/Puzzle.ts"
import {Voxel} from "~/lib/Grid.ts"
import {CubicGrid} from "~/lib/grids/CubicGrid.ts"
import {AssemblyProblem} from "~/lib/Problem"
import {AssemblySolution} from "~/lib/Solution.ts"

import {AssemblySolver} from "./Solver.ts"

type SolutionShorthand = {[pieceId: string]: Voxel[]}
function assertSolutionEqual(solution: AssemblySolution, expected: SolutionShorthand) {
    const actual: SolutionShorthand = {}
    for(const placement of solution.placements) {
        const pieceId = placement.originalPieceId
        if(pieceId === null) {
            throw new Error("Piece should have an ID")
        }
        actual[pieceId] = placement.transformedPiece.voxels
    }
    expect(actual).toEqual(expected)
}

describe("AssemblySolver", () => {
    const puzzle = new Puzzle(new CubicGrid())

    // Problem 0
    // 001
    // 0-1
    puzzle.addPiece(new Piece(
        "problem-0-goal-piece",
        puzzle.grid.getDefaultPieceBounds(),
        ["0,0,0", "0,1,0", "1,1,0", "2,1,0", "2,0,0"]
    ))
    puzzle.addPiece(new Piece(
        "problem-0-piece-0",
        puzzle.grid.getDefaultPieceBounds(),
        ["0,0,0", "1,0,0", "1,1,0"]
    ))
    puzzle.addPiece(new Piece(
        "problem-0-piece-1",
        puzzle.grid.getDefaultPieceBounds(),
        ["0,0,0", "0,1,0"]
    ))
    const problem0 = new AssemblyProblem("problem-0")
    problem0.goalPieceId = "problem-0-goal-piece"
    problem0.usedPieceCounts.set("problem-0-piece-0", 1)
    problem0.usedPieceCounts.set("problem-0-piece-1", 1)

    // Problem 1
    // 000
    // 010
    // 111
    puzzle.addPiece(new Piece(
        "problem-1-goal-piece",
        puzzle.grid.getDefaultPieceBounds(),
        [
            "0,2,0", "1,2,0", "2,2,0",
            "0,1,0", "1,1,0", "2,1,0",
            "0,0,0", "1,0,0", "2,0,0",
        ]
    ))
    puzzle.addPiece(new Piece(
        "problem-1-piece-0",
        puzzle.grid.getDefaultPieceBounds(),
        ["0,0,0", "0,1,0", "1,1,0", "2,1,0", "2,0,0"]
    ))
    puzzle.addPiece(new Piece(
        "problem-1-piece-1",
        puzzle.grid.getDefaultPieceBounds(),
        ["0,0,0", "1,0,0", "2,0,0", "1,1,0"]
    ))
    const problem1 = new AssemblyProblem("problem-1")
    problem1.goalPieceId = "problem-1-goal-piece"
    problem1.usedPieceCounts.set("problem-1-piece-0", 1)
    problem1.usedPieceCounts.set("problem-1-piece-1", 1)

    const solver = new AssemblySolver()

    test("solve problem 0", () => {
        solver.removeSymmetries = false
        const solutions = solver.solve(puzzle, problem0)
        expect(solutions.length).toEqual(2)
        assertSolutionEqual(solutions[0], {
            "problem-0-piece-0": ["1,1,0", "2,1,0", "2,0,0"],
            "problem-0-piece-1": ["0,0,0", "0,1,0"],
        })
        assertSolutionEqual(solutions[1], {
            "problem-0-piece-0": ["1,1,0", "0,1,0", "0,0,0"],
            "problem-0-piece-1": ["2,0,0", "2,1,0"],
        })
    })

    test("solve problem 0 with removed symmetries", () => {
        solver.removeSymmetries = true
        const solutions = solver.solve(puzzle, problem0)
        expect(solutions.length).toEqual(1)
        assertSolutionEqual(solutions[0], {
            "problem-0-piece-0": ["1,1,0", "2,1,0", "2,0,0"],
            "problem-0-piece-1": ["0,0,0", "0,1,0"],
        })
    })

    test("solve problem 1", () => {
        solver.removeSymmetries = false
        const solutions = solver.solve(puzzle, problem1)
        expect(solutions.length).toEqual(4)
        assertSolutionEqual(solutions[0], {
            "problem-1-piece-0": ["0,1,0", "0,2,0", "1,2,0", "2,2,0", "2,1,0"],
            "problem-1-piece-1": ["0,0,0", "1,0,0", "2,0,0", "1,1,0"],
        })
        assertSolutionEqual(solutions[1], {
            "problem-1-piece-0": ["0,1,0", "0,0,0", "1,0,0", "2,0,0", "2,1,0"],
            "problem-1-piece-1": ["0,2,0", "1,2,0", "2,2,0", "1,1,0"],
        })
        assertSolutionEqual(solutions[2], {
            "problem-1-piece-0": ["1,2,0", "2,2,0", "2,1,0", "2,0,0", "1,0,0"],
            "problem-1-piece-1": ["0,2,0", "0,1,0", "0,0,0", "1,1,0"],
        })
        assertSolutionEqual(solutions[3], {
            "problem-1-piece-0": ["1,0,0", "0,0,0", "0,1,0", "0,2,0", "1,2,0"],
            "problem-1-piece-1": ["2,0,0", "2,1,0", "2,2,0", "1,1,0"],
        })
    })

    test("solve problem 1 with removed symmetries", () => {
        solver.removeSymmetries = true
        const solutions = solver.solve(puzzle, problem1)
        expect(solutions.length).toEqual(1)
        assertSolutionEqual(solutions[0], {
            "problem-1-piece-0": ["0,1,0", "0,2,0", "1,2,0", "2,2,0", "2,1,0"],
            "problem-1-piece-1": ["0,0,0", "1,0,0", "2,0,0", "1,1,0"],
        })
    })

    test("voxel count sanity-check", () => {
        let problem = problem0.copy()
        problem.usedPieceCounts.set("problem-0-piece-0", 2)
        expect(() => {
            solver.solve(puzzle, problem)
        }).toThrowErrorMatchingInlineSnapshot(`
          [Error: Number of voxels in pieces don't add up to the voxels in the goal piece.

          Voxels in goal: 5
          Voxels in pieces: 8]
        `)

        problem = problem0.copy()
        problem.usedPieceCounts.set("problem-0-piece-0", 0)
        expect(() => {
            solver.solve(puzzle, problem)
        }).toThrowErrorMatchingInlineSnapshot(`
          [Error: Number of voxels in pieces don't add up to the voxels in the goal piece.

          Voxels in goal: 5
          Voxels in pieces: 2]
        `)
    })
})