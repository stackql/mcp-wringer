# Quick start

Use the tool only against MCP servers you own or are authorised to test. Keep the target isolated and do not give it real credentials.

## Install and run

Requires Node.js 22.13 or later. Run a local stdio target with:

```sh
npx @stackql/mcp-wringer run --profile quick --seed 12345 -- node server.js
```

For a Streamable HTTP server listening on loopback:

```sh
npx @stackql/mcp-wringer run --url http://127.0.0.1:3000/mcp --profile quick
```

The default profile runs 18 cases. Reports are written under `.mcp-wringer/reports`; the seed is printed to stderr and recorded in the reports. A reproducer can be replayed with `mcp-wringer replay <file.repro.json>`.

## Configure

Create a starter config with `mcp-wringer init`. Set a target in the config or pass it after `--`:

```sh
mcp-wringer run --config mcp-wringer.config.json -- node server.js
```

The config file, profile, environment and CLI are merged in that precedence order, with defaults lowest. Inspect values and their origins with `mcp-wringer run --show-config -- node server.js`. See the [configuration reference](./config-reference.md).

Use `mcp-wringer list` to view available transports, spec revisions, generators, argument strategies, oracles, reporters and profiles.

## Baselines and reports

Set `baselinePath` in the config or use `--baseline <file>`. Runs fail on newly confirmed findings and stale baseline IDs. SARIF, JUnit XML and Markdown reports can be selected in the `reporters` config property. See [report formats and oracle rules](./oracles.md).
