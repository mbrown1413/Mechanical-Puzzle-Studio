import {test, expect, describe} from "vitest"

import {serialize, deserialize} from "~/lib/serialize.ts"
import {Disassembly} from "./Disassembly.ts"

describe("Disassembly", () => {
    const disassembly = new Disassembly([
        {
            movedPieces: ["0-0", "0-1", "2"],
            transform: "t:0,0,1",
            repeat: 3,
            separates: true
        },
        {
            movedPieces: ["3"],
            transform: "t:-1,0,0",
            repeat: 1,
            separates: true
        },
        {
            movedPieces: ["0-0", "0-1", "2"],
            transform: "t:0,0,1",
            repeat: 3,
            separates: false
        },
        {
            movedPieces: ["3"],
            transform: "t:-1,0,0",
            repeat: 1,
            separates: false
        },
    ])

    test("compact serialization", () => {
        expect(serialize(disassembly)).toMatchInlineSnapshot(`
          {
            "steps": [
              "pieces=0-0,0-1,2 transform=t:0,0,1 repeat=3 separates",
              "pieces=3 transform=t:-1,0,0 separates",
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
                    "separates": true
                },
                {
                    "movedPieces": ["3"],
                    "repeat": 1,
                    "transform": "t:-1,0,0",
                    "separates": true
                },
                {
                    "movedPieces": ["0-0", "0-1", "2"],
                    "repeat": 3,
                    "transform": "t:0,0,1",
                    "separates": false
                },
                {
                    "movedPieces": ["3"],
                    "repeat": 1,
                    "transform": "t:-1,0,0",
                    "separates": false
                },
            ],
        }
        expect(deserialize(serialized)).toEqual(disassembly)
    })

    test("reorder", () => {

        const disassembly = deserialize(JSON.parse(`
          {
            "steps": [
              "pieces=0,5 transform=t:1,0,0",
              "pieces=0,1,2 transform=t:1,0,0 separates",
              "pieces=0 transform=t:1,0,0",
              "pieces=1 transform=t:1,0,0",
              "pieces=2 transform=t:1,0,0",
              "pieces=3 transform=t:1,0,0",
              "pieces=4 transform=t:1,0,0",
              "pieces=0 transform=t:1,0,0 separates",
              "pieces=1 transform=t:1,0,0",
              "pieces=2 transform=t:1,0,0",
              "pieces=3 transform=t:1,0,0",
              "pieces=4 transform=t:1,0,0",
              "pieces=4,5 transform=t:1,0,0 separates",
              "pieces=1 transform=t:1,0,0",
              "pieces=2 transform=t:1,0,0",
              "pieces=3 transform=t:1,0,0",
              "pieces=4 transform=t:1,0,0",
              "pieces=5 transform=t:1,0,0",
              "pieces=1 transform=t:1,0,0 separates",
              "pieces=4 transform=t:1,0,0 separates"
            ],
            "type": "Disassembly"
          }
        `)) as Disassembly
        disassembly.reorder()
        expect(serialize(disassembly)).toMatchInlineSnapshot(`
          {
            "steps": [
              "pieces=0,5 transform=t:1,0,0",
              "pieces=0,1,2 transform=t:1,0,0 separates",
              "pieces=0 transform=t:1,0,0",
              "pieces=1 transform=t:1,0,0",
              "pieces=2 transform=t:1,0,0",
              "pieces=0 transform=t:1,0,0 separates",
              "pieces=1 transform=t:1,0,0",
              "pieces=2 transform=t:1,0,0",
              "pieces=1 transform=t:1,0,0",
              "pieces=2 transform=t:1,0,0",
              "pieces=1 transform=t:1,0,0 separates",
              "pieces=3 transform=t:1,0,0",
              "pieces=4 transform=t:1,0,0",
              "pieces=3 transform=t:1,0,0",
              "pieces=4 transform=t:1,0,0",
              "pieces=4,5 transform=t:1,0,0 separates",
              "pieces=4 transform=t:1,0,0",
              "pieces=5 transform=t:1,0,0",
              "pieces=4 transform=t:1,0,0 separates",
              "pieces=3 transform=t:1,0,0",
            ],
            "type": "Disassembly",
          }
        `)

    })
})