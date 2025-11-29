import {AssemblyProblem, Problem, ProblemConstraint} from "~/lib/Problem.ts"
import {Puzzle} from "~/lib/Puzzle.ts"
import {Shape, ShapeId, ShapeInstanceId} from "~/lib/Shape.ts"
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

export type SymmetryReduction = null | "rotation" | "rotation+mirror"

export class AssemblySolver extends Solver {
    symmetryReduction: SymmetryReduction
    disassemble: boolean
    removeNoDisassembly: boolean

    constructor(
        symmetryReduction: SymmetryReduction,
        disassemble: boolean,
        removeNoDisassembly: boolean
    ) {
        super()
        this.symmetryReduction = symmetryReduction
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

        if(this.symmetryReduction) {
            callbacks.progressCallback(0, "Removing symmetric solutions")
            assemblies = filterSymmetricalAssemblies(
                puzzle.grid,
                assemblies,
                this.symmetryReduction === "rotation+mirror",
                callbacks.progressCallback,
            )
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
        if(problem.goalShapeId === null) {
            throw new Error("Goal shape is not set")
        }
        let goal = null
        if(problem.goalShapeId !== undefined) {
            goal = puzzle.getShape(problem.goalShapeId)
        }
        if(goal === null) {
            throw new Error("Goal shape is not set")
        }
        if(goal === undefined) {
            throw new Error(`Goal shape ID ${problem.goalShapeId} not found`)
        }

        const shapes = problem.getUsedShapes(puzzle)

        if(shapes.length === 0) {
            throw new Error("No pieces in problem")
        }

        for(const shape of shapes) {
            for(const voxel of shape.voxels) {
                if(shape.getVoxelAttribute("optional", voxel) === true) {
                    throw new Error(
                        `The shape "${shape.label}" has optional voxels, but ` +
                        "currently only the goal shape may contain optional voxels."
                    )
                }
            }
        }

        const voxelCounts = problem.countVoxels(puzzle)
        if(voxelCounts.warning) {
            throw new Error(voxelCounts.warning)
        }

        let symmetryBreakerCandidates: Shape[] = []
        if(this.symmetryReduction) {
            symmetryBreakerCandidates = shapes.filter(
                shape => problem.shapeCounts[shape.id] === 1
            )
        }

        const placementResults = getPlacements(
            puzzle.grid,
            goal,
            shapes,
            symmetryBreakerCandidates
        )

        if(this.symmetryReduction && placementResults.symmetryInfo) {
            const symInfo = placementResults.symmetryInfo
            logCallback(
                `Symmetry breaking piece: ${symInfo.shape.label}`
            )
            logCallback(
                `Symmetry reduced the problem by ${symInfo.reduction} times`
            )
        } else if(this.symmetryReduction) {
            logCallback("No symmetry breaking piece found")
        }

        const goalVoxels = [...new Set(goal.voxels)]

        const pieceGroups = []
        for(const constraint of problem.constraints || []) {
            if(constraint.type !== "piece-group") {
                throw new Error(`Unhandled constraint type "${constraint.type}"`)
            }
            if(constraint.shapeIds.length === 0) { continue }
            pieceGroups.push(constraint)
        }

        const coverSolver = new CoverSolver([...shapes, ...goalVoxels, ...pieceGroups])
        const voxelColumnStart = shapes.length
        const pieceGroupColumnStart = voxelColumnStart + goalVoxels.length

        for(const [i, shape] of shapes.entries()) {
            const range = problem.getPieceRange(shape.id)
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

        for(const [i, shape] of shapes.entries()) {
            const placements = placementResults.placementsByShape[shape.id]
            const minPlacements = problem.getPieceRange(shape.id).min
            if(placements.length === 0 && minPlacements > 0) {
                throw new Error(
                    "No solutions because piece cannot be placed anywhere in goal.\n\n" +
                    `Shape label: ${shape.label}`
                )
            }
            if(placements.length < minPlacements) {
                throw new Error(
                    `No solutions because piece cannot be placed its minimum count of ${minPlacements} times in goal.\n\n` +
                    `Shape label: ${shape.label}`
                )
            }

            for(const placement of placements) {
                const shapeColumns = new Array(shapes.length).fill(false)
                shapeColumns[i] = true

                const voxelColumns = goalVoxels.map((voxel) =>
                    placement.voxels.includes(voxel)
                )

                const pieceGroupColumns = pieceGroups.map((pieceGroup) =>
                    pieceGroup.shapeIds.includes(shape.id)
                )

                coverSolver.addRow([...shapeColumns, ...voxelColumns, ...pieceGroupColumns])
            }
        }

        return coverSolver
    }

}

function getAssemblyFromCoverSolution(
    problem: AssemblyProblem,
    coverSolution: CoverSolution<Voxel | Shape | ProblemConstraint>
): Shape[] {

    // Instance ID of the next instance, for shapes with duplicates
    const instanceCounters: Record<ShapeId, ShapeInstanceId> = {}

    const placements = []
    for(const row of coverSolution) {

        let shape: Shape | null = null
        const voxels = []

        // Each cover solution row has a shape ID and all of the voxels
        // that the piece fills. We collect them here and create a
        // placement after we've processed this row.
        for(const item of row) {
            if(typeof item === "string") {
                voxels.push(item)
            } else if(item instanceof Shape) {
                if(shape !== null) {
                    throw new Error("Multiple pieces found in cover solution row")
                }
                shape = item.copy()
                if(problem.getPieceRange(shape.id).max > 1) {
                    shape.instance = instanceCounters[shape.id] || 0
                    instanceCounters[shape.id] = shape.instance + 1
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
        if(shape === null) {
            throw new Error("No piece found in cover solution")
        }
        shape.voxels = voxels
        placements.push(shape)
    }

    return placements
}