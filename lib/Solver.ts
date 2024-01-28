import {AssemblyProblem, Problem} from "~/lib/Problem.ts"
import {Puzzle, PiecePlacement, Piece} from "~/lib/Puzzle.ts"
import {AssemblySolution, Solution} from "~/lib/Solution.ts"

export abstract class Solver {
    abstract solve(puzzle: Puzzle, problem: Problem): Solution[]
}

export class AssemblySolver extends Solver {
    solve(puzzle: Puzzle, problem: Problem): AssemblySolution[] {

        const {rows, rowPlacements} = this.getCoverProblem(puzzle, problem)
        const solutions = solveExactCoverNaive(rows)

        const ret = []
        for(const pickedRows of solutions) {
            ret.push(new AssemblySolution(
                pickedRows.map((rowIndex) => rowPlacements[rowIndex])
            ))
        }
        return ret
    }

    getCoverProblem(puzzle: Puzzle, problem: Problem) {
        if(!(problem instanceof AssemblyProblem)) {
            throw "Assembly Solver can only solve Assembly Problems"
        }
        if(problem.goalPieceId === null) {
            throw "Goal piece is not set"
        }
        const goal = puzzle.pieces.get(problem.goalPieceId)
        if(goal === undefined) {
            throw `Goal piece ID ${problem.goalPieceId} not found`
        }

        const pieces = []
        for(const [pieceId, count] of problem.usedPieceCounts.entries()) {
            const piece = puzzle.pieces.get(pieceId)
            if(!piece) {
                throw `Piece ID ${pieceId} not found`
            }
            for(let i=0; i<count; i++) {
                pieces.push(piece)
            }
        }

        const rowPlacements = []
        const rows: Boolean[][] = []
        for(const [i, piece] of pieces.entries()) {
            for(const placement of puzzle.getPiecePlacements(piece, goal.voxels)) {
                rowPlacements.push(placement)
                rows.push(this.getPlacementRow(pieces, i, placement, goal))
            }
        }

        return {rows, rowPlacements}
    }

    getPlacementRow(
        pieces: Piece[],
        pieceIdx: number,
        placement: PiecePlacement,
        goal: Piece,
    ): Boolean[] {
        const pieceColumns: Boolean[] = new Array(pieces.length).fill(false)
        pieceColumns[pieceIdx] = true

        const voxelColumns: Boolean[] = goal.voxels.map((voxel) =>
            placement.transformedPiece.voxels.includes(voxel)
        )

        return pieceColumns.concat(voxelColumns)
    }
}

function solveExactCoverNaive(matrix: Boolean[][]) {
    const matches: number[][] = []

    const nCols = matrix[0].length
    for(const row of matrix) {
        if(row.length !== nCols) {
            throw "Bad cover problem: Not all rows have the same length"
        }
    }

    function canPick(rowsPicked: number[], newPick: number): boolean {
        const newRow = matrix[newPick]
        for(const rowIndex of rowsPicked) {
            const row = matrix[rowIndex]
            for(let i=0; i<nCols; i++) {
                if(row[i] && newRow[i]) {
                    return false
                }
            }
        }
        return true
    }

    function coversExactly(rowIndexes: number[]): boolean {
        const colsCovered = []
        for(const rowIndex of rowIndexes) {
            const row = matrix[rowIndex]
            for(const [colIndex, value] of row.entries()) {
                if(value) {
                    colsCovered.push(colIndex)
                }
            }
        }

        for(let i=0; i<nCols; i++) {
            if(!colsCovered.includes(i)) {
                return false
            }
        }
        return true
    }

    function recurse(rowsPicked: number[]) {
        if(coversExactly(rowsPicked)) {
            matches.push(Array.from(rowsPicked))
        }

        const next = rowsPicked.length === 0 ? 0 : rowsPicked[rowsPicked.length-1]
        for(let i=next; i<matrix.length; i++) {
            if(canPick(rowsPicked, i)) {
                rowsPicked.push(i)
                recurse(rowsPicked)
                rowsPicked.pop()
            }
        }
    }

    recurse([])
    return matches
}