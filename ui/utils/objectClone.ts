import {toRaw} from "vue"

export function objectClone(item: object): object {
    if(item === null || typeof item !== "object") {
        return item
    }
    const raw = toRaw(item)

    if(Array.isArray(raw)) {
        const copy: unknown[] = []
        for(const item of raw) {
            copy.push(objectClone(item))
        }
        return copy

    } else if(raw instanceof Date) {
        return new Date(raw)

    } else if(raw instanceof Map) {
        const copy = new Map()
        for(const [key, mapValue] of raw) {
            copy.set(
                objectClone(key),
                objectClone(mapValue),
            )
        }
        return copy

    } else if(raw instanceof Set) {
        const copy = new Set()
        for(const item of raw) {
            copy.add(objectClone(item))
        }
        return copy
    }

    const copy = Object.create(Object.getPrototypeOf(raw))
    for(const key of Reflect.ownKeys(raw)) {
        const descriptor = Object.getOwnPropertyDescriptor(raw, key)
        if(!descriptor || !descriptor.enumerable) {
            continue
        }
        if("value" in descriptor) {
            descriptor.value = objectClone(descriptor.value)
        }
        Object.defineProperty(copy, key, descriptor)
    }
    return copy
}
