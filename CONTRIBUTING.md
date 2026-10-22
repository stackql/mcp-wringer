# Contributing

Thank you for contributing to `@stackql/mcp-wringer`.

Before contributing, read [AGENTS.md](./AGENTS.md) for project scope, design rules, and safety defaults.

## Setup

1. Install Node.js 22.23.4 or later, 24.22.1 or later, or 26.12.1 or later. Earlier releases in each line are affected by the [October 2026 Node.js security releases](https://nodejs.org/en/blog/vulnerability/october-2026-security-releases).
2. Install dependencies:
   - `npm ci`
3. Run checks:
   - `npm run check`

## Pull requests

- Keep changes scoped to one milestone or one coherent fix.
- Include tests with functional changes.
- Keep findings private if they involve third-party servers.
- Do not weaken safety defaults to pass tests.
