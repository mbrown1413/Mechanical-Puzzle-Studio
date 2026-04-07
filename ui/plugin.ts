import {registerClass} from "~lib"

export type PluginContext = {
    registerClass: typeof registerClass,
}

export type PuzzleStudioPlugin = {
    setup(ctx: PluginContext): void
    cleanup?(ctx: PluginContext): void
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

export function definePlugin(plugin: PuzzleStudioPlugin): PuzzleStudioPlugin {
    return plugin
}

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

    let plugin
    try {
        plugin = await pluginModule() as PuzzleStudioPlugin
    } catch(e) {
        console.error(`Failed to load plugin from ${path}:\n`, e)
        return
    }

    try {
        plugin.setup(getPluginContext())
        loadedPlugins.set(path, plugin)
    } catch(e) {
        console.error(`Failed to setup plugin from ${path}:\n`, e)
        return
    }

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