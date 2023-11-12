import {test, expect, describe} from "vitest"

import {deserialize, serialize, SerializableType, SerializedData, SerializableClass, registerClass} from "./serialize"

// Classes to test out serializable classes
class A extends SerializableClass {
    func1() {
        return this.id
    }
}
class B extends SerializableClass {
    nested: A
    constructor(id: string, nested: A) {
        super(id)
        this.nested = nested
    }
}
class Circular extends SerializableClass {
    circle: SerializableClass | null
    constructor(id: string, circle: SerializableClass | null) {
        super(id)
        this.circle = circle
    }
}
class Unregistered extends SerializableClass {}
registerClass(A)
registerClass(B)
registerClass(Circular)

/**
 * Test serialization and deserialization matches expected values, given the
 * input data to serialize and the resuting serializable object.
 */
function serializeMatches(
    data: SerializableType,
    serialized: SerializedData,
    expectedType: string
) {
    expect(serialize(data)).toMatchObject(serialized)
    expect(deserialize(serialized, expectedType)).toMatchObject(data as any)
    
    // `serialized` object must convertable to a string via `JSON.stringify()`
    JSON.stringify(serialized)
}


describe("serialization and deserialization of", () => {
    test("primitive values", () => {
        serializeMatches(7, {root: 7}, "number")
        serializeMatches("seven", {root: "seven"}, "string")
        serializeMatches(true, {root: true}, "boolean")
        serializeMatches(null, {root: null}, "null")
    })

    test("Array", () => {
        serializeMatches([], {root: []}, "Array")
        serializeMatches([7, "seven"], {root: [7, "seven"]}, "Array")
        serializeMatches([[1], [2, [3]]], {root: [[1], [2, [3]]]}, "Array")
    })

    test("Map", () => {
        serializeMatches(
            new Map<string, number>([["one", 1]]),
            {
                root: {
                    type: "Map",
                    data: {"one": 1}
                }
            },
            "Map"
        )
        serializeMatches(
            new Map<string, number[]>([["one", [1, 2, 3]]]),
            {
                root: {
                    type: "Map",
                    data: {"one": [1, 2, 3]}
                }
            },
            "Map"
        )
    })

    test("SerializableClass instances", () => {
        serializeMatches(
            new A("a-1"),
            {
                refs: {
                    "a-1": {type: "A", data: {id: "a-1"}}
                },
                root: {type: "A", id: "a-1"}
            },
            "A"
        )
    })
    test("nested SerializableClass instances", () => {
        serializeMatches(
            new B("b-1", new A("a-1")),
            {
                refs: {
                    "a-1": {type: "A", data: {id: "a-1"}},
                    "b-1": {type: "B", data: {id: "b-1", nested: {type: "A", id: "a-1"}}},
                },
                root: {type: "B", id: "b-1"}
            },
            "B"
        )
    })

    test("reference deduplication", () => {
        const a = new A("a-1")
        serializeMatches(
            [a, a, a],
            {
                refs: {
                    "a-1": {type: "A", data: {id: "a-1"}},
                },
                root: [
                    {type: "A", id: "a-1"},
                    {type: "A", id: "a-1"},
                    {type: "A", id: "a-1"},
                ]
            },
            "Array"
        )
    })

})

test("duplicate registration", () => {
    expect(() => {
        registerClass(A)
    }).toThrowError('Class "A" is already registered')
})

describe("serialization error", () => {
    test("unregistered class", () => {
        expect(() => {
            serialize(new Unregistered("u-1") as any)
        }).toThrowError(
            'Reference to unregistered class "Unregistered"'
        )
    })
    test("unsupported type", () => {
        expect(() => {
            serialize(undefined as any)
        }).toThrowError(
            'Unsupported primitive type "undefined"'
        )
        expect(() => {
            serialize({} as any)
        }).toThrowError(
            'Non-class objects cannot be serialized'
        )
    })
    test.skip("circular references", () => {
        expect(() => {
            const a: any = []
            const b : any= [a]
            a.push(b)
            serialize(a)
        }).toThrowError("Circular reference in data")
        expect(() => {
            const a = new Circular("c-1", null)
            a.circle = a
            serialize(a)
        }).toThrowError("Circular reference in data")
    })
})

describe("deserialization error", () => {
    test("malformed root data", () => {
        const formatError = 'Incorrectly formatted data. Expected object with "root" attribute.'
        expect(() => {
            deserialize({} as any)
        }).toThrowError(formatError)
        expect(() => {
            deserialize(undefined as any)
        }).toThrowError(formatError)
        expect(() => {
            deserialize(null as any)
        }).toThrowError(formatError)
    })
    test("unsupported type", () => {
        expect(() => {
            deserialize({root: [undefined]})
        }).toThrowError(
            'Cannot deserialize type "undefined"'
        )
        expect(() => {
            deserialize({root: (arg1: string) => console.log(arg1)})
        }).toThrowError(
            'Cannot deserialize type "function"'
        )
    })
    test("unregistered class", () => {
        expect(() => {
            deserialize({
                refs: {
                    "u-1": {type: "Unregistered", data: {id: "u-1"}}
                },
                root: {type: "Unregistered", id: "u-1"}
            })
        }).toThrowError('Reference to unregistered class "Unregistered"')
    })
    test("missing reference", () => {
        expect(() => {
            deserialize({
                refs: {},
                root: {type: "A", id: "a-1"}
            })
        }).toThrowError('Could not find reference for ID "a-1"')
        expect(() => {
            deserialize({
                root: {type: "A", id: "a-1"}
            })
        }).toThrowError('Could not find reference for ID "a-1"')
    })
    test("malformed object", () => {
        expect(() => {
            deserialize({
                root: {}
            })
        }).toThrowError("Malformed data: No type attribute on object")
        expect(() => {
            deserialize({
                root: {id: "a-1"}
            })
        }).toThrowError("Malformed data: No type attribute on object")
        expect(() => {
            deserialize({
                root: {type: "A"}
            })
        }).toThrowError("Malformed data: No data or ID found in reference")
    })
})

describe("unexpected type error", () => {
    test("primitive values", () => {
        expect(() => {
            deserialize({root: 7}, "aoeu")
        }).toThrowError('Expected "aoeu" after deserializing, not "number"')
        expect(() => {
            deserialize({root: "seven"}, "aoeu")
        }).toThrowError('Expected "aoeu" after deserializing, not "string"')
        expect(() => {
            deserialize({root: true}, "aoeu")
        }).toThrowError('Expected "aoeu" after deserializing, not "boolean"')
        expect(() => {
            deserialize({root: null}, "aoeu")
        }).toThrowError('Expected "aoeu" after deserializing, not "null"')
    })
})