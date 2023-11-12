/**
 * Serialization framework
 *
 * This requires you to register classes upfront, but it makes it super easy to
 * implement serializable classes. You just can't use non-serializable
 * attributes, which is all enforced via typescript.
 * 
 * To serialize:
 *     1. pass any serializable type into `serialize`
 *     2. If you want a string instead of an object, use `JSON.stringify()`
 *
 * To deserialize:
 *     * Pass the return value of `serialize()` to `deserialize()`
 * 
 * To make a class serializable:
 *     * Extend it from `SerializableClass`
 *     * Register it with `registerClass()`
 * 
 * Example usage:
 * 
 *     import { SerializableClass, registerClass, serialize, deserialize } from "./serialize.ts"
 *     
 *      class MyClass extends SerializableClass {
 *      
 *          // Make attributes as normal, including other subclasses of
 *          // SerializableClass. Non-serializable types will throw a type error
 *          label: string
 *      
 *          constructor(id: string, label: string) {
 *              super(id)  // Superclass takes a required `id` argument
 *              this.label = label
 *          }
 *      }
 *      
 *      // Register with the serializer
 *      // Note that before deserializing, you need to make sure the same code
 *      // is run to define and register the class, or you'll get an error that
 *      // the class you're trying to deserialize isn't registered.
 *      registerClass(MyClass)
 *      
 *      const instance = new MyClass("myclass-0", "Hello, world!")
 *      const serialized = serialize(instance)
 *      const deserialized = deserialize<MyClass>(serialized, "MyClass")
 *
 *      console.log(deserialized.label)  // "Hello, world!"
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
 *     // Casting to `any` then back should always work
 *     const c2 = reactive(new MyClass("myclass-1") as any) as MyClass
 *      
 *      
 * ## Requirements
 * 
 * This framework has the following requirements, which it hopefully meets:
 *     * Human-readable serialized format
 *     * Make it super easy to write new classes (no manually writing serialize
 *       and deserialize methods for each class).
 *     * Only store a single copy of an instance when it's referenced multiple
 *       times.
 *       
 * Things we're not particularly concerned about:
 *     * Speed
 *     * Circular references (for now at least)
 *
 *
 * ## Future plans
 *   * Allow for classes to have custom `serialize()` / `deserialize()` methods
 *     (and move the current class serialization code to the base class).
 *   * User registration of classes / types that don't inherit from
 *     `SerializableClass` (manually passing in a serialize / deserialize func).
 *   * List of expected types passed to `deserialize()`, not just one.
 */


///////////////////////////////////
////////// Serialization //////////
///////////////////////////////////

/* These are primitives which can be passed directly to be JSON serialized */
const passthroughPrimitives = ["string", "number", "boolean"]

/* Maps a serializable class's ID to it's type and serialized data. */
type RefData = {
    [id: string]: {
        type: string,
        data: {[k: string]: SerializableType},
    }
}

/* Resulting data structure after serialization */
export type SerializedData = {
    root: any,
    refs?: RefData,
}

/**
 * Any type which can be serialized. Add to this when built-in types are
 * implemented, and they will automatically pass typechecks in
 * SerializableClass subclasses.
 */
export type SerializableType = number | string | boolean | null |
    SerializableClass |
    SerializableType[] |
    Map<string, SerializableType>

/**
 * Subclass this and use `registerClass` to make a class serializable. If you
 * use attributes which cannot be serialized, a type error should occur.
 */
export abstract class SerializableClass {
    readonly id: string
    [s: string]: SerializableType | Function

    constructor(id: string) {
        this.id = id
    }
}

/* Return an object which can be passed to JSON.stringify to serialize. */
export function serialize(value: SerializableType): SerializedData {
    const refs: RefData = {}
    const root = _serialize(value, refs)
    const ret: SerializedData = {root}
    if(Object.keys(refs).length) {
        ret.refs = refs
    }
    return ret
}

function _serialize(value: SerializableType, refs: RefData): any {
    if(passthroughPrimitives.includes(typeof value) || value === null) {
        return value
    }

    if(typeof value === "object") {
        // Array
        if(value instanceof Array) {
            return value.map(
                (item: SerializableType) => _serialize(item, refs)
            )
        }

        // Map
        if(value instanceof Map) {
            const entries: {[key: string | number]: SerializableType} = {}
            for(const [k, v] of value.entries()) {
                entries[_serialize(k, refs)] = _serialize(v, refs)
            }
            return {
                type: "Map",
                data: entries,
            }
        }

        // Registered class
        const type = value.constructor.name
        const classInfo = getRegisteredClass(type)
        if(classInfo !== null) {
            if(refs[value.id] === undefined) {
                value = value as SerializableClass
                const data: {[k: string]: SerializableType} = {}
                for(let [k, v] of Object.entries(value)) {
                    if(typeof v !== "function") {
                        data[k] = _serialize(v, refs)
                    }
                }
                refs[value.id] = {type, data}
            }
            return {type, id: value.id}
        }
        
        if(type === "Object") {
            throw "Non-class objects cannot be serialized"
        }

        throw `Reference to unregistered class "${type}"`
    }

    throw `Unsupported primitive type "${typeof value}"`
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
export function deserialize<T extends SerializableType>(
    data: SerializedData,
    expectedType?: string
): T {
    const dataRootTypeError = 'Incorrectly formatted data. Expected object with "root" attribute.'
    if(typeof data !== "object" || data === null || data.root === undefined) {
        throw dataRootTypeError
    }
    const refs = data.refs || {}
    const value = _deserialize(data.root, refs, new Map())

    if(expectedType !== undefined) {
        const actualType =
            value === null ? "null" :
            typeof value === "object" ? value.constructor.name :
            typeof value
        if(actualType !== expectedType) {
            throw `Expected "${expectedType}" after deserializing, not "${actualType}"`
        }
    }

    return value as T
}

function _deserialize(data: any, refs: RefData, cache: Map<string, SerializableType>): SerializableType {
    if(passthroughPrimitives.includes(typeof data) || data === null) {
        return data
    }

    if(Array.isArray(data)) {
        return data.map(
            (x: SerializableType) => _deserialize(x, refs, cache)
        )
    }

    if(typeof data === "object") {
        if(data.type === undefined) {
            throw `Malformed data: No type attribute on object`
        }
        
        // Read data either directly, or from refs
        if(data.id !== undefined) {
            // Check if we already deserialized the object with this ID
            const obj = cache.get(data.id)
            if(obj !== undefined) {
                return obj
            }
        }

        // Get data, either here inline or from refs
        let obj: any
        let objData
        if(data.data !== undefined) {
            objData = data.data
        } else if(data.id !== undefined) {
            const ref = refs[data.id]
            if(ref === undefined) {
                throw `Could not find reference for ID "${data.id}"`
            }
            objData = ref.data
        } else {
            throw "Malformed data: No data or ID found in reference"
        }

        // Map
        if(data.type === "Map") {
            const map: Map<SerializableType, SerializableType> = new Map()
            for(const [k, v] of Object.entries(objData)) {
                map.set(_deserialize(k, refs, cache), _deserialize(v, refs, cache))
            }
            obj = map
        }

        // Ref to registered class
        if(data.id !== undefined) {
            const classInfo = getRegisteredClass(data.type)
            if(classInfo === null) {
                throw `Reference to unregistered class "${data.type}"`
            }
            obj = {}
            const ref = refs[data.id]
            for(const [key, value] of Object.entries(ref.data)) {
                obj[key] = _deserialize(value, refs, cache)
            }
            Object.setPrototypeOf(obj, classInfo.cls.prototype)
        }
        
        if(data.id !== undefined) {
            cache.set(data.id, obj)
        }
        return obj
    }
    throw `Cannot deserialize type "${typeof data}"`
}


////////////////////////////////////////
////////// Class Registration //////////
////////////////////////////////////////

type ClassInfo = {
    cls: { new(...args: any): SerializableClass },
}

const registeredClasses: {[name: string]: ClassInfo} = {}

/* Register a class, required before a `serialize` or `deserialize` call is
 * made containing a class instance of a given type. */
export function registerClass(
    cls: { new(...args: any): SerializableClass },
): void {
    if(registeredClasses[cls.name] !== undefined) {
        throw `Class "${cls.name}" is already registered`
    }
    registeredClasses[cls.name] = {
        cls,
    }
}

/* Return classInfo passed to `registerClass` for the given class name, or null
 * if a class with the given name has not been registered. */
function getRegisteredClass(name: string): ClassInfo | null {
    return registeredClasses[name] || null
}