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

export type ReproducerTargetInput =
  | (Omit<Extract<TargetDescriptor, { transport: "stdio" }>, "environmentNames"> & { environmentNames?: string[] })
  | (Omit<Extract<TargetDescriptor, { transport: "streamable-http" }>, "environmentNames"> & { environmentNames?: string[] })
  | ({ command: string; args: string[]; environmentNames?: string[] });

export function createReproducer(
  scenario: Scenario,
  target: ReproducerTargetInput,
  seed?: number,
): Reproducer {
  const environmentNames = [...new Set(target.environmentNames ?? [])].sort();
  const descriptor: TargetDescriptor = "transport" in target && target.transport === "streamable-http"
    ? {
      transport: "streamable-http",
      url: target.url,
      ...(target.command === undefined ? {} : { command: target.command }),
      ...(target.args === undefined ? {} : { args: [...target.args] }),
      environmentNames,
    }
    : {
      transport: "stdio",
      command: target.command,
      args: [...target.args],
      environmentNames,
    };
  return {
    formatVersion: 1,
    specRevision: scenario.specRevision,
    ...(seed === undefined ? {} : { seed }),
    target: descriptor,
    scenario,
  };
}
