import {PiecePlacement} from "~/lib/placements.ts"
import {SerializableClass, registerClass} from "~/lib/serialize.ts"

export abstract class Solution extends SerializableClass { }

export class AssemblySolution extends Solution {
    placements: PiecePlacement[]

    constructor(placements: PiecePlacement[]) {
        super()
        this.placements = placements.map((placement) =>
            structuredClone(placement)
        )
    }
}

registerClass(AssemblySolution)