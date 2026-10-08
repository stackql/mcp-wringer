# Reproducer format

A reproducer is a self-contained JSON file with a serializable scenario, its protocol revision, a target descriptor and an optional seed. The target descriptor records the executable and argument array for stdio or the URL for Streamable HTTP. Environment variable names may be recorded for context; values are not stored.

The top-level shape is:

```json
{
  "formatVersion": 1,
  "specRevision": "2025-11-25",
  "seed": 12345,
  "target": {
    "transport": "stdio",
    "command": "node",
    "args": ["server.js"],
    "environmentNames": []
  },
  "scenario": {
    "formatVersion": 1,
    "id": "seed-12345-jsonrpc-envelope-2",
    "specRevision": "2025-11-25",
    "description": "Generated scenario.",
    "steps": [
      {
        "type": "send",
        "message": {
          "jsonrpc": "2.0",
          "id": "case-1",
          "method": "tools/list"
        }
      },
      {
        "type": "await-response",
        "id": "case-1",
        "timeoutMs": 1000
      }
    ]
  }
}
```

The example is illustrative; generated reproducers include the actual minimal failing scenario and may contain intentionally invalid messages or raw bytes encoded as base64. Replay with:

```sh
mcp-wringer replay finding.repro.json -- node server.js
```

For HTTP, pass `--transport streamable-http --url http://127.0.0.1:3000/mcp`. Replaying a reproducer sends its recorded scenario, so only replay it against a target you own or are authorised to test.
