import {test, expect, describe} from "vitest"

import {Puzzle} from "~/lib/Puzzle.ts"
import {Piece} from "~/lib/Piece.ts"
import {Voxel} from "~/lib/Grid.ts"
import {CubicGrid} from "~/lib/grids/CubicGrid.ts"
import {SquareGrid} from "~/lib/grids/SquareGrid.ts"
import {AssemblyProblem} from "~/lib/Problem"
import {AssemblySolution} from "~/lib/Solution.ts"

import {AssemblySolver} from "./Solver.ts"

type SolutionShorthand = {[pieceId: string]: Voxel[] | Set<Voxel>}

function solutionToShorthand(solution: AssemblySolution): SolutionShorthand {
    const shorthand: SolutionShorthand = {}
    for(const placement of solution.placements) {
        const pieceId = placement.completeId
        if(pieceId === null) {
            throw new Error("Piece should have an ID")
        }
        if(pieceId in shorthand) {
            throw new Error(`Duplicate piece ID ${pieceId}`)
        }
        shorthand[pieceId] = new Set(placement.voxels)
    }
    return shorthand
}

function assertSolutionsEqual(solutions: AssemblySolution[], expected: SolutionShorthand[]) {
    const actual = solutions.map(solutionToShorthand)

    // Make sure expected solution shorthands all use sets and not lists for
    // a piece's voxels.
    for(const solution of expected) {
        for(const pieceId of Object.keys(solution)) {
            solution[pieceId] = new Set(solution[pieceId])
        }
    }

    expect(new Set(actual)).toEqual(new Set(expected))
}

describe("AssemblySolver", () => {
    const puzzle = new Puzzle(new CubicGrid())

    const empty1 = puzzle.addPiece(new Piece(0))
    empty1.label = "empty1"

    const empty2 = puzzle.addPiece(new Piece(1))
    empty2.label = "empty2"

    const large = puzzle.addPiece(new Piece(
        2,
        ["0,0,0", "1,0,0", "2,0,0", "3,0,0", "4,0,0"]
    ))
    large.label = "large"

    // Problem 0
    // 001
    // 0-1
    const problem0_goal = puzzle.addPiece(new Piece(
        3,
        ["0,0,0", "0,1,0", "1,1,0", "2,1,0", "2,0,0"]
    ))
    const problem0_piece0 = puzzle.addPiece(new Piece(
        4,
        ["0,0,0", "1,0,0", "1,1,0"]
    ))
    const problem0_piece1 = puzzle.addPiece(new Piece(
        5,
        ["0,0,0", "0,1,0"]
    ))
    const problem0 = new AssemblyProblem(0)
    problem0.goalPieceId = problem0_goal.id
    problem0.usedPieceCounts[problem0_piece0.id] = 1
    problem0.usedPieceCounts[problem0_piece1.id] = 1

    // Problem 1
    // 000
    // 010
    // 111
    const problem1_goal = puzzle.addPiece(new Piece(
        6,
        [
            "0,2,0", "1,2,0", "2,2,0",
            "0,1,0", "1,1,0", "2,1,0",
            "0,0,0", "1,0,0", "2,0,0",
        ]
    ))
    const problem1_piece0 = puzzle.addPiece(new Piece(
        7,
        ["0,0,0", "0,1,0", "1,1,0", "2,1,0", "2,0,0"]
    ))
    const problem1_piece1 = puzzle.addPiece(new Piece(
        8,
        ["0,0,0", "1,0,0", "2,0,0", "1,1,0"]
    ))
    const problem1 = new AssemblyProblem(1)
    problem1.goalPieceId = problem1_goal.id
    problem1.usedPieceCounts[problem1_piece0.id] = 1
    problem1.usedPieceCounts[problem1_piece1.id] = 1

    // Problem 2
    // 01100
    // 00110
    const problem2_goal = puzzle.addPiece(new Piece(
        9,
        [
            "0,1,0", "1,1,0", "2,1,0", "3,1,0", "4,1,0",
            "0,0,0", "1,0,0", "2,0,0", "3,0,0", "4,0,0",
        ]
    ))
    const problem2_piece0 = puzzle.addPiece(new Piece(
        10,
        ["0,1,0", "0,0,0", "1,0,0"]
    ))
    const problem2_piece1 = puzzle.addPiece(new Piece(
        11,
        ["0,1,0", "1,1,0", "1,0,0", "2,0,0"]
    ))
    const problem2 = new AssemblyProblem(2)
    problem2.goalPieceId = problem2_goal.id
    problem2.usedPieceCounts[problem2_piece0.id] = 2
    problem2.usedPieceCounts[problem2_piece1.id] = 1

    const solver = new AssemblySolver(false, false)

    test("solve problem 0", () => {
        solver.removeSymmetries = false
        const solutions = solver.solve(puzzle, problem0)
        assertSolutionsEqual(solutions, [
            {
                4: ["1,1,0", "2,1,0", "2,0,0"],
                5: ["0,0,0", "0,1,0"],
            }, {
                4: ["1,1,0", "0,1,0", "0,0,0"],
                5: ["2,0,0", "2,1,0"],
            }
        ])
    })

    test("solve problem 0 with removed symmetries", () => {
        solver.removeSymmetries = true
        const solutions = solver.solve(puzzle, problem0)
        assertSolutionsEqual(solutions, [{
            4: ["1,1,0", "2,1,0", "2,0,0"],
            5: ["0,0,0", "0,1,0"],
        }])
    })

    test("solve problem 1", () => {
        solver.removeSymmetries = false
        const solutions = solver.solve(puzzle, problem1)
        assertSolutionsEqual(solutions, [
            {
                7: ["0,1,0", "0,2,0", "1,2,0", "2,2,0", "2,1,0"],
                8: ["0,0,0", "1,0,0", "2,0,0", "1,1,0"],
            }, {
                7: ["0,1,0", "0,0,0", "1,0,0", "2,0,0", "2,1,0"],
                8: ["0,2,0", "1,2,0", "2,2,0", "1,1,0"],
            }, {
                7: ["1,2,0", "2,2,0", "2,1,0", "2,0,0", "1,0,0"],
                8: ["0,2,0", "0,1,0", "0,0,0", "1,1,0"],
            }, {
                7: ["1,0,0", "0,0,0", "0,1,0", "0,2,0", "1,2,0"],
                8: ["2,0,0", "2,1,0", "2,2,0", "1,1,0"],
            }
        ])
    })

    test("solve problem 1 with removed symmetries", () => {
        solver.removeSymmetries = true
        const solutions = solver.solve(puzzle, problem1)
        assertSolutionsEqual(solutions, [{
            7: ["0,1,0", "0,2,0", "1,2,0", "2,2,0", "2,1,0"],
            8: ["0,0,0", "1,0,0", "2,0,0", "1,1,0"],
        }])
    })

    test("solve problem 2", () => {
        solver.removeSymmetries = false
        const solutions = solver.solve(puzzle, problem2)
        assertSolutionsEqual(solutions, [
            {
                "10-0": ["0,1,0", "0,0,0", "1,0,0"],
                "10-1": ["4,0,0", "4,1,0", "3,1,0"],
                "11": ["1,1,0", "2,1,0", "2,0,0", "3,0,0"],
            }, {
                "10-0": ["0,0,0", "0,1,0", "1,1,0"],
                "10-1": ["4,1,0", "4,0,0", "3,0,0"],
                "11": ["1,0,0", "2,0,0", "2,1,0", "3,1,0"],
            }
        ])
    })

    test("solve problem 2 with removed symmetries", () => {
        solver.removeSymmetries = true
        const solutions = solver.solve(puzzle, problem2)
        assertSolutionsEqual(solutions, [{
            "10-0": ["0,1,0", "0,0,0", "1,0,0"],
            "10-1": ["4,0,0", "4,1,0", "3,1,0"],
            "11": ["1,1,0", "2,1,0", "2,0,0", "3,0,0"],
        }])
    })

    test("voxel count sanity-check", () => {
        let problem = problem0.copy()
        problem.usedPieceCounts[problem0_piece0.id] = 2
        expect(() => {
            solver.solve(puzzle, problem)
        }).toThrowErrorMatchingInlineSnapshot(`
          [Error: Number of voxels in pieces don't add up to the voxels in the goal piece.

          Voxels in goal: 5
          Voxels in pieces: 8]
        `)

        problem = problem0.copy()
        problem.usedPieceCounts[problem0_piece0.id] = 0
        expect(() => {
            solver.solve(puzzle, problem)
        }).toThrowErrorMatchingInlineSnapshot(`
          [Error: Number of voxels in pieces don't add up to the voxels in the goal piece.

          Voxels in goal: 5
          Voxels in pieces: 2]
        `)
    })

    test("pieces can be placed in goal", () => {
        const problem = new AssemblyProblem(1)
        problem.goalPieceId = problem0_goal.id
        problem.usedPieceCounts[large.id] = 1
        expect(() => {
            solver.solve(puzzle, problem)
        }).toThrowErrorMatchingInlineSnapshot(`
          [Error: No solutions because piece cannot be placed anywhere in goal.

          Piece label: large]
        `)
    })

    test("don't error with no placements if piece min=0", () => {
        const problem = new AssemblyProblem(1)
        problem.goalPieceId = problem0_goal.id
        problem.usedPieceCounts[large.id] = {min: 0, max: 1}
        expect(solver.solve(puzzle, problem)).toEqual([])
    })


    test("not enough placements in goal", () => {
        const puzzle = new Puzzle(new CubicGrid())
        const goalPiece = puzzle.addPiece(new Piece(0, [
            "0,1,0",
            "0,0,0", "1,0,0", "2,0,0", "3,0,0", "4,0,0"
        ]))
        const lPiece = puzzle.addPiece(new Piece(1, [
            "0,1,0",
            "0,0,0", "1,0,0"
        ]))
        lPiece.label = "L"

        const problem = new AssemblyProblem(1)
        problem.goalPieceId = goalPiece.id
        problem.usedPieceCounts[lPiece.id] = 2
        expect(() => {
            solver.solve(puzzle, problem)
        }).toThrowErrorMatchingInlineSnapshot(`
          [Error: No solutions because piece cannot be placed its minimum count of 2 times in goal.

          Piece label: L]
        `)
    })

    test("no pieces", () => {
        const problem = new AssemblyProblem(1)
        problem.goalPieceId = empty1.id
        expect(() => {
            solver.solve(puzzle, problem)
        }).toThrowErrorMatchingInlineSnapshot(`[Error: No pieces in problem]`)
    })

    test("empty goal piece", () => {
        const problem = new AssemblyProblem(1)
        problem.goalPieceId = empty1.id
        problem.usedPieceCounts[empty2.id] = 1
        expect(() => {
            solver.solve(puzzle, problem)
        }).toThrowErrorMatchingInlineSnapshot(`[Error: Goal piece is empty]`)
    })
})

describe("AssemblySolver optional voxels", () => {

    test("voxel count sanity-check", () => {
        const puzzle = new Puzzle(new CubicGrid())
        const solver = new AssemblySolver(false, false)

        const goal = puzzle.addPiece(new Piece(
            100,
            [
                "0,1,0", "1,1,0",
                "0,0,0", "1,0,0",
            ]
        ))
        const piece1 = puzzle.addPiece(new Piece(
            101,
            ["0,1,0"]
        ))
        const problem = new AssemblyProblem(0)
        problem.goalPieceId = goal.id
        goal.setVoxelAttribute("optional", "1,1,0", true)

        problem.usedPieceCounts[piece1.id] = 2
        expect(() => {
            solver.solve(puzzle, problem)
        }).toThrowErrorMatchingInlineSnapshot(`
          [Error: Number of voxels in pieces don't add up to the voxels in the goal piece.

          Voxels in goal: 3-4
          Voxels in pieces: 2]
        `)

        problem.usedPieceCounts[piece1.id] = 3
        solver.solve(puzzle, problem)

        problem.usedPieceCounts[piece1.id] = 4
        solver.solve(puzzle, problem)

        problem.usedPieceCounts[piece1.id] = 5
        expect(() => {
            solver.solve(puzzle, problem)
        }).toThrowErrorMatchingInlineSnapshot(`
          [Error: Number of voxels in pieces don't add up to the voxels in the goal piece.

          Voxels in goal: 3-4
          Voxels in pieces: 5]
        `)
    })

    test("No optional voxels in pieces", () => {
        const puzzle = new Puzzle(new CubicGrid())
        const solver = new AssemblySolver(false, false)

        const goal = puzzle.addPiece(new Piece(
            100,
            [
                "0,1,0", "1,1,0",
                "0,0,0", "1,0,0",
            ]
        ))
        goal.setVoxelAttribute("optional", "1,1,0", true)

        const piece1 = puzzle.addPiece(new Piece(
            1,
            ["0,1,0"]
        ))
        piece1.label = "Piece 1"
        piece1.setVoxelAttribute("optional", "0,1,0", true)

        const problem = new AssemblyProblem(0)
        problem.goalPieceId = goal.id
        problem.usedPieceCounts[piece1.id] = 3
        expect(() => {
            solver.solve(puzzle, problem)
        }).toThrowErrorMatchingInlineSnapshot(`[Error: The piece "Piece 1" has optional voxels, but currently only the goal piece may contain optional voxels.]`)
    })

    test("Simple optional voxel problem", () => {
        const puzzle = new Puzzle(new CubicGrid())
        const solver = new AssemblySolver(false, false)

        const goal = puzzle.addPiece(new Piece(
            100,
            [
                "0,1,0", "1,1,0",
                "0,0,0", "1,0,0",
            ]
        ))
        goal.setVoxelAttribute("optional", "1,1,0", true)
        const piece1 = puzzle.addPiece(new Piece(
            101,
            [
                "0,1,0", "1,1,0",
                "0,0,0",
            ]
        ))
        const problem = new AssemblyProblem(0)
        problem.goalPieceId = goal.id
        problem.usedPieceCounts[piece1.id] = 1
        const solutions = solver.solve(puzzle, problem)
        assertSolutionsEqual(solutions, [{
            "101": ["0,0,0", "1,0,0", "0,1,0"],
        }])
    })

    test("Complex optional voxel problem", () => {
        const puzzle = new Puzzle(new CubicGrid())
        const solver = new AssemblySolver(false, false)

        const goal = puzzle.addPiece(new Piece(
            100,
            [
                "0,3,0", "1,3,0", "2,3,0", "3,3,0",
                "0,2,0", "1,2,0", "2,2,0", "3,2,0",
                "0,1,0", "1,1,0", "2,1,0", "3,1,0",
                "0,0,0", "1,0,0", "2,0,0", "3,0,0",
            ]
        ))

        const inner4Voxels = [
            "1,2,0", "2,2,0",
            "1,1,0", "2,1,0",
        ]
        const outer12Voxels = [
            "0,3,0", "1,3,0", "2,3,0", "3,3,0",
            "0,2,0",                   "3,2,0",
            "0,1,0",                   "3,1,0",
            "0,0,0", "1,0,0", "2,0,0", "3,0,0",
        ]
        for(const voxel of inner4Voxels) {
            goal.setVoxelAttribute("optional", voxel, true)
        }

        const piece1 = puzzle.addPiece(new Piece(
            101,
            [
                "0,1,0", "1,1,0", "2,1,0",
                "0,0,0", "1,0,0", "2,0,0",
            ]
        ))
        const piece2 = puzzle.addPiece(new Piece(
            102,
            [
                         "1,1,0",
                "0,0,0", "1,0,0", "2,0,0", "3,0,0",
            ]
        ))
        const piece3 = puzzle.addPiece(new Piece(
            103,
            [
                "0,1,0",
                "0,0,0", "1,0,0", "2,0,0",
            ]
        ))

        const problem = new AssemblyProblem(0)
        problem.goalPieceId = goal.id
        problem.usedPieceCounts[piece1.id] = 1
        problem.usedPieceCounts[piece2.id] = 1
        problem.usedPieceCounts[piece3.id] = 1

        let solutions = solver.solve(puzzle, problem)
        assertSolutionsEqual(solutions, [{
            "101": ["3,3,0", "3,2,0", "3,1,0", "2,3,0", "2,2,0", "2,1,0"],
            "102": ["1,1,0", "0,0,0", "1,0,0", "2,0,0", "3,0,0"],
            "103": ["1,3,0", "0,3,0", "0,2,0", "0,1,0"],
        }])

        for(const voxel of outer12Voxels) {
            goal.setVoxelAttribute("optional", voxel, true)
        }

        solutions = solver.solve(puzzle, problem)
        assertSolutionsEqual(solutions, [
            {
                "101": ["0,3,0", "1,3,0", "2,3,0", "0,2,0", "1,2,0", "2,2,0"],
                "102": ["1,1,0", "0,0,0", "1,0,0", "2,0,0", "3,0,0"],
                "103": ["2,1,0", "3,1,0", "3,2,0", "3,3,0"],
            }, {
                "101": ["3,3,0", "3,2,0", "3,1,0", "2,3,0", "2,2,0", "2,1,0"],
                "102": ["1,1,0", "0,0,0", "1,0,0", "2,0,0", "3,0,0"],
                "103": ["1,3,0", "0,3,0", "0,2,0", "0,1,0"],
            }
        ])
    })
})

describe("AssemblySolver piece ranges", () => {

    test("Simple problem", () => {
        const puzzle = new Puzzle(new SquareGrid())
        const goal = new Piece(0, ["0,0,0", "1,0,0", "2,0,0"])
        const piece1 = new Piece(1, ["0,0,0"])
        const piece2 = new Piece(2, ["0,0,0", "1,0,0"])
        puzzle.addPiece(goal)
        puzzle.addPiece(piece1)
        puzzle.addPiece(piece2)

        const problem = new AssemblyProblem(0)
        problem.goalPieceId = goal.id
        problem.usedPieceCounts[piece1.id] = {min: 0, max: 3}
        problem.usedPieceCounts[piece2.id] = {min: 0, max: 2}

        const solver = new AssemblySolver(false, false)
        assertSolutionsEqual(solver.solve(puzzle, problem), [
            {
                "1-0": ["0,0,0"],
                "1-1": ["1,0,0"],
                "1-2": ["2,0,0"],
            },
            {
                "1-0": ["0,0,0"],
                "2-0": ["1,0,0", "2,0,0"],
            },
        ])
    })

})

describe("AssemblySolver piece groups", () => {

    test("Simple problem", () => {
        const puzzle = new Puzzle(new CubicGrid())
        const solver = new AssemblySolver(false, false)

        const goal = puzzle.addPiece(new Piece(
            100,
            [
                "0,0,0", "1,0,0", "2,0,0",
            ]
        ))
        for(const voxel of goal.voxels) {
            goal.setVoxelAttribute("optional", voxel, true)
        }

        const piece1 = puzzle.addPiece(new Piece(
            101,
            [
                "0,0,0",
            ]
        ))
        const piece2 = puzzle.addPiece(new Piece(
            102,
            [
                "0,0,0", "1,0,0",
            ]
        ))

        const problem = new AssemblyProblem(0)
        problem.goalPieceId = goal.id
        problem.usedPieceCounts[piece1.id] = {min: 0, max: 3}
        problem.usedPieceCounts[piece2.id] = {min: 0, max: 3}
        problem.constraints = [
            {
                type: "piece-group",
                pieceIds: [piece1.id, piece2.id],
                count: 1
            },
        ]
        const solutions = solver.solve(puzzle, problem)
        assertSolutionsEqual(solutions, [
            {"101-0": ["0,0,0"]},
            {"102-0": ["0,0,0", "1,0,0"]},
        ])
    })

})