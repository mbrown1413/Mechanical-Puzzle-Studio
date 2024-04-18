import {Piece} from "~/lib/Piece.ts"
import {SerializableClass, registerClass, clone} from "~/lib/serialize.ts"

export abstract class Solution extends SerializableClass { }

export class AssemblySolution extends Solution {
    placements: Piece[]

    constructor(placements: Piece[]) {
        super()
        this.placements = placements.map((placement) =>
            clone(placement)
        )
    }
}

registerClass(AssemblySolution)