import {registerClass} from "~lib"

import {runWithCleanupRegistrar} from "~/ui/hooks.ts"

import {actionHooks} from "~/ui/ActionManager.ts"

const coreHooks = {
    action: actionHooks,
}

let pluginsLoaded = false

export type PluginContext = {
    registerClass: typeof registerClass,
    hooks: typeof coreHooks,
}

export abstract class Plugin {
    cleanupFunctions: (() => void)[]

    constructor() {
        this.cleanupFunctions = []
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

function getPluginContext(plugin: Plugin): PluginContext {
    return {
        registerClass: (...args) => {
            registerClass(...args)
            plugin.addCleanup(() => {
            })
        },
        hooks: coreHooks,
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
    let plugin
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