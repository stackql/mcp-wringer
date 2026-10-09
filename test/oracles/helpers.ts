import { resolve } from "node:path";
import type { JsonValue, ScenarioStep, SpecRevision } from "../../src/core/types.js";
import { specProfiles } from "../../src/spec/profiles.js";
import { runStdioScenario } from "../../src/transports/stdio/runner.js";
import type { OracleContext } from "../../src/oracles/types.js";

const fixturePath = resolve("fixtures/stdio-server.mjs");

export async function executeFixture(
  revision: SpecRevision,
  steps: ScenarioStep[],
  options: { defect?: string; timeoutMs?: number; id?: string } = {},
): Promise<OracleContext> {
  const profile = specProfiles.get(revision);
  const scenarioId = options.id ?? `oracle-${revision}`;
  // Lifecycle awaits also cover fixture startup, which can take several seconds under parallel test
  // load. Give them their own allowance so a short options.timeoutMs does not apply to startup.
  const lifecycle = profile.lifecycleSteps(`${scenarioId}-lifecycle`).map((step) =>
    step.type === "await-response" && step.timeoutMs === undefined ? { ...step, timeoutMs: 15_000 } : step);
  const scenario = {
    formatVersion: 1 as const,
    id: scenarioId,
    specRevision: revision,
    steps: [
      ...lifecycle,
      ...(revision === "2026-07-28"
        ? requestSteps(revision, "server/discover", `${scenarioId}-ready`, undefined, 15_000)
        : []),
      ...steps,
    ],
  };
  const result = await runStdioScenario({
    command: process.execPath,
    args: [fixturePath, "--revision", revision],
    ...(options.defect === undefined ? {} : { env: { MCP_WRINGER_DEFECTS: options.defect } }),
    ...(options.timeoutMs === undefined ? {} : { timeoutMs: options.timeoutMs }),
    scenario,
  });
  return {
    scenario,
    rules: profile.rules,
    ...result,
  };
}

export function requestSteps(
  revision: SpecRevision,
  method: string,
  id: string | number,
  params?: JsonValue,
  timeoutMs = 300,
): ScenarioStep[] {
  const profile = specProfiles.get(revision);
  return [
    { type: "send", message: profile.request(method, id, params) },
    { type: "await-response", id, timeoutMs },
  ];
}
