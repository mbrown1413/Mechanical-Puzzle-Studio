
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

## API Usage

For access to the state of the page when editing a puzzle, the
`PuzzleStudioApi` instance is available via `context.api`. If the api isn't
available, such as during plugin setup or when a puzzle isn't currently being
edited, accessing it will throw an error.

```typescript
import {Plugin, PluginContext} from "~/ui/plugin.ts"

export default class TestPlugin extends Plugin {
    setup(context: PluginContext) {

        context.hooks.action.performed.subscribe(() => {

            // This works fine: a puzzle will always be loaded when the
            // action.performed hook is called, so the api will be available.
            context.api.selectedShape.color = "green"

        })

        // Throws an error: the api isn't necessarily initialized when plugins
        // are loaded and setup() is called.
        context.api.selectedShape.color = "green"

    }
}
```

## Making Edits

Edits made via the api will show up immediately in the UI, but you may notice
that they don't save any undo state, or initiate a save to the puzzle. This is
where `context.puzzleEditScope()` comes in. It is used to run code which edits
the puzzle and encompass those changes into an "action", which is the basis of
how undo states are saved.

```typescript
import {Plugin, PluginContext} from "~/ui/plugin.ts"

export default class TestPlugin extends Plugin {
    setup(context: PluginContext) {

        context.hooks.action.performed.subscribe(() => {

            context.puzzleEditScope("Set selected shape color to blue", () => {
                if(context.api.selectedShape) {
                    context.api.selectedShape.color = "blue"
                }
            })

        })

    }
}
```

`context.puzzleEditScope()` is passed a string describing what edit was made,
and a callback for making the actual edit.

## Cleanup

When a plugin is unloaded, most cleanup is performed automatically. In
particular:

* For hooks: You may directly import hooks and cleanup is still performed
  automatically; using plugin context is just a convenience.
* For registering classes: you must use `context.registerClass()` for the class
  to be unregistered automatically.

For other cleanup, you can call `Plugin.addCleanup()` to provide a cleanup
function which will be called when the plugin in unloaded.