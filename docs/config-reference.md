# Configuration reference

This document and [config.schema.json](../config.schema.json) are generated from `src/config/definition.ts` by `npm run docs:config`. Do not edit them by hand.

## Loading and precedence

Configuration is merged in this order, from lowest to highest priority: built-in defaults, the selected profile, the configuration file, `MCP_WRINGER_*` environment variables, and CLI flags. Unknown keys and invalid values are errors. Use `mcp-wringer run --show-config` to print the resolved values and their origins.

## Options

| Key | Type | Requirement | Default | Description |
|---|---|---|---|---|
| `$schema` | string | Required | `"https://raw.githubusercontent.com/stackql/mcp-wringer/main/config.schema.json"` | JSON Schema used by editors to validate this file. |
| `profile` | string | Required | `"quick"` | Named partial configuration profile. |
| `profiles` | object | Required | `{}` | User-defined named partial configuration profiles. |
| `specRevision` | `2025-11-25`, `2026-07-28` | Required | `"2025-11-25"` | MCP specification revision used for lifecycle and response validation. |
| `seed` | integer or string | Optional | - | Root seed. Omit to generate a seed at run time. |
| `cases` | integer | Required | `18` | Maximum scenarios to execute. |
| `durationMs` | integer | Required | `30000` | Maximum run duration in milliseconds. |
| `workers` | integer | Required | `1` | Number of independent target workers. |
| `restartPolicy` | `per-case`, `on-failure`, `never` | Required | `"per-case"` | When to restart a spawned target between scenarios. |
| `timeoutMs` | integer | Required | `5000` | Default per-request and target startup timeout in milliseconds. |
| `confirmations` | integer | Required | `2` | Fresh-target replays required to confirm a finding. |
| `transport` | `stdio`, `streamable-http` | Required | `"stdio"` | Transport used to communicate with the target. |
| `url` | string | Optional | - | Streamable HTTP endpoint. Non-loopback attach requires explicit authorization. |
| `command` | string | Optional | - | Executable used to start a spawned target. |
| `args` | array | Required | `[]` | Argument array for the spawned target command. |
| `env` | object | Required | `{}` | Environment variables passed to the spawned target. |
| `inheritEnvironment` | boolean | Required | `false` | Pass the caller's environment to the target in addition to configured values. |
| `allowNonLoopback` | boolean | Required | `false` | Authorize attach mode to connect to a non-loopback HTTP address. |
| `allowTools` | array | Required | `[]` | Exact tool names permitted when they are not annotated read-only. |
| `argumentStrategies` | array | Required | `[]` | Argument strategy registry selections. Empty enables all registered strategies. |
| `failOn` | `high`, `medium`, `low`, `info` | Required | `"high"` | Lowest finding severity that makes the CLI exit with code 1. |
| `reportDirectory` | string | Required | `".mcp-wringer/reports"` | Directory for run reports and reproducer files. |
| `corpusDirectory` | string | Required | `".mcp-wringer/corpus"` | Directory for response-novelty corpus entries. |
| `baselinePath` | string | Optional | - | JSON file containing finding IDs to use as the baseline. |
| `plugins` | array | Required | `[]` | Explicit plugin module paths or package specifiers to load. |
| `generators` | array | Required | `[]` | Generator registry selections. Empty uses the built-in default schedule. |
| `oracles` | array | Required | `[]` | Oracle registry selections. Empty enables every registered oracle. |
| `reporters` | array | Required | `[{"name":"console","enabled":true,"options":{}},{"name":"json","enabled":true,"options":{}}]` | Report formats selected by registry name. |

## Profiles

Built-in profiles are `quick`, `standard`, and `deep`. A `profiles` object in the config file can add named partial configurations. Select one with `profile` or `--profile`.

## Extension selections

`argumentStrategies`, `generators`, `oracles`, and `reporters` are arrays of objects with a registry `name`, an `enabled` flag, and an `options` object. An empty argument strategy list enables all registered strategies. Generator selections also accept a positive `weight`; oracle selections accept a `severityOverrides` map from rule IDs to `high`, `medium`, `low`, or `info`. An empty generator list uses the built-in schedule, and an empty oracle list enables all registered oracles.

## Baseline format

A baseline is a JSON object containing format version 1 and unique finding IDs:

```json
{
  "formatVersion": 1,
  "findingIds": ["<finding-id>"]
}
```

The run fails if a confirmed finding is new or a baseline ID no longer reproduces.
