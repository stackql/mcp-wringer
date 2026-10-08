import { ScenarioError } from "../core/errors.js";
import { ExtensionRegistry } from "../core/registry.js";
import { runStdioScenario, StdioScenarioSession } from "./stdio/runner.js";
import { runHttpScenario, HttpScenarioSession } from "./http/runner.js";
import type { TransportAdapter, TransportRunOptions, TransportSession } from "./types.js";

export const transportRegistry = new ExtensionRegistry<TransportAdapter>();

transportRegistry.register("stdio", {
  createSession(options): TransportSession {
    if (options.transport === "streamable-http") {
      throw new ScenarioError("The stdio transport requires a spawned command target.");
    }
    return new StdioScenarioSession(options);
  },
  run(options) {
    if (options.transport === "streamable-http") {
      throw new ScenarioError("The stdio transport requires a spawned command target.");
    }
    return runStdioScenario(options);
  },
});

transportRegistry.register("streamable-http", {
  createSession(options: TransportRunOptions) {
    if (options.transport !== "streamable-http") {
      throw new ScenarioError("The Streamable HTTP transport requires an HTTP target URL.");
    }
    return new HttpScenarioSession(options);
  },
  run(options) {
    if (options.transport !== "streamable-http") {
      throw new ScenarioError("The Streamable HTTP transport requires an HTTP target URL.");
    }
    return runHttpScenario(options);
  },
});
