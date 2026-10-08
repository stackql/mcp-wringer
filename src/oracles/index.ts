import "./builtins.js";
import { deduplicateFindings, createFinding } from "./findings.js";
import { oracleRegistry } from "./registry.js";
import type { Finding } from "../core/types.js";
import type { OracleContext, OracleSelection } from "./types.js";

export { oracleRegistry };
export type { FindingDraft, Oracle, OracleContext, OracleSelection } from "./types.js";

export function evaluateOracles(context: OracleContext, selections?: readonly OracleSelection[]): Finding[] {
  const enabledSelections = selections?.filter((selection) => selection.enabled);
  const active = enabledSelections
    ?? oracleRegistry.names().map((name) => ({ name, enabled: true }));
  const severityOverrides = new Map<string, Finding["severity"]>();
  for (const selection of enabledSelections ?? []) {
    for (const [ruleId, severity] of Object.entries(selection.severityOverrides ?? {})) {
      severityOverrides.set(ruleId, severity);
    }
  }
  const findings = active.flatMap(({ name }) =>
    oracleRegistry.get(name).evaluate(context).map((draft) =>
      createFinding(context, draft, severityOverrides.get(draft.ruleId))));
  return deduplicateFindings(findings);
}
