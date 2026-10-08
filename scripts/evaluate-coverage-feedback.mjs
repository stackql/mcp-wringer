import { execFile } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { performance } from "node:perf_hooks";
import { promisify } from "node:util";
import { runFuzz } from "../dist/index.js";

const execFileAsync = promisify(execFile);
const revision = "2025-11-25";
const nodeFixture = resolve("fixtures/stdio-server.mjs");
const goFixture = resolve("fixtures/go-server/main.go");
const scenariosPerDefect = [
  { defect: "invalid-schema", rule: "schema-response.invalid-result", cases: 1 },
  { defect: "wrong-response-id", rule: "jsonrpc-contract.invalid-message", cases: 1 },
  { defect: "accepts-malformed", rule: "accepted-malformed.success-response", cases: 2 },
  { defect: "wrong-error-code", rule: "error-code.unexpected-code", cases: 3 },
];
const repetitions = 3;
const surface = {
  specRevision: revision,
  tools: [{
    name: "search",
    description: "Search fixture records.",
    inputSchema: {
      type: "object",
      properties: { query: { type: "string" } },
      required: ["query"],
    },
    annotations: { readOnlyHint: true },
    safety: "read-only",
  }],
  resources: [{ uri: "fixture://welcome", name: "Welcome", mimeType: "text/plain" }],
  prompts: [{ name: "summarize", description: "Summarize supplied text." }],
};
const temporaryDirectory = await mkdtemp(join(tmpdir(), "mcp-wringer-coverage-evaluation-"));
const rows = [];

try {
  for (let repetition = 1; repetition <= repetitions; repetition += 1) {
    for (const testCase of scenariosPerDefect) {
      for (const feedback of [false, true]) {
        rows.push(await measure({
          label: "node-fixture",
          command: process.execPath,
          args: [nodeFixture, "--revision", revision],
          defect: testCase.defect,
          expectedRule: testCase.rule,
          cases: testCase.cases,
          feedback,
          repetition,
        }));
      }
    }
  }

  const goBinary = join(temporaryDirectory, process.platform === "win32" ? "go-fixture.exe" : "go-fixture");
  const buildStartedAt = performance.now();
  await execFileAsync("go", ["build", "-cover", "-o", goBinary, goFixture], {
    windowsHide: true,
    maxBuffer: 4 * 1024 * 1024,
  });
  const goBuildMs = Math.round(performance.now() - buildStartedAt);
  for (let repetition = 1; repetition <= repetitions; repetition += 1) {
    for (const feedback of [false, true]) {
      rows.push(await measure({
        label: "go-fixture",
        command: goBinary,
        args: [],
        defect: "wrong-error-code",
        expectedRule: "error-code.unexpected-code",
        cases: 3,
        feedback,
        repetition,
      }));
    }
  }
  const summary = groupRuns(rows);
  process.stdout.write(`${JSON.stringify({ goBuildMs, repetitions, summary, runs: rows }, null, 2)}\n`);
} finally {
  await rm(temporaryDirectory, { recursive: true, force: true });
}

async function measure(testCase) {
  const corpusDirectory = join(
    temporaryDirectory,
    `${testCase.label}-${testCase.defect}-${testCase.feedback ? "feedback" : "baseline"}`,
  );
  const result = await runFuzz({
    command: testCase.command,
    args: testCase.args,
    revision,
    seed: 91,
    cases: testCase.cases,
    durationMs: 120_000,
    workers: 1,
    restartPolicy: "per-case",
    confirmations: 1,
    surface,
    env: { MCP_WRINGER_DEFECTS: testCase.defect },
    corpusDirectory,
    ...(testCase.feedback ? { coverageFeedback: { provider: testCase.label === "go-fixture" ? "go-cover" : "node-v8", batchSize: 1 } } : {}),
  });
  return {
    target: testCase.label,
    repetition: testCase.repetition,
    defect: testCase.defect,
    feedback: testCase.feedback,
    casesNeeded: result.firstFindingCases?.[testCase.expectedRule] ?? null,
    confirmed: result.findings.some((finding) => finding.ruleId === testCase.expectedRule),
    totalRunMs: Math.round(result.durationMs),
    coverageBatches: result.coverageFeedback?.batches ?? null,
    coveredFeatures: result.coverageFeedback?.features ?? null,
    diagnostics: result.diagnostics,
  };
}

function groupRuns(runs) {
  const groups = new Map();
  for (const run of runs) {
    const key = `${run.target}\0${run.defect}\0${run.feedback}`;
    const group = groups.get(key) ?? [];
    group.push(run);
    groups.set(key, group);
  }
  return [...groups.values()].map((group) => ({
    target: group[0].target,
    defect: group[0].defect,
    feedback: group[0].feedback,
    repetitions: group.length,
    medianCasesNeeded: median(group.map((run) => run.casesNeeded).filter(Number.isFinite)),
    confirmed: group.filter((run) => run.confirmed).length,
    medianTotalRunMs: median(group.map((run) => run.totalRunMs)),
    medianCoveredFeatures: median(group.map((run) => run.coveredFeatures).filter(Number.isFinite)),
    batchesWithoutCoverage: group.filter((run) => run.coveredFeatures === 0).length,
  }));
}

function median(values) {
  const sorted = [...values].sort((left, right) => left - right);
  if (sorted.length === 0) {
    return null;
  }
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? Math.round((sorted[middle - 1] + sorted[middle]) / 2)
    : sorted[middle];
}
