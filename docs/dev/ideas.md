# Ideas for later

This file collects ideas that are out of scope for the current work order. An entry here is not a commitment.

| Idea | Context |
|---|---|
| Mirror `x-mcp-header` tool parameters as `Mcp-Param-{Name}` headers on 2026-07-28 Streamable HTTP | The spec makes this a client requirement for tools that declare it. The HTTP adapter does not see tool schemas today, so it only mirrors `Mcp-Method` and `Mcp-Name` |
| HTTP wire faults for missing or mismatched `Mcp-Method` and `Mcp-Name` headers | The 2026-07-28 spec requires `-32020` (header mismatch) for these. A rules entry with a citation would let an oracle check the code |
| Optional bearer token or custom request headers for attach mode, with values redacted from traces and reports | Some servers, for example StackQL over HTTP, require a token unless they are started with unauthenticated access. Needs a maintainer decision because it brings credentials into the tool |
| Per-target concurrency limit for attach mode | Parallel workers against one attached server can push a request past its 1000 ms step timeout. Confirmation correctly records these as flaky, but a limit would reduce the noise |
| Report when minimisation stops at its time budget | `minimizeScenario` returns a partly reduced scenario with no indication that the budget ran out. A `truncated` flag would make this visible, but it changes the result shape and needs a maintainer decision |
| Diagnostic when a run stops at `durationMs` before reaching `cases` | Against StackQL over stdio, the `standard` profile ran 197 of 256 cases before its 120 s cap and exited 0 with only the case count as a hint. A diagnostic line, and perhaps a non-zero exit option, would stop a CI gate from silently covering fewer cases on a slow runner |
| Accept a UTF-8 byte order mark in config files | Windows PowerShell 5 `Set-Content -Encoding UTF8` and some editors write a BOM, which the loader currently rejects as invalid JSON. Stripping a leading BOM before parsing is low risk |
| `spec` input on the Action | The Action has no input for the protocol revision. Consumers set `MCP_WRINGER_SPEC_REVISION` on the step instead, which works but is less discoverable than the other inputs |
