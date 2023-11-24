import {SerializableClass, registerClass} from "~lib/serialize.ts"
import {Piece} from "~lib/Puzzle.ts"

export class Problem extends SerializableClass {
    declare id: string
    pieces: Piece[]
    label: string
    
    constructor(id: string, pieces: Piece[]=[]) {
        super(id)
        this.pieces = pieces
        this.label = id
    }
}

registerClass(Problem)