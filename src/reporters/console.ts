import type { Finding, FindingSeverity } from "../core/types.js";
import type { Reporter } from "./types.js";

const severityOrder: Record<FindingSeverity, number> = {
  high: 0,
  medium: 1,
  low: 2,
  info: 3,
};

export const consoleReporter: Reporter = {
  render(findings: Finding[]): string {
    const ordered = [...findings].sort((left, right) =>
      severityOrder[left.severity] - severityOrder[right.severity] || left.id.localeCompare(right.id));
    const lines = [`mcp-wringer: ${ordered.length} finding${ordered.length === 1 ? "" : "s"}`];
    for (const finding of ordered) {
      lines.push(
        `${finding.severity.toUpperCase()} ${finding.ruleId} ${finding.id}`,
        `  ${finding.message}`,
        `  ${finding.cite}`,
        `  occurrences: ${finding.occurrences}`,
      );
    }
    return `${lines.join("\n")}\n`;
  },
};
