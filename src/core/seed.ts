import { createHash, randomBytes } from "node:crypto";
import { ScenarioError } from "./errors.js";

export function createRootSeed(value?: string | number): number {
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value) || value < 0 || value > 0xffff_ffff) {
      throw new ScenarioError("Seed must be an unsigned 32-bit integer.");
    }
    return value;
  }
  if (value !== undefined) {
    if (!/^(?:0|[1-9]\d*)$/.test(value)) {
      throw new ScenarioError("Seed must be an unsigned 32-bit integer.");
    }
    const parsed = Number(value);
    if (!Number.isSafeInteger(parsed) || parsed > 0xffff_ffff) {
      throw new ScenarioError("Seed must be an unsigned 32-bit integer.");
    }
    return parsed;
  }
  return randomBytes(4).readUInt32LE(0);
}

export function deriveSeed(rootSeed: number, ...labels: string[]): number {
  const digest = createHash("sha256")
    .update(String(rootSeed))
    .update("\0")
    .update(labels.join("\0"))
    .digest();
  return digest.readUInt32LE(0) & 0x7fff_ffff;
}
