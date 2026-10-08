import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { Finding, Reproducer } from "../core/types.js";
import type { JsonValue } from "../core/types.js";
import { createReproducer, saveReproducer } from "../core/reproducer.js";
import type { ReproducerTargetInput } from "../core/reproducer.js";
import type { FuzzRunResult } from "../core/run.js";
import { reporterRegistry } from "./registry.js";

export interface RunReportOptions {
  directory: string;
  run: FuzzRunResult;
  target: ReproducerTargetInput;
  environmentNames: string[];
  reporters?: readonly {
    name: string;
    enabled: boolean;
    options: Record<string, JsonValue>;
  }[];
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
    ...(run.baseline === undefined ? {} : { baseline: run.baseline }),
  };
  await writeFile(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`, "utf8");
  const paths: string[] = [];
  const selections = options.reporters ?? [{ name: "json", enabled: true, options: {} }];
  if (selections.some((selection) => selection.enabled && selection.name === "json")) {
    await writeFile(findingsPath, `${JSON.stringify(findingsDocument, null, 2)}\n`, "utf8");
    paths.push(findingsPath);
  }
  paths.push(metadataPath);
  for (const selection of selections) {
    if (!selection.enabled || selection.name === "console" || selection.name === "json") {
      continue;
    }
    const reporter = reporterRegistry.get(selection.name);
    const extension = reporter.fileExtension ?? "txt";
    const path = join(directory, `${selection.name}.${extension}`);
    await writeFile(path, reporter.render(run.findings, selection.options), "utf8");
    paths.push(path);
  }
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
