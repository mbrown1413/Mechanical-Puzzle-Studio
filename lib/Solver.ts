import {AssemblyProblem, Problem} from "~/lib/Problem.ts"
import {Puzzle, PiecePlacement} from "~/lib/Puzzle.ts"
import {AssemblySolution, Solution} from "~/lib/Solution.ts"
import {TaskCallbacks, voidTaskCallbacks} from "~/lib/types.ts"

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
        callbacks: TaskCallbacks = voidTaskCallbacks,
    ): AssemblySolution[] {
        // We don't exactly set up a proper cover problem here. We do have a
        // set of rows, each corresponding to a placement of one piece, but
        // there are only columns for each voxel, and no columns for each
        // piece. Instead, rows are pre-sorted based on the piece they belong
        // to. We'll only choose one row for each piece.

        // `placementsByPieceIdx[pieceIdx][i]` - The `i`th placement of piece at `pieceIdx`
        // `coverRowsByPieceIdx[pieceIdx][i]` - The `i`th cover row of piece at `pieceIdx`
        const {
            placementsByPieceIdx,
            coverRowsByPieceIdx
        } = this.getPlacementRows(puzzle, problem)

        callbacks.logCallback(
            `Number of placements options for each piece: ${placementsByPieceIdx.map(placements => placements.length).join(", ")}`
        )

        const solutions = this.solveCover(coverRowsByPieceIdx, callbacks)

        const ret = []
        for(const pickedRows of solutions) {
            ret.push(new AssemblySolution(
                pickedRows.map(
                    (placementIdx, pieceIdx) => placementsByPieceIdx[pieceIdx][placementIdx]
                )
            ))
        }
        return ret
    }

    getPlacementRows(puzzle: Puzzle, problem: Problem) {
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

        const placementsByPieceIdx: PiecePlacement[][] = []
        const coverRowsByPieceIdx: boolean[][][] = []
        for(const piece of pieces) {
            const placements = [...puzzle.getPiecePlacements(piece, goal.voxels)]
            const coverRows: boolean[][] = []
            for(const placement of placements) {
                coverRows.push(
                    goal.voxels.map((voxel) =>
                        placement.transformedPiece.voxels.includes(voxel)
                    )
                )
            }
            placementsByPieceIdx.push(placements)
            coverRowsByPieceIdx.push(coverRows)
        }
        return {pieces, placementsByPieceIdx, coverRowsByPieceIdx}
    }

    solveCover(
        coverRowsByPieceIdx: boolean[][][],
        {progressCallback}: TaskCallbacks,
    ): number[][] {
        const solutions: number[][] = []
        const nCols = coverRowsByPieceIdx[0][0].length

        /**
         * Do the set of rows exactly cover the columns?
         * 
         * Note that we make the assumption that none of the rows have
         * conflicting columns already, so we can just count the columns which
         * are true.
         */
        function coversExactly(rows: boolean[][]): boolean {
            let nPicked = 0
            for(const row of rows) {
                for(const col of row) {
                    if(col) {
                        nPicked++
                    }
                }
            }
            return nPicked === nCols
        }

        /**
         * Given rows, does the new row conflict? That is, if we have already
         * picked `rows`, can we pick `newRow`?
         */
        function canPick(rows: boolean[][], newRow: boolean[]): boolean {
            for(const row of rows) {
                for(let i=0; i<nCols; i++) {
                    if(row[i] && newRow[i]) {
                        return false
                    }
                }
            }
            return true
        }

        // Progress tracks based on how many placements of the first piece we
        // have tried.
        let progress = 0
        let progressMax = coverRowsByPieceIdx[0].length

        // List of row indexes, and the rows themselves, which we're currently
        // considering.
        const rowIndexes: number[] = []
        const rowsPicked: boolean[][] = []

        // Depth-first search
        // At each depth `depth` we choose the placement of the piece at index
        // `depth`.
        let depth: number, pick: number
        const depthStack = [0]
        const pickStack = [-1]
        while(depthStack.length) {
            depth = depthStack.pop() as number
            pick = pickStack.pop() as number

            if(depth !== 0) {
                rowIndexes.length = depth-1
                rowIndexes.push(pick)

                rowsPicked.length = depth-1
                rowsPicked.push(coverRowsByPieceIdx[depth-1][pick])
            }
            
            if(depth === 1) {
                progress++
                progressCallback(progress / progressMax)
            }

            if(coversExactly(rowsPicked)) {
                solutions.push([...rowIndexes])
                continue
            }

            const nextCoverRows = coverRowsByPieceIdx[depth]
            for(let i=nextCoverRows.length-1; i>=0; i--) {
                if(canPick(rowsPicked, nextCoverRows[i])) {
                    depthStack.push(depth+1)
                    pickStack.push(i)
                }
            }
        }

        return solutions
    }
}