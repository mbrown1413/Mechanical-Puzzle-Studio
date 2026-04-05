import {registerClass} from "~lib"

export type PluginContext = {
    registerClass: typeof registerClass,
}

export type PuzzleStudioPlugin = {
    setup(ctx: PluginContext): void
}

const pluginModules = import.meta.glob(
    [
        "/plugins/*.ts",
        "/plugins/*.js",
    ], {
        import: "default",
    }
)

export function definePlugin(plugin: PuzzleStudioPlugin): PuzzleStudioPlugin {
    return plugin
}

export async function loadPlugins() {
    for (const [path, pluginModule] of Object.entries(pluginModules)) {
        const context: PluginContext = {
            registerClass,
        }

        let plugin
        try {
            plugin = await pluginModule() as PuzzleStudioPlugin
        } catch (e) {
            console.error(`Failed to load plugin from ${path}:\n`, e)
            continue
        }

        try {
            plugin.setup(context)
        } catch (e) {
            console.error(`Failed to setup plugin from ${path}:\n`, e)
            continue
        }

        console.log(`Loaded plugin from ${path}`)
    }
}