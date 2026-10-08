import { createHash } from "node:crypto";
import { mkdir, open, readdir } from "node:fs/promises";
import { join } from "node:path";
import type { Scenario, Trace } from "./types.js";

export async function recordNovelScenario(
  directory: string,
  scenario: Scenario,
  trace: Trace,
  seed: number,
): Promise<boolean> {
  const signature = responseSignature(trace);
  await mkdir(directory, { recursive: true });
  const entries = await readdir(directory);
  if (entries.includes(`${signature}.scenario.json`)) {
    return false;
  }
  const path = join(directory, `${signature}.scenario.json`);
  let file: Awaited<ReturnType<typeof open>> | undefined;
  try {
    file = await open(path, "wx");
  } catch (error) {
    if (isNodeError(error) && error.code === "EEXIST") {
      return false;
    }
    throw error;
  }
  try {
    await file.writeFile(`${JSON.stringify({ seed, scenario }, null, 2)}\n`, "utf8");
  } finally {
    await file.close();
  }
  return true;
}

export function responseSignature(trace: Trace): string {
  const bytes = Buffer.concat(trace.events
    .filter((event) => event.channel === "stdout")
    .map((event) => event.encoding === "base64" ? Buffer.from(event.data, "base64") : Buffer.from(event.data)));
  const responses: unknown[] = [];
  for (const line of bytes.toString("utf8").split("\n")) {
    if (line.length === 0) {
      continue;
    }
    try {
      const message: unknown = JSON.parse(line);
      if (!isRecord(message) || (!("result" in message) && !("error" in message))) {
        continue;
      }
      const withoutId = Object.fromEntries(Object.entries(message).filter(([key]) => key !== "id"));
      responses.push(sortJson(withoutId));
    } catch {
      responses.push({ malformed: createHash("sha256").update(line).digest("hex") });
    }
  }
  return createHash("sha256").update(JSON.stringify(responses)).digest("hex");
}

function sortJson(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortJson);
  }
  if (!isRecord(value)) {
    return value;
  }
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, sortJson(value[key])]));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}
