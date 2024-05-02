import {PieceWithId} from "~/lib/Piece.ts"
import {DisassemblySet} from "~/lib/DisassemblySet.ts"
import {SerializableClass, registerClass, clone} from "~/lib/serialize.ts"

export abstract class Solution extends SerializableClass { }

export class AssemblySolution extends Solution {
    placements: PieceWithId[]
    disassemblies?: DisassemblySet

    constructor(placements: PieceWithId[]) {
        super()
        this.placements = placements.map((placement) =>
            clone(placement)
        )
    }
}

registerClass(AssemblySolution)