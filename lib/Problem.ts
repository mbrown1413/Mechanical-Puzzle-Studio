import {SerializableClass, registerClass} from "~lib/serialize.ts"

export class Problem extends SerializableClass {
    declare id: string
    label: string
    goalPieceId: string | null
    
    /* Maps piece ID to how many of that piece are used in this problem. */
    usedPieceCounts: Map<string, number>
    
    constructor(id: string) {
        super(id)
        this.label = id
        this.goalPieceId = null
        this.usedPieceCounts = new Map()
    }
}

registerClass(Problem)