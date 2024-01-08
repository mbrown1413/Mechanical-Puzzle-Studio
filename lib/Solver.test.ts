import {test, expect, describe} from "vitest"
import {AssemblySolver} from "./Solver.ts"
import {Piece, Puzzle} from "./Puzzle.ts"
import {CubicGrid} from "./grids/CubicGrid.ts"
import {AssemblyProblem} from "./Problem"
import {AssemblySolution} from "./Solution.ts"
import {Coordinate} from "./types.ts"

type SolutionShorthand = {[pieceId: string]: Coordinate[]}
function assertSolutionEqual(solution: AssemblySolution, expected: SolutionShorthand) {
    const actual: SolutionShorthand = {}
    for(const [pieceId, placement] of solution.placements.entries()) {
        actual[pieceId] = placement.transformedPiece.coordinates
    }
    expect(actual).toMatchObject(expected)
}

describe("AssemblySolver", () => {
    const puzzle = new Puzzle("puzzle-0", new CubicGrid())
    puzzle.addPiece(new Piece(
        "goal-0",
        puzzle.grid.getDefaultPieceBounds(),
        [[0, 0, 0], [0, 1, 0], [1, 1, 0], [2, 1, 0], [2, 0, 0]]
    ))
    puzzle.addPiece(new Piece(
        "piece-0",
        puzzle.grid.getDefaultPieceBounds(),
        [[0, 0, 0], [1, 0, 0], [1, 1, 0]]
    ))
    puzzle.addPiece(new Piece(
        "piece-1",
        puzzle.grid.getDefaultPieceBounds(),
        [[0, 0, 0], [0, 1, 0]]
    ))

    const problem = new AssemblyProblem("problem-0")
    problem.goalPieceId = "goal-0"
    problem.usedPieceCounts.set("piece-0", 1)
    problem.usedPieceCounts.set("piece-1", 1)

    const solver = new AssemblySolver()

    test("cover problem formulation", () => {
        const {rows} = solver.getCoverProblem(puzzle, problem)
        expect(rows).toMatchObject([
            [true, false, false, false, true, true, true],
            [true, false, true, true, true, false, false],
            [false, true, true, true, false, false, false],
            [false, true, false, false, false, true, true],
            [false, true, false, true, true, false, false],
            [false, true, false, false, true, true, false],
        ])
    })
    
    test("solve", () => {
        const solutions = solver.solve(puzzle, problem)
        expect(solutions.length).toEqual(2)
        assertSolutionEqual(solutions[0], {
            "piece-0": [[1, 1, 0], [2, 1, 0], [2, 0, 0]],
            "piece-1": [[0, 0, 0], [0, 1, 0]],
        })
        assertSolutionEqual(solutions[1], {
            "piece-0": [[1, 1, 0], [0, 1, 0], [0, 0, 0]],
            "piece-1": [[2, 0, 0], [2, 1, 0]],
        })
    })
})