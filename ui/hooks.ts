/**
 * Extensible hook system for plugins.
 *
 * Here is an example of the boilerplate for defining new hooks:
 *
 *     export const namespaceHooks = defineHooks("namespace", {
 *     
 *         // Documentation using "/**" here appears in the plugin context for
 *         // easy reference.
 *         hookname: new EventHook<[arg1: Type1, arg2: Type1, ...]>(),
 *
 *         ...
 *     })
 *
 * Then import the hooks object plugin.ts and add it to `coreHooks` to make it
 * available in the plugin context:
 *
 *     import {namespaceHooks} from "~/ui/namespace.ts"
 *     const coreHooks = {
 *         ...
 *         namespace: namespaceHooks,
 *         ...
 *     }
 */

type CleanupCallback = () => void
type CleanupRegistrar = (cleanupCallback: CleanupCallback) => void

let currentCleanupRegistrar: CleanupRegistrar | null = null

export function runWithCleanupRegistrar<T>(
    cleanupRegistrar: CleanupRegistrar,
    callback: () => T,
): T {
    const oldCleanupRegistrar = currentCleanupRegistrar
    currentCleanupRegistrar = cleanupRegistrar
    try {
        return callback()
    } finally {
        currentCleanupRegistrar = oldCleanupRegistrar
    }
}

export abstract class Hook {
    name: string | null

    constructor() {
        this.name = null
    }
}

export function defineHooks<
    HooksObject extends Record<string, Hook>
>(namespace: string, hooks: HooksObject): HooksObject {
    for(const [name, hook] of Object.entries(hooks)) {
        hook.name = `${namespace}.${name}`
    }
    return hooks
}

/** Hook type which sends out an event to any listeners subscribed to the hook. */
export class EventHook<Args extends unknown[]> extends Hook {
    private callbacks: ((...args: Args) => void)[]

    constructor() {
        super()
        this.callbacks = []
    }

    emit(...args: Args) {
        for(const callback of this.callbacks) {
            try {
                callback(...args)
            } catch(e) {
                console.error(`Error in callback for hook ${this.name}:\n`, e)
            }
        }
    }

    subscribe(callback: (...args: Args) => void) {
        this.callbacks.push(callback)

        const cleanupCallback = () => this.unsubscribe(callback)
        currentCleanupRegistrar?.(cleanupCallback)
        return cleanupCallback
    }

    unsubscribe(callback: (...args: Args) => void) {
        this.callbacks = this.callbacks.filter(cb => cb !== callback)
    }
}

/** Hook type which collects return values from subscribers and returns them as an array. */
export abstract class CollectorHook<CollectedType, Args extends unknown[]> extends Hook {
    private callbacks: ((...args:Args) => CollectedType)[]

    constructor() {
        super()
        this.callbacks = []
    }

    collect(...args: Args): CollectedType[] {
        const results: CollectedType[] = []
        for(const callback of this.callbacks) {
            try {
                results.push(callback(...args))
            } catch(e) {
                console.error(`Error in callback for hook ${this.name}:\n`, e)
            }
        }
        return results
    }

    subscribe(callback: (...args: Args) => CollectedType) {
        this.callbacks.push(callback)

        const cleanupCallback = () => this.unsubscribe(callback)
        currentCleanupRegistrar?.(cleanupCallback)
        return cleanupCallback
    }

    unsubscribe(callback: (...args: Args) => CollectedType) {
        this.callbacks = this.callbacks.filter(cb => cb !== callback)
    }
}