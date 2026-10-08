import type { Finding } from "../core/types.js";
import type { Reporter } from "./types.js";

export const junitReporter: Reporter = {
  fileExtension: "xml",
  render(findings: Finding[]): string {
    const ordered = [...findings].sort((left, right) => left.id.localeCompare(right.id));
    const testCases = ordered.map((finding) =>
      `    <testcase classname="${escapeXml(finding.ruleId)}" name="${escapeXml(finding.id)}">`
      + `<failure type="${escapeXml(finding.severity)}" message="${escapeXml(finding.title)}">`
      + `${escapeXml(finding.message)} [${escapeXml(finding.cite)}]</failure></testcase>`,
    );
    return [
      '<?xml version="1.0" encoding="UTF-8"?>',
      `<testsuites tests="${ordered.length}" failures="${ordered.length}" errors="0" skipped="0">`,
      `  <testsuite name="mcp-wringer" tests="${ordered.length}" failures="${ordered.length}" errors="0" skipped="0">`,
      ...testCases,
      "  </testsuite>",
      "</testsuites>",
      "",
    ].join("\n");
  },
};

function escapeXml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;").replaceAll("'", "&apos;");
}
