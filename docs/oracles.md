# Oracles and report formats

Oracles evaluate a scenario trace. Each finding identifies a rule, includes byte-exact evidence excerpts, and cites the applicable protocol rule. Severity describes the observed robustness impact, not exploitability.

## Rule catalogue

The active citation for each rule is stored in the versioned rules files for the selected revision: [2025-11-25 rules](../spec/2025-11-25/rules.json) and [2026-07-28 rules](../spec/2026-07-28/rules.json). These files are the source of truth; they include the exact section or JSON-RPC citation shown with each finding.

| Rule ID | What it reports | Default severity | Citation basis |
|---|---|---:|---|
| `crash.process-exit` | The target process exited during a scenario. | high | JSON-RPC 2.0 request handling; revision-specific stdio transport |
| `hang.request-timeout` | A target did not answer a request before its configured timeout. | high | JSON-RPC 2.0 request handling; lifecycle or version-negotiation rules |
| `liveness.probe-failed` | A target failed the revision-specific liveness probe (`ping` or `server/discover`). | high | Revision-specific ping or server discovery section |
| `state-consistency.baseline-changed` | A response changed after a scenario while the target was reused. | high | JSON-RPC request/response handling; lifecycle or discovery response rules |
| `stdout-pollution.non-protocol-bytes` | stdio stdout contained bytes that were not protocol frames. | medium | Revision-specific stdio transport section |
| `jsonrpc-contract.invalid-message` | A server response violated the JSON-RPC message contract. | medium | JSON-RPC 2.0 request, notification and response objects |
| `schema-response.invalid-result` | A response did not match the selected revision's vendored schema. | medium | Revision-specific MCP schema |
| `error-code.unexpected-code` | A request error used a code other than the revision's specified code. | low | JSON-RPC 2.0 error object and revision-specific error rules |
| `error-leak.sensitive-detail` | An error response appears to expose internal details. | low | Revision-specific tool error-handling guidance; heuristic only |
| `accepted-malformed.success-response` | A malformed request received a success response. | info | JSON-RPC 2.0 notifications and invalid-request handling |
| `resource-usage.outlier` | A trace exceeded an observational size threshold. | info | Transport section; this is not a protocol size-limit claim |
| `http.response-media-type` | An HTTP response used an unsupported media type. | medium | Revision-specific Streamable HTTP transport section |
| `http.notification-response` | An HTTP notification did not receive the specified empty 202 response. | medium | Revision-specific Streamable HTTP message-sending section |
| `http.response-body-invalid` | An HTTP response body did not contain valid JSON-RPC data. | medium | Revision-specific Streamable HTTP message-sending section |

The rules files contain the exact revision-specific citation URLs, including where wording or sections differ between revisions. SHOULD/MAY language and protocol silence are not reported as violations.

## Report formats

Every run writes deterministic `findings.json`, run metadata and confirmed reproducers under the configured report directory. Select additional formats with `reporters`:

| Reporter | Output |
|---|---|
| `console` | Severity-ordered summary on stderr |
| `json` | Canonical `findings.json` |
| `sarif` | `sarif.sarif`, SARIF 2.1.0 |
| `junit` | `junit.xml` |
| `markdown` | `markdown.md` |

Plugins may register additional reporters; these write `<name>.<fileExtension>` (or `.txt` if no extension is declared).
