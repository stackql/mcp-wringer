import type { Scenario, SpecRevision } from "../core/types.js";
import type { InspectedSurface } from "../target/surface.js";

export interface GeneratorContext {
  seed: number;
  revision: SpecRevision;
  surface: InspectedSurface;
  caseIndex: number;
}

export interface ScenarioGenerator {
  generate(context: GeneratorContext): Scenario;
}

export interface ArgumentStrategyContext {
  seed: number;
  toolName: string;
  path: string;
  schema: Record<string, unknown>;
}

export interface ArgumentStrategy {
  matches(context: Omit<ArgumentStrategyContext, "seed">): boolean;
  generate(context: ArgumentStrategyContext): unknown;
}
