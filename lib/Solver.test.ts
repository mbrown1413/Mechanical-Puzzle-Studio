import {test, expect, describe} from "vitest"
import {AssemblySolver} from "./Solver.ts"
import {Piece, Puzzle} from "./Puzzle.ts"
import {CubicGrid} from "./grids/CubicGrid.ts"
import {AssemblyProblem} from "./Problem"
import {AssemblySolution} from "./Solution.ts"
import {Voxel} from "./types.ts"

type SolutionShorthand = {[pieceId: string]: Voxel[]}
function assertSolutionEqual(solution: AssemblySolution, expected: SolutionShorthand) {
    const actual: SolutionShorthand = {}
    for(const [pieceId, placement] of solution.placements.entries()) {
        actual[pieceId] = placement.transformedPiece.voxels
    }
    expect(actual).toMatchObject(expected)
}

describe("AssemblySolver", () => {
    const puzzle = new Puzzle("puzzle-0", new CubicGrid())

    // Problem 0
    // 001
    // 0-1
    puzzle.addPiece(new Piece(
        "problem-0-goal-piece",
        puzzle.grid.getDefaultPieceBounds(),
        [[0, 0, 0], [0, 1, 0], [1, 1, 0], [2, 1, 0], [2, 0, 0]]
    ))
    puzzle.addPiece(new Piece(
        "problem-0-piece-0",
        puzzle.grid.getDefaultPieceBounds(),
        [[0, 0, 0], [1, 0, 0], [1, 1, 0]]
    ))
    puzzle.addPiece(new Piece(
        "problem-0-piece-1",
        puzzle.grid.getDefaultPieceBounds(),
        [[0, 0, 0], [0, 1, 0]]
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
            [0, 2, 0], [1, 2, 0], [2, 2, 0],
            [0, 1, 0], [1, 1, 0], [2, 1, 0],
            [0, 0, 0], [1, 0, 0], [2, 0, 0],
        ]
    ))
    puzzle.addPiece(new Piece(
        "problem-1-piece-0",
        puzzle.grid.getDefaultPieceBounds(),
        [[0, 0, 0], [0, 1, 0], [1, 1, 0], [2, 1, 0], [2, 0, 0]]
    ))
    puzzle.addPiece(new Piece(
        "problem-1-piece-1",
        puzzle.grid.getDefaultPieceBounds(),
        [[0, 0, 0], [1, 0, 0], [2, 0, 0], [1, 1, 0]]
    ))
    const problem1 = new AssemblyProblem("problem-1")
    problem1.goalPieceId = "problem-1-goal-piece"
    problem1.usedPieceCounts.set("problem-1-piece-0", 1)
    problem1.usedPieceCounts.set("problem-1-piece-1", 1)

    const solver = new AssemblySolver()

    test("cover matrix for problem 0", () => {
        const {rows} = solver.getCoverProblem(puzzle, problem0)
        expect(rows).toMatchObject([
            [true, false, false, false, true, true, true],
            [true, false, true, true, true, false, false],
            [false, true, true, true, false, false, false],
            [false, true, false, false, false, true, true],
            [false, true, false, true, true, false, false],
            [false, true, false, false, true, true, false],
        ])
    })
    
    test("solve problem 0", () => {
        const solutions = solver.solve(puzzle, problem0)
        expect(solutions.length).toEqual(2)
        assertSolutionEqual(solutions[0], {
            "problem-0-piece-0": [[1, 1, 0], [2, 1, 0], [2, 0, 0]],
            "problem-0-piece-1": [[0, 0, 0], [0, 1, 0]],
        })
        assertSolutionEqual(solutions[1], {
            "problem-0-piece-0": [[1, 1, 0], [0, 1, 0], [0, 0, 0]],
            "problem-0-piece-1": [[2, 0, 0], [2, 1, 0]],
        })
    })

    test("solve problem 1", () => {
        const solutions = solver.solve(puzzle, problem1)
        expect(solutions.length).toEqual(4)
        assertSolutionEqual(solutions[0], {
            "problem-1-piece-0": [[0, 1, 0], [0, 2, 0], [1, 2, 0], [2, 2, 0], [2, 1, 0]],
            "problem-1-piece-1": [[0, 0, 0], [1, 0, 0], [2, 0, 0], [1, 1, 0]],
        })
        assertSolutionEqual(solutions[1], {
            "problem-1-piece-0": [[0, 1, 0], [0, 0, 0], [1, 0, 0], [2, 0, 0], [2, 1, 0]],
            "problem-1-piece-1": [[0, 2, 0], [1, 2, 0], [2, 2, 0], [1, 1, 0]],
        })
        assertSolutionEqual(solutions[2], {
            "problem-1-piece-0": [[1, 2, 0], [2, 2, 0], [2, 1, 0], [2, 0, 0], [1, 0, 0]],
            "problem-1-piece-1": [[0, 2, 0], [0, 1, 0], [0, 0, 0], [1, 1, 0]],
        })
        assertSolutionEqual(solutions[3], {
            "problem-1-piece-0": [[1, 0, 0], [0, 0, 0], [0, 1, 0], [0, 2, 0], [1, 2, 0]],
            "problem-1-piece-1": [[2, 0, 0], [2, 1, 0], [2, 2, 0], [1, 1, 0]],
        })
    })
})