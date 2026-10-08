import "./builtins.js";
import { deduplicateFindings, createFinding } from "./findings.js";
import { oracleRegistry } from "./registry.js";
import type { Finding } from "../core/types.js";
import type { OracleContext } from "./types.js";

export { oracleRegistry };
export type { FindingDraft, Oracle, OracleContext } from "./types.js";

export function evaluateOracles(context: OracleContext): Finding[] {
  const findings = oracleRegistry.names().flatMap((name) =>
    oracleRegistry.get(name).evaluate(context).map((draft) => createFinding(context, draft)));
  return deduplicateFindings(findings);
}
