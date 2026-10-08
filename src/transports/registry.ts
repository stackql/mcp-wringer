import { ExtensionRegistry } from "../core/registry.js";
import { runStdioScenario } from "./stdio/runner.js";

export const transportRegistry = new ExtensionRegistry<typeof runStdioScenario>();
transportRegistry.register("stdio", runStdioScenario);
