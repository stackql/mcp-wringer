import type { JsonValue, Scenario, TraceEvent } from "../core/types.js";
import type { TransportRunResult } from "../transports/types.js";
import type { SpecRules } from "../spec/rules.js";

export interface OracleContext extends TransportRunResult {
  scenario: Scenario;
  rules: SpecRules;
  livenessProbe?: { passed: boolean; evidence?: TraceEvent[] };
  baselineComparison?: { before: JsonValue; after: JsonValue };
  expectedErrors?: Array<{ id: string | number; code: number }>;
}

export interface FindingDraft {
  ruleId: string;
  signature: string;
  message: string;
  evidence?: TraceEvent[];
}

export interface Oracle {
  evaluate(context: OracleContext): FindingDraft[];
}
