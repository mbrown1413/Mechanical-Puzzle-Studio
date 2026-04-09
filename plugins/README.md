
Drop plugins into this folder to include them into the build.

## Writing a Plugin

Plugin files must export as the default export a subclass of `Plugin`. A simple
example looks like this:

```typescript
import {PuzzleStudioPlugin, PluginContext} from "~/ui/plugin.ts"

export default class TestPlugin extends Plugin {
    setup(context: PluginContext) {

        context.hooks.action.performed.subscribe((action) => {
            console.log("Action performed:", action.toString())
        })

    }
}
```

The context given to `setup()` provides the necessary functions to utilize
hooks and register classes to modify or extend functionality. Inspecting the
type of `PluginContext` should give you the necessary documentation for using
hooks.

## Cleanup

When a plugin is unloaded, most cleanup is performed automatically. In
particular:

* For hooks: You may directly import hooks and cleanup is still performed
  automatically; using plugin context is just a convenience.
* For registering classes: you must use `context.registerClass()` for the class
  to be unregistered automatically.

For other cleanup, you can call `Plugin.addCleanup()` to provide a cleanup
function which will be called when the plugin in unloaded.