import { createHash } from "node:crypto";
import type { EvidenceExcerpt, Finding, TraceEvent } from "../core/types.js";
import type { OracleContext, FindingDraft } from "./types.js";

const MAX_EVIDENCE_BYTES = 512;

export function createFinding(
  context: OracleContext,
  draft: FindingDraft,
  severityOverride?: Finding["severity"],
): Finding {
  const rule = context.rules.rules[draft.ruleId];
  if (rule === undefined) {
    throw new Error(`Spec rules for ${context.rules.revision} do not define '${draft.ruleId}'.`);
  }
  const id = createHash("sha256")
    .update(`${draft.ruleId}\0${draft.signature}`)
    .digest("hex");
  return {
    id,
    ruleId: draft.ruleId,
    severity: severityOverride ?? rule.severity,
    title: rule.title,
    message: draft.message,
    cite: rule.cite,
    occurrences: 1,
    evidence: (draft.evidence ?? []).map(toEvidenceExcerpt),
  };
}

export function deduplicateFindings(findings: Finding[]): Finding[] {
  const unique = new Map<string, Finding>();
  for (const finding of findings) {
    const previous = unique.get(finding.id);
    if (previous === undefined) {
      unique.set(finding.id, finding);
      continue;
    }
    const evidence = new Map(
      [...previous.evidence, ...finding.evidence].map((excerpt) => [
        `${excerpt.channel}:${excerpt.encoding}:${excerpt.sha256}`,
        excerpt,
      ]),
    );
    unique.set(finding.id, {
      ...previous,
      occurrences: previous.occurrences + finding.occurrences,
      evidence: [...evidence.values()],
    });
  }
  return [...unique.values()].sort((left, right) => left.id.localeCompare(right.id));
}

function toEvidenceExcerpt(event: TraceEvent): EvidenceExcerpt {
  const bytes = event.encoding === "base64" ? Buffer.from(event.data, "base64") : Buffer.from(event.data, "utf8");
  const excerpt = bytes.subarray(0, MAX_EVIDENCE_BYTES);
  const utf8 = excerpt.toString("utf8");
  const encoding = event.encoding === "base64" || !Buffer.from(utf8, "utf8").equals(excerpt)
    ? "base64"
    : "utf8";
  return {
    channel: event.channel,
    encoding,
    data: encoding === "base64" ? excerpt.toString("base64") : utf8,
    originalLengthBytes: bytes.length,
    sha256: createHash("sha256").update(bytes).digest("hex"),
    truncated: bytes.length > excerpt.length,
    ...(event.http === undefined ? {} : { http: event.http }),
  };
}
