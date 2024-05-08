import {test, expect, describe} from "vitest"

import {serialize, deserialize} from "~/lib/serialize.ts"
import {Disassembly} from "./Disassembly.ts"

describe("Disassembly", () => {
    const disassembly = new Disassembly([
        {
            movedPieces: ["0-0", "0-1", "2"],
            transform: "t:0,0,1",
            repeat: 3,
        },
        {
            movedPieces: ["3"],
            transform: "t:-1,0,0",
            repeat: 1,
        },
    ])

    test("compact serialization", () => {
        expect(serialize(disassembly)).toMatchInlineSnapshot(`
          {
            "steps": [
              "pieces=0-0,0-1,2 transform=t:0,0,1 repeat=3",
              "pieces=3 transform=t:-1,0,0",
            ],
            "type": "Disassembly",
          }
        `)
        expect(deserialize(serialize(disassembly))).toEqual(disassembly)
    })

    test("deserialization from non-compact form", () => {
        const serialized = {
            "type": "Disassembly",
            "steps": [
                {
                    "movedPieces": ["0-0", "0-1", "2"],
                    "repeat": 3,
                    "transform": "t:0,0,1",
                },
                {
                    "movedPieces": ["3"],
                    "repeat": 1,
                    "transform": "t:-1,0,0",
                },
            ],
        }
        expect(deserialize(serialized)).toEqual(disassembly)
    })
})