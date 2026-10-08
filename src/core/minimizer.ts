import { performance } from "node:perf_hooks";
import { ScenarioError } from "./errors.js";
import type { Scenario } from "./types.js";
import { runSingleScenario } from "./run.js";
import type { FuzzSingleScenarioOptions } from "./run.js";
import type { InspectedSurface } from "../target/surface.js";
import type { SafetyPolicy } from "./safety.js";

export type MinimizeOptions = FuzzSingleScenarioOptions & {
  scenario: Scenario;
  findingId: string;
  surface: InspectedSurface;
  safety?: SafetyPolicy;
  timeBudgetMs?: number;
};

export interface MinimizeResult {
  scenario: Scenario;
  reproduced: boolean;
  flaky: boolean;
  attempts: number;
}

export async function minimizeScenario(options: MinimizeOptions): Promise<MinimizeResult> {
  const confirmations = options.confirmations ?? 2;
  const timeBudgetMs = options.timeBudgetMs ?? 10_000;
  if (!Number.isInteger(confirmations) || confirmations < 1 || confirmations > 5
    || !Number.isFinite(timeBudgetMs) || timeBudgetMs < 1) {
    throw new ScenarioError("Minimization confirmations and time budget must be positive and bounded.");
  }
  const deadline = performance.now() + timeBudgetMs;
  let attempts = 0;
  const original = await confirmScenario(options.scenario, options, confirmations, deadline);
  attempts += original.attempts;
  if (!original.confirmed) {
    return { scenario: options.scenario, reproduced: false, flaky: true, attempts };
  }

  let current = options.scenario;
  let index = 0;
  while (index < current.steps.length && performance.now() < deadline) {
    const candidate = {
      ...current,
      steps: current.steps.filter((_step, stepIndex) => stepIndex !== index),
    };
    const confirmation = await confirmScenario(candidate, options, confirmations, deadline);
    attempts += confirmation.attempts;
    if (confirmation.confirmed) {
      current = candidate;
    } else {
      index += 1;
    }
  }
  return { scenario: current, reproduced: true, flaky: false, attempts };
}

async function confirmScenario(
  scenario: Scenario,
  options: MinimizeOptions,
  confirmations: number,
  deadline: number,
): Promise<{ confirmed: boolean; attempts: number }> {
  let matches = 0;
  let attempts = 0;
  for (let index = 0; index < confirmations && performance.now() < deadline; index += 1) {
    const result = await runSingleScenario({
      ...options,
      revision: scenario.specRevision,
      scenario,
      surface: options.surface,
    });
    attempts += 1;
    if (result.findings.some((finding) => finding.id === options.findingId)) {
      matches += 1;
    } else if (matches + (confirmations - index - 1) < confirmations) {
      return { confirmed: false, attempts };
    }
  }
  return { confirmed: matches === confirmations, attempts };
}
