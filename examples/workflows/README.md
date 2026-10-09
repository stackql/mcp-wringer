# GitHub Actions workflow examples

These examples are templates for servers you own or are authorised to test. Trusted Actions use floating major-version tags to receive upstream updates within a major version. The MCP Wringer checkout uses `v0`, which becomes available after the first release and moving major tag are published.

The examples check out MCP Wringer into `.github/actions/mcp-wringer` and invoke it locally. Keep the target isolated and do not pass real credentials to it.

## Pull request gate

Save as `.github/workflows/mcp-wringer.yml`:

```yaml
name: MCP robustness

on:
  pull_request:

permissions: {}

jobs:
  fuzz:
    runs-on: ubuntu-latest
    permissions:
      contents: read
    steps:
      - name: Checkout application
        uses: actions/checkout@v7

      - name: Checkout MCP Wringer
        uses: actions/checkout@v7
        with:
          repository: stackql/mcp-wringer
          ref: v0
          path: .github/actions/mcp-wringer

      - name: Run quick profile
        uses: ./.github/actions/mcp-wringer
        with:
          command: node
          args: '["dist/server.js"]'
          profile: quick
          seed: ${{ github.run_id }}
          fail_on: high
          report_directory: .mcp-wringer/reports
```

## Scheduled deep run

Save as `.github/workflows/mcp-wringer-nightly.yml`:

```yaml
name: Scheduled MCP robustness

on:
  schedule:
    - cron: "17 3 * * 2"
  workflow_dispatch:

permissions: {}

jobs:
  fuzz:
    runs-on: ubuntu-latest
    permissions:
      contents: read
    steps:
      - name: Checkout application
        uses: actions/checkout@v7

      - name: Checkout MCP Wringer
        uses: actions/checkout@v7
        with:
          repository: stackql/mcp-wringer
          ref: v0
          path: .github/actions/mcp-wringer

      - name: Run deep profile
        uses: ./.github/actions/mcp-wringer
        with:
          command: node
          args: '["dist/server.js"]'
          profile: deep
          seed: ${{ github.run_id }}
          fail_on: high
          report_directory: .mcp-wringer/reports
```

## Upload SARIF to code scanning

Save as `.github/workflows/mcp-wringer-sarif.yml`:

```yaml
name: MCP robustness SARIF

on:
  pull_request:

permissions: {}

jobs:
  fuzz:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      security-events: write
    steps:
      - name: Checkout application
        uses: actions/checkout@v7

      - name: Checkout MCP Wringer
        uses: actions/checkout@v7
        with:
          repository: stackql/mcp-wringer
          ref: v0
          path: .github/actions/mcp-wringer

      - name: Run quick profile
        id: wringer
        uses: ./.github/actions/mcp-wringer
        with:
          command: node
          args: '["dist/server.js"]'
          profile: quick
          seed: ${{ github.run_id }}
          fail_on: high

      - name: Upload SARIF
        if: always()
        uses: github/codeql-action/upload-sarif@v4
        with:
          sarif_file: ${{ steps.wringer.outputs.sarif_path }}
```

Code scanning uploads require `security-events: write`. Pull request workflows from forks may not receive this permission, so use the repository's approved SARIF upload workflow for those events.
