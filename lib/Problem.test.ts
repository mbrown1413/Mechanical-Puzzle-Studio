import {describe, test, expect} from "vitest"

import {AssemblyProblem} from "./Problem.ts"
import {serialize} from "~/lib/serialize.ts"
import {Puzzle} from "~/lib/Puzzle.ts"
import {Piece} from "~/lib/Piece.ts"
import {SquareGrid} from "~/lib/grids/SquareGrid.ts"

describe("AssemblyProblem", () => {

    test("countVoxels()", () => {
        const puzzle = new Puzzle(new SquareGrid())
        const problem = new AssemblyProblem(0)
        const piece0 = new Piece(0, ["0,0,0", "1,0,0"])
        const goal = new Piece(1, ["0,0,0", "1,0,0"])

        // No pieces or goal
        expect(problem.countVoxels(puzzle)).toEqual({
            goal: null,
            goalString: "-",
            pieces: {min: 0, max: 0},
            piecesString: "-",
            warning: "Goal piece is not set"
        })

        // Simple piece
        puzzle.addPiece(piece0)
        problem.usedPieceCounts[piece0.id] = 1
        expect(problem.countVoxels(puzzle)).toEqual({
            goal: null,
            goalString: "-",
            pieces: {min: 2, max: 2},
            piecesString: "2",
            warning: "Goal piece is not set"
        })

        // Simple goal
        puzzle.addPiece(goal)
        problem.goalPieceId = goal.id
        expect(problem.countVoxels(puzzle)).toEqual({
            goal: {min: 2, max: 2},
            goalString: "2",
            pieces: {min: 2, max: 2},
            piecesString: "2",
            warning: null
        })

        // Range of pieces
        problem.usedPieceCounts[piece0.id] = {min: 1, max: 2}
        expect(problem.countVoxels(puzzle)).toEqual({
            goal: {min: 2, max: 2},
            goalString: "2",
            pieces: {min: 2, max: 4},
            piecesString: "2-4",
            warning: null
        })

        // Increase range so the problem is invalid
        problem.usedPieceCounts[piece0.id] = {min: 2, max: 3}
        expect(problem.countVoxels(puzzle)).toEqual({
            goal: {min: 2, max: 2},
            goalString: "2",
            pieces: {min: 4, max: 6},
            piecesString: "4-6",
            warning: (
                "Number of voxels in pieces don't add up to the voxels in the goal piece.\n\n" +
                "Voxels in goal: 2\n" +
                "Voxels in pieces: 4-6"
            )
        })

        // Variable voxels in goal
        goal.voxels = ["0,0,0", "1,0,0", "2,2,2", "3,3,3"]
        goal.setVoxelAttribute("optional", "0,0,0", true)
        goal.setVoxelAttribute("optional", "1,0,0", true)
        expect(problem.countVoxels(puzzle)).toEqual({
            goal: {min: 2, max: 4},
            goalString: "2-4",
            pieces: {min: 4, max: 6},
            piecesString: "4-6",
            warning: null
        })
    })

    test("serialization", () => {
        const problem = new AssemblyProblem(0)

        // Empty problem
        expect(serialize(problem)).toEqual({
            "type": "AssemblyProblem",
            "id": 0,
            "disassemble": false,
            "label": "Problem 0",
            "removeNoDisassembly": true,
            "solverId": "assembly",
            "usedPieceCounts": {},
        })

        // Equal min/max in usedPieceCounts converts to a simple number
        problem.usedPieceCounts[0] = {min: 7, max: 7}
        expect(serialize(problem)).toEqual({
            "type": "AssemblyProblem",
            "id": 0,
            "disassemble": false,
            "label": "Problem 0",
            "removeNoDisassembly": true,
            "solverId": "assembly",
            "usedPieceCounts": {0: 7},
        })

        // Zero count pieces are removed
        problem.usedPieceCounts[0] = {min: 0, max: 0}
        problem.usedPieceCounts[1] = 0
        expect(serialize(problem)).toEqual({
            "type": "AssemblyProblem",
            "id": 0,
            "disassemble": false,
            "label": "Problem 0",
            "removeNoDisassembly": true,
            "solverId": "assembly",
            "usedPieceCounts": {},
        })
    })

})