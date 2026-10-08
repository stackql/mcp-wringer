# mcp-wringer

`@stackql/mcp-wringer` is being built as a protocol robustness fuzzer for Model Context Protocol (MCP) servers over stdio and Streamable HTTP, with a focus on deterministic, replayable findings.

It is provided as both:

- an npm CLI (`mcp-wringer`)
- a GitHub Action

Use it only on servers you own or are explicitly authorised to test.

This repository is currently implementing Work order 001. See [AGENTS.md](./AGENTS.md) for project scope and design rules.
