# Contributing

Thank you for contributing to `@stackql/mcp-wringer`.

Before contributing, read [AGENTS.md](./AGENTS.md) for project scope, design rules, and safety defaults.

## Setup

1. Install Node 22 or later.
2. Install dependencies:
   - `npm ci`
3. Run checks:
   - `npm run check`

## Pull requests

- Keep changes scoped to one milestone or one coherent fix.
- Include tests with functional changes.
- Keep findings private if they involve third-party servers.
- Do not weaken safety defaults to pass tests.
