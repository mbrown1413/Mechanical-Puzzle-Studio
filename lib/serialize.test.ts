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

class ClassWithTypeProperty extends SerializableClass {
    type: string

    constructor(type: string) {
        super()
        this.type = type
    }
}
registerClass(ClassWithTypeProperty)

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
    foo: string | Map<unknown, unknown>

    constructor(foo: string | Map<unknown, unknown>) {
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

    test("Objects", () => {
        serializeMatches(
            {},
            {},
            "Object"
        )
        serializeMatches(
            {a: 1, b: 2},
            {a: 1, b: 2},
            "Object"
        )
        serializeMatches(
            {
                a: 1,
                b: {c: 2}
            },
            {
                a: 1,
                b: {
                    c: 2,
                },
            },
            "Object"
        )
        serializeMatches(
            {a: 1, b: undefined},
            {a: 1},
            "Object"
        )
    })

    test("Objects with type property", () => {
        serializeMatches(
            {type: "foo"},
            {_type: "foo"},
            "Object"
        )
        serializeMatches(
            {type: "foo", _type: "bar"},
            {_type: "foo", __type: "bar"},
            "Object"
        )
    })

    test("SerializableClass instances", () => {
        serializeMatches(
            new A("a-1"),
            {
                type: "A",
                name: "a-1"
            },
            "A"
        )
    })

    test("SerializableClass instances with type property", () => {
        serializeMatches(
            new ClassWithTypeProperty("foo-type"),
            {
                type: "ClassWithTypeProperty",
                _type: "foo-type"
            },
            "ClassWithTypeProperty"
        )
    })

    test("nested SerializableClass instances", () => {
        serializeMatches(
            new B("b-1", new A("a-1")),
            {
                type: "B",
                name: "b-1",
                nested: {
                    type: "A",
                    name: "a-1"
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
          [Error: Serialization failed: Reference to unregistered class "Unregistered"
          Attribute path: root]
        `)
    })

    test("unsupported type", () => {
        expect(() => {
            serialize(undefined as unknown as Serializable)
        }).toThrowErrorMatchingInlineSnapshot(`
          [Error: Serialization failed: Unsupported primitive type "undefined"
          Attribute path: root]
        `)
        expect(() => {
            serialize(new NotSerializable(new Map()))
        }).toThrowErrorMatchingInlineSnapshot(`
          [Error: Serialization failed: Reference to unregistered class "Map"
          Attribute path: root.foo]
        `)
        expect(() => {
            serialize(new Map() as unknown as Serializable)
        }).toThrowErrorMatchingInlineSnapshot(`
          [Error: Serialization failed: Reference to unregistered class "Map"
          Attribute path: root]
        `)
    })

    test("error path reported correctly", () => {
        expect(() => {
            serialize(
                [
                    "foo",
                    {
                        three: ["foo", "bar", undefined as unknown as Serializable]
                    }
                ]
            )
        }).toThrowErrorMatchingInlineSnapshot(`
          [Error: Serialization failed: Unsupported primitive type "undefined"
          Attribute path: root.1.three.2]
        `)
        expect(() => {
            serialize(
                new B("b-1", new A(new Map() as unknown as string))
            )
        }).toThrowErrorMatchingInlineSnapshot(`
          [Error: Serialization failed: Reference to unregistered class "Map"
          Attribute path: root.nested.name]
        `)
    })

    test("duplicate references", () => {
        const obj = {}
        const array: string[] = []
        expect(() => {
            serialize([obj, obj])
        }).toThrowErrorMatchingInlineSnapshot(`
          [Error: Serialization failed: Object referenced twice (same object as root.0)
          Attribute path: root.1]
        `)
        expect(() => {
            serialize([array, array])
        }).toThrowErrorMatchingInlineSnapshot(`
          [Error: Serialization failed: Object referenced twice (same object as root.0)
          Attribute path: root.1]
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
          [Error: Serialization failed: Object referenced twice (same object as root)
          Attribute path: root.0.0]
        `)
        expect(() => {
            const a = new Circular("c-1", null)
            a.circle = a
            serialize(a)
        }).toThrowErrorMatchingInlineSnapshot(`
          [Error: Serialization failed: Object referenced twice (same object as root)
          Attribute path: root.circle]
        `)
    })

})

describe("deserialization error", () => {

    test("unsupported type", () => {
        expect(() => {
            deserialize([undefined as unknown as SerializedData])
        }).toThrowErrorMatchingInlineSnapshot(`
          [Error: Deserialization failed: Cannot deserialize type "undefined"
          Attribute path: root.0]
        `)
        expect(() => {
            deserialize(((arg1: string) => console.log(arg1)) as unknown as SerializedData)
        }).toThrowErrorMatchingInlineSnapshot(`
          [Error: Deserialization failed: Cannot deserialize type "function"
          Attribute path: root]
        `)
    })

    test("unregistered class", () => {
        expect(() => {
            deserialize({
                type: "Unregistered",
                name: "u-1"
            })
        }).toThrowErrorMatchingInlineSnapshot(`
          [Error: Deserialization failed: Reference to unregistered class "Unregistered"
          Attribute path: root]
        `)
    })

    test("error path reported correctly", () => {
        expect(() => {
            deserialize(
                [
                    "hello",
                    {
                        type: "B",
                        name: "b-1",
                        nested: new Map() as unknown as SerializedData
                    }
                ]
            )
        }).toThrowErrorMatchingInlineSnapshot(`
          [Error: Deserialization failed: Cannot deserialize type "Map"
          Attribute path: root.1.nested]
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
                new Map() as unknown as SerializedData
            )
        ).toEqual(null)
        expect(
            deserializeIgnoreErrors(
                new Map() as unknown as SerializedData
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
                "bar",
                {
                    foo: "bar",
                    baz: {type: "Foo"},
                }
            ])
        ).toEqual([
            "bar",
            {
                foo: "bar",
                baz: null
            }
        ])
    })
})