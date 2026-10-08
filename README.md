# mcp-wringer

`@stackql/mcp-wringer` is a protocol robustness fuzzer for Model Context Protocol (MCP) servers over stdio and Streamable HTTP, with a focus on deterministic, replayable findings.

It is provided as both:

- an npm CLI (`mcp-wringer`)
- a GitHub Action

Use it only on servers you own or are explicitly authorised to test.

This repository is currently implementing Work order 001. See [AGENTS.md](./AGENTS.md) for project scope and design rules.

## Run a stdio test

Use `run` to start a local server, generate scenarios, and write reports:

```sh
npx mcp-wringer run --spec 2025-11-25 --profile quick --seed 12345 -- node path/to/server.js
```

The built-in profiles are `quick` (18 cases), `standard` (256 cases), and `deep` (2,000 cases). The default profile is `quick`. Reports and response-novelty corpus entries are written under `.mcp-wringer/` unless their directories are overridden. `findings.json` includes the root seed and is stable for repeated runs against a deterministic server.

The target receives a minimal environment by default. Pass individual variables with repeated `--env NAME=VALUE` options; `--inherit-env` opts into passing the caller's environment. Tool calls are limited to tools advertising `readOnlyHint: true`. Use `--allow-tool NAME` to explicitly permit a tool without that annotation. Destructive tools require an exact-name allow entry.

Use `mcp-wringer init` to create a starter config, `mcp-wringer list` to view registered components, and `mcp-wringer run --show-config` to inspect resolved values and their origins. Configuration can set plugin modules, generator weights, enabled oracles and reporters, and a finding baseline. See the [quick start](./docs/quick-start.md), [configuration reference](./docs/config-reference.md), [oracle and report catalogue](./docs/oracles.md), [reproducer format](./docs/reproducers.md), [plugin guide](./docs/plugins.md), and [safety notes](./docs/safety.md).

Replay a report reproducer with the same target environment when needed:

```sh
npx mcp-wringer replay .mcp-wringer/reports/reproducers/<finding-id>.repro.json --env NAME=VALUE
```

`replay` writes the captured trace as JSON to stdout. To minimize a reproducer while confirming the finding on fresh targets:

```sh
npx mcp-wringer minimize .mcp-wringer/reports/reproducers/<finding-id>.repro.json --env NAME=VALUE
```

## Run a Streamable HTTP test

Attach to a local endpoint with `--url`:

```sh
npx mcp-wringer run --url http://127.0.0.1:3000/mcp --spec 2025-11-25 --profile quick
```

To start a fixture or server process that listens on a known URL, provide both `--url` and the command:

```sh
npx mcp-wringer run --transport streamable-http --url http://127.0.0.1:3000/mcp --spec 2025-11-25 -- node server.js
```

Attach mode refuses non-loopback hosts unless `--allow-non-loopback` is supplied. Use that flag only for a target you own or are explicitly authorised to test. Reproducers can be replayed over the other transport with `--transport` and, for HTTP, `--url`.

Run the tool only against fixtures, the reference server, or a server you own or are authorised to test. Isolate the target and do not provide it with real credentials.
