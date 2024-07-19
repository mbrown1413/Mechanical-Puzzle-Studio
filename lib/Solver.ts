import {AssemblyProblem, Problem, ProblemConstraint} from "~/lib/Problem.ts"
import {Puzzle} from "~/lib/Puzzle.ts"
import {Piece, PieceId, PieceInstanceId} from "~/lib/Piece.ts"
import {getPlacements} from "~/lib/placements.ts"
import {AssemblySolution, Solution} from "~/lib/Solution.ts"
import {TaskCallbacks, voidTaskCallbacks} from "~/lib/types.ts"
import {SimpleDisassembler} from "~/lib/Disassembler.ts"
import {CoverSolution, CoverSolver} from "~/lib/CoverSolver.ts"
import {Voxel} from "~/lib/Grid.ts"
import {filterSymmetricalAssemblies} from "~/lib/symmetry.ts"

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

        callbacks.progressCallback(null, "Generating cover problem")
        const coverSolver = this.getCoverProblem(puzzle, problem, callbacks)

        callbacks.progressCallback(0, "Assembling")
        const coverSolutions = coverSolver.solve(callbacks)
        let assemblies = coverSolutions.map(
            (coverSolution) => getAssemblyFromCoverSolution(problem, coverSolution)
        )
        callbacks.progressCallback(100)

        if(this.removeSymmetries) {
            callbacks.progressCallback(null, "Removing symmetric solutions")
            assemblies = filterSymmetricalAssemblies(puzzle.grid, assemblies)
        }

        let solutions = assemblies.map(assembly => new AssemblySolution(-1, assembly))

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

        callbacks.progressCallback(null, "Saving Solutions")
        return solutions
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

        const pieces = problem.getUsedPieces(puzzle)

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

        const voxelCounts = problem.countVoxels(puzzle)
        if(voxelCounts.warning) {
            throw new Error(voxelCounts.warning)
        }

        let symmetryBreakerCandidates: Piece[] = []
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

        const pieceGroups = []
        for(const constraint of problem.constraints || []) {
            if(constraint.type !== "piece-group") {
                throw new Error(`Unhandled constraint type "${constraint.type}"`)
            }
            if(constraint.pieceIds.length === 0) { continue }
            pieceGroups.push(constraint)
        }

        const coverSolver = new CoverSolver([...pieces, ...goalVoxels, ...pieceGroups])
        const voxelColumnStart = pieces.length
        const pieceGroupColumnStart = voxelColumnStart + goalVoxels.length

        for(const [i, piece] of pieces.entries()) {
            const range = problem.getPieceRange(piece.id)
            coverSolver.setColumnRange(i, range.min, range.max)
        }
        for(const [i, voxel] of goalVoxels.entries()) {
            const isOptional = goal.getVoxelAttribute("optional", voxel)
            if(!isOptional) { continue }
            const columnIndex = voxelColumnStart + i
            coverSolver.setColumnOptional(columnIndex)
        }
        for(const [i, pieceGroup] of pieceGroups.entries()) {
            const columnIndex = pieceGroupColumnStart + i
            let range
            if(typeof pieceGroup.count === "number") {
                range = {min: pieceGroup.count, max: pieceGroup.count}
            } else {
                range = pieceGroup.count
            }
            coverSolver.setColumnRange(columnIndex, range.min, range.max)
        }

        for(const [i, piece] of pieces.entries()) {
            const placements = placementResults.placementsByPiece[piece.id]
            const minPlacements = problem.getPieceRange(piece.id).min
            if(placements.length === 0 && minPlacements > 0) {
                throw new Error(
                    "No solutions because piece cannot be placed anywhere in goal.\n\n" +
                    `Piece label: ${piece.label}`
                )
            }
            if(placements.length < minPlacements) {
                throw new Error(
                    `No solutions because piece cannot be placed its minimum count of ${minPlacements} times in goal.\n\n` +
                    `Piece label: ${piece.label}`
                )
            }

            for(const placement of placements) {
                const pieceColumns = new Array(pieces.length).fill(false)
                pieceColumns[i] = true

                const voxelColumns = goalVoxels.map((voxel) =>
                    placement.voxels.includes(voxel)
                )

                const pieceGroupColumns = pieceGroups.map((pieceGroup) =>
                    pieceGroup.pieceIds.includes(piece.id)
                )

                coverSolver.addRow([...pieceColumns, ...voxelColumns, ...pieceGroupColumns])
            }
        }

        return coverSolver
    }

}

function getAssemblyFromCoverSolution(
    problem: AssemblyProblem,
    coverSolution: CoverSolution<Voxel | Piece | ProblemConstraint>
): Piece[] {

    // Instance ID of the next instance, for pieces with duplicates
    const instanceCounters: Record<PieceId, PieceInstanceId> = {}

    const placements = []
    for(const row of coverSolution) {

        let piece: Piece | null = null
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
                if(problem.getPieceRange(piece.id).max > 1) {
                    piece.instance = instanceCounters[piece.id] || 0
                    instanceCounters[piece.id] = piece.instance + 1
                }
            } else if(typeof item === "object") {
                // This is a constraint. Make sure it's actually one that's
                // supposed to be added to the cover problem.
                if(item.type !== "piece-group") {
                    throw new Error(`Unhandled constraint type "${item.type}"`)
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

    return placements
}