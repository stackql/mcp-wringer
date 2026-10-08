import { performance } from "node:perf_hooks";
import { resolve } from "node:path";
import type { Finding, JsonValue, Scenario, ScenarioStep, SpecRevision } from "./types.js";
import { ScenarioError } from "./errors.js";
import { createRootSeed, deriveSeed } from "./seed.js";
import { assertScenarioSafety, type SafetyPolicy } from "./safety.js";
import { recordNovelScenario } from "./corpus.js";
import { inspectServer } from "../cli/inspect.js";
import { generateScenarios } from "../generators/index.js";
import { evaluateOracles, type OracleContext } from "../oracles/index.js";
import { deduplicateFindings } from "../oracles/findings.js";
import { specProfiles } from "../spec/profiles.js";
import { transportRegistry } from "../transports/registry.js";
import type { TransportRunResult, TransportTargetOptions, TransportSession } from "../transports/types.js";
import type { InspectedSurface } from "../target/surface.js";

const WIRE_GENERATOR_WEIGHT = 10;
export const defaultGeneratorSequence = [
  "schema-valid",
  "schema-mutated",
  "jsonrpc-envelope",
  "raw-json",
  "sequence",
  "tool-args",
  "resources",
  "prompts",
  ...Array.from({ length: WIRE_GENERATOR_WEIGHT }, () => "wire-fault"),
] as const;

export type FuzzProfile = "quick" | "standard" | "deep";
export type RestartPolicy = "per-case" | "on-failure" | "never";

interface FuzzRunCommonOptions {
  revision: SpecRevision;
  seed?: string | number;
  profile?: FuzzProfile;
  cases?: number;
  durationMs?: number;
  workers?: number;
  restartPolicy?: RestartPolicy;
  env?: Record<string, string>;
  inheritEnvironment?: boolean;
  safety?: SafetyPolicy;
  surface?: InspectedSurface;
  corpusDirectory?: string;
  timeoutMs?: number;
  confirmations?: number;
}

export type FuzzRunOptions = FuzzRunCommonOptions & (
  | {
    transport?: "stdio";
    command: string;
    args: string[];
    url?: never;
    allowNonLoopback?: never;
  }
  | {
    transport: "streamable-http";
    url: string;
    command?: string;
    args?: string[];
    allowNonLoopback?: boolean;
  }
);

export type FuzzSingleScenarioOptions = FuzzRunOptions extends infer Options
  ? Options extends FuzzRunOptions
    ? Omit<Options, "profile" | "cases" | "durationMs" | "workers" | "restartPolicy">
    : never
  : never;

export interface FuzzRunResult {
  seed: number;
  profile: FuzzProfile;
  casesRun: number;
  durationMs: number;
  findings: Finding[];
  diagnostics: string[];
  corpusEntriesAdded: number;
  reproducers: Array<{ findingId: string; scenario: Scenario }>;
}

interface ProfileDefaults {
  cases: number;
  durationMs: number;
}

const profiles: Record<FuzzProfile, ProfileDefaults> = {
  quick: { cases: 18, durationMs: 30_000 },
  standard: { cases: 256, durationMs: 120_000 },
  deep: { cases: 2_000, durationMs: 600_000 },
};

export async function runFuzz(options: FuzzRunOptions): Promise<FuzzRunResult> {
  const profileName = options.profile ?? "quick";
  const defaults = profiles[profileName];
  const caseLimit = options.cases ?? defaults.cases;
  const durationLimitMs = options.durationMs ?? defaults.durationMs;
  const workers = options.workers ?? 1;
  const confirmations = options.confirmations ?? 2;
  if (!Number.isInteger(caseLimit) || caseLimit < 1
    || !Number.isFinite(durationLimitMs) || durationLimitMs < 1
    || !Number.isInteger(workers) || workers < 1 || workers > 32
    || !Number.isInteger(confirmations) || confirmations < 1 || confirmations > 5) {
    throw new ScenarioError("Run budgets must be positive, and workers must be between 1 and 32.");
  }
  const seed = createRootSeed(options.seed);
  const startedAt = performance.now();
  const diagnostics: string[] = [];
  let surface = options.surface;
  if (surface === undefined) {
    try {
      surface = await inspectServer(options.revision, getTargetOptions(options));
    } catch (error) {
      if (!(error instanceof ScenarioError)) {
        throw error;
      }
      diagnostics.push(`Surface discovery failed; running only generators that do not need discovery: ${error.message}`);
      surface = {
        specRevision: options.revision,
        tools: [],
        resources: [],
        prompts: [],
      };
    }
  }
  if (surface.specRevision !== options.revision) {
    throw new ScenarioError("Discovered surface revision does not match the selected specification profile.");
  }
  const restartPolicy = options.restartPolicy ?? "per-case";
  if (restartPolicy !== "per-case" && workers !== 1) {
    throw new ScenarioError("Restart policies 'on-failure' and 'never' require workers=1.");
  }

  const target = getTargetOptions(options);
  const transportName = target.transport ?? "stdio";
  const scenarios = generateScenarios(
    options.revision,
    surface,
    seed,
    caseLimit,
    defaultGeneratorSequence,
    transportName,
  );
  const deadline = startedAt + durationLimitMs;
  const caseResults: Array<{ scenario: Scenario; context: OracleContext; findings: Finding[] } | undefined> =
    Array.from({ length: scenarios.length });
  let nextIndex = 0;
  let corpusEntriesAdded = 0;
  const corpusDirectory = options.corpusDirectory ?? resolve(".mcp-wringer", "corpus");
  const adapter = transportRegistry.get(transportName);
  const recordCase = async (index: number, session?: TransportSession): Promise<{
    session?: TransportSession;
    stop?: boolean;
  }> => {
    const generated = scenarios[index];
    if (generated === undefined) {
      return { ...(session === undefined ? {} : { session }) };
    }
    const scenario = addHealthChecks(generated, session === undefined);
    assertScenarioSafety(scenario, surface, options.safety);
    const currentSession = session ?? adapter.createSession({ ...target, scenario });
    const result = await currentSession.execute(scenario, { closeAfterScenario: restartPolicy === "per-case" });
    const context = createOracleContext(scenario, result, options.revision);
    const findings = evaluateOracles(context);
    caseResults[index] = { scenario, context, findings };
    if (await recordNovelScenario(corpusDirectory, scenario, result.trace, seed)) {
      corpusEntriesAdded += 1;
    }
    if (restartPolicy === "per-case") {
      return {};
    }
    const targetExited = result.outcome.exitCode !== null || result.outcome.signal !== null;
    if (restartPolicy === "on-failure"
      && (findings.length > 0 || result.outcome.failure !== undefined || targetExited)) {
      await currentSession.close(true);
      return {};
    }
    if (targetExited) {
      diagnostics.push(`Target exited during case ${scenario.id}; later cases were not run under restartPolicy=${restartPolicy}.`);
      await currentSession.close(true);
      return { stop: true };
    }
    return { session: currentSession };
  };

  const worker = async (): Promise<void> => {
    while (true) {
      const index = nextIndex;
      nextIndex += 1;
      if (index >= scenarios.length || performance.now() >= deadline) {
        return;
      }
      await recordCase(index);
    }
  };
  if (restartPolicy === "per-case") {
    await Promise.all(Array.from({ length: Math.min(workers, scenarios.length) }, worker));
  } else {
    let session: TransportSession | undefined;
    try {
      for (let index = 0; index < scenarios.length && performance.now() < deadline; index += 1) {
        const outcome = await recordCase(index, session);
        session = outcome.session;
        if (outcome.stop) {
          break;
        }
      }
    } finally {
      if (session !== undefined) {
        await session.close();
      }
    }
  }

  const executed = caseResults.filter((item): item is NonNullable<typeof item> => item !== undefined);
  const observedFindings = deduplicateFindings(executed.flatMap((item) => item.findings));
  const findings: Finding[] = [];
  const reproducers: Array<{ findingId: string; scenario: Scenario }> = [];
  for (const finding of observedFindings) {
    const origin = executed.find((item) => item.findings.some((candidate) => candidate.id === finding.id));
    if (origin === undefined) {
      continue;
    }
    let confirmationCount = 0;
    for (let attempt = 0; attempt < confirmations; attempt += 1) {
      if (performance.now() >= deadline) {
        break;
      }
      const replay = await runSingleScenario({
        ...target,
        revision: options.revision,
        scenario: origin.scenario,
        surface,
        ...(options.env === undefined ? {} : { env: options.env }),
        ...(options.inheritEnvironment === undefined ? {} : { inheritEnvironment: options.inheritEnvironment }),
        ...(options.safety === undefined ? {} : { safety: options.safety }),
        ...(options.timeoutMs === undefined ? {} : { timeoutMs: options.timeoutMs }),
      });
      if (replay.findings.some((candidate) => candidate.id === finding.id)) {
        confirmationCount += 1;
      }
    }
    if (confirmationCount === confirmations) {
      findings.push(finding);
      reproducers.push({ findingId: finding.id, scenario: origin.scenario });
    } else {
      diagnostics.push(
        `Finding ${finding.id} was not reproduced on ${confirmationCount} of ${confirmations} fresh targets and is flaky.`,
      );
    }
  }
  return {
    seed,
    profile: profileName,
    casesRun: executed.length,
    durationMs: Math.max(0, performance.now() - startedAt),
    findings,
    diagnostics,
    corpusEntriesAdded,
    reproducers,
  };
}

export async function runSingleScenario(
  options: FuzzSingleScenarioOptions & {
    scenario: Scenario;
    surface: InspectedSurface;
  },
): Promise<{ scenario: Scenario; result: TransportRunResult; context: OracleContext; findings: Finding[] }> {
  const scenario = addHealthChecks(options.scenario);
  assertScenarioSafety(scenario, options.surface, options.safety);
  const target = getTargetOptions(options);
  const result = await transportRegistry.get(target.transport ?? "stdio").run({ ...target, scenario });
  const context = createOracleContext(scenario, result, options.revision);
  return { scenario, result, context, findings: evaluateOracles(context) };
}

function addHealthChecks(scenario: Scenario, includeLifecycle = true): Scenario {
  if (scenario.steps.some((step) => step.type === "send" && isRecord(step.message)
    && [scenario.id + "-baseline-before", scenario.id + "-liveness", scenario.id + "-baseline-after"]
      .includes(String(step.message.id)))) {
    return scenario;
  }
  const profile = specProfiles.get(scenario.specRevision);
  const lifecycleStepCount = profile.lifecycleSteps(`${scenario.id}-lifecycle`).length;
  const hasDiscoveryBootstrap = scenario.specRevision === "2026-07-28"
    && scenario.steps[0]?.type === "send"
    && isRecord(scenario.steps[0].message)
    && scenario.steps[0].message.method === "server/discover"
    && scenario.steps[0].message.id === `${scenario.id}-discover`
    && scenario.steps[1]?.type === "await-response"
    && scenario.steps[1].id === scenario.steps[0].message.id;
  const prefixStepCount = lifecycleStepCount + (hasDiscoveryBootstrap ? 2 : 0);
  const prefix = includeLifecycle ? scenario.steps.slice(0, prefixStepCount) : [];
  const existingSteps = scenario.steps.slice(prefixStepCount);
  const beforeId = `${scenario.id}-baseline-before`;
  const livenessId = `${scenario.id}-liveness`;
  const afterId = `${scenario.id}-baseline-after`;
  const closesInput = existingSteps.some((step) => step.type === "transport" && step.operation === "close-stdin");
  const healthSteps: ScenarioStep[] = [
    { type: "send", message: profile.request(profile.toolListMethod, beforeId) },
    { type: "await-response", id: beforeId, timeoutMs: 1_000 },
    ...existingSteps,
  ];
  if (closesInput) {
    return { ...scenario, steps: [...prefix, ...healthSteps] };
  }
  healthSteps.push(
    { type: "send", message: profile.livenessProbe(livenessId) },
    { type: "await-response", id: livenessId, timeoutMs: 1_000 },
    { type: "send", message: profile.request(profile.toolListMethod, afterId) },
    { type: "await-response", id: afterId, timeoutMs: 1_000 },
  );
  return { ...scenario, steps: [...prefix, ...healthSteps] };
}

function createOracleContext(
  scenario: Scenario,
  result: TransportRunResult,
  revision: SpecRevision,
): OracleContext {
  const profile = specProfiles.get(revision);
  const beforeId = `${scenario.id}-baseline-before`;
  const livenessId = `${scenario.id}-liveness`;
  const afterId = `${scenario.id}-baseline-after`;
  const before = getResultById(result.responses, beforeId);
  const liveness = getResponseById(result.responses, livenessId);
  const after = getResultById(result.responses, afterId);
  return {
    scenario,
    ...result,
    rules: profile.rules,
    ...(result.httpExchanges === undefined ? {} : { httpExchanges: result.httpExchanges }),
    ...(liveness === undefined ? {} : {
      livenessProbe: {
        passed: !isErrorResponse(liveness),
      },
    }),
    ...(before === undefined || after === undefined
      ? {}
      : { baselineComparison: { before, after } }),
    expectedErrors: expectedInvalidRequestErrors(scenario, profile.rules.errorCodes.invalidRequest),
  };
}

function getTargetOptions(options: FuzzRunOptions): TransportTargetOptions {
  const common = {
    ...(options.env === undefined ? {} : { env: options.env }),
    ...(options.inheritEnvironment === undefined ? {} : { inheritEnvironment: options.inheritEnvironment }),
    ...(options.timeoutMs === undefined ? {} : { timeoutMs: options.timeoutMs }),
  };
  if (options.transport === "streamable-http") {
    return {
      transport: "streamable-http",
      url: options.url,
      ...(options.command === undefined ? {} : { command: options.command }),
      ...(options.args === undefined ? {} : { args: options.args }),
      ...(options.allowNonLoopback === undefined ? {} : { allowNonLoopback: options.allowNonLoopback }),
      ...common,
    };
  }
  return {
    transport: "stdio",
    command: options.command,
    args: options.args,
    ...common,
  };
}

function expectedInvalidRequestErrors(
  scenario: Scenario,
  code: number,
): Array<{ id: string | number; code: number }> {
  const expected: Array<{ id: string | number; code: number }> = [];
  for (const step of scenario.steps) {
    if (step.type !== "send" || !isRecord(step.message)) {
      continue;
    }
    const id = step.message.id;
    if (step.message.jsonrpc !== "2.0" && (typeof id === "string" || typeof id === "number")) {
      expected.push({ id, code });
    }
  }
  return expected;
}

function getResultById(responses: JsonValue[], id: string): JsonValue | undefined {
  const response = getResponseById(responses, id);
  if (response === undefined || !isRecord(response) || !("result" in response)) {
    return undefined;
  }
  return response.result;
}

function getResponseById(responses: JsonValue[], id: string): JsonValue | undefined {
  return responses.find((response) => isRecord(response) && response.id === id);
}

function isErrorResponse(value: JsonValue): boolean {
  return isRecord(value) && "error" in value;
}

function isRecord(value: unknown): value is Record<string, JsonValue> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function deriveCaseSeed(seed: number, generator: string, caseIndex: number): number {
  return deriveSeed(seed, generator, String(caseIndex));
}
