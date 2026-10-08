import { Ajv2020 } from "ajv/dist/2020.js";
import type { AnySchemaObject, ValidateFunction } from "ajv";
import legacySchema from "../../spec/2025-11-25/schema.json" with { type: "json" };
import statelessSchema from "../../spec/2026-07-28/schema.json" with { type: "json" };
import type { SpecRevision } from "../core/types.js";

const schemaIds: Record<SpecRevision, string> = {
  "2025-11-25": "https://mcp-wringer.invalid/spec/2025-11-25",
  "2026-07-28": "https://mcp-wringer.invalid/spec/2026-07-28",
};
const schemas: Record<SpecRevision, AnySchemaObject> = {
  "2025-11-25": legacySchema as AnySchemaObject,
  "2026-07-28": statelessSchema as AnySchemaObject,
};
const ajv = new Ajv2020({ allErrors: true, strict: false, validateFormats: false });
const validators = new Map<string, ValidateFunction>();

for (const revision of Object.keys(schemaIds) as SpecRevision[]) {
  const schema = schemas[revision];
  const schemaId = schemaIds[revision];
  ajv.addSchema({ ...schema, $id: schemaId }, schemaId);
}

export function validateAgainstSchema(
  revision: SpecRevision,
  definition: string,
  value: unknown,
): { valid: boolean; errors: string[] } {
  const key = `${revision}:${definition}`;
  let validator = validators.get(key);
  if (validator === undefined) {
    const compiled = ajv.compile({
      $ref: `${schemaIds[revision]}#/$defs/${definition}`,
    });
    validators.set(key, compiled);
    validator = compiled;
  }
  const valid = validator(value);
  return {
    valid,
    errors: valid
      ? []
      : (validator.errors ?? []).map((error) => `${error.instancePath || "/"} ${error.message ?? "is invalid"}`),
  };
}
