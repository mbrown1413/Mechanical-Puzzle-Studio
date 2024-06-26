import {AssemblyProblem, Problem} from "~/lib/Problem.ts"
import {Puzzle} from "~/lib/Puzzle.ts"
import {Piece, PieceId, PieceInstanceId, PieceWithId} from "~/lib/Piece.ts"
import {getPlacements} from "~/lib/placements.ts"
import {AssemblySolution, Solution} from "~/lib/Solution.ts"
import {TaskCallbacks, voidTaskCallbacks} from "~/lib/types.ts"
import {SimpleDisassembler} from "~/lib/Disassembler.ts"
import {CoverSolution, CoverSolver} from "~/lib/CoverSolver.ts"
import {Voxel} from "~/lib/Grid.ts"

export abstract class Solver {
    abstract solve(
        puzzle: Puzzle,
        problem: Problem,
        callbacks: TaskCallbacks,
    ): Solution[]
}

export class AssemblySolver extends Solver {
    removeSymmetries: boolean
    disassemble: boolean
    removeNoDisassembly: boolean

    constructor(disassemble: boolean, removeNoDisassembly: boolean) {
        super()
        this.removeSymmetries = true
        this.disassemble = disassemble
        this.removeNoDisassembly = removeNoDisassembly
    }

    solve(
        puzzle: Puzzle,
        problem: AssemblyProblem,
        callbacks: TaskCallbacks = voidTaskCallbacks,
    ): AssemblySolution[] {
        const coverSolver = this.getCoverProblem(puzzle, problem, callbacks)

        callbacks.progressCallback(0, "Assembling")
        const coverSolutions = coverSolver.solve()
        let solutions = coverSolutions.map(
            (coverSolution) => getAssemblyFromCoverSolution(problem, coverSolution)
        )

        if(this.disassemble) {
            callbacks.progressCallback(0, "Disassembling")
            const newSolutions = []
            for(const [i, solution] of solutions.entries()) {
                const disassembler = new SimpleDisassembler(puzzle.grid, solution.placements)
                solution.disassemblies = disassembler.disassemble()
                if(solution.disassemblies.length > 0 || !this.removeNoDisassembly) {
                    newSolutions.push(solution)
                }
                callbacks.progressCallback(i / coverSolutions.length)
            }
            solutions = newSolutions
        }

        for(const [i, solution] of solutions.entries()) {
            solution.id = i + 1
        }

        return solutions
    }

    voxelCountCheck(
        problem: AssemblyProblem,
        pieces: PieceWithId[],
        goal: PieceWithId
    ): string | null {
        const countVoxels = (p: PieceWithId) => new Set(p.voxels).size
        const countOptionalVoxels = (p: Piece) => {
            const optionalAttr = (p.voxelAttributes || {})["optional"] || {}
            const variable = p.voxels.filter(v => optionalAttr[v] === true)
            return new Set(variable).size
        }

        const pieceCount = pieces.map(
            piece => countVoxels(piece) * problem.getPieceCount(piece.id)
        ).reduce((a, b) => a + b, 0)
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
        let goal = null
        if(problem.goalPieceId !== undefined) {
            goal = puzzle.getPiece(problem.goalPieceId)
        }
        if(goal === null) {
            throw new Error("Goal piece is not set")
        }
        if(goal === undefined) {
            throw new Error(`Goal piece ID ${problem.goalPieceId} not found`)
        }

        const pieces = []
        for(const pieceId of problem.usedPieces) {
            const piece = puzzle.getPiece(pieceId)
            if(!piece) { continue }  // Ignore references to deleted pieces
            pieces.push(piece)
        }

        if(pieces.length === 0) {
            throw new Error("No pieces in problem")
        }

        for(const piece of pieces) {
            for(const voxel of piece.voxels) {
                if(piece.getVoxelAttribute("optional", voxel) === true) {
                    throw new Error(
                        `The piece "${piece.label}" has optional voxels, but ` +
                        "currently only the goal piece may contain optional voxels."
                    )
                }
            }
        }

        const voxelCountError = this.voxelCountCheck(problem, pieces, goal)
        if(voxelCountError) {
            throw new Error(voxelCountError)
        }

        let symmetryBreakerCandidates: PieceWithId[] = []
        if(this.removeSymmetries) {
            symmetryBreakerCandidates = pieces.filter(
                piece => problem.usedPieceCounts[piece.id] === 1
            )
        }

        const placementResults = getPlacements(
            puzzle.grid,
            goal,
            pieces,
            symmetryBreakerCandidates
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

        const coverSolver = new CoverSolver([...pieces, ...goalVoxels])
        for(const [i, piece] of pieces.entries()) {
            const count = problem.getPieceCount(piece.id)
            coverSolver.setColumnRange(i, count, count)
        }
        for(const [i, voxel] of goalVoxels.entries()) {
            const isOptional = goal.getVoxelAttribute("optional", voxel)
            if(!isOptional) { continue }
            const columnIndex = pieces.length + i
            coverSolver.setColumnOptional(columnIndex)
        }

        for(const [i, piece] of pieces.entries()) {
            const placements = placementResults.placementsByPiece[piece.id]
            if(placements.length === 0) {
                throw new Error(
                    "No solutions because piece cannot be placed anywhere in goal.\n\n" +
                    `Piece label: ${piece.label}`
                )
            }

            for(const placement of placements) {
                const pieceColumns = new Array(pieces.length).fill(false)
                pieceColumns[i] = true

                const voxelColumns = goalVoxels.map((voxel) =>
                    placement.voxels.includes(voxel)
                )

                coverSolver.addRow([...pieceColumns, ...voxelColumns])
            }
        }

        return coverSolver
    }

}

function getAssemblyFromCoverSolution(
    problem: AssemblyProblem,
    coverSolution: CoverSolution<Voxel | PieceWithId>
): AssemblySolution {

    // Instance ID of the next instance, for pieces with duplicates
    const instanceCounters: Record<PieceId, PieceInstanceId> = {}

    const placements = []
    for(const row of coverSolution) {

        let piece: PieceWithId | null = null
        const voxels = []

        // Each cover solution row has a piece ID and all of the voxels
        // that the piece fills. We collect them here and create a
        // placement after we've processed this row.
        for(const item of row) {
            if(typeof item === "string") {
                voxels.push(item)
            } else if(item instanceof Piece) {
                if(piece !== null) {
                    throw new Error("Multiple pieces found in cover solution row")
                }
                piece = item.copy()
                if(problem.getPieceCount(piece.id) > 1) {
                    piece.instance = instanceCounters[piece.id] || 0
                    instanceCounters[piece.id] = piece.instance + 1
                }
            } else {
                throw new Error("Unexpected return type from cover solution")
            }
        }
        if(piece === null) {
            throw new Error("No piece found in cover solution")
        }
        piece.voxels = voxels
        placements.push(piece)
    }

    return new AssemblySolution(-1, placements)
}