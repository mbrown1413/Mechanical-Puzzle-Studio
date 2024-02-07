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
export type SerializedData = {
    root: SerializedNode,
    refs?: RefData,
}

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

    /** Unique identifier used to deduplicate instances after serializing. If
     * `null`, instances will be serialized inline and not deduplicated.
     * 
     * If you want to require an ID on a particular class, re-declare the
     * property like this:
     *     declare id: string
     */
    id: string | null

    constructor(id: string | null) {
        this.id = id
    }
}


///////////////////////////////////
////////// Serialization //////////
///////////////////////////////////

/* Maps a serializable class's ID to it's type and serialized data. */
type RefData = {
    [id: string]: {
        type: string,
        data: {[k: string]: SerializedNode},
    }
}

/* One recursive node, part of SerializedData. */
type SerializedNode = string | number | boolean | null |
    SerializedNode[] |
    {type: string, data: object} |
    {type: string, id: string}

type SerializableObject = {[key: string]: Serializable}

/* Return an object which can be passed to JSON.stringify to serialize. */
export function serialize(value: Serializable): SerializedData {
    const refs: RefData = {}
    const path: string[] = []
    let root
    try {
        root = _serializeNode(value, refs, path, "root")
    } catch(e) {
        if(e instanceof SerializerError) {
            e.setSerialize()
            e.setErrorPath(path)
        }
        throw e
    }
    const ret: SerializedData = {root}
    if(Object.keys(refs).length) {
        ret.refs = refs
    }
    return ret
}

function _serializeNode(
    value: Serializable,
    refs: RefData,
    path: string[],
    attribute: string
): SerializedNode {

    function getClassData(value: SerializableClass | SerializableObject) {
        const data: {[k: string]: SerializedNode} = {}
        for(const [k, v] of Object.entries(value)) {
            if(typeof v !== "function") {
                data[k] = _serializeNode(v, refs, path, k)
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

        if(typeof value === "object") {
            // Array
            if(value instanceof Array) {
                return value.map(
                    (item: Serializable, i: number) =>
                    _serializeNode(item, refs, path, String(i))
                )
            }

            // Map
            if(value instanceof Map) {
                const entries: {[key: string | number]: SerializedNode} = {}
                for(const [k, v] of value.entries()) {
                    if(typeof k !== "string") {
                        path.push(k)
                        throw new SerializerError("Only string keys are supported for Map")
                    }
                    entries[k] = _serializeNode(v, refs, path, k)
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

                // Store inline
                if(value.id === null) {
                    const data = getClassData(value)
                    return {type, data}

                // Store in a reference
                } else {
                    if(refs[value.id] === undefined) {
                        const data = getClassData(value)
                        refs[value.id] = {type, data}
                    }
                    return {type, id: value.id}
                }
            }
        
            if(type === "Object") {
                throw new SerializerError("Non-class objects cannot be serialized")
            }

            throw new SerializerError(`Reference to unregistered class "${type}"`)
        }

        throw new SerializerError(`Unsupported primitive type "${typeof value}"`)
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

        if(typeof data !== "object" || data === null || data.root === undefined) {
            throw new SerializerError(
                'Incorrectly formatted data. Expected object with "root" attribute.'
            )
        }
        const refs = data.refs || {}
        const path: string[] = []
        let value
        try {
            value = _deserializeNode(data.root, refs, new Map(), path, "root", _ignoreErrors)
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
    data: SerializedNode,
    refs: RefData,
    cache: Map<string, Serializable>,
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
                (x: SerializedNode, i: number) =>
                _deserializeNode(x, refs, cache, path, String(i), ignoreErrors)
            )
        }

        if(typeof data === "object") {
            if(data.type === undefined) {
                throw new SerializerError(`Malformed data: No type attribute on object`)
            }
        
            // Read data either directly, or from refs
            if("id" in data) {
                // Check if we already deserialized the object with this ID
                const obj = cache.get(data.id)
                if(obj !== undefined) {
                    return obj
                }
            }

            // Get data, either here inline or from refs
            let obj: Serializable
            let objData
            if("data" in data) {
                objData = data.data
            } else if(data.id !== undefined) {
                const ref = refs[data.id]
                if(ref === undefined) {
                    throw new SerializerError(`Could not find reference for ID "${data.id}"`)
                }
                objData = ref.data
            } else {
                throw new SerializerError("Malformed data: No data or ID found in reference")
            }
            
            // Map
            if(data.type === "Map") {
                const map: Map<string, Serializable> = new Map()
                for(const [key, value] of Object.entries(objData)) {
                    map.set(key, _deserializeNode(value, refs, cache, path, key, ignoreErrors))
                }
                obj = map
                
            // Object
            } else if(data.type === "Object") {
                obj = {}
                for(const [key, value] of Object.entries(objData)) {
                    obj[key] = _deserializeNode(value, refs, cache, path, key, ignoreErrors)
                }

            // Registered class
            } else {
                const classInfo = getRegisteredClass(data.type)
                if(classInfo === null) {
                    throw new SerializerError(`Reference to unregistered class "${data.type}"`)
                }
                if(typeof objData !== "object") {
                    throw new SerializerError(`Expected instance data to be an object, not ${typeof objData}`)
                }
                obj = {}
                for(const [key, value] of Object.entries(objData)) {
                    obj[key] = _deserializeNode(value, refs, cache, path, key, ignoreErrors)
                }
                Object.setPrototypeOf(obj, classInfo.cls.prototype)
            }

            if("id" in data) {
                cache.set(data.id, obj)
            }
            return obj
        }
        throw new SerializerError(`Cannot deserialize type "${typeof data}"`)
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
    registeredClasses[cls.name] = {
        cls,
    }
}

/* Return classInfo passed to `registerClass` for the given class name, or null
 * if a class with the given name has not been registered. */
function getRegisteredClass(name: string): ClassInfo | null {
    return registeredClasses[name] || null
}