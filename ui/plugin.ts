import {registerClass} from "~lib"

export type PluginContext = {
    registerClass: typeof registerClass,
}

export abstract class PuzzleStudioPlugin {
    constructor() {}
    abstract setup(ctx: PluginContext): void
    cleanup?(_ctx: PluginContext): void {}
}

const pluginModules = import.meta.glob(
    [
        "/plugins/*.ts",
        "/plugins/*.js",
    ], {
        import: "default",
    }
)
const loadedPlugins = new Map<string, PuzzleStudioPlugin>()

function getPluginContext(): PluginContext {
    return {
        registerClass,
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
        plugin.cleanup(getPluginContext())
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
        pluginClass = await pluginModule() as new () => PuzzleStudioPlugin
        plugin = new pluginClass()
    } catch(e) {
        console.error(`Failed to load plugin from ${path}:\n`, e)
        return
    }

    try {
        plugin.setup(getPluginContext())
    } catch(e) {
        console.error(`Failed to setup plugin from ${path}:\n`, e)
        return
    }

    loadedPlugins.set(path, plugin)
    console.log(`Loaded plugin from ${path}`)
}

export async function loadPlugins() {
    for(const path of Object.keys(pluginModules)) {
        await loadPlugin(path)
    }
}

if(import.meta.hot) {
    import.meta.hot.accept(async (newModule) => {
        if(loadedPlugins.size > 0) {
            await newModule?.loadPlugins()
        }
    })
}