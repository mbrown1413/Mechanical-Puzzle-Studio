import {Problem} from "~lib/Problem.ts"
import {Puzzle} from "~lib/Puzzle.ts"
import {AssemblySolution, Solution} from "~lib/Solution"

export abstract class Solver {
    abstract solve(puzzle: Puzzle, problem: Problem): Solution[]
}

export class AssemblySolver extends Solver {
    solve(puzzle: Puzzle, problem: Problem): Solution[] {
        return [
            new AssemblySolution(),
            new AssemblySolution(),
            new AssemblySolution(),
        ]
    }
}