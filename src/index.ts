export { createReproducer, loadReproducer, saveReproducer } from "./core/reproducer.js";
export { validateReproducer, validateScenario } from "./core/scenario.js";
export { ExtensionRegistry } from "./core/registry.js";
export type {
  Finding,
  FindingSeverity,
  EvidenceExcerpt,
  JsonPrimitive,
  JsonValue,
  Reproducer,
  Scenario,
  ScenarioStep,
  SpecRevision,
  TargetDescriptor,
  Trace,
  TraceEvent,
  TransportName,
  TransportRunOutcome,
  HttpExchangeObservation,
} from "./core/types.js";
export { specProfiles, requestScenarioSteps } from "./spec/profiles.js";
export { runStdioScenario } from "./transports/stdio/runner.js";
export { runHttpScenario, HttpScenarioSession } from "./transports/http/runner.js";
export type { HttpRunResult } from "./transports/http/runner.js";
export type { TransportAdapter, TransportRunOptions, TransportRunResult, TransportSession, TransportTargetOptions } from "./transports/types.js";
export { transportRegistry } from "./transports/registry.js";
export { runFuzz, runSingleScenario } from "./core/run.js";
export type { FuzzRunOptions, FuzzRunResult } from "./core/run.js";
export { evaluateOracles, oracleRegistry } from "./oracles/index.js";
export { renderReport, reporterRegistry } from "./reporters/index.js";

export const WRINGER_VERSION = "0.1.0";
