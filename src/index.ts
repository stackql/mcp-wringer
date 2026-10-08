export { createReproducer, loadReproducer, saveReproducer } from "./core/reproducer.js";
export { validateReproducer, validateScenario } from "./core/scenario.js";
export { ExtensionRegistry } from "./core/registry.js";
export type {
  Finding,
  FindingSeverity,
  JsonPrimitive,
  JsonValue,
  Reproducer,
  Scenario,
  ScenarioStep,
  SpecRevision,
  Trace,
  TraceEvent,
} from "./core/types.js";
export { specProfiles, requestScenarioSteps } from "./spec/profiles.js";
export { runStdioScenario } from "./transports/stdio/runner.js";
export { transportRegistry } from "./transports/registry.js";

export const WRINGER_VERSION = "0.1.0";
