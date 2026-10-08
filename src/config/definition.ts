const severitySchema = {
  type: "string",
  enum: ["high", "medium", "low", "info"],
} as const;

const optionsSchema = {
  type: "object",
  additionalProperties: true,
} as const;

const extensionSelection = {
  type: "object",
  additionalProperties: false,
  properties: {
    name: { type: "string", minLength: 1 },
    enabled: { type: "boolean", default: true },
    options: { ...optionsSchema, default: {} },
  },
  required: ["name", "enabled", "options"],
} as const;

const generatorSelection = {
  ...extensionSelection,
  properties: {
    ...extensionSelection.properties,
    weight: { type: "integer", minimum: 1, default: 1 },
  },
  required: [...extensionSelection.required, "weight"],
} as const;

const oracleSelection = {
  ...extensionSelection,
  properties: {
    ...extensionSelection.properties,
    severityOverrides: {
      type: "object",
      additionalProperties: severitySchema,
      default: {},
    },
  },
  required: [...extensionSelection.required, "severityOverrides"],
} as const;

const commonProperties = {
  specRevision: {
    type: "string",
    enum: ["2025-11-25", "2026-07-28"],
    default: "2025-11-25",
    description: "MCP specification revision used for lifecycle and response validation.",
  },
  seed: {
    oneOf: [{ type: "integer" }, { type: "string" }],
    description: "Root seed. Omit to generate a seed at run time.",
  },
  cases: {
    type: "integer",
    minimum: 1,
    default: 18,
    description: "Maximum scenarios to execute.",
  },
  durationMs: {
    type: "integer",
    minimum: 1,
    default: 30_000,
    description: "Maximum run duration in milliseconds.",
  },
  workers: {
    type: "integer",
    minimum: 1,
    maximum: 32,
    default: 1,
    description: "Number of independent target workers.",
  },
  restartPolicy: {
    type: "string",
    enum: ["per-case", "on-failure", "never"],
    default: "per-case",
    description: "When to restart a spawned target between scenarios.",
  },
  timeoutMs: {
    type: "integer",
    minimum: 1,
    default: 5_000,
    description: "Default per-request and target startup timeout in milliseconds.",
  },
  confirmations: {
    type: "integer",
    minimum: 1,
    maximum: 5,
    default: 2,
    description: "Fresh-target replays required to confirm a finding.",
  },
  transport: {
    type: "string",
    enum: ["stdio", "streamable-http"],
    default: "stdio",
    description: "Transport used to communicate with the target.",
  },
  url: {
    type: "string",
    pattern: "^https?://",
    description: "Streamable HTTP endpoint. Non-loopback attach requires explicit authorization.",
  },
  command: {
    type: "string",
    minLength: 1,
    description: "Executable used to start a spawned target.",
  },
  args: {
    type: "array",
    items: { type: "string" },
    default: [],
    description: "Argument array for the spawned target command.",
  },
  env: {
    type: "object",
    additionalProperties: { type: "string" },
    default: {},
    description: "Environment variables passed to the spawned target.",
  },
  inheritEnvironment: {
    type: "boolean",
    default: false,
    description: "Pass the caller's environment to the target in addition to configured values.",
  },
  allowNonLoopback: {
    type: "boolean",
    default: false,
    description: "Authorize attach mode to connect to a non-loopback HTTP address.",
  },
  allowTools: {
    type: "array",
    items: { type: "string", minLength: 1 },
    uniqueItems: true,
    default: [],
    description: "Exact tool names permitted when they are not annotated read-only.",
  },
  argumentStrategies: {
    type: "array",
    items: extensionSelection,
    default: [],
    description: "Argument strategy registry selections. Empty enables all registered strategies.",
  },
  failOn: {
    ...severitySchema,
    default: "high",
    description: "Lowest finding severity that makes the CLI exit with code 1.",
  },
  reportDirectory: {
    type: "string",
    minLength: 1,
    default: ".mcp-wringer/reports",
    description: "Directory for run reports and reproducer files.",
  },
  corpusDirectory: {
    type: "string",
    minLength: 1,
    default: ".mcp-wringer/corpus",
    description: "Directory for response-novelty corpus entries.",
  },
  baselinePath: {
    type: "string",
    minLength: 1,
    description: "JSON file containing finding IDs to use as the baseline.",
  },
  plugins: {
    type: "array",
    items: { type: "string", minLength: 1 },
    uniqueItems: true,
    default: [],
    description: "Explicit plugin module paths or package specifiers to load.",
  },
  generators: {
    type: "array",
    items: generatorSelection,
    default: [],
    description: "Generator registry selections. Empty uses the built-in default schedule.",
  },
  oracles: {
    type: "array",
    items: oracleSelection,
    default: [],
    description: "Oracle registry selections. Empty enables every registered oracle.",
  },
  reporters: {
    type: "array",
    items: extensionSelection,
    default: [
      { name: "console", enabled: true, options: {} },
      { name: "json", enabled: true, options: {} },
    ],
    description: "Report formats selected by registry name.",
  },
} as const;

export const configDefinition = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "https://raw.githubusercontent.com/stackql/mcp-wringer/main/config.schema.json",
  title: "MCP Wringer configuration",
  type: "object",
  additionalProperties: false,
  properties: {
    $schema: {
      type: "string",
      default: "https://raw.githubusercontent.com/stackql/mcp-wringer/main/config.schema.json",
      description: "JSON Schema used by editors to validate this file.",
    },
    profile: {
      type: "string",
      minLength: 1,
      default: "quick",
      description: "Named partial configuration profile.",
    },
    profiles: {
      type: "object",
      default: {},
      additionalProperties: { $ref: "#/$defs/profile" },
      description: "User-defined named partial configuration profiles.",
    },
    ...commonProperties,
  },
  required: [
    "$schema",
    "profile",
    "profiles",
    "specRevision",
    "cases",
    "durationMs",
    "workers",
    "restartPolicy",
    "timeoutMs",
    "confirmations",
    "transport",
    "args",
    "env",
    "inheritEnvironment",
    "allowNonLoopback",
    "allowTools",
    "argumentStrategies",
    "failOn",
    "reportDirectory",
    "corpusDirectory",
    "plugins",
    "generators",
    "oracles",
    "reporters",
  ],
  $defs: {
    profile: {
      type: "object",
      additionalProperties: false,
      properties: commonProperties,
    },
  },
} as const;

type Infer<S> =
  S extends { oneOf: readonly (infer Alternatives)[] } ? Infer<Alternatives>
    : S extends { enum: readonly (infer Value)[] } ? Value
      : S extends { const: infer Value } ? Value
        : S extends {
          type: "object";
          properties: infer Properties extends Record<string, unknown>;
          required: readonly (infer Required)[];
        }
          ? { [Key in Extract<Required, keyof Properties>]: Infer<Properties[Key]> }
            & { [Key in Exclude<keyof Properties, Required>]?: Infer<Properties[Key]> }
          : S extends { type: "object"; properties: infer Properties extends Record<string, unknown> }
            ? { [Key in keyof Properties]?: Infer<Properties[Key]> }
            : S extends { type: "object"; additionalProperties: infer Additional }
              ? Record<string, Additional extends true ? import("../core/types.js").JsonValue : Infer<Additional>>
              : S extends { type: "array"; items: infer Item } ? Infer<Item>[]
                : S extends { type: "integer" | "number" } ? number
                  : S extends { type: "boolean" } ? boolean
                    : S extends { type: "string" } ? string
                      : never;

type RawConfig = Infer<typeof configDefinition>;

export type ProfileConfig = Partial<Omit<RawConfig, "$schema" | "profile" | "profiles">>;

export type ResolvedConfig = Omit<RawConfig, "profiles"> & {
  profiles: Record<string, ProfileConfig>;
};

export type ConfigOverrides = Partial<ResolvedConfig>;
