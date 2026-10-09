import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { InspectedSurface } from "../../src/target/surface.js";
import type { SpecRevision } from "../../src/core/types.js";
import { inspectServer } from "../../src/cli/inspect.js";
import { minimizeScenario } from "../../src/core/minimizer.js";
import { TargetError } from "../../src/core/errors.js";
import { loadReproducer } from "../../src/core/reproducer.js";
import { createRootSeed, deriveSeed } from "../../src/core/seed.js";
import { defaultGeneratorSequence, runFuzz, runSingleScenario } from "../../src/core/run.js";
import { generateScenarios } from "../../src/generators/index.js";
import { writeRunReports } from "../../src/reporters/run.js";

const fixture = resolve("fixtures/stdio-server.mjs");
const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((path) => rm(path, { recursive: true, force: true })));
});

describe.each(["2025-11-25", "2026-07-28"] as const)("fuzz run loop for %s", (revision) => {
  it("quick profile covers each fixture defect for five fixed seeds", async () => {
    const surface = await inspectFixture(revision);
    const defects: Array<{ name: string; scenarioIndex: number; rule: string }> = [
      { name: "hang-on-request", scenarioIndex: 0, rule: "hang.request-timeout" },
      { name: "break-liveness", scenarioIndex: 0, rule: "liveness.probe-failed" },
      { name: "stdout-pollution", scenarioIndex: 0, rule: "stdout-pollution.non-protocol-bytes" },
      { name: "wrong-response-id", scenarioIndex: 0, rule: "jsonrpc-contract.invalid-message" },
      { name: "invalid-schema", scenarioIndex: 0, rule: "schema-response.invalid-result" },
      { name: "large-response", scenarioIndex: 0, rule: "resource-usage.outlier" },
      { name: "accepts-malformed", scenarioIndex: 1, rule: "accepted-malformed.success-response" },
      { name: "wrong-error-code", scenarioIndex: 2, rule: "error-code.unexpected-code" },
      { name: "error-leak", scenarioIndex: 2, rule: "error-leak.sensitive-detail" },
      { name: "exit-on-decode-error", scenarioIndex: 3, rule: "crash.process-exit" },
      { name: "mutate-state", scenarioIndex: 5, rule: "state-consistency.baseline-changed" },
      { name: "exit-on-partial-eof", scenarioIndex: 8, rule: "crash.process-exit" },
      { name: "partial-frame-timeout", scenarioIndex: 9, rule: "crash.process-exit" },
      { name: "whole-frame-write-only", scenarioIndex: 10, rule: "crash.process-exit" },
      { name: "one-frame-per-read", scenarioIndex: 11, rule: "crash.process-exit" },
      { name: "require-final-newline", scenarioIndex: 12, rule: "crash.process-exit" },
      { name: "reject-empty-frame", scenarioIndex: 13, rule: "crash.process-exit" },
      { name: "reject-crlf", scenarioIndex: 14, rule: "crash.process-exit" },
      { name: "reject-oversized-frame", scenarioIndex: 17, rule: "crash.process-exit" },
    ];
    const seeds = [1, 17, 42, 0x1234, 0xdead_beef];
    for (const seed of seeds) {
      const scenarios = generateScenarios(revision, surface, seed, 18, defaultGeneratorSequence);
      expect(scenarios).toHaveLength(18);
      for (const defect of defects) {
        const scenario = scenarios[defect.scenarioIndex];
        if (scenario === undefined) {
          throw new Error(`Quick profile did not generate scenario ${defect.scenarioIndex}.`);
        }
        const runResult = await runSingleScenario({
          command: process.execPath,
          args: [fixture, "--revision", revision],
          revision,
          seed,
          scenario,
          surface,
          env: { MCP_WRINGER_DEFECTS: defect.name },
        });
        expect(
          runResult.findings.map((finding) => finding.ruleId),
          `${revision}, seed ${seed}, defect ${defect.name}; findings=${JSON.stringify(runResult.findings.map((finding) => finding.ruleId))}; `
            + `outcome=${JSON.stringify(runResult.result.outcome)}; `
            + `process=${JSON.stringify(runResult.result.trace.events.filter((event) => event.channel === "process" || event.channel === "stderr"))}`,
        ).toContain(defect.rule);
      }
    }
    if (revision === "2025-11-25") {
      const scenario = generateScenarios(revision, surface, 1, 1, defaultGeneratorSequence)[0];
      if (scenario === undefined) {
        throw new Error("Quick profile did not generate its first case.");
      }
      const { findings } = await runSingleScenario({
        command: process.execPath,
        args: [fixture, "--revision", revision],
        revision,
        scenario,
        surface,
        env: { MCP_WRINGER_DEFECTS: "respond-to-notification" },
      });
      expect(findings.map((finding) => finding.ruleId)).toContain("jsonrpc-contract.invalid-message");
    }
  }, 180_000);

  it("runs the default quick budget cleanly", async () => {
    const result = await runFuzz({
      command: process.execPath,
      args: [fixture, "--revision", revision],
      revision,
      seed: 1_337,
      profile: "quick",
      surface: await inspectFixture(revision),
      corpusDirectory: await temporaryDirectory(),
    });
    expect(result.casesRun).toBe(18);
    expect(result.findings).toEqual([]);
  }, 60_000);

  it("sends only advertised read-only tools from generated argument cases", async () => {
    const surface = await inspectFixture(revision);
    const scenario = generateScenarios(revision, surface, 75, 6, defaultGeneratorSequence)[5];
    if (scenario === undefined) {
      throw new Error("Quick generator schedule did not produce a tool-argument case.");
    }
    const result = await runSingleScenario({
      command: process.execPath,
      args: [fixture, "--revision", revision],
      revision,
      scenario,
      surface,
    });
    const sentMessages = result.result.trace.events
      .filter((event) => event.channel === "stdin")
      .map((event) => event.data)
      .join("")
      .split("\n")
      .filter((line) => line.length > 0)
      .map((line) => JSON.parse(line) as { method?: string; params?: { name?: string } });
    const toolCalls = sentMessages.filter((message) => message.method === "tools/call");
    expect(toolCalls).toHaveLength(1);
    expect(toolCalls[0]?.params?.name).toBe("search");
    expect(sentMessages.some((message) => message.params?.name === "delete-record")).toBe(false);
  });

  it("runs seeded cases cleanly and retains only scenarios for novel responses", async () => {
    const surface = await inspectFixture(revision);
    const directory = await temporaryDirectory();
    const options = {
      command: process.execPath,
      args: [fixture, "--revision", revision],
      revision,
      seed: 12_345,
      cases: 1,
      surface,
      corpusDirectory: directory,
    };
    const first = await runFuzz(options);
    expect(first.seed).toBe(12_345);
    expect(first.casesRun).toBe(1);
    expect(first.findings).toEqual([]);
    expect(first.corpusEntriesAdded).toBe(1);
    const files = await readdir(directory);
    expect(files).toHaveLength(1);
    const corpusScenario = await readFile(resolve(directory, files[0]!), "utf8");
    expect(corpusScenario).toContain("schema-valid");
    const second = await runFuzz(options);
    expect(second.findings).toEqual(first.findings);
    expect(second.corpusEntriesAdded).toBe(0);
  });

  it.each(["per-case", "on-failure", "never"] as const)("supports %s restart policy", async (restartPolicy) => {
    const surface = await inspectFixture(revision);
    const result = await runFuzz({
      command: process.execPath,
      args: [fixture, "--revision", revision],
      revision,
      seed: 32,
      cases: 2,
      restartPolicy,
      surface,
      corpusDirectory: await temporaryDirectory(),
    });
    expect(result.casesRun).toBe(2);
    expect(result.findings).toEqual([]);
  });
});

describe("root and derived seeds", () => {
  it("validates unsigned seeds and derives stable independent streams", () => {
    expect(createRootSeed("0")).toBe(0);
    expect(createRootSeed(0xffff_ffff)).toBe(0xffff_ffff);
    expect(() => createRootSeed("-1")).toThrow(/unsigned 32-bit/);
    expect(deriveSeed(17, "schema-valid", "0")).toBe(deriveSeed(17, "schema-valid", "0"));
    expect(deriveSeed(17, "schema-valid", "0")).not.toBe(deriveSeed(17, "wire-fault", "0"));
  });
});

describe("run artifacts and minimisation", () => {
  it.each(["2025-11-25", "2026-07-28"] as const)(
    "writes deterministic, replayable reproducers for %s",
    async (revision) => {
      const surface = await inspectFixture(revision);
      const reportDirectory = await temporaryDirectory();
      const runOptions = {
        command: process.execPath,
        args: [fixture, "--revision", revision],
        revision,
        seed: 8_801,
        cases: 1,
        surface,
        env: { MCP_WRINGER_DEFECTS: "wrong-response-id" },
        corpusDirectory: await temporaryDirectory(),
      };
      const firstRun = await runFuzz(runOptions);
      const secondRun = await runFuzz(runOptions);
      expect(firstRun.findings.length).toBeGreaterThan(0);
      expect(secondRun.findings).toEqual(firstRun.findings);
      await writeRunReports({
        directory: reportDirectory,
        run: firstRun,
        target: { transport: "stdio", command: process.execPath, args: runOptions.args },
        environmentNames: ["MCP_WRINGER_DEFECTS"],
      });
      const findingsPath = resolve(reportDirectory, "findings.json");
      const firstFindings = await readFile(findingsPath, "utf8");
      await writeRunReports({
        directory: reportDirectory,
        run: secondRun,
        target: { transport: "stdio", command: process.execPath, args: runOptions.args },
        environmentNames: ["MCP_WRINGER_DEFECTS"],
      });
      expect(await readFile(findingsPath, "utf8")).toBe(firstFindings);
      const reproducerDirectory = resolve(reportDirectory, "reproducers");
      const reproducerFiles = await readdir(reproducerDirectory);
      expect(reproducerFiles).toHaveLength(1);
      const reproducer = await loadReproducer(resolve(reproducerDirectory, reproducerFiles[0]!));
      expect(reproducer.seed).toBe(8_801);
      expect(reproducer.target.environmentNames).toEqual(["MCP_WRINGER_DEFECTS"]);
      if (reproducer.seed === undefined) {
        throw new Error("Run reproducer is missing its root seed.");
      }
      const replay = await runSingleScenario({
        transport: "stdio",
        command: process.execPath,
        args: runOptions.args,
        revision: reproducer.specRevision,
        seed: reproducer.seed,
        scenario: reproducer.scenario,
        surface,
        env: { MCP_WRINGER_DEFECTS: "wrong-response-id" },
      });
      expect(replay.findings.map((finding) => finding.id)).toContain(firstRun.findings[0]?.id);
    },
    30_000,
  );

  it("minimizes a finding only after fresh-target confirmation", async () => {
    const revision: SpecRevision = "2025-11-25";
    const surface = await inspectFixture(revision);
    const scenario = {
      formatVersion: 1 as const,
      id: "minimize-confirmed-crash",
      specRevision: revision,
      steps: [
        { type: "delay" as const, durationMs: 1 },
        { type: "send-raw" as const, bytesBase64: Buffer.from("{not-json}\n").toString("base64") },
        { type: "await-response" as const, id: "unanswered" },
      ],
    };
    const initial = await runSingleScenario({
      command: process.execPath,
      args: [fixture, "--revision", revision],
      revision,
      scenario,
      surface,
      env: { MCP_WRINGER_DEFECTS: "exit-on-decode-error" },
    });
    const crash = initial.findings.find((finding) => finding.ruleId === "crash.process-exit");
    expect(crash).toBeDefined();
    const result = await minimizeScenario({
      scenario,
      findingId: crash!.id,
      revision,
      command: process.execPath,
      args: [fixture, "--revision", revision],
      surface,
      env: { MCP_WRINGER_DEFECTS: "exit-on-decode-error" },
      confirmations: 2,
      timeBudgetMs: 30_000,
    });
    expect(result.reproduced).toBe(true);
    expect(result.flaky).toBe(false);
    expect(result.scenario.steps).toHaveLength(1);
    expect(result.scenario.steps[0]?.type).toBe("send-raw");
    expect(result.attempts).toBeGreaterThan(2);
  }, 60_000);
});

describe("target startup failures", () => {
  it("fails the run as a target error when the target exits before discovery completes", async () => {
    // Before, this was swallowed: discovery fell back to an empty surface and the run could pass
    // with zero findings against a target that never started.
    await expect(runFuzz({
      command: process.execPath,
      args: [fixture],
      revision: "2025-11-25",
      seed: 1,
      cases: 2,
      corpusDirectory: await temporaryDirectory(),
    })).rejects.toThrow(TargetError);
  });
});

async function inspectFixture(revision: "2025-11-25" | "2026-07-28"): Promise<InspectedSurface> {
  return inspectServer(revision, process.execPath, [fixture, "--revision", revision]);
}

async function temporaryDirectory(): Promise<string> {
  const directory = await mkdtemp(resolve(tmpdir(), "mcp-wringer-test-"));
  temporaryDirectories.push(directory);
  return directory;
}
