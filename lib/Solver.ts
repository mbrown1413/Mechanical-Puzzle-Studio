import {AssemblyProblem, Problem} from "~/lib/Problem.ts"
import {Puzzle, PiecePlacement, Piece} from "~/lib/Puzzle.ts"
import {AssemblySolution, Solution} from "~/lib/Solution.ts"

import {TaskCallbacks} from "~/ui/tasks.ts"

export abstract class Solver {
    abstract solve(
        puzzle: Puzzle,
        problem: Problem,
        callbacks: TaskCallbacks,
    ): Solution[]
}

export class AssemblySolver extends Solver {
    solve(
        puzzle: Puzzle,
        problem: Problem,
        callbacks: TaskCallbacks,
    ): AssemblySolution[] {
        const {rows, rowPlacements} = this.getCoverProblem(puzzle, problem)

        callbacks.logCallback(
            `Cover problem: ${rows[0].length} columns by ${rows.length} rows`
        )

        const solutions = solveExactCoverNaive(rows, callbacks)

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

function solveExactCoverNaive(matrix: Boolean[][], {progressCallback}: TaskCallbacks) {
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
        let nCovered = 0
        for(const rowIndex of rowIndexes) {
            const row = matrix[rowIndex]
            for(const value of row) {
                if(value) {
                    nCovered++
                }
            }
        }
        return nCovered === nCols
    }

    let progress = 0
    let depth: number, pick: number
    const depthStack = [0]
    const pickStack = [-1]
    const rowsPicked: number[] = []
    while(depthStack.length) {
        depth = depthStack.pop() as number
        pick = pickStack.pop() as number

        if(depth !== 0) {
            rowsPicked.length = depth-1
            rowsPicked.push(pick)
        }

        if(depth === 1) {
            progressCallback(progress / matrix.length)
            progress++
        }

        if(coversExactly(rowsPicked)) {
            matches.push([...rowsPicked])
            continue
        }

        for(let i=matrix.length-1; i>=pick+1; i--) {
            if(canPick(rowsPicked, i)) {
                depthStack.push(depth+1)
                pickStack.push(i)
            }
        }
    }

    return matches
}