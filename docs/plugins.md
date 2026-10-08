# Writing a plugin

Plugins are explicitly named in the config file. They run in the same process and privileges as the fuzzer. Load only code you trust.

## Entry point

A plugin is an ES module with a default export containing the plugin API version, a name and a `register(api)` function. Import public types and `WRINGER_PLUGIN_API_VERSION` only from `@stackql/mcp-wringer/plugin`. See the [example plugin](../examples/example-plugin.mjs) and [committed API declaration report](./dev/plugin-api.d.ts).

```js
import { WRINGER_PLUGIN_API_VERSION } from "@stackql/mcp-wringer/plugin";

export default {
  apiVersion: WRINGER_PLUGIN_API_VERSION,
  name: "my-plugin",
  register(api) {
    api.registerOracle("my-oracle", {
      evaluate: () => [],
    });
  },
};
```

Register generators, argument strategies, oracles, reporters, coverage providers and profiles through the corresponding `api.register...` methods. Registry names must be unique and kebab-case. A generator should derive all generated values from its supplied seed/context. An oracle must use a rule ID that exists in the selected spec profile if it emits a finding. Coverage providers implement `collect(directory)` and declare whether they read `NODE_V8_COVERAGE` or `GOCOVERDIR`; only enable them for targets prepared to generate that format.

Configure a plugin by package name, absolute path, `file:` URL or path relative to the config file:

```json
{
  "plugins": ["./plugins/my-plugin.mjs"],
  "oracles": [
    {
      "name": "my-oracle",
      "enabled": true,
      "options": {}
    }
  ]
}
```

The plugin surface version is `0.1`. CI compares its generated TypeScript declaration with `docs/dev/plugin-api.d.ts`; an API change must update the report intentionally and follow the project's versioning rules.
