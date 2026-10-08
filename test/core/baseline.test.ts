import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { runFuzz } from "../../src/core/run.js";
import { inspectServer } from "../../src/cli/inspect.js";

const fixture = resolve("fixtures/stdio-server.mjs");
const directories: string[] = [];

afterEach(async () => {
  await Promise.all(directories.splice(0).map((path) => rm(path, { recursive: true, force: true })));
});

async function createBaseline(findingIds: string[]): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), "mcp-wringer-baseline-"));
  directories.push(directory);
  const path = join(directory, "baseline.json");
  await writeFile(path, JSON.stringify({ formatVersion: 1, findingIds }), "utf8");
  return path;
}

describe("finding baselines", () => {
  it("reports confirmed findings as new and non-reproducing entries as stale", async () => {
    const revision = "2025-11-25";
    const surface = await inspectServer(revision, {
      command: process.execPath,
      args: [fixture, "--revision", revision],
    });
    const baselinePath = await createBaseline(["known-stale-finding"]);
    const result = await runFuzz({
      command: process.execPath,
      args: [fixture, "--revision", revision],
      env: { MCP_WRINGER_DEFECTS: "wrong-response-id" },
      revision,
      seed: 11,
      cases: 1,
      durationMs: 30_000,
      confirmations: 1,
      surface,
      baselinePath,
    });

    expect(result.findings.length).toBeGreaterThan(0);
    expect(result.baseline?.newFindingIds).toEqual(result.findings.map((finding) => finding.id));
    expect(result.baseline?.staleFindingIds).toEqual(["known-stale-finding"]);
  }, 30_000);

  it("rejects malformed baseline documents", async () => {
    const directory = await mkdtemp(join(tmpdir(), "mcp-wringer-baseline-"));
    directories.push(directory);
    const baselinePath = join(directory, "baseline.json");
    await writeFile(baselinePath, JSON.stringify({ formatVersion: 1, findingIds: [42] }), "utf8");

    await expect(runFuzz({
      command: "missing-target-for-baseline-test",
      args: [],
      revision: "2025-11-25",
      seed: 1,
      cases: 1,
      durationMs: 1000,
      baselinePath,
    })).rejects.toThrow("must contain formatVersion 1 and a unique string array");
  });
});
