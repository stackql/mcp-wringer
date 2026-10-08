import type { FindingSeverity, SpecRevision } from "../core/types.js";
import legacyData from "../../spec/2025-11-25/rules.json" with { type: "json" };
import statelessData from "../../spec/2026-07-28/rules.json" with { type: "json" };

export interface OracleRuleDefinition {
  id: string;
  severity: FindingSeverity;
  title: string;
  cite: string;
}

export interface SpecRules {
  revision: SpecRevision;
  errorCodes: {
    parseError: number;
    invalidRequest: number;
    methodNotFound: number;
    invalidParams: number;
    internalError: number;
  };
  responseSchemas: Record<string, string>;
  rules: Record<string, OracleRuleDefinition>;
}

export const specRules: Record<SpecRevision, SpecRules> = {
  "2025-11-25": loadRules(legacyData, "2025-11-25"),
  "2026-07-28": loadRules(statelessData, "2026-07-28"),
};

function loadRules(value: unknown, revision: SpecRevision): SpecRules {
  if (!isRecord(value) || value.revision !== revision || !isRecord(value.errorCodes)
    || !isRecord(value.responseSchemas) || !Array.isArray(value.rules)) {
    throw new Error(`Invalid rules data for spec revision ${revision}.`);
  }
  const errorCodes = value.errorCodes;
  const codeValues = {
    parseError: readCode(errorCodes.parseError, "parseError", revision),
    invalidRequest: readCode(errorCodes.invalidRequest, "invalidRequest", revision),
    methodNotFound: readCode(errorCodes.methodNotFound, "methodNotFound", revision),
    invalidParams: readCode(errorCodes.invalidParams, "invalidParams", revision),
    internalError: readCode(errorCodes.internalError, "internalError", revision),
  };
  const responseSchemas: Record<string, string> = {};
  for (const [method, schema] of Object.entries(value.responseSchemas)) {
    if (typeof schema !== "string" || schema.length === 0) {
      throw new Error(`Rules for ${revision} have an invalid response schema for ${method}.`);
    }
    responseSchemas[method] = schema;
  }
  const rules: Record<string, OracleRuleDefinition> = {};
  for (const item of value.rules) {
    if (!isRecord(item) || typeof item.id !== "string" || typeof item.title !== "string"
      || typeof item.cite !== "string" || item.cite.length === 0 || !isSeverity(item.severity)) {
      throw new Error(`Rules for ${revision} contain an incomplete oracle rule.`);
    }
    if (rules[item.id] !== undefined) {
      throw new Error(`Rules for ${revision} contain duplicate rule '${item.id}'.`);
    }
    rules[item.id] = {
      id: item.id,
      severity: item.severity,
      title: item.title,
      cite: item.cite,
    };
  }
  return {
    revision,
    errorCodes: {
      parseError: codeValues.parseError,
      invalidRequest: codeValues.invalidRequest,
      methodNotFound: codeValues.methodNotFound,
      invalidParams: codeValues.invalidParams,
      internalError: codeValues.internalError,
    },
    responseSchemas,
    rules,
  };
}

function readCode(value: unknown, key: string, revision: SpecRevision): number {
  if (typeof value !== "number" || !Number.isInteger(value)) {
    throw new Error(`Rules for ${revision} have an invalid JSON-RPC error code for ${key}.`);
  }
  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isSeverity(value: unknown): value is FindingSeverity {
  return value === "high" || value === "medium" || value === "low" || value === "info";
}
