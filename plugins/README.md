
Drop plugins into this folder to include them into the build. Plugin files must
call `definePlugin` and export the result as the default export. See
`ui/plugin.ts` for details on the interface.

The plugin interface is in the early stages but an example plugin looks
something like this:

```typescript
import {PuzzleStudioPlugin, PluginContext} from "~/ui/plugin.ts"

export default class TestPlugin extends PuzzleStudioPlugin {
    setup(ctx: PluginContext) {
        console.log("Hello from test plugin8!")
        ctx.registerClass(/* ... */)
    }
}
```