import { ExtensionRegistry } from "../core/registry.js";
import type { CoverageProvider } from "./types.js";

export const coverageProviderRegistry = new ExtensionRegistry<CoverageProvider>();
