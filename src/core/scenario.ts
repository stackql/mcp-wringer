import { ScenarioError } from "./errors.js";
import type { JsonValue, Reproducer, Scenario, ScenarioStep, SpecRevision } from "./types.js";

const BASE64_PATTERN = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;

export function validateScenario(value: unknown): asserts value is Scenario {
  if (!isRecord(value) || value.formatVersion !== 1 || typeof value.id !== "string") {
    throw new ScenarioError("Scenario must have formatVersion 1 and a string id.");
  }
  assertOnlyKeys(value, ["formatVersion", "id", "specRevision", "description", "steps"], "Scenario");
  if (value.id.length === 0 || (value.description !== undefined && typeof value.description !== "string")) {
    throw new ScenarioError("Scenario id must not be empty and description must be a string when present.");
  }
  if (!isSpecRevision(value.specRevision)) {
    throw new ScenarioError("Scenario has an unsupported specRevision.");
  }
  if (!Array.isArray(value.steps)) {
    throw new ScenarioError("Scenario steps must be an array.");
  }

  value.steps.forEach((step, index) => validateStep(step, index));
}

export function validateReproducer(value: unknown): asserts value is Reproducer {
  if (!isRecord(value) || value.formatVersion !== 1 || !isSpecRevision(value.specRevision)) {
    throw new ScenarioError("Reproducer must have formatVersion 1 and a supported specRevision.");
  }
  assertOnlyKeys(value, ["formatVersion", "specRevision", "target", "scenario"], "Reproducer");
  if (!isRecord(value.target) || typeof value.target.command !== "string" || value.target.command.length === 0
    || !Array.isArray(value.target.args)
    || !value.target.args.every((arg) => typeof arg === "string")
    || !Array.isArray(value.target.environmentNames)
    || !value.target.environmentNames.every((name) => typeof name === "string")
    || new Set(value.target.environmentNames).size !== value.target.environmentNames.length) {
    throw new ScenarioError("Reproducer target must contain command, args, and environmentNames.");
  }
  assertOnlyKeys(value.target, ["command", "args", "environmentNames"], "Reproducer target");
  validateScenario(value.scenario);
  if (value.scenario.specRevision !== value.specRevision) {
    throw new ScenarioError("Reproducer and scenario specRevision values must match.");
  }
}

export function parseJsonValue(text: string): JsonValue {
  try {
    return JSON.parse(text) as JsonValue;
  } catch (error) {
    throw new ScenarioError(`Invalid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function validateStep(value: unknown, index: number): asserts value is ScenarioStep {
  if (!isRecord(value) || typeof value.type !== "string") {
    throw new ScenarioError(`Scenario step ${index} must be an object with a type.`);
  }

  switch (value.type) {
    case "send":
      assertOnlyKeys(value, ["type", "message", "wire"], `Scenario step ${index}`);
      if (!("message" in value) || !isJsonValue(value.message)) {
        throw new ScenarioError(`Scenario step ${index} must contain a JSON message.`);
      }
      validateWire(value.wire, index);
      return;
    case "send-raw":
      assertOnlyKeys(value, ["type", "bytesBase64", "wire"], `Scenario step ${index}`);
      if (typeof value.bytesBase64 !== "string" || !BASE64_PATTERN.test(value.bytesBase64)) {
        throw new ScenarioError(`Scenario step ${index} has invalid base64 bytes.`);
      }
      validateWire(value.wire, index);
      return;
    case "await-response":
      assertOnlyKeys(value, ["type", "id", "timeoutMs"], `Scenario step ${index}`);
      if (value.id !== undefined && typeof value.id !== "string" && typeof value.id !== "number") {
        throw new ScenarioError(`Scenario step ${index} has an invalid response id.`);
      }
      if (value.timeoutMs !== undefined && !isPositiveNumber(value.timeoutMs)) {
        throw new ScenarioError(`Scenario step ${index} timeoutMs must be positive.`);
      }
      return;
    case "transport":
      assertOnlyKeys(value, ["type", "operation"], `Scenario step ${index}`);
      if (value.operation !== "close-stdin") {
        throw new ScenarioError(`Scenario step ${index} has an unsupported transport operation.`);
      }
      return;
    case "delay":
      assertOnlyKeys(value, ["type", "durationMs"], `Scenario step ${index}`);
      if (!isPositiveNumber(value.durationMs)) {
        throw new ScenarioError(`Scenario step ${index} durationMs must be positive.`);
      }
      return;
    default:
      throw new ScenarioError(`Scenario step ${index} has unknown type '${value.type}'.`);
  }
}

function validateWire(value: unknown, index: number): void {
  if (value === undefined) {
    return;
  }
  if (!isRecord(value) || (value.transport !== "stdio" && value.transport !== "streamable-http")) {
    throw new ScenarioError(`Scenario step ${index} has an invalid wire descriptor.`);
  }
  if (value.transport === "stdio") {
    assertOnlyKeys(value, ["transport", "chunks", "delayMs"], `Scenario step ${index} wire descriptor`);
    if (value.chunks !== undefined && (!Array.isArray(value.chunks)
      || !value.chunks.every((chunk) => Number.isInteger(chunk) && chunk > 0))) {
      throw new ScenarioError(`Scenario step ${index} stdio chunks must be positive integers.`);
    }
    if (value.delayMs !== undefined
      && (typeof value.delayMs !== "number" || !Number.isFinite(value.delayMs) || value.delayMs < 0)) {
      throw new ScenarioError(`Scenario step ${index} stdio delayMs must not be negative.`);
    }
    return;
  }
  assertOnlyKeys(value, ["transport", "fault", "options"], `Scenario step ${index} wire descriptor`);
  if (typeof value.fault !== "string" || value.fault.length === 0) {
    throw new ScenarioError(`Scenario step ${index} HTTP wire descriptors require a fault name.`);
  }
  if (value.options !== undefined && (!isRecord(value.options) || !isJsonValue(value.options))) {
    throw new ScenarioError(`Scenario step ${index} HTTP wire options must be a JSON object.`);
  }
}

function isSpecRevision(value: unknown): value is SpecRevision {
  return value === "2025-11-25" || value === "2026-07-28";
}

function isPositiveNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isJsonValue(value: unknown): value is JsonValue {
  if (value === null || typeof value === "string" || typeof value === "boolean") {
    return true;
  }
  if (typeof value === "number") {
    return Number.isFinite(value);
  }
  if (Array.isArray(value)) {
    return value.every(isJsonValue);
  }
  if (isRecord(value)) {
    return Object.values(value).every(isJsonValue);
  }
  return false;
}

function assertOnlyKeys(value: Record<string, unknown>, allowed: string[], label: string): void {
  const unexpected = Object.keys(value).filter((key) => !allowed.includes(key));
  if (unexpected.length > 0) {
    throw new ScenarioError(`${label} contains unsupported field(s): ${unexpected.join(", ")}.`);
  }
}
