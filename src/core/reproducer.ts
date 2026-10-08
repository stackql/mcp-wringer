import { readFile, writeFile } from "node:fs/promises";
import { ScenarioError } from "./errors.js";
import { validateReproducer } from "./scenario.js";
import type { Reproducer, Scenario, TargetDescriptor } from "./types.js";

export async function loadReproducer(path: string): Promise<Reproducer> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(await readFile(path, "utf8")) as unknown;
  } catch (error) {
    throw new ScenarioError(`Could not read reproducer '${path}': ${error instanceof Error ? error.message : String(error)}`);
  }
  validateReproducer(parsed);
  return parsed;
}

export async function saveReproducer(path: string, reproducer: Reproducer): Promise<void> {
  validateReproducer(reproducer);
  await writeFile(path, `${JSON.stringify(reproducer, null, 2)}\n`, "utf8");
}

export function createReproducer(
  scenario: Scenario,
  target: Omit<TargetDescriptor, "environmentNames"> & { environmentNames?: string[] },
  seed?: number,
): Reproducer {
  const environmentNames = [...new Set(target.environmentNames ?? [])].sort();
  return {
    formatVersion: 1,
    specRevision: scenario.specRevision,
    ...(seed === undefined ? {} : { seed }),
    target: {
      command: target.command,
      args: [...target.args],
      environmentNames,
    },
    scenario,
  };
}
