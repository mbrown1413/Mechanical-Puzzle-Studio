import {Piece} from "~/lib/Piece.ts"
import {Disassembly} from "~/lib/Disassembly.ts"
import {SerializableClass, registerClass, clone} from "~/lib/serialize.ts"

export abstract class Solution extends SerializableClass {
    id: number

    constructor(id: number) {
        super()
        this.id = id
    }

}

export class AssemblySolution extends Solution {
    placements: Piece[]
    disassemblies?: Disassembly[]

    constructor(id: number, placements: Piece[]) {
        super(id)
        this.placements = placements.map((placement) =>
            clone(placement)
        )
    }
}

registerClass(AssemblySolution)