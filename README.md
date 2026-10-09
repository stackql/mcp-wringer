# mcp-wringer

`@stackql/mcp-wringer` is a protocol robustness fuzzer for Model Context Protocol (MCP) servers over stdio and Streamable HTTP, with a focus on deterministic, replayable findings.

It is provided as both:

- an npm CLI (`mcp-wringer`)
- a GitHub Action

Use it only on servers you own or are explicitly authorised to test.

This repository is currently implementing Work order 001. See [AGENTS.md](./AGENTS.md) for project scope and design rules.

## Run a stdio test

Use `run` to start a local server, generate scenarios, and write reports:

```sh
npx mcp-wringer run --spec 2025-11-25 --profile quick --seed 12345 -- node path/to/server.js
```

The built-in profiles are `quick` (18 cases), `standard` (256 cases), and `deep` (2,000 cases). The default profile is `quick`. Reports and response-novelty corpus entries are written under `.mcp-wringer/` unless their directories are overridden. `findings.json` includes the root seed and is stable for repeated runs against a deterministic server.

The target receives a minimal environment by default. Pass individual variables with repeated `--env NAME=VALUE` options; `--inherit-env` opts into passing the caller's environment. Tool calls are limited to tools advertising `readOnlyHint: true`. Use `--allow-tool NAME` to explicitly permit a tool without that annotation. Destructive tools require an exact-name allow entry.

Use `mcp-wringer init` to create a starter config, `mcp-wringer list` to view registered components, and `mcp-wringer run --show-config` to inspect resolved values and their origins. Configuration can set plugin modules, generator weights, enabled oracles and reporters, and a finding baseline. See the [quick start](./docs/quick-start.md), [configuration reference](./docs/config-reference.md), [oracle and report catalogue](./docs/oracles.md), [reproducer format](./docs/reproducers.md), [plugin guide](./docs/plugins.md), and [safety notes](./docs/safety.md).

Replay a report reproducer with the same target environment when needed:

```sh
npx mcp-wringer replay .mcp-wringer/reports/reproducers/<finding-id>.repro.json --env NAME=VALUE
```

`replay` writes the captured trace as JSON to stdout. To minimize a reproducer while confirming the finding on fresh targets:

```sh
npx mcp-wringer minimize .mcp-wringer/reports/reproducers/<finding-id>.repro.json --env NAME=VALUE
```

## Experimental coverage feedback

Coverage-guided scheduling is disabled by default. Enable it in the config file for a spawned stdio target:

```json
{
  "coverageFeedback": {
    "enabled": true,
    "provider": "node-v8",
    "batchSize": 8
  },
  "workers": 1,
  "restartPolicy": "per-case"
}
```

The built-in providers are `node-v8` and `go-cover`; `mcp-wringer list coverage-providers` lists registered providers. Node targets must run under Node. Go targets must be built with `go build -cover`, and the Go tool must be on `PATH` so coverage data can be converted. Coverage is collected after each generator batch, and newly covered ranges influence later generator selection. This mode requires a spawned stdio target, one worker, and `restartPolicy: "per-case"`. A target that fails before writing coverage still has its findings processed, but that batch may contribute no feedback. Coverage providers can also be registered by trusted plugins; see the [plugin guide](./docs/plugins.md).

## Run a Streamable HTTP test

Attach to a local endpoint with `--url`:

```sh
npx mcp-wringer run --url http://127.0.0.1:3000/mcp --spec 2025-11-25 --profile quick
```

To start a fixture or server process that listens on a known URL, provide both `--url` and the command:

```sh
npx mcp-wringer run --transport streamable-http --url http://127.0.0.1:3000/mcp --spec 2025-11-25 -- node server.js
```

Attach mode refuses non-loopback hosts unless `--allow-non-loopback` is supplied. Use that flag only for a target you own or are explicitly authorised to test. Reproducers can be replayed over the other transport with `--transport` and, for HTTP, `--url`.

For `--spec 2026-07-28`, the HTTP adapter sends the `Mcp-Method` header on every request and the `Mcp-Name` header for `tools/call`, `prompts/get` and `resources/read`, as that revision requires. It does not yet mirror tool parameters declared with `x-mcp-header`. A server that rejects the selected revision during inspection, for example a stateful server asked for 2026-07-28, ends the run with exit code 3.

Run the tool only against fixtures, the reference server, or a server you own or are authorised to test. Isolate the target and do not provide it with real credentials.

## Use the GitHub Action

The Action runs on Node 24 supplied by the GitHub runner. It needs no token or GitHub permissions. It writes reports and a job summary; uploading artifacts or SARIF is a separate workflow step. See the [example workflows](./examples/workflows/) for report upload examples.

After the first release and its moving `v0` tag are published, use the following step in a job that has already checked out and prepared your local target. `@v0` follows releases within major version 0:

```yaml
- name: Fuzz the local MCP server
  uses: stackql/mcp-wringer@v0
  with:
    command: node
    args: '["path/to/server.js"]'
    profile: quick
    seed: "12345"
    fail_on: high
    report_directory: .mcp-wringer/reports
```

## Publishing releases

Both publication steps are performed by a maintainer. npm publication is manual and uses interactive 2FA. Publishing a GitHub release does not publish the npm package: the [release workflow](./.github/workflows/release.yml) only validates the tagged artifacts. StackQL CI integration is a separate follow-up.

### Prepare the release

Use Node 24 and a current npm CLI. Start from a reviewed checkout with dependencies installed using `npm ci`. Run each command below separately, and stop if any command fails:

```sh
npm run check
npm run test:matrix
npm run build
npm run check:action
npm run test:action
npm run check:plugin-api
npm run check:package
npm run docs:config:check
```

`check:action` rebuilds the committed Action bundle and checks for drift. If the bundle needs updating, review and commit the generated changes before rerunning the checks. `check:package` previews the npm tarball and checks its file allowlist and required entry points. Review that listing for credentials or unwanted files as well.

The initial package version is `0.1.0`, with release tag `v0.1.0`. For later releases, update the package and lockfile together with `npm version patch --no-git-tag-version` (or `minor` / `major` as appropriate), then repeat the checks. Commit and merge the release changes, and confirm a clean working tree. npm and the Action must be released from the same commit. Published npm versions and `vX.Y.Z` tags must never be overwritten.

### Publish to npmjs

The maintainer's npm account must have 2FA enabled and permission to publish under the `@stackql` organization. Check that the intended version has not already been published. From the validated release checkout, run these commands separately and stop on any error:

```sh
npm login --registry=https://registry.npmjs.org/
npm whoami --registry=https://registry.npmjs.org/
npm publish --access public --registry=https://registry.npmjs.org/
```

Complete the browser login and any 2FA prompts. `--access public` is required for this scoped public package; the package also sets public access in `publishConfig`. Do not put an OTP or npm token into source, scripts, or GitHub secrets. Local publication does not provide GitHub Actions OIDC provenance; do not add `--provenance` to this manual procedure.

Verify the published version (substitute the release version for later releases). Run the `npx` command from a directory outside the repository checkout: inside it, `npx` matches the checkout's own package name and fails with `'mcp-wringer' is not recognized` or `command not found`, because the package's bin is not linked into its own `node_modules/.bin`.

```sh
npm view @stackql/mcp-wringer@0.1.0 version dist.integrity --registry=https://registry.npmjs.org/
cd "$(mktemp -d)" && npx --yes --registry=https://registry.npmjs.org/ @stackql/mcp-wringer@0.1.0 --help
```

Confirm the package is public on [npmjs](https://www.npmjs.com/package/@stackql/mcp-wringer). The [npm scoped-package guide](https://docs.npmjs.com/creating-and-publishing-scoped-public-packages) describes account and publication requirements.

### Publish the GitHub Marketplace Action

The repository is public and has one root [action.yml](./action.yml), with display name `MCP Wringer` and entry point `dist-action/index.cjs`. Marketplace publication uses a GitHub release, not `npm publish`, and must be completed in the GitHub UI by a maintainer with release permissions.

1. Confirm npm publication succeeded and the release commit passed CI, including the committed Action bundle check.
2. Open [action.yml on GitHub](https://github.com/stackql/mcp-wringer/blob/main/action.yml) and select **Draft a release** from the Marketplace banner, or open the repository's [new release form](https://github.com/stackql/mcp-wringer/releases/new).
3. Select **Publish this Action to the GitHub Marketplace**. If disabled, a StackQL organization owner must accept the GitHub Marketplace Developer Agreement using the link in the release form.
4. Check GitHub's metadata validation, including the uniqueness of `MCP Wringer`. Resolve any error before proceeding; name availability is not guaranteed until GitHub validates it.
5. Choose **Testing** as the primary category, and optionally **Security** as the secondary category.
6. Create tag `v0.1.0` at the exact validated release commit (use the matching `vX.Y.Z` for later releases), title the release `v0.1.0`, and include release notes. Do not select a prerelease for the stable release.
7. Click **Publish release** and complete GitHub's authentication prompts. Confirm the Marketplace listing is visible and the **Validate release** workflow succeeds. This workflow does not publish to npm.
8. After validation, create or update the moving `v0` major tag to the same commit. Keep `v0.1.0` immutable. The workflow examples use `@v0` to receive updates within that major version.
9. Run the [Published Action smoke](./.github/workflows/published-action-smoke.yml) workflow from the Actions tab. It pulls the Action from `@v0` and the package from the npm registry, runs both against the fixture server at that tag on Linux (x64 and arm64), macOS and Windows, and checks that the npm `latest` version matches the tag. It also runs weekly as a canary.

Test the published Action against an isolated authorized server before integrating it into another project's CI. The StackQL repository runs it as a pull request gate in its `mcp-wringer` workflow, which builds the server from the pull request and fuzzes stdio and Streamable HTTP in both protocol revisions on each platform it ships. Record the Marketplace URL and release commit SHA. See [GitHub's Marketplace publication guide](https://docs.github.com/en/actions/how-tos/create-and-publish-actions/publish-in-github-marketplace) and the [maintainer release checklist](./docs/dev/release-checklist.md).
