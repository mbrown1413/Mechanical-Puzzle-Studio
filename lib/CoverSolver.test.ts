import {test, expect, describe} from "vitest"

import {CoverSolver} from "./CoverSolver.ts"

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
    })

    test("Simple problems", () => {
        let solver = new CoverSolver(["X", "Y", "Z"])
        solver.addRow([1, 0, 0])
        solver.addRow([0, 1, 0])
        solver.addRow([1, 0, 1])
        expect(solver.solve()).toEqual([
            [["Y"], ["Z", "X"]],
        ])

        solver = new CoverSolver(["X", "Y", "Z"])
        solver.addRow([1, 1, 0])
        solver.addRow([0, 1, 1])
        solver.addRow([0, 0, 1])
        expect(solver.solve()).toEqual([
            [["X", "Y"], ["Z"]],
        ])

        solver = new CoverSolver(["X", "Y", "Z"])
        solver.addRow([1, 1, 1])
        solver.addRow([1, 0, 0])
        solver.addRow([0, 1, 0])
        solver.addRow([0, 0, 1])
        expect(solver.solve()).toEqual([
            [["X", "Y", "Z"]],
            [["X"], ["Y"], ["Z"]],
        ])
    })

    test("Edge cases", () => {
        const solver = new CoverSolver(["X", "Y", "Z"])
        expect(solver.solve()).toEqual([])

        solver.addRow([0, 0, 0])
        expect(solver.solve()).toEqual([])

        solver.addRow([1, 1, 1])
        expect(solver.solve()).toEqual([
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

        expect(solver.solve()).toEqual([
            [["A", "D"], ["E", "F", "C"], ["B", "G"]],
        ])
    })

    test("Optional columns", () => {
        let solver = new CoverSolver(["X", "Y", "Z"], 1)
        solver.addRow([1, 1, 0])
        expect(solver.solve()).toEqual([
            [["X", "Y"]],
        ])

        solver.addRow([0, 0, 1])
        expect(solver.solve()).toEqual([
            [["X", "Y"]],
        ])

        solver = new CoverSolver(["X", "Y", "Z"], 1)
        solver.addRow([1, 0, 1])
        solver.addRow([0, 1, 1])
        expect(solver.solve()).toEqual([])

        solver = new CoverSolver(["X", "Y", "Z", "Optional1", "Optional2"], 2)
        solver.addRow([1, 0, 0, 1, 0])
        solver.addRow([0, 1, 1, 1, 0])
        solver.addRow([1, 0, 0, 0, 1])
        expect(solver.solve()).toEqual([
            [["Y", "Z", "Optional1"], ["X", "Optional2"]],
        ])
    })

    test("n-queens problem", () => {
        let solver = getNQueensCoverProblem(1)
        expect(solver.toString()).toMatchInlineSnapshot(`
          "File 0 Rank 0
          ------ ------
          1      1"
        `)
        expect(solver.solve()).toEqual([
            [["File 0", "Rank 0"]],
        ])

        solver = getNQueensCoverProblem(2)
        expect(solver.toString()).toMatchInlineSnapshot(`
          "File 0 File 1 Rank 0 Rank 1 Diagonal A 0? Diagonal B 0?
          ------ ------ ------ ------ ------------- -------------
          1      .      1      .      .             1
          1      .      .      1      1             .
          .      1      1      .      1             .
          .      1      .      1      .             1"
        `)
        expect(solver.solve()).toEqual([])

        solver = getNQueensCoverProblem(3)
        expect(solver.solve()).toEqual([])

        solver = getNQueensCoverProblem(4)
        expect(solver.solve()).toEqual([
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