import {SerializableClass, registerClass} from "~/lib/serialize.ts"
import {Piece, PieceWithId, PieceCompleteId} from "~/lib/Piece.ts"
import {Grid, Transform, Bounds} from "~/lib//Grid.ts"

export type DisassemblyStep = {
    movedPieces: PieceCompleteId[]
    transform: Transform
    repeat: number  // Number of times `transform` is repeated
    separates: boolean
}

type StoredDisassemblyData = {
    steps: (DisassemblyStep | string)[]
}

/**
 * A single way to completely disassemble a set of pieces.
 */
export class Disassembly extends SerializableClass {
    steps: DisassemblyStep[]

    constructor(steps: DisassemblyStep[]) {
        super()
        this.steps = steps
    }

    static postSerialize(disassembly: Disassembly) {
        const stored = disassembly as unknown as StoredDisassemblyData

        stored.steps = disassembly.steps.map(s => {
            const repeatStr = s.repeat > 1 ? ` repeat=${s.repeat}` : ""
            const separatesStr = s.separates ? " separates" : ""
            return `pieces=${s.movedPieces.join(",")} transform=${s.transform}${repeatStr}${separatesStr}`
        })
    }

    static preDeserialize(stored: StoredDisassemblyData) {
        const disassemblyData = stored as unknown as Disassembly

        for(let i=0; i<stored.steps.length; i++) {
            const storedStep = stored.steps[i]
            if(typeof storedStep !== "string") { continue }

            const parts = storedStep.split(" ")
            const dict: {[key: string]: string} = {}
            for(const part of parts) {
                const [key, value] = part.split("=", 2)
                dict[key] = value
            }

            disassemblyData.steps[i] = {
                movedPieces: dict.pieces.split(",") as PieceCompleteId[],
                transform: dict.transform,
                repeat: dict.repeat === undefined ? 1 : Number(dict.repeat),
                separates: "separates" in dict && dict.separates !== "false",
            }
        }
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