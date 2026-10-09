# mcp-wringer agent guide

This file is the standing guidance for anyone working in this repository, human or AI agent. It covers what the project is for, the design rules that settle most questions, and the conventions the code and docs follow. Task instructions live in work orders under `docs/dev/work-orders/`. If a work order and this file disagree, stop and ask the maintainer.

Keep this file accurate. When a decision recorded here changes, update the file in the same commit as the code.

## What this project is

`@stackql/mcp-wringer` is a protocol robustness fuzzer for Model Context Protocol (MCP) servers. It starts a server (or connects to one), sends generated valid, nearly valid and malformed traffic over the server's real transport, judges what comes back, and writes each failure as a small file that replays it with one command.

There are two audiences. MCP server maintainers run it locally and in CI, through the npm CLI or the GitHub Action served from this repository, to catch crashes, hangs and protocol violations before a release. Security researchers use it as a repeatable method for assessing servers they are authorised to test. Both will judge the tool on whether its findings are real and reproducible, so that is what the design optimises for.

The gap it fills is robustness testing that:

- covers message sequences and transport-level faults as well as single payloads
- works the same way over stdio and Streamable HTTP, with room for other transports
- follows each spec revision's lifecycle, including the stateless model in revision 2026-07-28
- produces minimal, deterministic reproducers

## What it is not

Each exclusion has a reason. Do not add any of these without the maintainer agreeing to change the scope.

| Out of scope | Reason |
|---|---|
| Tool-poisoning, prompt-injection and description scanning | It is static analysis of metadata, not fuzzing, and other tools cover it |
| Auth and OAuth audits | A different problem with different oracles |
| Injection payload libraries with exploitation oracles (SQL injection, SSRF, path traversal) | The tool reports robustness failures it can prove, not suspected vulnerabilities |
| LLM calls at runtime | Runs must be reproducible offline from a seed, and a CI security tool should not need an API key |
| Full conformance testing | The official conformance suite owns that. Oracles here check a response against the spec only where they can cite a specific rule |
| Fuzzing MCP clients (rogue server mode) | Possible later, not in v1 |
| Source code analysis | This is a black-box tool, with optional coverage feedback |

## Design principles

When a question is not answered elsewhere in this file, these decide it.

1. **Every finding is evidence.** A finding carries the exact bytes sent and received, the rule it violates, and a reproducer file. If the tool cannot replay a failure on a fresh target, it reports the failure as flaky, not as a finding.
2. **Deterministic by construction.** The same seed, config, tool version and server surface produce the same scenarios in the same order. Nothing in generation reads the clock, the process ID or an unordered collection.
3. **The core is transport-neutral.** Generators, oracles, the runner and the reproducer format know nothing about stdio or HTTP. Transport adapters own framing and transport-level faults. A third transport must be addable as a plugin without touching core.
4. **The spec is data.** Each protocol revision is a profile: vendored schema, lifecycle model, method catalogue, expected error codes, liveness probe. Supporting a new revision should be mostly a data change.
5. **Safe by default.** With no configuration, the tool does not call tools that might change anything, does not pass the caller's environment to the target, and does not connect to non-loopback addresses.
6. **Built-ins use the public extension API.** Built-in transports, generators, oracles and reporters register through the same registry that plugins use. If a built-in needs a private hook, the API is missing something.
7. **Few false positives, and severity that matches what was observed.** Users switch off an oracle that is often wrong, and the true findings go with it. Severity describes observed impact on robustness. It is not a vulnerability rating.
8. **Small dependency surface.** The tool runs in other people's CI next to their code. Every runtime dependency needs a reason, and the Node standard library is preferred.

## Architecture

A run flows through these stages:

```
config -> target + transport -> spec profile -> discovery -> generators -> runner -> oracles -> minimiser -> reporters
```

| Stage | Responsibility |
|---|---|
| Config | Resolve flags, environment, config file and profile into one validated object |
| Target | Spawn the server process, or attach to a running one, and observe the process when spawned |
| Transport | Write and read raw bytes, and apply transport-level faults |
| Spec profile | Supply the schema, lifecycle steps, liveness probe and rules for the chosen revision |
| Discovery | Read the server's tools, resources and prompts, and classify each against the safety policy |
| Generators | Produce scenarios from the seed, the profile and the discovered surface |
| Runner | Execute each scenario, record a trace, restart the target per policy, probe liveness |
| Oracles | Read a trace and emit findings |
| Minimiser | Reduce a failing scenario and confirm it on a fresh target |
| Reporters | Write findings and run metadata in each requested format |

The intended layout is below. Milestone M0 of work order 001 creates it, and later changes should be reflected here.

```
action.yml            GitHub Action metadata, must stay at the repository root
dist-action/          committed bundle for the Action (the only committed build output)
src/
  core/               scenario, trace and finding types, registry, runner, minimiser, seed handling
  config/             config definition, loading, precedence, profiles
  target/             spawn and attach launchers, readiness, process observation
  transports/stdio/   stdio adapter and its wire faults
  transports/http/    Streamable HTTP adapter and its wire faults
  spec/               profile loader and lifecycle drivers
  generators/         built-in generators
  oracles/            built-in oracles
  reporters/          console, json, sarif, junit, markdown
  plugin/             public plugin API, the only supported import surface for plugins
  cli/                argument parsing and commands
  action/             GitHub Action entry point, a thin wrapper over the same run function as the CLI
spec/<revision>/      vendored schema files and per-revision rules data
fixtures/             fixture servers used by tests
examples/             example configs and an example plugin
docs/                 user docs, with contributor and agent material under docs/dev
test/                 unit, integration and detection-matrix tests
```

## Core vocabulary

Use these terms consistently in code, docs and output.

| Term | Meaning |
|---|---|
| Target | The server under test, either spawned by the tool or attached to by URL |
| Transport | The adapter that moves bytes to and from the target |
| Wire fault | A transport-specific way of sending bytes badly, such as splitting a frame across writes or truncating an HTTP body |
| Spec profile | Everything the tool knows about one protocol revision |
| Scenario | An ordered, serialisable list of steps. It is the unit of generation, execution, minimisation and replay |
| Step | One action in a scenario: send a message or raw bytes, wait for a response, perform a transport operation, or delay |
| Trace | The byte-exact record of one scenario's execution, with event order and relative timing |
| Generator | Code that produces scenarios from a seed |
| Argument strategy | Code that produces values for a matching tool argument, used by domain plugins |
| Oracle | Code that reads a trace and emits findings |
| Finding | One rule violated, with severity, evidence and a reproducer |
| Reproducer | A self-contained file holding the minimal scenario for a finding |
| Baseline | A file of known finding IDs that a run is compared against |

## Extension points

Everything in this table is registered by name through the registry, takes options from config, and can be supplied by a plugin.

| Extension | Purpose | Built-ins planned for v0.1 |
|---|---|---|
| Transport | Framing and wire faults | `stdio`, `streamable-http` |
| Spec profile | Per-revision schema and rules | `2025-11-25`, `2026-07-28` |
| Generator | Scenario production | `schema-valid`, `schema-mutated`, `jsonrpc-envelope`, `raw-json`, `sequence`, `tool-args`, `resources`, `prompts`, `wire-fault` |
| Argument strategy | Domain values for tool arguments | generic JSON Schema strategy |
| Oracle | Trace judgement | `crash`, `hang`, `liveness`, `state-consistency`, `stdout-pollution`, `jsonrpc-contract`, `schema-response`, `error-code`, `error-leak`, `accepted-malformed`, `resource-usage` |
| Reporter | Output formats | `console`, `json`, `sarif`, `junit`, `markdown` |
| Coverage provider | Optional code coverage feedback | experimental, off by default |
| Profile | Named partial config | `quick`, `standard`, `deep` |

The plugin surface is `src/plugin/`, exported as `@stackql/mcp-wringer/plugin`. It carries an `apiVersion`. A generated declaration report for this surface is committed, and CI fails when the surface changes without the report changing, so that API changes are deliberate. Breaking the plugin API bumps `apiVersion` and the package major version.

Plugins are code that runs in the user's CI. The tool loads only the plugins that config names explicitly. It never discovers plugins by scanning `node_modules`.

## Rules for the wire path

The wire path is where a fuzzer earns or loses its value, so these rules are strict.

- **No MCP SDK client on the wire path.** SDK clients validate and normalise outgoing messages, so they cannot send malformed frames, and their own leniency would hide server bugs. Adapters write bytes. SDKs are fine as dev dependencies for fixtures and tests.
- **Traces are byte-exact.** Record what was written and read, in order, with relative timing. Store bytes that are not valid UTF-8 as base64.
- **stdio:** stdout carries protocol only, so anything else on stdout is evidence. stderr is captured for context and never parsed as protocol.
- **HTTP:** well-formed requests can use `node:http`. Wire faults such as truncated bodies, malformed headers and aborted streams need `node:net` sockets, because higher-level clients refuse to send them.
- **Process handling:** spawn with an argument array and no shell. On Windows, `.cmd` and `.bat` shims (for example `npx`) cannot be spawned without a shell in current Node versions. Handle that case explicitly and safely. Do not solve it by passing an unescaped command string to a shell.

## Spec handling

Do not write MCP protocol details from memory. The protocol changed substantially between revisions, and a model's recollection is likely to mix them. Read the vendored schema and the spec text for the revision in question.

- `spec/<revision>/` holds schema files copied from the official specification repository at a pinned commit. `spec/SOURCE.json` records the repository, commit, date and file hashes. `npm run spec:sync` refreshes them. Never hand-edit vendored files.
- Rules that the schema cannot express live in a per-revision rules file: the expected error code for each failure class, which messages require a response, header requirements, the liveness probe. Every rule has a `cite` field pointing at the spec section or the JSON-RPC 2.0 section it comes from. A rule without a citation does not ship.
- Where the spec is silent, or says SHOULD or MAY, an oracle reports at most `info`.

These differences between the two initial revisions show why lifecycle, liveness and error codes must come from the profile and not from code:

| Area | Up to 2025-11-25 | 2026-07-28 |
|---|---|---|
| Lifecycle | `initialize` request, then `notifications/initialized` | No handshake. Each request carries protocol version and client capabilities in `_meta` |
| Discovery of server identity | In the `initialize` result | `server/discover`, which servers must implement |
| Liveness probe | `ping` | `ping` is removed, so use `server/discover` |
| Streamable HTTP sessions | `Mcp-Session-Id` header | Sessions removed |
| Streamable HTTP request headers | No method headers | `Mcp-Method` and `Mcp-Name` required on POST |
| Results | No `resultType` | `resultType` required on every result |
| Spec-defined error codes | For example resource not found is `-32002` | Renumbered, for example resource not found is `-32602` and unsupported protocol version is `-32022` |

Treat this table as a pointer to what to read, not as the source of truth.

## Determinism

- One root seed per run. Print it at the start and write it into every output file.
- Derive sub-seeds by hashing the root seed with a label (generator name, worker index, case index). Do not share one random stream between components, because enabling one generator would then change the cases another produces.
- Sort anything that came from a `Map`, a `Set` or a directory listing before using it in generation or output.
- Wall-clock time may affect outcomes only through timeouts. A hang must reproduce on replay before it counts as a finding.
- For a fixed seed against a deterministic target, `findings.json` is byte-identical across runs. Values that vary between runs (timestamps, durations, host details) go in a separate run metadata file.
- A reproducer is self-contained. It replays without the seed, the config or the original corpus.

## Findings and severity

Severity describes what was observed. Output never uses CVE, CVSS or exploitability language.

| Severity | Meaning | Examples |
|---|---|---|
| `high` | The server stopped serving, or its state changed for later requests | Process exit or signal, hang, failed liveness probe after a case, baseline request returning a different result after a case |
| `medium` | The server kept running but broke the protocol contract | Wrong or missing response id, a response to a notification, a result that fails the revision schema, non-protocol bytes on stdout |
| `low` | The contract held but error handling was wrong or leaky | Wrong error code where the spec fixes one, internal error for client-caused input, stack trace or absolute path in an error message |
| `info` | Worth a look, not a violation | Malformed input accepted with a success result, latency or size outlier |

- A finding ID is a hash of the oracle rule and a normalised signature of the failure, not of the input bytes. The same bug reached by different inputs is one finding with one minimal reproducer and an occurrence count.
- A failure counts as a finding only after it replays on a fresh target the configured number of times. Otherwise it is recorded as flaky and does not fail the run by default.
- With a baseline file, a run fails on new findings and also on stale entries (baseline findings that no longer reproduce), so the baseline stays honest.

## Safety

The tool sends hostile input to software that may hold credentials and may be able to change real systems. These defaults exist because of that, and loosening any of them is a maintainer decision.

- **Tool calls:** any `tools/call` that names a real tool is subject to policy, including calls with deliberately invalid arguments, because a lenient server may run them anyway. By default only tools annotated `readOnlyHint: true` are called. Other tools need an allow entry by name. A tool annotated `destructiveHint: true` needs an exact-name allow entry, and glob patterns do not match it.
- **Annotations are the server's own claims.** User docs must say plainly that the target should be isolated and should hold no real credentials.
- **Environment:** a spawned target gets a minimal environment plus whatever `target.env` sets. Inheriting the caller's environment is opt-in. A fuzzer running in CI should not hand cloud credentials to a server it is about to send junk to.
- **Network:** attach mode refuses non-loopback hosts unless the user passes an explicit flag. The tool is for servers the user owns or is authorised to test, and the README says so.
- **Reports:** record environment variable names, never values. Redact the values of configured environment variables wherever they appear in a trace. Truncate large bodies and keep their length and hash.
- **Findings in other people's servers:** never open a public issue or publish details. Write them to a git-ignored directory and tell the maintainer, who handles disclosure privately.

## Configuration

Configurability is a project goal, and a configurable tool is only usable if its configuration is predictable.

- One definition of the config shape drives runtime validation, the TypeScript types and the published JSON Schema.
- Precedence, highest first: CLI flags, `MCP_WRINGER_*` environment variables, config file, selected profile, built-in defaults. A flag prints the resolved config with the origin of each value.
- Unknown keys are errors, with a nearest-match suggestion. Silently ignoring a typo in a safety setting is a hazard.
- Every transport, generator, oracle and reporter is selected by registry name, takes an `options` object, and can be disabled. Generators can be weighted. Oracle severities can be overridden per rule.
- A profile is a named partial config and nothing more. Plugins can add profiles.
- Add an option only when a user has a reason to change the behaviour. Otherwise pick the default. Every option appears in the generated config reference, and the docs check fails if one is missing.

## Testing

- **Fixture server:** `fixtures/` holds a server that is correct by default and has named, switchable defects. It runs over both transports and both lifecycles.
- **Detection matrix:** for each defect, a test asserts that the expected oracle rule fires and that the minimised reproducer replays. Every oracle rule has at least one defect that triggers it.
- **Clean runs:** the fixture with no defects produces zero findings at the `standard` profile. This is the false-positive gate, and it matters as much as the detection matrix.
- **Determinism:** the same seed run twice gives a byte-identical `findings.json`.
- **Platforms:** CI runs on Linux, macOS and Windows. Windows matters because pipe and line-ending behaviour differ there.
- **Isolation:** tests use loopback only and need no internet once dependencies are installed.
- **No fixed sleeps:** wait for an event with a timeout.
- **Failing tests:** do not weaken or skip a test to get a green run. If the test is wrong, fix it and explain why in the commit message.

## GitHub Action

The Action is served from this repository, which GitHub Marketplace allows as long as the repository is public, there is one `action.yml` at the root, and the action name is unique on the Marketplace.

- It is a JavaScript action. The entry point is in `src/action/` and is bundled to `dist-action/`, which is committed because runners do not build actions. CI rebuilds the bundle and fails on any difference.
- It is a thin wrapper. It maps inputs to the same run function the CLI uses. Logic the Action needs belongs in core.
- It needs no token and no permissions. It writes report files and a job summary, and sets outputs. Uploading SARIF to code scanning is done by the user's workflow, and the docs show how.
- Release tags are immutable `vX.Y.Z` plus a moving `vX`. Docs use the moving major tag for the Action.

## Supply chain

This project will be read by people who audit supply chains for a living, and it should pass that reading.

- **Workflows:** set top-level `permissions: {}` and grant per job. Use floating major-version tags from the latest stable published release for trusted Actions (for example `actions/checkout@v7`), including documentation examples. Verify the release and major tag before updating; do not use `@main` or `@latest`. These tags intentionally accept upstream updates within a major version. Do not use `pull_request_target`. Never interpolate `${{ github.* }}` or other untrusted context into a `run:` script. Pass it through `env`.
- **Dependencies:** commit the lockfile, install with `npm ci` in CI, and keep this package free of install scripts.
- **Publishing:** maintainers publish npm releases manually from a reviewed release commit using npm login and interactive 2FA. The release workflow validates artifacts only and never publishes. Do not store npm tokens in GitHub secrets or claim provenance for local publication.
- **Agents do not publish.** Prepare releases, tags, Marketplace listings and repository settings changes for the maintainer to carry out.

## Code conventions

- TypeScript in strict mode, ESM only, Node 22 or later.
- No `any` in the public API. Default exports only where a loader requires them (config files and plugin entry files).
- Registry names are kebab-case, for example `jsonrpc-envelope` and `stdout-pollution`.
- Errors are typed classes with a stable code. Human-readable output goes to stderr, so stdout stays clean for machine output.
- Exit codes are part of the public interface:

| Code | Meaning |
|---|---|
| 0 | Run completed with no findings at or above the failure threshold |
| 1 | Run completed with findings at or above the failure threshold, or a stale baseline |
| 2 | Usage or configuration error |
| 3 | The target could not be started or reached, or another infrastructure failure |

Keeping code 3 separate from code 1 matters: a server that fails to start is not a crash finding.

## Commands

Milestone M0 creates these scripts. Keep this list accurate.

| Command | Purpose |
|---|---|
| `npm run check` | Lint, type-check and unit tests. Run before every commit |
| `npm test` | Unit and integration tests |
| `npm run test:matrix` | Detection matrix and clean-run gate against the fixtures |
| `npm run build` | Build the npm package |
| `npm run build:action` | Rebuild `dist-action/` |
| `npm run spec:sync` | Refresh vendored spec files and `spec/SOURCE.json` |
| `npm run docs:config` | Regenerate the config reference and JSON Schema |

## Working agreements for agents

- **Check current versions.** Package versions, Action versions, Node runtimes and the spec all move. Look them up when you need them, and do not rely on what you remember.
- **Stay in scope.** Make the change the work order asks for. Put ideas for later in `docs/dev/ideas.md`.
- **Report plainly.** In milestone reports and commit messages, separate what you verified (and with which command) from what you assumed. If something was skipped or does not work, say so first.
- **Ask before** anything visible outside the repository, a scope change, a new runtime dependency, a plugin API break, or a loosened safety default.
- **Only fuzz local targets:** the fixtures, and servers the maintainer has supplied for the purpose.

## Documentation style

- Write plainly and factually. No superlatives and no marketing claims.
- Any claim about bugs found links to a public issue or advisory. Comparisons with other tools state verifiable facts and carry a date.
- Use hyphens, not em dashes. Write arrows as `->`.
- Do not place a heading directly under another heading. Put at least a sentence between them.
- Use tables for reference material and prose for reasoning.
