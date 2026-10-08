import { ExtensionRegistry } from "../core/registry.js";
import type { ProfileConfig } from "./definition.js";

export const profileRegistry = new ExtensionRegistry<ProfileConfig>();

profileRegistry.register("quick", { cases: 18, durationMs: 30_000 });
profileRegistry.register("standard", { cases: 256, durationMs: 120_000 });
profileRegistry.register("deep", { cases: 2_000, durationMs: 600_000 });
