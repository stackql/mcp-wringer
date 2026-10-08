import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { Finding, Reproducer } from "../core/types.js";
import { createReproducer, saveReproducer } from "../core/reproducer.js";
import type { ReproducerTargetInput } from "../core/reproducer.js";
import type { FuzzRunResult } from "../core/run.js";

export interface RunReportOptions {
  directory: string;
  run: FuzzRunResult;
  target: ReproducerTargetInput;
  environmentNames: string[];
}

export async function writeRunReports(options: RunReportOptions): Promise<string[]> {
  const { directory, run } = options;
  const reproducerDirectory = join(directory, "reproducers");
  await mkdir(reproducerDirectory, { recursive: true });
  const findingsPath = join(directory, "findings.json");
  const metadataPath = join(directory, "run-metadata.json");
  const findingsDocument = {
    formatVersion: 1,
    seed: run.seed,
    findings: sortFindings(run.findings),
  };
  const metadata = {
    formatVersion: 1,
    seed: run.seed,
    profile: run.profile,
    casesRun: run.casesRun,
    durationMs: run.durationMs,
    corpusEntriesAdded: run.corpusEntriesAdded,
    diagnostics: run.diagnostics,
  };
  await writeFile(findingsPath, `${JSON.stringify(findingsDocument, null, 2)}\n`, "utf8");
  await writeFile(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`, "utf8");
  const paths = [findingsPath, metadataPath];
  const target = {
    ...options.target,
    environmentNames: [...new Set(options.environmentNames)].sort(),
  };
  for (const item of run.reproducers) {
    const reproducer: Reproducer = createReproducer(item.scenario, target, run.seed);
    const path = join(reproducerDirectory, `${item.findingId}.repro.json`);
    await saveReproducer(path, reproducer);
    paths.push(path);
  }
  return paths;
}

function sortFindings(findings: Finding[]): Finding[] {
  return [...findings].sort((left, right) => left.id.localeCompare(right.id));
}
