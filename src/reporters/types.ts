import type { Finding, JsonValue } from "../core/types.js";

export interface Reporter {
  readonly fileExtension?: string;
  render(findings: Finding[], options?: Record<string, JsonValue>): string;
}
