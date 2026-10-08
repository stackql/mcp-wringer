# GitHub Actions workflow examples

These examples are templates for servers you own or are authorised to test. They deliberately use a placeholder for the MCP Wringer checkout revision. Replace `<full-commit-sha>` with the reviewed 40-character commit SHA of this repository; do not use a moving branch or tag in a production workflow. The checkout action itself is pinned to a full commit SHA.

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
        uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1

      - name: Checkout MCP Wringer
        uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1
        with:
          repository: stackql/mcp-wringer
          ref: <full-commit-sha>
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
        uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1

      - name: Checkout MCP Wringer
        uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1
        with:
          repository: stackql/mcp-wringer
          ref: <full-commit-sha>
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
        uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1

      - name: Checkout MCP Wringer
        uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1
        with:
          repository: stackql/mcp-wringer
          ref: <full-commit-sha>
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
        uses: github/codeql-action/upload-sarif@2892aa5e19bbd11bc0cff5427e3b750a04d9e3c2
        with:
          sarif_file: ${{ steps.wringer.outputs.sarif_path }}
```

Code scanning uploads require `security-events: write`. Pull request workflows from forks may not receive this permission, so use the repository's approved SARIF upload workflow for those events.
