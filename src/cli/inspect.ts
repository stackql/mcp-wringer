import { ScenarioError, TargetError } from "../core/errors.js";
import type { JsonValue, Scenario, SpecRevision } from "../core/types.js";
import { specProfiles } from "../spec/profiles.js";
import type { InspectedSurface, InspectedTool } from "../target/surface.js";
import { transportRegistry } from "../transports/registry.js";
import type { TransportTargetOptions } from "../transports/types.js";

export type { InspectedSurface, InspectedTool } from "../target/surface.js";

export function inspectServer(specRevision: SpecRevision, target: TransportTargetOptions): Promise<InspectedSurface>;
export function inspectServer(
  specRevision: SpecRevision,
  command: string,
  args: string[],
  options?: { env?: Record<string, string>; inheritEnvironment?: boolean; timeoutMs?: number },
): Promise<InspectedSurface>;
export async function inspectServer(
  specRevision: SpecRevision,
  targetOrCommand: TransportTargetOptions | string,
  args?: string[],
  options: { env?: Record<string, string>; inheritEnvironment?: boolean; timeoutMs?: number } = {},
): Promise<InspectedSurface> {
  const target: TransportTargetOptions = typeof targetOrCommand === "string"
    ? {
      transport: "stdio",
      command: targetOrCommand,
      args: args ?? [],
      ...options,
    }
    : targetOrCommand;
  const profile = specProfiles.get(specRevision);
  const methods = [
    profile.toolListMethod,
    profile.resourceListMethod,
    profile.promptListMethod,
  ];
  const steps = profile.lifecycleSteps("inspect");
  methods.forEach((method, index) => {
    const id = `inspect-${index + 1}`;
    steps.push(
      { type: "send", message: profile.request(method, id) },
      { type: "await-response", id },
    );
  });

  const scenario: Scenario = {
    formatVersion: 1,
    id: `inspect-${specRevision}`,
    specRevision,
    description: "Read-only MCP surface inspection.",
    steps,
  };
  const { responses } = await transportRegistry.get(target.transport ?? "stdio").run({
    ...target,
    scenario,
  });
  const rejection = responses.find((response) => isRecord(response) && isRecord(response.error));
  if (rejection !== undefined && isRecord(rejection) && isRecord(rejection.error)) {
    const { code, message } = rejection.error;
    throw new TargetError(
      `Target rejected inspection for spec revision ${specRevision}: error ${String(code)} ${typeof message === "string" ? message : ""}`.trimEnd(),
    );
  }
  if (responses.length !== methods.length + (specRevision === "2025-11-25" ? 1 : 0)) {
    throw new ScenarioError("Target did not return all expected responses during inspection.");
  }
  const listResponses = responses.slice(responses.length - methods.length);
  const tools: InspectedTool[] = getArray(listResponses[0], "tools").flatMap((item) => {
    if (!isRecord(item) || typeof item.name !== "string") {
      return [];
    }
    const annotations = isRecord(item.annotations) ? item.annotations : {};
    const safety: InspectedTool["safety"] = annotations.destructiveHint === true
      ? "requires-exact-name-allow"
      : annotations.readOnlyHint === true
        ? "read-only"
        : "requires-explicit-allow";
    const inputSchema = item.inputSchema;
    return [{
      name: item.name,
      safety,
      ...(inputSchema === undefined ? {} : { inputSchema }),
    }];
  });
  const resources = getArray(listResponses[1], "resources").flatMap((item) => {
    if (!isRecord(item) || typeof item.name !== "string" || typeof item.uri !== "string") {
      return [];
    }
    return [{ name: item.name, uri: item.uri }];
  });
  const prompts = getArray(listResponses[2], "prompts").flatMap((item) => {
    if (!isRecord(item) || typeof item.name !== "string") {
      return [];
    }
    return [{ name: item.name }];
  });

  return { specRevision, tools, resources, prompts };
}

function getArray(response: JsonValue | undefined, key: string): JsonValue[] {
  if (!isRecord(response) || !isRecord(response.result) || !Array.isArray(response.result[key])) {
    throw new ScenarioError(`Inspection response is missing result.${key}.`);
  }
  return response.result[key];
}

function isRecord(value: unknown): value is Record<string, JsonValue> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
