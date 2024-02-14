/**
 * Serialization framework
 *
 * This can serialize and deserialize most common types, including objects and
 * classes. Trying to serialize something not serializable should be caught
 * statically by typescript. To see what types may be serialized, see the
 * `Serializable` type. Classes must be registered upfront.
 *
 * To serialize:
 *     1. Pass any serializable type into `serialize`
 *     2. If you want the serialized form to be a string instead of an object,
 *        use `JSON.stringify()`
 *
 * To deserialize:
 *     * Pass the return value of `serialize()` to `deserialize()`
 *
 * To make a class serializable:
 *     * Extend it from `SerializableClass`
 *     * Register it with `registerClass()`
 *
 * Example usage of registered classes:
 *
 *     import { SerializableClass, registerClass, serialize, deserialize } from "~/lib/serialize.ts"
 *
 *     class MyClass extends SerializableClass {
 *
 *         // Make attributes as normal, including other subclasses of
 *         // SerializableClass. Non-serializable types will throw a type error
 *         label: string
 *
 *         constructor(label: string) {
 *             super()
 *             this.label = label
 *         }
 *     }
 *
 *     // Register with the serializer
 *     // Note that before deserializing, you need to make sure the same code
 *     // is run to define and register the class, or you'll get an error that
 *     // the class you're trying to deserialize isn't registered.
 *     registerClass(MyClass)
 *
 *     const instance = new MyClass("Hello, world!")
 *     const serialized = serialize(instance)
 *     const deserialized = deserialize<MyClass>(serialized, "MyClass")
 *
 *     console.log(deserialized.label)  // "Hello, world!"
 *
 *
 * ## Caveat: Constructors and adding new attributes
 *
 * Deserializing a class does not call the constructor. Instead, it creates an
 * object with the same attributes and sets the prototype. This has two
 * consequences:
 *
 *     * The constructor is not called
 *
 *     * Added attributes will be undefined: Suppose you serialize a class,
 *     then at a later date add attributes to that class. If you then try to
 *     deserialize, the class will have those attributes set to `undefined`.
 *
 *
 * ## Caveat: Vue reactivity typing
 *
 * Using vue's `ref` or `reactive` doesn't play nicely with recursive
 * types. You might get the error:
 *
 *     Type instantiation is excessively deep and possibly infinite.
 *
 * When passing a SerializableClass instance into `ref` or `reactive`, you
 * should instead do some casting to make the types come out correctly:
 *
 *     class MyClass extends SerializableClass { }
 *
 *     // `reactive` unrolls the types to be infinitely deep
 *     const c0 = reactive(new MyClass("myclass-0"))
 *
 *     // Casting like this fixes the issue sometimes
 *     const c1 = reactive(new MyClass("myclass-1")) as MyClass
 *
 *     // Casting to `never` then back should always work
 *     const c2 = reactive(new MyClass("myclass-1") as never) as MyClass
 *
 *
 * ## Requirements
 *
 * This framework has the following requirements, which it hopefully meets:
 *     * Human-readable serialized format
 *     * Make it super easy to write new classes (no manually writing serialize
 *       and deserialize methods for each class).
 *
 * Things we're not particularly concerned about:
 *     * Speed
 *     * Supporting duplicates of objects - Currently if the same object is
 *       used twice, serialization will error.
 *
 *
 * ## Future plans
 *   * Allow for classes to have custom `serialize()` / `deserialize()` methods
 *     (and move the current class serialization code to the base class).
 *   * User registration of classes / types that don't inherit from
 *     `SerializableClass` (manually passing in a serialize / deserialize func).
 *   * List of expected types passed to `deserialize()`, not just one.
 */

class SerializerError extends Error {
    path: string[] | null

    constructor(message: string) {
        super(message)
        this.path = null
    }

    setErrorPath(path: string[]) {
        this.path = path
        this.message += `\nAttribute path: ${path.join(".")}`
    }

    setSerialize() {
        this.message = `Serialization failed: ${this.message}`
    }

    setDeserialize() {
        this.message = `Deserialization failed: ${this.message}`
    }
}


////////////////////////////////////
////////// Exported Types //////////
////////////////////////////////////

/* Resulting data structure after serialization */
export type SerializedData = string | number | boolean | null |
    SerializedData[] |
    {type: string, data: object}

/**
 * Any type which can be serialized. Add to this when built-in types are
 * implemented, and they will automatically pass typechecks in
 * SerializableClass subclasses.
 */
export type Serializable = number | string | boolean | null |
    SerializableObject |
    SerializableClass |
    Serializable[] |
    Map<string, Serializable>

/**
 * Subclass this and use `registerClass` to make a class serializable. If you
 * use attributes which cannot be serialized, a type error should occur.
 */
export abstract class SerializableClass {
    // eslint-disable-next-line @typescript-eslint/ban-types
    [s: string]: Serializable | Function
}


///////////////////////////////////
////////// Serialization //////////
///////////////////////////////////

type SerializableObject = {[key: string]: Serializable}

/* Return an object which can be passed to JSON.stringify to serialize. */
export function serialize(value: Serializable): SerializedData {
    const path: string[] = []
    let root
    try {
        root = _serializeNode(value, path, "root", new Map())
    } catch(e) {
        if(e instanceof SerializerError) {
            e.setSerialize()
            e.setErrorPath(path)
        }
        throw e
    }
    return root
}

function _serializeNode(
    value: Serializable,
    path: string[],
    attribute: string,
    seenObjectPaths: Map<Serializable, string>,
): SerializedData {

    function getClassData(value: SerializableClass | SerializableObject) {
        const data: {[k: string]: SerializedData} = {}
        for(const [k, v] of Object.entries(value)) {
            if(typeof v !== "function") {
                data[k] = _serializeNode(v, path, k, seenObjectPaths)
            }
        }
        return data
    }


    let errorFlag = false
    try {
        path.push(attribute)

        if(
            typeof value === "string" ||
            typeof value === "number" ||
            typeof value === "boolean" ||
            value === null
        ) {
            return value
        }

        if(typeof value !== "object") {
            throw new SerializerError(`Unsupported primitive type "${typeof value}"`)
        }

        if(seenObjectPaths.has(value)) {
            const duplicatePath = seenObjectPaths.get(value)
            throw new SerializerError(`Object referenced twice (same object as ${duplicatePath})`)
        }
        seenObjectPaths.set(value, path.join("."))

        // Array
        if(value instanceof Array) {
            return value.map(
                (item: Serializable, i: number) =>
                _serializeNode(item, path, String(i), seenObjectPaths)
            )
        }

        // Map
        if(value instanceof Map) {
            const entries: {[key: string | number]: SerializedData} = {}
            for(const [k, v] of value.entries()) {
                if(typeof k !== "string") {
                    path.push(k)
                    throw new SerializerError("Only string keys are supported for Map")
                }
                entries[k] = _serializeNode(v, path, k, seenObjectPaths)
            }
            return {
                type: "Map",
                data: entries,
            }
        }

        // Object
        const type = value.constructor.name
        if(value.constructor.name === "Object") {
            const data = getClassData(value)
            return {type: "Object", data}
        }

        // Registered class
        const classInfo = getRegisteredClass(type)
        if(classInfo !== null) {
            value = value as SerializableClass
            const data = getClassData(value)
            return {type, data}
        }

        if(type === "Object") {
            throw new SerializerError("Non-class objects cannot be serialized")
        }

        throw new SerializerError(`Reference to unregistered class "${type}"`)

    } catch(e) {
        errorFlag = true
        throw e
    } finally {
        if(!errorFlag) {
            path.pop()
        }
    }
}


/////////////////////////////////////
////////// Deserialization //////////
/////////////////////////////////////

/* Produce the original serialized object passed to `serialize` given its
 * output.
 *
 * If expectedType is given, it's checked against the return value and an
 * error is thrown if they don't match. Pass in a class name, or for primitive
 * types the expected output of a typeof call.
 */
export function deserialize<T extends Serializable>(
    data: SerializedData,
    expectedType?: string,
    _ignoreErrors=false,
): T {
    try {
        const path: string[] = []
        let value
        try {
            value = _deserializeNode(data, path, "root", _ignoreErrors)
        } catch(e) {
            if(e instanceof SerializerError) {
                e.setDeserialize()
                e.setErrorPath(path)
            }
            throw e
        }

        if(expectedType !== undefined) {
            const actualType =
                value === null ? "null" :
                typeof value === "object" ? value.constructor.name :
                typeof value
            if(actualType !== expectedType) {
                throw new SerializerError(
                    `Expected "${expectedType}" after deserializing, not "${actualType}"`
                )
            }
        }

        return value as T

    } catch(e) {
        if(_ignoreErrors) {
            return null as T
        } else {
            throw e
        }
    }
}

/**
 * Like `deserialize()`, but any part of data that fails to deserialize is
 * replaced with `null`.
 *
 * You probably don't want to call this unless you've already tried
 * `deserialize()` and it has failed. You can use safe mode to pull out parts
 * of the data that aren't causing the error. Just remember, any attribute you
 * access could potentially be `null`, so you'll have to carefully check for
 * this. The root return value itself could also be `null`!
 */
export function deserializeIgnoreErrors(data: SerializedData): Serializable {
    return deserialize(data, undefined, true)
}

function _deserializeNode(
    data: SerializedData,
    path: string[],
    attribute: string,
    ignoreErrors: boolean
): Serializable {
    let errorFlag = false
    try {
        path.push(attribute)

        if(
            typeof data === "string" ||
            typeof data === "number" ||
            typeof data === "boolean" ||
            data === null
        ) {
            return data
        }

        if(Array.isArray(data)) {
            return data.map(
                (x: SerializedData, i: number) =>
                _deserializeNode(x, path, String(i), ignoreErrors)
            )
        }

        if(typeof data !== "object") {
            throw new SerializerError(`Cannot deserialize type "${typeof data}"`)
        }

        if(data.type === undefined) {
            throw new SerializerError(`Malformed data: No type attribute on object`)
        }

        // Get data, either here inline or from refs
        let obj: Serializable
        if(!("data" in data)) {
            throw new SerializerError("Required data attribute missing")
        }
        const objData = data.data
        if(typeof objData !== "object") {
            throw new SerializerError(`Expected data to be an object, not ${typeof objData}`)
        }

        // Map
        if(data.type === "Map") {
            const map: Map<string, Serializable> = new Map()
            for(const [key, value] of Object.entries(objData)) {
                map.set(key, _deserializeNode(value, path, key, ignoreErrors))
            }
            obj = map

        // Object
        } else if(data.type === "Object") {
            obj = {}
            for(const [key, value] of Object.entries(objData)) {
                obj[key] = _deserializeNode(value, path, key, ignoreErrors)
            }

        // Registered class
        } else {
            const classInfo = getRegisteredClass(data.type)
            if(classInfo === null) {
                throw new SerializerError(`Reference to unregistered class "${data.type}"`)
            }
            obj = {}
            for(const [key, value] of Object.entries(objData)) {
                obj[key] = _deserializeNode(value, path, key, ignoreErrors)
            }
            Object.setPrototypeOf(obj, classInfo.cls.prototype)
        }

        return obj

    } catch(e) {
        errorFlag = true
        if(ignoreErrors) {
            return null
        } else {
            throw e
        }
    } finally {
        if(!errorFlag) {
            path.pop()
        }
    }
}


////////////////////////////////////////
////////// Class Registration //////////
////////////////////////////////////////

type ClassInfo = {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    cls: { new(...args: any[]): SerializableClass },
}

const registeredClasses: {[name: string]: ClassInfo} = {}

/* Register a class, required before a `serialize` or `deserialize` call is
 * made containing a class instance of a given type. */
export function registerClass(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    cls: { new(...args: any[]): SerializableClass },
): void {
    if(registeredClasses[cls.name] !== undefined) {
        throw new Error(`Class "${cls.name}" is already registered`)
    }
    registeredClasses[cls.name] = {cls}
}

/* Return classInfo passed to `registerClass` for the given class name, or null
 * if a class with the given name has not been registered. */
function getRegisteredClass(name: string): ClassInfo | null {
    return registeredClasses[name] || null
}