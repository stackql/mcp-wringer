import type { Finding } from "../core/types.js";
import type { Reporter } from "./types.js";

const severityLevels = {
  high: "error",
  medium: "warning",
  low: "warning",
  info: "note",
} as const;

export const sarifReporter: Reporter = {
  fileExtension: "sarif",
  render(findings: Finding[]): string {
    const rules = [...new Map(
      findings.map((finding) => [finding.ruleId, {
        id: finding.ruleId,
        name: finding.title,
        shortDescription: { text: finding.title },
        fullDescription: { text: finding.message },
      }]),
    ).values()].sort((left, right) => left.id.localeCompare(right.id));
    const ruleIndices = new Map(rules.map((rule, index) => [rule.id, index]));
    const results = [...findings]
      .sort((left, right) => left.id.localeCompare(right.id))
      .map((finding) => ({
        ruleId: finding.ruleId,
        ruleIndex: ruleIndices.get(finding.ruleId),
        level: severityLevels[finding.severity],
        message: { text: finding.message },
        partialFingerprints: { "mcp-wringer/finding-id": finding.id },
      }));
    return `${JSON.stringify({
      $schema: "https://json.schemastore.org/sarif-2.1.0.json",
      version: "2.1.0",
      runs: [{
        tool: {
          driver: {
            name: "@stackql/mcp-wringer",
            version: "0.1.0",
            rules,
          },
        },
        results,
      }],
    }, null, 2)}\n`;
  },
};
