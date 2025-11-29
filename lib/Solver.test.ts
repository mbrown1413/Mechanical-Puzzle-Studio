import {test, expect, describe} from "vitest"

import {Puzzle} from "~/lib/Puzzle.ts"
import {Shape} from "~/lib/Shape.ts"
import {Voxel} from "~/lib/Grid.ts"
import {CubicGrid} from "~/lib/grids/CubicGrid.ts"
import {SquareGrid} from "~/lib/grids/SquareGrid.ts"
import {AssemblyProblem} from "~/lib/Problem"
import {AssemblySolution} from "~/lib/Solution.ts"

import {AssemblySolver} from "./Solver.ts"

type SolutionShorthand = {[shapeId: string]: Voxel[] | Set<Voxel>}

function solutionToShorthand(solution: AssemblySolution): SolutionShorthand {
    const shorthand: SolutionShorthand = {}
    for(const placement of solution.placements) {
        const shapeId = placement.completeId
        if(shapeId === null) {
            throw new Error("Shape should have an ID")
        }
        if(shapeId in shorthand) {
            throw new Error(`Duplicate shape ID ${shapeId}`)
        }
        shorthand[shapeId] = new Set(placement.voxels)
    }
    return shorthand
}

function assertSolutionsEqual(solutions: AssemblySolution[], expected: SolutionShorthand[]) {
    const actual = solutions.map(solutionToShorthand)

    // Make sure expected solution shorthands all use sets and not lists for
    // a shape's voxels.
    for(const solution of expected) {
        for(const shapeId of Object.keys(solution)) {
            solution[shapeId] = new Set(solution[shapeId])
        }
    }

    expect(new Set(actual)).toEqual(new Set(expected))
}

describe("AssemblySolver", () => {
    const puzzle = new Puzzle(new CubicGrid())

    const empty1 = puzzle.addShape(new Shape(0))
    empty1.label = "empty1"

    const empty2 = puzzle.addShape(new Shape(1))
    empty2.label = "empty2"

    const large = puzzle.addShape(new Shape(
        2,
        ["0,0,0", "1,0,0", "2,0,0", "3,0,0", "4,0,0"]
    ))
    large.label = "large"

    // Problem 0
    // 001
    // 0-1
    const problem0_goal = puzzle.addShape(new Shape(
        3,
        ["0,0,0", "0,1,0", "1,1,0", "2,1,0", "2,0,0"]
    ))
    const problem0_shape0 = puzzle.addShape(new Shape(
        4,
        ["0,0,0", "1,0,0", "1,1,0"]
    ))
    const problem0_shape1 = puzzle.addShape(new Shape(
        5,
        ["0,0,0", "0,1,0"]
    ))
    const problem0 = new AssemblyProblem(0)
    problem0.goalShapeId = problem0_goal.id
    problem0.shapeCounts[problem0_shape0.id] = 1
    problem0.shapeCounts[problem0_shape1.id] = 1

    // Problem 1
    // 000
    // 010
    // 111
    const problem1_goal = puzzle.addShape(new Shape(
        6,
        [
            "0,2,0", "1,2,0", "2,2,0",
            "0,1,0", "1,1,0", "2,1,0",
            "0,0,0", "1,0,0", "2,0,0",
        ]
    ))
    const problem1_shape0 = puzzle.addShape(new Shape(
        7,
        ["0,0,0", "0,1,0", "1,1,0", "2,1,0", "2,0,0"]
    ))
    const problem1_shape1 = puzzle.addShape(new Shape(
        8,
        ["0,0,0", "1,0,0", "2,0,0", "1,1,0"]
    ))
    const problem1 = new AssemblyProblem(1)
    problem1.goalShapeId = problem1_goal.id
    problem1.shapeCounts[problem1_shape0.id] = 1
    problem1.shapeCounts[problem1_shape1.id] = 1

    // Problem 2
    // 01100
    // 00110
    const problem2_goal = puzzle.addShape(new Shape(
        9,
        [
            "0,1,0", "1,1,0", "2,1,0", "3,1,0", "4,1,0",
            "0,0,0", "1,0,0", "2,0,0", "3,0,0", "4,0,0",
        ]
    ))
    const problem2_shape0 = puzzle.addShape(new Shape(
        10,
        ["0,1,0", "0,0,0", "1,0,0"]
    ))
    const problem2_shape1 = puzzle.addShape(new Shape(
        11,
        ["0,1,0", "1,1,0", "1,0,0", "2,0,0"]
    ))
    const problem2 = new AssemblyProblem(2)
    problem2.goalShapeId = problem2_goal.id
    problem2.shapeCounts[problem2_shape0.id] = 2
    problem2.shapeCounts[problem2_shape1.id] = 1


    test("solve problem 0", () => {
        const solver = new AssemblySolver(null, false, false)
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
        const solver = new AssemblySolver("rotation", false, false)
        const solutions = solver.solve(puzzle, problem0)
        assertSolutionsEqual(solutions, [{
            4: ["1,1,0", "2,1,0", "2,0,0"],
            5: ["0,0,0", "0,1,0"],
        }])
    })

    test("solve problem 1", () => {
        const solver = new AssemblySolver(null, false, false)
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
        const solver = new AssemblySolver("rotation", false, false)
        const solutions = solver.solve(puzzle, problem1)
        assertSolutionsEqual(solutions, [{
            7: ["0,1,0", "0,2,0", "1,2,0", "2,2,0", "2,1,0"],
            8: ["0,0,0", "1,0,0", "2,0,0", "1,1,0"],
        }])
    })

    test("solve problem 2", () => {
        const solver = new AssemblySolver(null, false, false)
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
        const solver = new AssemblySolver("rotation", false, false)
        const solutions = solver.solve(puzzle, problem2)
        assertSolutionsEqual(solutions, [{
            "10-0": ["0,1,0", "0,0,0", "1,0,0"],
            "10-1": ["4,0,0", "4,1,0", "3,1,0"],
            "11": ["1,1,0", "2,1,0", "2,0,0", "3,0,0"],
        }])
    })

    test("voxel count sanity-check", () => {
        const solver = new AssemblySolver("rotation", false, false)
        let problem = problem0.copy()
        problem.shapeCounts[problem0_shape0.id] = 2
        expect(() => {
            solver.solve(puzzle, problem)
        }).toThrowErrorMatchingInlineSnapshot(`
          [Error: Number of voxels in pieces don't add up to the voxels in the goal shape.

          Voxels in goal: 5
          Voxels in pieces: 8]
        `)

        problem = problem0.copy()
        problem.shapeCounts[problem0_shape0.id] = 0
        expect(() => {
            solver.solve(puzzle, problem)
        }).toThrowErrorMatchingInlineSnapshot(`
          [Error: Number of voxels in pieces don't add up to the voxels in the goal shape.

          Voxels in goal: 5
          Voxels in pieces: 2]
        `)
    })

    test("pieces can be placed in goal", () => {
        const solver = new AssemblySolver("rotation", false, false)
        const problem = new AssemblyProblem(1)
        problem.goalShapeId = problem0_goal.id
        problem.shapeCounts[large.id] = 1
        expect(() => {
            solver.solve(puzzle, problem)
        }).toThrowErrorMatchingInlineSnapshot(`
          [Error: No solutions because piece cannot be placed anywhere in goal.

          Shape label: large]
        `)
    })

    test("don't error with no placements if piece min=0", () => {
        const solver = new AssemblySolver("rotation", false, false)
        const problem = new AssemblyProblem(1)
        problem.goalShapeId = problem0_goal.id
        problem.shapeCounts[large.id] = {min: 0, max: 1}
        expect(solver.solve(puzzle, problem)).toEqual([])
    })


    test("not enough placements in goal", () => {
        const solver = new AssemblySolver("rotation", false, false)
        const puzzle = new Puzzle(new CubicGrid())
        const goalPiece = puzzle.addShape(new Shape(0, [
            "0,1,0",
            "0,0,0", "1,0,0", "2,0,0", "3,0,0", "4,0,0"
        ]))
        const lPiece = puzzle.addShape(new Shape(1, [
            "0,1,0",
            "0,0,0", "1,0,0"
        ]))
        lPiece.label = "L"

        const problem = new AssemblyProblem(1)
        problem.goalShapeId = goalPiece.id
        problem.shapeCounts[lPiece.id] = 2
        expect(() => {
            solver.solve(puzzle, problem)
        }).toThrowErrorMatchingInlineSnapshot(`
          [Error: No solutions because piece cannot be placed its minimum count of 2 times in goal.

          Shape label: L]
        `)
    })

    test("no pieces", () => {
        const solver = new AssemblySolver("rotation", false, false)
        const problem = new AssemblyProblem(1)
        problem.goalShapeId = empty1.id
        expect(() => {
            solver.solve(puzzle, problem)
        }).toThrowErrorMatchingInlineSnapshot(`[Error: No pieces in problem]`)
    })

    test("empty piece", () => {
        const solver = new AssemblySolver("rotation", false, false)
        const problem = problem0.copy()
        problem.shapeCounts[empty2.id] = 1
        expect(() => {
            solver.solve(puzzle, problem)
        }).toThrowErrorMatchingInlineSnapshot(`[Error: Shape has no voxels: empty2]`)
    })

    test("empty goal piece", () => {
        const solver = new AssemblySolver("rotation", false, false)
        const problem = new AssemblyProblem(1)
        problem.goalShapeId = empty1.id
        problem.shapeCounts[empty2.id] = 1
        expect(() => {
            solver.solve(puzzle, problem)
        }).toThrowErrorMatchingInlineSnapshot(`[Error: Goal shape is empty]`)
    })
})

describe("AssemblySolver optional voxels", () => {

    test("voxel count sanity-check", () => {
        const puzzle = new Puzzle(new CubicGrid())
        const solver = new AssemblySolver("rotation", false, false)

        const goal = puzzle.addShape(new Shape(
            100,
            [
                "0,1,0", "1,1,0",
                "0,0,0", "1,0,0",
            ]
        ))
        const shape1 = puzzle.addShape(new Shape(
            101,
            ["0,1,0"]
        ))
        const problem = new AssemblyProblem(0)
        problem.goalShapeId = goal.id
        goal.setVoxelAttribute("optional", "1,1,0", true)

        problem.shapeCounts[shape1.id] = 2
        expect(() => {
            solver.solve(puzzle, problem)
        }).toThrowErrorMatchingInlineSnapshot(`
          [Error: Number of voxels in pieces don't add up to the voxels in the goal shape.

          Voxels in goal: 3-4
          Voxels in pieces: 2]
        `)

        problem.shapeCounts[shape1.id] = 3
        solver.solve(puzzle, problem)

        problem.shapeCounts[shape1.id] = 4
        solver.solve(puzzle, problem)

        problem.shapeCounts[shape1.id] = 5
        expect(() => {
            solver.solve(puzzle, problem)
        }).toThrowErrorMatchingInlineSnapshot(`
          [Error: Number of voxels in pieces don't add up to the voxels in the goal shape.

          Voxels in goal: 3-4
          Voxels in pieces: 5]
        `)
    })

    test("No optional voxels in pieces", () => {
        const puzzle = new Puzzle(new CubicGrid())
        const solver = new AssemblySolver("rotation", false, false)

        const goal = puzzle.addShape(new Shape(
            100,
            [
                "0,1,0", "1,1,0",
                "0,0,0", "1,0,0",
            ]
        ))
        goal.setVoxelAttribute("optional", "1,1,0", true)

        const shape1 = puzzle.addShape(new Shape(
            1,
            ["0,1,0"]
        ))
        shape1.label = "Shape 1"
        shape1.setVoxelAttribute("optional", "0,1,0", true)

        const problem = new AssemblyProblem(0)
        problem.goalShapeId = goal.id
        problem.shapeCounts[shape1.id] = 3
        expect(() => {
            solver.solve(puzzle, problem)
        }).toThrowErrorMatchingInlineSnapshot(`[Error: The shape "Shape 1" has optional voxels, but currently only the goal shape may contain optional voxels.]`)
    })

    test("Simple optional voxel problem", () => {
        const puzzle = new Puzzle(new CubicGrid())
        const solver = new AssemblySolver("rotation", false, false)

        const goal = puzzle.addShape(new Shape(
            100,
            [
                "0,1,0", "1,1,0",
                "0,0,0", "1,0,0",
            ]
        ))
        goal.setVoxelAttribute("optional", "1,1,0", true)
        const shape1 = puzzle.addShape(new Shape(
            101,
            [
                "0,1,0", "1,1,0",
                "0,0,0",
            ]
        ))
        const problem = new AssemblyProblem(0)
        problem.goalShapeId = goal.id
        problem.shapeCounts[shape1.id] = 1
        const solutions = solver.solve(puzzle, problem)
        assertSolutionsEqual(solutions, [{
            "101": ["0,0,0", "1,0,0", "0,1,0"],
        }])
    })

    test("Complex optional voxel problem", () => {
        const puzzle = new Puzzle(new CubicGrid())
        const solver = new AssemblySolver("rotation", false, false)

        const goal = puzzle.addShape(new Shape(
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

        const shape1 = puzzle.addShape(new Shape(
            101,
            [
                "0,1,0", "1,1,0", "2,1,0",
                "0,0,0", "1,0,0", "2,0,0",
            ]
        ))
        const shape2 = puzzle.addShape(new Shape(
            102,
            [
                         "1,1,0",
                "0,0,0", "1,0,0", "2,0,0", "3,0,0",
            ]
        ))
        const shape3 = puzzle.addShape(new Shape(
            103,
            [
                "0,1,0",
                "0,0,0", "1,0,0", "2,0,0",
            ]
        ))

        const problem = new AssemblyProblem(0)
        problem.goalShapeId = goal.id
        problem.shapeCounts[shape1.id] = 1
        problem.shapeCounts[shape2.id] = 1
        problem.shapeCounts[shape3.id] = 1

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
        const goal = new Shape(0, ["0,0,0", "1,0,0", "2,0,0"])
        const shape1 = new Shape(1, ["0,0,0"])
        const shape2 = new Shape(2, ["0,0,0", "1,0,0"])
        puzzle.addShape(goal)
        puzzle.addShape(shape1)
        puzzle.addShape(shape2)

        const problem = new AssemblyProblem(0)
        problem.goalShapeId = goal.id
        problem.shapeCounts[shape1.id] = {min: 0, max: 3}
        problem.shapeCounts[shape2.id] = {min: 0, max: 2}

        const solver = new AssemblySolver("rotation", false, false)
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
        const solver = new AssemblySolver("rotation", false, false)

        const goal = puzzle.addShape(new Shape(
            100,
            [
                "0,0,0", "1,0,0", "2,0,0",
            ]
        ))
        for(const voxel of goal.voxels) {
            goal.setVoxelAttribute("optional", voxel, true)
        }

        const shape1 = puzzle.addShape(new Shape(
            101,
            [
                "0,0,0",
            ]
        ))
        const shape2 = puzzle.addShape(new Shape(
            102,
            [
                "0,0,0", "1,0,0",
            ]
        ))

        const problem = new AssemblyProblem(0)
        problem.goalShapeId = goal.id
        problem.shapeCounts[shape1.id] = {min: 0, max: 3}
        problem.shapeCounts[shape2.id] = {min: 0, max: 3}
        problem.constraints = [
            {
                type: "piece-group",
                shapeIds: [shape1.id, shape2.id],
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