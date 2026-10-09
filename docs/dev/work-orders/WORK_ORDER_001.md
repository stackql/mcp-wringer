# Work order 001: build mcp-wringer v0.1

This work order asks you to build the first working version of `@stackql/mcp-wringer`, from an empty repository to a tool that can be released. Read `AGENTS.md` in the repository root before anything else. It holds the design rules and conventions, and this document assumes you have read it.

## Context

`mcp-wringer` is a protocol robustness fuzzer for Model Context Protocol (MCP) servers. It is being built by StackQL Studios, who maintain an MCP server of their own and want two things from this project: better robustness testing for that server, and a general-purpose open-source tool that other MCP server maintainers can use. The second goal is the one that shapes the work. The tool will be shown to security researchers, including people who review open-source security tooling professionally, so it will be judged on method and on evidence. A small tool whose every finding replays is worth more here than a large one with a long feature list.

The repository is empty apart from `AGENTS.md` and this file. Development cost is not a constraint, so prefer doing each part properly over doing it quickly. Correctness of the core model and the oracles matters more than the number of generators.

These decisions are already made:

| Decision | Value |
|---|---|
| Package name | `@stackql/mcp-wringer`, CLI binary `mcp-wringer` |
| Language and runtime | TypeScript, ESM, Node 22 or later |
| Transports in v0.1 | stdio and Streamable HTTP, behind a transport interface that plugins can implement |
| Spec revisions in v0.1 | `2025-11-25` and `2026-07-28` |
| Distribution | npm package, plus a GitHub Action served from the same repository |
| Extensibility | Transports, spec profiles, generators, argument strategies, oracles, reporters and profiles are all registry extensions |
| Generation library | `fast-check`, unless you find a concrete reason it does not fit, in which case say so before replacing it |

Everything else is yours to decide within the rules in `AGENTS.md`: internal structure, the exact shape of the types, tool choices for build, lint and test, and the wording of the CLI. Where you make a choice that a maintainer would want to know about, record it in the milestone report.

## Before you start

1. Read `AGENTS.md` fully.
2. Read the MCP specification for both revisions: lifecycle, transports, and the schema. Read the JSON-RPC 2.0 specification. The two MCP revisions differ in ways that affect almost every module, so do not rely on recalled knowledge of the protocol.
3. Look at the official MCP conformance suite (`modelcontextprotocol/conformance`) to see how it handles per-revision requirements and expected-failure baselines. Its baseline semantics (fail on a new failure, and fail on a stale baseline entry) are the model for ours. Check its licence before reusing any code.
4. Look up current versions of every dependency, GitHub Action and runtime you use. Confirm the layout of the schema files in the official specification repository before writing the sync script.

## Scope of v0.1

The table below fixes what is in and what is deferred. Deferred items are named so that you leave room for them in the design without building them.

| In v0.1 | Deferred, leave room in the design |
|---|---|
| Spawn and attach targets | Container-based isolation of the target |
| stdio and Streamable HTTP transports with wire faults | The deprecated HTTP+SSE transport |
| Two spec profiles | Older revisions, which should be data-only additions later |
| Client declares no capabilities. A server-initiated request is recorded and answered with a JSON-RPC error | Fuzzing the server's handling of client responses (elicitation, sampling, multi round-trip input responses). Leave room for a `respond` step |
| Request and response fuzzing | Long-lived streams such as `subscriptions/listen` |
| Generic JSON Schema argument strategy | Domain plugins, starting with a StackQL SQL grammar plugin under a later work order |
| Response-signature feedback for the corpus | Code coverage feedback, which is an experimental milestone here |
| CLI, library API, GitHub Action | Differential testing across transports |

## The hard parts

Most of this build is ordinary engineering. These are the places where a quick, plausible implementation would be wrong, and where you should spend the most thought.

**1. The scenario model.** A scenario has to be transport-neutral where its content is logical (a JSON-RPC message) and transport-specific only where the fault is (how the bytes are written). If this is wrong, either stdio assumptions leak into core or HTTP faults cannot be expressed. One shape that could work: a scenario is an ordered list of steps. A send step carries a logical message or raw bytes, plus an optional wire descriptor that only the active transport interprets. Other steps wait for a response, perform a transport operation, or delay. Lifecycle steps are explicit in the scenario, so sequence generators can mutate them and a reproducer needs nothing outside itself. Before writing code, check your design on paper against the cases below and write the result to `docs/dev/design/scenario-model.md`.

- a valid `tools/list` on both revisions over both transports
- one stdio frame split across three writes with delays between them
- two requests in flight with the same id
- a request sent before the handshake completes, on a revision that has one
- a request with no protocol version in `_meta`, on the stateless revision
- an HTTP POST whose body stops mid-JSON before the socket closes
- stdin closed while a request is in flight
- a cancellation notification racing the response it cancels

**2. Oracles that are right.** False positives are the fastest way to lose the audience this tool is for. Every oracle rule needs a citation, as `AGENTS.md` requires. Watch for these in particular:

- Over HTTP, a malformed body may legitimately produce an HTTP error status with no JSON-RPC body. Follow what the revision's transport section says, and stay silent where it says nothing.
- A slow CI runner looks like a hang. A hang counts only after it replays on a fresh target.
- An internal error (`-32603`) for bad client input is a low-severity finding, not a crash.
- A success result for malformed input is `info`. It is a lead for a human, not a violation.

**3. Two lifecycles.** Revisions up to `2025-11-25` use an `initialize` handshake and, over HTTP, sessions. Revision `2026-07-28` has neither: each request carries its protocol version and capabilities in `_meta`, `server/discover` is mandatory, and `ping` no longer exists. The lifecycle preamble, the liveness probe, the HTTP headers and the expected error codes must all come from the spec profile. If you find yourself writing `if (revision === ...)` outside `src/spec/`, the profile is missing a field.

**4. Minimisation against a live process.** Shrinking normally assumes the test is a cheap pure function. Here each attempt talks to a process that may now be dead or in a changed state. Confirm every reduction on a fresh target, cap the time spent per finding, and reduce at the scenario level (drop steps, remove a wire fault, shorten a payload) as well as at the value level. A flaky result must not be accepted as a successful reduction.

**5. Throughput against isolation.** Restarting the target for every case is the most reliable approach and the slowest. Reusing it is fast but lets one case contaminate the next. Support a restart policy (per case, on failure, never), run a liveness probe and a baseline consistency check after each case when the target is reused, and always confirm findings on a fresh target.

**6. stdio on Windows.** Pipe buffering, line endings, killing a process tree, and spawning `.cmd` shims all behave differently there. See the process handling rule in `AGENTS.md`.

**7. Coverage feedback is unproven.** Milestone M7 is an experiment. Its output is an evaluation, and "it did not help" is an acceptable result.

## Target shape

The sketches below show the intended feel of the interface. They are illustrations, not contracts, so change names where you have a better one and record the change.

```
mcp-wringer run [options] -- <server command> [args...]     spawn and fuzz over stdio
mcp-wringer run --url http://127.0.0.1:3000/mcp              attach over Streamable HTTP
mcp-wringer run --transport streamable-http --ready-url <url> -- <server command>
mcp-wringer replay <file.repro.json> [-- <server command>]
mcp-wringer minimize <file.repro.json> [-- <server command>]
mcp-wringer inspect -- <server command>                      show the surface and what the safety policy would allow
mcp-wringer init                                             write a starter config
mcp-wringer list [transports|specs|generators|oracles|reporters|profiles]
```

```ts
import { defineConfig } from '@stackql/mcp-wringer';

export default defineConfig({
  target: {
    mode: 'spawn',
    command: 'node',
    args: ['./dist/server.js'],
    env: { LOG_LEVEL: 'error' },
    restart: 'on-failure',
  },
  transport: { use: 'stdio' },
  spec: '2026-07-28',
  profile: 'quick',
  seed: 'auto',
  safety: {
    tools: { allow: ['search_*'], deny: ['delete_*'] },
  },
  generators: [
    { use: 'jsonrpc-envelope' },
    { use: 'sequence', weight: 2 },
    { use: 'tool-args', options: { maxDepth: 4 } },
  ],
  oracles: [
    { use: 'error-code', severity: { 'internal-error-for-client-input': 'info' } },
  ],
  report: { dir: './wringer-report', formats: ['json', 'sarif', 'markdown'] },
  baseline: './wringer-baseline.json',
  failOn: 'medium',
  plugins: [],
});
```

```yaml
- uses: stackql/mcp-wringer@v0
  with:
    command: node ./dist/server.js
    profile: quick
    fail-on: medium
```

## Milestones

Work through the milestones in order. Each one ends with its acceptance checks passing on Linux, macOS and Windows in CI, a commit series on a branch, and a short report at `docs/dev/milestones/M<n>.md`. If an acceptance check cannot be met, stop and report why. Do not move on and do not relax the check.

### M0: Scaffold and guardrails

Set up the repository so that everything after it lands on a checked foundation.

- Package scaffold, strict TypeScript, lint, format, test runner, and the scripts listed in `AGENTS.md`.
- CI on Linux, macOS and Windows across the supported Node versions, following the workflow rules in `AGENTS.md`.
- `LICENSE` (MIT unless the maintainer says otherwise), `SECURITY.md` pointing to private vulnerability reporting, `CONTRIBUTING.md`, `CODEOWNERS`, a Dependabot config, and a README stub that states what the tool is and that it is for servers the user owns or is authorised to test.
- A `CLAUDE.md` containing only an import of `AGENTS.md`, so tools that read either file get the same guidance.
- The spec sync script, the vendored schema files for both revisions, and `spec/SOURCE.json`.

Acceptance: a fresh clone passes `npm ci` and `npm run check` on all three platforms, and `npm run spec:sync` reproduces the vendored files byte for byte from the pinned commit.

### M1: Core model, stdio, replay

Build the types and the smallest end-to-end path.

- The scenario model design note, then the scenario, step, trace and finding types.
- A versioned reproducer format with a published JSON Schema. It is self-contained, records environment variable names but never values, and is readable in a diff.
- The registry, with every built-in registered through it from the start.
- The spawn target and the stdio transport, with byte-exact trace capture of stdout and stderr.
- Spec profile loading and lifecycle drivers for both revisions.
- The clean fixture server over stdio for both lifecycles.
- The `replay` and `inspect` commands.

Acceptance: a hand-written scenario replays against the fixture with a byte-exact trace on all three platforms, for both revisions. `inspect` lists the fixture's tools, resources and prompts with the safety classification of each tool.

### M2: Oracles and the defect fixture

Build the judgement layer and the means to test it.

- Switchable defects in the fixture. Include at least one per oracle rule and one per wire fault family. The first defect to add is a read loop that exits on a JSON decode error, since that is a bug class seen in real servers.
- The built-in oracles listed in `AGENTS.md`, each with cited rules in the per-revision rules data.
- The finding model: stable IDs, dedupe, severity, evidence excerpts.
- The `json` and `console` reporters.
- The detection matrix test and the clean-run test.

Acceptance: with hand-written scenarios, every defect is caught by the expected rule, and the clean fixture produces no findings. Also run the clean-run test against the official reference server `@modelcontextprotocol/server-everything` as a dev dependency. Investigate anything it reports. If a report is a real defect in that server, follow the private findings rule in `AGENTS.md`. If it is a false positive, fix the oracle.

### M3: Generators, run loop, minimisation

Make the tool find things on its own.

- Generators: `schema-valid`, `schema-mutated`, `jsonrpc-envelope`, `raw-json`, `sequence`, `tool-args`, `resources`, `prompts`, and `wire-fault` with the stdio fault set (split writes, coalesced frames, missing or doubled newlines, CRLF, invalid UTF-8, byte order mark, oversized frames, input closed mid-request, slow reads).
- The generic JSON Schema argument strategy, and the argument strategy extension point with matching by tool name, argument path and schema predicate.
- The safety policy applied at discovery and enforced at send time.
- The run loop: budgets by case count and by duration, per-request timeouts, restart policy, liveness and baseline consistency probes, seed derivation, optional parallel workers.
- Minimisation with fresh-target confirmation, and flaky classification.
- A corpus directory that keeps scenarios producing a new response signature.
- The `run` and `minimize` commands, and the `quick`, `standard` and `deep` profiles.

Acceptance:

- For at least five fixed seeds, the `quick` profile finds every stdio-reachable defect in the fixture. If a defect needs a larger budget, treat that as a sign the generators are too undirected and look into it before raising the budget.
- The clean fixture produces no findings at `standard`.
- The same seed run twice gives a byte-identical `findings.json`.
- Every reproducer written by a run replays with `replay`.
- With default safety settings, the trace shows no call to a fixture tool that lacks `readOnlyHint: true`, including in mutated-argument cases.
- Report the wall-clock time of `quick` on a GitHub-hosted runner. It should be short enough to gate a pull request.

### M4: Streamable HTTP

Add the second transport without changing core. If core needs to change, the transport interface was wrong, so fix the interface and note it in the report.

- The HTTP adapter, with a well-formed path and a raw-socket path for wire faults.
- Spawn mode with a readiness check, and attach mode. Attach refuses non-loopback hosts unless explicitly allowed.
- The HTTP fault set, driven by each revision's transport rules: content type and accept headers, session header misuse where sessions exist, method and name headers where they are required, truncated and oversized bodies, aborted response streams, concurrent requests.
- HTTP-specific oracle rules, with citations.
- The fixture served over HTTP with matching defects.

Acceptance: the detection matrix and clean-run gates pass over HTTP for both revisions. A reproducer with no wire fault, recorded over stdio, replays over HTTP with an equivalent result, and the reverse.

### M5: Configuration, plugins, reporters

Open the extension points and make the tool configurable.

- Config loading with the precedence, validation and unknown-key behaviour in `AGENTS.md`, plus `init`, `list` and the resolved-config printout.
- External plugin loading from config, the `@stackql/mcp-wringer/plugin` export, the committed API report and its CI check.
- An example plugin under `examples/` that adds a generator, an argument strategy, an oracle and a reporter without importing anything outside the plugin surface. Test it as a consumer would.
- The `sarif`, `junit` and `markdown` reporters. Validate SARIF output against the SARIF 2.1.0 schema in a test.
- Baseline support with new and stale detection.
- User docs: quick start, configuration reference generated from the config definition, oracle catalogue with citations, reproducer format, writing a plugin, safety.

Acceptance: the example plugin works with no change to core. Removing a field from the plugin surface fails CI. An unknown config key fails with a suggestion. The config reference check fails if an option is undocumented.

### M6: GitHub Action and release preparation

Package the tool for CI use, and prepare a release without making one.

- `action.yml` at the root, the entry point in `src/action/`, the committed `dist-action/` bundle and its CI check.
- Inputs for the server command or URL, config path, profile, seed, failure threshold and report directory. Outputs for finding counts, the SARIF path, the report directory and the seed. A job summary written from the markdown reporter.
- A workflow in this repository that runs the Action from the local checkout against the fixture, once clean and once with a defect switched on, and asserts the outcome of each.
- Documented example workflows: a pull request gate, a scheduled deep run, and SARIF upload to code scanning.
- A release workflow that publishes to npm with trusted publishing and provenance. Do not run it.
- `docs/dev/release-checklist.md` for the maintainer, covering npm trusted publisher setup, tagging, and the Marketplace steps that must be done by hand in the GitHub release form.

Acceptance: the self-test workflow passes on all three platforms. `npm pack` contains only the intended files and no install scripts. No release, tag or publish has been made.

### M7: Coverage feedback experiment

This milestone is optional and time-boxed. Skip it and say so if the earlier milestones took the available effort.

- A coverage provider extension point, off by default.
- Two providers: one for Go binaries built with coverage instrumentation, one for Node targets using V8 coverage. Both write coverage when the process exits, so feedback arrives per batch, not per case.
- An evaluation comparing runs with and without coverage feedback on the fixtures and on one Go fixture: cases needed to first detection for each defect, and total time.

Acceptance: a written evaluation in `docs/dev/design/coverage-feedback.md` with the measurements and a recommendation to keep, change or drop the feature. A negative result is acceptable. An unmeasured claim is not.

## Constraints

- Do not publish to npm, create tags or releases, or list anything on the Marketplace.
- Do not run the tool against anything except the fixtures, the reference server installed as a dev dependency, and servers the maintainer supplies.
- Do not open issues or pull requests on other repositories. Findings in third-party servers go in a git-ignored directory and in your report.
- Do not add a runtime dependency without stating the reason in the milestone report.
- Do not loosen a safety default to make a test pass.

Stop and ask the maintainer when:

- an acceptance check cannot be met as written
- the spec is ambiguous in a way that changes an oracle's verdict
- a design rule in `AGENTS.md` has to bend
- a step would need one of the actions listed above

## What to hand back

For each milestone, write `docs/dev/milestones/M<n>.md` containing:

- what was built, in a few lines
- each acceptance check, the command that verified it, and the result
- anything not verified, and why
- choices you made that the maintainer would want to know about
- deviations from this work order, with reasons
- open questions

At the end, give a short summary: which milestones are complete, what is known not to work, and the questions that need a maintainer decision. Lead with problems if there are any.

## Decisions for the maintainer

These assumptions are built into the work order. Confirm or change them before work starts, or tell the agent to proceed on the defaults.

| Question | Default assumed |
|---|---|
| Licence | MIT |
| Repository | `stackql/mcp-wringer`, which sets the `uses:` path for the Action |
| Marketplace display name, which must be unique | `MCP Wringer` |
| Minimum Node version | 22 |
| Spec revisions in v0.1 | `2025-11-25` and `2026-07-28` only |
