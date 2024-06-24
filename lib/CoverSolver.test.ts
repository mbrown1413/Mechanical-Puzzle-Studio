import {test, expect, describe} from "vitest"

import {CoverSolver, CoverSolution} from "./CoverSolver.ts"

describe("CoverSolver", () => {

    test("toString", () => {
        const solver = new CoverSolver(["A", "B", {}], 1)
        expect(solver.toString()).toMatchInlineSnapshot(`
          "A B 2?
          - - --"
        `)

        solver.addRow([false, true, false])
        expect(solver.toString()).toMatchInlineSnapshot(`
          "A B 2?
          - - --
          . 1 ."
        `)

        solver.addRow([true, false, true])
        expect(solver.toString()).toMatchInlineSnapshot(`
          "A B 2?
          - - --
          1 . 1
          . 1 ."
        `)

        solver.setColumnOptional(0)
        expect(solver.toString()).toMatchInlineSnapshot(`
          "A? B 2?
          -- - --
          1  . 1
          .  1 ."
        `)
    })

    test("Simple problems", () => {
        let solver = new CoverSolver(["X", "Y", "Z"])
        solver.addRow([1, 0, 0])
        solver.addRow([0, 1, 0])
        solver.addRow([1, 0, 1])
        expect(solve(solver)).toEqual([
            [["X", "Z"], ["Y"]],
        ])

        solver = new CoverSolver(["X", "Y", "Z"])
        solver.addRow([1, 1, 0])
        solver.addRow([0, 1, 1])
        solver.addRow([0, 0, 1])
        expect(solve(solver)).toEqual([
            [["X", "Y"], ["Z"]],
        ])

        solver = new CoverSolver(["X", "Y", "Z"])
        solver.addRow([1, 1, 1])
        solver.addRow([1, 0, 0])
        solver.addRow([0, 1, 0])
        solver.addRow([0, 0, 1])
        expect(solve(solver)).toEqual([
            [["X"], ["Y"], ["Z"]],
            [["X", "Y", "Z"]],
        ])
    })

    test("Edge cases", () => {
        const solver = new CoverSolver(["X", "Y", "Z"])
        expect(solve(solver)).toEqual([])

        solver.addRow([0, 0, 0])
        expect(solve(solver)).toEqual([])

        solver.addRow([1, 1, 1])
        expect(solve(solver)).toEqual([
            [["X", "Y", "Z"]],
        ])
    })

    /* Test Donald Knuth's exact cover problem from page 2 of the paper
     * "Dancing Links". */
    test("Knuth paper's example", () => {
        const solver = new CoverSolver(["A", "B", "C", "D", "E", "F", "G"])
        solver.addRow([0, 0, 1, 0, 1, 1, 0])
        solver.addRow([1, 0, 0, 1, 0, 0, 1])
        solver.addRow([0, 1, 1, 0, 0, 1, 0])
        solver.addRow([1, 0, 0, 1, 0, 0, 0])
        solver.addRow([0, 1, 0, 0, 0, 0, 1])
        solver.addRow([0, 0, 0, 1, 1, 0, 1])

        expect(solver.toString()).toMatchInlineSnapshot(`
          "A B C D E F G
          - - - - - - -
          1 . . 1 . . 1
          1 . . 1 . . .
          . 1 1 . . 1 .
          . 1 . . . . 1
          . . 1 . 1 1 .
          . . . 1 1 . 1"
        `)

        expect(solve(solver)).toEqual([
            [["A", "D"], ["B", "G"], ["C", "E", "F"]],
        ])
    })

    test("Optional columns", () => {
        let solver = new CoverSolver(["X", "Y", "Z"], 1)
        solver.addRow([1, 1, 0])
        expect(solve(solver)).toEqual([
            [["X", "Y"]],
        ])

        solver.addRow([0, 0, 1])
        expect(solve(solver)).toEqual([
            [["X", "Y"]],
        ])

        solver = new CoverSolver(["X", "Y", "Z"], 1)
        solver.addRow([1, 0, 1])
        solver.addRow([0, 1, 1])
        expect(solve(solver)).toEqual([])

        solver = new CoverSolver(["X", "Y", "Z", "Optional1", "Optional2"], 2)
        solver.addRow([1, 0, 0, 1, 0])
        solver.addRow([0, 1, 1, 1, 0])
        solver.addRow([1, 0, 0, 0, 1])
        expect(solve(solver)).toEqual([
            [["X", "Optional2"], ["Y", "Z", "Optional1"]],
        ])

        solver = new CoverSolver(["X", "Y", "Z"])
        solver.addRow([1, 0, 1])
        expect(solve(solver)).toEqual([])
        solver.setColumnOptional(1)
        expect(solve(solver)).toEqual([
            [["X", "Z"]],
        ])
    })

    test("Column min/max", () => {
        let solver = new CoverSolver(["X", "Y", "Z"])
        solver.setColumnRange(2, 0, 2)
        solver.addRow([1, 0, 1])
        solver.addRow([0, 1, 1])
        expect(solve(solver)).toEqual([
            [["X", "Z"], ["Y", "Z"]],
        ])

        // Equivalent to the 1-D assembly problem:
        //
        // Goal: 3 units wide, with voxels labeled "X", "Y", "Z"
        // Piece A: 1 unit wide
        // Piece B: 2 units wide
        solver = new CoverSolver(["X", "Y", "Z", "A", "B"])
        solver.addRow([1, 0, 0, 1, 0])
        solver.addRow([0, 1, 0, 1, 0])
        solver.addRow([0, 0, 1, 1, 0])
        solver.addRow([1, 1, 0, 0, 1])
        solver.addRow([0, 1, 1, 0, 1])
        expect(solve(solver)).toEqual([
            [["X", "Y", "B"], ["Z", "A"]],
            [["X", "A"], ["Y", "Z", "B"]],
        ])

        solver.setColumnRange(3, 1, 3)
        solver.setColumnRange(4, 0, 1)
        expect(solve(solver)).toEqual([
            [["X", "Y", "B"], ["Z", "A"]],
            [["X", "A"], ["Y", "Z", "B"]],
            [["X", "A"], ["Y", "A"], ["Z", "A"]],
        ])

        // Equivalent to the 1-D assembly problem:
        //
        // Goal: 4 units wide, with voxels labeled "W", "X", "Y", "Z"
        // Piece A: 1 unit wide
        // Piece B: 2 units wide
        solver = new CoverSolver(["W", "X", "Y", "Z", "A", "B"])
        solver.addRow([1, 0, 0, 0, 1, 0])
        solver.addRow([0, 1, 0, 0, 1, 0])
        solver.addRow([0, 0, 1, 0, 1, 0])
        solver.addRow([0, 0, 0, 1, 1, 0])
        solver.addRow([1, 1, 0, 0, 0, 1])
        solver.addRow([0, 1, 1, 0, 0, 1])
        solver.addRow([0, 0, 1, 1, 0, 1])

        solver.setColumnRange(4, 2, 2)
        expect(solve(solver)).toEqual([
            [["W", "X", "B"], ["Y", "A"], ["Z", "A"]],
            [["W", "A"], ["X", "Y", "B"], ["Z", "A"]],
            [["W", "A"], ["X", "A"], ["Y", "Z", "B"]],
        ])

        solver.setColumnRange(4, 0, 4)
        solver.setColumnRange(5, 0, 1)
        expect(solve(solver)).toEqual([
            [["W", "X", "B"], ["Y", "A"], ["Z", "A"]],
            [["W", "A"], ["X", "Y", "B"], ["Z", "A"]],
            [["W", "A"], ["X", "A"], ["Y", "Z", "B"]],
            [["W", "A"], ["X", "A"], ["Y", "A"], ["Z", "A"]],
        ])

        solver.setColumnRange(4, 0, 4)
        solver.setColumnRange(5, 0, 2)
        expect(solve(solver)).toEqual([
            [["W", "X", "B"], ["Y", "Z", "B"]],
            [["W", "X", "B"], ["Y", "A"], ["Z", "A"]],
            [["W", "A"], ["X", "Y", "B"], ["Z", "A"]],
            [["W", "A"], ["X", "A"], ["Y", "Z", "B"]],
            [["W", "A"], ["X", "A"], ["Y", "A"], ["Z", "A"]],
        ])

        solver.setColumnRange(4, 0, 4)
        solver.setColumnRange(5, 1, 2)
        expect(solve(solver)).toEqual([
            [["W", "X", "B"], ["Y", "Z", "B"]],
            [["W", "X", "B"], ["Y", "A"], ["Z", "A"]],
            [["W", "A"], ["X", "Y", "B"], ["Z", "A"]],
            [["W", "A"], ["X", "A"], ["Y", "Z", "B"]],
        ])
    })

    test("No duplicate solutions", () => {
        // 2-2 with 2 col
        // The condition in which duplicates can occur is when when a max > 1
        // column is chosen twice.
        const solver = new CoverSolver(["X", "Y"])
        solver.addRow([1, 0])
        solver.addRow([0, 1])
        solver.addRow([0, 1])
        solver.setColumnRange(1, 2, 2)
        expect(solve(solver)).toEqual([
            [["X"], ["Y"], ["Y"]],
        ])
    })

    test("n-queens problem", () => {
        let solver = getNQueensCoverProblem(1)
        expect(solver.toString()).toMatchInlineSnapshot(`
          "File 0 Rank 0
          ------ ------
            1      1"
        `)
        expect(solve(solver)).toEqual([
            [["File 0", "Rank 0"]],
        ])

        solver = getNQueensCoverProblem(2)
        expect(solver.toString()).toMatchInlineSnapshot(`
          "File 0 File 1 Rank 0 Rank 1 Diagonal A 0? Diagonal B 0?
          ------ ------ ------ ------ ------------- -------------
            1      .      1      .          .             1
            1      .      .      1          1             .
            .      1      1      .          1             .
            .      1      .      1          .             1"
        `)
        expect(solver.solve()).toEqual([])

        solver = getNQueensCoverProblem(3)
        expect(solver.solve()).toEqual([])

        solver = getNQueensCoverProblem(4)
        expect(solve(solver)).toEqual([
            [
                ["File 0", "Rank 1", "Diagonal A 0", "Diagonal B 1"],
                ["File 1", "Rank 3", "Diagonal B 0", "Diagonal A 3"],
                ["File 2", "Rank 0", "Diagonal A 1", "Diagonal B 4"],
                ["File 3", "Rank 2", "Diagonal B 3", "Diagonal A 4"],
            ],
            [
                ["File 0", "Rank 2", "Diagonal B 0", "Diagonal A 1"],
                ["File 1", "Rank 0", "Diagonal A 0", "Diagonal B 3"],
                ["File 2", "Rank 3", "Diagonal B 1", "Diagonal A 4"],
                ["File 3", "Rank 1", "Diagonal A 3", "Diagonal B 4"],
            ],
        ])

        solver = getNQueensCoverProblem(5)
        expect(solver.solve().length).toEqual(10)
    })

    /*
    test("Performance Test", () => {
        console.time("nqueens-13 x 3")
        for(let i=0; i<3; i++) {
            const solver = getNQueensCoverProblem(13)
            expect(solver.solve().length).toEqual(73712)
        }
        console.timeEnd("nqueens-13 x 3")
    })
    */

})

function getNQueensCoverProblem(n: number) {
    // Here we're using "field" instead of "column" for the cover problem
    // columns so it's not confused with columns of the chess board.
    // Likewise, we'll try to use rank and file instead of row/col to avoid
    // confusion.
    const fieldIndexes: Record<string, number> = {}
    function newField(name: string) {
        fieldIndexes[name] = Object.keys(fieldIndexes).length
        return fieldIndexes[name]
    }

    for(let i=0; i<n; i++) {
        newField(`File ${i}`)
    }
    for(let i=0; i<n; i++) {
        newField(`Rank ${i}`)
    }
    for(let i=0; i<2*n-3; i++) {
        // There are two directions of diagonal. One type has diagonals
        // consisting of a line from lower left to upper right (A, in the sahpe
        // of '/'), the other type consists of a line from upper left to lower
        // right (B, in the sahpe of '\'). Both types are indexed from 0
        // starting at the origin, but excluding trivial diagonals consisting
        // of one square. The origin is arbitrarily positioned in the upper
        // left.
        newField(`Diagonal A ${i}`)
        newField(`Diagonal B ${i}`)
    }
    const nFields = Object.keys(fieldIndexes).length

    const solver = new CoverSolver(
        Object.keys(fieldIndexes),
        n === 1 ? 0 : 4*n - 6 // Number of non-trivial diagonals
    )

    for(let y=0; y<n; y++) {
        for(let x=0; x<n; x++) {
            const row = new Array(nFields).fill(0)
            row[fieldIndexes[`File ${x}`]] = 1
            row[fieldIndexes[`Rank ${y}`]] = 1
            const diagonal1 = x + y - 1
            const diagonal2 = x + (n-1 - y) - 1
            if(diagonal1 >= 0) {
                row[fieldIndexes[`Diagonal A ${diagonal1}`]] = 1
            }
            if(diagonal2 >= 0) {
                row[fieldIndexes[`Diagonal B ${diagonal2}`]] = 1
            }
            solver.addRow(row)
        }
    }

    return solver
}

/**
 * Runs solver and normalizes result order.
 */
function solve<Data>(solver: CoverSolver<Data>): CoverSolution<Data>[] {
    const solutions = solver.solve()

    const compareData = (data1: Data, data2: Data) => {
        const index1 = solver.columnData.indexOf(data1)
        const index2 = solver.columnData.indexOf(data2)
        return index1 - index2
    }

    const compareRows = (row1: Data[], row2: Data[]) => {
        for(let i=0; i<Math.min(row1.length, row2.length); i++) {
            const cmp = compareData(row1[i], row2[i])
            if(cmp !== 0) {
                return cmp
            }
        }
        return row1.length - row2.length
    }

    for(const solution of solutions) {

        // Sort data order within each solution row
        for(const row of solution) {
            row.sort(compareData)
        }

        // Sort row order within each solution
        solution.sort(compareRows)
    }

    // Sort solution order
    solutions.sort((solution1, solution2) => {
        for(let i=0; i<Math.min(solution1.length, solution2.length); i++) {
            const row1 = solution1[i]
            const row2 = solution2[i]
            const cmp = compareRows(row1, row2)
            if(cmp !== 0) {
                return cmp
            }
        }
        return solution1.length - solution2.length
    })

    return solutions
}