import {PiecePlacement} from "~lib/Puzzle.ts"
import {SerializableClass, registerClass} from "~lib/serialize.ts"

export abstract class Solution extends SerializableClass { }

export class AssemblySolution extends Solution {
    placements: Map<string, PiecePlacement>
    
    constructor(placements: PiecePlacement[]) {
        super(null)
        this.placements = new Map()
        for(const placement of placements) {
            if(placement.originalPiece.id === null) {
                throw "Pieces in solution must have an ID"
            }
            this.placements.set(placement.originalPiece.id, placement)
        }
    }
}

registerClass(AssemblySolution)