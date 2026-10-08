#!/usr/bin/env node

import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { argumentStrategyRegistry } from "../generators/argument-strategies.js";
import { generatorRegistry } from "../generators/index.js";
import { minimizeScenario } from "../core/minimizer.js";
import { ScenarioError, TargetError, TransportError, WringerError } from "../core/errors.js";
import { assertScenarioSafety } from "../core/safety.js";
import { createRootSeed } from "../core/seed.js";
import { loadReproducer, saveReproducer, createReproducer } from "../core/reproducer.js";
import type { ReproducerTargetInput } from "../core/reproducer.js";
import { runFuzz, runSingleScenario, type FuzzProfile, type RestartPolicy } from "../core/run.js";
import { loadConfiguration, createInitialConfig } from "../config/load.js";
import { oracleRegistry } from "../oracles/index.js";
import { reporterRegistry } from "../reporters/index.js";
import { profileRegistry } from "../config/profiles.js";
import type { ConfigOverrides, ResolvedConfig } from "../config/definition.js";
import type { FindingSeverity, SpecRevision, TargetDescriptor } from "../core/types.js";
import type { InspectedSurface } from "../target/surface.js";
import { writeRunReports } from "../reporters/run.js";
import { inspectServer } from "./inspect.js";
import { transportRegistry } from "../transports/registry.js";
import type { TransportTargetOptions } from "../transports/types.js";
import { specProfiles } from "../spec/profiles.js";

const VERSION = "0.1.0";
const DEFAULT_REVISION: SpecRevision = "2025-11-25";
const SEVERITIES: FindingSeverity[] = ["high", "medium", "low", "info"];

async function main(args: string[]): Promise<void> {
  const [command, ...rest] = args;
  if (command === "--version" || command === "-v") {
    process.stdout.write(`${VERSION}\n`);
    return;
  }
  if (command === "--help" || command === "-h" || command === undefined) {
    printHelp();
    return;
  }
  if (command === "replay") {
    await replay(rest);
    return;
  }
  if (command === "inspect") {
    await inspect(rest);
    return;
  }
  if (command === "run") {
    await run(rest);
    return;
  }
  if (command === "minimize") {
    await minimize(rest);
    return;
  }
  if (command === "init") {
    await initializeConfig(rest);
    return;
  }
  if (command === "list") {
    await listExtensions(rest);
    return;
  }
  throw new WringerError("USAGE_ERROR", `Unknown command '${command}'.`);
}

async function replay(args: string[]): Promise<void> {
  const separatorIndex = args.indexOf("--");
  const optionArgs = separatorIndex < 0 ? args : args.slice(0, separatorIndex);
  const overrideCommand = separatorIndex < 0 ? undefined : args[separatorIndex + 1];
  const overrideArgs = separatorIndex < 0 ? [] : args.slice(separatorIndex + 2);
  const reproPath = optionArgs[0];
  if (reproPath === undefined || reproPath.startsWith("--")) {
    throw new WringerError("USAGE_ERROR", "Usage: mcp-wringer replay <file.repro.json> [--env NAME=VALUE] [--inherit-env] [--allow-tool NAME] [-- <command> [args...]]");
  }
  const parsed = parseOptions(
    optionArgs.slice(1),
    ["--out", "--env", "--allow-tool", "--transport", "--url"],
    ["--inherit-env", "--allow-non-loopback"],
  );
  const reproducer = await loadReproducer(reproPath);
  const env = parseEnvironment(parsed.values.get("--env") ?? []);
  const target = resolveTargetOptions(parsed, reproducer.target, overrideCommand, overrideArgs, {
    ...(parsed.values.has("--env") ? { env } : {}),
    ...(parsed.flags.has("--inherit-env") ? { inheritEnvironment: true } : {}),
  });
  const surface = await inspectSurfaceOrEmpty(reproducer.specRevision, target);
  assertScenarioSafety(reproducer.scenario, surface, {
    allowTools: parsed.values.get("--allow-tool") ?? [],
  });
  const { trace } = await transportRegistry.get(target.transport ?? "stdio").run({
    ...target,
    scenario: reproducer.scenario,
  });
  const output = `${JSON.stringify(trace, null, 2)}\n`;
  const outPath = parsed.values.get("--out")?.[0];
  if (outPath !== undefined) {
    await writeFile(outPath, output, "utf8");
    process.stderr.write(`Wrote trace to ${outPath}\n`);
  } else {
    process.stdout.write(output);
  }
}

async function inspect(args: string[]): Promise<void> {
  const separatorIndex = args.indexOf("--");
  const optionArgs = separatorIndex < 0 ? args : args.slice(0, separatorIndex);
  const command = separatorIndex < 0 ? undefined : args[separatorIndex + 1];
  const targetArgs = separatorIndex < 0 ? [] : args.slice(separatorIndex + 2);
  const parsed = parseOptions(
    optionArgs,
    ["--config", "--spec", "--env", "--timeout-ms", "--transport", "--url"],
    ["--inherit-env", "--allow-non-loopback", "--show-config"],
  );
  const configPath = parsed.values.get("--config")?.[0];
  const loaded = await loadConfiguration({
    ...(configPath === undefined ? {} : { configPath }),
    overrides: createConfigOverrides(parsed, command, targetArgs),
  });
  if (parsed.flags.has("--show-config")) {
    process.stdout.write(`${JSON.stringify({ config: loaded.config, origins: loaded.origins }, null, 2)}\n`);
    return;
  }
  const target = getConfiguredTarget(loaded.config);
  const result = await inspectServer(
    loaded.config.specRevision,
    target,
  );
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

async function inspectSurfaceOrEmpty(
  revision: SpecRevision,
  target: TransportTargetOptions,
): Promise<InspectedSurface> {
  try {
    return await inspectServer(revision, target);
  } catch (error) {
    if (!(error instanceof ScenarioError)) {
      throw error;
    }
    process.stderr.write(`Surface discovery failed; tool calls require an explicit --allow-tool entry: ${error.message}\n`);
    return { specRevision: revision, tools: [], resources: [], prompts: [] };
  }
}

function resolveTargetOptions(
  parsed: { values: Map<string, string[]>; flags: Set<string> },
  fallback: TargetDescriptor | undefined,
  command: string | undefined,
  args: string[],
  common: { env?: Record<string, string>; inheritEnvironment?: boolean; timeoutMs?: number },
): TransportTargetOptions {
  const fallbackTransport = fallback !== undefined && "transport" in fallback
    ? fallback.transport
    : "stdio";
  const fallbackUrl = fallback !== undefined && "url" in fallback ? fallback.url : undefined;
  const url = parsed.values.get("--url")?.[0] ?? fallbackUrl;
  const requestedTransport = parsed.values.get("--transport")?.[0]
    ?? (url !== undefined ? "streamable-http" : fallbackTransport);
  const transport = oneOf(requestedTransport, ["stdio", "streamable-http"], "--transport") ?? "stdio";
  const fallbackCommand = fallback?.command;
  const fallbackArgs = fallback?.args;
  const selectedCommand = command ?? (transport === fallbackTransport ? fallbackCommand : undefined);
  const selectedArgs = command === undefined
    ? (selectedCommand === undefined ? [] : fallbackArgs ?? [])
    : args;
  if (transport === "streamable-http") {
    if (url === undefined) {
      throw new WringerError("USAGE_ERROR", "Streamable HTTP requires --url.");
    }
    if (selectedCommand === undefined && selectedArgs.length > 0) {
      throw new WringerError("USAGE_ERROR", "HTTP target args require a spawned command.");
    }
    return {
      transport,
      url,
      ...(selectedCommand === undefined ? {} : { command: selectedCommand, args: selectedArgs }),
      ...(parsed.flags.has("--allow-non-loopback") ? { allowNonLoopback: true } : {}),
      ...common,
    };
  }
  if (url !== undefined) {
    throw new WringerError("USAGE_ERROR", "--url can be used only with --transport streamable-http.");
  }
  if (parsed.flags.has("--allow-non-loopback")) {
    throw new WringerError("USAGE_ERROR", "--allow-non-loopback requires --transport streamable-http.");
  }
  if (selectedCommand === undefined) {
    throw new WringerError("USAGE_ERROR", "A stdio target requires -- <command> [args...].");
  }
  return {
    transport: "stdio",
    command: selectedCommand,
    args: selectedArgs,
    ...common,
  };
}

function createConfigOverrides(
  parsed: { values: Map<string, string[]>; flags: Set<string> },
  command?: string,
  args: string[] = [],
): ConfigOverrides {
  const overrides: ConfigOverrides = {};
  const value = (name: string): string | undefined => parsed.values.get(name)?.[0];
  const specRevision = value("--spec");
  if (specRevision !== undefined) {
    overrides.specRevision = parseRevision(specRevision);
  }
  const profile = value("--profile");
  if (profile !== undefined) {
    overrides.profile = profile;
  }
  const seed = value("--seed");
  if (seed !== undefined) {
    overrides.seed = seed;
  }
  const cases = value("--cases");
  if (cases !== undefined) {
    overrides.cases = parsePositiveInteger(cases, "--cases");
  }
  const durationMs = value("--duration-ms");
  if (durationMs !== undefined) {
    overrides.durationMs = parsePositiveInteger(durationMs, "--duration-ms");
  }
  const workers = value("--workers");
  if (workers !== undefined) {
    overrides.workers = parsePositiveInteger(workers, "--workers");
  }
  const restartPolicy = value("--restart");
  if (restartPolicy !== undefined) {
    const selected = oneOf(restartPolicy, ["per-case", "on-failure", "never"], "--restart");
    if (selected !== undefined) {
      overrides.restartPolicy = selected;
    }
  }
  const timeoutMs = value("--timeout-ms");
  if (timeoutMs !== undefined) {
    overrides.timeoutMs = parsePositiveInteger(timeoutMs, "--timeout-ms");
  }
  const confirmations = value("--confirmations");
  if (confirmations !== undefined) {
    overrides.confirmations = parsePositiveInteger(confirmations, "--confirmations");
  }
  const failOn = value("--fail-on");
  if (failOn !== undefined) {
    const selected = oneOf(failOn, SEVERITIES, "--fail-on");
    if (selected !== undefined) {
      overrides.failOn = selected;
    }
  }
  const reportDirectory = value("--report-dir");
  if (reportDirectory !== undefined) {
    overrides.reportDirectory = reportDirectory;
  }
  const corpusDirectory = value("--corpus-dir");
  if (corpusDirectory !== undefined) {
    overrides.corpusDirectory = corpusDirectory;
  }
  const baselinePath = value("--baseline");
  if (baselinePath !== undefined) {
    overrides.baselinePath = baselinePath;
  }
  const selectedTransport = value("--transport");
  const url = value("--url");
  if (selectedTransport !== undefined) {
    const selected = oneOf(selectedTransport, ["stdio", "streamable-http"], "--transport");
    if (selected !== undefined) {
      overrides.transport = selected;
    }
  } else if (url !== undefined) {
    overrides.transport = "streamable-http";
  }
  if (url !== undefined) {
    overrides.url = url;
  }
  if (command !== undefined) {
    overrides.command = command;
    overrides.args = args;
  }
  if (parsed.values.has("--env")) {
    overrides.env = parseEnvironment(parsed.values.get("--env") ?? []);
  }
  if (parsed.flags.has("--inherit-env")) {
    overrides.inheritEnvironment = true;
  }
  if (parsed.flags.has("--allow-non-loopback")) {
    overrides.allowNonLoopback = true;
  }
  if (parsed.values.has("--allow-tool")) {
    overrides.allowTools = parsed.values.get("--allow-tool") ?? [];
  }
  return overrides;
}

function getConfiguredTarget(config: ResolvedConfig): TransportTargetOptions {
  const common = {
    env: config.env,
    inheritEnvironment: config.inheritEnvironment,
    timeoutMs: config.timeoutMs,
  };
  if (config.transport === "stdio") {
    if (config.command === undefined) {
      throw new WringerError("USAGE_ERROR", "A stdio target requires -- <command> [args...] or a configured command.");
    }
    if (config.url !== undefined || config.allowNonLoopback) {
      throw new WringerError("CONFIG_ERROR", "HTTP URL and non-loopback options require transport 'streamable-http'.");
    }
    return {
      transport: "stdio",
      command: config.command,
      args: config.args,
      ...common,
    };
  }
  if (config.url === undefined) {
    throw new WringerError("USAGE_ERROR", "Streamable HTTP requires --url or a configured URL.");
  }
  return {
    transport: "streamable-http",
    url: config.url,
    ...(config.command === undefined ? {} : { command: config.command, args: config.args }),
    allowNonLoopback: config.allowNonLoopback,
    ...common,
  };
}

function toReproducerTarget(
  target: TransportTargetOptions,
  environmentNames: string[] = [],
): ReproducerTargetInput {
  if (target.transport === "streamable-http") {
    return {
      transport: "streamable-http",
      url: target.url,
      ...(target.command === undefined ? {} : { command: target.command, args: target.args ?? [] }),
      environmentNames,
    };
  }
  return {
    transport: "stdio",
    command: target.command,
    args: target.args,
    environmentNames,
  };
}

async function run(args: string[]): Promise<void> {
  const separatorIndex = args.indexOf("--");
  const optionArgs = separatorIndex < 0 ? args : args.slice(0, separatorIndex);
  const command = separatorIndex < 0 ? undefined : args[separatorIndex + 1];
  const targetArgs = separatorIndex < 0 ? [] : args.slice(separatorIndex + 2);
  const parsed = parseOptions(
    optionArgs,
    ["--config", "--spec", "--profile", "--seed", "--cases", "--duration-ms", "--workers", "--restart",
      "--timeout-ms", "--confirmations", "--fail-on", "--report-dir", "--corpus-dir", "--env", "--allow-tool",
      "--transport", "--url", "--baseline"],
    ["--inherit-env", "--allow-non-loopback", "--show-config"],
  );
  const configPath = parsed.values.get("--config")?.[0];
  const loaded = await loadConfiguration({
    ...(configPath === undefined ? {} : { configPath }),
    overrides: createConfigOverrides(parsed, command, targetArgs),
  });
  const config = loaded.config;
  if (parsed.flags.has("--show-config")) {
    process.stdout.write(`${JSON.stringify({ config, origins: loaded.origins }, null, 2)}\n`);
    return;
  }
  const target = getConfiguredTarget(config);
  const seed = createRootSeed(config.seed);
  process.stderr.write(`Seed: ${seed}\n`);
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
    env: config.env,
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
  const reportDirectory = resolve(config.reportDirectory);
  const environmentNames = [
    ...new Set([
      ...Object.keys(config.env),
      ...(config.inheritEnvironment ? Object.keys(process.env) : []),
    ]),
  ].sort();
  await writeRunReports({
    directory: reportDirectory,
    run: result,
    target: toReproducerTarget(target),
    environmentNames,
    reporters: config.reporters.filter((selection) => selection.enabled),
  });
  process.stderr.write(
    `Completed ${result.casesRun} cases in ${Math.round(result.durationMs)} ms; `
      + `${result.findings.length} confirmed finding(s). Reports: ${reportDirectory}\n`,
  );
  if (config.reporters.some((selection) => selection.enabled && selection.name === "console")) {
    process.stderr.write(reporterRegistry.get("console").render(result.findings));
  }
  for (const diagnostic of result.diagnostics) {
    process.stderr.write(`Diagnostic: ${diagnostic}\n`);
  }
  const threshold = config.failOn as FindingSeverity;
  if ((result.baseline !== undefined
      && (result.baseline.newFindingIds.length > 0 || result.baseline.staleFindingIds.length > 0))
    || result.findings.some((finding) => SEVERITIES.indexOf(finding.severity) <= SEVERITIES.indexOf(threshold))) {
    process.exitCode = 1;
  }

}

async function initializeConfig(args: string[]): Promise<void> {
  const parsed = parseOptions(args, ["--out"], []);
  const path = resolve(parsed.values.get("--out")?.[0] ?? "mcp-wringer.config.json");
  try {
    await writeFile(path, `${JSON.stringify(createInitialConfig(), null, 2)}\n`, { encoding: "utf8", flag: "wx" });
  } catch (error) {
    throw new WringerError(
      "USAGE_ERROR",
      `Could not create configuration file '${path}': ${error instanceof Error ? error.message : String(error)}`,
      { cause: error },
    );
  }
  process.stderr.write(`Created ${path}\n`);
}

async function listExtensions(args: string[]): Promise<void> {
  const category = args[0]?.startsWith("--") === true ? undefined : args[0];
  const parsed = parseOptions(category === undefined ? args : args.slice(1), ["--config"], []);
  const categories = ["transports", "specs", "generators", "oracles", "reporters", "profiles"];
  if (category !== undefined && !categories.includes(category)) {
    throw new WringerError("USAGE_ERROR", `Usage: mcp-wringer list [${categories.join("|")}] [--config <path>]`);
  }
  const configPath = parsed.values.get("--config")?.[0];
  const loaded = await loadConfiguration(configPath === undefined ? {} : { configPath });
  const userProfiles = Object.keys(loaded.config.profiles);
  const extensions: Record<string, string[]> = {
    transports: ["stdio", "streamable-http"],
    specs: specProfiles.names(),
    generators: generatorRegistry.names(),
    argumentStrategies: argumentStrategyRegistry.names(),
    oracles: oracleRegistry.names(),
    reporters: reporterRegistry.names(),
    profiles: [...new Set([...profileRegistry.names(), ...userProfiles])].sort(),
  };
  const result = category === undefined
    ? extensions
    : category === "generators"
      ? { generators: extensions.generators, argumentStrategies: extensions.argumentStrategies }
      : { [category]: extensions[category] };
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

async function minimize(args: string[]): Promise<void> {
  const separatorIndex = args.indexOf("--");
  const optionArgs = separatorIndex < 0 ? args : args.slice(0, separatorIndex);
  const overrideCommand = separatorIndex < 0 ? undefined : args[separatorIndex + 1];
  const overrideArgs = separatorIndex < 0 ? [] : args.slice(separatorIndex + 2);
  const reproPath = optionArgs[0];
  if (reproPath === undefined || reproPath.startsWith("--")) {
    throw new WringerError("USAGE_ERROR", "Usage: mcp-wringer minimize <file.repro.json> [--finding ID] [--out FILE] [--env NAME=VALUE] [-- <command> [args...]]");
  }
  const parsed = parseOptions(
    optionArgs.slice(1),
    ["--finding", "--out", "--env", "--confirmations", "--duration-ms", "--timeout-ms", "--allow-tool", "--transport", "--url"],
    ["--inherit-env", "--allow-non-loopback"],
  );
  const reproducer = await loadReproducer(reproPath);
  const env = parseEnvironment(parsed.values.get("--env") ?? []);
  const target = resolveTargetOptions(parsed, reproducer.target, overrideCommand, overrideArgs, {
    ...(parsed.values.has("--env") ? { env } : {}),
    ...(parsed.flags.has("--inherit-env") ? { inheritEnvironment: true } : {}),
    ...(parsed.values.has("--timeout-ms") ? { timeoutMs: parsePositiveInteger(parsed.values.get("--timeout-ms")?.[0], "--timeout-ms") } : {}),
  });
  const surface = await inspectSurfaceOrEmpty(reproducer.specRevision, target);
  const safety = { allowTools: parsed.values.get("--allow-tool") ?? [] };
  const initialRun = await runSingleScenario({
    ...target,
    revision: reproducer.specRevision,
    scenario: reproducer.scenario,
    surface,
    safety,
  });
  const requestedFinding = parsed.values.get("--finding")?.[0];
  const matchingFinding = requestedFinding === undefined
    ? [...initialRun.findings].sort((left, right) =>
      SEVERITIES.indexOf(left.severity) - SEVERITIES.indexOf(right.severity) || left.id.localeCompare(right.id))[0]
    : initialRun.findings.find((finding) => finding.id === requestedFinding);
  if (matchingFinding === undefined) {
    process.stderr.write("The reproducer did not reproduce a finding on the current target.\n");
    process.exitCode = 1;
    return;
  }
  const result = await minimizeScenario({
    ...target,
    revision: reproducer.specRevision,
    scenario: reproducer.scenario,
    findingId: matchingFinding.id,
    surface,
    safety,
    ...(parsed.values.has("--confirmations") ? { confirmations: parsePositiveInteger(parsed.values.get("--confirmations")?.[0], "--confirmations") } : {}),
    ...(parsed.values.has("--duration-ms") ? { timeBudgetMs: parsePositiveInteger(parsed.values.get("--duration-ms")?.[0], "--duration-ms") } : {}),
    ...(parsed.values.has("--timeout-ms") ? { timeoutMs: parsePositiveInteger(parsed.values.get("--timeout-ms")?.[0], "--timeout-ms") } : {}),
  });
  if (!result.reproduced) {
    process.stderr.write(`Finding ${matchingFinding.id} was not stable enough to minimize.\n`);
    process.exitCode = 1;
    return;
  }
  const outPath = parsed.values.get("--out")?.[0] ?? `${reproPath.replace(/\.repro\.json$/u, "")}.minimized.repro.json`;
  const environmentNames = [
    ...new Set([
      ...Object.keys(parsed.values.has("--env") ? env : {}),
      ...(parsed.flags.has("--inherit-env") ? Object.keys(process.env) : []),
    ]),
  ].sort();
  await saveReproducer(
    outPath,
    createReproducer(result.scenario, toReproducerTarget(target, environmentNames), reproducer.seed),
  );
  process.stderr.write(`Minimized to ${result.scenario.steps.length} steps after ${result.attempts} attempts; wrote ${outPath}\n`);
}

function parseOptions(
  args: string[],
  valueOptions: string[],
  booleanOptions: string[],
): { values: Map<string, string[]>; flags: Set<string> } {
  const values = new Map<string, string[]>();
  const flags = new Set<string>();
  for (let index = 0; index < args.length; index += 1) {
    const name = args[index];
    if (name === undefined || !name.startsWith("--")) {
      throw new WringerError("USAGE_ERROR", `Unexpected argument '${name ?? ""}'.`);
    }
    if (booleanOptions.includes(name)) {
      flags.add(name);
      continue;
    }
    if (!valueOptions.includes(name)) {
      throw new WringerError("USAGE_ERROR", `Unknown option '${name}'.`);
    }
    const value = args[index + 1];
    if (value === undefined || value.startsWith("--")) {
      throw new WringerError("USAGE_ERROR", `${name} requires a value.`);
    }
    const existing = values.get(name) ?? [];
    existing.push(value);
    values.set(name, existing);
    index += 1;
  }
  for (const [name, items] of values) {
    if (!["--env", "--allow-tool"].includes(name) && items.length > 1) {
      throw new WringerError("USAGE_ERROR", `${name} may be specified only once.`);
    }
  }
  return { values, flags };
}

function parseEnvironment(entries: string[]): Record<string, string> {
  const env: Record<string, string> = {};
  for (const entry of entries) {
    const separator = entry.indexOf("=");
    const name = entry.slice(0, separator);
    if (separator < 1 || !/^[A-Za-z_][A-Za-z0-9_]*$/u.test(name)) {
      throw new WringerError("USAGE_ERROR", `Invalid --env entry '${entry}'; expected NAME=VALUE.`);
    }
    if (Object.hasOwn(env, name)) {
      throw new WringerError("USAGE_ERROR", `--env variable '${name}' was specified more than once.`);
    }
    env[name] = entry.slice(separator + 1);
  }
  return env;
}

function parseRevision(value?: string): SpecRevision {
  const revision = value ?? DEFAULT_REVISION;
  if (revision !== "2025-11-25" && revision !== "2026-07-28") {
    throw new WringerError("USAGE_ERROR", "--spec must be 2025-11-25 or 2026-07-28.");
  }
  return revision;
}

function parsePositiveInteger(value: string | undefined, option: string): number {
  if (value === undefined || !/^[1-9]\d*$/u.test(value)) {
    throw new WringerError("USAGE_ERROR", `${option} must be a positive integer.`);
  }
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed)) {
    throw new WringerError("USAGE_ERROR", `${option} must be a safe positive integer.`);
  }
  return parsed;
}

function oneOf<const T extends readonly string[]>(
  value: string | undefined,
  allowed: T,
  option: string,
): T[number] | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (!allowed.includes(value)) {
    throw new WringerError("USAGE_ERROR", `${option} must be one of: ${allowed.join(", ")}.`);
  }
  return value;
}

function printHelp(): void {
  process.stdout.write(
    [
      "mcp-wringer 0.1.0",
      "",
      "Usage:",
      "  mcp-wringer init [--out <file>]",
      "  mcp-wringer list [transports|specs|generators|oracles|reporters|profiles] [--config <file>]",
      "  mcp-wringer replay <file.repro.json> [--out <trace.json>] [--transport stdio|streamable-http] [--url URL]",
      "      [--env NAME=VALUE] [--inherit-env] [--allow-non-loopback] [--allow-tool NAME] [-- <command> [args...]]",
      "  mcp-wringer inspect [--config FILE] [--show-config] [--spec <revision>] [--transport stdio|streamable-http] [--url URL]",
      "      [--allow-non-loopback] [--env NAME=VALUE] [--inherit-env] [-- <command> [args...]]",
      "  mcp-wringer run [--config FILE] [--show-config] [--spec <revision>] [--profile NAME] [--seed N] [--cases N]",
      "      [--duration-ms N] [--timeout-ms N] [--workers N] [--confirmations N]",
      "      [--restart per-case|on-failure|never] [--fail-on high|medium|low|info]",
      "      [--env NAME=VALUE] [--inherit-env] [--allow-tool NAME] [--report-dir DIR] [--corpus-dir DIR] [--baseline FILE]",
      "      [--transport stdio|streamable-http] [--url URL] [--allow-non-loopback] [-- <command> [args...]]",
      "  mcp-wringer minimize <file.repro.json> [--finding ID] [--out FILE] [--duration-ms N]",
      "      [--confirmations N] [--timeout-ms N] [--transport stdio|streamable-http] [--url URL]",
      "      [--allow-non-loopback] [--env NAME=VALUE] [--inherit-env] [--allow-tool NAME]",
      "      [-- <command> [args...]]",
      "",
      "Use only on servers you own or are authorised to test.",
    ].join("\n") + "\n",
  );
}

main(process.argv.slice(2)).catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  const code = error instanceof WringerError ? error.code : "UNEXPECTED_ERROR";
  process.stderr.write(`mcp-wringer: [${code}] ${message}\n`);
  if (error instanceof TargetError || error instanceof TransportError) {
    process.exitCode = 3;
  } else if (error instanceof ScenarioError || code === "USAGE_ERROR") {
    process.exitCode = 2;
  } else {
    process.exitCode = 3;
  }
});
