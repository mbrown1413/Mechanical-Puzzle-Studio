import {SerializableClass, registerClass} from "~lib/serialize.ts"

export abstract class Solution extends SerializableClass {
    constructor() {
        super(null)
    }
}

export class AssemblySolution extends Solution {
}

registerClass(AssemblySolution)