import { ExtensionRegistry } from "../core/registry.js";
import { deriveSeed } from "../core/seed.js";
import type { JsonValue } from "../core/types.js";
import { ScenarioError } from "../core/errors.js";
import * as fc from "fast-check";
import type { ArgumentStrategy, ArgumentStrategySelection } from "./types.js";

export const argumentStrategyRegistry = new ExtensionRegistry<ArgumentStrategy>();

const genericStrategy: ArgumentStrategy = {
  matches() {
    return true;
  },
  generate(context) {
    return generateSchemaValue(context.schema, context.seed, 0);
  },
};

argumentStrategyRegistry.register("generic-json-schema", genericStrategy);

export function generateToolArguments(
  toolName: string,
  schemaValue: JsonValue | undefined,
  seed: number,
  selections?: readonly ArgumentStrategySelection[],
): JsonValue {
  const schema: Record<string, unknown> = isRecord(schemaValue)
    ? schemaValue
    : { type: "object", properties: {} };
  if (schema.type !== "object") {
    throw new ScenarioError(`Tool '${toolName}' input schema must describe an object.`);
  }
  const properties = isRecord(schema.properties) ? schema.properties : {};
  const candidates = selections === undefined
    ? argumentStrategyRegistry.names().map((name) => ({
      name,
      enabled: true,
      options: {},
    }))
    : selections.filter((selection) => selection.enabled);
  const args: Record<string, JsonValue> = {};
  for (const key of Object.keys(properties).sort()) {
    const propertySchema = properties[key];
    if (!isRecord(propertySchema)) {
      continue;
    }
    args[key] = generatePropertyValue(toolName, key, propertySchema, seed, candidates);
  }
  const required = Array.isArray(schema.required)
    ? schema.required.filter((key): key is string => typeof key === "string")
    : [];
  for (const key of required) {
    if (!(key in args)) {
      const propertySchema = properties[key];
      if (!isRecord(propertySchema)) {
        throw new ScenarioError(`Required argument '${key}' for tool '${toolName}' has no usable schema.`);
      }
      args[key] = generatePropertyValue(toolName, key, propertySchema, seed, candidates);
    }
  }
  return args;
}

function generatePropertyValue(
  toolName: string,
  key: string,
  schema: Record<string, unknown>,
  seed: number,
  selections: readonly ArgumentStrategySelection[],
): JsonValue {
  const path = `/properties/${escapePointer(key)}`;
  for (const selection of selections) {
    const strategy = argumentStrategyRegistry.get(selection.name);
    const context = {
      toolName,
      path,
      schema,
      options: selection.options,
    };
    if (strategy.matches(context)) {
      return ensureJsonValue(strategy.generate({
        ...context,
        seed: deriveSeed(seed, toolName, path),
      }));
    }
  }
  throw new ScenarioError(`No argument strategy matched '${toolName}${path}'.`);
}

function generateSchemaValue(schema: Record<string, unknown>, seed: number, depth: number): JsonValue {
  if (depth > 8) {
    return ensureJsonValue(fc.sample(fc.jsonValue({ maxDepth: 2 }), { seed, numRuns: 1 })[0] ?? null);
  }
  if (Array.isArray(schema.enum) && schema.enum.length > 0) {
    const choices = schema.enum.filter(isJsonValue);
    return sample(fc.constantFrom(...choices), seed);
  }
  if ("const" in schema && isJsonValue(schema.const)) {
    return schema.const;
  }
  for (const keyword of ["anyOf", "oneOf"] as const) {
    const alternatives = schema[keyword];
    if (Array.isArray(alternatives) && alternatives.some(isRecord)) {
      const alternativesForSchema = alternatives.filter(isRecord);
      const selected = sample(fc.integer({ min: 0, max: alternativesForSchema.length - 1 }), seed);
      return generateSchemaValue(alternativesForSchema[selected] ?? {}, deriveSeed(seed, keyword), depth + 1);
    }
  }
  const types = typeof schema.type === "string"
    ? [schema.type]
    : Array.isArray(schema.type)
      ? schema.type.filter((value): value is string => typeof value === "string")
      : ["object"];
  const selectedType = sample(fc.constantFrom(...types), seed);
  switch (selectedType) {
    case "object":
      return generateObject(schema, seed, depth);
    case "array":
      return generateArray(schema, seed, depth);
    case "string":
      return generateString(schema, seed);
    case "integer":
      return generateNumber(schema, seed, true);
    case "number":
      return generateNumber(schema, seed, false);
    case "boolean":
      return sample(fc.boolean(), seed);
    case "null":
      return null;
    default:
      return ensureJsonValue(fc.sample(fc.jsonValue({ maxDepth: 3 }), { seed, numRuns: 1 })[0] ?? null);
  }
}

function generateObject(schema: Record<string, unknown>, seed: number, depth: number): JsonValue {
  const properties = isRecord(schema.properties) ? schema.properties : {};
  const required = new Set(Array.isArray(schema.required)
    ? schema.required.filter((key): key is string => typeof key === "string")
    : []);
  const value: Record<string, JsonValue> = {};
  for (const key of Object.keys(properties).sort()) {
    const propertySchema = properties[key];
    if (!isRecord(propertySchema)) {
      continue;
    }
    if (required.has(key) || sample(fc.boolean(), deriveSeed(seed, "include", key))) {
      value[key] = generateSchemaValue(propertySchema, deriveSeed(seed, "property", key), depth + 1);
    }
  }
  return value;
}

function generateArray(schema: Record<string, unknown>, seed: number, depth: number): JsonValue {
  const min = integerValue(schema.minItems, 0, 0, 4);
  const max = integerValue(schema.maxItems, Math.max(1, min), min, 4);
  const length = sample(fc.integer({ min, max }), seed);
  const itemSchema = isRecord(schema.items) ? schema.items : {};
  return Array.from({ length }, (_, index) =>
    generateSchemaValue(itemSchema, deriveSeed(seed, "item", String(index)), depth + 1));
}

function generateString(schema: Record<string, unknown>, seed: number): string {
  const minLength = integerValue(schema.minLength, 0, 0, 32);
  const maxLength = integerValue(schema.maxLength, Math.max(minLength, 16), minLength, 64);
  const pattern = typeof schema.pattern === "string" ? new RegExp(schema.pattern) : undefined;
  let arbitrary = fc.string({ minLength, maxLength });
  if (pattern !== undefined) {
    arbitrary = arbitrary.filter((value) => pattern.test(value));
  }
  return sample(arbitrary, seed);
}

function generateNumber(schema: Record<string, unknown>, seed: number, integer: boolean): number {
  const minimum = finiteNumber(schema.minimum) ?? finiteNumber(schema.exclusiveMinimum) ?? -100;
  const maximum = finiteNumber(schema.maximum) ?? finiteNumber(schema.exclusiveMaximum) ?? 100;
  if (minimum > maximum) {
    throw new ScenarioError("Cannot generate a number from an inverted JSON Schema range.");
  }
  if (integer) {
    const min = Math.ceil(minimum);
    const max = Math.floor(maximum);
    if (min > max) {
      throw new ScenarioError("Cannot generate an integer from the JSON Schema range.");
    }
    return sample(fc.integer({ min, max }), seed);
  }
  return sample(fc.double({ min: minimum, max: maximum, noNaN: true }), seed);
}

function sample<T>(arbitrary: fc.Arbitrary<T>, seed: number): T {
  const value = fc.sample(arbitrary, { seed, numRuns: 1 })[0];
  if (value === undefined) {
    throw new ScenarioError("JSON Schema argument strategy could not produce a value.");
  }
  return value;
}

function ensureJsonValue(value: unknown): JsonValue {
  if (!isJsonValue(value)) {
    throw new ScenarioError("Argument strategy returned a value that is not JSON-serializable.");
  }
  return value;
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
  return isRecord(value) && Object.values(value).every(isJsonValue);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function finiteNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function integerValue(value: unknown, fallback: number, min: number, max: number): number {
  return typeof value === "number" && Number.isInteger(value)
    ? Math.min(max, Math.max(min, value))
    : fallback;
}

function escapePointer(value: string): string {
  return value.replaceAll("~", "~0").replaceAll("/", "~1");
}
