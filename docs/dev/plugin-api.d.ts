import { J as JsonValue, S as ScenarioGenerator, A as ArgumentStrategy, O as Oracle, R as Reporter } from '../types-H02eG7bl.js';
export { a as ArgumentStrategyContext, b as ArgumentStrategySelection, F as Finding, c as FindingDraft, G as GeneratorContext, d as OracleContext, e as Scenario, f as ScenarioStep, g as SpecRevision, T as TraceEvent } from '../types-H02eG7bl.js';

declare const configDefinition: {
    readonly $schema: "https://json-schema.org/draft/2020-12/schema";
    readonly $id: "https://raw.githubusercontent.com/stackql/mcp-wringer/main/config.schema.json";
    readonly title: "MCP Wringer configuration";
    readonly type: "object";
    readonly additionalProperties: false;
    readonly properties: {
        readonly specRevision: {
            readonly type: "string";
            readonly enum: readonly ["2025-11-25", "2026-07-28"];
            readonly default: "2025-11-25";
            readonly description: "MCP specification revision used for lifecycle and response validation.";
        };
        readonly seed: {
            readonly oneOf: readonly [{
                readonly type: "integer";
            }, {
                readonly type: "string";
            }];
            readonly description: "Root seed. Omit to generate a seed at run time.";
        };
        readonly cases: {
            readonly type: "integer";
            readonly minimum: 1;
            readonly default: 18;
            readonly description: "Maximum scenarios to execute.";
        };
        readonly durationMs: {
            readonly type: "integer";
            readonly minimum: 1;
            readonly default: 30000;
            readonly description: "Maximum run duration in milliseconds.";
        };
        readonly workers: {
            readonly type: "integer";
            readonly minimum: 1;
            readonly maximum: 32;
            readonly default: 1;
            readonly description: "Number of independent target workers.";
        };
        readonly restartPolicy: {
            readonly type: "string";
            readonly enum: readonly ["per-case", "on-failure", "never"];
            readonly default: "per-case";
            readonly description: "When to restart a spawned target between scenarios.";
        };
        readonly timeoutMs: {
            readonly type: "integer";
            readonly minimum: 1;
            readonly default: 5000;
            readonly description: "Default per-request and target startup timeout in milliseconds.";
        };
        readonly confirmations: {
            readonly type: "integer";
            readonly minimum: 1;
            readonly maximum: 5;
            readonly default: 2;
            readonly description: "Fresh-target replays required to confirm a finding.";
        };
        readonly transport: {
            readonly type: "string";
            readonly enum: readonly ["stdio", "streamable-http"];
            readonly default: "stdio";
            readonly description: "Transport used to communicate with the target.";
        };
        readonly url: {
            readonly type: "string";
            readonly pattern: "^https?://";
            readonly description: "Streamable HTTP endpoint. Non-loopback attach requires explicit authorization.";
        };
        readonly command: {
            readonly type: "string";
            readonly minLength: 1;
            readonly description: "Executable used to start a spawned target.";
        };
        readonly args: {
            readonly type: "array";
            readonly items: {
                readonly type: "string";
            };
            readonly default: readonly [];
            readonly description: "Argument array for the spawned target command.";
        };
        readonly env: {
            readonly type: "object";
            readonly additionalProperties: {
                readonly type: "string";
            };
            readonly default: {};
            readonly description: "Environment variables passed to the spawned target.";
        };
        readonly inheritEnvironment: {
            readonly type: "boolean";
            readonly default: false;
            readonly description: "Pass the caller's environment to the target in addition to configured values.";
        };
        readonly allowNonLoopback: {
            readonly type: "boolean";
            readonly default: false;
            readonly description: "Authorize attach mode to connect to a non-loopback HTTP address.";
        };
        readonly allowTools: {
            readonly type: "array";
            readonly items: {
                readonly type: "string";
                readonly minLength: 1;
            };
            readonly uniqueItems: true;
            readonly default: readonly [];
            readonly description: "Exact tool names permitted when they are not annotated read-only.";
        };
        readonly argumentStrategies: {
            readonly type: "array";
            readonly items: {
                readonly type: "object";
                readonly additionalProperties: false;
                readonly properties: {
                    readonly name: {
                        readonly type: "string";
                        readonly minLength: 1;
                    };
                    readonly enabled: {
                        readonly type: "boolean";
                        readonly default: true;
                    };
                    readonly options: {
                        readonly default: {};
                        readonly type: "object";
                        readonly additionalProperties: true;
                    };
                };
                readonly required: readonly ["name", "enabled", "options"];
            };
            readonly default: readonly [];
            readonly description: "Argument strategy registry selections. Empty enables all registered strategies.";
        };
        readonly failOn: {
            readonly default: "high";
            readonly description: "Lowest finding severity that makes the CLI exit with code 1.";
            readonly type: "string";
            readonly enum: readonly ["high", "medium", "low", "info"];
        };
        readonly reportDirectory: {
            readonly type: "string";
            readonly minLength: 1;
            readonly default: ".mcp-wringer/reports";
            readonly description: "Directory for run reports and reproducer files.";
        };
        readonly corpusDirectory: {
            readonly type: "string";
            readonly minLength: 1;
            readonly default: ".mcp-wringer/corpus";
            readonly description: "Directory for response-novelty corpus entries.";
        };
        readonly baselinePath: {
            readonly type: "string";
            readonly minLength: 1;
            readonly description: "JSON file containing finding IDs to use as the baseline.";
        };
        readonly plugins: {
            readonly type: "array";
            readonly items: {
                readonly type: "string";
                readonly minLength: 1;
            };
            readonly uniqueItems: true;
            readonly default: readonly [];
            readonly description: "Explicit plugin module paths or package specifiers to load.";
        };
        readonly generators: {
            readonly type: "array";
            readonly items: {
                readonly properties: {
                    readonly weight: {
                        readonly type: "integer";
                        readonly minimum: 1;
                        readonly default: 1;
                    };
                    readonly name: {
                        readonly type: "string";
                        readonly minLength: 1;
                    };
                    readonly enabled: {
                        readonly type: "boolean";
                        readonly default: true;
                    };
                    readonly options: {
                        readonly default: {};
                        readonly type: "object";
                        readonly additionalProperties: true;
                    };
                };
                readonly required: readonly ["name", "enabled", "options", "weight"];
                readonly type: "object";
                readonly additionalProperties: false;
            };
            readonly default: readonly [];
            readonly description: "Generator registry selections. Empty uses the built-in default schedule.";
        };
        readonly oracles: {
            readonly type: "array";
            readonly items: {
                readonly properties: {
                    readonly severityOverrides: {
                        readonly type: "object";
                        readonly additionalProperties: {
                            readonly type: "string";
                            readonly enum: readonly ["high", "medium", "low", "info"];
                        };
                        readonly default: {};
                    };
                    readonly name: {
                        readonly type: "string";
                        readonly minLength: 1;
                    };
                    readonly enabled: {
                        readonly type: "boolean";
                        readonly default: true;
                    };
                    readonly options: {
                        readonly default: {};
                        readonly type: "object";
                        readonly additionalProperties: true;
                    };
                };
                readonly required: readonly ["name", "enabled", "options", "severityOverrides"];
                readonly type: "object";
                readonly additionalProperties: false;
            };
            readonly default: readonly [];
            readonly description: "Oracle registry selections. Empty enables every registered oracle.";
        };
        readonly reporters: {
            readonly type: "array";
            readonly items: {
                readonly type: "object";
                readonly additionalProperties: false;
                readonly properties: {
                    readonly name: {
                        readonly type: "string";
                        readonly minLength: 1;
                    };
                    readonly enabled: {
                        readonly type: "boolean";
                        readonly default: true;
                    };
                    readonly options: {
                        readonly default: {};
                        readonly type: "object";
                        readonly additionalProperties: true;
                    };
                };
                readonly required: readonly ["name", "enabled", "options"];
            };
            readonly default: readonly [{
                readonly name: "console";
                readonly enabled: true;
                readonly options: {};
            }, {
                readonly name: "json";
                readonly enabled: true;
                readonly options: {};
            }];
            readonly description: "Report formats selected by registry name.";
        };
        readonly $schema: {
            readonly type: "string";
            readonly default: "https://raw.githubusercontent.com/stackql/mcp-wringer/main/config.schema.json";
            readonly description: "JSON Schema used by editors to validate this file.";
        };
        readonly profile: {
            readonly type: "string";
            readonly minLength: 1;
            readonly default: "quick";
            readonly description: "Named partial configuration profile.";
        };
        readonly profiles: {
            readonly type: "object";
            readonly default: {};
            readonly additionalProperties: {
                readonly $ref: "#/$defs/profile";
            };
            readonly description: "User-defined named partial configuration profiles.";
        };
    };
    readonly required: readonly ["$schema", "profile", "profiles", "specRevision", "cases", "durationMs", "workers", "restartPolicy", "timeoutMs", "confirmations", "transport", "args", "env", "inheritEnvironment", "allowNonLoopback", "allowTools", "argumentStrategies", "failOn", "reportDirectory", "corpusDirectory", "plugins", "generators", "oracles", "reporters"];
    readonly $defs: {
        readonly profile: {
            readonly type: "object";
            readonly additionalProperties: false;
            readonly properties: {
                readonly specRevision: {
                    readonly type: "string";
                    readonly enum: readonly ["2025-11-25", "2026-07-28"];
                    readonly default: "2025-11-25";
                    readonly description: "MCP specification revision used for lifecycle and response validation.";
                };
                readonly seed: {
                    readonly oneOf: readonly [{
                        readonly type: "integer";
                    }, {
                        readonly type: "string";
                    }];
                    readonly description: "Root seed. Omit to generate a seed at run time.";
                };
                readonly cases: {
                    readonly type: "integer";
                    readonly minimum: 1;
                    readonly default: 18;
                    readonly description: "Maximum scenarios to execute.";
                };
                readonly durationMs: {
                    readonly type: "integer";
                    readonly minimum: 1;
                    readonly default: 30000;
                    readonly description: "Maximum run duration in milliseconds.";
                };
                readonly workers: {
                    readonly type: "integer";
                    readonly minimum: 1;
                    readonly maximum: 32;
                    readonly default: 1;
                    readonly description: "Number of independent target workers.";
                };
                readonly restartPolicy: {
                    readonly type: "string";
                    readonly enum: readonly ["per-case", "on-failure", "never"];
                    readonly default: "per-case";
                    readonly description: "When to restart a spawned target between scenarios.";
                };
                readonly timeoutMs: {
                    readonly type: "integer";
                    readonly minimum: 1;
                    readonly default: 5000;
                    readonly description: "Default per-request and target startup timeout in milliseconds.";
                };
                readonly confirmations: {
                    readonly type: "integer";
                    readonly minimum: 1;
                    readonly maximum: 5;
                    readonly default: 2;
                    readonly description: "Fresh-target replays required to confirm a finding.";
                };
                readonly transport: {
                    readonly type: "string";
                    readonly enum: readonly ["stdio", "streamable-http"];
                    readonly default: "stdio";
                    readonly description: "Transport used to communicate with the target.";
                };
                readonly url: {
                    readonly type: "string";
                    readonly pattern: "^https?://";
                    readonly description: "Streamable HTTP endpoint. Non-loopback attach requires explicit authorization.";
                };
                readonly command: {
                    readonly type: "string";
                    readonly minLength: 1;
                    readonly description: "Executable used to start a spawned target.";
                };
                readonly args: {
                    readonly type: "array";
                    readonly items: {
                        readonly type: "string";
                    };
                    readonly default: readonly [];
                    readonly description: "Argument array for the spawned target command.";
                };
                readonly env: {
                    readonly type: "object";
                    readonly additionalProperties: {
                        readonly type: "string";
                    };
                    readonly default: {};
                    readonly description: "Environment variables passed to the spawned target.";
                };
                readonly inheritEnvironment: {
                    readonly type: "boolean";
                    readonly default: false;
                    readonly description: "Pass the caller's environment to the target in addition to configured values.";
                };
                readonly allowNonLoopback: {
                    readonly type: "boolean";
                    readonly default: false;
                    readonly description: "Authorize attach mode to connect to a non-loopback HTTP address.";
                };
                readonly allowTools: {
                    readonly type: "array";
                    readonly items: {
                        readonly type: "string";
                        readonly minLength: 1;
                    };
                    readonly uniqueItems: true;
                    readonly default: readonly [];
                    readonly description: "Exact tool names permitted when they are not annotated read-only.";
                };
                readonly argumentStrategies: {
                    readonly type: "array";
                    readonly items: {
                        readonly type: "object";
                        readonly additionalProperties: false;
                        readonly properties: {
                            readonly name: {
                                readonly type: "string";
                                readonly minLength: 1;
                            };
                            readonly enabled: {
                                readonly type: "boolean";
                                readonly default: true;
                            };
                            readonly options: {
                                readonly default: {};
                                readonly type: "object";
                                readonly additionalProperties: true;
                            };
                        };
                        readonly required: readonly ["name", "enabled", "options"];
                    };
                    readonly default: readonly [];
                    readonly description: "Argument strategy registry selections. Empty enables all registered strategies.";
                };
                readonly failOn: {
                    readonly default: "high";
                    readonly description: "Lowest finding severity that makes the CLI exit with code 1.";
                    readonly type: "string";
                    readonly enum: readonly ["high", "medium", "low", "info"];
                };
                readonly reportDirectory: {
                    readonly type: "string";
                    readonly minLength: 1;
                    readonly default: ".mcp-wringer/reports";
                    readonly description: "Directory for run reports and reproducer files.";
                };
                readonly corpusDirectory: {
                    readonly type: "string";
                    readonly minLength: 1;
                    readonly default: ".mcp-wringer/corpus";
                    readonly description: "Directory for response-novelty corpus entries.";
                };
                readonly baselinePath: {
                    readonly type: "string";
                    readonly minLength: 1;
                    readonly description: "JSON file containing finding IDs to use as the baseline.";
                };
                readonly plugins: {
                    readonly type: "array";
                    readonly items: {
                        readonly type: "string";
                        readonly minLength: 1;
                    };
                    readonly uniqueItems: true;
                    readonly default: readonly [];
                    readonly description: "Explicit plugin module paths or package specifiers to load.";
                };
                readonly generators: {
                    readonly type: "array";
                    readonly items: {
                        readonly properties: {
                            readonly weight: {
                                readonly type: "integer";
                                readonly minimum: 1;
                                readonly default: 1;
                            };
                            readonly name: {
                                readonly type: "string";
                                readonly minLength: 1;
                            };
                            readonly enabled: {
                                readonly type: "boolean";
                                readonly default: true;
                            };
                            readonly options: {
                                readonly default: {};
                                readonly type: "object";
                                readonly additionalProperties: true;
                            };
                        };
                        readonly required: readonly ["name", "enabled", "options", "weight"];
                        readonly type: "object";
                        readonly additionalProperties: false;
                    };
                    readonly default: readonly [];
                    readonly description: "Generator registry selections. Empty uses the built-in default schedule.";
                };
                readonly oracles: {
                    readonly type: "array";
                    readonly items: {
                        readonly properties: {
                            readonly severityOverrides: {
                                readonly type: "object";
                                readonly additionalProperties: {
                                    readonly type: "string";
                                    readonly enum: readonly ["high", "medium", "low", "info"];
                                };
                                readonly default: {};
                            };
                            readonly name: {
                                readonly type: "string";
                                readonly minLength: 1;
                            };
                            readonly enabled: {
                                readonly type: "boolean";
                                readonly default: true;
                            };
                            readonly options: {
                                readonly default: {};
                                readonly type: "object";
                                readonly additionalProperties: true;
                            };
                        };
                        readonly required: readonly ["name", "enabled", "options", "severityOverrides"];
                        readonly type: "object";
                        readonly additionalProperties: false;
                    };
                    readonly default: readonly [];
                    readonly description: "Oracle registry selections. Empty enables every registered oracle.";
                };
                readonly reporters: {
                    readonly type: "array";
                    readonly items: {
                        readonly type: "object";
                        readonly additionalProperties: false;
                        readonly properties: {
                            readonly name: {
                                readonly type: "string";
                                readonly minLength: 1;
                            };
                            readonly enabled: {
                                readonly type: "boolean";
                                readonly default: true;
                            };
                            readonly options: {
                                readonly default: {};
                                readonly type: "object";
                                readonly additionalProperties: true;
                            };
                        };
                        readonly required: readonly ["name", "enabled", "options"];
                    };
                    readonly default: readonly [{
                        readonly name: "console";
                        readonly enabled: true;
                        readonly options: {};
                    }, {
                        readonly name: "json";
                        readonly enabled: true;
                        readonly options: {};
                    }];
                    readonly description: "Report formats selected by registry name.";
                };
            };
        };
    };
};
type Infer<S> = S extends {
    oneOf: readonly (infer Alternatives)[];
} ? Infer<Alternatives> : S extends {
    enum: readonly (infer Value)[];
} ? Value : S extends {
    const: infer Value;
} ? Value : S extends {
    type: "object";
    properties: infer Properties extends Record<string, unknown>;
    required: readonly (infer Required)[];
} ? {
    [Key in Extract<Required, keyof Properties>]: Infer<Properties[Key]>;
} & {
    [Key in Exclude<keyof Properties, Required>]?: Infer<Properties[Key]>;
} : S extends {
    type: "object";
    properties: infer Properties extends Record<string, unknown>;
} ? {
    [Key in keyof Properties]?: Infer<Properties[Key]>;
} : S extends {
    type: "object";
    additionalProperties: infer Additional;
} ? Record<string, Additional extends true ? JsonValue : Infer<Additional>> : S extends {
    type: "array";
    items: infer Item;
} ? Infer<Item>[] : S extends {
    type: "integer" | "number";
} ? number : S extends {
    type: "boolean";
} ? boolean : S extends {
    type: "string";
} ? string : never;
type RawConfig = Infer<typeof configDefinition>;
type ProfileConfig = Partial<Omit<RawConfig, "$schema" | "profile" | "profiles">>;

declare const WRINGER_PLUGIN_API_VERSION: "0.1";
interface PluginApi {
    readonly apiVersion: typeof WRINGER_PLUGIN_API_VERSION;
    registerGenerator(name: string, generator: ScenarioGenerator): void;
    registerArgumentStrategy(name: string, strategy: ArgumentStrategy): void;
    registerOracle(name: string, oracle: Oracle): void;
    registerReporter(name: string, reporter: Reporter): void;
    registerProfile(name: string, profile: ProfileConfig): void;
}
interface WringerPlugin {
    readonly apiVersion: typeof WRINGER_PLUGIN_API_VERSION;
    readonly name: string;
    register(api: PluginApi): void;
}
declare const pluginApi: PluginApi;

export { ArgumentStrategy, JsonValue, Oracle, type PluginApi, type ProfileConfig, Reporter, ScenarioGenerator, WRINGER_PLUGIN_API_VERSION, type WringerPlugin, pluginApi };
