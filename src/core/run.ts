import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { performance } from "node:perf_hooks";
import { join, resolve } from "node:path";
import type { Finding, JsonValue, Scenario, ScenarioStep, SpecRevision } from "./types.js";
import { CoverageError, ScenarioError } from "./errors.js";
import { createRootSeed, deriveSeed } from "./seed.js";
import { assertScenarioSafety, type SafetyPolicy } from "./safety.js";
import { recordNovelScenario } from "./corpus.js";
import { inspectServer } from "../cli/inspect.js";
import { generateScenarios, generatorRegistry } from "../generators/index.js";
import type { ArgumentStrategySelection } from "../generators/types.js";
import { coverageProviderRegistry } from "../coverage-feedback/index.js";
import type { CoverageFeedbackResult, CoverageSelection } from "../coverage-feedback/types.js";
import { evaluateOracles, type OracleContext, type OracleSelection } from "../oracles/index.js";
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
  baselinePath?: string;
  generatorSequence?: readonly string[];
  argumentStrategies?: readonly ArgumentStrategySelection[];
  oracleSelections?: readonly OracleSelection[];
  coverageFeedback?: CoverageSelection;
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
  firstFindingCases?: Record<string, number>;
  coverageFeedback?: CoverageFeedbackResult;
  baseline?: { newFindingIds: string[]; staleFindingIds: string[] };
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
  const baselineIds = options.baselinePath === undefined
    ? undefined
    : await readBaseline(options.baselinePath);
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
  const coverageSelection = options.coverageFeedback;
  let coverageProvider: ReturnType<typeof coverageProviderRegistry.get> | undefined;
  let coverageDirectory: string | undefined;
  let coverageTarget: TransportTargetOptions | undefined;
  if (coverageSelection !== undefined) {
    if (target.transport !== "stdio" || workers !== 1 || restartPolicy !== "per-case") {
      throw new CoverageError(
        "Coverage feedback requires a spawned stdio target, workers=1, and restartPolicy='per-case'.",
      );
    }
    if (!Number.isInteger(coverageSelection.batchSize)
      || coverageSelection.batchSize < 1 || coverageSelection.batchSize > 100) {
      throw new CoverageError("Coverage feedback batchSize must be an integer from 1 to 100.");
    }
    coverageProvider = coverageProviderRegistry.get(coverageSelection.provider);
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/u.test(coverageProvider.environmentVariable)) {
      throw new CoverageError(
        `Coverage provider '${coverageSelection.provider}' declares an invalid environment variable name.`,
      );
    }
    const configuredCoverageVariable = findEnvironmentVariable(target.env, coverageProvider.environmentVariable);
    const inheritedCoverageVariable = options.inheritEnvironment
      ? findEnvironmentVariable(process.env, coverageProvider.environmentVariable)
      : undefined;
    if (configuredCoverageVariable !== undefined || inheritedCoverageVariable !== undefined) {
      throw new CoverageError(
        `Do not set ${configuredCoverageVariable ?? inheritedCoverageVariable} in target environment while coverage feedback is enabled.`,
      );
    }
    coverageDirectory = await mkdtemp(join(tmpdir(), "mcp-wringer-coverage-"));
    coverageTarget = {
      ...target,
      env: {
        ...target.env,
        [coverageProvider.environmentVariable]: coverageDirectory,
      },
    };
  }
  const scenarios = coverageSelection === undefined
    ? generateScenarios(
      options.revision,
      surface,
      seed,
      caseLimit,
      options.generatorSequence ?? defaultGeneratorSequence,
      transportName,
      options.argumentStrategies,
    )
    : [];
  const deadline = startedAt + durationLimitMs;
  const caseResults: Array<{ scenario: Scenario; context: OracleContext; findings: Finding[] } | undefined> =
    Array.from({ length: caseLimit });
  let nextIndex = 0;
  let corpusEntriesAdded = 0;
  const corpusDirectory = options.corpusDirectory ?? resolve(".mcp-wringer", "corpus");
  const adapter = transportRegistry.get(transportName);
  const recordCase = async (
    generated: Scenario,
    index: number,
    session?: TransportSession,
    runTarget: TransportTargetOptions = target,
  ): Promise<{
    session?: TransportSession;
    stop?: boolean;
  }> => {
    const scenario = addHealthChecks(generated, session === undefined);
    assertScenarioSafety(scenario, surface, options.safety);
    const currentSession = session ?? adapter.createSession({ ...runTarget, scenario });
    const result = await currentSession.execute(scenario, {
      closeAfterScenario: restartPolicy === "per-case" || coverageSelection !== undefined,
    });
    const context = createOracleContext(scenario, result, options.revision);
    const findings = evaluateOracles(context, options.oracleSelections);
    caseResults[index] = { scenario, context, findings };
    if (await recordNovelScenario(corpusDirectory, scenario, result.trace, seed)) {
      corpusEntriesAdded += 1;
    }
    if (restartPolicy === "per-case" || coverageSelection !== undefined) {
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
      const scenario = scenarios[index];
      if (scenario !== undefined) {
        await recordCase(scenario, index);
      }
    }
  };
  let coverageFeedbackResult: CoverageFeedbackResult | undefined;
  if (coverageSelection !== undefined && coverageProvider !== undefined
    && coverageDirectory !== undefined && coverageTarget !== undefined) {
    const selectedSequence = options.generatorSequence ?? defaultGeneratorSequence;
    const availableNames = generatorRegistry.names();
    const weights = new Map<string, number>();
    for (const name of selectedSequence) {
      if (availableNames.includes(name)) {
        weights.set(name, (weights.get(name) ?? 0) + 1);
      }
    }
    if (weights.size === 0) {
      await rm(coverageDirectory, { recursive: true, force: true });
      throw new CoverageError("Coverage feedback requires at least one registered generator in generatorSequence.");
    }
    const generatorOrder = [...weights.keys()];
    const generatorStats = new Map(generatorOrder.map((name) => [name, { batches: 0, newFeatures: 0 }]));
    const allFeatures = new Set<string>();
    let totalNewFeatures = 0;
    let batches = 0;
    const generatorBatches: string[] = [];
    let caseIndex = 0;
    try {
      while (caseIndex < caseLimit && performance.now() < deadline) {
        const selectedGenerator = chooseCoverageGenerator(generatorOrder, weights, generatorStats, batches);
        const batchSize = Math.min(coverageSelection.batchSize, caseLimit - caseIndex);
        const batchStartIndex = caseIndex;
        const batchScenarios = generateScenarios(
          options.revision,
          surface,
          seed,
          batchSize,
          [selectedGenerator],
          transportName,
          options.argumentStrategies,
          caseIndex,
        );
        let session: TransportSession | undefined;
        let completedCases = 0;
        try {
          for (let offset = 0; offset < batchScenarios.length && performance.now() < deadline; offset += 1) {
            const scenario = batchScenarios[offset];
            if (scenario === undefined) {
              continue;
            }
            const index = caseIndex + offset;
            const outcome = await recordCase(scenario, index, session, coverageTarget);
            session = outcome.session;
            if (caseResults[index] !== undefined) {
              completedCases += 1;
            }
            if (outcome.stop) {
              break;
            }
          }
        } finally {
          if (session !== undefined) {
            await session.close();
          }
        }
        caseIndex += completedCases;
        if (completedCases === 0) {
          break;
        }
        const batchTargetFailed = caseResults
          .slice(batchStartIndex, batchStartIndex + completedCases)
          .some((item) => item !== undefined
            && (item.context.outcome.failure !== undefined
              || item.context.outcome.exitCode !== null
              || item.context.outcome.signal !== null));
        let currentFeatures: ReadonlySet<string>;
        let coverageUnavailable = false;
        try {
          currentFeatures = await coverageProvider.collect(coverageDirectory);
        } catch (error) {
          if (!(error instanceof CoverageError) || !batchTargetFailed) {
            throw error;
          }
          diagnostics.push(
            `Coverage feedback was unavailable after a failed target batch: ${error.message}`,
          );
          currentFeatures = new Set();
          coverageUnavailable = true;
        }
        if (batchTargetFailed && currentFeatures.size === 0 && !coverageUnavailable) {
          diagnostics.push("Coverage feedback reported no executed features after a failed target batch.");
        }
        let newlyCovered = 0;
        for (const feature of currentFeatures) {
          if (!allFeatures.has(feature)) {
            allFeatures.add(feature);
            newlyCovered += 1;
          }
        }
        const stats = generatorStats.get(selectedGenerator);
        if (stats === undefined) {
          throw new CoverageError(`Coverage scheduler lost generator '${selectedGenerator}'.`);
        }
        stats.batches += 1;
        stats.newFeatures += newlyCovered;
        totalNewFeatures += newlyCovered;
        batches += 1;
        generatorBatches.push(selectedGenerator);
      }
      coverageFeedbackResult = {
        provider: coverageSelection.provider,
        batches,
        generatorBatches,
        features: allFeatures.size,
        newFeatures: totalNewFeatures,
      };
    } finally {
      await rm(coverageDirectory, { recursive: true, force: true });
    }
  } else if (restartPolicy === "per-case") {
    await Promise.all(Array.from({ length: Math.min(workers, scenarios.length) }, worker));
  } else {
    let session: TransportSession | undefined;
    try {
      for (let index = 0; index < scenarios.length && performance.now() < deadline; index += 1) {
        const scenario = scenarios[index];
        if (scenario === undefined) {
          continue;
        }
        const outcome = await recordCase(scenario, index, session);
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
  const firstFindingCases: Record<string, number> = {};
  for (let index = 0; index < caseResults.length; index += 1) {
    for (const finding of caseResults[index]?.findings ?? []) {
      firstFindingCases[finding.ruleId] ??= index + 1;
    }
  }
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
        ...(options.oracleSelections === undefined ? {} : { oracleSelections: options.oracleSelections }),
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
        `Finding ${finding.id} (${finding.ruleId}) was not reproduced on ${confirmationCount} of ${confirmations} fresh targets and is flaky.`,
      );
    }
  }
  const baseline = baselineIds === undefined
    ? undefined
    : compareBaseline(baselineIds, findings);
  if (baseline !== undefined) {
    for (const id of baseline.newFindingIds) {
      diagnostics.push(`Finding ${id} is new relative to the configured baseline.`);
    }
    for (const id of baseline.staleFindingIds) {
      diagnostics.push(`Baseline finding ${id} is stale because it did not reproduce.`);
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
    ...(Object.keys(firstFindingCases).length === 0
      ? {}
      : { firstFindingCases: Object.fromEntries(Object.entries(firstFindingCases).sort(([left], [right]) => left.localeCompare(right))) }),
    ...(coverageFeedbackResult === undefined ? {} : { coverageFeedback: coverageFeedbackResult }),
    ...(baseline === undefined ? {} : { baseline }),
  };
}

async function readBaseline(baselinePath: string): Promise<string[]> {
  let text: string;
  try {
    text = await readFile(resolve(baselinePath), "utf8");
  } catch (error) {
    throw new ScenarioError(
      `Could not read baseline '${baselinePath}': ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  let value: unknown;
  try {
    value = JSON.parse(text) as unknown;
  } catch (error) {
    throw new ScenarioError(
      `Baseline '${baselinePath}' is not valid JSON: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  if (!isRecord(value) || value.formatVersion !== 1 || !Array.isArray(value.findingIds)
    || !value.findingIds.every((id): id is string => typeof id === "string" && id.length > 0)
    || new Set(value.findingIds).size !== value.findingIds.length) {
    throw new ScenarioError(
      `Baseline '${baselinePath}' must contain formatVersion 1 and a unique string array named findingIds.`,
    );
  }
  return value.findingIds;
}

function compareBaseline(
  findingIds: string[],
  findings: Finding[],
): { newFindingIds: string[]; staleFindingIds: string[] } {
  const baselineIds = new Set(findingIds);
  const currentIds = new Set(findings.map((finding) => finding.id));
  return {
    newFindingIds: [...currentIds].filter((id) => !baselineIds.has(id)).sort(),
    staleFindingIds: [...baselineIds].filter((id) => !currentIds.has(id)).sort(),
  };
}

function chooseCoverageGenerator(
  generatorOrder: readonly string[],
  weights: ReadonlyMap<string, number>,
  stats: ReadonlyMap<string, { batches: number; newFeatures: number }>,
  totalBatches: number,
): string {
  let selected: string | undefined;
  let bestScore = Number.NEGATIVE_INFINITY;
  for (const name of generatorOrder) {
    const current = stats.get(name);
    if (current === undefined) {
      continue;
    }
    if (current.batches === 0) {
      return name;
    }
    const weight = weights.get(name) ?? 1;
    const exploitation = current.newFeatures / current.batches;
    const exploration = Math.sqrt((2 * Math.log(totalBatches + 1)) / current.batches) * Math.sqrt(weight);
    const score = exploitation + exploration;
    if (score > bestScore) {
      selected = name;
      bestScore = score;
    }
  }
  if (selected === undefined) {
    throw new CoverageError("Coverage scheduler could not select a registered generator.");
  }
  return selected;
}

function findEnvironmentVariable(
  environment: NodeJS.ProcessEnv | Record<string, string> | undefined,
  requestedName: string,
): string | undefined {
  return Object.keys(environment ?? {}).find((name) => name.toUpperCase() === requestedName.toUpperCase());
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
  return { scenario, result, context, findings: evaluateOracles(context, options.oracleSelections) };
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
