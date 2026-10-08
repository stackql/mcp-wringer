# Reproducer format

A reproducer is a self-contained JSON document with a versioned scenario and target command. The version 1 schema is [reproducer.schema.json](../spec/reproducer.schema.json). Version 1 uses JSON-RPC messages for logical sends and base64 for raw bytes; stdio or HTTP-specific wire descriptors are isolated under the `wire` property.

Reproducers store `environmentNames`, not environment variable values. The default CLI target environment is intentionally minimal and does not inherit the caller's environment. If a target needs configured values, provide them through an explicit wrapper command or the programmatic transport API; do not put credentials in a reproducer or report.

Replay an example from the repository root:

```sh
npm run build
node dist/cli/index.js replay examples/reproducers/tools-list-2026.repro.json
```

The command emits a trace as JSON on stdout. Use `--out <path>` to write the trace to a file, or provide a replacement target after `--`.
