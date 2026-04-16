import {registerClass} from "~lib"

import {runWithCleanupRegistrar} from "~/ui/hooks.ts"

import {Action} from "~/ui/actions.ts"
import {actionHooks} from "~/ui/ActionManager.ts"
import {api, actionManager} from "./globals.ts"

const coreHooks = {
    action: actionHooks,
}

let pluginsLoaded = false

export type PluginContext = {

    /** Provides a reference to all core hooks for convenience. */
    hooks: typeof coreHooks,

    /** Access to puzzle editor API. Will error if used outside of puzzle
     * editor pages or before the API is initialized. */
    api: typeof api,

    /** Registers a class for serialization or enumeration. Must be used for cleanup to happen automatically on plugin unload. */
    registerClass: typeof registerClass,

    puzzleEditScope: (description: string, callback: () => void) => void,
}

export abstract class Plugin {
    cleanupFunctions: (() => void)[]

    constructor() {
        this.cleanupFunctions = []
    }

    get name(): string {
        return this.constructor.name || "Plugin"
    }

    abstract setup(ctx: PluginContext): void

    addCleanup(cleanupFunction: () => void) {
        this.cleanupFunctions.push(cleanupFunction)
    }

    cleanup(_ctx: PluginContext) {
        for(const cleanupFunction of this.cleanupFunctions) {
            try {
                cleanupFunction()
            } catch(e) {
                console.error(`Error in plugin cleanup function:\n`, e)
            }
        }
    }
}

const pluginModules = import.meta.glob(
    [
        "/plugins/*.ts",
        "/plugins/*.js",
    ], {
        import: "default",
    }
)
const loadedPlugins = new Map<string, Plugin>()

class PluginPuzzleEditAction extends Action {
    private pluginName: string
    private callback: () => void
    private description: string

    constructor(pluginName: string, description: string, callback: () => void) {
        super()
        this.callback = callback
        this.pluginName = pluginName
        this.description = description
    }

    perform() {
        this.callback()
    }

    toString() {
        return `${this.description} [Plugin: ${this.pluginName}]`
    }
}

function getPluginContext(plugin: Plugin): PluginContext {
    return {
        hooks: coreHooks,
        api,

        registerClass: (...args) => {
            registerClass(...args)
            plugin.addCleanup(() => {
                //TODO: Unregister class
            })
        },

        puzzleEditScope: (description, callback) => {
            actionManager.performAction(
                new PluginPuzzleEditAction(plugin.name, description, callback)
            )
        }
    }
}

function unloadPlugin(path: string) {
    const plugin = loadedPlugins.get(path)
    if(!plugin) {
        return
    }

    loadedPlugins.delete(path)
    if(!plugin.cleanup) {
        return
    }

    try {
        plugin.cleanup(getPluginContext(plugin))
    } catch(e) {
        console.error(`Failed to cleanup plugin from ${path}:\n`, e)
    }
}

async function loadPlugin(path: string) {
    const pluginModule = pluginModules[path]
    if(!pluginModule) {
        return
    }

    unloadPlugin(path)

    let pluginClass
    let plugin: Plugin
    try {
        pluginClass = await pluginModule() as new () => Plugin
        plugin = new pluginClass()
    } catch(e) {
        console.error(`Failed to load plugin from ${path}:\n`, e)
        return
    }

    try {
        runWithCleanupRegistrar(
            (cleanupFunction) => plugin.addCleanup(cleanupFunction),
            () => plugin.setup(getPluginContext(plugin)),
        )
    } catch(e) {
        console.error(`Failed to setup plugin from ${path}:\n`, e)
        return
    }

    loadedPlugins.set(path, plugin)
    console.log(`Loaded plugin from ${path}`)
}

export async function loadPlugins() {
    pluginsLoaded = true
    for(const path of Object.keys(pluginModules)) {
        await loadPlugin(path)
    }
}

if(import.meta.hot) {

    import.meta.hot.accept(async (newModule) => {
        if(pluginsLoaded) {
            await newModule?.loadPlugins()
        }
    })

    import.meta.hot.dispose(() => {
        for(const path of loadedPlugins.keys()) {
            unloadPlugin(path)
        }
    })

}