import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { performance } from "node:perf_hooks";

const directory = mkdtempSync(join(tmpdir(), "mcp-wringer-quick-"));
const reports = join(directory, "reports");
const corpus = join(directory, "corpus");
const startedAt = performance.now();

try {
  const result = spawnSync(process.execPath, [
    "dist/cli/index.js",
    "run",
    "--spec",
    "2025-11-25",
    "--profile",
    "quick",
    "--seed",
    "424242",
    "--report-dir",
    reports,
    "--corpus-dir",
    corpus,
    "--",
    process.execPath,
    resolve("fixtures/stdio-server.mjs"),
    "--revision",
    "2025-11-25",
  ], { encoding: "utf8" });
  if (result.error !== undefined) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(`Quick-profile smoke run exited with ${String(result.status)}: ${result.stderr}`);
  }
  const findings = JSON.parse(readFileSync(join(reports, "findings.json"), "utf8"));
  const metadata = JSON.parse(readFileSync(join(reports, "run-metadata.json"), "utf8"));
  if (findings.findings.length !== 0 || metadata.casesRun !== 18) {
    throw new Error(`Expected 18 clean quick cases; got ${metadata.casesRun} cases and ${findings.findings.length} findings.`);
  }
  const durationMs = Math.round(performance.now() - startedAt);
  console.log(`M3 quick-profile wall time: ${durationMs} ms (18 cases, clean fixture).`);
} finally {
  rmSync(directory, { recursive: true, force: true });
}
