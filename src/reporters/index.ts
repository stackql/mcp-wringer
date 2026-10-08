import { consoleReporter } from "./console.js";
import { jsonReporter } from "./json.js";
import { reporterRegistry } from "./registry.js";
import type { Finding } from "../core/types.js";

reporterRegistry.register("console", consoleReporter);
reporterRegistry.register("json", jsonReporter);

export { reporterRegistry };

export function renderReport(format: "console" | "json", findings: Finding[]): string {
  return reporterRegistry.get(format).render(findings);
}
