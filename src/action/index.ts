import { randomUUID } from "node:crypto";
import { appendFile, readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { WringerError } from "../core/errors.js";
import { createRootSeed } from "../core/seed.js";
import { runFuzz, type FuzzProfile, type RestartPolicy } from "../core/run.js";
import type { ConfigOverrides, ResolvedConfig } from "../config/definition.js";
import { loadConfiguration } from "../config/load.js";
import type { FindingSeverity } from "../core/types.js";
import type { ReproducerTargetInput } from "../core/reproducer.js";
import { writeRunReports } from "../reporters/run.js";
import type { TransportTargetOptions } from "../transports/types.js";

const severities: FindingSeverity[] = ["high", "medium", "low", "info"];

async function main(): Promise<void> {
  const overrides: ConfigOverrides = {};
  const configPath = input("config_path");
  const profile = input("profile");
  const seedInput = input("seed");
  const failOn = input("fail_on");
  const reportDirectory = input("report_directory");
  const command = input("command");
  const argsInput = input("args");
  const url = input("url");
  const args = argsInput.length === 0 ? [] : parseStringArray(argsInput, "args");
  if (profile.length > 0) {
    overrides.profile = profile;
  }
  if (seedInput.length > 0) {
    overrides.seed = seedInput;
  }
  if (failOn.length > 0) {
    if (!severities.includes(failOn as FindingSeverity)) {
      throw new WringerError("USAGE_ERROR", "The fail_on input must be high, medium, low, or info.");
    }
    overrides.failOn = failOn as FindingSeverity;
  }
  if (reportDirectory.length > 0) {
    overrides.reportDirectory = reportDirectory;
  }
  if (command.length > 0) {
    overrides.command = command;
    if (argsInput.length > 0) {
      overrides.args = args;
    }
  } else if (argsInput.length > 0) {
    overrides.args = args;
  }
  if (url.length > 0) {
    overrides.transport = "streamable-http";
    overrides.url = url;
  }
  if (input("allow_non_loopback") === "true") {
    overrides.allowNonLoopback = true;
  }

  const loaded = await loadConfiguration({
    ...(configPath.length === 0 ? {} : { configPath }),
    overrides,
  });
  const config = loaded.config;
  const target = getTarget(config, parseEnvironment(input("env")));
  const seed = createRootSeed(config.seed);
  process.stderr.write(`Seed: ${seed}\n`);
  const reporters = ensureActionReporters(config.reporters);
  const result = await runFuzz({
    ...target,
    revision: config.specRevision,
    seed,
    profile: config.profile as FuzzProfile,
    cases: config.cases,
    durationMs: config.durationMs,
    workers: config.workers,
    restartPolicy: config.restartPolicy as RestartPolicy,
    timeoutMs: config.timeoutMs,
    confirmations: config.confirmations,
    env: target.env ?? {},
    inheritEnvironment: config.inheritEnvironment,
    safety: { allowTools: config.allowTools },
    corpusDirectory: config.corpusDirectory,
    ...(config.baselinePath === undefined ? {} : { baselinePath: config.baselinePath }),
    ...(config.generators.length === 0
      ? {}
      : {
        generatorSequence: config.generators
          .filter((selection) => selection.enabled)
          .flatMap((selection) => Array.from({ length: selection.weight }, () => selection.name)),
      }),
    ...(config.argumentStrategies.length === 0 ? {} : { argumentStrategies: config.argumentStrategies }),
    ...(config.oracles.length === 0 ? {} : { oracleSelections: config.oracles }),
  });

  const reportDirectoryPath = resolve(config.reportDirectory);
  const environmentNames = [
    ...new Set([
      ...Object.keys(target.env ?? {}),
      ...(config.inheritEnvironment ? Object.keys(process.env) : []),
    ]),
  ].sort();
  await writeRunReports({
    directory: reportDirectoryPath,
    run: result,
    target: toReproducerTarget(target),
    environmentNames,
    reporters,
  });
  const summaryPath = process.env.GITHUB_STEP_SUMMARY;
  if (summaryPath === undefined || summaryPath.length === 0) {
    throw new WringerError("ACTION_ERROR", "GITHUB_STEP_SUMMARY is not set.");
  }
  await appendFile(summaryPath, await readFile(join(reportDirectoryPath, "markdown.md"), "utf8"), "utf8");

  const counts: Record<FindingSeverity, number> = { high: 0, medium: 0, low: 0, info: 0 };
  for (const finding of result.findings) {
    counts[finding.severity] += 1;
  }
  for (const [name, value] of Object.entries({
    finding_count: String(result.findings.length),
    high_count: String(counts.high),
    medium_count: String(counts.medium),
    low_count: String(counts.low),
    info_count: String(counts.info),
    sarif_path: join(reportDirectoryPath, "sarif.sarif"),
    report_directory: reportDirectoryPath,
    seed: String(result.seed),
  })) {
    await setOutput(name, value);
  }
  for (const diagnostic of result.diagnostics) {
    process.stderr.write(`Diagnostic: ${diagnostic}\n`);
  }
  const threshold = config.failOn;
  const hasFailingFinding = result.findings.some((finding) =>
    severities.indexOf(finding.severity) <= severities.indexOf(threshold));
  const hasBaselineMismatch = result.baseline !== undefined
    && (result.baseline.newFindingIds.length > 0 || result.baseline.staleFindingIds.length > 0);
  if (hasFailingFinding || hasBaselineMismatch) {
    process.exitCode = 1;
  }
}

function getTarget(config: ResolvedConfig, inputEnvironment: Record<string, string>): TransportTargetOptions {
  const env = { ...config.env, ...inputEnvironment };
  const common = {
    env,
    inheritEnvironment: config.inheritEnvironment,
    timeoutMs: config.timeoutMs,
  };
  if (config.transport === "streamable-http") {
    if (config.url === undefined) {
      throw new WringerError("CONFIG_ERROR", "Streamable HTTP requires a configured or action-input URL.");
    }
    return {
      transport: "streamable-http",
      url: config.url,
      ...(config.command === undefined ? {} : { command: config.command, args: config.args }),
      allowNonLoopback: config.allowNonLoopback,
      ...common,
    };
  }
  if (config.command === undefined) {
    throw new WringerError("USAGE_ERROR", "The command input or a configured command is required for stdio.");
  }
  if (config.url !== undefined || config.allowNonLoopback) {
    throw new WringerError("CONFIG_ERROR", "URL and non-loopback settings require transport streamable-http.");
  }
  return {
    transport: "stdio",
    command: config.command,
    args: config.args,
    ...common,
  };
}

function ensureActionReporters(
  configured: ResolvedConfig["reporters"],
): ResolvedConfig["reporters"] {
  const reporters = configured.map((selection) => ({ ...selection }));
  for (const name of ["sarif", "markdown"]) {
    const existing = reporters.find((selection) => selection.name === name);
    if (existing === undefined) {
      reporters.push({ name, enabled: true, options: {} });
    } else {
      existing.enabled = true;
    }
  }
  return reporters;
}

function toReproducerTarget(target: TransportTargetOptions): ReproducerTargetInput {
  if (target.transport === "streamable-http") {
    return {
      transport: "streamable-http",
      url: target.url,
      ...(target.command === undefined ? {} : { command: target.command, args: target.args ?? [] }),
      environmentNames: [],
    };
  }
  return {
    transport: "stdio",
    command: target.command,
    args: target.args,
    environmentNames: [],
  };
}

function input(name: string): string {
  const normalized = name.toUpperCase().replaceAll("-", "_");
  return process.env[`INPUT_${normalized}`]
    ?? process.env[`INPUT_${name.toUpperCase()}`]
    ?? "";
}

function parseStringArray(value: string, inputName: string): string[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value) as unknown;
  } catch (error) {
    throw new WringerError(
      "USAGE_ERROR",
      `The ${inputName} input must be a JSON string array: ${error instanceof Error ? error.message : String(error)}`,
      { cause: error },
    );
  }
  if (!Array.isArray(parsed) || !parsed.every((item): item is string => typeof item === "string")) {
    throw new WringerError("USAGE_ERROR", `The ${inputName} input must be a JSON string array.`);
  }
  return parsed;
}

function parseEnvironment(value: string): Record<string, string> {
  if (value.length === 0) {
    return {};
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(value) as unknown;
  } catch (error) {
    throw new WringerError(
      "USAGE_ERROR",
      `The env input must be a JSON object of string values: ${error instanceof Error ? error.message : String(error)}`,
      { cause: error },
    );
  }
  if (!isRecord(parsed) || !Object.values(parsed).every((item) => typeof item === "string")) {
    throw new WringerError("USAGE_ERROR", "The env input must be a JSON object of string values.");
  }
  return parsed as Record<string, string>;
}

async function setOutput(name: string, value: string): Promise<void> {
  const outputPath = process.env.GITHUB_OUTPUT;
  if (outputPath === undefined || outputPath.length === 0) {
    throw new WringerError("ACTION_ERROR", "GITHUB_OUTPUT is not set.");
  }
  let delimiter = `MCP_WRINGER_${randomUUID().replaceAll("-", "")}`;
  while (value.includes(delimiter)) {
    delimiter = `MCP_WRINGER_${randomUUID().replaceAll("-", "")}`;
  }
  await appendFile(outputPath, `${name}<<${delimiter}\n${value}\n${delimiter}\n`, "utf8");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`mcp-wringer action: ${message}\n`);
  process.exitCode = 1;
});
