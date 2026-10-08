# Safety

The fuzzer sends malformed and hostile protocol input to the target. Use it only on software you own or are authorised to test, and isolate the target. Do not provide real credentials or access to production systems.

The default policy limits tool calls to tools annotated `readOnlyHint: true`. An allow entry by exact name is required for other tools. A `destructiveHint: true` tool requires an exact-name allow entry; glob patterns do not authorize it. Server annotations are claims from the server, not a safety guarantee.

Spawned targets receive a minimal environment plus configured `env` values. `--inherit-env` opts into passing the caller's environment. Reports record variable names, not values, and redact configured values from traces.

HTTP attach mode permits loopback addresses by default. Connecting to a non-loopback address requires `--allow-non-loopback`; use that only when explicitly authorised. The tool does not publish findings or open issues about other people's servers.

Findings are robustness observations with reproduction evidence. Severity is not a vulnerability rating, and acceptance of malformed input at `info` severity is not a claim of exploitability.
