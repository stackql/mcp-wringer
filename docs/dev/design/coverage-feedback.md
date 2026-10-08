# Coverage feedback experiment

Coverage feedback is an opt-in experiment, disabled by default. The `node-v8` provider reads V8 range records written when Node exits. The `go-cover` provider converts Go coverage data written by binaries built with `go build -cover`. Each batch runs one generator at a time, closes its target processes, collects cumulative coverage, then uses deterministic UCB-style exploration and newly covered range counts to choose later generators. A failed target can terminate before writing coverage; that batch contributes no coverage, and the run records a diagnostic rather than replacing its protocol findings with a collection error.

Coverage mode requires a spawned stdio target, one worker, and `restartPolicy: "per-case"`. The provider's environment variable is set by the runner and redacted from traces. A user-supplied value for that variable is rejected. Plugins may register providers through `registerCoverageProvider`.

## Evaluation

The measurements were collected on the Windows development host with Node 24.19.0 and Go 1.26.6. `npm run evaluate:coverage-feedback` built the Go fixture once, then ran each comparison three times using seed 91, one fresh-target confirmation, the built-in generator schedule, and batch size 1. Case budgets matched the established first-detection scenarios: one case for `invalid-schema` and `wrong-response-id`, two for `accepts-malformed`, and three for `wrong-error-code`. The Go fixture was tested with `wrong-error-code`. `cases needed` is the one-based first observed case for the expected rule; `confirmed` counts runs where the expected finding passed fresh-target confirmation. `total run` is the median `FuzzRunResult.durationMs` across repetitions and includes scenario execution and confirmation. It excludes building the Go fixture, which took 894 ms once.

| Target | Defect | Cases without feedback | Cases with feedback | Median run without feedback | Median run with feedback | Confirmed | Median covered features with feedback |
|---|---|---:|---:|---:|---:|---:|---:|
| Node fixture | `invalid-schema` | 1 | 1 | 228 ms | 235 ms | 3/3 | 520 |
| Node fixture | `wrong-response-id` | 1 | 1 | 3,684 ms | 3,414 ms | 3/3 | 0 |
| Node fixture | `accepts-malformed` | 2 | 2 | 512 ms | 650 ms | 3/3 | 528 |
| Node fixture | `wrong-error-code` | 2 | 2 | 742 ms | 727 ms | 3/3 | 527 |
| Go fixture | `wrong-error-code` | 3 | 3 | 601 ms | 2,316 ms | 3/3 | 19 |

The `wrong-response-id` fixture makes the target fail before V8 writes its coverage file. The provider returned an explicit collection error; the runner retained the confirmed finding, recorded the unavailable batch in diagnostics, and reported zero coverage features. The Go result shows useful coverage collection, but the short run was about 3.9 times slower with feedback. Across this small matrix, coverage feedback did not reduce cases to first detection because the initial generator exploration follows the existing default order.

## Recommendation

**Change.** Keep the feature experimental and disabled by default. The current measurements show that the providers return useful feedback for clean and non-crashing cases, but not a detection-speed improvement in these short runs; Go collection adds substantial overhead, and abruptly terminated targets may provide no coverage. Repeat the evaluation with larger budgets and varied seeds before considering broader use. Do not present coverage as an oracle or as evidence that a target is correct.

The benchmark is limited to the two local fixtures, one MCP revision, five defect/target combinations, three repetitions of the same seed, and a single batch-size setting. It does not establish performance on attached HTTP targets, other runtimes, or production servers.
