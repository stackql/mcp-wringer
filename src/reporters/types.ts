import type { Finding } from "../core/types.js";

export interface Reporter {
  render(findings: Finding[]): string;
}
