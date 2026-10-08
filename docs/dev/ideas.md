# Ideas for later

This file collects ideas that are out of scope for the current work order. An entry here is not a commitment.

| Idea | Context |
|---|---|
| Mirror `x-mcp-header` tool parameters as `Mcp-Param-{Name}` headers on 2026-07-28 Streamable HTTP | The spec makes this a client requirement for tools that declare it. The HTTP adapter does not see tool schemas today, so it only mirrors `Mcp-Method` and `Mcp-Name` |
| HTTP wire faults for missing or mismatched `Mcp-Method` and `Mcp-Name` headers | The 2026-07-28 spec requires `-32020` (header mismatch) for these. A rules entry with a citation would let an oracle check the code |
| Optional bearer token or custom request headers for attach mode, with values redacted from traces and reports | Some servers, for example StackQL over HTTP, require a token unless they are started with unauthenticated access. Needs a maintainer decision because it brings credentials into the tool |
| Per-target concurrency limit for attach mode | Parallel workers against one attached server can push a request past its 1000 ms step timeout. Confirmation correctly records these as flaky, but a limit would reduce the noise |
