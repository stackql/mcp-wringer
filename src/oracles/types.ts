import type { JsonValue, Scenario, Trace, TraceEvent } from "../core/types.js";
import type { StdioRunOutcome } from "../transports/stdio/runner.js";
import type { SpecRules } from "../spec/rules.js";

export interface OracleContext {
  scenario: Scenario;
  trace: Trace;
  responses: JsonValue[];
  outcome: StdioRunOutcome;
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
