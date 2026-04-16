
/**
 * Returns a proxy object that forwards all operations to the target object
 * returned by `getTarget()`. This allows you to error dynamically if the
 * underlying object isn't available, or swap out the underlying object
 * seemlessly. */
export function makeProxy<T extends object>(getTarget: () => T): T {
    return new Proxy({} as T, {
        get(_target, property) {
            const activeTarget = getTarget()
            const value = Reflect.get(activeTarget, property, activeTarget)
            return typeof value === "function" ? value.bind(activeTarget) : value
        },

        set(_target, property, value) {
            return Reflect.set(getTarget(), property, value)
        },

        has(_target, property) {
            return property in getTarget()
        },

        ownKeys() {
            return Reflect.ownKeys(getTarget())
        },

        getOwnPropertyDescriptor(_target, property) {
            return Object.getOwnPropertyDescriptor(getTarget(), property)
        },
    })
}