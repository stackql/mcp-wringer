import type { JsonValue } from "../core/types.js";

export interface InspectedTool {
  name: string;
  safety: "read-only" | "requires-explicit-allow" | "requires-exact-name-allow";
  inputSchema?: JsonValue;
}

export interface InspectedSurface {
  specRevision: "2025-11-25" | "2026-07-28";
  tools: InspectedTool[];
  resources: Array<{ name: string; uri: string }>;
  prompts: Array<{ name: string }>;
}
