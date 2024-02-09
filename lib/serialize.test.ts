import {test, expect, describe} from "vitest"

import {deserialize, deserializeIgnoreErrors, serialize, Serializable, SerializedData, SerializableClass, registerClass} from "./serialize.ts"

// Classes to test out serializable classes
class A extends SerializableClass {
    func1() {
        return this.id
    }
}
class B extends SerializableClass {
    nested: A
    constructor(id: string | null, nested: A) {
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
    data: Serializable,
    serialized: SerializedData,
    expectedType: string
) {
    expect(serialize(data)).toEqual(serialized)
    expect(deserialize(serialized, expectedType)).toEqual(data)

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

    test("Objects", () => {
        serializeMatches(
            {a: 1, b: 2},
            {root: {
                type: "Object",
                data: {a: 1, b: 2},
            }},
            "Object"
        )
        serializeMatches(
            {a: 1, b: {
                c: 2
            }},
            {root: {
                type: "Object",
                data: {a: 1, b: {
                    type: "Object",
                    data: {c: 2}
                }},
            }},
            "Object"
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
        const serialized = {
            refs: {
                "a-1": {type: "A", data: {id: "a-1"}},
            },
            root: [
                {type: "A", id: "a-1"},
                {type: "A", id: "a-1"},
                {type: "A", id: "a-1"},
            ]
        }
        serializeMatches(
            [a, a, a],
            serialized,
            "Array"
        )
        // Ensure all copies are actually the same object
        const deserialized = deserialize(serialized, "Array") as A[]
        expect(deserialized[0]).toBe(deserialized[1])
        expect(deserialized[0]).toBe(deserialized[2])
    })

    test("inline class", () => {
        serializeMatches(
            new A(null),
            {
                root: {
                    type: "A",
                    data: {id: null}
                }
            },
            "A"
        )
        serializeMatches(
            new B(null, new A(null)),
            {
                root: {
                    type: "B",
                    data: {
                        id: null,
                        nested: {
                            type: "A",
                            data: {id: null}
                        }
                    }
                }
            },
            "B"
        )

        const a = new A(null)
        serializeMatches(
            [a, a],
            {
                root: [
                    {type: "A", data: {id: null}},
                    {type: "A", data: {id: null}},
                ]
            },
            "Array"
        )
    })

})

describe("class registration", () => {
    test("duplicate registration", () => {
        expect(() => {
            registerClass(A)
        }).toThrowError('Class "A" is already registered')
    })
})

describe("error on serialization", () => {

    test("unregistered class", () => {
        expect(() => {
            serialize(new Unregistered("u-1"))
        }).toThrowErrorMatchingInlineSnapshot(`
          "Serialization failed: Reference to unregistered class \\"Unregistered\\"
          Attribute path: root"
        `)
    })

    test("unsupported type", () => {
        expect(() => {
            serialize(undefined as unknown as Serializable)
        }).toThrowErrorMatchingInlineSnapshot(`
          "Serialization failed: Unsupported primitive type \\"undefined\\"
          Attribute path: root"
        `)
    })

    test("non-string Map keys", () => {
        expect(() => {
            serialize(
                new Map<number, number>([[1, 1]]) as unknown as Serializable
            )
        }).toThrowErrorMatchingInlineSnapshot(`
          "Serialization failed: Only string keys are supported for Map
          Attribute path: root.1"
        `)
    })

    test("error path reported correctly", () => {
        expect(() => {
            serialize(
                [
                    "foo",
                    new Map([[
                        "three", ["foo", "bar", undefined as unknown as Serializable]
                    ]])
                ]
            )
        }).toThrowErrorMatchingInlineSnapshot(`
          "Serialization failed: Unsupported primitive type \\"undefined\\"
          Attribute path: root.1.three.2"
        `)
        expect(() => {
            serialize(
                new B("b-1", new A(undefined as unknown as string))
            )
        }).toThrowErrorMatchingInlineSnapshot(`
          "Serialization failed: Unsupported primitive type \\"undefined\\"
          Attribute path: root.nested.id"
        `)
    })

    test.skip("circular references", () => {
        expect(() => {
            type RecursiveArray = Array<RecursiveArray>
            const a: RecursiveArray = []
            const b: RecursiveArray = [a]
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
            deserialize({} as unknown as SerializedData)
        }).toThrowError(formatError)
        expect(() => {
            deserialize(undefined as unknown as SerializedData)
        }).toThrowError(formatError)
        expect(() => {
            deserialize(null as unknown as SerializedData)
        }).toThrowError(formatError)
    })

    test("unsupported type", () => {
        expect(() => {
            deserialize({root: [undefined]} as unknown as SerializedData)
        }).toThrowErrorMatchingInlineSnapshot(`
          "Deserialization failed: Cannot deserialize type \\"undefined\\"
          Attribute path: root.0"
        `)
        expect(() => {
            deserialize({root: (arg1: string) => console.log(arg1)} as unknown as SerializedData)
        }).toThrowErrorMatchingInlineSnapshot(`
          "Deserialization failed: Cannot deserialize type \\"function\\"
          Attribute path: root"
        `)
    })

    test("unregistered class", () => {
        expect(() => {
            deserialize({
                refs: {
                    "u-1": {type: "Unregistered", data: {id: "u-1"}}
                },
                root: {type: "Unregistered", id: "u-1"}
            })
        }).toThrowErrorMatchingInlineSnapshot(`
          "Deserialization failed: Reference to unregistered class \\"Unregistered\\"
          Attribute path: root"
        `)
    })

    test("missing reference", () => {
        expect(() => {
            deserialize({
                refs: {},
                root: {type: "A", id: "a-1"}
            })
        }).toThrowErrorMatchingInlineSnapshot(`
          "Deserialization failed: Could not find reference for ID \\"a-1\\"
          Attribute path: root"
        `)
        expect(() => {
            deserialize({
                root: {type: "A", id: "a-1"}
            })
        }).toThrowErrorMatchingInlineSnapshot(`
          "Deserialization failed: Could not find reference for ID \\"a-1\\"
          Attribute path: root"
        `)
    })

    test("malformed object", () => {
        expect(() => {
            deserialize({
                root: {}
            } as unknown as SerializedData)
        }).toThrowErrorMatchingInlineSnapshot(`
          "Deserialization failed: Malformed data: No type attribute on object
          Attribute path: root"
        `)
        expect(() => {
            deserialize({
                root: {id: "a-1"}
            } as unknown as SerializedData)
        }).toThrowErrorMatchingInlineSnapshot(`
          "Deserialization failed: Malformed data: No type attribute on object
          Attribute path: root"
        `)
        expect(() => {
            deserialize({
                root: {type: "A"}
            } as unknown as SerializedData)
        }).toThrowErrorMatchingInlineSnapshot(`
          "Deserialization failed: Malformed data: No data or ID found in reference
          Attribute path: root"
        `)
    })

    test("error path reported correctly", () => {
        expect(() => {
            deserialize({
                refs: {
                    "b-1": {
                        type: "B",
                        data: {id: "b-1", nested: {type: "A", id: "a-1"}}
                    },
                    "a-1": {
                        type: "Z",
                    }
                },
                root: [
                    "hello",
                    {type: "B", id: "b-1"}
                ]
            } as unknown as SerializedData)
        }).toThrowErrorMatchingInlineSnapshot(`
          "Deserialization failed: Expected instance data to be an object, not undefined
          Attribute path: root.1.nested"
        `)
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

describe("deserialize safe mode", () => {
    test("error at root", () => {
        expect(
            deserializeIgnoreErrors(
                {} as unknown as SerializedData
            )
        ).toEqual(null)
        expect(
            deserializeIgnoreErrors(
                {
                    refs: {},
                    root: {}
                } as unknown as SerializedData
            )
        ).toEqual(null)
        expect(
            deserializeIgnoreErrors(
                {
                    refs: {},
                    root: {type: "UnregisteredClass", data: {}}
                } as unknown as SerializedData
            )
        ).toEqual(null)
    })
    test("error inside object", () => {
        expect(
            deserializeIgnoreErrors(
                {
                    refs: {},
                    root: ["foo", undefined]
                } as unknown as SerializedData
            )
        ).toEqual(["foo", null])
        expect(
            deserializeIgnoreErrors(
                {
                    refs: {},
                    root: ["bar", {
                        type: "Object",
                        data: {
                            foo: "bar",
                            baz: undefined
                        }
                    }]
                } as unknown as SerializedData
            )
        ).toEqual(["bar", {foo: "bar", baz: null}])
    })
})