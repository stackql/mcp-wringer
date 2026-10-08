import type { ArgumentStrategy } from "../generators/types.js";
import { argumentStrategyRegistry } from "../generators/argument-strategies.js";
import type { ScenarioGenerator } from "../generators/types.js";
import { generatorRegistry } from "../generators/index.js";
import type { ProfileConfig } from "../config/definition.js";
import { profileRegistry } from "../config/profiles.js";
import type { Oracle } from "../oracles/types.js";
import { oracleRegistry } from "../oracles/registry.js";
import type { Reporter } from "../reporters/types.js";
import { reporterRegistry } from "../reporters/registry.js";

export const WRINGER_PLUGIN_API_VERSION = "0.1" as const;

export interface PluginApi {
  readonly apiVersion: typeof WRINGER_PLUGIN_API_VERSION;
  registerGenerator(name: string, generator: ScenarioGenerator): void;
  registerArgumentStrategy(name: string, strategy: ArgumentStrategy): void;
  registerOracle(name: string, oracle: Oracle): void;
  registerReporter(name: string, reporter: Reporter): void;
  registerProfile(name: string, profile: ProfileConfig): void;
}

export interface WringerPlugin {
  readonly apiVersion: typeof WRINGER_PLUGIN_API_VERSION;
  readonly name: string;
  register(api: PluginApi): void;
}

export const pluginApi: PluginApi = {
  apiVersion: WRINGER_PLUGIN_API_VERSION,
  registerGenerator(name, generator) {
    generatorRegistry.register(name, generator);
  },
  registerArgumentStrategy(name, strategy) {
    argumentStrategyRegistry.register(name, strategy);
  },
  registerOracle(name, oracle) {
    oracleRegistry.register(name, oracle);
  },
  registerReporter(name, reporter) {
    reporterRegistry.register(name, reporter);
  },
  registerProfile(name, profile) {
    profileRegistry.register(name, profile);
  },
};

export type {
  GeneratorContext,
  ScenarioGenerator,
  ArgumentStrategy,
  ArgumentStrategyContext,
  ArgumentStrategySelection,
} from "../generators/types.js";
export type { FindingDraft, Oracle, OracleContext } from "../oracles/types.js";
export type { Reporter } from "../reporters/types.js";
export type { ProfileConfig } from "../config/definition.js";
export type { Finding, JsonValue, Scenario, ScenarioStep, SpecRevision, TraceEvent } from "../core/types.js";
