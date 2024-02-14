import {test, expect, describe} from "vitest"

import {deserialize, deserializeIgnoreErrors, serialize, Serializable, SerializedData, SerializableClass, registerClass} from "./serialize.ts"

// Classes to test out serializable classes
class A extends SerializableClass {
    name: string

    constructor(name: string) {
        super()
        this.name = name
    }

    func1() {
        return this.name
    }
}
registerClass(A)

class B extends SerializableClass {
    name: string
    nested: A
    constructor(name: string, nested: A) {
        super()
        this.name = name
        this.nested = nested
    }
}
registerClass(B)

class Circular extends SerializableClass {
    name: string
    circle: SerializableClass | null
    constructor(name: string, circle: SerializableClass | null) {
        super()
        this.name = name
        this.circle = circle
    }
}
registerClass(Circular)

class NotSerializable extends SerializableClass {

    // @ts-expect-error: Not serializable classes should error when
    // typechecked.
    foo: string | undefined

    constructor(foo: string | undefined) {
        super()
        this.foo = foo
    }
}
registerClass(NotSerializable)

class Unregistered extends SerializableClass {
    name: string
    constructor(name: string) {
        super()
        this.name = name
    }
}

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
        serializeMatches(7, 7, "number")
        serializeMatches("seven", "seven", "string")
        serializeMatches(true, true, "boolean")
        serializeMatches(null, null, "null")
    })

    test("Array", () => {
        serializeMatches([], [], "Array")
        serializeMatches([7, "seven"], [7, "seven"], "Array")
        serializeMatches([[1], [2, [3]]], [[1], [2, [3]]], "Array")
    })

    test("Map", () => {
        serializeMatches(
            new Map<string, number>([["one", 1]]),
            {
                type: "Map",
                data: {"one": 1}
            },
            "Map"
        )
        serializeMatches(
            new Map<string, number[]>([["one", [1, 2, 3]]]),
            {
                type: "Map",
                data: {"one": [1, 2, 3]}
            },
            "Map"
        )
    })

    test("Objects", () => {
        serializeMatches(
            {a: 1, b: 2},
            {
                type: "Object",
                data: {a: 1, b: 2},
            },
            "Object"
        )
        serializeMatches(
            {a: 1, b: {
                c: 2
            }},
            {
                type: "Object",
                data: {a: 1, b: {
                    type: "Object",
                    data: {c: 2}
                }},
            },
            "Object"
        )
    })

    test("SerializableClass instances", () => {
        serializeMatches(
            new A("a-1"),
            {
                type: "A", data: {name: "a-1"}
            },
            "A"
        )
    })

    test("nested SerializableClass instances", () => {
        serializeMatches(
            new B("b-1", new A("a-1")),
            {
                type: "B",
                data: {
                    name: "b-1",
                    nested: {
                        type: "A",
                        data: {
                            name: "a-1"
                        }
                    }
                }
            },
            "B"
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
        expect(() => {
            serialize(new NotSerializable(undefined))
        }).toThrowErrorMatchingInlineSnapshot(`
          "Serialization failed: Unsupported primitive type \\"undefined\\"
          Attribute path: root.foo"
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
          Attribute path: root.nested.name"
        `)
    })

    test("duplicate references", () => {
        const obj = {}
        const array: string[] = []
        expect(() => {
            serialize([obj, obj])
        }).toThrowErrorMatchingInlineSnapshot(`
          "Serialization failed: Object referenced twice (same object as root.0)
          Attribute path: root.1"
        `)
        expect(() => {
            serialize([array, array])
        }).toThrowErrorMatchingInlineSnapshot(`
          "Serialization failed: Object referenced twice (same object as root.0)
          Attribute path: root.1"
        `)
    })

    test("circular references", () => {
        expect(() => {
            type RecursiveArray = Array<RecursiveArray>
            const a: RecursiveArray = []
            const b: RecursiveArray = [a]
            a.push(b)
            serialize(a)
        }).toThrowErrorMatchingInlineSnapshot(`
          "Serialization failed: Object referenced twice (same object as root)
          Attribute path: root.0.0"
        `)
        expect(() => {
            const a = new Circular("c-1", null)
            a.circle = a
            serialize(a)
        }).toThrowErrorMatchingInlineSnapshot(`
          "Serialization failed: Object referenced twice (same object as root)
          Attribute path: root.circle"
        `)
    })

})

describe("deserialization error", () => {

    test("unsupported type", () => {
        expect(() => {
            deserialize([undefined as unknown as SerializedData])
        }).toThrowErrorMatchingInlineSnapshot(`
          "Deserialization failed: Cannot deserialize type \\"undefined\\"
          Attribute path: root.0"
        `)
        expect(() => {
            deserialize(((arg1: string) => console.log(arg1)) as unknown as SerializedData)
        }).toThrowErrorMatchingInlineSnapshot(`
          "Deserialization failed: Cannot deserialize type \\"function\\"
          Attribute path: root"
        `)
    })

    test("unregistered class", () => {
        expect(() => {
            deserialize({
                type: "Unregistered",
                data: {name: "u-1"}
            })
        }).toThrowErrorMatchingInlineSnapshot(`
          "Deserialization failed: Reference to unregistered class \\"Unregistered\\"
          Attribute path: root"
        `)
    })

    test("malformed object", () => {
        expect(() => {
            deserialize({} as unknown as SerializedData)
        }).toThrowErrorMatchingInlineSnapshot(`
          "Deserialization failed: Malformed data: No type attribute on object
          Attribute path: root"
        `)
        expect(() => {
            deserialize({name: "a-1"} as unknown as SerializedData)
        }).toThrowErrorMatchingInlineSnapshot(`
          "Deserialization failed: Malformed data: No type attribute on object
          Attribute path: root"
        `)
        expect(() => {
            deserialize({type: "A"} as unknown as SerializedData)
        }).toThrowErrorMatchingInlineSnapshot(`
          "Deserialization failed: Required data attribute missing
          Attribute path: root"
        `)
    })

    test("error path reported correctly", () => {
        expect(() => {
            deserialize(
                [
                    "hello",
                    {
                        type: "B",
                        data: {
                            name: "b-1",
                            nested: {
                                type: "A",
                            }
                        }
                    }
                ]
            )
        }).toThrowErrorMatchingInlineSnapshot(`
          "Deserialization failed: Required data attribute missing
          Attribute path: root.1.nested"
        `)
    })

})

describe("unexpected type error", () => {

    test("primitive values", () => {
        expect(() => {
            deserialize(7, "aoeu")
        }).toThrowError('Expected "aoeu" after deserializing, not "number"')
        expect(() => {
            deserialize("seven", "aoeu")
        }).toThrowError('Expected "aoeu" after deserializing, not "string"')
        expect(() => {
            deserialize(true, "aoeu")
        }).toThrowError('Expected "aoeu" after deserializing, not "boolean"')
        expect(() => {
            deserialize(null, "aoeu")
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
                ["foo", undefined as unknown as SerializedData]
            )
        ).toEqual(["foo", null])
        expect(
            deserializeIgnoreErrors([
                "bar", {
                    type: "Object",
                    data: {
                        foo: "bar",
                        baz: undefined
                    }
                }
            ])
        ).toEqual(["bar", {foo: "bar", baz: null}])
    })
})