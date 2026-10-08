import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { loadConfiguration } from "../../src/config/load.js";

const directories: string[] = [];

afterEach(async () => {
  await Promise.all(directories.splice(0).map((path) => rm(path, { recursive: true, force: true })));
});

async function createConfig(contents: unknown): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), "mcp-wringer-config-"));
  directories.push(directory);
  const path = join(directory, "config.json");
  await writeFile(path, JSON.stringify(contents), "utf8");
  return path;
}

describe("configuration loading", () => {
  it("merges defaults, profiles, files, environment, and CLI overrides in precedence order", async () => {
    const configPath = await createConfig({
      profile: "fast",
      profiles: { fast: { cases: 3, durationMs: 1_000 } },
      cases: 4,
    });
    const loaded = await loadConfiguration({
      configPath,
      environment: { MCP_WRINGER_CASES: "5" },
      overrides: { cases: 6 },
    });

    expect(loaded.config.cases).toBe(6);
    expect(loaded.config.durationMs).toBe(1_000);
    expect(loaded.origins.cases).toBe("command line");
    expect(loaded.origins.durationMs).toBe("profile:fast");
    expect(loaded.origins["reporters.0.options"]).toBe("defaults");
    expect(loaded.origins[""]).toBeUndefined();
  });

  it("rejects unknown config keys and suggests a close match", async () => {
    const configPath = await createConfig({ case: 1 });
    await expect(loadConfiguration({ configPath, environment: {} }))
      .rejects.toThrow("Unknown configuration key 'case'. Did you mean 'cases'?");
  });

  it("loads environment array values as JSON and rejects invalid scalar values", async () => {
    const loaded = await loadConfiguration({
      environment: {
        MCP_WRINGER_ALLOW_TOOLS: '["read-status"]',
        MCP_WRINGER_ARGUMENT_STRATEGIES: '[{"name":"generic-json-schema"}]',
        MCP_WRINGER_WORKERS: "2",
      },
    });
    expect(loaded.config.allowTools).toEqual(["read-status"]);
    expect(loaded.config.argumentStrategies).toEqual([{
      name: "generic-json-schema",
      enabled: true,
      options: {},
    }]);
    expect(loaded.config.workers).toBe(2);
    await expect(loadConfiguration({ environment: { MCP_WRINGER_WORKERS: "0" } }))
      .rejects.toThrow("must be a positive integer");
  });

  it("suggests a matching rule when an oracle severity override names an unknown rule", async () => {
    const configPath = await createConfig({
      oracles: [{
        name: "jsonrpc-contract",
        enabled: true,
        options: {},
        severityOverrides: { "jsonrpc-contract.invalid-mesage": "low" },
      }],
    });
    await expect(loadConfiguration({ configPath, environment: {} }))
      .rejects.toThrow("Unknown oracle rule 'jsonrpc-contract.invalid-mesage'. Did you mean 'jsonrpc-contract.invalid-message'?");
  });

  it("applies defaults to configured argument strategy entries", async () => {
    const configPath = await createConfig({
      argumentStrategies: [{ name: "generic-json-schema" }],
    });
    const loaded = await loadConfiguration({ configPath, environment: {} });
    expect(loaded.config.argumentStrategies).toEqual([{
      name: "generic-json-schema",
      enabled: true,
      options: {},
    }]);
  });

  it("keeps coverage feedback disabled by default and validates selected providers", async () => {
    const defaults = await loadConfiguration({ environment: {} });
    expect(defaults.config.coverageFeedback).toEqual({
      enabled: false,
      provider: "node-v8",
      batchSize: 8,
    });

    const configPath = await createConfig({
      coverageFeedback: { enabled: true, provider: "node-v88", batchSize: 4 },
    });
    await expect(loadConfiguration({ configPath, environment: {} }))
      .rejects.toThrow("Unknown coverage provider 'node-v88'. Did you mean 'node-v8'?");
  });
});
