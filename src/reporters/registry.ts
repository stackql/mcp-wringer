import { ExtensionRegistry } from "../core/registry.js";
import type { Reporter } from "./types.js";

export const reporterRegistry = new ExtensionRegistry<Reporter>();
