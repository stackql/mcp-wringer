import { ScenarioError } from "./errors.js";
import type { JsonValue, Scenario } from "./types.js";
import type { InspectedSurface } from "../target/surface.js";

export interface SafetyPolicy {
  allowTools?: readonly string[];
}

export function assertScenarioSafety(
  scenario: Scenario,
  surface: InspectedSurface,
  policy: SafetyPolicy = {},
): void {
  const toolByName = new Map(surface.tools.map((tool) => [tool.name, tool]));
  const allowedTools = new Set(policy.allowTools ?? []);
  for (const step of scenario.steps) {
    const rawMayContainCall = step.type === "send-raw" && mayContainToolCall(step.bytesBase64);
    const message = step.type === "send"
      ? asRecord(step.message)
      : step.type === "send-raw"
        ? parseRawMessage(step.bytesBase64)
        : undefined;
    if (rawMayContainCall && message === undefined) {
      throw new ScenarioError("Safety policy refused unparseable raw bytes that may contain a tools/call request.");
    }
    if (message?.method !== "tools/call") {
      continue;
    }
    const params = asRecord(message.params);
    const name = params?.name;
    if (typeof name !== "string") {
      throw new ScenarioError("Safety policy refused a tools/call request without an exact tool name.");
    }
    const tool = toolByName.get(name);
    if (tool?.safety === "read-only") {
      continue;
    }
    if (allowedTools.has(name)) {
      continue;
    }
    const reason = tool?.safety === "requires-exact-name-allow"
      ? "destructive tools require an exact-name allow entry"
      : "tools without a read-only annotation require an allow entry";
    throw new ScenarioError(`Safety policy refused tool '${name}': ${reason}.`);
  }
}

function parseRawMessage(bytesBase64: string): Record<string, JsonValue> | undefined {
  try {
    const parsed: unknown = JSON.parse(Buffer.from(bytesBase64, "base64").toString("utf8"));
    return isRecord(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

function mayContainToolCall(bytesBase64: string): boolean {
  const text = Buffer.from(bytesBase64, "base64").toString("utf8");
  return /tools\\?\/call/.test(text) || (text.includes("tools") && text.includes("call"));
}

function asRecord(value: JsonValue | undefined): Record<string, JsonValue> | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value : undefined;
}

function isRecord(value: unknown): value is Record<string, JsonValue> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
