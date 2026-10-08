import { execFile, execFileSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { promisify } from "node:util";
import { afterEach, describe, expect, it } from "vitest";
import { inspectServer } from "../../src/cli/inspect.js";
import { goCoverageProvider } from "../../src/coverage-feedback/go-cover.js";
import { nodeV8CoverageProvider } from "../../src/coverage-feedback/node-v8.js";
import { runFuzz, runSingleScenario } from "../../src/core/run.js";
import { CoverageError } from "../../src/core/errors.js";
import type { SpecRevision } from "../../src/core/types.js";
import { generateScenarios } from "../../src/generators/index.js";
import { writeRunReports } from "../../src/reporters/run.js";

const execFileAsync = promisify(execFile);
const fixture = resolve("fixtures/stdio-server.mjs");
const goFixture = resolve("fixtures/go-server/main.go");
const directories: string[] = [];
const goAvailable = canRunGo();

afterEach(async () => {
  await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

describe("coverage providers", () => {
  it("collects deterministic V8 range identities and ignores unexecuted ranges", async () => {
    const directory = await temporaryDirectory();
    await writeFile(join(directory, "one.json"), JSON.stringify({
      result: [{
        url: "file:///fixture.js",
        functions: [{
          ranges: [
            { startOffset: 0, endOffset: 12, count: 1 },
            { startOffset: 13, endOffset: 20, count: 0 },
          ],
        }],
      }],
    }), "utf8");

    await expect(nodeV8CoverageProvider.collect(directory))
      .resolves.toEqual(new Set(["file:///fixture.js:0-12"]));
  });

  it("reports an invalid Go coverage directory as an explicit coverage error", async () => {
    const directory = await temporaryDirectory();

    await expect(goCoverageProvider.collect(directory)).rejects.toBeInstanceOf(CoverageError);
  });
});

describe("coverage-guided runs", () => {
  it("rejects unsupported targets and conflicting coverage environment variables", async () => {
    const revision: SpecRevision = "2025-11-25";
    const surface = { specRevision: revision, tools: [], resources: [], prompts: [] };
    await expect(runFuzz({
      transport: "streamable-http",
      url: "http://127.0.0.1:1",
      revision,
      surface,
      coverageFeedback: { provider: "node-v8", batchSize: 1 },
    })).rejects.toBeInstanceOf(CoverageError);
    await expect(runFuzz({
      command: process.execPath,
      args: [],
      revision,
      surface,
      env: { node_v8_coverage: "caller-value" },
      coverageFeedback: { provider: "node-v8", batchSize: 1 },
    })).rejects.toThrow("Do not set node_v8_coverage");
    await expect(runFuzz({
      command: process.execPath,
      args: [],
      revision,
      surface,
      workers: 2,
      coverageFeedback: { provider: "node-v8", batchSize: 1 },
    })).rejects.toThrow("workers=1");
    await expect(runFuzz({
      command: process.execPath,
      args: [],
      revision,
      surface,
      restartPolicy: "never",
      coverageFeedback: { provider: "node-v8", batchSize: 1 },
    })).rejects.toThrow("restartPolicy='per-case'");
  });

  it("collects V8 coverage after each generator batch and records the batch schedule", async () => {
    const revision: SpecRevision = "2025-11-25";
    const surface = await inspectServer(revision, { command: process.execPath, args: [fixture, "--revision", revision] });
    const result = await runFuzz({
      command: process.execPath,
      args: [fixture, "--revision", revision],
      revision,
      seed: 73,
      cases: 3,
      durationMs: 30_000,
      workers: 1,
      restartPolicy: "per-case",
      confirmations: 1,
      surface,
      corpusDirectory: await temporaryDirectory(),
      generatorSequence: ["schema-valid", "schema-mutated"],
      coverageFeedback: { provider: "node-v8", batchSize: 1 },
    });

    expect(result.casesRun).toBe(3);
    expect(result.coverageFeedback).toMatchObject({
      provider: "node-v8",
      batches: 3,
    });
    expect(result.coverageFeedback?.features).toBeGreaterThan(0);
    expect(result.coverageFeedback?.generatorBatches.slice(0, 2))
      .toEqual(["schema-valid", "schema-mutated"]);
    const reportDirectory = await temporaryDirectory();
    await writeRunReports({
      directory: reportDirectory,
      run: result,
      target: {
        transport: "stdio",
        command: process.execPath,
        args: [fixture, "--revision", revision],
      },
      environmentNames: [],
    });
    const metadata = JSON.parse(await readFile(join(reportDirectory, "run-metadata.json"), "utf8")) as {
      coverageFeedback?: { features: number };
    };
    expect(metadata.coverageFeedback?.features).toBe(result.coverageFeedback?.features);
  }, 45_000);

  it.skipIf(!goAvailable)("collects Go coverage and checks the fixture defect on a fresh run", async () => {
    const directory = await temporaryDirectory();
    const binary = join(directory, process.platform === "win32" ? "go-fixture.exe" : "go-fixture");
    await execFileAsync("go", ["build", "-cover", "-o", binary, goFixture], { windowsHide: true });
    const revision: SpecRevision = "2025-11-25";
    const surface = await inspectServer(revision, { command: binary, args: [] });
    const scenario = generateScenarios(revision, surface, 91, 1, ["jsonrpc-envelope"])[0];
    if (scenario === undefined) {
      throw new Error("Expected a generated Go fixture scenario.");
    }
    const directRun = await runSingleScenario({
      command: binary,
      args: [],
      revision,
      scenario,
      surface,
      env: { MCP_WRINGER_DEFECTS: "wrong-error-code" },
    });
    expect(directRun.findings.map((finding) => finding.ruleId)).toContain("error-code.unexpected-code");
    const plainRun = await runFuzz({
      command: binary,
      args: [],
      revision,
      seed: 91,
      cases: 1,
      durationMs: 30_000,
      workers: 1,
      restartPolicy: "per-case",
      confirmations: 1,
      surface,
      env: { MCP_WRINGER_DEFECTS: "wrong-error-code" },
      corpusDirectory: await temporaryDirectory(),
      generatorSequence: ["jsonrpc-envelope"],
    });
    expect(plainRun.findings.map((finding) => finding.ruleId)).toContain("error-code.unexpected-code");
    const cleanCoverageRun = await runFuzz({
      command: binary,
      args: [],
      revision,
      seed: 91,
      cases: 2,
      durationMs: 30_000,
      workers: 1,
      restartPolicy: "per-case",
      confirmations: 1,
      surface,
      corpusDirectory: await temporaryDirectory(),
      generatorSequence: ["jsonrpc-envelope"],
      coverageFeedback: { provider: "go-cover", batchSize: 1 },
    });
    expect(cleanCoverageRun.findings).toEqual([]);
    expect(cleanCoverageRun.coverageFeedback?.features).toBeGreaterThan(0);
    const result = await runFuzz({
      command: binary,
      args: [],
      revision,
      seed: 91,
      cases: 1,
      durationMs: 30_000,
      workers: 1,
      restartPolicy: "per-case",
      confirmations: 1,
      surface,
      env: { MCP_WRINGER_DEFECTS: "wrong-error-code" },
      corpusDirectory: await temporaryDirectory(),
      generatorSequence: ["jsonrpc-envelope"],
      coverageFeedback: { provider: "go-cover", batchSize: 1 },
    });

    expect(result.casesRun).toBe(1);
    expect(result.findings.map((finding) => finding.ruleId)).toContain("error-code.unexpected-code");
    expect(result.firstFindingCases?.["error-code.unexpected-code"]).toBe(1);
    expect(result.coverageFeedback?.provider).toBe("go-cover");
    expect(result.coverageFeedback?.features).toBeGreaterThan(0);
  }, 60_000);
});

async function temporaryDirectory(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), "mcp-wringer-coverage-test-"));
  directories.push(directory);
  return directory;
}

function canRunGo(): boolean {
  try {
    execFileSync("go", ["version"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}
