import { consoleReporter } from "./console.js";
import { jsonReporter } from "./json.js";
import { junitReporter } from "./junit.js";
import { markdownReporter } from "./markdown.js";
import { reporterRegistry } from "./registry.js";
import { sarifReporter } from "./sarif.js";
import type { Finding, JsonValue } from "../core/types.js";

reporterRegistry.register("console", consoleReporter);
reporterRegistry.register("json", jsonReporter);
reporterRegistry.register("junit", junitReporter);
reporterRegistry.register("markdown", markdownReporter);
reporterRegistry.register("sarif", sarifReporter);

export { reporterRegistry };

export function renderReport(
  format: string,
  findings: Finding[],
  options?: Record<string, JsonValue>,
): string {
  return reporterRegistry.get(format).render(findings, options);
}
