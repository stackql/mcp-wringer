import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { CoverageError } from "../core/errors.js";
import type { CoverageProvider } from "./types.js";

interface V8CoverageDocument {
  result: Array<{
    url?: string;
    functions?: Array<{
      ranges?: Array<{
        startOffset?: number;
        endOffset?: number;
        count?: number;
      }>;
    }>;
  }>;
}

export const nodeV8CoverageProvider: CoverageProvider = {
  environmentVariable: "NODE_V8_COVERAGE",
  async collect(directory) {
    const files = (await readdir(directory)).filter((name) => name.endsWith(".json")).sort();
    if (files.length === 0) {
      throw new CoverageError("Node V8 coverage produced no JSON files; ensure the target is a Node process.");
    }
    const covered = new Set<string>();
    for (const name of files) {
      const path = join(directory, name);
      let document: V8CoverageDocument;
      try {
        const value: unknown = JSON.parse(await readFile(path, "utf8")) as unknown;
        if (!isCoverageDocument(value)) {
          throw new Error("Expected a V8 coverage document with a result array.");
        }
        document = value;
      } catch (error) {
        throw new CoverageError(
          `Could not parse Node V8 coverage file '${path}': ${error instanceof Error ? error.message : String(error)}`,
          { cause: error },
        );
      }
      for (const script of document.result) {
        if (script.url === undefined) {
          continue;
        }
        for (const fn of script.functions ?? []) {
          for (const range of fn.ranges ?? []) {
            if (range.count !== undefined && range.count > 0
              && range.startOffset !== undefined && range.endOffset !== undefined) {
              covered.add(`${script.url}:${range.startOffset}-${range.endOffset}`);
            }
          }
        }
      }
    }
    return covered;
  },
};

function isCoverageDocument(value: unknown): value is V8CoverageDocument {
  return isRecord(value) && Array.isArray(value.result)
    && value.result.every((script) => isRecord(script)
      && (script.url === undefined || typeof script.url === "string")
      && (script.functions === undefined || (Array.isArray(script.functions)
        && script.functions.every((fn) => isRecord(fn)
          && (fn.ranges === undefined || (Array.isArray(fn.ranges)
          && fn.ranges.every((range) => isRecord(range)
            && isOptionalNonnegativeInteger(range.startOffset)
            && isOptionalNonnegativeInteger(range.endOffset)
            && isOptionalNonnegativeInteger(range.count))))))));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isOptionalNonnegativeInteger(value: unknown): boolean {
  return value === undefined || (typeof value === "number" && Number.isSafeInteger(value) && value >= 0);
}
