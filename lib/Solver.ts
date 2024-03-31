import {AssemblyProblem, Problem} from "~/lib/Problem.ts"
import {Puzzle} from "~/lib/Puzzle.ts"
import {Piece} from "~/lib/Piece.ts"
import {PiecePlacement, getPlacements} from "~/lib/placements.ts"
import {AssemblySolution, Solution} from "~/lib/Solution.ts"
import {TaskCallbacks, voidTaskCallbacks} from "~/lib/types.ts"

export abstract class Solver {
    abstract solve(
        puzzle: Puzzle,
        problem: Problem,
        callbacks: TaskCallbacks,
    ): Solution[]
}

/**
 * We don't exactly set up a proper cover problem here. We do have a
 * set of rows, each corresponding to a placement of one piece, but
 * there are only columns for each voxel, and no columns for each
 * piece. Instead, rows are pre-grouped based on the piece they belong
 * to. We'll only choose one row for each piece.
 *
 * Another way to think about this is that we have a set of placements,
 * one set for each piece, and we're going through the cartesian
 * product of those sets. I'm calling this a "cover" problem, since
 * internally each piece placement is converted into a row of booleans
 * which should not overlap in a valid solution.
 */
type GroupedCoverProblem = {
    pieces: Piece[],

    // placementsByPieceIdx[pieceIdx][i] - The i-th placement of piece at `pieceIdx`
    placementsByPieceIdx: PiecePlacement[][],

    // coverRowsByPieceIdx[pieceIdx][i] - The i-th cover row of piece at `pieceIdx`
    coverRowsByPieceIdx: boolean[][][],

    // The first `nRequiredCols` columns must be covered. Columns after this
    // are optional.
    nRequiredCols: number,
}

export class AssemblySolver extends Solver {
    removeSymmetries: boolean

    constructor() {
        super()
        this.removeSymmetries = true
    }

    solve(
        puzzle: Puzzle,
        problem: Problem,
        callbacks: TaskCallbacks = voidTaskCallbacks,
    ): AssemblySolution[] {
        const coverProblem = this.getCoverProblem(puzzle, problem, callbacks)

        callbacks.logCallback(
            `Number of placements options for each piece: ${coverProblem.placementsByPieceIdx.map(placements => placements.length).join(", ")}`
        )

        for(const [i, coverRows] of coverProblem.coverRowsByPieceIdx.entries()) {
            if(coverRows.length === 0) {
                const pieceLabel = coverProblem.pieces[i].label
                throw new Error(
                    "No solutions because piece cannot be placed anywhere in goal.\n\n" +
                    `Piece label: ${pieceLabel}`
                )
            }
        }

        const solutions = this.solveCover(coverProblem, callbacks)

        const ret = []
        for(const pickedRows of solutions) {
            ret.push(new AssemblySolution(
                pickedRows.map(
                    (placementIdx, pieceIdx) => coverProblem.placementsByPieceIdx[pieceIdx][placementIdx]
                )
            ))
        }
        return ret
    }

    voxelCountCheck(pieces: Piece[], goal: Piece): string | null {
        const countVoxels = (p: Piece) => new Set(p.voxels).size
        const countOptionalVoxels = (p: Piece) => {
            const optionalAttr = (p.voxelAttributes || {})["optional"] || {}
            const variable = p.voxels.filter(v => optionalAttr[v] === true)
            return new Set(variable).size
        }

        const pieceCount = pieces.map(countVoxels).reduce((a, b) => a + b, 0)
        const goalMax = countVoxels(goal)
        const goalOptional = countOptionalVoxels(goal)
        const goalMin = goalMax - goalOptional

        if(pieceCount < goalMin || pieceCount > goalMax) {
            const goalCountMsg = goalOptional === 0 ? goalMax : `${goalMin} to ${goalMax}`
            return "Number of voxels in pieces don't add up to the voxels in the goal piece.\n\n" +
                `Voxels in goal: ${goalCountMsg}\n` +
                `Voxels in pieces: ${pieceCount}`
        }
        return null
    }

    getCoverProblem(puzzle: Puzzle, problem: Problem, {logCallback}: TaskCallbacks) {
        if(!(problem instanceof AssemblyProblem)) {
            throw new Error("Assembly Solver can only solve Assembly Problems")
        }
        if(problem.goalPieceId === null) {
            throw new Error("Goal piece is not set")
        }
        const goal = puzzle.getPiece(problem.goalPieceId)
        if(goal === null) {
            throw new Error("Goal piece is not set")
        }
        if(goal === undefined) {
            throw new Error(`Goal piece ID ${problem.goalPieceId} not found`)
        }

        const pieces = []
        for(const [pieceId, count] of Object.entries(problem.usedPieceCounts)) {
            const piece = puzzle.getPiece(pieceId)
            if(!piece) {
                continue  // Ignore references to deleted pieces
            }
            for(let i=0; i<count; i++) {
                pieces.push(piece)
            }
        }

        if(pieces.length === 0) {
            throw new Error("No pieces in problem")
        }

        const voxelCountError = this.voxelCountCheck(pieces, goal)
        if(voxelCountError) {
            throw new Error(voxelCountError)
        }

        const placementResults = getPlacements(
            puzzle.grid,
            goal,
            pieces,
            this.removeSymmetries,
        )

        if(this.removeSymmetries && placementResults.symmetryInfo) {
            const symInfo = placementResults.symmetryInfo
            logCallback(
                `Symmetry breaking piece: ${symInfo.piece.label}`
            )
            logCallback(
                `Symmetry reduced the problem by ${symInfo.reduction} times`
            )
        } else if(this.removeSymmetries) {
            logCallback("No symmetry breaking piece found")
        }

        const goalVoxels = [...new Set(goal.voxels)]
        const voxelIsOptional = (goal.voxelAttributes || {}).optional || {}

        // Sort optional voxels last. These are our cover columns.
        goalVoxels.sort((v1, v2) => {
            const v1Optional = voxelIsOptional[v1]
            const v2Optional = voxelIsOptional[v2]
            if(v1Optional && v2Optional) {
                return 0
            } else if(v2Optional) {
                return -1
            } else if(v1Optional) {
                return 1
            } else {
                return 0
            }
        })

        const placementsByPieceIdx: PiecePlacement[][] = []
        const coverRowsByPieceIdx: boolean[][][] = []
        for(const piece of pieces) {
            const placements = placementResults.placementsByPiece[piece.id]
            const coverRows: boolean[][] = []
            for(const placement of placements) {
                coverRows.push(
                    goalVoxels.map((voxel) =>
                        placement.transformedPiece.voxels.includes(voxel)
                    )
                )
            }
            placementsByPieceIdx.push(placements)
            coverRowsByPieceIdx.push(coverRows)
        }

        const nRequiredCols = goalVoxels.filter(v => !voxelIsOptional[v]).length
        return {pieces, placementsByPieceIdx, coverRowsByPieceIdx, nRequiredCols}
    }

    solveCover(
        {
            pieces,
            coverRowsByPieceIdx,
            nRequiredCols,
        }: GroupedCoverProblem,
        {progressCallback}: TaskCallbacks,
    ): number[][] {
        const solutions: number[][] = []
        const nCols = coverRowsByPieceIdx[0][0].length

        /**
         * Do the set of rows exactly cover the required columns?
         *
         * Note that we make the assumption that none of the rows have
         * conflicting columns already, so we can just count the columns which
         * are true.
         */
        function coversExactly(rows: boolean[][]): boolean {
            let nPicked = 0
            for(const row of rows) {
                for(let colNum=0; colNum<nRequiredCols; colNum++) {
                    if(row[colNum]) {
                        nPicked++
                    }
                }
            }
            return nPicked === nRequiredCols
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

        // Any piece with the same ID as a piece before it in the pieces list
        // is counted as a duplicate. The first piece with a given ID is not.
        const isDuplicate: boolean[] = pieces.map((piece, i) =>
            i !== 0 && pieces.findIndex(p => p.id == piece.id) < i
        )
        for(const [i, piece] of pieces.entries()) {
            if(isDuplicate[i] && i == 0) {
                throw new Error("Solver bug: First piece should not be a duplicate")
            }
            if(isDuplicate[i] && pieces[i-1].id !== piece.id) {
                // We count on the order of the pieces list such that any
                // identical pieces are grouped together.
                throw new Error("Solver bug: Any duplicates must be preceeded by an identical piece.")
            }
        }

        // Progress tracks based on how many placements of the first piece we
        // have tried.
        let progress = 0
        const progressMax = coverRowsByPieceIdx[0].length

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

            if(depth === pieces.length && coversExactly(rowsPicked)) {
                solutions.push([...rowIndexes])
                continue
            }

            if(depth >= pieces.length) {
                // We've run out of pieces to place
                continue
            }

            // Restrict duplicate pieces to placements at greater index than
            // the last piece it's a duplicate of, eliminating duplicate
            // solutions due to duplicate pieces switching placements.
            const minRow = isDuplicate[depth] ? rowIndexes[depth-1] : 0

            const nextCoverRows = coverRowsByPieceIdx[depth]
            for(let i=nextCoverRows.length-1; i>=minRow; i--) {
                if(canPick(rowsPicked, nextCoverRows[i])) {
                    depthStack.push(depth+1)
                    pickStack.push(i)
                }
            }
        }

        return solutions
    }
}