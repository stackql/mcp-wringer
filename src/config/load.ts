import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { Ajv2020 } from "ajv/dist/2020.js";
import { WringerError } from "../core/errors.js";
import { argumentStrategyRegistry } from "../generators/argument-strategies.js";
import { generatorRegistry } from "../generators/index.js";
import { oracleRegistry } from "../oracles/index.js";
import { reporterRegistry } from "../reporters/index.js";
import { coverageProviderRegistry } from "../coverage-feedback/index.js";
import { specProfiles } from "../spec/profiles.js";
import { loadConfiguredPlugins } from "../plugin/loader.js";
import { configDefinition } from "./definition.js";
import type { ConfigOverrides, ProfileConfig, ResolvedConfig } from "./definition.js";
import { profileRegistry } from "./profiles.js";

const defaultConfigPath = "mcp-wringer.config.json";

export interface LoadedConfiguration {
  config: ResolvedConfig;
  origins: Record<string, string>;
  path?: string;
}

export interface LoadConfigurationOptions {
  configPath?: string;
  overrides?: ConfigOverrides;
  environment?: NodeJS.ProcessEnv;
}

export async function loadConfiguration(
  options: LoadConfigurationOptions = {},
): Promise<LoadedConfiguration> {
  const environment = options.environment ?? process.env;
  const envConfigPath = environment.MCP_WRINGER_CONFIG;
  const configPath = options.configPath ?? envConfigPath;
  const path = resolve(configPath ?? defaultConfigPath);
  const fileConfig = await readConfigFile(path, configPath !== undefined);
  validatePartialConfig(fileConfig, path);
  const environmentConfig = readEnvironmentConfig(environment);
  const defaults = createDefaultConfig();
  const selection = mergeConfig(defaults, fileConfig, environmentConfig, options.overrides ?? {});
  const pluginSpecifiers = selection.plugins;
  await loadConfiguredPlugins(pluginSpecifiers, configPath === undefined ? process.cwd() : dirname(path));

  const selectedProfile = selection.profile;
  const fileProfiles = isRecord(fileConfig.profiles)
    ? fileConfig.profiles as Record<string, ProfileConfig>
    : {};
  const profile = fileProfiles[selectedProfile] ?? getRegisteredProfile(selectedProfile);
  const config = mergeConfig(defaults, profile, fileConfig, environmentConfig, options.overrides ?? {});
  normalizeExtensionDefaults(config);
  validateResolvedConfig(config);
  validateExtensionNames(config);

  const origins: Record<string, string> = {};
  markOrigins(defaults, "", "defaults", origins);
  markOrigins(profile, "", `profile:${selectedProfile}`, origins);
  markOrigins(fileConfig, "", "config file", origins);
  markOrigins(environmentConfig, "", "environment", origins);
  markOrigins(options.overrides ?? {}, "", "command line", origins);
  return {
    config,
    origins,
    ...(fileConfigPathWasRead(configPath, environment, path) ? { path } : {}),
  };
}

export function createInitialConfig(): Record<string, unknown> {
  return {
    $schema: configDefinition.properties.$schema.default,
    profile: "quick",
  };
}

function fileConfigPathWasRead(
  configPath: string | undefined,
  environment: NodeJS.ProcessEnv,
  resolvedPath: string,
): boolean {
  return configPath !== undefined || environment.MCP_WRINGER_CONFIG !== undefined
    || resolvedPath === resolve(defaultConfigPath);
}

async function readConfigFile(path: string, required: boolean): Promise<Record<string, unknown>> {
  let contents: string;
  try {
    contents = await readFile(path, "utf8");
  } catch (error) {
    if (!required && isNodeError(error) && error.code === "ENOENT") {
      return {};
    }
    throw new WringerError(
      "CONFIG_ERROR",
      `Could not read configuration file '${path}': ${error instanceof Error ? error.message : String(error)}`,
      { cause: error },
    );
  }
  let value: unknown;
  try {
    value = JSON.parse(contents) as unknown;
  } catch (error) {
    throw new WringerError(
      "CONFIG_ERROR",
      `Configuration file '${path}' is not valid JSON: ${error instanceof Error ? error.message : String(error)}`,
      { cause: error },
    );
  }
  if (!isRecord(value)) {
    throw new WringerError("CONFIG_ERROR", `Configuration file '${path}' must contain a JSON object.`);
  }
  return value as ResolvedConfig;
}

function createDefaultConfig(): ResolvedConfig {
  const validator = new Ajv2020({ allErrors: true, useDefaults: true, strict: false })
    .compile<ResolvedConfig>(configDefinition);
  const value: unknown = {};
  if (!validator(value)) {
    throw new WringerError("CONFIG_ERROR", formatValidationErrors(validator.errors, value, "built-in defaults"));
  }
  return value;
}

function validatePartialConfig(value: Record<string, unknown>, path: string): void {
  const withDefaults = mergeConfig(createDefaultConfig(), value);
  const validator = new Ajv2020({ allErrors: true, useDefaults: true, strict: false })
    .compile<ResolvedConfig>(configDefinition);
  if (!validator(withDefaults)) {
    throw new WringerError("CONFIG_ERROR", formatValidationErrors(validator.errors, value, path));
  }
}

function validateResolvedConfig(value: ResolvedConfig): void {
  const validator = new Ajv2020({ allErrors: true, strict: false }).compile<ResolvedConfig>(configDefinition);
  if (!validator(value)) {
    throw new WringerError("CONFIG_ERROR", formatValidationErrors(validator.errors, value, "resolved configuration"));
  }
}

function readEnvironmentConfig(environment: NodeJS.ProcessEnv): ConfigOverrides {
  const value: Record<string, unknown> = {};
  for (const key of Object.keys(configDefinition.properties)) {
    if (key === "$schema" || key === "profiles") {
      continue;
    }
    const name = `MCP_WRINGER_${toEnvironmentName(key)}`;
    const raw = environment[name];
    if (raw === undefined) {
      continue;
    }
    value[key] = parseEnvironmentValue(raw, key);
  }
  return value as ConfigOverrides;
}

function parseEnvironmentValue(value: string, key: string): unknown {
  if (["seed"].includes(key)) {
    const numeric = Number(value);
    return value.trim() !== "" && Number.isSafeInteger(numeric) ? numeric : value;
  }
  if (["cases", "durationMs", "workers", "timeoutMs", "confirmations"].includes(key)) {
    if (!/^[1-9]\d*$/u.test(value) || !Number.isSafeInteger(Number(value))) {
      throw new WringerError("CONFIG_ERROR", `Environment variable MCP_WRINGER_${toEnvironmentName(key)} must be a positive integer.`);
    }
    return Number(value);
  }
  if (["inheritEnvironment", "allowNonLoopback"].includes(key)) {
    if (value !== "true" && value !== "false") {
      throw new WringerError("CONFIG_ERROR", `Environment variable MCP_WRINGER_${toEnvironmentName(key)} must be true or false.`);
    }
    return value === "true";
  }
  if (["args", "env", "allowTools", "argumentStrategies", "coverageFeedback", "plugins", "generators", "oracles", "reporters", "profiles"].includes(key)) {
    try {
      return JSON.parse(value) as unknown;
    } catch (error) {
      throw new WringerError(
        "CONFIG_ERROR",
        `Environment variable MCP_WRINGER_${toEnvironmentName(key)} must contain JSON: ${error instanceof Error ? error.message : String(error)}`,
        { cause: error },
      );
    }
  }
  return value;
}

function toEnvironmentName(key: string): string {
  return key.replace(/[A-Z]/gu, (letter) => `_${letter}`).toUpperCase();
}

function mergeConfig(...layers: object[]): ResolvedConfig {
  const merged: Record<string, unknown> = {};
  for (const layer of layers) {
    mergeObject(merged, layer);
  }
  return merged as ResolvedConfig;
}

function mergeObject(target: Record<string, unknown>, source: object): void {
  for (const [key, value] of Object.entries(source)) {
    if (isRecord(value) && isRecord(target[key])) {
      mergeObject(target[key], value);
    } else if (isRecord(value)) {
      const nested: Record<string, unknown> = {};
      mergeObject(nested, value);
      target[key] = nested;
    } else {
      target[key] = value;
    }
  }
}

function normalizeExtensionDefaults(config: ResolvedConfig): void {
  config.argumentStrategies = config.argumentStrategies.map((selection) => ({
    ...selection,
    enabled: selection.enabled ?? true,
    options: selection.options ?? {},
  }));
  config.generators = config.generators.map((selection) => ({
    ...selection,
    enabled: selection.enabled ?? true,
    weight: selection.weight ?? 1,
    options: selection.options ?? {},
  }));
  config.oracles = config.oracles.map((selection) => ({
    ...selection,
    enabled: selection.enabled ?? true,
    options: selection.options ?? {},
    severityOverrides: selection.severityOverrides ?? {},
  }));
  config.reporters = config.reporters.map((selection) => ({
    ...selection,
    enabled: selection.enabled ?? true,
    options: selection.options ?? {},
  }));
}

function validateExtensionNames(config: ResolvedConfig): void {
  for (const selection of config.argumentStrategies) {
    assertRegistered("argument strategy", selection.name, argumentStrategyRegistry.names());
  }
  assertRegistered("coverage provider", config.coverageFeedback.provider, coverageProviderRegistry.names());
  if (config.argumentStrategies.length > 0 && !config.argumentStrategies.some((selection) => selection.enabled)) {
    throw new WringerError("CONFIG_ERROR", "At least one argument strategy must be enabled.");
  }
  for (const selection of config.generators) {
    assertRegistered("generator", selection.name, generatorRegistry.names());
  }
  for (const selection of config.oracles) {
    assertRegistered("oracle", selection.name, oracleRegistry.names());
    const ruleNames = Object.keys(specProfiles.get(config.specRevision).rules.rules);
    for (const ruleId of Object.keys(selection.severityOverrides)) {
      if (!ruleNames.includes(ruleId)) {
        const suggestion = nearestName(ruleId, ruleNames);
        throw new WringerError(
          "CONFIG_ERROR",
          `Unknown oracle rule '${ruleId}'.${suggestion === undefined ? "" : ` Did you mean '${suggestion}'?`}`,
        );
      }
    }
  }
  for (const selection of config.reporters) {
    assertRegistered("reporter", selection.name, reporterRegistry.names());
  }
  const enabledGenerators = config.generators.filter((selection) => selection.enabled);
  if (config.generators.length > 0 && enabledGenerators.length === 0) {
    throw new WringerError("CONFIG_ERROR", "At least one generator must be enabled.");
  }
  if (!config.reporters.some((selection) => selection.enabled)) {
    throw new WringerError("CONFIG_ERROR", "At least one reporter must be enabled.");
  }
}

function assertRegistered(kind: string, name: string, available: string[]): void {
  if (available.includes(name)) {
    return;
  }
  const suggestion = nearestName(name, available);
  throw new WringerError(
    "CONFIG_ERROR",
    `Unknown ${kind} '${name}'.${suggestion === undefined ? "" : ` Did you mean '${suggestion}'?`}`,
  );
}

function getRegisteredProfile(name: string): ProfileConfig {
  if (profileRegistry.names().includes(name)) {
    return profileRegistry.get(name);
  }
  const suggestion = nearestName(name, profileRegistry.names());
  throw new WringerError(
    "CONFIG_ERROR",
    `Unknown profile '${name}'.${suggestion === undefined ? "" : ` Did you mean '${suggestion}'?`}`,
  );
}

function nearestName(value: string, options: string[]): string | undefined {
  const ranked = options
    .map((option) => ({ option, distance: editDistance(value.toLowerCase(), option.toLowerCase()) }))
    .sort((left, right) => left.distance - right.distance || left.option.localeCompare(right.option));
  const best = ranked[0];
  return best !== undefined && best.distance <= Math.max(2, Math.ceil(value.length / 3))
    ? best.option
    : undefined;
}

function editDistance(left: string, right: string): number {
  const row = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    let previous = row[0] ?? 0;
    row[0] = leftIndex;
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const current = row[rightIndex] ?? 0;
      row[rightIndex] = Math.min(
        current + 1,
        (row[rightIndex - 1] ?? 0) + 1,
        previous + (left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1),
      );
      previous = current;
    }
  }
  return row[right.length] ?? 0;
}

function markOrigins(value: unknown, prefix: string, origin: string, origins: Record<string, string>): void {
  if (isRecord(value)) {
    const entries = Object.entries(value);
    if (entries.length === 0 && prefix.length > 0) {
      origins[prefix] = origin;
    }
    for (const [key, child] of entries) {
      markOrigins(child, prefix.length === 0 ? key : `${prefix}.${key}`, origin, origins);
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((child, index) => markOrigins(child, `${prefix}.${index}`, origin, origins));
    if (value.length === 0) {
      origins[prefix] = origin;
    }
    return;
  }
  origins[prefix] = origin;
}

function formatValidationErrors(
  errors: Array<{ instancePath?: string; keyword?: string; params?: Record<string, unknown>; message?: string }> | null | undefined,
  value: unknown,
  label: string,
): string {
  const error = errors?.[0];
  if (error === undefined) {
    return `Invalid ${label}.`;
  }
  if (error.keyword === "additionalProperties" && isRecord(value)) {
    const unknown = error.params?.additionalProperty;
    if (typeof unknown === "string") {
      const suggestion = nearestName(unknown, Object.keys(configDefinition.properties));
      return `Unknown configuration key '${unknown}'.${suggestion === undefined ? "" : ` Did you mean '${suggestion}'?`}`;
    }
  }
  const path = error.instancePath ?? "";
  return `Invalid ${label}${path.length === 0 ? "" : ` at ${path}`}: ${error.message ?? "validation failed"}.`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}
