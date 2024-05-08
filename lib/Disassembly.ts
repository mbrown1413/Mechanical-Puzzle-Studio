import {SerializableClass, registerClass} from "~/lib/serialize.ts"
import {Piece, PieceWithId, PieceCompleteId} from "~/lib/Piece.ts"
import {Grid, Transform, Bounds} from "~/lib//Grid.ts"

type StoredDisassemblyData = {
    steps: (DisassemblyStep | string)[]
}

export type DisassemblyStep = {
    movedPieces: PieceCompleteId[]
    transform: Transform
    repeat: number  // Number of times `transform` is repeated
}

/**
 * A single way to completely disassemble a set of pieces.
 */
export class Disassembly extends SerializableClass {
    steps: DisassemblyStep[]

    constructor(steps: DisassemblyStep[]) {
        super()
        this.steps = steps
        this.simplify()
    }

    static postSerialize(disassembly: Disassembly) {
        const stored = disassembly as unknown as StoredDisassemblyData

        stored.steps = disassembly.steps.map(s => {
            const repeatStr = s.repeat > 1 ? ` repeat=${s.repeat}` : ""
            return `pieces=${s.movedPieces.join(",")} transform=${s.transform}${repeatStr}`
        })
    }

    static preDeserialize(stored: StoredDisassemblyData) {
        const disassemblyData = stored as unknown as Disassembly

        for(let i=0; i<stored.steps.length; i++) {
            const step = stored.steps[i]
            if(typeof step !== "string") { continue }

            const parts = step.split(" ", 3)
            disassemblyData.steps[i] = {
                movedPieces: parts[0].slice(7).split(",") as PieceCompleteId[],
                transform: parts[1].slice(10),
                repeat: parts.length === 2 ? 1 : Number(parts[2].slice(7)),
            }
        }
    }

    simplify() {
        // Remove extraneous data from steps
        this.steps = this.steps.map(step => {
            return {
                movedPieces: step.movedPieces,
                transform: step.transform,
                repeat: step.repeat,
            }
        })
    }

    get nStates() {
        return this.steps.length + 1
    }

    /**
     * Get each intermediate placement of pieces between the start and
     * disassembly.
     */
    getState(grid: Grid, start: PieceWithId[], stateNumber: number): PieceWithId[] {
        const state = start.map(piece => piece.copy())
        for(const step of this.steps.slice(0, stateNumber)) {
            for(const piece of state) {
                if(step.movedPieces.includes(piece.completeId)) {
                    for(let i=0; i<(step.repeat || 1); i++) {
                        piece.transform(grid, step.transform)
                    }
                }
            }
        }
        return state
    }

    *getAllStates(grid: Grid, start: PieceWithId[]): Iterable<PieceWithId[]> {
        for(let i=0; i<this.nStates; i++) {
            yield this.getState(grid, start, i)
        }
    }

    getBounds(grid: Grid, start: PieceWithId[]): Bounds {
        const allPieces: Piece[] = []
        for(const state of this.getAllStates(grid, start)) {
            allPieces.push(...state)
        }
        const allPieceBounds = allPieces.map(piece => grid.getVoxelBounds(...piece.voxels))
        return grid.getBoundsMax(...allPieceBounds)
    }
}
registerClass(Disassembly)