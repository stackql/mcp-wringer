import type { Finding } from "../core/types.js";
import type { Reporter } from "./types.js";

export const markdownReporter: Reporter = {
  fileExtension: "md",
  render(findings: Finding[]): string {
    const rows = [...findings]
      .sort((left, right) => left.id.localeCompare(right.id))
      .map((finding) =>
        `| ${escapeCell(finding.severity)} | ${escapeCell(finding.ruleId)} | ${escapeCell(finding.title)} `
        + `| ${escapeCell(finding.message)} | ${escapeCell(finding.cite)} |`,
      );
    return [
      "# MCP Wringer findings",
      "",
      `Confirmed findings: ${findings.length}`,
      "",
      "| Severity | Rule | Title | Finding | Specification citation |",
      "|---|---|---|---|---|",
      ...rows,
      "",
    ].join("\n");
  },
};

function escapeCell(value: string): string {
  return value.replaceAll("|", "\\|").replaceAll("\r", " ").replaceAll("\n", " ");
}
