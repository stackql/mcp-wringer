# Scenario model

A scenario is a versioned, ordered sequence of steps. Logical messages are JSON values and do not contain transport framing. A raw send carries base64 bytes. A wire descriptor is optional and names the transport that interprets it, so framing faults do not leak into ordinary message steps.

The model separates:

| Step | Purpose |
|---|---|
| `send` | Encode one logical message using the active transport |
| `send-raw` | Send exact bytes, represented as base64 in JSON |
| `await-response` | Wait for a response, optionally matching a JSON-RPC id |
| `transport` | Perform a transport operation such as closing stdin |
| `delay` | Add an explicit delay to the scenario |

The current wire descriptor for stdio supports write chunk sizes and an inter-chunk delay. Other transports can add their own tagged descriptors without changing the meaning of logical steps.

## Lifecycle handling

Lifecycle drivers live with spec profiles, not in the transport or generic runner. For revision `2025-11-25`, the driver produces an `initialize` request, an `await-response` for its id, and `notifications/initialized`. Revision `2026-07-28` has no handshake; each request is created with `_meta.io.modelcontextprotocol/protocolVersion` and `_meta.io.modelcontextprotocol/clientCapabilities`. Scenario expansion produces explicit send and await steps, so a saved reproducer does not need an implicit lifecycle rule to replay.

## Design cases

| Case | Representation |
|---|---|
| Valid `tools/list` on both revisions and transports | The spec profile creates the revision-specific request. The transport frames it. The scenario stores message and response steps, not transport bytes. |
| One stdio frame split across three writes with delays | A `send` step includes a stdio wire descriptor with three chunk lengths and a delay. |
| Two in-flight requests with the same id | Two `send` steps precede the response waits. Duplicate ids are preserved; the model does not silently rewrite them. |
| Request before legacy handshake completes | The scenario orders its request before the handshake response wait or omits lifecycle steps. The runner preserves that order. |
| Request without `_meta` on `2026-07-28` | It is a normal logical message lacking metadata; validation does not silently repair fuzzed or hand-authored messages. |
| HTTP body ends mid-JSON before socket close | An HTTP-tagged wire descriptor describes the truncation; the HTTP adapter owns the raw socket behavior. |
| stdin closed while a request is in flight | A request send, a `transport: close-stdin` step, then an `await-response` step. |
| Cancellation races its response | Send the request, then place the cancellation notification and response wait in the chosen order. Timing can be expressed with `delay` steps. |

The HTTP-specific descriptor is an extension point only in M1; actual HTTP behavior is implemented in M4. A transport rejects a descriptor for a different transport rather than silently ignoring it.

## Trace and reproducer

Traces record each stdin, stdout and stderr byte chunk as UTF-8 when round-tripping proves it is valid UTF-8, otherwise as base64. Events include relative offsets. Process events are UTF-8 diagnostic records. Configured environment values are redacted in captured server output; environment values are never part of a reproducer, which records only their names.

A reproducer contains the format version, spec revision, target command and arguments, environment variable names, and the complete scenario. It can be reviewed as JSON and does not refer to a seed, corpus file, profile, or external scenario fragment.
