import type { Finding } from "../core/types.js";
import type { Reporter } from "./types.js";

export const jsonReporter: Reporter = {
  render(findings: Finding[]): string {
    const ordered = [...findings].sort((left, right) => left.id.localeCompare(right.id));
    return `${JSON.stringify({ formatVersion: 1, findings: ordered }, null, 2)}\n`;
  },
};
