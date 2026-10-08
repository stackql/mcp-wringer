"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// src/action/index.ts
var import_node_crypto4 = require("crypto");
var import_promises6 = require("fs/promises");
var import_node_path6 = require("path");

// src/core/errors.ts
var WringerError = class extends Error {
  code;
  constructor(code, message, options) {
    super(message, options);
    this.name = new.target.name;
    this.code = code;
  }
};
var RegistryError = class extends WringerError {
  constructor(message) {
    super("REGISTRY_ERROR", message);
  }
};
var ScenarioError = class extends WringerError {
  constructor(message) {
    super("SCENARIO_ERROR", message);
  }
};
var TargetError = class extends WringerError {
  constructor(message, options) {
    super("TARGET_ERROR", message, options);
  }
};
var TransportError = class extends WringerError {
  constructor(message, options) {
    super("TRANSPORT_ERROR", message, options);
  }
};

// src/core/seed.ts
var import_node_crypto = require("crypto");
function createRootSeed(value) {
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value) || value < 0 || value > 4294967295) {
      throw new ScenarioError("Seed must be an unsigned 32-bit integer.");
    }
    return value;
  }
  if (value !== void 0) {
    if (!/^(?:0|[1-9]\d*)$/.test(value)) {
      throw new ScenarioError("Seed must be an unsigned 32-bit integer.");
    }
    const parsed = Number(value);
    if (!Number.isSafeInteger(parsed) || parsed > 4294967295) {
      throw new ScenarioError("Seed must be an unsigned 32-bit integer.");
    }
    return parsed;
  }
  return (0, import_node_crypto.randomBytes)(4).readUInt32LE(0);
}
function deriveSeed(rootSeed, ...labels) {
  const digest = (0, import_node_crypto.createHash)("sha256").update(String(rootSeed)).update("\0").update(labels.join("\0")).digest();
  return digest.readUInt32LE(0) & 2147483647;
}

// src/core/run.ts
var import_promises2 = require("fs/promises");
var import_node_perf_hooks3 = require("perf_hooks");
var import_node_path2 = require("path");

// src/core/safety.ts
function assertScenarioSafety(scenario, surface, policy = {}) {
  const toolByName = new Map(surface.tools.map((tool) => [tool.name, tool]));
  const allowedTools = new Set(policy.allowTools ?? []);
  for (const step of scenario.steps) {
    const rawMayContainCall = step.type === "send-raw" && mayContainToolCall(step.bytesBase64);
    const message = step.type === "send" ? asRecord(step.message) : step.type === "send-raw" ? parseRawMessage(step.bytesBase64) : void 0;
    if (rawMayContainCall && message === void 0) {
      throw new ScenarioError("Safety policy refused unparseable raw bytes that may contain a tools/call request.");
    }
    if (message?.method !== "tools/call") {
      continue;
    }
    const params = asRecord(message.params);
    const name = params?.name;
    if (typeof name !== "string") {
      throw new ScenarioError("Safety policy refused a tools/call request without an exact tool name.");
    }
    const tool = toolByName.get(name);
    if (tool?.safety === "read-only") {
      continue;
    }
    if (allowedTools.has(name)) {
      continue;
    }
    const reason = tool?.safety === "requires-exact-name-allow" ? "destructive tools require an exact-name allow entry" : "tools without a read-only annotation require an allow entry";
    throw new ScenarioError(`Safety policy refused tool '${name}': ${reason}.`);
  }
}
function parseRawMessage(bytesBase64) {
  try {
    const parsed = JSON.parse(Buffer.from(bytesBase64, "base64").toString("utf8"));
    return isRecord(parsed) ? parsed : void 0;
  } catch {
    return void 0;
  }
}
function mayContainToolCall(bytesBase64) {
  const text = Buffer.from(bytesBase64, "base64").toString("utf8");
  return /tools\\?\/call/.test(text) || text.includes("tools") && text.includes("call");
}
function asRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value : void 0;
}
function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// src/core/corpus.ts
var import_node_crypto2 = require("crypto");
var import_promises = require("fs/promises");
var import_node_path = require("path");
async function recordNovelScenario(directory, scenario, trace, seed) {
  const signature = responseSignature(trace);
  await (0, import_promises.mkdir)(directory, { recursive: true });
  const entries = await (0, import_promises.readdir)(directory);
  if (entries.includes(`${signature}.scenario.json`)) {
    return false;
  }
  const path = (0, import_node_path.join)(directory, `${signature}.scenario.json`);
  let file;
  try {
    file = await (0, import_promises.open)(path, "wx");
  } catch (error) {
    if (isNodeError(error) && error.code === "EEXIST") {
      return false;
    }
    throw error;
  }
  try {
    await file.writeFile(`${JSON.stringify({ seed, scenario }, null, 2)}
`, "utf8");
  } finally {
    await file.close();
  }
  return true;
}
function responseSignature(trace) {
  const bytes = Buffer.concat(trace.events.filter((event) => event.channel === "stdout").map((event) => event.encoding === "base64" ? Buffer.from(event.data, "base64") : Buffer.from(event.data)));
  const responses = [];
  for (const line of bytes.toString("utf8").split("\n")) {
    if (line.length === 0) {
      continue;
    }
    try {
      const message = JSON.parse(line);
      if (!isRecord2(message) || !("result" in message) && !("error" in message)) {
        continue;
      }
      const withoutId = Object.fromEntries(Object.entries(message).filter(([key]) => key !== "id"));
      responses.push(sortJson(withoutId));
    } catch {
      responses.push({ malformed: (0, import_node_crypto2.createHash)("sha256").update(line).digest("hex") });
    }
  }
  return (0, import_node_crypto2.createHash)("sha256").update(JSON.stringify(responses)).digest("hex");
}
function sortJson(value) {
  if (Array.isArray(value)) {
    return value.map(sortJson);
  }
  if (!isRecord2(value)) {
    return value;
  }
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, sortJson(value[key])]));
}
function isRecord2(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function isNodeError(error) {
  return error instanceof Error && "code" in error;
}

// src/core/registry.ts
var ExtensionRegistry = class {
  #entries = /* @__PURE__ */ new Map();
  register(name, extension) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name)) {
      throw new RegistryError(`Invalid extension name '${name}'. Names must be lowercase kebab-case.`);
    }
    if (this.#entries.has(name)) {
      throw new RegistryError(`Extension '${name}' is already registered.`);
    }
    this.#entries.set(name, extension);
  }
  get(name) {
    const extension = this.#entries.get(name);
    if (extension === void 0) {
      throw new RegistryError(`Unknown extension '${name}'. Available: ${this.names().join(", ")}.`);
    }
    return extension;
  }
  names() {
    return [...this.#entries.keys()].sort();
  }
};

// spec/2025-11-25/rules.json
var rules_default = {
  revision: "2025-11-25",
  errorCodes: {
    parseError: -32700,
    invalidRequest: -32600,
    methodNotFound: -32601,
    invalidParams: -32602,
    internalError: -32603
  },
  responseSchemas: {
    initialize: "InitializeResult",
    ping: "EmptyResult",
    "tools/call": "CallToolResult",
    "tools/list": "ListToolsResult",
    "resources/list": "ListResourcesResult",
    "prompts/list": "ListPromptsResult"
  },
  rules: [
    {
      id: "crash.process-exit",
      severity: "high",
      title: "Target exited during a scenario",
      cite: "JSON-RPC 2.0 \xA74 Request object; https://github.com/modelcontextprotocol/modelcontextprotocol/blob/0a11bf68c7ec4473526ec15589f592afcd12d1e8/docs/specification/2025-11-25/basic/transports.mdx#stdio"
    },
    {
      id: "hang.request-timeout",
      severity: "high",
      title: "Target did not answer a request",
      cite: "JSON-RPC 2.0 \xA74 Request object; https://github.com/modelcontextprotocol/modelcontextprotocol/blob/0a11bf68c7ec4473526ec15589f592afcd12d1e8/docs/specification/2025-11-25/basic/lifecycle.mdx#operation"
    },
    {
      id: "liveness.probe-failed",
      severity: "high",
      title: "Target failed its liveness probe",
      cite: "https://github.com/modelcontextprotocol/modelcontextprotocol/blob/0a11bf68c7ec4473526ec15589f592afcd12d1e8/docs/specification/2025-11-25/basic/utilities/ping.mdx"
    },
    {
      id: "state-consistency.baseline-changed",
      severity: "high",
      title: "Baseline response changed after a scenario",
      cite: "JSON-RPC 2.0 \xA74 Request and response objects; https://github.com/modelcontextprotocol/modelcontextprotocol/blob/0a11bf68c7ec4473526ec15589f592afcd12d1e8/docs/specification/2025-11-25/basic/lifecycle.mdx#operation"
    },
    {
      id: "stdout-pollution.non-protocol-bytes",
      severity: "medium",
      title: "Target wrote non-protocol bytes to stdout",
      cite: "https://github.com/modelcontextprotocol/modelcontextprotocol/blob/0a11bf68c7ec4473526ec15589f592afcd12d1e8/docs/specification/2025-11-25/basic/transports.mdx#stdio"
    },
    {
      id: "jsonrpc-contract.invalid-message",
      severity: "medium",
      title: "Target emitted an invalid JSON-RPC message",
      cite: "JSON-RPC 2.0 \xA74 Request, notification, and response objects"
    },
    {
      id: "schema-response.invalid-result",
      severity: "medium",
      title: "Target response does not match the revision schema",
      cite: "https://github.com/modelcontextprotocol/modelcontextprotocol/blob/0a11bf68c7ec4473526ec15589f592afcd12d1e8/docs/specification/2025-11-25/schema.mdx"
    },
    {
      id: "error-code.unexpected-code",
      severity: "low",
      title: "Target returned the wrong JSON-RPC error code",
      cite: "JSON-RPC 2.0 \xA75.1 Error object"
    },
    {
      id: "error-leak.sensitive-detail",
      severity: "low",
      title: "Target exposed internal error details",
      cite: "https://github.com/modelcontextprotocol/modelcontextprotocol/blob/0a11bf68c7ec4473526ec15589f592afcd12d1e8/docs/specification/2025-11-25/server/tools.mdx#error-handling (diagnostic heuristic; detailed errors are not prohibited by this section)"
    },
    {
      id: "accepted-malformed.success-response",
      severity: "info",
      title: "Target accepted a malformed request",
      cite: "JSON-RPC 2.0 \xA74.2 Notification; \xA75.1 Invalid Request"
    },
    {
      id: "resource-usage.outlier",
      severity: "info",
      title: "Target produced an unusually large trace",
      cite: "https://github.com/modelcontextprotocol/modelcontextprotocol/blob/0a11bf68c7ec4473526ec15589f592afcd12d1e8/docs/specification/2025-11-25/basic/transports.mdx#stdio (observational only; the transport defines no size limit)"
    },
    {
      id: "http.response-media-type",
      severity: "medium",
      title: "HTTP request response used an unsupported media type",
      cite: "https://github.com/modelcontextprotocol/modelcontextprotocol/blob/0a11bf68c7ec4473526ec15589f592afcd12d1e8/docs/specification/2025-11-25/basic/transports.mdx#streamable-http"
    },
    {
      id: "http.notification-response",
      severity: "medium",
      title: "HTTP notification did not receive an empty 202 response",
      cite: "https://github.com/modelcontextprotocol/modelcontextprotocol/blob/0a11bf68c7ec4473526ec15589f592afcd12d1e8/docs/specification/2025-11-25/basic/transports.mdx#sending-messages-to-the-server"
    },
    {
      id: "http.response-body-invalid",
      severity: "medium",
      title: "HTTP response body did not contain valid JSON-RPC data",
      cite: "https://github.com/modelcontextprotocol/modelcontextprotocol/blob/0a11bf68c7ec4473526ec15589f592afcd12d1e8/docs/specification/2025-11-25/basic/transports.mdx#sending-messages-to-the-server"
    }
  ]
};

// spec/2026-07-28/rules.json
var rules_default2 = {
  revision: "2026-07-28",
  errorCodes: {
    parseError: -32700,
    invalidRequest: -32600,
    methodNotFound: -32601,
    invalidParams: -32602,
    internalError: -32603
  },
  responseSchemas: {
    "server/discover": "DiscoverResult",
    "tools/call": "CallToolResult",
    "tools/list": "ListToolsResult",
    "resources/list": "ListResourcesResult",
    "prompts/list": "ListPromptsResult"
  },
  rules: [
    {
      id: "crash.process-exit",
      severity: "high",
      title: "Target exited during a scenario",
      cite: "JSON-RPC 2.0 \xA74 Request object; https://github.com/modelcontextprotocol/modelcontextprotocol/blob/0a11bf68c7ec4473526ec15589f592afcd12d1e8/docs/specification/2026-07-28/basic/transports/stdio.mdx"
    },
    {
      id: "hang.request-timeout",
      severity: "high",
      title: "Target did not answer a request",
      cite: "JSON-RPC 2.0 \xA74 Request object; https://github.com/modelcontextprotocol/modelcontextprotocol/blob/0a11bf68c7ec4473526ec15589f592afcd12d1e8/docs/specification/2026-07-28/basic/versioning.mdx#protocol-version-negotiation"
    },
    {
      id: "liveness.probe-failed",
      severity: "high",
      title: "Target failed its liveness probe",
      cite: "https://github.com/modelcontextprotocol/modelcontextprotocol/blob/0a11bf68c7ec4473526ec15589f592afcd12d1e8/docs/specification/2026-07-28/server/discover.mdx#request"
    },
    {
      id: "state-consistency.baseline-changed",
      severity: "high",
      title: "Baseline response changed after a scenario",
      cite: "JSON-RPC 2.0 \xA74 Request and response objects; https://github.com/modelcontextprotocol/modelcontextprotocol/blob/0a11bf68c7ec4473526ec15589f592afcd12d1e8/docs/specification/2026-07-28/server/discover.mdx#response"
    },
    {
      id: "stdout-pollution.non-protocol-bytes",
      severity: "medium",
      title: "Target wrote non-protocol bytes to stdout",
      cite: "https://github.com/modelcontextprotocol/modelcontextprotocol/blob/0a11bf68c7ec4473526ec15589f592afcd12d1e8/docs/specification/2026-07-28/basic/transports/stdio.mdx"
    },
    {
      id: "jsonrpc-contract.invalid-message",
      severity: "medium",
      title: "Target emitted an invalid JSON-RPC message",
      cite: "JSON-RPC 2.0 \xA74 Request, notification, and response objects"
    },
    {
      id: "schema-response.invalid-result",
      severity: "medium",
      title: "Target response does not match the revision schema",
      cite: "https://github.com/modelcontextprotocol/modelcontextprotocol/blob/0a11bf68c7ec4473526ec15589f592afcd12d1e8/docs/specification/2026-07-28/schema.mdx"
    },
    {
      id: "error-code.unexpected-code",
      severity: "low",
      title: "Target returned the wrong JSON-RPC error code",
      cite: "JSON-RPC 2.0 \xA75.1 Error object"
    },
    {
      id: "error-leak.sensitive-detail",
      severity: "low",
      title: "Target exposed internal error details",
      cite: "https://github.com/modelcontextprotocol/modelcontextprotocol/blob/0a11bf68c7ec4473526ec15589f592afcd12d1e8/docs/specification/2026-07-28/server/tools.mdx#error-handling (diagnostic heuristic; detailed errors are not prohibited by this section)"
    },
    {
      id: "accepted-malformed.success-response",
      severity: "info",
      title: "Target accepted a malformed request",
      cite: "JSON-RPC 2.0 \xA74.2 Notification; \xA75.1 Invalid Request"
    },
    {
      id: "resource-usage.outlier",
      severity: "info",
      title: "Target produced an unusually large trace",
      cite: "https://github.com/modelcontextprotocol/modelcontextprotocol/blob/0a11bf68c7ec4473526ec15589f592afcd12d1e8/docs/specification/2026-07-28/basic/transports/stdio.mdx (observational only; the transport defines no size limit)"
    },
    {
      id: "http.response-media-type",
      severity: "medium",
      title: "HTTP request response used an unsupported media type",
      cite: "https://github.com/modelcontextprotocol/modelcontextprotocol/blob/0a11bf68c7ec4473526ec15589f592afcd12d1e8/docs/specification/2026-07-28/basic/transports/streamable-http.mdx#sending-messages"
    },
    {
      id: "http.notification-response",
      severity: "medium",
      title: "HTTP notification did not receive an empty 202 response",
      cite: "https://github.com/modelcontextprotocol/modelcontextprotocol/blob/0a11bf68c7ec4473526ec15589f592afcd12d1e8/docs/specification/2026-07-28/basic/transports/streamable-http.mdx#sending-messages"
    },
    {
      id: "http.response-body-invalid",
      severity: "medium",
      title: "HTTP response body did not contain valid JSON-RPC data",
      cite: "https://github.com/modelcontextprotocol/modelcontextprotocol/blob/0a11bf68c7ec4473526ec15589f592afcd12d1e8/docs/specification/2026-07-28/basic/transports/streamable-http.mdx#sending-messages"
    }
  ]
};

// src/spec/rules.ts
var specRules = {
  "2025-11-25": loadRules(rules_default, "2025-11-25"),
  "2026-07-28": loadRules(rules_default2, "2026-07-28")
};
function loadRules(value, revision) {
  if (!isRecord3(value) || value.revision !== revision || !isRecord3(value.errorCodes) || !isRecord3(value.responseSchemas) || !Array.isArray(value.rules)) {
    throw new Error(`Invalid rules data for spec revision ${revision}.`);
  }
  const errorCodes = value.errorCodes;
  const codeValues = {
    parseError: readCode(errorCodes.parseError, "parseError", revision),
    invalidRequest: readCode(errorCodes.invalidRequest, "invalidRequest", revision),
    methodNotFound: readCode(errorCodes.methodNotFound, "methodNotFound", revision),
    invalidParams: readCode(errorCodes.invalidParams, "invalidParams", revision),
    internalError: readCode(errorCodes.internalError, "internalError", revision)
  };
  const responseSchemas = {};
  for (const [method, schema] of Object.entries(value.responseSchemas)) {
    if (typeof schema !== "string" || schema.length === 0) {
      throw new Error(`Rules for ${revision} have an invalid response schema for ${method}.`);
    }
    responseSchemas[method] = schema;
  }
  const rules = {};
  for (const item of value.rules) {
    if (!isRecord3(item) || typeof item.id !== "string" || typeof item.title !== "string" || typeof item.cite !== "string" || item.cite.length === 0 || !isSeverity(item.severity)) {
      throw new Error(`Rules for ${revision} contain an incomplete oracle rule.`);
    }
    if (rules[item.id] !== void 0) {
      throw new Error(`Rules for ${revision} contain duplicate rule '${item.id}'.`);
    }
    rules[item.id] = {
      id: item.id,
      severity: item.severity,
      title: item.title,
      cite: item.cite
    };
  }
  return {
    revision,
    errorCodes: {
      parseError: codeValues.parseError,
      invalidRequest: codeValues.invalidRequest,
      methodNotFound: codeValues.methodNotFound,
      invalidParams: codeValues.invalidParams,
      internalError: codeValues.internalError
    },
    responseSchemas,
    rules
  };
}
function readCode(value, key, revision) {
  if (typeof value !== "number" || !Number.isInteger(value)) {
    throw new Error(`Rules for ${revision} have an invalid JSON-RPC error code for ${key}.`);
  }
  return value;
}
function isRecord3(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function isSeverity(value) {
  return value === "high" || value === "medium" || value === "low" || value === "info";
}

// src/spec/profiles.ts
var implementation = {
  name: "mcp-wringer",
  version: "0.1.0"
};
var capabilities = {};
var legacyProfile = {
  revision: "2025-11-25",
  rules: specRules["2025-11-25"],
  lifecycleSteps(prefix) {
    const initializeId = `${prefix}-initialize`;
    return [
      {
        type: "send",
        message: {
          jsonrpc: "2.0",
          id: initializeId,
          method: "initialize",
          params: {
            protocolVersion: "2025-11-25",
            capabilities,
            clientInfo: implementation
          }
        }
      },
      { type: "await-response", id: initializeId },
      {
        type: "send",
        message: {
          jsonrpc: "2.0",
          method: "notifications/initialized"
        }
      }
    ];
  },
  request(method, id, params) {
    return {
      jsonrpc: "2.0",
      id,
      method,
      ...params === void 0 ? {} : { params }
    };
  },
  livenessProbe(id) {
    return this.request("ping", id);
  },
  toolListMethod: "tools/list",
  resourceListMethod: "resources/list",
  promptListMethod: "prompts/list"
};
var statelessProfile = {
  revision: "2026-07-28",
  rules: specRules["2026-07-28"],
  lifecycleSteps() {
    return [];
  },
  request(method, id, params) {
    const requestParams = typeof params === "object" && params !== null && !Array.isArray(params) ? params : {};
    return {
      jsonrpc: "2.0",
      id,
      method,
      params: {
        ...requestParams,
        _meta: {
          "io.modelcontextprotocol/clientCapabilities": capabilities,
          "io.modelcontextprotocol/clientInfo": implementation,
          "io.modelcontextprotocol/protocolVersion": "2026-07-28"
        }
      }
    };
  },
  livenessProbe(id) {
    return this.request("server/discover", id);
  },
  toolListMethod: "tools/list",
  resourceListMethod: "resources/list",
  promptListMethod: "prompts/list"
};
var specProfiles = new ExtensionRegistry();
specProfiles.register(legacyProfile.revision, legacyProfile);
specProfiles.register(statelessProfile.revision, statelessProfile);

// src/transports/stdio/runner.ts
var import_node_perf_hooks = require("perf_hooks");

// src/target/spawn.ts
var import_cross_spawn = __toESM(require("cross-spawn"), 1);
var import_node_child_process = require("child_process");
function spawnTarget(options) {
  const env = options.inheritEnvironment ? { ...process.env, ...options.env } : { ...minimalEnvironment(), ...options.env };
  return (0, import_cross_spawn.default)(options.command, options.args, {
    cwd: options.cwd,
    env,
    stdio: ["pipe", "pipe", "pipe"],
    windowsHide: true,
    detached: process.platform !== "win32"
  });
}
async function terminateTarget(child) {
  if (child.exitCode !== null || child.signalCode !== null || child.pid === void 0) {
    return;
  }
  if (process.platform === "win32") {
    const taskkillPath = process.env.SystemRoot ? `${process.env.SystemRoot}\\System32\\taskkill.exe` : "taskkill.exe";
    await new Promise((resolve5, reject) => {
      (0, import_node_child_process.execFile)(taskkillPath, ["/PID", String(child.pid), "/T", "/F"], (error) => {
        if (error && child.exitCode === null && child.signalCode === null) {
          reject(new TargetError(`Could not terminate target process tree: ${error.message}`, { cause: error }));
          return;
        }
        resolve5();
      });
    });
    return;
  }
  const exited = new Promise((resolve5) => {
    if (child.exitCode !== null || child.signalCode !== null) {
      resolve5();
    } else {
      child.once("exit", () => resolve5());
    }
  });
  try {
    process.kill(-child.pid, "SIGTERM");
  } catch (error) {
    if (!isNodeError2(error) || error.code !== "ESRCH") {
      throw new TargetError(`Could not terminate target process group: ${errorMessage(error)}`, { cause: error });
    }
  }
  let timer;
  const didExit = await Promise.race([
    exited.then(() => true),
    new Promise((resolve5) => {
      timer = setTimeout(() => resolve5(false), 1e3);
    })
  ]);
  if (timer !== void 0) {
    clearTimeout(timer);
  }
  if (!didExit && child.pid !== void 0) {
    try {
      process.kill(-child.pid, "SIGKILL");
    } catch (error) {
      if (!isNodeError2(error) || error.code !== "ESRCH") {
        throw new TargetError(`Could not force-terminate target process group: ${errorMessage(error)}`, { cause: error });
      }
    }
    await exited;
  }
}
function minimalEnvironment() {
  const keys = process.platform === "win32" ? ["PATH", "SystemRoot", "WINDIR", "TEMP", "TMP"] : ["PATH", "HOME", "TMPDIR"];
  const env = {};
  for (const key of keys) {
    const value = process.env[key];
    if (value !== void 0) {
      env[key] = value;
    }
  }
  return env;
}
function isNodeError2(error) {
  return error instanceof Error && "code" in error;
}
function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

// src/transports/stdio/runner.ts
var StdioScenarioSession = class {
  #child;
  #frames = new AsyncQueue();
  #recorder;
  #startedAt;
  #timeoutMs;
  #exitPromise;
  #outputBuffer = Buffer.alloc(0);
  #spawnError;
  #exitStatus;
  #closeFailure;
  #closed = false;
  constructor(options) {
    this.#child = spawnTarget(options);
    this.#startedAt = import_node_perf_hooks.performance.now();
    this.#timeoutMs = options.timeoutMs ?? 5e3;
    this.#recorder = new TraceRecorder(
      options.scenario.id,
      options.scenario.specRevision,
      this.#startedAt,
      [
        ...Object.values(options.env ?? {}),
        ...options.inheritEnvironment ? Object.values(process.env).filter((value) => value !== void 0) : []
      ]
    );
    this.#exitPromise = new Promise((resolve5) => {
      this.#child.once("exit", (code, signal) => {
        this.#exitStatus = { code, signal };
        this.#recorder.add("process", Buffer.from(`exit code=${String(code)} signal=${String(signal)}`));
        resolve5(this.#exitStatus);
      });
    });
    this.#child.once("error", (error) => {
      this.#spawnError = error;
      this.#recorder.add("process", Buffer.from(`spawn error=${error.message}`));
      this.#frames.close(error);
    });
    this.#child.stdin?.on("error", (error) => {
      this.#spawnError = error;
      this.#recorder.add("process", Buffer.from(`stdin error=${error.message}`));
      this.#frames.close(new TransportError(`Target stdin failed: ${error.message}`, { cause: error }));
    });
    this.#child.stdout?.on("data", (chunk) => {
      this.#recorder.add("stdout", chunk);
      this.#outputBuffer = Buffer.concat([this.#outputBuffer, chunk]);
      let newline = this.#outputBuffer.indexOf(10);
      while (newline >= 0) {
        this.#frames.push(this.#outputBuffer.subarray(0, newline + 1));
        this.#outputBuffer = this.#outputBuffer.subarray(newline + 1);
        newline = this.#outputBuffer.indexOf(10);
      }
    });
    this.#child.stdout?.on("error", (error) => {
      this.#recorder.add("process", Buffer.from(`stdout error=${error.message}`));
      this.#frames.close(new TransportError(`Target stdout failed: ${error.message}`, { cause: error }));
    });
    this.#child.stderr?.on("data", (chunk) => this.#recorder.add("stderr", chunk));
    this.#child.stderr?.on("error", (error) => this.#recorder.add("process", Buffer.from(`stderr error=${error.message}`)));
    this.#child.once("close", () => {
      if (this.#outputBuffer.length > 0) {
        this.#frames.push(this.#outputBuffer);
      }
      if (!this.#closed) {
        this.#frames.close(this.#spawnError);
      }
    });
  }
  async execute(scenario, options = {}) {
    if (this.#closed) {
      throw new TargetError("Cannot execute a scenario after the stdio target session is closed.");
    }
    if (scenario.specRevision !== this.#recorder.getRevision()) {
      throw new ScenarioError("All scenarios in a stdio target session must use the same spec revision.");
    }
    const startedAt = import_node_perf_hooks.performance.now();
    const eventStart = this.#recorder.eventCount();
    const byteStart = this.#recorder.byteCounts();
    const responses = [];
    let failure;
    try {
      await waitForSpawn(this.#child, this.#spawnError, this.#timeoutMs);
      for (const step of scenario.steps) {
        try {
          const response = await executeStep(step, this.#child, this.#frames, this.#recorder);
          if (response !== void 0) {
            responses.push(response);
          }
        } catch (error) {
          if (!(error instanceof TransportError)) {
            throw error;
          }
          failure = classifyFailure(error, this.#exitStatus);
          break;
        }
      }
      if (failure?.kind === "transport-error" && /EPIPE/u.test(failure.message) && this.#exitStatus === void 0) {
        await Promise.race([
          this.#exitPromise,
          new Promise((resolve5) => setTimeout(resolve5, 100))
        ]);
        if (this.#exitStatus !== void 0) {
          failure = { ...failure, kind: "target-exit" };
        }
      }
      if (options.closeAfterScenario ?? true) {
        await this.close(failure !== void 0);
      }
    } catch (error) {
      await this.close(true);
      throw error;
    }
    const byteCounts = this.#recorder.byteCounts();
    const finalFailure = failure ?? this.#closeFailure;
    return {
      trace: this.#recorder.toTrace(scenario.id, eventStart),
      responses,
      outcome: {
        ...finalFailure === void 0 ? {} : { failure: finalFailure },
        exitCode: this.#exitStatus?.code ?? null,
        signal: this.#exitStatus?.signal ?? null,
        durationMs: Math.max(0, import_node_perf_hooks.performance.now() - startedAt),
        stdoutBytes: byteCounts.stdoutBytes - byteStart.stdoutBytes,
        stderrBytes: byteCounts.stderrBytes - byteStart.stderrBytes
      },
      transport: "stdio"
    };
  }
  async close(terminate = false) {
    if (this.#closed) {
      return;
    }
    if (terminate) {
      await terminateTarget(this.#child);
    } else {
      if (!this.#child.stdin?.destroyed) {
        this.#child.stdin?.end();
      }
      try {
        await waitForExit(this.#exitPromise, this.#timeoutMs);
      } catch (error) {
        if (!(error instanceof TargetError)) {
          throw error;
        }
        this.#closeFailure = { kind: "timeout", phase: "shutdown", message: error.message };
        await terminateTarget(this.#child);
      }
    }
    this.#recorder.flush();
    this.#closed = true;
  }
};
async function runStdioScenario(options) {
  const session = new StdioScenarioSession(options);
  return session.execute(options.scenario);
}
async function executeStep(step, child, frames, recorder) {
  switch (step.type) {
    case "send": {
      if (step.wire !== void 0 && step.wire.transport !== "stdio") {
        throw new ScenarioError(`Wire fault '${step.wire.transport}' cannot run over stdio.`);
      }
      const bytes = Buffer.from(`${JSON.stringify(step.message)}
`, "utf8");
      await writeBytes(bytes, step.wire?.transport === "stdio" ? step.wire : void 0, child, recorder);
      return void 0;
    }
    case "send-raw": {
      if (step.wire !== void 0 && step.wire.transport !== "stdio") {
        throw new ScenarioError(`Wire fault '${step.wire.transport}' cannot run over stdio.`);
      }
      const bytes = Buffer.from(step.bytesBase64, "base64");
      await writeBytes(bytes, step.wire?.transport === "stdio" ? step.wire : void 0, child, recorder);
      return void 0;
    }
    case "await-response":
      return readResponse(frames, step.id, step.timeoutMs ?? 5e3);
    case "transport":
      if (step.operation !== "close-stdin") {
        throw new ScenarioError(`Transport operation '${step.operation}' cannot run over stdio.`);
      }
      child.stdin?.end();
      return void 0;
    case "delay":
      await new Promise((resolve5) => setTimeout(resolve5, step.durationMs));
      return void 0;
  }
}
async function writeBytes(bytes, wire, child, recorder) {
  const stdin = child.stdin;
  if (stdin === null || stdin.destroyed || stdin.writableEnded) {
    throw new TransportError("Cannot write to the target because stdin is closed.");
  }
  const sizes = wire?.chunks ?? [bytes.length];
  let offset = 0;
  for (const size of sizes) {
    if (offset >= bytes.length) {
      break;
    }
    const chunk = bytes.subarray(offset, Math.min(bytes.length, offset + size));
    offset += chunk.length;
    recorder.add("stdin", chunk);
    await writeChunk(stdin, chunk);
    if (wire?.delayMs && offset < bytes.length) {
      await new Promise((resolve5) => setTimeout(resolve5, wire.delayMs));
    }
  }
  if (offset < bytes.length) {
    const chunk = bytes.subarray(offset);
    recorder.add("stdin", chunk);
    await writeChunk(stdin, chunk);
  }
}
async function writeChunk(stream, chunk) {
  await new Promise((resolve5, reject) => {
    stream.write(chunk, (error) => {
      if (error) {
        reject(new TransportError(`Failed writing to target stdin: ${error.message}`, { cause: error }));
        return;
      }
      resolve5();
    });
  });
}
async function readResponse(frames, expectedId, timeoutMs) {
  const deadline = import_node_perf_hooks.performance.now() + timeoutMs;
  while (true) {
    const remaining = deadline - import_node_perf_hooks.performance.now();
    if (remaining <= 0) {
      throw new TransportError(`Timed out waiting for response${expectedId === void 0 ? "" : ` ${String(expectedId)}`}.`);
    }
    const frame = await frames.shift(remaining);
    let message;
    try {
      message = JSON.parse(frame.toString("utf8"));
    } catch (error) {
      throw new TransportError(`Target wrote a non-JSON stdio frame: ${error instanceof Error ? error.message : String(error)}`);
    }
    if (expectedId === void 0 || isRecord4(message) && message.id === expectedId) {
      return message;
    }
  }
}
async function waitForSpawn(child, spawnError, timeoutMs) {
  if (spawnError) {
    throw new TargetError(`Could not start target: ${spawnError.message}`, { cause: spawnError });
  }
  if (child.pid !== void 0) {
    return;
  }
  try {
    await withTimeout(
      new Promise((resolve5, reject) => {
        child.once("spawn", resolve5);
        child.once("error", reject);
      }),
      timeoutMs,
      "Timed out starting target."
    );
  } catch (error) {
    if (error instanceof TargetError) {
      throw error;
    }
    throw new TargetError(`Could not start target: ${error instanceof Error ? error.message : String(error)}`, {
      cause: error
    });
  }
}
async function waitForExit(exitPromise, timeoutMs) {
  await withTimeout(exitPromise, timeoutMs, "Target did not exit after stdin closed.");
}
async function withTimeout(promise, timeoutMs, message) {
  let timer;
  try {
    return await Promise.race([
      promise,
      new Promise((_resolve, reject) => {
        timer = setTimeout(() => reject(new TargetError(message)), timeoutMs);
      })
    ]);
  } finally {
    if (timer !== void 0) {
      clearTimeout(timer);
    }
  }
}
var AsyncQueue = class {
  #items = [];
  #waiters = [];
  #closedError;
  push(item) {
    const waiter = this.#waiters.shift();
    if (waiter) {
      waiter.resolve(item);
    } else {
      this.#items.push(item);
    }
  }
  close(error) {
    this.#closedError = error ?? new TransportError("Target closed stdout before replying.");
    for (const waiter of this.#waiters.splice(0)) {
      waiter.reject(this.#closedError);
    }
  }
  shift(timeoutMs) {
    const item = this.#items.shift();
    if (item !== void 0) {
      return Promise.resolve(item);
    }
    if (this.#closedError) {
      return Promise.reject(this.#closedError);
    }
    return new Promise((resolve5, reject) => {
      const waiter = { resolve: resolve5, reject };
      this.#waiters.push(waiter);
      const timer = setTimeout(() => {
        const index = this.#waiters.indexOf(waiter);
        if (index >= 0) {
          this.#waiters.splice(index, 1);
        }
        reject(new TransportError("Timed out waiting for a stdio frame."));
      }, timeoutMs);
      const resolveWithClear = waiter.resolve;
      waiter.resolve = (queuedItem) => {
        clearTimeout(timer);
        resolveWithClear(queuedItem);
      };
      const rejectWithClear = waiter.reject;
      waiter.reject = (error) => {
        clearTimeout(timer);
        rejectWithClear(error);
      };
    });
  }
};
var TraceRecorder = class {
  #events = [];
  #startedAt;
  #scenarioId;
  #revision;
  #redactors = /* @__PURE__ */ new Map();
  #stdoutBytes = 0;
  #stderrBytes = 0;
  #order = 0;
  constructor(scenarioId, revision, startedAt, secrets) {
    this.#scenarioId = scenarioId;
    this.#revision = revision;
    this.#startedAt = startedAt;
    this.#redactors.set("stdout", new ByteRedactor(secrets));
    this.#redactors.set("stderr", new ByteRedactor(secrets));
  }
  add(channel, bytes) {
    const offsetMs = Math.max(0, import_node_perf_hooks.performance.now() - this.#startedAt);
    if (channel === "stdout") {
      this.#stdoutBytes += bytes.length;
    } else if (channel === "stderr") {
      this.#stderrBytes += bytes.length;
    }
    const safeBytes = channel === "stdout" || channel === "stderr" ? this.#redactors.get(channel)?.push(bytes) ?? bytes : bytes;
    if (safeBytes.length > 0) {
      this.#push(channel, safeBytes, offsetMs);
    }
  }
  flush() {
    for (const channel of ["stdout", "stderr"]) {
      const remaining = this.#redactors.get(channel)?.flush();
      if (remaining && remaining.length > 0) {
        this.#push(channel, remaining, import_node_perf_hooks.performance.now() - this.#startedAt);
      }
    }
  }
  getRevision() {
    return this.#revision;
  }
  eventCount() {
    return this.#events.length;
  }
  toTrace(scenarioId = this.#scenarioId, fromIndex = 0) {
    return {
      formatVersion: 1,
      scenarioId,
      specRevision: this.#revision,
      transport: "stdio",
      events: this.#events.slice(fromIndex).map((event) => ({
        offsetMs: event.offsetMs,
        channel: event.channel,
        encoding: event.encoding,
        data: event.data,
        ...event.http === void 0 ? {} : { http: event.http }
      }))
    };
  }
  byteCounts() {
    return { stdoutBytes: this.#stdoutBytes, stderrBytes: this.#stderrBytes };
  }
  #push(channel, bytes, offsetMs) {
    const text = bytes.toString("utf8");
    const encoding = Buffer.from(text, "utf8").equals(bytes) ? "utf8" : "base64";
    const event = {
      offsetMs,
      channel,
      encoding,
      data: encoding === "utf8" ? text : bytes.toString("base64"),
      order: this.#order++
    };
    this.#events.push(event);
    this.#events.sort((a, b) => a.offsetMs - b.offsetMs || a.order - b.order);
  }
};
var ByteRedactor = class {
  #secrets;
  #holdback;
  #pending = Buffer.alloc(0);
  constructor(secrets) {
    this.#secrets = secrets.filter((secret) => secret.length > 0).map((secret) => Buffer.from(secret, "utf8"));
    this.#holdback = Math.max(0, ...this.#secrets.map((secret) => secret.length - 1));
  }
  push(bytes) {
    const combined = Buffer.concat([this.#pending, bytes]);
    let safeLength = Math.max(0, combined.length - this.#holdback);
    let adjusted = true;
    while (adjusted) {
      adjusted = false;
      for (const secret of this.#secrets) {
        let position = combined.indexOf(secret);
        while (position >= 0) {
          if (position < safeLength && position + secret.length > safeLength) {
            safeLength = position;
            adjusted = true;
          }
          position = combined.indexOf(secret, position + 1);
        }
      }
    }
    const redacted = this.#redact(combined);
    const safe = redacted.subarray(0, safeLength);
    this.#pending = combined.subarray(safeLength);
    return safe;
  }
  flush() {
    const safe = this.#redact(this.#pending);
    this.#pending = Buffer.alloc(0);
    return safe;
  }
  #redact(bytes) {
    if (this.#secrets.length === 0) {
      return bytes;
    }
    const result = Buffer.from(bytes);
    for (const secret of this.#secrets) {
      let position = result.indexOf(secret);
      while (position >= 0) {
        result.fill(42, position, position + secret.length);
        position = result.indexOf(secret, position + secret.length);
      }
    }
    return result;
  }
};
function classifyFailure(error, exitStatus) {
  const message = error.message;
  if (/timed out/i.test(message)) {
    return { kind: "timeout", phase: "response", message };
  }
  if (exitStatus !== void 0) {
    return { kind: "target-exit", phase: "transport", message };
  }
  return { kind: "transport-error", phase: "transport", message };
}
function isRecord4(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// src/transports/http/runner.ts
var import_node_http = __toESM(require("http"), 1);
var import_node_https = __toESM(require("https"), 1);
var import_node_net = __toESM(require("net"), 1);
var import_node_tls = __toESM(require("tls"), 1);
var import_node_perf_hooks2 = require("perf_hooks");
var MAX_RESPONSE_BYTES = 2097152;
var OVERSIZED_BODY_BYTES = MAX_RESPONSE_BYTES + 1;
var HttpScenarioSession = class {
  #options;
  #url;
  #child;
  #recorder;
  #exitPromise;
  #pendingResponses = [];
  #observedResponses = [];
  #exchanges = [];
  #revision;
  #sessionId;
  #exitStatus;
  #spawnError;
  #closed = false;
  #ready = false;
  #requestedTermination = false;
  constructor(options) {
    this.#options = options;
    this.#revision = options.scenario.specRevision;
    this.#url = parseTargetUrl(options.url);
    if (options.command === void 0 && options.args !== void 0) {
      throw new ScenarioError("HTTP target args require a spawned target command.");
    }
    if (options.command !== void 0 && options.args === void 0) {
      throw new ScenarioError("A spawned HTTP target requires an argument array.");
    }
    if (options.command === void 0 && !options.allowNonLoopback && !isLoopbackHost(this.#url.hostname)) {
      throw new TargetError("Attach mode refuses non-loopback HTTP targets; pass allowNonLoopback to authorize it.");
    }
    this.#recorder = new HttpTraceRecorder(options.env ?? {}, options.inheritEnvironment ?? false);
    if (options.command === void 0) {
      this.#child = void 0;
      this.#exitPromise = void 0;
      return;
    }
    this.#child = spawnTarget({
      command: options.command,
      args: options.args ?? [],
      ...options.env === void 0 ? {} : { env: options.env },
      ...options.inheritEnvironment === void 0 ? {} : { inheritEnvironment: options.inheritEnvironment }
    });
    this.#exitPromise = new Promise((resolve5) => {
      this.#child?.once("exit", (code, signal) => {
        this.#exitStatus = { code, signal };
        this.#recorder.add("process", Buffer.from(`exit code=${String(code)} signal=${String(signal)}`));
        resolve5(this.#exitStatus);
      });
    });
    this.#child.once("error", (error) => {
      this.#spawnError = error;
      this.#recorder.add("process", Buffer.from(`spawn error=${error.message}`));
    });
    this.#child.stdout?.on("data", () => void 0);
    this.#child.stderr?.on("data", () => void 0);
  }
  async execute(scenario, options = {}) {
    if (this.#closed) {
      throw new TargetError("Cannot execute a scenario after the HTTP target session is closed.");
    }
    if (scenario.specRevision !== this.#options.scenario.specRevision) {
      throw new ScenarioError("All scenarios in an HTTP target session must use the same spec revision.");
    }
    const startedAt = import_node_perf_hooks2.performance.now();
    const eventStart = this.#recorder.eventCount();
    const exchangeStart = this.#exchanges.length;
    const responseStart = this.#observedResponses.length;
    let failure;
    try {
      await this.#ensureReady();
      for (const step of scenario.steps) {
        try {
          await this.#executeStep(step, scenario);
        } catch (error) {
          if (!(error instanceof TransportError)) {
            throw error;
          }
          failure = this.#classifyFailure(error);
          break;
        }
      }
      if (failure !== void 0 && this.#exitPromise !== void 0 && this.#exitStatus === void 0) {
        await Promise.race([
          this.#exitPromise,
          new Promise((resolve5) => setTimeout(resolve5, 100))
        ]);
      }
      if (options.closeAfterScenario ?? true) {
        await this.close(true);
      }
    } catch (error) {
      await this.close(true);
      throw error;
    }
    const responses = this.#observedResponses.splice(responseStart);
    const processFailure = this.#exitStatus !== void 0 && !this.#requestedTermination && (this.#exitStatus.code !== 0 || this.#exitStatus.signal !== null) ? {
      kind: "target-exit",
      phase: "response",
      message: `Target exited with code=${String(this.#exitStatus.code)} signal=${String(this.#exitStatus.signal)}.`
    } : void 0;
    return {
      trace: this.#recorder.toTrace(scenario.id, scenario.specRevision, eventStart),
      responses,
      outcome: {
        ...processFailure === void 0 ? failure === void 0 ? {} : { failure } : { failure: processFailure },
        exitCode: this.#requestedTermination ? null : this.#exitStatus?.code ?? null,
        signal: this.#requestedTermination ? null : this.#exitStatus?.signal ?? null,
        durationMs: Math.max(0, import_node_perf_hooks2.performance.now() - startedAt),
        stdoutBytes: 0,
        stderrBytes: 0
      },
      transport: "streamable-http",
      httpExchanges: this.#exchanges.slice(exchangeStart)
    };
  }
  async close(terminate = false) {
    if (this.#closed) {
      return;
    }
    if (this.#child !== void 0) {
      if (terminate) {
        this.#requestedTermination = this.#exitStatus === void 0 && this.#child.exitCode === null && this.#child.signalCode === null;
        await terminateTarget(this.#child);
      } else if (this.#exitPromise !== void 0) {
        this.#requestedTermination = this.#exitStatus === void 0 && this.#child.exitCode === null && this.#child.signalCode === null;
        await terminateTarget(this.#child);
      }
    }
    this.#recorder.flush();
    this.#closed = true;
  }
  async #ensureReady() {
    if (this.#ready) {
      if (this.#exitStatus !== void 0) {
        throw new TargetError("The spawned HTTP target exited before the scenario started.");
      }
      return;
    }
    if (this.#child === void 0) {
      this.#ready = true;
      return;
    }
    if (this.#spawnError !== void 0) {
      throw new TargetError(`Could not start target: ${this.#spawnError.message}`, { cause: this.#spawnError });
    }
    await waitForSpawn2(this.#child, this.#spawnError, this.#options.timeoutMs ?? 5e3);
    await waitForHttpListener(this.#url, this.#child, Math.max(5e3, this.#options.timeoutMs ?? 5e3));
    this.#ready = true;
  }
  async #executeStep(step, scenario) {
    switch (step.type) {
      case "send":
        await this.#sendMessage(
          Buffer.from(JSON.stringify(step.message)),
          step.message,
          step.wire,
          scenario,
          getResponseTimeout(scenario, step.message, this.#options.timeoutMs ?? 5e3)
        );
        return;
      case "send-raw":
        {
          const body = Buffer.from(step.bytesBase64, "base64");
          await this.#sendMessage(
            body,
            void 0,
            step.wire,
            scenario,
            getResponseTimeout(scenario, parseRequestMessage(body), this.#options.timeoutMs ?? 5e3)
          );
        }
        return;
      case "await-response":
        this.#takeResponse(step.id);
        return;
      case "transport":
        throw new ScenarioError(`Transport operation '${step.operation}' cannot run over Streamable HTTP.`);
      case "delay":
        await new Promise((resolve5) => setTimeout(resolve5, step.durationMs));
        return;
    }
  }
  async #sendMessage(body, message, wire, scenario, timeoutMs) {
    if (wire !== void 0 && wire.transport !== "streamable-http") {
      throw new ScenarioError(`Wire fault '${wire.transport}' cannot run over Streamable HTTP.`);
    }
    const fault = wire?.fault;
    const headers = createRequestHeaders(this.#options.url, scenario.specRevision, this.#sessionId);
    const method = fault === "wrong-method" ? "PUT" : "POST";
    applyHeaderFault(headers, fault, scenario.specRevision);
    if (fault === "truncated-body" || fault === "abort-response") {
      const raw = buildRawRequest(this.#url, method, headers, body, fault === "truncated-body");
      const exchange = await rawHttpRequest(
        this.#url,
        raw,
        timeoutMs,
        fault === "abort-response"
      );
      this.#recordExchange(method, headers, body, exchange, fault);
      this.#queueMessages(exchange.responseBody, exchange.responseHeaders, exchange.responseStatus);
      return;
    }
    if (fault === "oversized-body") {
      body = Buffer.alloc(OVERSIZED_BODY_BYTES, 65);
    }
    const requestCount = fault === "concurrent-requests" ? 2 : 1;
    const results = await Promise.all(Array.from({ length: requestCount }, () => sendHttpRequest(this.#url, method, headers, body, timeoutMs)));
    for (const result of results) {
      this.#recordExchange(method, headers, body, result, fault);
      if (result.responseStatus === 404 && this.#sessionId !== void 0 && scenarioIsLegacy(scenario.specRevision) && requestCount === 1 && message !== void 0 && isRecord5(message) && message.method !== "initialize") {
        this.#sessionId = void 0;
        await this.#startNewSession(scenario.specRevision);
        const retryHeaders = createRequestHeaders(this.#options.url, scenario.specRevision, this.#sessionId);
        const retry = await sendHttpRequest(this.#url, method, retryHeaders, body, this.#options.timeoutMs ?? 5e3);
        this.#recordExchange(method, retryHeaders, body, retry, fault);
        this.#queueMessages(retry.responseBody, retry.responseHeaders, retry.responseStatus);
        continue;
      }
      if (result.responseStatus === 202 && result.responseBody.length === 0) {
        continue;
      }
      if (fault === "concurrent-requests" && result.responseStatus >= 500) {
        continue;
      }
      this.#queueMessages(result.responseBody, result.responseHeaders, result.responseStatus);
    }
  }
  async #startNewSession(revision) {
    if (revision !== "2025-11-25") {
      return;
    }
    const lifecycle = specProfiles.get(revision).lifecycleSteps(`${this.#options.scenario.id}-http-reinitialize`);
    for (const step of lifecycle) {
      if (step.type !== "send") {
        continue;
      }
      const body = Buffer.from(JSON.stringify(step.message));
      const headers = createRequestHeaders(this.#options.url, revision, this.#sessionId);
      const result = await sendHttpRequest(this.#url, "POST", headers, body, this.#options.timeoutMs ?? 5e3);
      this.#recordExchange("POST", headers, body, result, "automatic-session-reinitialize");
      if (result.responseStatus < 200 || result.responseStatus >= 300) {
        throw new TransportError(`HTTP session reinitialization failed with status ${result.responseStatus}.`);
      }
    }
  }
  #recordExchange(method, headers, body, result, requestFault) {
    const safeHeaders = redactHeaders(headers, this.#options.env);
    const safeResponseHeaders = redactHeaders(result.responseHeaders, this.#options.env);
    const safeRequestBody = redactBuffer(body, this.#options.env);
    const safeResponseBody = redactBuffer(Buffer.from(result.responseBody), this.#options.env).toString("utf8");
    this.#recorder.addHttp("http-request", safeRequestBody, { method, headers: safeHeaders });
    this.#recorder.addHttp("http-response", Buffer.from(safeResponseBody), {
      method,
      headers: safeResponseHeaders,
      statusCode: result.responseStatus
    });
    this.#exchanges.push({
      ...result,
      requestMethod: method,
      requestHeaders: safeHeaders,
      requestBody: safeRequestBody.toString("utf8"),
      responseHeaders: safeResponseHeaders,
      responseBody: safeResponseBody,
      ...requestFault === void 0 ? {} : { requestFault }
    });
    const sessionId = headerValue(result.responseHeaders, "mcp-session-id");
    if (scenarioIsLegacy(this.#revision) && sessionId !== void 0) {
      this.#sessionId = sessionId;
    }
  }
  #queueMessages(body, headers, statusCode) {
    if (statusCode < 200 || statusCode >= 300) {
      return;
    }
    const contentType = headerValue(headers, "content-type")?.split(";", 1)[0]?.trim().toLowerCase();
    if (body.length === 0) {
      return;
    }
    const messages = [];
    if (contentType === "text/event-stream") {
      for (const data of parseSseData(body)) {
        parseJsonMessages(data, messages);
      }
    } else if (contentType === "application/json" || contentType === void 0) {
      parseJsonMessages(body, messages);
    }
    this.#pendingResponses.push(...messages);
    this.#observedResponses.push(...messages);
  }
  #takeResponse(id) {
    const index = this.#pendingResponses.findIndex((value) => {
      if (id === void 0) {
        return true;
      }
      return isRecord5(value) && value.id === id;
    });
    if (index < 0) {
      throw new TransportError(
        `The HTTP response did not contain JSON-RPC response${id === void 0 ? "" : ` ${String(id)}`}.`
      );
    }
    this.#pendingResponses.splice(index, 1);
  }
  #classifyFailure(error) {
    if (this.#exitStatus !== void 0) {
      return { kind: "target-exit", phase: "response", message: error.message };
    }
    return {
      kind: /timed out/iu.test(error.message) ? "timeout" : "transport-error",
      phase: "response",
      message: error.message
    };
  }
};
async function runHttpScenario(options) {
  const session = new HttpScenarioSession(options);
  return session.execute(options.scenario);
}
function createRequestHeaders(url, revision, sessionId) {
  const headers = {
    Accept: "application/json, text/event-stream",
    "Content-Type": "application/json",
    "MCP-Protocol-Version": revision,
    Host: new URL(url).host,
    Connection: "close"
  };
  if (sessionId !== void 0 && revision === "2025-11-25") {
    headers["MCP-Session-Id"] = sessionId;
  }
  return headers;
}
function applyHeaderFault(headers, fault, revision) {
  switch (fault) {
    case "missing-accept":
      delete headers.Accept;
      break;
    case "invalid-accept":
      headers.Accept = "text/plain";
      break;
    case "missing-content-type":
      delete headers["Content-Type"];
      break;
    case "invalid-content-type":
      headers["Content-Type"] = "text/plain";
      break;
    case "missing-protocol-version":
      delete headers["MCP-Protocol-Version"];
      break;
    case "mismatched-protocol-version":
      headers["MCP-Protocol-Version"] = revision === "2025-11-25" ? "2026-07-28" : "2025-11-25";
      break;
    case "invalid-session-id":
      if (revision === "2025-11-25") {
        headers["MCP-Session-Id"] = "wringer-invalid-session";
      }
      break;
  }
}
function sendHttpRequest(url, method, headers, body, timeoutMs) {
  const client = url.protocol === "https:" ? import_node_https.default : import_node_http.default;
  return new Promise((resolve5, reject) => {
    let responseBody = Buffer.alloc(0);
    let settled = false;
    const request = client.request(url, { method, headers, timeout: timeoutMs }, (response) => {
      response.on("data", (chunk) => {
        responseBody = Buffer.concat([responseBody, chunk]);
        if (responseBody.length > MAX_RESPONSE_BYTES) {
          request.destroy(new TransportError(`HTTP response exceeded ${MAX_RESPONSE_BYTES} bytes.`));
        }
      });
      response.once("aborted", () => {
        settled = true;
        resolve5({
          requestMethod: method,
          requestHeaders: { ...headers },
          requestBody: body.toString("utf8"),
          responseStatus: response.statusCode ?? 0,
          responseHeaders: normalizeHeaders(response.headers),
          responseBody: responseBody.toString("utf8"),
          responseAborted: true
        });
      });
      response.once("error", (error) => {
        if (!settled) {
          settled = true;
          reject(new TransportError(`HTTP response failed: ${error.message}`, { cause: error }));
        }
      });
      response.once("end", () => {
        settled = true;
        resolve5({
          requestMethod: method,
          requestHeaders: { ...headers },
          requestBody: body.toString("utf8"),
          responseStatus: response.statusCode ?? 0,
          responseHeaders: normalizeHeaders(response.headers),
          responseBody: responseBody.toString("utf8")
        });
      });
    });
    request.once("timeout", () => request.destroy(new TransportError("Timed out waiting for the HTTP response.")));
    request.once("error", (error) => {
      if (!settled) {
        settled = true;
        reject(error instanceof TransportError ? error : new TransportError(`HTTP request failed: ${error.message}`, { cause: error }));
      }
    });
    request.end(body);
  });
}
function buildRawRequest(url, method, headers, body, truncate) {
  const requestHeaders = { ...headers };
  requestHeaders.Connection = "close";
  requestHeaders["Content-Length"] = String(body.length + (truncate ? 20 : 0));
  const target = `${url.pathname}${url.search}`;
  const headerBytes = Buffer.from(
    `${method} ${target || "/"} HTTP/1.1\r
${Object.entries(requestHeaders).map(([key, value]) => `${key}: ${value}\r
`).join("")}\r
`,
    "utf8"
  );
  return Buffer.concat([headerBytes, body]);
}
function rawHttpRequest(url, requestBytes, timeoutMs, abortAfterHeaders) {
  const port = Number(url.port) || (url.protocol === "https:" ? 443 : 80);
  return new Promise((resolve5, reject) => {
    const socket = url.protocol === "https:" ? import_node_tls.default.connect({ host: url.hostname, port, servername: url.hostname }) : import_node_net.default.createConnection({ host: url.hostname, port });
    const chunks = [];
    let totalBytes = 0;
    let settled = false;
    socket.setTimeout(timeoutMs, () => {
      socket.destroy();
      if (!settled) {
        settled = true;
        reject(new TransportError("Timed out waiting for the raw HTTP response."));
      }
    });
    if (url.protocol === "https:") {
      socket.once("secureConnect", () => socket.end(requestBytes));
    } else {
      socket.once("connect", () => socket.end(requestBytes));
    }
    socket.on("data", (chunk) => {
      totalBytes += chunk.length;
      if (totalBytes > MAX_RESPONSE_BYTES) {
        socket.destroy();
        if (!settled) {
          settled = true;
          reject(new TransportError(`HTTP response exceeded ${MAX_RESPONSE_BYTES} bytes.`));
        }
        return;
      }
      chunks.push(chunk);
      if (abortAfterHeaders && Buffer.concat(chunks).includes(Buffer.from("\r\n\r\n"))) {
        socket.destroy();
        if (!settled) {
          settled = true;
          resolve5(parseRawResponse(Buffer.concat(chunks)));
        }
      }
    });
    socket.once("error", (error) => {
      if (!settled) {
        settled = true;
        reject(new TransportError(`Raw HTTP request failed: ${error.message}`, { cause: error }));
      }
    });
    socket.once("end", () => {
      if (!settled) {
        settled = true;
        resolve5(parseRawResponse(Buffer.concat(chunks)));
      }
    });
    socket.once("close", () => {
      if (!settled) {
        settled = true;
        resolve5(parseRawResponse(Buffer.concat(chunks)));
      }
    });
  });
}
function parseRawResponse(bytes) {
  const separator = bytes.indexOf(Buffer.from("\r\n\r\n"));
  if (separator < 0) {
    return {
      requestMethod: "POST",
      requestHeaders: {},
      requestBody: "",
      responseStatus: 0,
      responseHeaders: {},
      responseBody: bytes.toString("utf8")
    };
  }
  const headerText = bytes.subarray(0, separator).toString("latin1");
  const [statusLine = "", ...headerLines] = headerText.split("\r\n");
  const statusMatch = /^HTTP\/\d(?:\.\d)?\s+(\d{3})(?:\s+(.*))?$/u.exec(statusLine);
  const headers = {};
  for (const line of headerLines) {
    const colon = line.indexOf(":");
    if (colon > 0) {
      headers[line.slice(0, colon).trim().toLowerCase()] = line.slice(colon + 1).trim();
    }
  }
  return {
    requestMethod: "POST",
    requestHeaders: {},
    requestBody: "",
    responseStatus: statusMatch?.[1] === void 0 ? 0 : Number(statusMatch[1]),
    responseHeaders: headers,
    responseBody: bytes.subarray(separator + 4).toString("utf8")
  };
}
async function waitForSpawn2(child, spawnError, timeoutMs) {
  if (spawnError !== void 0) {
    throw new TargetError(`Could not start target: ${spawnError.message}`, { cause: spawnError });
  }
  if (child.pid !== void 0) {
    return;
  }
  await new Promise((resolve5, reject) => {
    const timer = setTimeout(() => reject(new TargetError("Timed out starting HTTP target.")), timeoutMs);
    child.once("spawn", () => {
      clearTimeout(timer);
      resolve5();
    });
    child.once("error", (error) => {
      clearTimeout(timer);
      reject(new TargetError(`Could not start target: ${error.message}`, { cause: error }));
    });
  });
}
async function waitForHttpListener(url, child, timeoutMs) {
  const deadline = import_node_perf_hooks2.performance.now() + timeoutMs;
  const port = Number(url.port) || (url.protocol === "https:" ? 443 : 80);
  while (import_node_perf_hooks2.performance.now() < deadline) {
    if (child.exitCode !== null || child.signalCode !== null) {
      throw new TargetError("The spawned HTTP target exited before its endpoint became ready.");
    }
    const connected = await new Promise((resolve5) => {
      const socket = import_node_net.default.createConnection({ host: url.hostname, port });
      socket.once("connect", () => {
        socket.destroy();
        resolve5(true);
      });
      socket.once("error", () => resolve5(false));
      socket.setTimeout(250, () => {
        socket.destroy();
        resolve5(false);
      });
    });
    if (connected) {
      return;
    }
    await new Promise((resolve5) => setTimeout(resolve5, 50));
  }
  throw new TargetError(`HTTP target did not become ready at ${url.origin} within ${timeoutMs} ms.`);
}
function parseTargetUrl(value) {
  let url;
  try {
    url = new URL(value);
  } catch (error) {
    throw new ScenarioError(`Invalid HTTP target URL: ${error instanceof Error ? error.message : String(error)}`);
  }
  if (url.protocol !== "http:" && url.protocol !== "https:" || url.username !== "" || url.password !== "") {
    throw new ScenarioError("HTTP target URL must use HTTP(S) and must not contain credentials.");
  }
  return url;
}
function isLoopbackHost(hostname) {
  const host = hostname.toLowerCase().replace(/^\[|\]$/gu, "");
  if (host === "localhost" || host === "::1") {
    return true;
  }
  const octets = host.split(".");
  return octets.length === 4 && Number(octets[0]) === 127 && octets.every((octet) => /^\d{1,3}$/u.test(octet) && Number(octet) <= 255);
}
function parseSseData(body) {
  const messages = [];
  let dataLines = [];
  for (const line of body.split(/\r?\n/u)) {
    if (line.length === 0) {
      if (dataLines.length > 0) {
        messages.push(dataLines.join("\n"));
        dataLines = [];
      }
    } else if (line.startsWith("data:")) {
      dataLines.push(line.slice(5).replace(/^ /u, ""));
    }
  }
  if (dataLines.length > 0) {
    messages.push(dataLines.join("\n"));
  }
  return messages;
}
function getResponseTimeout(scenario, message, fallback) {
  if (!isRecord5(message) || typeof message.id !== "string" && typeof message.id !== "number") {
    return fallback;
  }
  const responseStep = scenario.steps.find(
    (step) => step.type === "await-response" && step.id === message.id
  );
  return responseStep?.timeoutMs ?? fallback;
}
function parseRequestMessage(body) {
  try {
    const value = JSON.parse(body.toString("utf8"));
    return isJsonValue(value) ? value : void 0;
  } catch {
    return void 0;
  }
}
function parseJsonMessages(body, messages) {
  try {
    const value = JSON.parse(body);
    if (isJsonValue(value)) {
      messages.push(value);
    }
  } catch {
    return;
  }
}
function normalizeHeaders(headers) {
  const normalized = {};
  for (const [name, value] of Object.entries(headers)) {
    if (value !== void 0) {
      normalized[name.toLowerCase()] = value;
    }
  }
  return normalized;
}
function headerValue(headers, name) {
  const value = headers[name.toLowerCase()];
  return Array.isArray(value) ? value[0] : value;
}
function redactHeaders(headers, env) {
  const secrets = Object.values(env ?? {}).filter((value) => value.length > 0);
  const result = {};
  for (const [name, value] of Object.entries(headers)) {
    result[name.toLowerCase()] = Array.isArray(value) ? value.map((item) => redactString(item, secrets)) : redactString(value, secrets);
  }
  if (result["mcp-session-id"] !== void 0) {
    result["mcp-session-id"] = "[redacted]";
  }
  return result;
}
function redactBuffer(value, env) {
  return Buffer.from(redactString(value.toString("utf8"), Object.values(env ?? {}).filter((secret) => secret.length > 0)));
}
function redactString(value, secrets) {
  return secrets.reduce((result, secret) => result.replaceAll(secret, "[redacted]"), value);
}
function scenarioIsLegacy(revision) {
  return revision === "2025-11-25";
}
function isRecord5(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function isJsonValue(value) {
  if (value === null || typeof value === "string" || typeof value === "boolean") {
    return true;
  }
  if (typeof value === "number") {
    return Number.isFinite(value);
  }
  if (Array.isArray(value)) {
    return value.every(isJsonValue);
  }
  return isRecord5(value) && Object.values(value).every(isJsonValue);
}
var HttpTraceRecorder = class {
  #events = [];
  #secrets;
  #order = 0;
  constructor(env, inheritEnvironment) {
    this.#secrets = [
      ...Object.values(env),
      ...inheritEnvironment ? Object.values(process.env).filter((value) => value !== void 0) : []
    ].filter((value) => value.length > 0);
  }
  add(channel, bytes) {
    this.#push(channel, Buffer.from(redactString(bytes.toString("utf8"), this.#secrets)));
  }
  addHttp(channel, bytes, metadata) {
    const safeBytes = Buffer.from(redactString(bytes.toString("utf8"), this.#secrets));
    const safeMetadata = {
      ...metadata,
      headers: redactHeaders(metadata.headers, Object.fromEntries(this.#secrets.map((secret, index) => [`SECRET_${index}`, secret])))
    };
    this.#push(channel, safeBytes, safeMetadata);
  }
  flush() {
  }
  eventCount() {
    return this.#events.length;
  }
  toTrace(scenarioId, revision, fromIndex) {
    return {
      formatVersion: 1,
      scenarioId,
      specRevision: revision,
      transport: "streamable-http",
      events: this.#events.slice(fromIndex).map((event) => ({
        offsetMs: event.offsetMs,
        channel: event.channel,
        encoding: event.encoding,
        data: event.data,
        ...event.http === void 0 ? {} : { http: event.http }
      }))
    };
  }
  #push(channel, bytes, metadata) {
    const text = bytes.toString("utf8");
    const encoding = Buffer.from(text, "utf8").equals(bytes) ? "utf8" : "base64";
    const event = {
      offsetMs: Math.max(0, import_node_perf_hooks2.performance.now() - this.#startedAt),
      channel,
      encoding,
      data: encoding === "utf8" ? text : bytes.toString("base64"),
      ...metadata === void 0 ? {} : { http: metadata },
      order: this.#order++
    };
    this.#events.push(event);
  }
  #startedAt = import_node_perf_hooks2.performance.now();
};

// src/transports/registry.ts
var transportRegistry = new ExtensionRegistry();
transportRegistry.register("stdio", {
  createSession(options) {
    if (options.transport === "streamable-http") {
      throw new ScenarioError("The stdio transport requires a spawned command target.");
    }
    return new StdioScenarioSession(options);
  },
  run(options) {
    if (options.transport === "streamable-http") {
      throw new ScenarioError("The stdio transport requires a spawned command target.");
    }
    return runStdioScenario(options);
  }
});
transportRegistry.register("streamable-http", {
  createSession(options) {
    if (options.transport !== "streamable-http") {
      throw new ScenarioError("The Streamable HTTP transport requires an HTTP target URL.");
    }
    return new HttpScenarioSession(options);
  },
  run(options) {
    if (options.transport !== "streamable-http") {
      throw new ScenarioError("The Streamable HTTP transport requires an HTTP target URL.");
    }
    return runHttpScenario(options);
  }
});

// src/cli/inspect.ts
async function inspectServer(specRevision, targetOrCommand, args, options = {}) {
  const target = typeof targetOrCommand === "string" ? {
    transport: "stdio",
    command: targetOrCommand,
    args: args ?? [],
    ...options
  } : targetOrCommand;
  const profile = specProfiles.get(specRevision);
  const methods = [
    profile.toolListMethod,
    profile.resourceListMethod,
    profile.promptListMethod
  ];
  const steps = profile.lifecycleSteps("inspect");
  methods.forEach((method, index) => {
    const id = `inspect-${index + 1}`;
    steps.push(
      { type: "send", message: profile.request(method, id) },
      { type: "await-response", id }
    );
  });
  const scenario = {
    formatVersion: 1,
    id: `inspect-${specRevision}`,
    specRevision,
    description: "Read-only MCP surface inspection.",
    steps
  };
  const { responses } = await transportRegistry.get(target.transport ?? "stdio").run({
    ...target,
    scenario
  });
  if (responses.length !== methods.length + (specRevision === "2025-11-25" ? 1 : 0)) {
    throw new ScenarioError("Target did not return all expected responses during inspection.");
  }
  const listResponses = responses.slice(responses.length - methods.length);
  const tools = getArray(listResponses[0], "tools").flatMap((item) => {
    if (!isRecord6(item) || typeof item.name !== "string") {
      return [];
    }
    const annotations = isRecord6(item.annotations) ? item.annotations : {};
    const safety = annotations.destructiveHint === true ? "requires-exact-name-allow" : annotations.readOnlyHint === true ? "read-only" : "requires-explicit-allow";
    const inputSchema = item.inputSchema;
    return [{
      name: item.name,
      safety,
      ...inputSchema === void 0 ? {} : { inputSchema }
    }];
  });
  const resources = getArray(listResponses[1], "resources").flatMap((item) => {
    if (!isRecord6(item) || typeof item.name !== "string" || typeof item.uri !== "string") {
      return [];
    }
    return [{ name: item.name, uri: item.uri }];
  });
  const prompts = getArray(listResponses[2], "prompts").flatMap((item) => {
    if (!isRecord6(item) || typeof item.name !== "string") {
      return [];
    }
    return [{ name: item.name }];
  });
  return { specRevision, tools, resources, prompts };
}
function getArray(response, key) {
  if (!isRecord6(response) || !isRecord6(response.result) || !Array.isArray(response.result[key])) {
    throw new ScenarioError(`Inspection response is missing result.${key}.`);
  }
  return response.result[key];
}
function isRecord6(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// src/generators/index.ts
var fc2 = __toESM(require("fast-check"), 1);

// src/generators/argument-strategies.ts
var fc = __toESM(require("fast-check"), 1);
var argumentStrategyRegistry = new ExtensionRegistry();
var genericStrategy = {
  matches() {
    return true;
  },
  generate(context) {
    return generateSchemaValue(context.schema, context.seed, 0);
  }
};
argumentStrategyRegistry.register("generic-json-schema", genericStrategy);
function generateToolArguments(toolName, schemaValue, seed, selections) {
  const schema = isRecord7(schemaValue) ? schemaValue : { type: "object", properties: {} };
  if (schema.type !== "object") {
    throw new ScenarioError(`Tool '${toolName}' input schema must describe an object.`);
  }
  const properties = isRecord7(schema.properties) ? schema.properties : {};
  const candidates = selections === void 0 ? argumentStrategyRegistry.names().map((name) => ({
    name,
    enabled: true,
    options: {}
  })) : selections.filter((selection) => selection.enabled);
  const args = {};
  for (const key of Object.keys(properties).sort()) {
    const propertySchema = properties[key];
    if (!isRecord7(propertySchema)) {
      continue;
    }
    args[key] = generatePropertyValue(toolName, key, propertySchema, seed, candidates);
  }
  const required = Array.isArray(schema.required) ? schema.required.filter((key) => typeof key === "string") : [];
  for (const key of required) {
    if (!(key in args)) {
      const propertySchema = properties[key];
      if (!isRecord7(propertySchema)) {
        throw new ScenarioError(`Required argument '${key}' for tool '${toolName}' has no usable schema.`);
      }
      args[key] = generatePropertyValue(toolName, key, propertySchema, seed, candidates);
    }
  }
  return args;
}
function generatePropertyValue(toolName, key, schema, seed, selections) {
  const path = `/properties/${escapePointer(key)}`;
  for (const selection of selections) {
    const strategy = argumentStrategyRegistry.get(selection.name);
    const context = {
      toolName,
      path,
      schema,
      options: selection.options
    };
    if (strategy.matches(context)) {
      return ensureJsonValue(strategy.generate({
        ...context,
        seed: deriveSeed(seed, toolName, path)
      }));
    }
  }
  throw new ScenarioError(`No argument strategy matched '${toolName}${path}'.`);
}
function generateSchemaValue(schema, seed, depth) {
  if (depth > 8) {
    return ensureJsonValue(fc.sample(fc.jsonValue({ maxDepth: 2 }), { seed, numRuns: 1 })[0] ?? null);
  }
  if (Array.isArray(schema.enum) && schema.enum.length > 0) {
    const choices = schema.enum.filter(isJsonValue2);
    return sample2(fc.constantFrom(...choices), seed);
  }
  if ("const" in schema && isJsonValue2(schema.const)) {
    return schema.const;
  }
  for (const keyword of ["anyOf", "oneOf"]) {
    const alternatives = schema[keyword];
    if (Array.isArray(alternatives) && alternatives.some(isRecord7)) {
      const alternativesForSchema = alternatives.filter(isRecord7);
      const selected = sample2(fc.integer({ min: 0, max: alternativesForSchema.length - 1 }), seed);
      return generateSchemaValue(alternativesForSchema[selected] ?? {}, deriveSeed(seed, keyword), depth + 1);
    }
  }
  const types = typeof schema.type === "string" ? [schema.type] : Array.isArray(schema.type) ? schema.type.filter((value) => typeof value === "string") : ["object"];
  const selectedType = sample2(fc.constantFrom(...types), seed);
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
      return sample2(fc.boolean(), seed);
    case "null":
      return null;
    default:
      return ensureJsonValue(fc.sample(fc.jsonValue({ maxDepth: 3 }), { seed, numRuns: 1 })[0] ?? null);
  }
}
function generateObject(schema, seed, depth) {
  const properties = isRecord7(schema.properties) ? schema.properties : {};
  const required = new Set(Array.isArray(schema.required) ? schema.required.filter((key) => typeof key === "string") : []);
  const value = {};
  for (const key of Object.keys(properties).sort()) {
    const propertySchema = properties[key];
    if (!isRecord7(propertySchema)) {
      continue;
    }
    if (required.has(key) || sample2(fc.boolean(), deriveSeed(seed, "include", key))) {
      value[key] = generateSchemaValue(propertySchema, deriveSeed(seed, "property", key), depth + 1);
    }
  }
  return value;
}
function generateArray(schema, seed, depth) {
  const min = integerValue(schema.minItems, 0, 0, 4);
  const max = integerValue(schema.maxItems, Math.max(1, min), min, 4);
  const length = sample2(fc.integer({ min, max }), seed);
  const itemSchema = isRecord7(schema.items) ? schema.items : {};
  return Array.from({ length }, (_, index) => generateSchemaValue(itemSchema, deriveSeed(seed, "item", String(index)), depth + 1));
}
function generateString(schema, seed) {
  const minLength = integerValue(schema.minLength, 0, 0, 32);
  const maxLength = integerValue(schema.maxLength, Math.max(minLength, 16), minLength, 64);
  const pattern = typeof schema.pattern === "string" ? new RegExp(schema.pattern) : void 0;
  let arbitrary = fc.string({ minLength, maxLength });
  if (pattern !== void 0) {
    arbitrary = arbitrary.filter((value) => pattern.test(value));
  }
  return sample2(arbitrary, seed);
}
function generateNumber(schema, seed, integer2) {
  const minimum = finiteNumber(schema.minimum) ?? finiteNumber(schema.exclusiveMinimum) ?? -100;
  const maximum = finiteNumber(schema.maximum) ?? finiteNumber(schema.exclusiveMaximum) ?? 100;
  if (minimum > maximum) {
    throw new ScenarioError("Cannot generate a number from an inverted JSON Schema range.");
  }
  if (integer2) {
    const min = Math.ceil(minimum);
    const max = Math.floor(maximum);
    if (min > max) {
      throw new ScenarioError("Cannot generate an integer from the JSON Schema range.");
    }
    return sample2(fc.integer({ min, max }), seed);
  }
  return sample2(fc.double({ min: minimum, max: maximum, noNaN: true }), seed);
}
function sample2(arbitrary, seed) {
  const value = fc.sample(arbitrary, { seed, numRuns: 1 })[0];
  if (value === void 0) {
    throw new ScenarioError("JSON Schema argument strategy could not produce a value.");
  }
  return value;
}
function ensureJsonValue(value) {
  if (!isJsonValue2(value)) {
    throw new ScenarioError("Argument strategy returned a value that is not JSON-serializable.");
  }
  return value;
}
function isJsonValue2(value) {
  if (value === null || typeof value === "string" || typeof value === "boolean") {
    return true;
  }
  if (typeof value === "number") {
    return Number.isFinite(value);
  }
  if (Array.isArray(value)) {
    return value.every(isJsonValue2);
  }
  return isRecord7(value) && Object.values(value).every(isJsonValue2);
}
function isRecord7(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function finiteNumber(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : void 0;
}
function integerValue(value, fallback, min, max) {
  return typeof value === "number" && Number.isInteger(value) ? Math.min(max, Math.max(min, value)) : fallback;
}
function escapePointer(value) {
  return value.replaceAll("~", "~0").replaceAll("/", "~1");
}

// src/generators/index.ts
var generatorNames = [
  "schema-valid",
  "schema-mutated",
  "jsonrpc-envelope",
  "raw-json",
  "sequence",
  "tool-args",
  "resources",
  "prompts",
  "wire-fault"
];
var generatorRegistry = new ExtensionRegistry();
function register(name, generator) {
  generatorRegistry.register(name, generator);
}
for (const name of generatorNames) {
  register(name, { generate: (context) => generateByName(name, context) });
}
function generateScenarios(revision, surface, seed, count, names = generatorNames, transport = "stdio", argumentStrategies) {
  const available = new Set(generatorRegistry.names());
  const selected = names.filter((name) => available.has(name));
  if (selected.length === 0 || count <= 0) {
    return [];
  }
  const scenarios = [];
  for (let caseIndex = 0; scenarios.length < count; caseIndex += 1) {
    const name = selected[caseIndex % selected.length];
    if (name === void 0) {
      break;
    }
    const context = {
      seed: deriveSeed(seed, name, String(caseIndex)),
      revision,
      surface,
      caseIndex,
      transport,
      ...argumentStrategies === void 0 ? {} : { argumentStrategies }
    };
    scenarios.push(generatorRegistry.get(name).generate(context));
  }
  return scenarios;
}
function generateByName(name, context) {
  const profile = specProfiles.get(context.revision);
  const id = `seed-${context.seed}-${name}-${context.caseIndex}`;
  let steps;
  switch (name) {
    case "schema-valid": {
      const methods = [profile.toolListMethod, profile.resourceListMethod, profile.promptListMethod];
      const method = sample4(fc2.constantFrom(...methods), context.seed);
      steps = requestSteps(profile, method, `${id}-request`);
      break;
    }
    case "schema-mutated": {
      const request = profile.request("tools/list", `${id}-mutated`);
      steps = [
        { type: "send", message: { ...asObject(request), jsonrpc: "1.0" } },
        { type: "await-response", id: `${id}-mutated`, timeoutMs: 250 }
      ];
      break;
    }
    case "jsonrpc-envelope": {
      const invalidId = `${id}-invalid-envelope`;
      steps = [
        {
          type: "send",
          message: { jsonrpc: "1.0", id: invalidId, method: "fixture/invalid-envelope" }
        },
        { type: "await-response", id: invalidId, timeoutMs: 250 },
        {
          type: "send",
          message: { jsonrpc: "2.0", id: `${id}-unknown`, method: "fixture/unknown-method" }
        },
        { type: "await-response", id: `${id}-unknown`, timeoutMs: 250 }
      ];
      break;
    }
    case "raw-json":
      steps = [
        { type: "send-raw", bytesBase64: Buffer.from("{not-json}\n").toString("base64") },
        ...requestSteps(profile, profile.toolListMethod, `${id}-after-raw`)
      ];
      break;
    case "sequence": {
      const first = profile.request(profile.toolListMethod, `${id}-tools`);
      const second = profile.request(profile.resourceListMethod, `${id}-resources`);
      const third = profile.request(profile.promptListMethod, `${id}-prompts`);
      steps = [first, second, third].flatMap((message) => requestSteps(profile, methodOf(message), idOf(message)));
      break;
    }
    case "tool-args":
      steps = toolCallSteps(context, id);
      break;
    case "resources":
      steps = resourceSteps(context, id);
      break;
    case "prompts":
      steps = promptSteps(context, id);
      break;
    case "wire-fault":
      steps = context.transport === "streamable-http" ? httpWireFaultSteps(context, id) : wireFaultSteps(context, id);
      break;
  }
  const bootstrap = context.revision === "2026-07-28" ? requestSteps(profile, "server/discover", `${id}-discover`) : [];
  return {
    formatVersion: 1,
    id,
    specRevision: context.revision,
    description: `Generated by ${name}.`,
    steps: [...profile.lifecycleSteps(`${id}-lifecycle`), ...bootstrap, ...steps]
  };
}
function toolCallSteps(context, id) {
  const tool = context.surface.tools.filter((candidate) => candidate.safety === "read-only").sort((left, right) => left.name.localeCompare(right.name))[0];
  if (tool === void 0) {
    return requestSteps(specProfiles.get(context.revision), "tools/list", `${id}-tools`);
  }
  const argumentsValue = generateToolArguments(tool.name, tool.inputSchema, context.seed, context.argumentStrategies);
  const profile = specProfiles.get(context.revision);
  return requestSteps(profile, "tools/call", `${id}-call`, { name: tool.name, arguments: argumentsValue });
}
function resourceSteps(context, id) {
  const profile = specProfiles.get(context.revision);
  const resource = [...context.surface.resources].sort((left, right) => left.uri.localeCompare(right.uri))[0];
  if (resource === void 0) {
    return requestSteps(profile, profile.resourceListMethod, `${id}-resources`);
  }
  return requestSteps(profile, "resources/read", `${id}-read`, { uri: resource.uri });
}
function promptSteps(context, id) {
  const profile = specProfiles.get(context.revision);
  const prompt = [...context.surface.prompts].sort((left, right) => left.name.localeCompare(right.name))[0];
  if (prompt === void 0) {
    return requestSteps(profile, profile.promptListMethod, `${id}-prompts`);
  }
  return requestSteps(profile, "prompts/get", `${id}-get`, { name: prompt.name, arguments: {} });
}
function httpWireFaultSteps(context, id) {
  const profile = specProfiles.get(context.revision);
  const request = profile.request("tools/list", `${id}-wire`);
  const faults = [
    "missing-accept",
    "missing-content-type",
    "invalid-content-type",
    "missing-protocol-version",
    "mismatched-protocol-version",
    context.revision === "2025-11-25" ? "invalid-session-id" : "wrong-method",
    "truncated-body",
    "oversized-body",
    "abort-response",
    "concurrent-requests"
  ];
  const fault = faults[context.caseIndex % faults.length] ?? faults[0] ?? "missing-accept";
  return [
    {
      type: "send",
      message: request,
      wire: { transport: "streamable-http", fault }
    },
    { type: "await-response", id: `${id}-wire`, timeoutMs: 1e3 }
  ];
}
function wireFaultSteps(context, id) {
  const profile = specProfiles.get(context.revision);
  const request = profile.request("tools/list", `${id}-wire`);
  const bytes = Buffer.from(`${JSON.stringify(request)}
`);
  const text = bytes.toString("utf8");
  switch (context.caseIndex % 10) {
    case 0:
      return [{
        type: "send",
        message: request,
        wire: { transport: "stdio", chunks: [1, 2, 3], delayMs: 500 }
      }, { type: "await-response", id: `${id}-wire`, timeoutMs: 1e3 }];
    case 1: {
      const second = profile.request("resources/list", `${id}-wire-second`);
      const coalesced = `${text}${JSON.stringify(second)}
`;
      return [
        { type: "send-raw", bytesBase64: Buffer.from(coalesced).toString("base64") },
        { type: "await-response", id: `${id}-wire`, timeoutMs: 1e3 },
        { type: "await-response", id: `${id}-wire-second`, timeoutMs: 1e3 }
      ];
    }
    case 2:
      return [
        { type: "send-raw", bytesBase64: Buffer.from(JSON.stringify(request)).toString("base64") },
        { type: "transport", operation: "close-stdin" }
      ];
    case 3:
      return [
        { type: "send-raw", bytesBase64: Buffer.from(`${text}
`).toString("base64") },
        { type: "await-response", id: `${id}-wire`, timeoutMs: 1e3 }
      ];
    case 4:
      return [
        { type: "send-raw", bytesBase64: Buffer.from(`${JSON.stringify(request)}\r
`).toString("base64") },
        { type: "await-response", id: `${id}-wire`, timeoutMs: 1e3 }
      ];
    case 5:
      return [
        { type: "send-raw", bytesBase64: Buffer.from([255, 10]).toString("base64") },
        ...requestSteps(profile, "tools/list", `${id}-after-binary`)
      ];
    case 6:
      return [
        { type: "send-raw", bytesBase64: Buffer.from(`\uFEFF${text}`).toString("base64") },
        ...requestSteps(profile, "tools/list", `${id}-after-bom`)
      ];
    case 7:
      return [
        { type: "send-raw", bytesBase64: Buffer.from(`${JSON.stringify({ ...asObject(request), padding: "x".repeat(7e4) })}
`).toString("base64") },
        { type: "await-response", id: `${id}-wire`, timeoutMs: 1e3 }
      ];
    case 8:
      return [
        { type: "send-raw", bytesBase64: Buffer.from(text.slice(0, -2)).toString("base64") },
        { type: "transport", operation: "close-stdin" }
      ];
    default:
      return [
        {
          type: "send",
          message: request,
          wire: { transport: "stdio", chunks: [1], delayMs: 60 }
        },
        { type: "await-response", id: `${id}-wire`, timeoutMs: 1e3 }
      ];
  }
}
function requestSteps(profile, method, id, params) {
  return [
    { type: "send", message: profile.request(method, id, params) },
    { type: "await-response", id, timeoutMs: 1e3 }
  ];
}
function sample4(arbitrary, seed) {
  const value = fc2.sample(arbitrary, { seed, numRuns: 1 })[0];
  if (value === void 0) {
    throw new Error("Could not sample a value for a generated scenario.");
  }
  return value;
}
function asObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value : {};
}
function methodOf(value) {
  const object = asObject(value);
  return typeof object.method === "string" ? object.method : "unknown";
}
function idOf(value) {
  const object = asObject(value);
  return typeof object.id === "string" || typeof object.id === "number" ? object.id : "generated";
}

// src/oracles/registry.ts
var oracleRegistry = new ExtensionRegistry();

// src/oracles/schema-validator.ts
var import__ = require("ajv/dist/2020.js");

// spec/2025-11-25/schema.json
var schema_default = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $defs: {
    Annotations: {
      description: "Optional annotations for the client. The client can use annotations to inform how objects are used or displayed",
      properties: {
        audience: {
          description: 'Describes who the intended audience of this object or data is.\n\nIt can include multiple entries to indicate content useful for multiple audiences (e.g., `["user", "assistant"]`).',
          items: {
            $ref: "#/$defs/Role"
          },
          type: "array"
        },
        lastModified: {
          description: 'The moment the resource was last modified, as an ISO 8601 formatted string.\n\nShould be an ISO 8601 formatted string (e.g., "2025-01-12T15:00:58Z").\n\nExamples: last activity timestamp in an open file, timestamp when the resource\nwas attached, etc.',
          type: "string"
        },
        priority: {
          description: 'Describes how important this data is for operating the server.\n\nA value of 1 means "most important," and indicates that the data is\neffectively required, while 0 means "least important," and indicates that\nthe data is entirely optional.',
          maximum: 1,
          minimum: 0,
          type: "number"
        }
      },
      type: "object"
    },
    AudioContent: {
      description: "Audio provided to or from an LLM.",
      properties: {
        _meta: {
          additionalProperties: {},
          description: "See [General fields: `_meta`](/specification/2025-11-25/basic/index#meta) for notes on `_meta` usage.",
          type: "object"
        },
        annotations: {
          $ref: "#/$defs/Annotations",
          description: "Optional annotations for the client."
        },
        data: {
          description: "The base64-encoded audio data.",
          format: "byte",
          type: "string"
        },
        mimeType: {
          description: "The MIME type of the audio. Different providers may support different audio types.",
          type: "string"
        },
        type: {
          const: "audio",
          type: "string"
        }
      },
      required: [
        "data",
        "mimeType",
        "type"
      ],
      type: "object"
    },
    BaseMetadata: {
      description: "Base interface for metadata with name (identifier) and title (display name) properties.",
      properties: {
        name: {
          description: "Intended for programmatic or logical use, but used as a display name in past specs or fallback (if title isn't present).",
          type: "string"
        },
        title: {
          description: "Intended for UI and end-user contexts \u2014 optimized to be human-readable and easily understood,\neven by those unfamiliar with domain-specific terminology.\n\nIf not provided, the name should be used for display (except for Tool,\nwhere `annotations.title` should be given precedence over using `name`,\nif present).",
          type: "string"
        }
      },
      required: [
        "name"
      ],
      type: "object"
    },
    BlobResourceContents: {
      properties: {
        _meta: {
          additionalProperties: {},
          description: "See [General fields: `_meta`](/specification/2025-11-25/basic/index#meta) for notes on `_meta` usage.",
          type: "object"
        },
        blob: {
          description: "A base64-encoded string representing the binary data of the item.",
          format: "byte",
          type: "string"
        },
        mimeType: {
          description: "The MIME type of this resource, if known.",
          type: "string"
        },
        uri: {
          description: "The URI of this resource.",
          format: "uri",
          type: "string"
        }
      },
      required: [
        "blob",
        "uri"
      ],
      type: "object"
    },
    BooleanSchema: {
      properties: {
        default: {
          type: "boolean"
        },
        description: {
          type: "string"
        },
        title: {
          type: "string"
        },
        type: {
          const: "boolean",
          type: "string"
        }
      },
      required: [
        "type"
      ],
      type: "object"
    },
    CallToolRequest: {
      description: "Used by the client to invoke a tool provided by the server.",
      properties: {
        id: {
          $ref: "#/$defs/RequestId"
        },
        jsonrpc: {
          const: "2.0",
          type: "string"
        },
        method: {
          const: "tools/call",
          type: "string"
        },
        params: {
          $ref: "#/$defs/CallToolRequestParams"
        }
      },
      required: [
        "id",
        "jsonrpc",
        "method",
        "params"
      ],
      type: "object"
    },
    CallToolRequestParams: {
      description: "Parameters for a `tools/call` request.",
      properties: {
        _meta: {
          additionalProperties: {},
          description: "See [General fields: `_meta`](/specification/2025-11-25/basic/index#meta) for notes on `_meta` usage.",
          properties: {
            progressToken: {
              $ref: "#/$defs/ProgressToken",
              description: "If specified, the caller is requesting out-of-band progress notifications for this request (as represented by notifications/progress). The value of this parameter is an opaque token that will be attached to any subsequent notifications. The receiver is not obligated to provide these notifications."
            }
          },
          type: "object"
        },
        arguments: {
          additionalProperties: {},
          description: "Arguments to use for the tool call.",
          type: "object"
        },
        name: {
          description: "The name of the tool.",
          type: "string"
        },
        task: {
          $ref: "#/$defs/TaskMetadata",
          description: "If specified, the caller is requesting task-augmented execution for this request.\nThe request will return a CreateTaskResult immediately, and the actual result can be\nretrieved later via tasks/result.\n\nTask augmentation is subject to capability negotiation - receivers MUST declare support\nfor task augmentation of specific request types in their capabilities."
        }
      },
      required: [
        "name"
      ],
      type: "object"
    },
    CallToolResult: {
      description: "The server's response to a tool call.",
      properties: {
        _meta: {
          additionalProperties: {},
          description: "See [General fields: `_meta`](/specification/2025-11-25/basic/index#meta) for notes on `_meta` usage.",
          type: "object"
        },
        content: {
          description: "A list of content objects that represent the unstructured result of the tool call.",
          items: {
            $ref: "#/$defs/ContentBlock"
          },
          type: "array"
        },
        isError: {
          description: "Whether the tool call ended in an error.\n\nIf not set, this is assumed to be false (the call was successful).\n\nAny errors that originate from the tool SHOULD be reported inside the result\nobject, with `isError` set to true, _not_ as an MCP protocol-level error\nresponse. Otherwise, the LLM would not be able to see that an error occurred\nand self-correct.\n\nHowever, any errors in _finding_ the tool, an error indicating that the\nserver does not support tool calls, or any other exceptional conditions,\nshould be reported as an MCP error response.",
          type: "boolean"
        },
        structuredContent: {
          additionalProperties: {},
          description: "An optional JSON object that represents the structured result of the tool call.",
          type: "object"
        }
      },
      required: [
        "content"
      ],
      type: "object"
    },
    CancelTaskRequest: {
      description: "A request to cancel a task.",
      properties: {
        id: {
          $ref: "#/$defs/RequestId"
        },
        jsonrpc: {
          const: "2.0",
          type: "string"
        },
        method: {
          const: "tasks/cancel",
          type: "string"
        },
        params: {
          properties: {
            taskId: {
              description: "The task identifier to cancel.",
              type: "string"
            }
          },
          required: [
            "taskId"
          ],
          type: "object"
        }
      },
      required: [
        "id",
        "jsonrpc",
        "method",
        "params"
      ],
      type: "object"
    },
    CancelTaskResult: {
      allOf: [
        {
          $ref: "#/$defs/Result"
        },
        {
          $ref: "#/$defs/Task"
        }
      ],
      description: "The response to a tasks/cancel request."
    },
    CancelledNotification: {
      description: "This notification can be sent by either side to indicate that it is cancelling a previously-issued request.\n\nThe request SHOULD still be in-flight, but due to communication latency, it is always possible that this notification MAY arrive after the request has already finished.\n\nThis notification indicates that the result will be unused, so any associated processing SHOULD cease.\n\nA client MUST NOT attempt to cancel its `initialize` request.\n\nFor task cancellation, use the `tasks/cancel` request instead of this notification.",
      properties: {
        jsonrpc: {
          const: "2.0",
          type: "string"
        },
        method: {
          const: "notifications/cancelled",
          type: "string"
        },
        params: {
          $ref: "#/$defs/CancelledNotificationParams"
        }
      },
      required: [
        "jsonrpc",
        "method",
        "params"
      ],
      type: "object"
    },
    CancelledNotificationParams: {
      description: "Parameters for a `notifications/cancelled` notification.",
      properties: {
        _meta: {
          additionalProperties: {},
          description: "See [General fields: `_meta`](/specification/2025-11-25/basic/index#meta) for notes on `_meta` usage.",
          type: "object"
        },
        reason: {
          description: "An optional string describing the reason for the cancellation. This MAY be logged or presented to the user.",
          type: "string"
        },
        requestId: {
          $ref: "#/$defs/RequestId",
          description: "The ID of the request to cancel.\n\nThis MUST correspond to the ID of a request previously issued in the same direction.\nThis MUST be provided for cancelling non-task requests.\nThis MUST NOT be used for cancelling tasks (use the `tasks/cancel` request instead)."
        }
      },
      type: "object"
    },
    ClientCapabilities: {
      description: "Capabilities a client may support. Known capabilities are defined here, in this schema, but this is not a closed set: any client can define its own, additional capabilities.",
      properties: {
        elicitation: {
          description: "Present if the client supports elicitation from the server.",
          properties: {
            form: {
              additionalProperties: true,
              properties: {},
              type: "object"
            },
            url: {
              additionalProperties: true,
              properties: {},
              type: "object"
            }
          },
          type: "object"
        },
        experimental: {
          additionalProperties: {
            additionalProperties: true,
            properties: {},
            type: "object"
          },
          description: "Experimental, non-standard capabilities that the client supports.",
          type: "object"
        },
        roots: {
          description: "Present if the client supports listing roots.",
          properties: {
            listChanged: {
              description: "Whether the client supports notifications for changes to the roots list.",
              type: "boolean"
            }
          },
          type: "object"
        },
        sampling: {
          description: "Present if the client supports sampling from an LLM.",
          properties: {
            context: {
              additionalProperties: true,
              description: 'Whether the client supports context inclusion via includeContext parameter.\nIf not declared, servers SHOULD only use `includeContext: "none"` (or omit it).',
              properties: {},
              type: "object"
            },
            tools: {
              additionalProperties: true,
              description: "Whether the client supports tool use via tools and toolChoice parameters.",
              properties: {},
              type: "object"
            }
          },
          type: "object"
        },
        tasks: {
          description: "Present if the client supports task-augmented requests.",
          properties: {
            cancel: {
              additionalProperties: true,
              description: "Whether this client supports tasks/cancel.",
              properties: {},
              type: "object"
            },
            list: {
              additionalProperties: true,
              description: "Whether this client supports tasks/list.",
              properties: {},
              type: "object"
            },
            requests: {
              description: "Specifies which request types can be augmented with tasks.",
              properties: {
                elicitation: {
                  description: "Task support for elicitation-related requests.",
                  properties: {
                    create: {
                      additionalProperties: true,
                      description: "Whether the client supports task-augmented elicitation/create requests.",
                      properties: {},
                      type: "object"
                    }
                  },
                  type: "object"
                },
                sampling: {
                  description: "Task support for sampling-related requests.",
                  properties: {
                    createMessage: {
                      additionalProperties: true,
                      description: "Whether the client supports task-augmented sampling/createMessage requests.",
                      properties: {},
                      type: "object"
                    }
                  },
                  type: "object"
                }
              },
              type: "object"
            }
          },
          type: "object"
        }
      },
      type: "object"
    },
    ClientNotification: {
      anyOf: [
        {
          $ref: "#/$defs/CancelledNotification"
        },
        {
          $ref: "#/$defs/InitializedNotification"
        },
        {
          $ref: "#/$defs/ProgressNotification"
        },
        {
          $ref: "#/$defs/TaskStatusNotification"
        },
        {
          $ref: "#/$defs/RootsListChangedNotification"
        }
      ]
    },
    ClientRequest: {
      anyOf: [
        {
          $ref: "#/$defs/InitializeRequest"
        },
        {
          $ref: "#/$defs/PingRequest"
        },
        {
          $ref: "#/$defs/ListResourcesRequest"
        },
        {
          $ref: "#/$defs/ListResourceTemplatesRequest"
        },
        {
          $ref: "#/$defs/ReadResourceRequest"
        },
        {
          $ref: "#/$defs/SubscribeRequest"
        },
        {
          $ref: "#/$defs/UnsubscribeRequest"
        },
        {
          $ref: "#/$defs/ListPromptsRequest"
        },
        {
          $ref: "#/$defs/GetPromptRequest"
        },
        {
          $ref: "#/$defs/ListToolsRequest"
        },
        {
          $ref: "#/$defs/CallToolRequest"
        },
        {
          $ref: "#/$defs/GetTaskRequest"
        },
        {
          $ref: "#/$defs/GetTaskPayloadRequest"
        },
        {
          $ref: "#/$defs/CancelTaskRequest"
        },
        {
          $ref: "#/$defs/ListTasksRequest"
        },
        {
          $ref: "#/$defs/SetLevelRequest"
        },
        {
          $ref: "#/$defs/CompleteRequest"
        }
      ]
    },
    ClientResult: {
      anyOf: [
        {
          $ref: "#/$defs/Result"
        },
        {
          $ref: "#/$defs/GetTaskResult",
          description: "The response to a tasks/get request."
        },
        {
          $ref: "#/$defs/GetTaskPayloadResult"
        },
        {
          $ref: "#/$defs/CancelTaskResult",
          description: "The response to a tasks/cancel request."
        },
        {
          $ref: "#/$defs/ListTasksResult"
        },
        {
          $ref: "#/$defs/CreateMessageResult"
        },
        {
          $ref: "#/$defs/ListRootsResult"
        },
        {
          $ref: "#/$defs/ElicitResult"
        }
      ]
    },
    CompleteRequest: {
      description: "A request from the client to the server, to ask for completion options.",
      properties: {
        id: {
          $ref: "#/$defs/RequestId"
        },
        jsonrpc: {
          const: "2.0",
          type: "string"
        },
        method: {
          const: "completion/complete",
          type: "string"
        },
        params: {
          $ref: "#/$defs/CompleteRequestParams"
        }
      },
      required: [
        "id",
        "jsonrpc",
        "method",
        "params"
      ],
      type: "object"
    },
    CompleteRequestParams: {
      description: "Parameters for a `completion/complete` request.",
      properties: {
        _meta: {
          additionalProperties: {},
          description: "See [General fields: `_meta`](/specification/2025-11-25/basic/index#meta) for notes on `_meta` usage.",
          properties: {
            progressToken: {
              $ref: "#/$defs/ProgressToken",
              description: "If specified, the caller is requesting out-of-band progress notifications for this request (as represented by notifications/progress). The value of this parameter is an opaque token that will be attached to any subsequent notifications. The receiver is not obligated to provide these notifications."
            }
          },
          type: "object"
        },
        argument: {
          description: "The argument's information",
          properties: {
            name: {
              description: "The name of the argument",
              type: "string"
            },
            value: {
              description: "The value of the argument to use for completion matching.",
              type: "string"
            }
          },
          required: [
            "name",
            "value"
          ],
          type: "object"
        },
        context: {
          description: "Additional, optional context for completions",
          properties: {
            arguments: {
              additionalProperties: {
                type: "string"
              },
              description: "Previously-resolved variables in a URI template or prompt.",
              type: "object"
            }
          },
          type: "object"
        },
        ref: {
          anyOf: [
            {
              $ref: "#/$defs/PromptReference"
            },
            {
              $ref: "#/$defs/ResourceTemplateReference"
            }
          ]
        }
      },
      required: [
        "argument",
        "ref"
      ],
      type: "object"
    },
    CompleteResult: {
      description: "The server's response to a completion/complete request",
      properties: {
        _meta: {
          additionalProperties: {},
          description: "See [General fields: `_meta`](/specification/2025-11-25/basic/index#meta) for notes on `_meta` usage.",
          type: "object"
        },
        completion: {
          properties: {
            hasMore: {
              description: "Indicates whether there are additional completion options beyond those provided in the current response, even if the exact total is unknown.",
              type: "boolean"
            },
            total: {
              description: "The total number of completion options available. This can exceed the number of values actually sent in the response.",
              type: "integer"
            },
            values: {
              description: "An array of completion values. Must not exceed 100 items.",
              items: {
                type: "string"
              },
              type: "array"
            }
          },
          required: [
            "values"
          ],
          type: "object"
        }
      },
      required: [
        "completion"
      ],
      type: "object"
    },
    ContentBlock: {
      anyOf: [
        {
          $ref: "#/$defs/TextContent"
        },
        {
          $ref: "#/$defs/ImageContent"
        },
        {
          $ref: "#/$defs/AudioContent"
        },
        {
          $ref: "#/$defs/ResourceLink"
        },
        {
          $ref: "#/$defs/EmbeddedResource"
        }
      ]
    },
    CreateMessageRequest: {
      description: "A request from the server to sample an LLM via the client. The client has full discretion over which model to select. The client should also inform the user before beginning sampling, to allow them to inspect the request (human in the loop) and decide whether to approve it.",
      properties: {
        id: {
          $ref: "#/$defs/RequestId"
        },
        jsonrpc: {
          const: "2.0",
          type: "string"
        },
        method: {
          const: "sampling/createMessage",
          type: "string"
        },
        params: {
          $ref: "#/$defs/CreateMessageRequestParams"
        }
      },
      required: [
        "id",
        "jsonrpc",
        "method",
        "params"
      ],
      type: "object"
    },
    CreateMessageRequestParams: {
      description: "Parameters for a `sampling/createMessage` request.",
      properties: {
        _meta: {
          additionalProperties: {},
          description: "See [General fields: `_meta`](/specification/2025-11-25/basic/index#meta) for notes on `_meta` usage.",
          properties: {
            progressToken: {
              $ref: "#/$defs/ProgressToken",
              description: "If specified, the caller is requesting out-of-band progress notifications for this request (as represented by notifications/progress). The value of this parameter is an opaque token that will be attached to any subsequent notifications. The receiver is not obligated to provide these notifications."
            }
          },
          type: "object"
        },
        includeContext: {
          description: 'A request to include context from one or more MCP servers (including the caller), to be attached to the prompt.\nThe client MAY ignore this request.\n\nDefault is "none". Values "thisServer" and "allServers" are soft-deprecated. Servers SHOULD only use these values if the client\ndeclares ClientCapabilities.sampling.context. These values may be removed in future spec releases.',
          enum: [
            "allServers",
            "none",
            "thisServer"
          ],
          type: "string"
        },
        maxTokens: {
          description: "The requested maximum number of tokens to sample (to prevent runaway completions).\n\nThe client MAY choose to sample fewer tokens than the requested maximum.",
          type: "integer"
        },
        messages: {
          items: {
            $ref: "#/$defs/SamplingMessage"
          },
          type: "array"
        },
        metadata: {
          additionalProperties: true,
          description: "Optional metadata to pass through to the LLM provider. The format of this metadata is provider-specific.",
          properties: {},
          type: "object"
        },
        modelPreferences: {
          $ref: "#/$defs/ModelPreferences",
          description: "The server's preferences for which model to select. The client MAY ignore these preferences."
        },
        stopSequences: {
          items: {
            type: "string"
          },
          type: "array"
        },
        systemPrompt: {
          description: "An optional system prompt the server wants to use for sampling. The client MAY modify or omit this prompt.",
          type: "string"
        },
        task: {
          $ref: "#/$defs/TaskMetadata",
          description: "If specified, the caller is requesting task-augmented execution for this request.\nThe request will return a CreateTaskResult immediately, and the actual result can be\nretrieved later via tasks/result.\n\nTask augmentation is subject to capability negotiation - receivers MUST declare support\nfor task augmentation of specific request types in their capabilities."
        },
        temperature: {
          type: "number"
        },
        toolChoice: {
          $ref: "#/$defs/ToolChoice",
          description: 'Controls how the model uses tools.\nThe client MUST return an error if this field is provided but ClientCapabilities.sampling.tools is not declared.\nDefault is `{ mode: "auto" }`.'
        },
        tools: {
          description: "Tools that the model may use during generation.\nThe client MUST return an error if this field is provided but ClientCapabilities.sampling.tools is not declared.",
          items: {
            $ref: "#/$defs/Tool"
          },
          type: "array"
        }
      },
      required: [
        "maxTokens",
        "messages"
      ],
      type: "object"
    },
    CreateMessageResult: {
      description: "The client's response to a sampling/createMessage request from the server.\nThe client should inform the user before returning the sampled message, to allow them\nto inspect the response (human in the loop) and decide whether to allow the server to see it.",
      properties: {
        _meta: {
          additionalProperties: {},
          description: "See [General fields: `_meta`](/specification/2025-11-25/basic/index#meta) for notes on `_meta` usage.",
          type: "object"
        },
        content: {
          anyOf: [
            {
              $ref: "#/$defs/TextContent"
            },
            {
              $ref: "#/$defs/ImageContent"
            },
            {
              $ref: "#/$defs/AudioContent"
            },
            {
              $ref: "#/$defs/ToolUseContent"
            },
            {
              $ref: "#/$defs/ToolResultContent"
            },
            {
              items: {
                $ref: "#/$defs/SamplingMessageContentBlock"
              },
              type: "array"
            }
          ]
        },
        model: {
          description: "The name of the model that generated the message.",
          type: "string"
        },
        role: {
          $ref: "#/$defs/Role"
        },
        stopReason: {
          description: `The reason why sampling stopped, if known.

Standard values:
- "endTurn": Natural end of the assistant's turn
- "stopSequence": A stop sequence was encountered
- "maxTokens": Maximum token limit was reached
- "toolUse": The model wants to use one or more tools

This field is an open string to allow for provider-specific stop reasons.`,
          type: "string"
        }
      },
      required: [
        "content",
        "model",
        "role"
      ],
      type: "object"
    },
    CreateTaskResult: {
      description: "A response to a task-augmented request.",
      properties: {
        _meta: {
          additionalProperties: {},
          description: "See [General fields: `_meta`](/specification/2025-11-25/basic/index#meta) for notes on `_meta` usage.",
          type: "object"
        },
        task: {
          $ref: "#/$defs/Task"
        }
      },
      required: [
        "task"
      ],
      type: "object"
    },
    Cursor: {
      description: "An opaque token used to represent a cursor for pagination.",
      type: "string"
    },
    ElicitRequest: {
      description: "A request from the server to elicit additional information from the user via the client.",
      properties: {
        id: {
          $ref: "#/$defs/RequestId"
        },
        jsonrpc: {
          const: "2.0",
          type: "string"
        },
        method: {
          const: "elicitation/create",
          type: "string"
        },
        params: {
          $ref: "#/$defs/ElicitRequestParams"
        }
      },
      required: [
        "id",
        "jsonrpc",
        "method",
        "params"
      ],
      type: "object"
    },
    ElicitRequestFormParams: {
      description: "The parameters for a request to elicit non-sensitive information from the user via a form in the client.",
      properties: {
        _meta: {
          additionalProperties: {},
          description: "See [General fields: `_meta`](/specification/2025-11-25/basic/index#meta) for notes on `_meta` usage.",
          properties: {
            progressToken: {
              $ref: "#/$defs/ProgressToken",
              description: "If specified, the caller is requesting out-of-band progress notifications for this request (as represented by notifications/progress). The value of this parameter is an opaque token that will be attached to any subsequent notifications. The receiver is not obligated to provide these notifications."
            }
          },
          type: "object"
        },
        message: {
          description: "The message to present to the user describing what information is being requested.",
          type: "string"
        },
        mode: {
          const: "form",
          description: "The elicitation mode.",
          type: "string"
        },
        requestedSchema: {
          description: "A restricted subset of JSON Schema.\nOnly top-level properties are allowed, without nesting.",
          properties: {
            $schema: {
              type: "string"
            },
            properties: {
              additionalProperties: {
                $ref: "#/$defs/PrimitiveSchemaDefinition"
              },
              type: "object"
            },
            required: {
              items: {
                type: "string"
              },
              type: "array"
            },
            type: {
              const: "object",
              type: "string"
            }
          },
          required: [
            "properties",
            "type"
          ],
          type: "object"
        },
        task: {
          $ref: "#/$defs/TaskMetadata",
          description: "If specified, the caller is requesting task-augmented execution for this request.\nThe request will return a CreateTaskResult immediately, and the actual result can be\nretrieved later via tasks/result.\n\nTask augmentation is subject to capability negotiation - receivers MUST declare support\nfor task augmentation of specific request types in their capabilities."
        }
      },
      required: [
        "message",
        "requestedSchema"
      ],
      type: "object"
    },
    ElicitRequestParams: {
      anyOf: [
        {
          $ref: "#/$defs/ElicitRequestURLParams"
        },
        {
          $ref: "#/$defs/ElicitRequestFormParams"
        }
      ],
      description: "The parameters for a request to elicit additional information from the user via the client."
    },
    ElicitRequestURLParams: {
      description: "The parameters for a request to elicit information from the user via a URL in the client.",
      properties: {
        _meta: {
          additionalProperties: {},
          description: "See [General fields: `_meta`](/specification/2025-11-25/basic/index#meta) for notes on `_meta` usage.",
          properties: {
            progressToken: {
              $ref: "#/$defs/ProgressToken",
              description: "If specified, the caller is requesting out-of-band progress notifications for this request (as represented by notifications/progress). The value of this parameter is an opaque token that will be attached to any subsequent notifications. The receiver is not obligated to provide these notifications."
            }
          },
          type: "object"
        },
        elicitationId: {
          description: "The ID of the elicitation, which must be unique within the context of the server.\nThe client MUST treat this ID as an opaque value.",
          type: "string"
        },
        message: {
          description: "The message to present to the user explaining why the interaction is needed.",
          type: "string"
        },
        mode: {
          const: "url",
          description: "The elicitation mode.",
          type: "string"
        },
        task: {
          $ref: "#/$defs/TaskMetadata",
          description: "If specified, the caller is requesting task-augmented execution for this request.\nThe request will return a CreateTaskResult immediately, and the actual result can be\nretrieved later via tasks/result.\n\nTask augmentation is subject to capability negotiation - receivers MUST declare support\nfor task augmentation of specific request types in their capabilities."
        },
        url: {
          description: "The URL that the user should navigate to.",
          format: "uri",
          type: "string"
        }
      },
      required: [
        "elicitationId",
        "message",
        "mode",
        "url"
      ],
      type: "object"
    },
    ElicitResult: {
      description: "The client's response to an elicitation request.",
      properties: {
        _meta: {
          additionalProperties: {},
          description: "See [General fields: `_meta`](/specification/2025-11-25/basic/index#meta) for notes on `_meta` usage.",
          type: "object"
        },
        action: {
          description: 'The user action in response to the elicitation.\n- "accept": User submitted the form/confirmed the action\n- "decline": User explicitly decline the action\n- "cancel": User dismissed without making an explicit choice',
          enum: [
            "accept",
            "cancel",
            "decline"
          ],
          type: "string"
        },
        content: {
          additionalProperties: {
            anyOf: [
              {
                items: {
                  type: "string"
                },
                type: "array"
              },
              {
                type: [
                  "string",
                  "integer",
                  "boolean"
                ]
              }
            ]
          },
          description: 'The submitted form data, only present when action is "accept" and mode was "form".\nContains values matching the requested schema.\nOmitted for out-of-band mode responses.',
          type: "object"
        }
      },
      required: [
        "action"
      ],
      type: "object"
    },
    ElicitationCompleteNotification: {
      description: "An optional notification from the server to the client, informing it of a completion of a out-of-band elicitation request.",
      properties: {
        jsonrpc: {
          const: "2.0",
          type: "string"
        },
        method: {
          const: "notifications/elicitation/complete",
          type: "string"
        },
        params: {
          properties: {
            elicitationId: {
              description: "The ID of the elicitation that completed.",
              type: "string"
            }
          },
          required: [
            "elicitationId"
          ],
          type: "object"
        }
      },
      required: [
        "jsonrpc",
        "method",
        "params"
      ],
      type: "object"
    },
    EmbeddedResource: {
      description: "The contents of a resource, embedded into a prompt or tool call result.\n\nIt is up to the client how best to render embedded resources for the benefit\nof the LLM and/or the user.",
      properties: {
        _meta: {
          additionalProperties: {},
          description: "See [General fields: `_meta`](/specification/2025-11-25/basic/index#meta) for notes on `_meta` usage.",
          type: "object"
        },
        annotations: {
          $ref: "#/$defs/Annotations",
          description: "Optional annotations for the client."
        },
        resource: {
          anyOf: [
            {
              $ref: "#/$defs/TextResourceContents"
            },
            {
              $ref: "#/$defs/BlobResourceContents"
            }
          ]
        },
        type: {
          const: "resource",
          type: "string"
        }
      },
      required: [
        "resource",
        "type"
      ],
      type: "object"
    },
    EmptyResult: {
      $ref: "#/$defs/Result"
    },
    EnumSchema: {
      anyOf: [
        {
          $ref: "#/$defs/UntitledSingleSelectEnumSchema"
        },
        {
          $ref: "#/$defs/TitledSingleSelectEnumSchema"
        },
        {
          $ref: "#/$defs/UntitledMultiSelectEnumSchema"
        },
        {
          $ref: "#/$defs/TitledMultiSelectEnumSchema"
        },
        {
          $ref: "#/$defs/LegacyTitledEnumSchema"
        }
      ]
    },
    Error: {
      properties: {
        code: {
          description: "The error type that occurred.",
          type: "integer"
        },
        data: {
          description: "Additional information about the error. The value of this member is defined by the sender (e.g. detailed error information, nested errors etc.)."
        },
        message: {
          description: "A short description of the error. The message SHOULD be limited to a concise single sentence.",
          type: "string"
        }
      },
      required: [
        "code",
        "message"
      ],
      type: "object"
    },
    GetPromptRequest: {
      description: "Used by the client to get a prompt provided by the server.",
      properties: {
        id: {
          $ref: "#/$defs/RequestId"
        },
        jsonrpc: {
          const: "2.0",
          type: "string"
        },
        method: {
          const: "prompts/get",
          type: "string"
        },
        params: {
          $ref: "#/$defs/GetPromptRequestParams"
        }
      },
      required: [
        "id",
        "jsonrpc",
        "method",
        "params"
      ],
      type: "object"
    },
    GetPromptRequestParams: {
      description: "Parameters for a `prompts/get` request.",
      properties: {
        _meta: {
          additionalProperties: {},
          description: "See [General fields: `_meta`](/specification/2025-11-25/basic/index#meta) for notes on `_meta` usage.",
          properties: {
            progressToken: {
              $ref: "#/$defs/ProgressToken",
              description: "If specified, the caller is requesting out-of-band progress notifications for this request (as represented by notifications/progress). The value of this parameter is an opaque token that will be attached to any subsequent notifications. The receiver is not obligated to provide these notifications."
            }
          },
          type: "object"
        },
        arguments: {
          additionalProperties: {
            type: "string"
          },
          description: "Arguments to use for templating the prompt.",
          type: "object"
        },
        name: {
          description: "The name of the prompt or prompt template.",
          type: "string"
        }
      },
      required: [
        "name"
      ],
      type: "object"
    },
    GetPromptResult: {
      description: "The server's response to a prompts/get request from the client.",
      properties: {
        _meta: {
          additionalProperties: {},
          description: "See [General fields: `_meta`](/specification/2025-11-25/basic/index#meta) for notes on `_meta` usage.",
          type: "object"
        },
        description: {
          description: "An optional description for the prompt.",
          type: "string"
        },
        messages: {
          items: {
            $ref: "#/$defs/PromptMessage"
          },
          type: "array"
        }
      },
      required: [
        "messages"
      ],
      type: "object"
    },
    GetTaskPayloadRequest: {
      description: "A request to retrieve the result of a completed task.",
      properties: {
        id: {
          $ref: "#/$defs/RequestId"
        },
        jsonrpc: {
          const: "2.0",
          type: "string"
        },
        method: {
          const: "tasks/result",
          type: "string"
        },
        params: {
          properties: {
            taskId: {
              description: "The task identifier to retrieve results for.",
              type: "string"
            }
          },
          required: [
            "taskId"
          ],
          type: "object"
        }
      },
      required: [
        "id",
        "jsonrpc",
        "method",
        "params"
      ],
      type: "object"
    },
    GetTaskPayloadResult: {
      additionalProperties: {},
      description: "The response to a tasks/result request.\nThe structure matches the result type of the original request.\nFor example, a tools/call task would return the CallToolResult structure.",
      properties: {
        _meta: {
          additionalProperties: {},
          description: "See [General fields: `_meta`](/specification/2025-11-25/basic/index#meta) for notes on `_meta` usage.",
          type: "object"
        }
      },
      type: "object"
    },
    GetTaskRequest: {
      description: "A request to retrieve the state of a task.",
      properties: {
        id: {
          $ref: "#/$defs/RequestId"
        },
        jsonrpc: {
          const: "2.0",
          type: "string"
        },
        method: {
          const: "tasks/get",
          type: "string"
        },
        params: {
          properties: {
            taskId: {
              description: "The task identifier to query.",
              type: "string"
            }
          },
          required: [
            "taskId"
          ],
          type: "object"
        }
      },
      required: [
        "id",
        "jsonrpc",
        "method",
        "params"
      ],
      type: "object"
    },
    GetTaskResult: {
      allOf: [
        {
          $ref: "#/$defs/Result"
        },
        {
          $ref: "#/$defs/Task"
        }
      ],
      description: "The response to a tasks/get request."
    },
    Icon: {
      description: "An optionally-sized icon that can be displayed in a user interface.",
      properties: {
        mimeType: {
          description: 'Optional MIME type override if the source MIME type is missing or generic.\nFor example: `"image/png"`, `"image/jpeg"`, or `"image/svg+xml"`.',
          type: "string"
        },
        sizes: {
          description: 'Optional array of strings that specify sizes at which the icon can be used.\nEach string should be in WxH format (e.g., `"48x48"`, `"96x96"`) or `"any"` for scalable formats like SVG.\n\nIf not provided, the client should assume that the icon can be used at any size.',
          items: {
            type: "string"
          },
          type: "array"
        },
        src: {
          description: "A standard URI pointing to an icon resource. May be an HTTP/HTTPS URL or a\n`data:` URI with Base64-encoded image data.\n\nConsumers SHOULD takes steps to ensure URLs serving icons are from the\nsame domain as the client/server or a trusted domain.\n\nConsumers SHOULD take appropriate precautions when consuming SVGs as they can contain\nexecutable JavaScript.",
          format: "uri",
          type: "string"
        },
        theme: {
          description: "Optional specifier for the theme this icon is designed for. `light` indicates\nthe icon is designed to be used with a light background, and `dark` indicates\nthe icon is designed to be used with a dark background.\n\nIf not provided, the client should assume the icon can be used with any theme.",
          enum: [
            "dark",
            "light"
          ],
          type: "string"
        }
      },
      required: [
        "src"
      ],
      type: "object"
    },
    Icons: {
      description: "Base interface to add `icons` property.",
      properties: {
        icons: {
          description: "Optional set of sized icons that the client can display in a user interface.\n\nClients that support rendering icons MUST support at least the following MIME types:\n- `image/png` - PNG images (safe, universal compatibility)\n- `image/jpeg` (and `image/jpg`) - JPEG images (safe, universal compatibility)\n\nClients that support rendering icons SHOULD also support:\n- `image/svg+xml` - SVG images (scalable but requires security precautions)\n- `image/webp` - WebP images (modern, efficient format)",
          items: {
            $ref: "#/$defs/Icon"
          },
          type: "array"
        }
      },
      type: "object"
    },
    ImageContent: {
      description: "An image provided to or from an LLM.",
      properties: {
        _meta: {
          additionalProperties: {},
          description: "See [General fields: `_meta`](/specification/2025-11-25/basic/index#meta) for notes on `_meta` usage.",
          type: "object"
        },
        annotations: {
          $ref: "#/$defs/Annotations",
          description: "Optional annotations for the client."
        },
        data: {
          description: "The base64-encoded image data.",
          format: "byte",
          type: "string"
        },
        mimeType: {
          description: "The MIME type of the image. Different providers may support different image types.",
          type: "string"
        },
        type: {
          const: "image",
          type: "string"
        }
      },
      required: [
        "data",
        "mimeType",
        "type"
      ],
      type: "object"
    },
    Implementation: {
      description: "Describes the MCP implementation.",
      properties: {
        description: {
          description: "An optional human-readable description of what this implementation does.\n\nThis can be used by clients or servers to provide context about their purpose\nand capabilities. For example, a server might describe the types of resources\nor tools it provides, while a client might describe its intended use case.",
          type: "string"
        },
        icons: {
          description: "Optional set of sized icons that the client can display in a user interface.\n\nClients that support rendering icons MUST support at least the following MIME types:\n- `image/png` - PNG images (safe, universal compatibility)\n- `image/jpeg` (and `image/jpg`) - JPEG images (safe, universal compatibility)\n\nClients that support rendering icons SHOULD also support:\n- `image/svg+xml` - SVG images (scalable but requires security precautions)\n- `image/webp` - WebP images (modern, efficient format)",
          items: {
            $ref: "#/$defs/Icon"
          },
          type: "array"
        },
        name: {
          description: "Intended for programmatic or logical use, but used as a display name in past specs or fallback (if title isn't present).",
          type: "string"
        },
        title: {
          description: "Intended for UI and end-user contexts \u2014 optimized to be human-readable and easily understood,\neven by those unfamiliar with domain-specific terminology.\n\nIf not provided, the name should be used for display (except for Tool,\nwhere `annotations.title` should be given precedence over using `name`,\nif present).",
          type: "string"
        },
        version: {
          type: "string"
        },
        websiteUrl: {
          description: "An optional URL of the website for this implementation.",
          format: "uri",
          type: "string"
        }
      },
      required: [
        "name",
        "version"
      ],
      type: "object"
    },
    InitializeRequest: {
      description: "This request is sent from the client to the server when it first connects, asking it to begin initialization.",
      properties: {
        id: {
          $ref: "#/$defs/RequestId"
        },
        jsonrpc: {
          const: "2.0",
          type: "string"
        },
        method: {
          const: "initialize",
          type: "string"
        },
        params: {
          $ref: "#/$defs/InitializeRequestParams"
        }
      },
      required: [
        "id",
        "jsonrpc",
        "method",
        "params"
      ],
      type: "object"
    },
    InitializeRequestParams: {
      description: "Parameters for an `initialize` request.",
      properties: {
        _meta: {
          additionalProperties: {},
          description: "See [General fields: `_meta`](/specification/2025-11-25/basic/index#meta) for notes on `_meta` usage.",
          properties: {
            progressToken: {
              $ref: "#/$defs/ProgressToken",
              description: "If specified, the caller is requesting out-of-band progress notifications for this request (as represented by notifications/progress). The value of this parameter is an opaque token that will be attached to any subsequent notifications. The receiver is not obligated to provide these notifications."
            }
          },
          type: "object"
        },
        capabilities: {
          $ref: "#/$defs/ClientCapabilities"
        },
        clientInfo: {
          $ref: "#/$defs/Implementation"
        },
        protocolVersion: {
          description: "The latest version of the Model Context Protocol that the client supports. The client MAY decide to support older versions as well.",
          type: "string"
        }
      },
      required: [
        "capabilities",
        "clientInfo",
        "protocolVersion"
      ],
      type: "object"
    },
    InitializeResult: {
      description: "After receiving an initialize request from the client, the server sends this response.",
      properties: {
        _meta: {
          additionalProperties: {},
          description: "See [General fields: `_meta`](/specification/2025-11-25/basic/index#meta) for notes on `_meta` usage.",
          type: "object"
        },
        capabilities: {
          $ref: "#/$defs/ServerCapabilities"
        },
        instructions: {
          description: `Instructions describing how to use the server and its features.

This can be used by clients to improve the LLM's understanding of available tools, resources, etc. It can be thought of like a "hint" to the model. For example, this information MAY be added to the system prompt.`,
          type: "string"
        },
        protocolVersion: {
          description: "The version of the Model Context Protocol that the server wants to use. This may not match the version that the client requested. If the client cannot support this version, it MUST disconnect.",
          type: "string"
        },
        serverInfo: {
          $ref: "#/$defs/Implementation"
        }
      },
      required: [
        "capabilities",
        "protocolVersion",
        "serverInfo"
      ],
      type: "object"
    },
    InitializedNotification: {
      description: "This notification is sent from the client to the server after initialization has finished.",
      properties: {
        jsonrpc: {
          const: "2.0",
          type: "string"
        },
        method: {
          const: "notifications/initialized",
          type: "string"
        },
        params: {
          $ref: "#/$defs/NotificationParams"
        }
      },
      required: [
        "jsonrpc",
        "method"
      ],
      type: "object"
    },
    JSONRPCErrorResponse: {
      description: "A response to a request that indicates an error occurred.",
      properties: {
        error: {
          $ref: "#/$defs/Error"
        },
        id: {
          $ref: "#/$defs/RequestId"
        },
        jsonrpc: {
          const: "2.0",
          type: "string"
        }
      },
      required: [
        "error",
        "jsonrpc"
      ],
      type: "object"
    },
    JSONRPCMessage: {
      anyOf: [
        {
          $ref: "#/$defs/JSONRPCRequest"
        },
        {
          $ref: "#/$defs/JSONRPCNotification"
        },
        {
          $ref: "#/$defs/JSONRPCResultResponse"
        },
        {
          $ref: "#/$defs/JSONRPCErrorResponse"
        }
      ],
      description: "Refers to any valid JSON-RPC object that can be decoded off the wire, or encoded to be sent."
    },
    JSONRPCNotification: {
      description: "A notification which does not expect a response.",
      properties: {
        jsonrpc: {
          const: "2.0",
          type: "string"
        },
        method: {
          type: "string"
        },
        params: {
          additionalProperties: {},
          type: "object"
        }
      },
      required: [
        "jsonrpc",
        "method"
      ],
      type: "object"
    },
    JSONRPCRequest: {
      description: "A request that expects a response.",
      properties: {
        id: {
          $ref: "#/$defs/RequestId"
        },
        jsonrpc: {
          const: "2.0",
          type: "string"
        },
        method: {
          type: "string"
        },
        params: {
          additionalProperties: {},
          type: "object"
        }
      },
      required: [
        "id",
        "jsonrpc",
        "method"
      ],
      type: "object"
    },
    JSONRPCResponse: {
      anyOf: [
        {
          $ref: "#/$defs/JSONRPCResultResponse"
        },
        {
          $ref: "#/$defs/JSONRPCErrorResponse"
        }
      ],
      description: "A response to a request, containing either the result or error."
    },
    JSONRPCResultResponse: {
      description: "A successful (non-error) response to a request.",
      properties: {
        id: {
          $ref: "#/$defs/RequestId"
        },
        jsonrpc: {
          const: "2.0",
          type: "string"
        },
        result: {
          $ref: "#/$defs/Result"
        }
      },
      required: [
        "id",
        "jsonrpc",
        "result"
      ],
      type: "object"
    },
    LegacyTitledEnumSchema: {
      description: "Use TitledSingleSelectEnumSchema instead.\nThis interface will be removed in a future version.",
      properties: {
        default: {
          type: "string"
        },
        description: {
          type: "string"
        },
        enum: {
          items: {
            type: "string"
          },
          type: "array"
        },
        enumNames: {
          description: "(Legacy) Display names for enum values.\nNon-standard according to JSON schema 2020-12.",
          items: {
            type: "string"
          },
          type: "array"
        },
        title: {
          type: "string"
        },
        type: {
          const: "string",
          type: "string"
        }
      },
      required: [
        "enum",
        "type"
      ],
      type: "object"
    },
    ListPromptsRequest: {
      description: "Sent from the client to request a list of prompts and prompt templates the server has.",
      properties: {
        id: {
          $ref: "#/$defs/RequestId"
        },
        jsonrpc: {
          const: "2.0",
          type: "string"
        },
        method: {
          const: "prompts/list",
          type: "string"
        },
        params: {
          $ref: "#/$defs/PaginatedRequestParams"
        }
      },
      required: [
        "id",
        "jsonrpc",
        "method"
      ],
      type: "object"
    },
    ListPromptsResult: {
      description: "The server's response to a prompts/list request from the client.",
      properties: {
        _meta: {
          additionalProperties: {},
          description: "See [General fields: `_meta`](/specification/2025-11-25/basic/index#meta) for notes on `_meta` usage.",
          type: "object"
        },
        nextCursor: {
          description: "An opaque token representing the pagination position after the last returned result.\nIf present, there may be more results available.",
          type: "string"
        },
        prompts: {
          items: {
            $ref: "#/$defs/Prompt"
          },
          type: "array"
        }
      },
      required: [
        "prompts"
      ],
      type: "object"
    },
    ListResourceTemplatesRequest: {
      description: "Sent from the client to request a list of resource templates the server has.",
      properties: {
        id: {
          $ref: "#/$defs/RequestId"
        },
        jsonrpc: {
          const: "2.0",
          type: "string"
        },
        method: {
          const: "resources/templates/list",
          type: "string"
        },
        params: {
          $ref: "#/$defs/PaginatedRequestParams"
        }
      },
      required: [
        "id",
        "jsonrpc",
        "method"
      ],
      type: "object"
    },
    ListResourceTemplatesResult: {
      description: "The server's response to a resources/templates/list request from the client.",
      properties: {
        _meta: {
          additionalProperties: {},
          description: "See [General fields: `_meta`](/specification/2025-11-25/basic/index#meta) for notes on `_meta` usage.",
          type: "object"
        },
        nextCursor: {
          description: "An opaque token representing the pagination position after the last returned result.\nIf present, there may be more results available.",
          type: "string"
        },
        resourceTemplates: {
          items: {
            $ref: "#/$defs/ResourceTemplate"
          },
          type: "array"
        }
      },
      required: [
        "resourceTemplates"
      ],
      type: "object"
    },
    ListResourcesRequest: {
      description: "Sent from the client to request a list of resources the server has.",
      properties: {
        id: {
          $ref: "#/$defs/RequestId"
        },
        jsonrpc: {
          const: "2.0",
          type: "string"
        },
        method: {
          const: "resources/list",
          type: "string"
        },
        params: {
          $ref: "#/$defs/PaginatedRequestParams"
        }
      },
      required: [
        "id",
        "jsonrpc",
        "method"
      ],
      type: "object"
    },
    ListResourcesResult: {
      description: "The server's response to a resources/list request from the client.",
      properties: {
        _meta: {
          additionalProperties: {},
          description: "See [General fields: `_meta`](/specification/2025-11-25/basic/index#meta) for notes on `_meta` usage.",
          type: "object"
        },
        nextCursor: {
          description: "An opaque token representing the pagination position after the last returned result.\nIf present, there may be more results available.",
          type: "string"
        },
        resources: {
          items: {
            $ref: "#/$defs/Resource"
          },
          type: "array"
        }
      },
      required: [
        "resources"
      ],
      type: "object"
    },
    ListRootsRequest: {
      description: "Sent from the server to request a list of root URIs from the client. Roots allow\nservers to ask for specific directories or files to operate on. A common example\nfor roots is providing a set of repositories or directories a server should operate\non.\n\nThis request is typically used when the server needs to understand the file system\nstructure or access specific locations that the client has permission to read from.",
      properties: {
        id: {
          $ref: "#/$defs/RequestId"
        },
        jsonrpc: {
          const: "2.0",
          type: "string"
        },
        method: {
          const: "roots/list",
          type: "string"
        },
        params: {
          $ref: "#/$defs/RequestParams"
        }
      },
      required: [
        "id",
        "jsonrpc",
        "method"
      ],
      type: "object"
    },
    ListRootsResult: {
      description: "The client's response to a roots/list request from the server.\nThis result contains an array of Root objects, each representing a root directory\nor file that the server can operate on.",
      properties: {
        _meta: {
          additionalProperties: {},
          description: "See [General fields: `_meta`](/specification/2025-11-25/basic/index#meta) for notes on `_meta` usage.",
          type: "object"
        },
        roots: {
          items: {
            $ref: "#/$defs/Root"
          },
          type: "array"
        }
      },
      required: [
        "roots"
      ],
      type: "object"
    },
    ListTasksRequest: {
      description: "A request to retrieve a list of tasks.",
      properties: {
        id: {
          $ref: "#/$defs/RequestId"
        },
        jsonrpc: {
          const: "2.0",
          type: "string"
        },
        method: {
          const: "tasks/list",
          type: "string"
        },
        params: {
          $ref: "#/$defs/PaginatedRequestParams"
        }
      },
      required: [
        "id",
        "jsonrpc",
        "method"
      ],
      type: "object"
    },
    ListTasksResult: {
      description: "The response to a tasks/list request.",
      properties: {
        _meta: {
          additionalProperties: {},
          description: "See [General fields: `_meta`](/specification/2025-11-25/basic/index#meta) for notes on `_meta` usage.",
          type: "object"
        },
        nextCursor: {
          description: "An opaque token representing the pagination position after the last returned result.\nIf present, there may be more results available.",
          type: "string"
        },
        tasks: {
          items: {
            $ref: "#/$defs/Task"
          },
          type: "array"
        }
      },
      required: [
        "tasks"
      ],
      type: "object"
    },
    ListToolsRequest: {
      description: "Sent from the client to request a list of tools the server has.",
      properties: {
        id: {
          $ref: "#/$defs/RequestId"
        },
        jsonrpc: {
          const: "2.0",
          type: "string"
        },
        method: {
          const: "tools/list",
          type: "string"
        },
        params: {
          $ref: "#/$defs/PaginatedRequestParams"
        }
      },
      required: [
        "id",
        "jsonrpc",
        "method"
      ],
      type: "object"
    },
    ListToolsResult: {
      description: "The server's response to a tools/list request from the client.",
      properties: {
        _meta: {
          additionalProperties: {},
          description: "See [General fields: `_meta`](/specification/2025-11-25/basic/index#meta) for notes on `_meta` usage.",
          type: "object"
        },
        nextCursor: {
          description: "An opaque token representing the pagination position after the last returned result.\nIf present, there may be more results available.",
          type: "string"
        },
        tools: {
          items: {
            $ref: "#/$defs/Tool"
          },
          type: "array"
        }
      },
      required: [
        "tools"
      ],
      type: "object"
    },
    LoggingLevel: {
      description: "The severity of a log message.\n\nThese map to syslog message severities, as specified in RFC-5424:\nhttps://datatracker.ietf.org/doc/html/rfc5424#section-6.2.1",
      enum: [
        "alert",
        "critical",
        "debug",
        "emergency",
        "error",
        "info",
        "notice",
        "warning"
      ],
      type: "string"
    },
    LoggingMessageNotification: {
      description: "JSONRPCNotification of a log message passed from server to client. If no logging/setLevel request has been sent from the client, the server MAY decide which messages to send automatically.",
      properties: {
        jsonrpc: {
          const: "2.0",
          type: "string"
        },
        method: {
          const: "notifications/message",
          type: "string"
        },
        params: {
          $ref: "#/$defs/LoggingMessageNotificationParams"
        }
      },
      required: [
        "jsonrpc",
        "method",
        "params"
      ],
      type: "object"
    },
    LoggingMessageNotificationParams: {
      description: "Parameters for a `notifications/message` notification.",
      properties: {
        _meta: {
          additionalProperties: {},
          description: "See [General fields: `_meta`](/specification/2025-11-25/basic/index#meta) for notes on `_meta` usage.",
          type: "object"
        },
        data: {
          description: "The data to be logged, such as a string message or an object. Any JSON serializable type is allowed here."
        },
        level: {
          $ref: "#/$defs/LoggingLevel",
          description: "The severity of this log message."
        },
        logger: {
          description: "An optional name of the logger issuing this message.",
          type: "string"
        }
      },
      required: [
        "data",
        "level"
      ],
      type: "object"
    },
    ModelHint: {
      description: "Hints to use for model selection.\n\nKeys not declared here are currently left unspecified by the spec and are up\nto the client to interpret.",
      properties: {
        name: {
          description: "A hint for a model name.\n\nThe client SHOULD treat this as a substring of a model name; for example:\n - `claude-3-5-sonnet` should match `claude-3-5-sonnet-20241022`\n - `sonnet` should match `claude-3-5-sonnet-20241022`, `claude-3-sonnet-20240229`, etc.\n - `claude` should match any Claude model\n\nThe client MAY also map the string to a different provider's model name or a different model family, as long as it fills a similar niche; for example:\n - `gemini-1.5-flash` could match `claude-3-haiku-20240307`",
          type: "string"
        }
      },
      type: "object"
    },
    ModelPreferences: {
      description: `The server's preferences for model selection, requested of the client during sampling.

Because LLMs can vary along multiple dimensions, choosing the "best" model is
rarely straightforward.  Different models excel in different areas\u2014some are
faster but less capable, others are more capable but more expensive, and so
on. This interface allows servers to express their priorities across multiple
dimensions to help clients make an appropriate selection for their use case.

These preferences are always advisory. The client MAY ignore them. It is also
up to the client to decide how to interpret these preferences and how to
balance them against other considerations.`,
      properties: {
        costPriority: {
          description: "How much to prioritize cost when selecting a model. A value of 0 means cost\nis not important, while a value of 1 means cost is the most important\nfactor.",
          maximum: 1,
          minimum: 0,
          type: "number"
        },
        hints: {
          description: "Optional hints to use for model selection.\n\nIf multiple hints are specified, the client MUST evaluate them in order\n(such that the first match is taken).\n\nThe client SHOULD prioritize these hints over the numeric priorities, but\nMAY still use the priorities to select from ambiguous matches.",
          items: {
            $ref: "#/$defs/ModelHint"
          },
          type: "array"
        },
        intelligencePriority: {
          description: "How much to prioritize intelligence and capabilities when selecting a\nmodel. A value of 0 means intelligence is not important, while a value of 1\nmeans intelligence is the most important factor.",
          maximum: 1,
          minimum: 0,
          type: "number"
        },
        speedPriority: {
          description: "How much to prioritize sampling speed (latency) when selecting a model. A\nvalue of 0 means speed is not important, while a value of 1 means speed is\nthe most important factor.",
          maximum: 1,
          minimum: 0,
          type: "number"
        }
      },
      type: "object"
    },
    MultiSelectEnumSchema: {
      anyOf: [
        {
          $ref: "#/$defs/UntitledMultiSelectEnumSchema"
        },
        {
          $ref: "#/$defs/TitledMultiSelectEnumSchema"
        }
      ]
    },
    Notification: {
      properties: {
        method: {
          type: "string"
        },
        params: {
          additionalProperties: {},
          type: "object"
        }
      },
      required: [
        "method"
      ],
      type: "object"
    },
    NotificationParams: {
      properties: {
        _meta: {
          additionalProperties: {},
          description: "See [General fields: `_meta`](/specification/2025-11-25/basic/index#meta) for notes on `_meta` usage.",
          type: "object"
        }
      },
      type: "object"
    },
    NumberSchema: {
      properties: {
        default: {
          type: "number"
        },
        description: {
          type: "string"
        },
        maximum: {
          type: "number"
        },
        minimum: {
          type: "number"
        },
        title: {
          type: "string"
        },
        type: {
          enum: [
            "integer",
            "number"
          ],
          type: "string"
        }
      },
      required: [
        "type"
      ],
      type: "object"
    },
    PaginatedRequest: {
      properties: {
        id: {
          $ref: "#/$defs/RequestId"
        },
        jsonrpc: {
          const: "2.0",
          type: "string"
        },
        method: {
          type: "string"
        },
        params: {
          $ref: "#/$defs/PaginatedRequestParams"
        }
      },
      required: [
        "id",
        "jsonrpc",
        "method"
      ],
      type: "object"
    },
    PaginatedRequestParams: {
      description: "Common parameters for paginated requests.",
      properties: {
        _meta: {
          additionalProperties: {},
          description: "See [General fields: `_meta`](/specification/2025-11-25/basic/index#meta) for notes on `_meta` usage.",
          properties: {
            progressToken: {
              $ref: "#/$defs/ProgressToken",
              description: "If specified, the caller is requesting out-of-band progress notifications for this request (as represented by notifications/progress). The value of this parameter is an opaque token that will be attached to any subsequent notifications. The receiver is not obligated to provide these notifications."
            }
          },
          type: "object"
        },
        cursor: {
          description: "An opaque token representing the current pagination position.\nIf provided, the server should return results starting after this cursor.",
          type: "string"
        }
      },
      type: "object"
    },
    PaginatedResult: {
      properties: {
        _meta: {
          additionalProperties: {},
          description: "See [General fields: `_meta`](/specification/2025-11-25/basic/index#meta) for notes on `_meta` usage.",
          type: "object"
        },
        nextCursor: {
          description: "An opaque token representing the pagination position after the last returned result.\nIf present, there may be more results available.",
          type: "string"
        }
      },
      type: "object"
    },
    PingRequest: {
      description: "A ping, issued by either the server or the client, to check that the other party is still alive. The receiver must promptly respond, or else may be disconnected.",
      properties: {
        id: {
          $ref: "#/$defs/RequestId"
        },
        jsonrpc: {
          const: "2.0",
          type: "string"
        },
        method: {
          const: "ping",
          type: "string"
        },
        params: {
          $ref: "#/$defs/RequestParams"
        }
      },
      required: [
        "id",
        "jsonrpc",
        "method"
      ],
      type: "object"
    },
    PrimitiveSchemaDefinition: {
      anyOf: [
        {
          $ref: "#/$defs/StringSchema"
        },
        {
          $ref: "#/$defs/NumberSchema"
        },
        {
          $ref: "#/$defs/BooleanSchema"
        },
        {
          $ref: "#/$defs/UntitledSingleSelectEnumSchema"
        },
        {
          $ref: "#/$defs/TitledSingleSelectEnumSchema"
        },
        {
          $ref: "#/$defs/UntitledMultiSelectEnumSchema"
        },
        {
          $ref: "#/$defs/TitledMultiSelectEnumSchema"
        },
        {
          $ref: "#/$defs/LegacyTitledEnumSchema"
        }
      ],
      description: "Restricted schema definitions that only allow primitive types\nwithout nested objects or arrays."
    },
    ProgressNotification: {
      description: "An out-of-band notification used to inform the receiver of a progress update for a long-running request.",
      properties: {
        jsonrpc: {
          const: "2.0",
          type: "string"
        },
        method: {
          const: "notifications/progress",
          type: "string"
        },
        params: {
          $ref: "#/$defs/ProgressNotificationParams"
        }
      },
      required: [
        "jsonrpc",
        "method",
        "params"
      ],
      type: "object"
    },
    ProgressNotificationParams: {
      description: "Parameters for a `notifications/progress` notification.",
      properties: {
        _meta: {
          additionalProperties: {},
          description: "See [General fields: `_meta`](/specification/2025-11-25/basic/index#meta) for notes on `_meta` usage.",
          type: "object"
        },
        message: {
          description: "An optional message describing the current progress.",
          type: "string"
        },
        progress: {
          description: "The progress thus far. This should increase every time progress is made, even if the total is unknown.",
          type: "number"
        },
        progressToken: {
          $ref: "#/$defs/ProgressToken",
          description: "The progress token which was given in the initial request, used to associate this notification with the request that is proceeding."
        },
        total: {
          description: "Total number of items to process (or total progress required), if known.",
          type: "number"
        }
      },
      required: [
        "progress",
        "progressToken"
      ],
      type: "object"
    },
    ProgressToken: {
      description: "A progress token, used to associate progress notifications with the original request.",
      type: [
        "string",
        "integer"
      ]
    },
    Prompt: {
      description: "A prompt or prompt template that the server offers.",
      properties: {
        _meta: {
          additionalProperties: {},
          description: "See [General fields: `_meta`](/specification/2025-11-25/basic/index#meta) for notes on `_meta` usage.",
          type: "object"
        },
        arguments: {
          description: "A list of arguments to use for templating the prompt.",
          items: {
            $ref: "#/$defs/PromptArgument"
          },
          type: "array"
        },
        description: {
          description: "An optional description of what this prompt provides",
          type: "string"
        },
        icons: {
          description: "Optional set of sized icons that the client can display in a user interface.\n\nClients that support rendering icons MUST support at least the following MIME types:\n- `image/png` - PNG images (safe, universal compatibility)\n- `image/jpeg` (and `image/jpg`) - JPEG images (safe, universal compatibility)\n\nClients that support rendering icons SHOULD also support:\n- `image/svg+xml` - SVG images (scalable but requires security precautions)\n- `image/webp` - WebP images (modern, efficient format)",
          items: {
            $ref: "#/$defs/Icon"
          },
          type: "array"
        },
        name: {
          description: "Intended for programmatic or logical use, but used as a display name in past specs or fallback (if title isn't present).",
          type: "string"
        },
        title: {
          description: "Intended for UI and end-user contexts \u2014 optimized to be human-readable and easily understood,\neven by those unfamiliar with domain-specific terminology.\n\nIf not provided, the name should be used for display (except for Tool,\nwhere `annotations.title` should be given precedence over using `name`,\nif present).",
          type: "string"
        }
      },
      required: [
        "name"
      ],
      type: "object"
    },
    PromptArgument: {
      description: "Describes an argument that a prompt can accept.",
      properties: {
        description: {
          description: "A human-readable description of the argument.",
          type: "string"
        },
        name: {
          description: "Intended for programmatic or logical use, but used as a display name in past specs or fallback (if title isn't present).",
          type: "string"
        },
        required: {
          description: "Whether this argument must be provided.",
          type: "boolean"
        },
        title: {
          description: "Intended for UI and end-user contexts \u2014 optimized to be human-readable and easily understood,\neven by those unfamiliar with domain-specific terminology.\n\nIf not provided, the name should be used for display (except for Tool,\nwhere `annotations.title` should be given precedence over using `name`,\nif present).",
          type: "string"
        }
      },
      required: [
        "name"
      ],
      type: "object"
    },
    PromptListChangedNotification: {
      description: "An optional notification from the server to the client, informing it that the list of prompts it offers has changed. This may be issued by servers without any previous subscription from the client.",
      properties: {
        jsonrpc: {
          const: "2.0",
          type: "string"
        },
        method: {
          const: "notifications/prompts/list_changed",
          type: "string"
        },
        params: {
          $ref: "#/$defs/NotificationParams"
        }
      },
      required: [
        "jsonrpc",
        "method"
      ],
      type: "object"
    },
    PromptMessage: {
      description: "Describes a message returned as part of a prompt.\n\nThis is similar to `SamplingMessage`, but also supports the embedding of\nresources from the MCP server.",
      properties: {
        content: {
          $ref: "#/$defs/ContentBlock"
        },
        role: {
          $ref: "#/$defs/Role"
        }
      },
      required: [
        "content",
        "role"
      ],
      type: "object"
    },
    PromptReference: {
      description: "Identifies a prompt.",
      properties: {
        name: {
          description: "Intended for programmatic or logical use, but used as a display name in past specs or fallback (if title isn't present).",
          type: "string"
        },
        title: {
          description: "Intended for UI and end-user contexts \u2014 optimized to be human-readable and easily understood,\neven by those unfamiliar with domain-specific terminology.\n\nIf not provided, the name should be used for display (except for Tool,\nwhere `annotations.title` should be given precedence over using `name`,\nif present).",
          type: "string"
        },
        type: {
          const: "ref/prompt",
          type: "string"
        }
      },
      required: [
        "name",
        "type"
      ],
      type: "object"
    },
    ReadResourceRequest: {
      description: "Sent from the client to the server, to read a specific resource URI.",
      properties: {
        id: {
          $ref: "#/$defs/RequestId"
        },
        jsonrpc: {
          const: "2.0",
          type: "string"
        },
        method: {
          const: "resources/read",
          type: "string"
        },
        params: {
          $ref: "#/$defs/ReadResourceRequestParams"
        }
      },
      required: [
        "id",
        "jsonrpc",
        "method",
        "params"
      ],
      type: "object"
    },
    ReadResourceRequestParams: {
      description: "Parameters for a `resources/read` request.",
      properties: {
        _meta: {
          additionalProperties: {},
          description: "See [General fields: `_meta`](/specification/2025-11-25/basic/index#meta) for notes on `_meta` usage.",
          properties: {
            progressToken: {
              $ref: "#/$defs/ProgressToken",
              description: "If specified, the caller is requesting out-of-band progress notifications for this request (as represented by notifications/progress). The value of this parameter is an opaque token that will be attached to any subsequent notifications. The receiver is not obligated to provide these notifications."
            }
          },
          type: "object"
        },
        uri: {
          description: "The URI of the resource. The URI can use any protocol; it is up to the server how to interpret it.",
          format: "uri",
          type: "string"
        }
      },
      required: [
        "uri"
      ],
      type: "object"
    },
    ReadResourceResult: {
      description: "The server's response to a resources/read request from the client.",
      properties: {
        _meta: {
          additionalProperties: {},
          description: "See [General fields: `_meta`](/specification/2025-11-25/basic/index#meta) for notes on `_meta` usage.",
          type: "object"
        },
        contents: {
          items: {
            anyOf: [
              {
                $ref: "#/$defs/TextResourceContents"
              },
              {
                $ref: "#/$defs/BlobResourceContents"
              }
            ]
          },
          type: "array"
        }
      },
      required: [
        "contents"
      ],
      type: "object"
    },
    RelatedTaskMetadata: {
      description: "Metadata for associating messages with a task.\nInclude this in the `_meta` field under the key `io.modelcontextprotocol/related-task`.",
      properties: {
        taskId: {
          description: "The task identifier this message is associated with.",
          type: "string"
        }
      },
      required: [
        "taskId"
      ],
      type: "object"
    },
    Request: {
      properties: {
        method: {
          type: "string"
        },
        params: {
          additionalProperties: {},
          type: "object"
        }
      },
      required: [
        "method"
      ],
      type: "object"
    },
    RequestId: {
      description: "A uniquely identifying ID for a request in JSON-RPC.",
      type: [
        "string",
        "integer"
      ]
    },
    RequestParams: {
      description: "Common params for any request.",
      properties: {
        _meta: {
          additionalProperties: {},
          description: "See [General fields: `_meta`](/specification/2025-11-25/basic/index#meta) for notes on `_meta` usage.",
          properties: {
            progressToken: {
              $ref: "#/$defs/ProgressToken",
              description: "If specified, the caller is requesting out-of-band progress notifications for this request (as represented by notifications/progress). The value of this parameter is an opaque token that will be attached to any subsequent notifications. The receiver is not obligated to provide these notifications."
            }
          },
          type: "object"
        }
      },
      type: "object"
    },
    Resource: {
      description: "A known resource that the server is capable of reading.",
      properties: {
        _meta: {
          additionalProperties: {},
          description: "See [General fields: `_meta`](/specification/2025-11-25/basic/index#meta) for notes on `_meta` usage.",
          type: "object"
        },
        annotations: {
          $ref: "#/$defs/Annotations",
          description: "Optional annotations for the client."
        },
        description: {
          description: `A description of what this resource represents.

This can be used by clients to improve the LLM's understanding of available resources. It can be thought of like a "hint" to the model.`,
          type: "string"
        },
        icons: {
          description: "Optional set of sized icons that the client can display in a user interface.\n\nClients that support rendering icons MUST support at least the following MIME types:\n- `image/png` - PNG images (safe, universal compatibility)\n- `image/jpeg` (and `image/jpg`) - JPEG images (safe, universal compatibility)\n\nClients that support rendering icons SHOULD also support:\n- `image/svg+xml` - SVG images (scalable but requires security precautions)\n- `image/webp` - WebP images (modern, efficient format)",
          items: {
            $ref: "#/$defs/Icon"
          },
          type: "array"
        },
        mimeType: {
          description: "The MIME type of this resource, if known.",
          type: "string"
        },
        name: {
          description: "Intended for programmatic or logical use, but used as a display name in past specs or fallback (if title isn't present).",
          type: "string"
        },
        size: {
          description: "The size of the raw resource content, in bytes (i.e., before base64 encoding or any tokenization), if known.\n\nThis can be used by Hosts to display file sizes and estimate context window usage.",
          type: "integer"
        },
        title: {
          description: "Intended for UI and end-user contexts \u2014 optimized to be human-readable and easily understood,\neven by those unfamiliar with domain-specific terminology.\n\nIf not provided, the name should be used for display (except for Tool,\nwhere `annotations.title` should be given precedence over using `name`,\nif present).",
          type: "string"
        },
        uri: {
          description: "The URI of this resource.",
          format: "uri",
          type: "string"
        }
      },
      required: [
        "name",
        "uri"
      ],
      type: "object"
    },
    ResourceContents: {
      description: "The contents of a specific resource or sub-resource.",
      properties: {
        _meta: {
          additionalProperties: {},
          description: "See [General fields: `_meta`](/specification/2025-11-25/basic/index#meta) for notes on `_meta` usage.",
          type: "object"
        },
        mimeType: {
          description: "The MIME type of this resource, if known.",
          type: "string"
        },
        uri: {
          description: "The URI of this resource.",
          format: "uri",
          type: "string"
        }
      },
      required: [
        "uri"
      ],
      type: "object"
    },
    ResourceLink: {
      description: "A resource that the server is capable of reading, included in a prompt or tool call result.\n\nNote: resource links returned by tools are not guaranteed to appear in the results of `resources/list` requests.",
      properties: {
        _meta: {
          additionalProperties: {},
          description: "See [General fields: `_meta`](/specification/2025-11-25/basic/index#meta) for notes on `_meta` usage.",
          type: "object"
        },
        annotations: {
          $ref: "#/$defs/Annotations",
          description: "Optional annotations for the client."
        },
        description: {
          description: `A description of what this resource represents.

This can be used by clients to improve the LLM's understanding of available resources. It can be thought of like a "hint" to the model.`,
          type: "string"
        },
        icons: {
          description: "Optional set of sized icons that the client can display in a user interface.\n\nClients that support rendering icons MUST support at least the following MIME types:\n- `image/png` - PNG images (safe, universal compatibility)\n- `image/jpeg` (and `image/jpg`) - JPEG images (safe, universal compatibility)\n\nClients that support rendering icons SHOULD also support:\n- `image/svg+xml` - SVG images (scalable but requires security precautions)\n- `image/webp` - WebP images (modern, efficient format)",
          items: {
            $ref: "#/$defs/Icon"
          },
          type: "array"
        },
        mimeType: {
          description: "The MIME type of this resource, if known.",
          type: "string"
        },
        name: {
          description: "Intended for programmatic or logical use, but used as a display name in past specs or fallback (if title isn't present).",
          type: "string"
        },
        size: {
          description: "The size of the raw resource content, in bytes (i.e., before base64 encoding or any tokenization), if known.\n\nThis can be used by Hosts to display file sizes and estimate context window usage.",
          type: "integer"
        },
        title: {
          description: "Intended for UI and end-user contexts \u2014 optimized to be human-readable and easily understood,\neven by those unfamiliar with domain-specific terminology.\n\nIf not provided, the name should be used for display (except for Tool,\nwhere `annotations.title` should be given precedence over using `name`,\nif present).",
          type: "string"
        },
        type: {
          const: "resource_link",
          type: "string"
        },
        uri: {
          description: "The URI of this resource.",
          format: "uri",
          type: "string"
        }
      },
      required: [
        "name",
        "type",
        "uri"
      ],
      type: "object"
    },
    ResourceListChangedNotification: {
      description: "An optional notification from the server to the client, informing it that the list of resources it can read from has changed. This may be issued by servers without any previous subscription from the client.",
      properties: {
        jsonrpc: {
          const: "2.0",
          type: "string"
        },
        method: {
          const: "notifications/resources/list_changed",
          type: "string"
        },
        params: {
          $ref: "#/$defs/NotificationParams"
        }
      },
      required: [
        "jsonrpc",
        "method"
      ],
      type: "object"
    },
    ResourceRequestParams: {
      description: "Common parameters when working with resources.",
      properties: {
        _meta: {
          additionalProperties: {},
          description: "See [General fields: `_meta`](/specification/2025-11-25/basic/index#meta) for notes on `_meta` usage.",
          properties: {
            progressToken: {
              $ref: "#/$defs/ProgressToken",
              description: "If specified, the caller is requesting out-of-band progress notifications for this request (as represented by notifications/progress). The value of this parameter is an opaque token that will be attached to any subsequent notifications. The receiver is not obligated to provide these notifications."
            }
          },
          type: "object"
        },
        uri: {
          description: "The URI of the resource. The URI can use any protocol; it is up to the server how to interpret it.",
          format: "uri",
          type: "string"
        }
      },
      required: [
        "uri"
      ],
      type: "object"
    },
    ResourceTemplate: {
      description: "A template description for resources available on the server.",
      properties: {
        _meta: {
          additionalProperties: {},
          description: "See [General fields: `_meta`](/specification/2025-11-25/basic/index#meta) for notes on `_meta` usage.",
          type: "object"
        },
        annotations: {
          $ref: "#/$defs/Annotations",
          description: "Optional annotations for the client."
        },
        description: {
          description: `A description of what this template is for.

This can be used by clients to improve the LLM's understanding of available resources. It can be thought of like a "hint" to the model.`,
          type: "string"
        },
        icons: {
          description: "Optional set of sized icons that the client can display in a user interface.\n\nClients that support rendering icons MUST support at least the following MIME types:\n- `image/png` - PNG images (safe, universal compatibility)\n- `image/jpeg` (and `image/jpg`) - JPEG images (safe, universal compatibility)\n\nClients that support rendering icons SHOULD also support:\n- `image/svg+xml` - SVG images (scalable but requires security precautions)\n- `image/webp` - WebP images (modern, efficient format)",
          items: {
            $ref: "#/$defs/Icon"
          },
          type: "array"
        },
        mimeType: {
          description: "The MIME type for all resources that match this template. This should only be included if all resources matching this template have the same type.",
          type: "string"
        },
        name: {
          description: "Intended for programmatic or logical use, but used as a display name in past specs or fallback (if title isn't present).",
          type: "string"
        },
        title: {
          description: "Intended for UI and end-user contexts \u2014 optimized to be human-readable and easily understood,\neven by those unfamiliar with domain-specific terminology.\n\nIf not provided, the name should be used for display (except for Tool,\nwhere `annotations.title` should be given precedence over using `name`,\nif present).",
          type: "string"
        },
        uriTemplate: {
          description: "A URI template (according to RFC 6570) that can be used to construct resource URIs.",
          format: "uri-template",
          type: "string"
        }
      },
      required: [
        "name",
        "uriTemplate"
      ],
      type: "object"
    },
    ResourceTemplateReference: {
      description: "A reference to a resource or resource template definition.",
      properties: {
        type: {
          const: "ref/resource",
          type: "string"
        },
        uri: {
          description: "The URI or URI template of the resource.",
          format: "uri-template",
          type: "string"
        }
      },
      required: [
        "type",
        "uri"
      ],
      type: "object"
    },
    ResourceUpdatedNotification: {
      description: "A notification from the server to the client, informing it that a resource has changed and may need to be read again. This should only be sent if the client previously sent a resources/subscribe request.",
      properties: {
        jsonrpc: {
          const: "2.0",
          type: "string"
        },
        method: {
          const: "notifications/resources/updated",
          type: "string"
        },
        params: {
          $ref: "#/$defs/ResourceUpdatedNotificationParams"
        }
      },
      required: [
        "jsonrpc",
        "method",
        "params"
      ],
      type: "object"
    },
    ResourceUpdatedNotificationParams: {
      description: "Parameters for a `notifications/resources/updated` notification.",
      properties: {
        _meta: {
          additionalProperties: {},
          description: "See [General fields: `_meta`](/specification/2025-11-25/basic/index#meta) for notes on `_meta` usage.",
          type: "object"
        },
        uri: {
          description: "The URI of the resource that has been updated. This might be a sub-resource of the one that the client actually subscribed to.",
          format: "uri",
          type: "string"
        }
      },
      required: [
        "uri"
      ],
      type: "object"
    },
    Result: {
      additionalProperties: {},
      properties: {
        _meta: {
          additionalProperties: {},
          description: "See [General fields: `_meta`](/specification/2025-11-25/basic/index#meta) for notes on `_meta` usage.",
          type: "object"
        }
      },
      type: "object"
    },
    Role: {
      description: "The sender or recipient of messages and data in a conversation.",
      enum: [
        "assistant",
        "user"
      ],
      type: "string"
    },
    Root: {
      description: "Represents a root directory or file that the server can operate on.",
      properties: {
        _meta: {
          additionalProperties: {},
          description: "See [General fields: `_meta`](/specification/2025-11-25/basic/index#meta) for notes on `_meta` usage.",
          type: "object"
        },
        name: {
          description: "An optional name for the root. This can be used to provide a human-readable\nidentifier for the root, which may be useful for display purposes or for\nreferencing the root in other parts of the application.",
          type: "string"
        },
        uri: {
          description: "The URI identifying the root. This *must* start with file:// for now.\nThis restriction may be relaxed in future versions of the protocol to allow\nother URI schemes.",
          format: "uri",
          type: "string"
        }
      },
      required: [
        "uri"
      ],
      type: "object"
    },
    RootsListChangedNotification: {
      description: "A notification from the client to the server, informing it that the list of roots has changed.\nThis notification should be sent whenever the client adds, removes, or modifies any root.\nThe server should then request an updated list of roots using the ListRootsRequest.",
      properties: {
        jsonrpc: {
          const: "2.0",
          type: "string"
        },
        method: {
          const: "notifications/roots/list_changed",
          type: "string"
        },
        params: {
          $ref: "#/$defs/NotificationParams"
        }
      },
      required: [
        "jsonrpc",
        "method"
      ],
      type: "object"
    },
    SamplingMessage: {
      description: "Describes a message issued to or received from an LLM API.",
      properties: {
        _meta: {
          additionalProperties: {},
          description: "See [General fields: `_meta`](/specification/2025-11-25/basic/index#meta) for notes on `_meta` usage.",
          type: "object"
        },
        content: {
          anyOf: [
            {
              $ref: "#/$defs/TextContent"
            },
            {
              $ref: "#/$defs/ImageContent"
            },
            {
              $ref: "#/$defs/AudioContent"
            },
            {
              $ref: "#/$defs/ToolUseContent"
            },
            {
              $ref: "#/$defs/ToolResultContent"
            },
            {
              items: {
                $ref: "#/$defs/SamplingMessageContentBlock"
              },
              type: "array"
            }
          ]
        },
        role: {
          $ref: "#/$defs/Role"
        }
      },
      required: [
        "content",
        "role"
      ],
      type: "object"
    },
    SamplingMessageContentBlock: {
      anyOf: [
        {
          $ref: "#/$defs/TextContent"
        },
        {
          $ref: "#/$defs/ImageContent"
        },
        {
          $ref: "#/$defs/AudioContent"
        },
        {
          $ref: "#/$defs/ToolUseContent"
        },
        {
          $ref: "#/$defs/ToolResultContent"
        }
      ]
    },
    ServerCapabilities: {
      description: "Capabilities that a server may support. Known capabilities are defined here, in this schema, but this is not a closed set: any server can define its own, additional capabilities.",
      properties: {
        completions: {
          additionalProperties: true,
          description: "Present if the server supports argument autocompletion suggestions.",
          properties: {},
          type: "object"
        },
        experimental: {
          additionalProperties: {
            additionalProperties: true,
            properties: {},
            type: "object"
          },
          description: "Experimental, non-standard capabilities that the server supports.",
          type: "object"
        },
        logging: {
          additionalProperties: true,
          description: "Present if the server supports sending log messages to the client.",
          properties: {},
          type: "object"
        },
        prompts: {
          description: "Present if the server offers any prompt templates.",
          properties: {
            listChanged: {
              description: "Whether this server supports notifications for changes to the prompt list.",
              type: "boolean"
            }
          },
          type: "object"
        },
        resources: {
          description: "Present if the server offers any resources to read.",
          properties: {
            listChanged: {
              description: "Whether this server supports notifications for changes to the resource list.",
              type: "boolean"
            },
            subscribe: {
              description: "Whether this server supports subscribing to resource updates.",
              type: "boolean"
            }
          },
          type: "object"
        },
        tasks: {
          description: "Present if the server supports task-augmented requests.",
          properties: {
            cancel: {
              additionalProperties: true,
              description: "Whether this server supports tasks/cancel.",
              properties: {},
              type: "object"
            },
            list: {
              additionalProperties: true,
              description: "Whether this server supports tasks/list.",
              properties: {},
              type: "object"
            },
            requests: {
              description: "Specifies which request types can be augmented with tasks.",
              properties: {
                tools: {
                  description: "Task support for tool-related requests.",
                  properties: {
                    call: {
                      additionalProperties: true,
                      description: "Whether the server supports task-augmented tools/call requests.",
                      properties: {},
                      type: "object"
                    }
                  },
                  type: "object"
                }
              },
              type: "object"
            }
          },
          type: "object"
        },
        tools: {
          description: "Present if the server offers any tools to call.",
          properties: {
            listChanged: {
              description: "Whether this server supports notifications for changes to the tool list.",
              type: "boolean"
            }
          },
          type: "object"
        }
      },
      type: "object"
    },
    ServerNotification: {
      anyOf: [
        {
          $ref: "#/$defs/CancelledNotification"
        },
        {
          $ref: "#/$defs/ProgressNotification"
        },
        {
          $ref: "#/$defs/ResourceListChangedNotification"
        },
        {
          $ref: "#/$defs/ResourceUpdatedNotification"
        },
        {
          $ref: "#/$defs/PromptListChangedNotification"
        },
        {
          $ref: "#/$defs/ToolListChangedNotification"
        },
        {
          $ref: "#/$defs/TaskStatusNotification"
        },
        {
          $ref: "#/$defs/LoggingMessageNotification"
        },
        {
          $ref: "#/$defs/ElicitationCompleteNotification"
        }
      ]
    },
    ServerRequest: {
      anyOf: [
        {
          $ref: "#/$defs/PingRequest"
        },
        {
          $ref: "#/$defs/GetTaskRequest"
        },
        {
          $ref: "#/$defs/GetTaskPayloadRequest"
        },
        {
          $ref: "#/$defs/CancelTaskRequest"
        },
        {
          $ref: "#/$defs/ListTasksRequest"
        },
        {
          $ref: "#/$defs/CreateMessageRequest"
        },
        {
          $ref: "#/$defs/ListRootsRequest"
        },
        {
          $ref: "#/$defs/ElicitRequest"
        }
      ]
    },
    ServerResult: {
      anyOf: [
        {
          $ref: "#/$defs/Result"
        },
        {
          $ref: "#/$defs/InitializeResult"
        },
        {
          $ref: "#/$defs/ListResourcesResult"
        },
        {
          $ref: "#/$defs/ListResourceTemplatesResult"
        },
        {
          $ref: "#/$defs/ReadResourceResult"
        },
        {
          $ref: "#/$defs/ListPromptsResult"
        },
        {
          $ref: "#/$defs/GetPromptResult"
        },
        {
          $ref: "#/$defs/ListToolsResult"
        },
        {
          $ref: "#/$defs/CallToolResult"
        },
        {
          $ref: "#/$defs/GetTaskResult",
          description: "The response to a tasks/get request."
        },
        {
          $ref: "#/$defs/GetTaskPayloadResult"
        },
        {
          $ref: "#/$defs/CancelTaskResult",
          description: "The response to a tasks/cancel request."
        },
        {
          $ref: "#/$defs/ListTasksResult"
        },
        {
          $ref: "#/$defs/CompleteResult"
        }
      ]
    },
    SetLevelRequest: {
      description: "A request from the client to the server, to enable or adjust logging.",
      properties: {
        id: {
          $ref: "#/$defs/RequestId"
        },
        jsonrpc: {
          const: "2.0",
          type: "string"
        },
        method: {
          const: "logging/setLevel",
          type: "string"
        },
        params: {
          $ref: "#/$defs/SetLevelRequestParams"
        }
      },
      required: [
        "id",
        "jsonrpc",
        "method",
        "params"
      ],
      type: "object"
    },
    SetLevelRequestParams: {
      description: "Parameters for a `logging/setLevel` request.",
      properties: {
        _meta: {
          additionalProperties: {},
          description: "See [General fields: `_meta`](/specification/2025-11-25/basic/index#meta) for notes on `_meta` usage.",
          properties: {
            progressToken: {
              $ref: "#/$defs/ProgressToken",
              description: "If specified, the caller is requesting out-of-band progress notifications for this request (as represented by notifications/progress). The value of this parameter is an opaque token that will be attached to any subsequent notifications. The receiver is not obligated to provide these notifications."
            }
          },
          type: "object"
        },
        level: {
          $ref: "#/$defs/LoggingLevel",
          description: "The level of logging that the client wants to receive from the server. The server should send all logs at this level and higher (i.e., more severe) to the client as notifications/message."
        }
      },
      required: [
        "level"
      ],
      type: "object"
    },
    SingleSelectEnumSchema: {
      anyOf: [
        {
          $ref: "#/$defs/UntitledSingleSelectEnumSchema"
        },
        {
          $ref: "#/$defs/TitledSingleSelectEnumSchema"
        }
      ]
    },
    StringSchema: {
      properties: {
        default: {
          type: "string"
        },
        description: {
          type: "string"
        },
        format: {
          enum: [
            "date",
            "date-time",
            "email",
            "uri"
          ],
          type: "string"
        },
        maxLength: {
          type: "integer"
        },
        minLength: {
          type: "integer"
        },
        title: {
          type: "string"
        },
        type: {
          const: "string",
          type: "string"
        }
      },
      required: [
        "type"
      ],
      type: "object"
    },
    SubscribeRequest: {
      description: "Sent from the client to request resources/updated notifications from the server whenever a particular resource changes.",
      properties: {
        id: {
          $ref: "#/$defs/RequestId"
        },
        jsonrpc: {
          const: "2.0",
          type: "string"
        },
        method: {
          const: "resources/subscribe",
          type: "string"
        },
        params: {
          $ref: "#/$defs/SubscribeRequestParams"
        }
      },
      required: [
        "id",
        "jsonrpc",
        "method",
        "params"
      ],
      type: "object"
    },
    SubscribeRequestParams: {
      description: "Parameters for a `resources/subscribe` request.",
      properties: {
        _meta: {
          additionalProperties: {},
          description: "See [General fields: `_meta`](/specification/2025-11-25/basic/index#meta) for notes on `_meta` usage.",
          properties: {
            progressToken: {
              $ref: "#/$defs/ProgressToken",
              description: "If specified, the caller is requesting out-of-band progress notifications for this request (as represented by notifications/progress). The value of this parameter is an opaque token that will be attached to any subsequent notifications. The receiver is not obligated to provide these notifications."
            }
          },
          type: "object"
        },
        uri: {
          description: "The URI of the resource. The URI can use any protocol; it is up to the server how to interpret it.",
          format: "uri",
          type: "string"
        }
      },
      required: [
        "uri"
      ],
      type: "object"
    },
    Task: {
      description: "Data associated with a task.",
      properties: {
        createdAt: {
          description: "ISO 8601 timestamp when the task was created.",
          type: "string"
        },
        lastUpdatedAt: {
          description: "ISO 8601 timestamp when the task was last updated.",
          type: "string"
        },
        pollInterval: {
          description: "Suggested polling interval in milliseconds.",
          type: "integer"
        },
        status: {
          $ref: "#/$defs/TaskStatus",
          description: "Current task state."
        },
        statusMessage: {
          description: 'Optional human-readable message describing the current task state.\nThis can provide context for any status, including:\n- Reasons for "cancelled" status\n- Summaries for "completed" status\n- Diagnostic information for "failed" status (e.g., error details, what went wrong)',
          type: "string"
        },
        taskId: {
          description: "The task identifier.",
          type: "string"
        },
        ttl: {
          description: "Actual retention duration from creation in milliseconds, null for unlimited.",
          type: [
            "integer",
            "null"
          ]
        }
      },
      required: [
        "createdAt",
        "lastUpdatedAt",
        "status",
        "taskId",
        "ttl"
      ],
      type: "object"
    },
    TaskAugmentedRequestParams: {
      description: "Common params for any task-augmented request.",
      properties: {
        _meta: {
          additionalProperties: {},
          description: "See [General fields: `_meta`](/specification/2025-11-25/basic/index#meta) for notes on `_meta` usage.",
          properties: {
            progressToken: {
              $ref: "#/$defs/ProgressToken",
              description: "If specified, the caller is requesting out-of-band progress notifications for this request (as represented by notifications/progress). The value of this parameter is an opaque token that will be attached to any subsequent notifications. The receiver is not obligated to provide these notifications."
            }
          },
          type: "object"
        },
        task: {
          $ref: "#/$defs/TaskMetadata",
          description: "If specified, the caller is requesting task-augmented execution for this request.\nThe request will return a CreateTaskResult immediately, and the actual result can be\nretrieved later via tasks/result.\n\nTask augmentation is subject to capability negotiation - receivers MUST declare support\nfor task augmentation of specific request types in their capabilities."
        }
      },
      type: "object"
    },
    TaskMetadata: {
      description: "Metadata for augmenting a request with task execution.\nInclude this in the `task` field of the request parameters.",
      properties: {
        ttl: {
          description: "Requested duration in milliseconds to retain task from creation.",
          type: "integer"
        }
      },
      type: "object"
    },
    TaskStatus: {
      description: "The status of a task.",
      enum: [
        "cancelled",
        "completed",
        "failed",
        "input_required",
        "working"
      ],
      type: "string"
    },
    TaskStatusNotification: {
      description: "An optional notification from the receiver to the requestor, informing them that a task's status has changed. Receivers are not required to send these notifications.",
      properties: {
        jsonrpc: {
          const: "2.0",
          type: "string"
        },
        method: {
          const: "notifications/tasks/status",
          type: "string"
        },
        params: {
          $ref: "#/$defs/TaskStatusNotificationParams"
        }
      },
      required: [
        "jsonrpc",
        "method",
        "params"
      ],
      type: "object"
    },
    TaskStatusNotificationParams: {
      allOf: [
        {
          $ref: "#/$defs/NotificationParams"
        },
        {
          $ref: "#/$defs/Task"
        }
      ],
      description: "Parameters for a `notifications/tasks/status` notification."
    },
    TextContent: {
      description: "Text provided to or from an LLM.",
      properties: {
        _meta: {
          additionalProperties: {},
          description: "See [General fields: `_meta`](/specification/2025-11-25/basic/index#meta) for notes on `_meta` usage.",
          type: "object"
        },
        annotations: {
          $ref: "#/$defs/Annotations",
          description: "Optional annotations for the client."
        },
        text: {
          description: "The text content of the message.",
          type: "string"
        },
        type: {
          const: "text",
          type: "string"
        }
      },
      required: [
        "text",
        "type"
      ],
      type: "object"
    },
    TextResourceContents: {
      properties: {
        _meta: {
          additionalProperties: {},
          description: "See [General fields: `_meta`](/specification/2025-11-25/basic/index#meta) for notes on `_meta` usage.",
          type: "object"
        },
        mimeType: {
          description: "The MIME type of this resource, if known.",
          type: "string"
        },
        text: {
          description: "The text of the item. This must only be set if the item can actually be represented as text (not binary data).",
          type: "string"
        },
        uri: {
          description: "The URI of this resource.",
          format: "uri",
          type: "string"
        }
      },
      required: [
        "text",
        "uri"
      ],
      type: "object"
    },
    TitledMultiSelectEnumSchema: {
      description: "Schema for multiple-selection enumeration with display titles for each option.",
      properties: {
        default: {
          description: "Optional default value.",
          items: {
            type: "string"
          },
          type: "array"
        },
        description: {
          description: "Optional description for the enum field.",
          type: "string"
        },
        items: {
          description: "Schema for array items with enum options and display labels.",
          properties: {
            anyOf: {
              description: "Array of enum options with values and display labels.",
              items: {
                properties: {
                  const: {
                    description: "The constant enum value.",
                    type: "string"
                  },
                  title: {
                    description: "Display title for this option.",
                    type: "string"
                  }
                },
                required: [
                  "const",
                  "title"
                ],
                type: "object"
              },
              type: "array"
            }
          },
          required: [
            "anyOf"
          ],
          type: "object"
        },
        maxItems: {
          description: "Maximum number of items to select.",
          type: "integer"
        },
        minItems: {
          description: "Minimum number of items to select.",
          type: "integer"
        },
        title: {
          description: "Optional title for the enum field.",
          type: "string"
        },
        type: {
          const: "array",
          type: "string"
        }
      },
      required: [
        "items",
        "type"
      ],
      type: "object"
    },
    TitledSingleSelectEnumSchema: {
      description: "Schema for single-selection enumeration with display titles for each option.",
      properties: {
        default: {
          description: "Optional default value.",
          type: "string"
        },
        description: {
          description: "Optional description for the enum field.",
          type: "string"
        },
        oneOf: {
          description: "Array of enum options with values and display labels.",
          items: {
            properties: {
              const: {
                description: "The enum value.",
                type: "string"
              },
              title: {
                description: "Display label for this option.",
                type: "string"
              }
            },
            required: [
              "const",
              "title"
            ],
            type: "object"
          },
          type: "array"
        },
        title: {
          description: "Optional title for the enum field.",
          type: "string"
        },
        type: {
          const: "string",
          type: "string"
        }
      },
      required: [
        "oneOf",
        "type"
      ],
      type: "object"
    },
    Tool: {
      description: "Definition for a tool the client can call.",
      properties: {
        _meta: {
          additionalProperties: {},
          description: "See [General fields: `_meta`](/specification/2025-11-25/basic/index#meta) for notes on `_meta` usage.",
          type: "object"
        },
        annotations: {
          $ref: "#/$defs/ToolAnnotations",
          description: "Optional additional tool information.\n\nDisplay name precedence order is: title, annotations.title, then name."
        },
        description: {
          description: `A human-readable description of the tool.

This can be used by clients to improve the LLM's understanding of available tools. It can be thought of like a "hint" to the model.`,
          type: "string"
        },
        execution: {
          $ref: "#/$defs/ToolExecution",
          description: "Execution-related properties for this tool."
        },
        icons: {
          description: "Optional set of sized icons that the client can display in a user interface.\n\nClients that support rendering icons MUST support at least the following MIME types:\n- `image/png` - PNG images (safe, universal compatibility)\n- `image/jpeg` (and `image/jpg`) - JPEG images (safe, universal compatibility)\n\nClients that support rendering icons SHOULD also support:\n- `image/svg+xml` - SVG images (scalable but requires security precautions)\n- `image/webp` - WebP images (modern, efficient format)",
          items: {
            $ref: "#/$defs/Icon"
          },
          type: "array"
        },
        inputSchema: {
          description: "A JSON Schema object defining the expected parameters for the tool.",
          properties: {
            $schema: {
              type: "string"
            },
            properties: {
              additionalProperties: {
                additionalProperties: true,
                properties: {},
                type: "object"
              },
              type: "object"
            },
            required: {
              items: {
                type: "string"
              },
              type: "array"
            },
            type: {
              const: "object",
              type: "string"
            }
          },
          required: [
            "type"
          ],
          type: "object"
        },
        name: {
          description: "Intended for programmatic or logical use, but used as a display name in past specs or fallback (if title isn't present).",
          type: "string"
        },
        outputSchema: {
          description: `An optional JSON Schema object defining the structure of the tool's output returned in
the structuredContent field of a CallToolResult.

Defaults to JSON Schema 2020-12 when no explicit $schema is provided.
Currently restricted to type: "object" at the root level.`,
          properties: {
            $schema: {
              type: "string"
            },
            properties: {
              additionalProperties: {
                additionalProperties: true,
                properties: {},
                type: "object"
              },
              type: "object"
            },
            required: {
              items: {
                type: "string"
              },
              type: "array"
            },
            type: {
              const: "object",
              type: "string"
            }
          },
          required: [
            "type"
          ],
          type: "object"
        },
        title: {
          description: "Intended for UI and end-user contexts \u2014 optimized to be human-readable and easily understood,\neven by those unfamiliar with domain-specific terminology.\n\nIf not provided, the name should be used for display (except for Tool,\nwhere `annotations.title` should be given precedence over using `name`,\nif present).",
          type: "string"
        }
      },
      required: [
        "inputSchema",
        "name"
      ],
      type: "object"
    },
    ToolAnnotations: {
      description: "Additional properties describing a Tool to clients.\n\nNOTE: all properties in ToolAnnotations are **hints**.\nThey are not guaranteed to provide a faithful description of\ntool behavior (including descriptive properties like `title`).\n\nClients should never make tool use decisions based on ToolAnnotations\nreceived from untrusted servers.",
      properties: {
        destructiveHint: {
          description: "If true, the tool may perform destructive updates to its environment.\nIf false, the tool performs only additive updates.\n\n(This property is meaningful only when `readOnlyHint == false`)\n\nDefault: true",
          type: "boolean"
        },
        idempotentHint: {
          description: "If true, calling the tool repeatedly with the same arguments\nwill have no additional effect on its environment.\n\n(This property is meaningful only when `readOnlyHint == false`)\n\nDefault: false",
          type: "boolean"
        },
        openWorldHint: {
          description: `If true, this tool may interact with an "open world" of external
entities. If false, the tool's domain of interaction is closed.
For example, the world of a web search tool is open, whereas that
of a memory tool is not.

Default: true`,
          type: "boolean"
        },
        readOnlyHint: {
          description: "If true, the tool does not modify its environment.\n\nDefault: false",
          type: "boolean"
        },
        title: {
          description: "A human-readable title for the tool.",
          type: "string"
        }
      },
      type: "object"
    },
    ToolChoice: {
      description: "Controls tool selection behavior for sampling requests.",
      properties: {
        mode: {
          description: 'Controls the tool use ability of the model:\n- "auto": Model decides whether to use tools (default)\n- "required": Model MUST use at least one tool before completing\n- "none": Model MUST NOT use any tools',
          enum: [
            "auto",
            "none",
            "required"
          ],
          type: "string"
        }
      },
      type: "object"
    },
    ToolExecution: {
      description: "Execution-related properties for a tool.",
      properties: {
        taskSupport: {
          description: 'Indicates whether this tool supports task-augmented execution.\nThis allows clients to handle long-running operations through polling\nthe task system.\n\n- "forbidden": Tool does not support task-augmented execution (default when absent)\n- "optional": Tool may support task-augmented execution\n- "required": Tool requires task-augmented execution\n\nDefault: "forbidden"',
          enum: [
            "forbidden",
            "optional",
            "required"
          ],
          type: "string"
        }
      },
      type: "object"
    },
    ToolListChangedNotification: {
      description: "An optional notification from the server to the client, informing it that the list of tools it offers has changed. This may be issued by servers without any previous subscription from the client.",
      properties: {
        jsonrpc: {
          const: "2.0",
          type: "string"
        },
        method: {
          const: "notifications/tools/list_changed",
          type: "string"
        },
        params: {
          $ref: "#/$defs/NotificationParams"
        }
      },
      required: [
        "jsonrpc",
        "method"
      ],
      type: "object"
    },
    ToolResultContent: {
      description: "The result of a tool use, provided by the user back to the assistant.",
      properties: {
        _meta: {
          additionalProperties: {},
          description: "Optional metadata about the tool result. Clients SHOULD preserve this field when\nincluding tool results in subsequent sampling requests to enable caching optimizations.\n\nSee [General fields: `_meta`](/specification/2025-11-25/basic/index#meta) for notes on `_meta` usage.",
          type: "object"
        },
        content: {
          description: "The unstructured result content of the tool use.\n\nThis has the same format as CallToolResult.content and can include text, images,\naudio, resource links, and embedded resources.",
          items: {
            $ref: "#/$defs/ContentBlock"
          },
          type: "array"
        },
        isError: {
          description: "Whether the tool use resulted in an error.\n\nIf true, the content typically describes the error that occurred.\nDefault: false",
          type: "boolean"
        },
        structuredContent: {
          additionalProperties: {},
          description: "An optional structured result object.\n\nIf the tool defined an outputSchema, this SHOULD conform to that schema.",
          type: "object"
        },
        toolUseId: {
          description: "The ID of the tool use this result corresponds to.\n\nThis MUST match the ID from a previous ToolUseContent.",
          type: "string"
        },
        type: {
          const: "tool_result",
          type: "string"
        }
      },
      required: [
        "content",
        "toolUseId",
        "type"
      ],
      type: "object"
    },
    ToolUseContent: {
      description: "A request from the assistant to call a tool.",
      properties: {
        _meta: {
          additionalProperties: {},
          description: "Optional metadata about the tool use. Clients SHOULD preserve this field when\nincluding tool uses in subsequent sampling requests to enable caching optimizations.\n\nSee [General fields: `_meta`](/specification/2025-11-25/basic/index#meta) for notes on `_meta` usage.",
          type: "object"
        },
        id: {
          description: "A unique identifier for this tool use.\n\nThis ID is used to match tool results to their corresponding tool uses.",
          type: "string"
        },
        input: {
          additionalProperties: {},
          description: "The arguments to pass to the tool, conforming to the tool's input schema.",
          type: "object"
        },
        name: {
          description: "The name of the tool to call.",
          type: "string"
        },
        type: {
          const: "tool_use",
          type: "string"
        }
      },
      required: [
        "id",
        "input",
        "name",
        "type"
      ],
      type: "object"
    },
    URLElicitationRequiredError: {
      description: "An error response that indicates that the server requires the client to provide additional information via an elicitation request.",
      properties: {
        error: {
          allOf: [
            {
              $ref: "#/$defs/Error"
            },
            {
              properties: {
                code: {
                  const: -32042,
                  type: "integer"
                },
                data: {
                  additionalProperties: {},
                  properties: {
                    elicitations: {
                      items: {
                        $ref: "#/$defs/ElicitRequestURLParams"
                      },
                      type: "array"
                    }
                  },
                  required: [
                    "elicitations"
                  ],
                  type: "object"
                }
              },
              required: [
                "code",
                "data"
              ],
              type: "object"
            }
          ]
        },
        id: {
          $ref: "#/$defs/RequestId"
        },
        jsonrpc: {
          const: "2.0",
          type: "string"
        }
      },
      required: [
        "error",
        "jsonrpc"
      ],
      type: "object"
    },
    UnsubscribeRequest: {
      description: "Sent from the client to request cancellation of resources/updated notifications from the server. This should follow a previous resources/subscribe request.",
      properties: {
        id: {
          $ref: "#/$defs/RequestId"
        },
        jsonrpc: {
          const: "2.0",
          type: "string"
        },
        method: {
          const: "resources/unsubscribe",
          type: "string"
        },
        params: {
          $ref: "#/$defs/UnsubscribeRequestParams"
        }
      },
      required: [
        "id",
        "jsonrpc",
        "method",
        "params"
      ],
      type: "object"
    },
    UnsubscribeRequestParams: {
      description: "Parameters for a `resources/unsubscribe` request.",
      properties: {
        _meta: {
          additionalProperties: {},
          description: "See [General fields: `_meta`](/specification/2025-11-25/basic/index#meta) for notes on `_meta` usage.",
          properties: {
            progressToken: {
              $ref: "#/$defs/ProgressToken",
              description: "If specified, the caller is requesting out-of-band progress notifications for this request (as represented by notifications/progress). The value of this parameter is an opaque token that will be attached to any subsequent notifications. The receiver is not obligated to provide these notifications."
            }
          },
          type: "object"
        },
        uri: {
          description: "The URI of the resource. The URI can use any protocol; it is up to the server how to interpret it.",
          format: "uri",
          type: "string"
        }
      },
      required: [
        "uri"
      ],
      type: "object"
    },
    UntitledMultiSelectEnumSchema: {
      description: "Schema for multiple-selection enumeration without display titles for options.",
      properties: {
        default: {
          description: "Optional default value.",
          items: {
            type: "string"
          },
          type: "array"
        },
        description: {
          description: "Optional description for the enum field.",
          type: "string"
        },
        items: {
          description: "Schema for the array items.",
          properties: {
            enum: {
              description: "Array of enum values to choose from.",
              items: {
                type: "string"
              },
              type: "array"
            },
            type: {
              const: "string",
              type: "string"
            }
          },
          required: [
            "enum",
            "type"
          ],
          type: "object"
        },
        maxItems: {
          description: "Maximum number of items to select.",
          type: "integer"
        },
        minItems: {
          description: "Minimum number of items to select.",
          type: "integer"
        },
        title: {
          description: "Optional title for the enum field.",
          type: "string"
        },
        type: {
          const: "array",
          type: "string"
        }
      },
      required: [
        "items",
        "type"
      ],
      type: "object"
    },
    UntitledSingleSelectEnumSchema: {
      description: "Schema for single-selection enumeration without display titles for options.",
      properties: {
        default: {
          description: "Optional default value.",
          type: "string"
        },
        description: {
          description: "Optional description for the enum field.",
          type: "string"
        },
        enum: {
          description: "Array of enum values to choose from.",
          items: {
            type: "string"
          },
          type: "array"
        },
        title: {
          description: "Optional title for the enum field.",
          type: "string"
        },
        type: {
          const: "string",
          type: "string"
        }
      },
      required: [
        "enum",
        "type"
      ],
      type: "object"
    }
  }
};

// spec/2026-07-28/schema.json
var schema_default2 = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $defs: {
    Annotations: {
      description: "Optional annotations for the client. The client can use annotations to inform how objects are used or displayed",
      properties: {
        audience: {
          description: 'Describes who the intended audience of this object or data is.\n\nIt can include multiple entries to indicate content useful for multiple audiences (e.g., `["user", "assistant"]`).',
          items: {
            $ref: "#/$defs/Role"
          },
          type: "array"
        },
        lastModified: {
          description: 'The moment the resource was last modified, as an ISO 8601 formatted string.\n\nShould be an ISO 8601 formatted string (e.g., "2025-01-12T15:00:58Z").\n\nExamples: last activity timestamp in an open file, timestamp when the resource\nwas attached, etc.',
          type: "string"
        },
        priority: {
          description: 'Describes how important this data is for operating the server.\n\nA value of 1 means "most important," and indicates that the data is\neffectively required, while 0 means "least important," and indicates that\nthe data is entirely optional.',
          maximum: 1,
          minimum: 0,
          type: "number"
        }
      },
      type: "object"
    },
    AudioContent: {
      description: "Audio provided to or from an LLM.",
      properties: {
        _meta: {
          $ref: "#/$defs/MetaObject"
        },
        annotations: {
          $ref: "#/$defs/Annotations",
          description: "Optional annotations for the client."
        },
        data: {
          description: "The base64-encoded audio data.",
          format: "byte",
          type: "string"
        },
        mimeType: {
          description: "The MIME type of the audio. Different providers may support different audio types.",
          type: "string"
        },
        type: {
          const: "audio",
          type: "string"
        }
      },
      required: [
        "data",
        "mimeType",
        "type"
      ],
      type: "object"
    },
    BaseMetadata: {
      description: "Base interface for metadata with name (identifier) and title (display name) properties.",
      properties: {
        name: {
          description: "Intended for programmatic or logical use, but used as a display name in past specs or fallback (if title isn't present).",
          type: "string"
        },
        title: {
          description: "Intended for UI and end-user contexts \u2014 optimized to be human-readable and easily understood,\neven by those unfamiliar with domain-specific terminology.\n\nIf not provided, the name should be used for display (except for {@link Tool},\nwhere `annotations.title` should be given precedence over using `name`,\nif present).",
          type: "string"
        }
      },
      required: [
        "name"
      ],
      type: "object"
    },
    BlobResourceContents: {
      properties: {
        _meta: {
          $ref: "#/$defs/MetaObject"
        },
        blob: {
          description: "A base64-encoded string representing the binary data of the item.",
          format: "byte",
          type: "string"
        },
        mimeType: {
          description: "The MIME type of this resource, if known.",
          type: "string"
        },
        uri: {
          description: "The URI of this resource.",
          format: "uri",
          type: "string"
        }
      },
      required: [
        "blob",
        "uri"
      ],
      type: "object"
    },
    BooleanSchema: {
      properties: {
        default: {
          type: "boolean"
        },
        description: {
          type: "string"
        },
        title: {
          type: "string"
        },
        type: {
          const: "boolean",
          type: "string"
        }
      },
      required: [
        "type"
      ],
      type: "object"
    },
    CacheableResult: {
      description: "A result that supports a time-to-live (TTL) hint for client-side caching.",
      properties: {
        _meta: {
          $ref: "#/$defs/ResultMetaObject"
        },
        cacheScope: {
          description: 'Indicates the intended scope of the cached response, analogous to HTTP\n`Cache-Control: public` vs `Cache-Control: private`.\n\n- `"public"`: The response does not contain user-specific data. Any\n  client or intermediary (e.g., shared gateway, caching proxy) MAY cache\n  the response and serve it across authorization contexts.\n- `"private"`: The response MAY be cached and reused only within the\n  same authorization context. Caches MUST NOT be shared across\n  authorization contexts (e.g., a different access token requires a\n  different cache).',
          enum: [
            "private",
            "public"
          ],
          type: "string"
        },
        resultType: {
          description: 'Indicates the type of the result, which allows the client to determine\nhow to parse the result object.\n\nServers implementing this protocol version MUST include this field.\nFor backward compatibility, when a client receives a result from a\nserver implementing an earlier protocol version (which does not include\n`resultType`), the client MUST treat the absent field as `"complete"`.',
          type: "string"
        },
        ttlMs: {
          description: "A hint from the server indicating how long (in milliseconds) the\nclient MAY cache this response before re-fetching. Semantics are\nanalogous to HTTP Cache-Control max-age.\n\n- If 0, The response SHOULD be considered immediately stale,\n  The client MAY re-fetch every time the result is needed.\n- If positive, the client SHOULD consider the result fresh for this many\n  milliseconds after receiving the response.",
          minimum: 0,
          type: "integer"
        }
      },
      required: [
        "cacheScope",
        "resultType",
        "ttlMs"
      ],
      type: "object"
    },
    CallToolRequest: {
      description: "Used by the client to invoke a tool provided by the server.",
      properties: {
        id: {
          $ref: "#/$defs/RequestId"
        },
        jsonrpc: {
          const: "2.0",
          type: "string"
        },
        method: {
          const: "tools/call",
          type: "string"
        },
        params: {
          $ref: "#/$defs/CallToolRequestParams"
        }
      },
      required: [
        "id",
        "jsonrpc",
        "method",
        "params"
      ],
      type: "object"
    },
    CallToolRequestParams: {
      description: "Parameters for a `tools/call` request.",
      properties: {
        _meta: {
          $ref: "#/$defs/RequestMetaObject"
        },
        arguments: {
          additionalProperties: {},
          description: "Arguments to use for the tool call.",
          type: "object"
        },
        inputResponses: {
          $ref: "#/$defs/InputResponses"
        },
        name: {
          description: "The name of the tool.",
          type: "string"
        },
        requestState: {
          type: "string"
        }
      },
      required: [
        "_meta",
        "name"
      ],
      type: "object"
    },
    CallToolResult: {
      description: "The result returned by the server for a {@link CallToolRequesttools/call} request.",
      properties: {
        _meta: {
          $ref: "#/$defs/ResultMetaObject"
        },
        content: {
          description: "A list of content objects that represent the unstructured result of the tool call.",
          items: {
            $ref: "#/$defs/ContentBlock"
          },
          type: "array"
        },
        isError: {
          description: "Whether the tool call ended in an error.\n\nIf not set, this is assumed to be false (the call was successful).\n\nAny errors that originate from the tool SHOULD be reported inside the result\nobject, with `isError` set to true, _not_ as an MCP protocol-level error\nresponse. Otherwise, the LLM would not be able to see that an error occurred\nand self-correct.\n\nHowever, any errors in _finding_ the tool, an error indicating that the\nserver does not support tool calls, or any other exceptional conditions,\nshould be reported as an MCP error response.",
          type: "boolean"
        },
        resultType: {
          description: 'Indicates the type of the result, which allows the client to determine\nhow to parse the result object.\n\nServers implementing this protocol version MUST include this field.\nFor backward compatibility, when a client receives a result from a\nserver implementing an earlier protocol version (which does not include\n`resultType`), the client MUST treat the absent field as `"complete"`.',
          type: "string"
        },
        structuredContent: {
          description: "An optional JSON value that represents the structured result of the tool call.\n\nThis can be any JSON value (object, array, string, number, boolean, or null)\nthat conforms to the tool's outputSchema if one is defined."
        }
      },
      required: [
        "content",
        "resultType"
      ],
      type: "object"
    },
    CallToolResultResponse: {
      description: "A successful response from the server for a {@link CallToolRequesttools/call} request.",
      properties: {
        id: {
          $ref: "#/$defs/RequestId"
        },
        jsonrpc: {
          const: "2.0",
          type: "string"
        },
        result: {
          anyOf: [
            {
              $ref: "#/$defs/InputRequiredResult"
            },
            {
              $ref: "#/$defs/CallToolResult"
            }
          ]
        }
      },
      required: [
        "id",
        "jsonrpc",
        "result"
      ],
      type: "object"
    },
    CancelledNotification: {
      description: "This notification is sent by the client to indicate that it is cancelling a request it previously issued.\n\nOn stdio, the server also sends this notification, solely to terminate a {@link SubscriptionsListenRequestsubscriptions/listen} stream: it references the ID of the `subscriptions/listen` request that opened the stream. Servers MUST NOT use this notification to cancel any other request.\n\nThe request SHOULD still be in-flight, but due to communication latency, it is always possible that this notification MAY arrive after the request has already finished.\n\nThis notification indicates that the result will be unused, so any associated processing SHOULD cease.",
      properties: {
        jsonrpc: {
          const: "2.0",
          type: "string"
        },
        method: {
          const: "notifications/cancelled",
          type: "string"
        },
        params: {
          $ref: "#/$defs/CancelledNotificationParams"
        }
      },
      required: [
        "jsonrpc",
        "method",
        "params"
      ],
      type: "object"
    },
    CancelledNotificationParams: {
      description: "Parameters for a `notifications/cancelled` notification.",
      properties: {
        _meta: {
          $ref: "#/$defs/NotificationMetaObject"
        },
        reason: {
          description: "An optional string describing the reason for the cancellation. This MAY be logged or presented to the user.",
          type: "string"
        },
        requestId: {
          $ref: "#/$defs/RequestId",
          description: "The ID of the request to cancel.\n\nThis MUST correspond to the ID of a request the client previously issued."
        }
      },
      required: [
        "requestId"
      ],
      type: "object"
    },
    ClientCapabilities: {
      description: "Capabilities a client may support. Known capabilities are defined here, in this schema, but this is not a closed set: any client can define its own, additional capabilities.",
      properties: {
        elicitation: {
          description: "Present if the client supports elicitation from the server.",
          properties: {
            form: {
              $ref: "#/$defs/JSONObject"
            },
            url: {
              $ref: "#/$defs/JSONObject"
            }
          },
          type: "object"
        },
        experimental: {
          additionalProperties: {
            $ref: "#/$defs/JSONObject"
          },
          description: "Experimental, non-standard capabilities that the client supports.",
          type: "object"
        },
        extensions: {
          additionalProperties: {
            $ref: "#/$defs/JSONObject"
          },
          description: 'Optional MCP extensions that the client supports. Keys are extension identifiers\n(e.g., "io.modelcontextprotocol/oauth-client-credentials"), and values are\nper-extension settings objects. An empty object indicates support with no settings.\n\nKeys MUST follow the {@link MetaObject`_meta` key naming rules}, with a\nmandatory prefix.',
          type: "object"
        },
        roots: {
          description: "Present if the client supports listing roots.",
          properties: {},
          type: "object"
        },
        sampling: {
          description: "Present if the client supports sampling from an LLM.",
          properties: {
            context: {
              $ref: "#/$defs/JSONObject",
              description: 'Whether the client supports context inclusion via `includeContext` parameter.\nIf not declared, servers SHOULD only use `includeContext: "none"` (or omit it).'
            },
            tools: {
              $ref: "#/$defs/JSONObject",
              description: "Whether the client supports tool use via `tools` and `toolChoice` parameters."
            }
          },
          type: "object"
        }
      },
      type: "object"
    },
    ClientNotification: {
      description: "This notification is sent by the client to indicate that it is cancelling a request it previously issued.\n\nOn stdio, the server also sends this notification, solely to terminate a {@link SubscriptionsListenRequestsubscriptions/listen} stream: it references the ID of the `subscriptions/listen` request that opened the stream. Servers MUST NOT use this notification to cancel any other request.\n\nThe request SHOULD still be in-flight, but due to communication latency, it is always possible that this notification MAY arrive after the request has already finished.\n\nThis notification indicates that the result will be unused, so any associated processing SHOULD cease.",
      properties: {
        jsonrpc: {
          const: "2.0",
          type: "string"
        },
        method: {
          const: "notifications/cancelled",
          type: "string"
        },
        params: {
          $ref: "#/$defs/CancelledNotificationParams"
        }
      },
      required: [
        "jsonrpc",
        "method",
        "params"
      ],
      type: "object"
    },
    ClientRequest: {
      anyOf: [
        {
          $ref: "#/$defs/DiscoverRequest"
        },
        {
          $ref: "#/$defs/ListResourcesRequest"
        },
        {
          $ref: "#/$defs/ListResourceTemplatesRequest"
        },
        {
          $ref: "#/$defs/ReadResourceRequest"
        },
        {
          $ref: "#/$defs/SubscriptionsListenRequest"
        },
        {
          $ref: "#/$defs/ListPromptsRequest"
        },
        {
          $ref: "#/$defs/GetPromptRequest"
        },
        {
          $ref: "#/$defs/ListToolsRequest"
        },
        {
          $ref: "#/$defs/CallToolRequest"
        },
        {
          $ref: "#/$defs/CompleteRequest"
        }
      ]
    },
    ClientResult: {
      $ref: "#/$defs/Result",
      description: "Common result fields."
    },
    CompleteRequest: {
      description: "A request from the client to the server, to ask for completion options.",
      properties: {
        id: {
          $ref: "#/$defs/RequestId"
        },
        jsonrpc: {
          const: "2.0",
          type: "string"
        },
        method: {
          const: "completion/complete",
          type: "string"
        },
        params: {
          $ref: "#/$defs/CompleteRequestParams"
        }
      },
      required: [
        "id",
        "jsonrpc",
        "method",
        "params"
      ],
      type: "object"
    },
    CompleteRequestParams: {
      description: "Parameters for a `completion/complete` request.",
      properties: {
        _meta: {
          $ref: "#/$defs/RequestMetaObject"
        },
        argument: {
          description: "The argument's information",
          properties: {
            name: {
              description: "The name of the argument",
              type: "string"
            },
            value: {
              description: "The value of the argument to use for completion matching.",
              type: "string"
            }
          },
          required: [
            "name",
            "value"
          ],
          type: "object"
        },
        context: {
          description: "Additional, optional context for completions",
          properties: {
            arguments: {
              additionalProperties: {
                type: "string"
              },
              description: "Previously-resolved variables in a URI template or prompt.",
              type: "object"
            }
          },
          type: "object"
        },
        ref: {
          anyOf: [
            {
              $ref: "#/$defs/PromptReference"
            },
            {
              $ref: "#/$defs/ResourceTemplateReference"
            }
          ]
        }
      },
      required: [
        "_meta",
        "argument",
        "ref"
      ],
      type: "object"
    },
    CompleteResult: {
      description: "The result returned by the server for a {@link CompleteRequestcompletion/complete} request.",
      properties: {
        _meta: {
          $ref: "#/$defs/ResultMetaObject"
        },
        completion: {
          properties: {
            hasMore: {
              description: "Indicates whether there are additional completion options beyond those provided in the current response, even if the exact total is unknown.",
              type: "boolean"
            },
            total: {
              description: "The total number of completion options available. This can exceed the number of values actually sent in the response.",
              type: "integer"
            },
            values: {
              description: "An array of completion values. Must not exceed 100 items.",
              items: {
                type: "string"
              },
              maxItems: 100,
              type: "array"
            }
          },
          required: [
            "values"
          ],
          type: "object"
        },
        resultType: {
          description: 'Indicates the type of the result, which allows the client to determine\nhow to parse the result object.\n\nServers implementing this protocol version MUST include this field.\nFor backward compatibility, when a client receives a result from a\nserver implementing an earlier protocol version (which does not include\n`resultType`), the client MUST treat the absent field as `"complete"`.',
          type: "string"
        }
      },
      required: [
        "completion",
        "resultType"
      ],
      type: "object"
    },
    CompleteResultResponse: {
      description: "A successful response from the server for a {@link CompleteRequestcompletion/complete} request.",
      properties: {
        id: {
          $ref: "#/$defs/RequestId"
        },
        jsonrpc: {
          const: "2.0",
          type: "string"
        },
        result: {
          $ref: "#/$defs/CompleteResult"
        }
      },
      required: [
        "id",
        "jsonrpc",
        "result"
      ],
      type: "object"
    },
    ContentBlock: {
      anyOf: [
        {
          $ref: "#/$defs/TextContent"
        },
        {
          $ref: "#/$defs/ImageContent"
        },
        {
          $ref: "#/$defs/AudioContent"
        },
        {
          $ref: "#/$defs/ResourceLink"
        },
        {
          $ref: "#/$defs/EmbeddedResource"
        }
      ]
    },
    CreateMessageRequest: {
      description: "A request from the server to sample an LLM via the client. The client has full discretion over which model to select. The client should also inform the user before beginning sampling, to allow them to inspect the request (human in the loop) and decide whether to approve it.",
      properties: {
        method: {
          const: "sampling/createMessage",
          type: "string"
        },
        params: {
          $ref: "#/$defs/CreateMessageRequestParams"
        }
      },
      required: [
        "method",
        "params"
      ],
      type: "object"
    },
    CreateMessageRequestParams: {
      description: "Parameters for a `sampling/createMessage` request.",
      properties: {
        includeContext: {
          description: 'A request to include context from one or more MCP servers (including the caller), to be attached to the prompt.\nThe client MAY ignore this request.\n\nDefault is `"none"`. The values `"thisServer"` and `"allServers"` are deprecated (SEP-2596): servers SHOULD\nomit this field or use `"none"`, and SHOULD only use the deprecated values if the client declares\n{@link ClientCapabilities.sampling.context}.',
          enum: [
            "allServers",
            "none",
            "thisServer"
          ],
          type: "string"
        },
        maxTokens: {
          description: "The requested maximum number of tokens to sample (to prevent runaway completions).\n\nThe client MAY choose to sample fewer tokens than the requested maximum.",
          type: "integer"
        },
        messages: {
          items: {
            $ref: "#/$defs/SamplingMessage"
          },
          type: "array"
        },
        metadata: {
          $ref: "#/$defs/JSONObject",
          description: "Optional metadata to pass through to the LLM provider. The format of this metadata is provider-specific."
        },
        modelPreferences: {
          $ref: "#/$defs/ModelPreferences",
          description: "The server's preferences for which model to select. The client MAY ignore these preferences."
        },
        stopSequences: {
          items: {
            type: "string"
          },
          type: "array"
        },
        systemPrompt: {
          description: "An optional system prompt the server wants to use for sampling. The client MAY modify or omit this prompt.",
          type: "string"
        },
        temperature: {
          type: "number"
        },
        toolChoice: {
          $ref: "#/$defs/ToolChoice",
          description: 'Controls how the model uses tools.\nThe client MUST return an error if this field is provided but {@link ClientCapabilities.sampling.tools} is not declared.\nDefault is `{ mode: "auto" }`.'
        },
        tools: {
          description: "Tools that the model may use during generation.\nThe client MUST return an error if this field is provided but {@link ClientCapabilities.sampling.tools} is not declared.",
          items: {
            $ref: "#/$defs/Tool"
          },
          type: "array"
        }
      },
      required: [
        "maxTokens",
        "messages"
      ],
      type: "object"
    },
    CreateMessageResult: {
      description: "The result returned by the client for a {@link CreateMessageRequestsampling/createMessage} request.\nThe client should inform the user before returning the sampled message, to allow them\nto inspect the response (human in the loop) and decide whether to allow the server to see it.",
      properties: {
        _meta: {
          $ref: "#/$defs/MetaObject"
        },
        content: {
          anyOf: [
            {
              $ref: "#/$defs/TextContent"
            },
            {
              $ref: "#/$defs/ImageContent"
            },
            {
              $ref: "#/$defs/AudioContent"
            },
            {
              $ref: "#/$defs/ToolUseContent"
            },
            {
              $ref: "#/$defs/ToolResultContent"
            },
            {
              items: {
                $ref: "#/$defs/SamplingMessageContentBlock"
              },
              type: "array"
            }
          ]
        },
        model: {
          description: "The name of the model that generated the message.",
          type: "string"
        },
        role: {
          $ref: "#/$defs/Role"
        },
        stopReason: {
          description: 'The reason why sampling stopped, if known.\n\nStandard values:\n- `"endTurn"`: Natural end of the assistant\'s turn\n- `"stopSequence"`: A stop sequence was encountered\n- `"maxTokens"`: Maximum token limit was reached\n- `"toolUse"`: The model wants to use one or more tools\n\nThis field is an open string to allow for provider-specific stop reasons.',
          type: "string"
        }
      },
      required: [
        "content",
        "model",
        "role"
      ],
      type: "object"
    },
    Cursor: {
      description: "An opaque token used to represent a cursor for pagination.",
      type: "string"
    },
    DiscoverRequest: {
      description: "A request from the client asking the server to advertise its supported\nprotocol versions, capabilities, and other metadata. Servers **MUST**\nimplement `server/discover`. Clients **MAY** call it but are not required\nto \u2014 version negotiation can also happen inline via per-request `_meta`.",
      properties: {
        id: {
          $ref: "#/$defs/RequestId"
        },
        jsonrpc: {
          const: "2.0",
          type: "string"
        },
        method: {
          const: "server/discover",
          type: "string"
        },
        params: {
          $ref: "#/$defs/RequestParams"
        }
      },
      required: [
        "id",
        "jsonrpc",
        "method",
        "params"
      ],
      type: "object"
    },
    DiscoverResult: {
      description: "The result returned by the server for a {@link DiscoverRequestserver/discover} request.",
      properties: {
        _meta: {
          $ref: "#/$defs/ResultMetaObject"
        },
        cacheScope: {
          description: 'Indicates the intended scope of the cached response, analogous to HTTP\n`Cache-Control: public` vs `Cache-Control: private`.\n\n- `"public"`: The response does not contain user-specific data. Any\n  client or intermediary (e.g., shared gateway, caching proxy) MAY cache\n  the response and serve it across authorization contexts.\n- `"private"`: The response MAY be cached and reused only within the\n  same authorization context. Caches MUST NOT be shared across\n  authorization contexts (e.g., a different access token requires a\n  different cache).',
          enum: [
            "private",
            "public"
          ],
          type: "string"
        },
        capabilities: {
          $ref: "#/$defs/ServerCapabilities",
          description: "The capabilities of the server."
        },
        instructions: {
          description: "Natural-language guidance describing the server and its features.\n\nThis can be used by clients to improve an LLM's understanding of\navailable tools (e.g., by including it in a system prompt). It should\nfocus on information that helps the model use the server effectively\nand should not duplicate information already in tool descriptions.",
          type: "string"
        },
        resultType: {
          description: 'Indicates the type of the result, which allows the client to determine\nhow to parse the result object.\n\nServers implementing this protocol version MUST include this field.\nFor backward compatibility, when a client receives a result from a\nserver implementing an earlier protocol version (which does not include\n`resultType`), the client MUST treat the absent field as `"complete"`.',
          type: "string"
        },
        supportedVersions: {
          description: "MCP Protocol Versions this server supports. The client should choose a\nversion from this list for use in subsequent requests.",
          items: {
            type: "string"
          },
          type: "array"
        },
        ttlMs: {
          description: "A hint from the server indicating how long (in milliseconds) the\nclient MAY cache this response before re-fetching. Semantics are\nanalogous to HTTP Cache-Control max-age.\n\n- If 0, The response SHOULD be considered immediately stale,\n  The client MAY re-fetch every time the result is needed.\n- If positive, the client SHOULD consider the result fresh for this many\n  milliseconds after receiving the response.",
          minimum: 0,
          type: "integer"
        }
      },
      required: [
        "cacheScope",
        "capabilities",
        "resultType",
        "supportedVersions",
        "ttlMs"
      ],
      type: "object"
    },
    DiscoverResultResponse: {
      description: "A successful response from the server for a {@link DiscoverRequestserver/discover} request.",
      properties: {
        id: {
          $ref: "#/$defs/RequestId"
        },
        jsonrpc: {
          const: "2.0",
          type: "string"
        },
        result: {
          $ref: "#/$defs/DiscoverResult"
        }
      },
      required: [
        "id",
        "jsonrpc",
        "result"
      ],
      type: "object"
    },
    ElicitRequest: {
      description: "A request from the server to elicit additional information from the user via the client.",
      properties: {
        method: {
          const: "elicitation/create",
          type: "string"
        },
        params: {
          $ref: "#/$defs/ElicitRequestParams"
        }
      },
      required: [
        "method",
        "params"
      ],
      type: "object"
    },
    ElicitRequestFormParams: {
      description: "The parameters for a request to elicit non-sensitive information from the user via a form in the client.",
      properties: {
        message: {
          description: "The message to present to the user describing what information is being requested.",
          type: "string"
        },
        mode: {
          const: "form",
          description: "The elicitation mode.",
          type: "string"
        },
        requestedSchema: {
          description: "A restricted subset of JSON Schema.\nOnly top-level properties are allowed, without nesting.",
          properties: {
            $schema: {
              type: "string"
            },
            properties: {
              additionalProperties: {
                $ref: "#/$defs/PrimitiveSchemaDefinition"
              },
              type: "object"
            },
            required: {
              items: {
                type: "string"
              },
              type: "array"
            },
            type: {
              const: "object",
              type: "string"
            }
          },
          required: [
            "properties",
            "type"
          ],
          type: "object"
        }
      },
      required: [
        "message",
        "requestedSchema"
      ],
      type: "object"
    },
    ElicitRequestParams: {
      anyOf: [
        {
          $ref: "#/$defs/ElicitRequestFormParams"
        },
        {
          $ref: "#/$defs/ElicitRequestURLParams"
        }
      ],
      description: "The parameters for a request to elicit additional information from the user via the client."
    },
    ElicitRequestURLParams: {
      description: "The parameters for a request to elicit information from the user via a URL in the client.",
      properties: {
        message: {
          description: "The message to present to the user explaining why the interaction is needed.",
          type: "string"
        },
        mode: {
          const: "url",
          description: "The elicitation mode.",
          type: "string"
        },
        url: {
          description: "The URL that the user should navigate to.",
          format: "uri",
          type: "string"
        }
      },
      required: [
        "message",
        "mode",
        "url"
      ],
      type: "object"
    },
    ElicitResult: {
      description: "The result returned by the client for an {@link ElicitRequestelicitation/create} request.",
      properties: {
        action: {
          description: 'The user action in response to the elicitation.\n- `"accept"`: User submitted the form/confirmed the action\n- `"decline"`: User explicitly declined the action\n- `"cancel"`: User dismissed without making an explicit choice',
          enum: [
            "accept",
            "cancel",
            "decline"
          ],
          type: "string"
        },
        content: {
          additionalProperties: {
            anyOf: [
              {
                items: {
                  type: "string"
                },
                type: "array"
              },
              {
                type: [
                  "string",
                  "integer",
                  "boolean"
                ]
              }
            ]
          },
          description: 'The submitted form data, only present when action is `"accept"` and mode was `"form"`.\nContains values matching the requested schema.\nOmitted for out-of-band mode responses.',
          type: "object"
        }
      },
      required: [
        "action"
      ],
      type: "object"
    },
    EmbeddedResource: {
      description: "The contents of a resource, embedded into a prompt or tool call result.\n\nIt is up to the client how best to render embedded resources for the benefit\nof the LLM and/or the user.",
      properties: {
        _meta: {
          $ref: "#/$defs/MetaObject"
        },
        annotations: {
          $ref: "#/$defs/Annotations",
          description: "Optional annotations for the client."
        },
        resource: {
          anyOf: [
            {
              $ref: "#/$defs/TextResourceContents"
            },
            {
              $ref: "#/$defs/BlobResourceContents"
            }
          ]
        },
        type: {
          const: "resource",
          type: "string"
        }
      },
      required: [
        "resource",
        "type"
      ],
      type: "object"
    },
    EmptyResult: {
      $ref: "#/$defs/Result",
      description: "Common result fields."
    },
    EnumSchema: {
      anyOf: [
        {
          $ref: "#/$defs/UntitledSingleSelectEnumSchema"
        },
        {
          $ref: "#/$defs/TitledSingleSelectEnumSchema"
        },
        {
          $ref: "#/$defs/UntitledMultiSelectEnumSchema"
        },
        {
          $ref: "#/$defs/TitledMultiSelectEnumSchema"
        },
        {
          $ref: "#/$defs/LegacyTitledEnumSchema"
        }
      ]
    },
    Error: {
      properties: {
        code: {
          description: "The error type that occurred.",
          type: "integer"
        },
        data: {
          description: "Additional information about the error. The value of this member is defined by the sender (e.g. detailed error information, nested errors etc.)."
        },
        message: {
          description: "A short description of the error. The message SHOULD be limited to a concise single sentence.",
          type: "string"
        }
      },
      required: [
        "code",
        "message"
      ],
      type: "object"
    },
    GetPromptRequest: {
      description: "Used by the client to get a prompt provided by the server.",
      properties: {
        id: {
          $ref: "#/$defs/RequestId"
        },
        jsonrpc: {
          const: "2.0",
          type: "string"
        },
        method: {
          const: "prompts/get",
          type: "string"
        },
        params: {
          $ref: "#/$defs/GetPromptRequestParams"
        }
      },
      required: [
        "id",
        "jsonrpc",
        "method",
        "params"
      ],
      type: "object"
    },
    GetPromptRequestParams: {
      description: "Parameters for a `prompts/get` request.",
      properties: {
        _meta: {
          $ref: "#/$defs/RequestMetaObject"
        },
        arguments: {
          additionalProperties: {
            type: "string"
          },
          description: "Arguments to use for templating the prompt.",
          type: "object"
        },
        inputResponses: {
          $ref: "#/$defs/InputResponses"
        },
        name: {
          description: "The name of the prompt or prompt template.",
          type: "string"
        },
        requestState: {
          type: "string"
        }
      },
      required: [
        "_meta",
        "name"
      ],
      type: "object"
    },
    GetPromptResult: {
      description: "The result returned by the server for a {@link GetPromptRequestprompts/get} request.",
      properties: {
        _meta: {
          $ref: "#/$defs/ResultMetaObject"
        },
        description: {
          description: "An optional description for the prompt.",
          type: "string"
        },
        messages: {
          items: {
            $ref: "#/$defs/PromptMessage"
          },
          type: "array"
        },
        resultType: {
          description: 'Indicates the type of the result, which allows the client to determine\nhow to parse the result object.\n\nServers implementing this protocol version MUST include this field.\nFor backward compatibility, when a client receives a result from a\nserver implementing an earlier protocol version (which does not include\n`resultType`), the client MUST treat the absent field as `"complete"`.',
          type: "string"
        }
      },
      required: [
        "messages",
        "resultType"
      ],
      type: "object"
    },
    GetPromptResultResponse: {
      description: "A successful response from the server for a {@link GetPromptRequestprompts/get} request.",
      properties: {
        id: {
          $ref: "#/$defs/RequestId"
        },
        jsonrpc: {
          const: "2.0",
          type: "string"
        },
        result: {
          anyOf: [
            {
              $ref: "#/$defs/InputRequiredResult"
            },
            {
              $ref: "#/$defs/GetPromptResult"
            }
          ]
        }
      },
      required: [
        "id",
        "jsonrpc",
        "result"
      ],
      type: "object"
    },
    HeaderMismatchError: {
      description: "Returned when a server rejects a request because the values in the HTTP\nheaders do not match the corresponding values in the request body, or\nbecause required headers are missing or malformed. For HTTP, the response\nstatus code MUST be `400 Bad Request`.",
      properties: {
        error: {
          allOf: [
            {
              $ref: "#/$defs/Error"
            },
            {
              properties: {
                code: {
                  const: -32020,
                  type: "integer"
                }
              },
              required: [
                "code"
              ],
              type: "object"
            }
          ]
        },
        id: {
          $ref: "#/$defs/RequestId"
        },
        jsonrpc: {
          const: "2.0",
          type: "string"
        }
      },
      required: [
        "error",
        "jsonrpc"
      ],
      type: "object"
    },
    Icon: {
      description: "An optionally-sized icon that can be displayed in a user interface.",
      properties: {
        mimeType: {
          description: 'Optional MIME type override if the source MIME type is missing or generic.\nFor example: `"image/png"`, `"image/jpeg"`, or `"image/svg+xml"`.',
          type: "string"
        },
        sizes: {
          description: 'Optional array of strings that specify sizes at which the icon can be used.\nEach string should be in WxH format (e.g., `"48x48"`, `"96x96"`) or `"any"` for scalable formats like SVG.\n\nIf not provided, the client should assume that the icon can be used at any size.',
          items: {
            type: "string"
          },
          type: "array"
        },
        src: {
          description: "A standard URI pointing to an icon resource. May be an HTTP/HTTPS URL or a\n`data:` URI with Base64-encoded image data.\n\nConsumers SHOULD take steps to ensure URLs serving icons are from the\nsame domain as the client/server or a trusted domain.\n\nConsumers SHOULD take appropriate precautions when consuming SVGs as they can contain\nexecutable JavaScript.",
          format: "uri",
          type: "string"
        },
        theme: {
          description: 'Optional specifier for the theme this icon is designed for. `"light"` indicates\nthe icon is designed to be used with a light background, and `"dark"` indicates\nthe icon is designed to be used with a dark background.\n\nIf not provided, the client should assume the icon can be used with any theme.',
          enum: [
            "dark",
            "light"
          ],
          type: "string"
        }
      },
      required: [
        "src"
      ],
      type: "object"
    },
    Icons: {
      description: "Base interface to add `icons` property.",
      properties: {
        icons: {
          description: "Optional set of sized icons that the client can display in a user interface.\n\nClients that support rendering icons MUST support at least the following MIME types:\n- `image/png` - PNG images (safe, universal compatibility)\n- `image/jpeg` (and `image/jpg`) - JPEG images (safe, universal compatibility)\n\nClients that support rendering icons SHOULD also support:\n- `image/svg+xml` - SVG images (scalable but requires security precautions)\n- `image/webp` - WebP images (modern, efficient format)",
          items: {
            $ref: "#/$defs/Icon"
          },
          type: "array"
        }
      },
      type: "object"
    },
    ImageContent: {
      description: "An image provided to or from an LLM.",
      properties: {
        _meta: {
          $ref: "#/$defs/MetaObject"
        },
        annotations: {
          $ref: "#/$defs/Annotations",
          description: "Optional annotations for the client."
        },
        data: {
          description: "The base64-encoded image data.",
          format: "byte",
          type: "string"
        },
        mimeType: {
          description: "The MIME type of the image. Different providers may support different image types.",
          type: "string"
        },
        type: {
          const: "image",
          type: "string"
        }
      },
      required: [
        "data",
        "mimeType",
        "type"
      ],
      type: "object"
    },
    Implementation: {
      description: "Describes the MCP implementation.",
      properties: {
        description: {
          description: "An optional human-readable description of what this implementation does.\n\nThis can be used by clients or servers to provide context about their purpose\nand capabilities. For example, a server might describe the types of resources\nor tools it provides, while a client might describe its intended use case.",
          type: "string"
        },
        icons: {
          description: "Optional set of sized icons that the client can display in a user interface.\n\nClients that support rendering icons MUST support at least the following MIME types:\n- `image/png` - PNG images (safe, universal compatibility)\n- `image/jpeg` (and `image/jpg`) - JPEG images (safe, universal compatibility)\n\nClients that support rendering icons SHOULD also support:\n- `image/svg+xml` - SVG images (scalable but requires security precautions)\n- `image/webp` - WebP images (modern, efficient format)",
          items: {
            $ref: "#/$defs/Icon"
          },
          type: "array"
        },
        name: {
          description: "Intended for programmatic or logical use, but used as a display name in past specs or fallback (if title isn't present).",
          type: "string"
        },
        title: {
          description: "Intended for UI and end-user contexts \u2014 optimized to be human-readable and easily understood,\neven by those unfamiliar with domain-specific terminology.\n\nIf not provided, the name should be used for display (except for {@link Tool},\nwhere `annotations.title` should be given precedence over using `name`,\nif present).",
          type: "string"
        },
        version: {
          description: "The version of this implementation.",
          type: "string"
        },
        websiteUrl: {
          description: "An optional URL of the website for this implementation.",
          format: "uri",
          type: "string"
        }
      },
      required: [
        "name",
        "version"
      ],
      type: "object"
    },
    InputRequest: {
      anyOf: [
        {
          $ref: "#/$defs/CreateMessageRequest"
        },
        {
          $ref: "#/$defs/ListRootsRequest"
        },
        {
          $ref: "#/$defs/ElicitRequest"
        }
      ]
    },
    InputRequests: {
      additionalProperties: {
        $ref: "#/$defs/InputRequest"
      },
      description: "A map of server-initiated requests that the client must fulfill.\nKeys are server-assigned identifiers; values are the request objects.",
      type: "object"
    },
    InputRequiredResult: {
      description: "An InputRequiredResult sent by the server to indicate that additional input is needed\nbefore the request can be completed.\n\nAt least one of `inputRequests` or `requestState` MUST be present.",
      properties: {
        _meta: {
          $ref: "#/$defs/ResultMetaObject"
        },
        inputRequests: {
          $ref: "#/$defs/InputRequests"
        },
        requestState: {
          type: "string"
        },
        resultType: {
          description: 'Indicates the type of the result, which allows the client to determine\nhow to parse the result object.\n\nServers implementing this protocol version MUST include this field.\nFor backward compatibility, when a client receives a result from a\nserver implementing an earlier protocol version (which does not include\n`resultType`), the client MUST treat the absent field as `"complete"`.',
          type: "string"
        }
      },
      required: [
        "resultType"
      ],
      type: "object"
    },
    InputResponse: {
      anyOf: [
        {
          $ref: "#/$defs/CreateMessageResult"
        },
        {
          $ref: "#/$defs/ListRootsResult"
        },
        {
          $ref: "#/$defs/ElicitResult"
        }
      ]
    },
    InputResponseRequestParams: {
      properties: {
        _meta: {
          $ref: "#/$defs/RequestMetaObject"
        },
        inputResponses: {
          $ref: "#/$defs/InputResponses"
        },
        requestState: {
          type: "string"
        }
      },
      required: [
        "_meta"
      ],
      type: "object"
    },
    InputResponses: {
      additionalProperties: {
        $ref: "#/$defs/InputResponse"
      },
      description: "A map of client responses to server-initiated requests.\nKeys correspond to the keys in the {@link InputRequests} map;\nvalues are the client's result for each request.",
      type: "object"
    },
    InternalError: {
      description: "A JSON-RPC error indicating that an internal error occurred on the receiver. This error is returned when the receiver encounters an unexpected condition that prevents it from fulfilling the request.",
      properties: {
        code: {
          const: -32603,
          description: "The error type that occurred.",
          type: "integer"
        },
        data: {
          description: "Additional information about the error. The value of this member is defined by the sender (e.g. detailed error information, nested errors etc.)."
        },
        message: {
          description: "A short description of the error. The message SHOULD be limited to a concise single sentence.",
          type: "string"
        }
      },
      required: [
        "code",
        "message"
      ],
      type: "object"
    },
    InvalidParamsError: {
      description: "A JSON-RPC error indicating that the method parameters are invalid or malformed.\n\nIn MCP, this error is returned in various contexts when request parameters fail validation:\n\n- **Tools**: Unknown tool name or invalid tool arguments\n- **Prompts**: Unknown prompt name or missing required arguments\n- **Pagination**: Invalid or expired cursor values\n- **Logging**: Invalid log level\n- **Elicitation**: Server requests an elicitation mode not declared in client capabilities\n- **Sampling**: Missing tool result or tool results mixed with other content",
      properties: {
        code: {
          const: -32602,
          description: "The error type that occurred.",
          type: "integer"
        },
        data: {
          description: "Additional information about the error. The value of this member is defined by the sender (e.g. detailed error information, nested errors etc.)."
        },
        message: {
          description: "A short description of the error. The message SHOULD be limited to a concise single sentence.",
          type: "string"
        }
      },
      required: [
        "code",
        "message"
      ],
      type: "object"
    },
    InvalidRequestError: {
      description: "A JSON-RPC error indicating that the request is not a valid request object. This error is returned when the message structure does not conform to the JSON-RPC 2.0 specification requirements for a request (e.g., missing required fields like `jsonrpc` or `method`, or using invalid types for these fields).",
      properties: {
        code: {
          const: -32600,
          description: "The error type that occurred.",
          type: "integer"
        },
        data: {
          description: "Additional information about the error. The value of this member is defined by the sender (e.g. detailed error information, nested errors etc.)."
        },
        message: {
          description: "A short description of the error. The message SHOULD be limited to a concise single sentence.",
          type: "string"
        }
      },
      required: [
        "code",
        "message"
      ],
      type: "object"
    },
    JSONArray: {
      items: {
        $ref: "#/$defs/JSONValue"
      },
      type: "array"
    },
    JSONObject: {
      additionalProperties: {
        $ref: "#/$defs/JSONValue"
      },
      type: "object"
    },
    JSONRPCErrorResponse: {
      description: "A response to a request that indicates an error occurred.",
      properties: {
        error: {
          $ref: "#/$defs/Error"
        },
        id: {
          $ref: "#/$defs/RequestId"
        },
        jsonrpc: {
          const: "2.0",
          type: "string"
        }
      },
      required: [
        "error",
        "jsonrpc"
      ],
      type: "object"
    },
    JSONRPCMessage: {
      anyOf: [
        {
          $ref: "#/$defs/JSONRPCRequest"
        },
        {
          $ref: "#/$defs/JSONRPCNotification"
        },
        {
          $ref: "#/$defs/JSONRPCResultResponse"
        },
        {
          $ref: "#/$defs/JSONRPCErrorResponse"
        }
      ],
      description: "Refers to any valid JSON-RPC object that can be decoded off the wire, or encoded to be sent."
    },
    JSONRPCNotification: {
      description: "A notification which does not expect a response.",
      properties: {
        jsonrpc: {
          const: "2.0",
          type: "string"
        },
        method: {
          type: "string"
        },
        params: {
          additionalProperties: {},
          type: "object"
        }
      },
      required: [
        "jsonrpc",
        "method"
      ],
      type: "object"
    },
    JSONRPCRequest: {
      description: "A request that expects a response.",
      properties: {
        id: {
          $ref: "#/$defs/RequestId"
        },
        jsonrpc: {
          const: "2.0",
          type: "string"
        },
        method: {
          type: "string"
        },
        params: {
          additionalProperties: {},
          type: "object"
        }
      },
      required: [
        "id",
        "jsonrpc",
        "method"
      ],
      type: "object"
    },
    JSONRPCResponse: {
      anyOf: [
        {
          $ref: "#/$defs/JSONRPCResultResponse"
        },
        {
          $ref: "#/$defs/JSONRPCErrorResponse"
        }
      ],
      description: "A response to a request, containing either the result or error."
    },
    JSONRPCResultResponse: {
      description: "A successful (non-error) response to a request.",
      properties: {
        id: {
          $ref: "#/$defs/RequestId"
        },
        jsonrpc: {
          const: "2.0",
          type: "string"
        },
        result: {
          $ref: "#/$defs/Result"
        }
      },
      required: [
        "id",
        "jsonrpc",
        "result"
      ],
      type: "object"
    },
    JSONValue: {
      anyOf: [
        {
          $ref: "#/$defs/JSONObject"
        },
        {
          items: {
            $ref: "#/$defs/JSONValue"
          },
          type: "array"
        },
        {
          type: [
            "string",
            "integer",
            "boolean"
          ]
        }
      ]
    },
    LegacyTitledEnumSchema: {
      description: "Use {@link TitledSingleSelectEnumSchema} instead.\nThis interface will be removed in a future version.",
      properties: {
        default: {
          type: "string"
        },
        description: {
          type: "string"
        },
        enum: {
          items: {
            type: "string"
          },
          type: "array"
        },
        enumNames: {
          description: "(Legacy) Display names for enum values.\nNon-standard according to JSON schema 2020-12.",
          items: {
            type: "string"
          },
          type: "array"
        },
        title: {
          type: "string"
        },
        type: {
          const: "string",
          type: "string"
        }
      },
      required: [
        "enum",
        "type"
      ],
      type: "object"
    },
    ListPromptsRequest: {
      description: "Sent from the client to request a list of prompts and prompt templates the server has.",
      properties: {
        id: {
          $ref: "#/$defs/RequestId"
        },
        jsonrpc: {
          const: "2.0",
          type: "string"
        },
        method: {
          const: "prompts/list",
          type: "string"
        },
        params: {
          $ref: "#/$defs/PaginatedRequestParams"
        }
      },
      required: [
        "id",
        "jsonrpc",
        "method",
        "params"
      ],
      type: "object"
    },
    ListPromptsResult: {
      description: "The result returned by the server for a {@link ListPromptsRequestprompts/list} request.",
      properties: {
        _meta: {
          $ref: "#/$defs/ResultMetaObject"
        },
        cacheScope: {
          description: 'Indicates the intended scope of the cached response, analogous to HTTP\n`Cache-Control: public` vs `Cache-Control: private`.\n\n- `"public"`: The response does not contain user-specific data. Any\n  client or intermediary (e.g., shared gateway, caching proxy) MAY cache\n  the response and serve it across authorization contexts.\n- `"private"`: The response MAY be cached and reused only within the\n  same authorization context. Caches MUST NOT be shared across\n  authorization contexts (e.g., a different access token requires a\n  different cache).',
          enum: [
            "private",
            "public"
          ],
          type: "string"
        },
        nextCursor: {
          description: "An opaque token representing the pagination position after the last returned result.\nIf present, there may be more results available.",
          type: "string"
        },
        prompts: {
          items: {
            $ref: "#/$defs/Prompt"
          },
          type: "array"
        },
        resultType: {
          description: 'Indicates the type of the result, which allows the client to determine\nhow to parse the result object.\n\nServers implementing this protocol version MUST include this field.\nFor backward compatibility, when a client receives a result from a\nserver implementing an earlier protocol version (which does not include\n`resultType`), the client MUST treat the absent field as `"complete"`.',
          type: "string"
        },
        ttlMs: {
          description: "A hint from the server indicating how long (in milliseconds) the\nclient MAY cache this response before re-fetching. Semantics are\nanalogous to HTTP Cache-Control max-age.\n\n- If 0, The response SHOULD be considered immediately stale,\n  The client MAY re-fetch every time the result is needed.\n- If positive, the client SHOULD consider the result fresh for this many\n  milliseconds after receiving the response.",
          minimum: 0,
          type: "integer"
        }
      },
      required: [
        "cacheScope",
        "prompts",
        "resultType",
        "ttlMs"
      ],
      type: "object"
    },
    ListPromptsResultResponse: {
      description: "A successful response from the server for a {@link ListPromptsRequestprompts/list} request.",
      properties: {
        id: {
          $ref: "#/$defs/RequestId"
        },
        jsonrpc: {
          const: "2.0",
          type: "string"
        },
        result: {
          $ref: "#/$defs/ListPromptsResult"
        }
      },
      required: [
        "id",
        "jsonrpc",
        "result"
      ],
      type: "object"
    },
    ListResourceTemplatesRequest: {
      description: "Sent from the client to request a list of resource templates the server has.",
      properties: {
        id: {
          $ref: "#/$defs/RequestId"
        },
        jsonrpc: {
          const: "2.0",
          type: "string"
        },
        method: {
          const: "resources/templates/list",
          type: "string"
        },
        params: {
          $ref: "#/$defs/PaginatedRequestParams"
        }
      },
      required: [
        "id",
        "jsonrpc",
        "method",
        "params"
      ],
      type: "object"
    },
    ListResourceTemplatesResult: {
      description: "The result returned by the server for a {@link ListResourceTemplatesRequestresources/templates/list} request.",
      properties: {
        _meta: {
          $ref: "#/$defs/ResultMetaObject"
        },
        cacheScope: {
          description: 'Indicates the intended scope of the cached response, analogous to HTTP\n`Cache-Control: public` vs `Cache-Control: private`.\n\n- `"public"`: The response does not contain user-specific data. Any\n  client or intermediary (e.g., shared gateway, caching proxy) MAY cache\n  the response and serve it across authorization contexts.\n- `"private"`: The response MAY be cached and reused only within the\n  same authorization context. Caches MUST NOT be shared across\n  authorization contexts (e.g., a different access token requires a\n  different cache).',
          enum: [
            "private",
            "public"
          ],
          type: "string"
        },
        nextCursor: {
          description: "An opaque token representing the pagination position after the last returned result.\nIf present, there may be more results available.",
          type: "string"
        },
        resourceTemplates: {
          items: {
            $ref: "#/$defs/ResourceTemplate"
          },
          type: "array"
        },
        resultType: {
          description: 'Indicates the type of the result, which allows the client to determine\nhow to parse the result object.\n\nServers implementing this protocol version MUST include this field.\nFor backward compatibility, when a client receives a result from a\nserver implementing an earlier protocol version (which does not include\n`resultType`), the client MUST treat the absent field as `"complete"`.',
          type: "string"
        },
        ttlMs: {
          description: "A hint from the server indicating how long (in milliseconds) the\nclient MAY cache this response before re-fetching. Semantics are\nanalogous to HTTP Cache-Control max-age.\n\n- If 0, The response SHOULD be considered immediately stale,\n  The client MAY re-fetch every time the result is needed.\n- If positive, the client SHOULD consider the result fresh for this many\n  milliseconds after receiving the response.",
          minimum: 0,
          type: "integer"
        }
      },
      required: [
        "cacheScope",
        "resourceTemplates",
        "resultType",
        "ttlMs"
      ],
      type: "object"
    },
    ListResourceTemplatesResultResponse: {
      description: "A successful response from the server for a {@link ListResourceTemplatesRequestresources/templates/list} request.",
      properties: {
        id: {
          $ref: "#/$defs/RequestId"
        },
        jsonrpc: {
          const: "2.0",
          type: "string"
        },
        result: {
          $ref: "#/$defs/ListResourceTemplatesResult"
        }
      },
      required: [
        "id",
        "jsonrpc",
        "result"
      ],
      type: "object"
    },
    ListResourcesRequest: {
      description: "Sent from the client to request a list of resources the server has.",
      properties: {
        id: {
          $ref: "#/$defs/RequestId"
        },
        jsonrpc: {
          const: "2.0",
          type: "string"
        },
        method: {
          const: "resources/list",
          type: "string"
        },
        params: {
          $ref: "#/$defs/PaginatedRequestParams"
        }
      },
      required: [
        "id",
        "jsonrpc",
        "method",
        "params"
      ],
      type: "object"
    },
    ListResourcesResult: {
      description: "The result returned by the server for a {@link ListResourcesRequestresources/list} request.",
      properties: {
        _meta: {
          $ref: "#/$defs/ResultMetaObject"
        },
        cacheScope: {
          description: 'Indicates the intended scope of the cached response, analogous to HTTP\n`Cache-Control: public` vs `Cache-Control: private`.\n\n- `"public"`: The response does not contain user-specific data. Any\n  client or intermediary (e.g., shared gateway, caching proxy) MAY cache\n  the response and serve it across authorization contexts.\n- `"private"`: The response MAY be cached and reused only within the\n  same authorization context. Caches MUST NOT be shared across\n  authorization contexts (e.g., a different access token requires a\n  different cache).',
          enum: [
            "private",
            "public"
          ],
          type: "string"
        },
        nextCursor: {
          description: "An opaque token representing the pagination position after the last returned result.\nIf present, there may be more results available.",
          type: "string"
        },
        resources: {
          items: {
            $ref: "#/$defs/Resource"
          },
          type: "array"
        },
        resultType: {
          description: 'Indicates the type of the result, which allows the client to determine\nhow to parse the result object.\n\nServers implementing this protocol version MUST include this field.\nFor backward compatibility, when a client receives a result from a\nserver implementing an earlier protocol version (which does not include\n`resultType`), the client MUST treat the absent field as `"complete"`.',
          type: "string"
        },
        ttlMs: {
          description: "A hint from the server indicating how long (in milliseconds) the\nclient MAY cache this response before re-fetching. Semantics are\nanalogous to HTTP Cache-Control max-age.\n\n- If 0, The response SHOULD be considered immediately stale,\n  The client MAY re-fetch every time the result is needed.\n- If positive, the client SHOULD consider the result fresh for this many\n  milliseconds after receiving the response.",
          minimum: 0,
          type: "integer"
        }
      },
      required: [
        "cacheScope",
        "resources",
        "resultType",
        "ttlMs"
      ],
      type: "object"
    },
    ListResourcesResultResponse: {
      description: "A successful response from the server for a {@link ListResourcesRequestresources/list} request.",
      properties: {
        id: {
          $ref: "#/$defs/RequestId"
        },
        jsonrpc: {
          const: "2.0",
          type: "string"
        },
        result: {
          $ref: "#/$defs/ListResourcesResult"
        }
      },
      required: [
        "id",
        "jsonrpc",
        "result"
      ],
      type: "object"
    },
    ListRootsRequest: {
      description: "Sent from the server to request a list of root URIs from the client. Roots allow\nservers to ask for specific directories or files to operate on. A common example\nfor roots is providing a set of repositories or directories a server should operate\non.\n\nThis request is typically used when the server needs to understand the file system\nstructure or access specific locations that the client has permission to read from.",
      properties: {
        method: {
          const: "roots/list",
          type: "string"
        },
        params: {
          properties: {
            _meta: {
              $ref: "#/$defs/MetaObject"
            }
          },
          type: "object"
        }
      },
      required: [
        "method"
      ],
      type: "object"
    },
    ListRootsResult: {
      description: "The result returned by the client for a {@link ListRootsRequestroots/list} request.\nThis result contains an array of {@link Root} objects, each representing a root directory\nor file that the server can operate on.",
      properties: {
        roots: {
          items: {
            $ref: "#/$defs/Root"
          },
          type: "array"
        }
      },
      required: [
        "roots"
      ],
      type: "object"
    },
    ListToolsRequest: {
      description: "Sent from the client to request a list of tools the server has.",
      properties: {
        id: {
          $ref: "#/$defs/RequestId"
        },
        jsonrpc: {
          const: "2.0",
          type: "string"
        },
        method: {
          const: "tools/list",
          type: "string"
        },
        params: {
          $ref: "#/$defs/PaginatedRequestParams"
        }
      },
      required: [
        "id",
        "jsonrpc",
        "method",
        "params"
      ],
      type: "object"
    },
    ListToolsResult: {
      description: "The result returned by the server for a {@link ListToolsRequesttools/list} request.",
      properties: {
        _meta: {
          $ref: "#/$defs/ResultMetaObject"
        },
        cacheScope: {
          description: 'Indicates the intended scope of the cached response, analogous to HTTP\n`Cache-Control: public` vs `Cache-Control: private`.\n\n- `"public"`: The response does not contain user-specific data. Any\n  client or intermediary (e.g., shared gateway, caching proxy) MAY cache\n  the response and serve it across authorization contexts.\n- `"private"`: The response MAY be cached and reused only within the\n  same authorization context. Caches MUST NOT be shared across\n  authorization contexts (e.g., a different access token requires a\n  different cache).',
          enum: [
            "private",
            "public"
          ],
          type: "string"
        },
        nextCursor: {
          description: "An opaque token representing the pagination position after the last returned result.\nIf present, there may be more results available.",
          type: "string"
        },
        resultType: {
          description: 'Indicates the type of the result, which allows the client to determine\nhow to parse the result object.\n\nServers implementing this protocol version MUST include this field.\nFor backward compatibility, when a client receives a result from a\nserver implementing an earlier protocol version (which does not include\n`resultType`), the client MUST treat the absent field as `"complete"`.',
          type: "string"
        },
        tools: {
          items: {
            $ref: "#/$defs/Tool"
          },
          type: "array"
        },
        ttlMs: {
          description: "A hint from the server indicating how long (in milliseconds) the\nclient MAY cache this response before re-fetching. Semantics are\nanalogous to HTTP Cache-Control max-age.\n\n- If 0, The response SHOULD be considered immediately stale,\n  The client MAY re-fetch every time the result is needed.\n- If positive, the client SHOULD consider the result fresh for this many\n  milliseconds after receiving the response.",
          minimum: 0,
          type: "integer"
        }
      },
      required: [
        "cacheScope",
        "resultType",
        "tools",
        "ttlMs"
      ],
      type: "object"
    },
    ListToolsResultResponse: {
      description: "A successful response from the server for a {@link ListToolsRequesttools/list} request.",
      properties: {
        id: {
          $ref: "#/$defs/RequestId"
        },
        jsonrpc: {
          const: "2.0",
          type: "string"
        },
        result: {
          $ref: "#/$defs/ListToolsResult"
        }
      },
      required: [
        "id",
        "jsonrpc",
        "result"
      ],
      type: "object"
    },
    LoggingLevel: {
      description: "The severity of a log message.\n\nThese map to syslog message severities, as specified in RFC-5424:\nhttps://datatracker.ietf.org/doc/html/rfc5424#section-6.2.1",
      enum: [
        "alert",
        "critical",
        "debug",
        "emergency",
        "error",
        "info",
        "notice",
        "warning"
      ],
      type: "string"
    },
    LoggingMessageNotification: {
      description: 'JSONRPCNotification of a log message passed from server to client. The client opts in by setting `"io.modelcontextprotocol/logLevel"` in a request\'s `_meta`.',
      properties: {
        jsonrpc: {
          const: "2.0",
          type: "string"
        },
        method: {
          const: "notifications/message",
          type: "string"
        },
        params: {
          $ref: "#/$defs/LoggingMessageNotificationParams"
        }
      },
      required: [
        "jsonrpc",
        "method",
        "params"
      ],
      type: "object"
    },
    LoggingMessageNotificationParams: {
      description: "Parameters for a `notifications/message` notification.",
      properties: {
        _meta: {
          $ref: "#/$defs/NotificationMetaObject"
        },
        data: {
          description: "The data to be logged, such as a string message or an object. Any JSON serializable type is allowed here."
        },
        level: {
          $ref: "#/$defs/LoggingLevel",
          description: "The severity of this log message."
        },
        logger: {
          description: "An optional name of the logger issuing this message.",
          type: "string"
        }
      },
      required: [
        "data",
        "level"
      ],
      type: "object"
    },
    MetaObject: {
      description: "Represents the contents of a `_meta` field, which clients and servers use to attach additional metadata to their interactions.\n\nCertain key names are reserved by MCP for protocol-level metadata; implementations MUST NOT make assumptions about values at these keys. Additionally, specific schema definitions may reserve particular names for purpose-specific metadata, as declared in those definitions.\n\nValid keys have two segments:\n\n**Prefix:**\n- Optional \u2014 if specified, MUST be a series of _labels_ separated by dots (`.`), followed by a slash (`/`).\n- Labels MUST start with a letter and end with a letter or digit. Interior characters may be letters, digits, or hyphens (`-`).\n- Implementations SHOULD use reverse DNS notation (e.g., `com.example/` rather than `example.com/`).\n- Any prefix where the second label is `modelcontextprotocol` or `mcp` is **reserved** for MCP use. For example: `io.modelcontextprotocol/`, `dev.mcp/`, `org.modelcontextprotocol.api/`, and `com.mcp.tools/` are all reserved. However, `com.example.mcp/` is NOT reserved, as the second label is `example`.\n\n**Name:**\n- Unless empty, MUST start and end with an alphanumeric character (`[a-z0-9A-Z]`).\n- Interior characters may be alphanumeric, hyphens (`-`), underscores (`_`), or dots (`.`).",
      type: "object"
    },
    MethodNotFoundError: {
      description: "A JSON-RPC error indicating that the requested method does not exist or is not available.\n\nIn MCP, a server returns this error when a client invokes a method the server does not implement \u2014 either a genuinely unknown method, or one gated behind a server capability the server did not advertise (e.g., calling `prompts/list` when the `prompts` capability was not advertised).\n\nA request that requires a client capability the client did not declare is signalled instead by {@link MissingRequiredClientCapabilityError} (`-32021`).",
      properties: {
        code: {
          const: -32601,
          description: "The error type that occurred.",
          type: "integer"
        },
        data: {
          description: "Additional information about the error. The value of this member is defined by the sender (e.g. detailed error information, nested errors etc.)."
        },
        message: {
          description: "A short description of the error. The message SHOULD be limited to a concise single sentence.",
          type: "string"
        }
      },
      required: [
        "code",
        "message"
      ],
      type: "object"
    },
    MissingRequiredClientCapabilityError: {
      description: "Returned when processing a request requires a capability the client did not\ndeclare in `clientCapabilities`. For HTTP, the response status code MUST be\n`400 Bad Request`.",
      properties: {
        error: {
          allOf: [
            {
              $ref: "#/$defs/Error"
            },
            {
              properties: {
                code: {
                  const: -32021,
                  type: "integer"
                },
                data: {
                  properties: {
                    requiredCapabilities: {
                      $ref: "#/$defs/ClientCapabilities",
                      description: "The capabilities the server requires from the client to process this request."
                    }
                  },
                  required: [
                    "requiredCapabilities"
                  ],
                  type: "object"
                }
              },
              required: [
                "code",
                "data"
              ],
              type: "object"
            }
          ]
        },
        id: {
          $ref: "#/$defs/RequestId"
        },
        jsonrpc: {
          const: "2.0",
          type: "string"
        }
      },
      required: [
        "error",
        "jsonrpc"
      ],
      type: "object"
    },
    ModelHint: {
      description: "Hints to use for model selection.\n\nKeys not declared here are currently left unspecified by the spec and are up\nto the client to interpret.",
      properties: {
        name: {
          description: "A hint for a model name.\n\nThe client SHOULD treat this as a substring of a model name; for example:\n - `claude-3-5-sonnet` should match `claude-3-5-sonnet-20241022`\n - `sonnet` should match `claude-3-5-sonnet-20241022`, `claude-3-sonnet-20240229`, etc.\n - `claude` should match any Claude model\n\nThe client MAY also map the string to a different provider's model name or a different model family, as long as it fills a similar niche; for example:\n - `gemini-1.5-flash` could match `claude-3-haiku-20240307`",
          type: "string"
        }
      },
      type: "object"
    },
    ModelPreferences: {
      description: `The server's preferences for model selection, requested of the client during sampling.

Because LLMs can vary along multiple dimensions, choosing the "best" model is
rarely straightforward.  Different models excel in different areas\u2014some are
faster but less capable, others are more capable but more expensive, and so
on. This interface allows servers to express their priorities across multiple
dimensions to help clients make an appropriate selection for their use case.

These preferences are always advisory. The client MAY ignore them. It is also
up to the client to decide how to interpret these preferences and how to
balance them against other considerations.`,
      properties: {
        costPriority: {
          description: "How much to prioritize cost when selecting a model. A value of 0 means cost\nis not important, while a value of 1 means cost is the most important\nfactor.",
          maximum: 1,
          minimum: 0,
          type: "number"
        },
        hints: {
          description: "Optional hints to use for model selection.\n\nIf multiple hints are specified, the client MUST evaluate them in order\n(such that the first match is taken).\n\nThe client SHOULD prioritize these hints over the numeric priorities, but\nMAY still use the priorities to select from ambiguous matches.",
          items: {
            $ref: "#/$defs/ModelHint"
          },
          type: "array"
        },
        intelligencePriority: {
          description: "How much to prioritize intelligence and capabilities when selecting a\nmodel. A value of 0 means intelligence is not important, while a value of 1\nmeans intelligence is the most important factor.",
          maximum: 1,
          minimum: 0,
          type: "number"
        },
        speedPriority: {
          description: "How much to prioritize sampling speed (latency) when selecting a model. A\nvalue of 0 means speed is not important, while a value of 1 means speed is\nthe most important factor.",
          maximum: 1,
          minimum: 0,
          type: "number"
        }
      },
      type: "object"
    },
    MultiSelectEnumSchema: {
      anyOf: [
        {
          $ref: "#/$defs/UntitledMultiSelectEnumSchema"
        },
        {
          $ref: "#/$defs/TitledMultiSelectEnumSchema"
        }
      ]
    },
    Notification: {
      properties: {
        method: {
          type: "string"
        },
        params: {
          additionalProperties: {},
          type: "object"
        }
      },
      required: [
        "method"
      ],
      type: "object"
    },
    NotificationMetaObject: {
      description: "Extends {@link MetaObject} with additional notification-specific fields. All key naming rules from `MetaObject` apply.",
      properties: {
        "io.modelcontextprotocol/subscriptionId": {
          $ref: "#/$defs/RequestId",
          description: "Identifies the subscription stream a notification was delivered on. The\nserver MUST include this key on every notification delivered via a\n{@link SubscriptionsListenRequestsubscriptions/listen} stream, so the\nclient can correlate the notification with the originating subscription.\nThe key is absent on notifications not delivered via a subscription\nstream (e.g. progress notifications for an in-flight request), which is\nwhy it is optional here.\n\nThe value is the JSON-RPC ID of the `subscriptions/listen` request that\nopened the stream."
        }
      },
      type: "object"
    },
    NotificationParams: {
      description: "Common params for any notification.",
      properties: {
        _meta: {
          $ref: "#/$defs/NotificationMetaObject"
        }
      },
      type: "object"
    },
    NumberSchema: {
      properties: {
        default: {
          type: "number"
        },
        description: {
          type: "string"
        },
        maximum: {
          type: "number"
        },
        minimum: {
          type: "number"
        },
        title: {
          type: "string"
        },
        type: {
          enum: [
            "integer",
            "number"
          ],
          type: "string"
        }
      },
      required: [
        "type"
      ],
      type: "object"
    },
    PaginatedRequest: {
      properties: {
        id: {
          $ref: "#/$defs/RequestId"
        },
        jsonrpc: {
          const: "2.0",
          type: "string"
        },
        method: {
          type: "string"
        },
        params: {
          $ref: "#/$defs/PaginatedRequestParams"
        }
      },
      required: [
        "id",
        "jsonrpc",
        "method",
        "params"
      ],
      type: "object"
    },
    PaginatedRequestParams: {
      description: "Common params for paginated requests.",
      properties: {
        _meta: {
          $ref: "#/$defs/RequestMetaObject"
        },
        cursor: {
          description: "An opaque token representing the current pagination position.\nIf provided, the server should return results starting after this cursor.",
          type: "string"
        }
      },
      required: [
        "_meta"
      ],
      type: "object"
    },
    PaginatedResult: {
      properties: {
        _meta: {
          $ref: "#/$defs/ResultMetaObject"
        },
        nextCursor: {
          description: "An opaque token representing the pagination position after the last returned result.\nIf present, there may be more results available.",
          type: "string"
        },
        resultType: {
          description: 'Indicates the type of the result, which allows the client to determine\nhow to parse the result object.\n\nServers implementing this protocol version MUST include this field.\nFor backward compatibility, when a client receives a result from a\nserver implementing an earlier protocol version (which does not include\n`resultType`), the client MUST treat the absent field as `"complete"`.',
          type: "string"
        }
      },
      required: [
        "resultType"
      ],
      type: "object"
    },
    ParseError: {
      description: "A JSON-RPC error indicating that invalid JSON was received by the server. This error is returned when the server cannot parse the JSON text of a message.",
      properties: {
        code: {
          const: -32700,
          description: "The error type that occurred.",
          type: "integer"
        },
        data: {
          description: "Additional information about the error. The value of this member is defined by the sender (e.g. detailed error information, nested errors etc.)."
        },
        message: {
          description: "A short description of the error. The message SHOULD be limited to a concise single sentence.",
          type: "string"
        }
      },
      required: [
        "code",
        "message"
      ],
      type: "object"
    },
    PrimitiveSchemaDefinition: {
      anyOf: [
        {
          $ref: "#/$defs/StringSchema"
        },
        {
          $ref: "#/$defs/NumberSchema"
        },
        {
          $ref: "#/$defs/BooleanSchema"
        },
        {
          $ref: "#/$defs/UntitledSingleSelectEnumSchema"
        },
        {
          $ref: "#/$defs/TitledSingleSelectEnumSchema"
        },
        {
          $ref: "#/$defs/UntitledMultiSelectEnumSchema"
        },
        {
          $ref: "#/$defs/TitledMultiSelectEnumSchema"
        },
        {
          $ref: "#/$defs/LegacyTitledEnumSchema"
        }
      ],
      description: "Restricted schema definitions that only allow primitive types\nwithout nested objects or arrays."
    },
    ProgressNotification: {
      description: "An out-of-band notification used to inform the receiver of a progress update for a long-running request.",
      properties: {
        jsonrpc: {
          const: "2.0",
          type: "string"
        },
        method: {
          const: "notifications/progress",
          type: "string"
        },
        params: {
          $ref: "#/$defs/ProgressNotificationParams"
        }
      },
      required: [
        "jsonrpc",
        "method",
        "params"
      ],
      type: "object"
    },
    ProgressNotificationParams: {
      description: "Parameters for a {@link ProgressNotificationnotifications/progress} notification.",
      properties: {
        _meta: {
          $ref: "#/$defs/NotificationMetaObject"
        },
        message: {
          description: "An optional message describing the current progress.",
          type: "string"
        },
        progress: {
          description: "The progress thus far. This should increase every time progress is made, even if the total is unknown.",
          type: "number"
        },
        progressToken: {
          $ref: "#/$defs/ProgressToken",
          description: "The progress token which was given in the initial request, used to associate this notification with the request that is proceeding."
        },
        total: {
          description: "Total number of items to process (or total progress required), if known.",
          type: "number"
        }
      },
      required: [
        "progress",
        "progressToken"
      ],
      type: "object"
    },
    ProgressToken: {
      description: "A progress token, used to associate progress notifications with the original request.",
      type: [
        "string",
        "integer"
      ]
    },
    Prompt: {
      description: "A prompt or prompt template that the server offers.",
      properties: {
        _meta: {
          $ref: "#/$defs/MetaObject"
        },
        arguments: {
          description: "A list of arguments to use for templating the prompt.",
          items: {
            $ref: "#/$defs/PromptArgument"
          },
          type: "array"
        },
        description: {
          description: "An optional description of what this prompt provides",
          type: "string"
        },
        icons: {
          description: "Optional set of sized icons that the client can display in a user interface.\n\nClients that support rendering icons MUST support at least the following MIME types:\n- `image/png` - PNG images (safe, universal compatibility)\n- `image/jpeg` (and `image/jpg`) - JPEG images (safe, universal compatibility)\n\nClients that support rendering icons SHOULD also support:\n- `image/svg+xml` - SVG images (scalable but requires security precautions)\n- `image/webp` - WebP images (modern, efficient format)",
          items: {
            $ref: "#/$defs/Icon"
          },
          type: "array"
        },
        name: {
          description: "Intended for programmatic or logical use, but used as a display name in past specs or fallback (if title isn't present).",
          type: "string"
        },
        title: {
          description: "Intended for UI and end-user contexts \u2014 optimized to be human-readable and easily understood,\neven by those unfamiliar with domain-specific terminology.\n\nIf not provided, the name should be used for display (except for {@link Tool},\nwhere `annotations.title` should be given precedence over using `name`,\nif present).",
          type: "string"
        }
      },
      required: [
        "name"
      ],
      type: "object"
    },
    PromptArgument: {
      description: "Describes an argument that a prompt can accept.",
      properties: {
        description: {
          description: "A human-readable description of the argument.",
          type: "string"
        },
        name: {
          description: "Intended for programmatic or logical use, but used as a display name in past specs or fallback (if title isn't present).",
          type: "string"
        },
        required: {
          description: "Whether this argument must be provided.",
          type: "boolean"
        },
        title: {
          description: "Intended for UI and end-user contexts \u2014 optimized to be human-readable and easily understood,\neven by those unfamiliar with domain-specific terminology.\n\nIf not provided, the name should be used for display (except for {@link Tool},\nwhere `annotations.title` should be given precedence over using `name`,\nif present).",
          type: "string"
        }
      },
      required: [
        "name"
      ],
      type: "object"
    },
    PromptListChangedNotification: {
      description: "An optional notification from the server to the client, informing it that the list of prompts it offers has changed. This is only delivered on a {@link SubscriptionsListenRequestsubscriptions/listen} stream when the client requested it via the `promptsListChanged` filter field.",
      properties: {
        jsonrpc: {
          const: "2.0",
          type: "string"
        },
        method: {
          const: "notifications/prompts/list_changed",
          type: "string"
        },
        params: {
          $ref: "#/$defs/NotificationParams"
        }
      },
      required: [
        "jsonrpc",
        "method"
      ],
      type: "object"
    },
    PromptMessage: {
      description: "Describes a message returned as part of a prompt.\n\nThis is similar to {@link SamplingMessage}, but also supports the embedding of\nresources from the MCP server.",
      properties: {
        content: {
          $ref: "#/$defs/ContentBlock"
        },
        role: {
          $ref: "#/$defs/Role"
        }
      },
      required: [
        "content",
        "role"
      ],
      type: "object"
    },
    PromptReference: {
      description: "Identifies a prompt.",
      properties: {
        name: {
          description: "Intended for programmatic or logical use, but used as a display name in past specs or fallback (if title isn't present).",
          type: "string"
        },
        title: {
          description: "Intended for UI and end-user contexts \u2014 optimized to be human-readable and easily understood,\neven by those unfamiliar with domain-specific terminology.\n\nIf not provided, the name should be used for display (except for {@link Tool},\nwhere `annotations.title` should be given precedence over using `name`,\nif present).",
          type: "string"
        },
        type: {
          const: "ref/prompt",
          type: "string"
        }
      },
      required: [
        "name",
        "type"
      ],
      type: "object"
    },
    ReadResourceRequest: {
      description: "Sent from the client to the server, to read a specific resource URI.",
      properties: {
        id: {
          $ref: "#/$defs/RequestId"
        },
        jsonrpc: {
          const: "2.0",
          type: "string"
        },
        method: {
          const: "resources/read",
          type: "string"
        },
        params: {
          $ref: "#/$defs/ReadResourceRequestParams"
        }
      },
      required: [
        "id",
        "jsonrpc",
        "method",
        "params"
      ],
      type: "object"
    },
    ReadResourceRequestParams: {
      description: "Parameters for a `resources/read` request.",
      properties: {
        _meta: {
          $ref: "#/$defs/RequestMetaObject"
        },
        inputResponses: {
          $ref: "#/$defs/InputResponses"
        },
        requestState: {
          type: "string"
        },
        uri: {
          description: "The URI of the resource. The URI can use any protocol; it is up to the server how to interpret it.",
          format: "uri",
          type: "string"
        }
      },
      required: [
        "_meta",
        "uri"
      ],
      type: "object"
    },
    ReadResourceResult: {
      description: "The result returned by the server for a {@link ReadResourceRequestresources/read} request.",
      properties: {
        _meta: {
          $ref: "#/$defs/ResultMetaObject"
        },
        cacheScope: {
          description: 'Indicates the intended scope of the cached response, analogous to HTTP\n`Cache-Control: public` vs `Cache-Control: private`.\n\n- `"public"`: The response does not contain user-specific data. Any\n  client or intermediary (e.g., shared gateway, caching proxy) MAY cache\n  the response and serve it across authorization contexts.\n- `"private"`: The response MAY be cached and reused only within the\n  same authorization context. Caches MUST NOT be shared across\n  authorization contexts (e.g., a different access token requires a\n  different cache).',
          enum: [
            "private",
            "public"
          ],
          type: "string"
        },
        contents: {
          items: {
            anyOf: [
              {
                $ref: "#/$defs/TextResourceContents"
              },
              {
                $ref: "#/$defs/BlobResourceContents"
              }
            ]
          },
          type: "array"
        },
        resultType: {
          description: 'Indicates the type of the result, which allows the client to determine\nhow to parse the result object.\n\nServers implementing this protocol version MUST include this field.\nFor backward compatibility, when a client receives a result from a\nserver implementing an earlier protocol version (which does not include\n`resultType`), the client MUST treat the absent field as `"complete"`.',
          type: "string"
        },
        ttlMs: {
          description: "A hint from the server indicating how long (in milliseconds) the\nclient MAY cache this response before re-fetching. Semantics are\nanalogous to HTTP Cache-Control max-age.\n\n- If 0, The response SHOULD be considered immediately stale,\n  The client MAY re-fetch every time the result is needed.\n- If positive, the client SHOULD consider the result fresh for this many\n  milliseconds after receiving the response.",
          minimum: 0,
          type: "integer"
        }
      },
      required: [
        "cacheScope",
        "contents",
        "resultType",
        "ttlMs"
      ],
      type: "object"
    },
    ReadResourceResultResponse: {
      description: "A successful response from the server for a {@link ReadResourceRequestresources/read} request.",
      properties: {
        id: {
          $ref: "#/$defs/RequestId"
        },
        jsonrpc: {
          const: "2.0",
          type: "string"
        },
        result: {
          anyOf: [
            {
              $ref: "#/$defs/InputRequiredResult"
            },
            {
              $ref: "#/$defs/ReadResourceResult"
            }
          ]
        }
      },
      required: [
        "id",
        "jsonrpc",
        "result"
      ],
      type: "object"
    },
    Request: {
      properties: {
        method: {
          type: "string"
        },
        params: {
          additionalProperties: {},
          type: "object"
        }
      },
      required: [
        "method"
      ],
      type: "object"
    },
    RequestId: {
      description: "A uniquely identifying ID for a request in JSON-RPC.",
      type: [
        "string",
        "integer"
      ]
    },
    RequestMetaObject: {
      description: "Extends {@link MetaObject} with additional request-specific fields. All key naming rules from `MetaObject` apply.",
      properties: {
        "io.modelcontextprotocol/clientCapabilities": {
          $ref: "#/$defs/ClientCapabilities",
          description: "The client's capabilities for this specific request. Required.\n\nCapabilities are declared per-request rather than once at initialization;\nan empty object means the client supports no optional capabilities.\nServers MUST NOT infer capabilities from prior requests."
        },
        "io.modelcontextprotocol/clientInfo": {
          $ref: "#/$defs/Implementation",
          description: "Identifies the client software making the request. Clients SHOULD\ninclude this field on every request unless specifically configured not\nto do so.\n\nThe {@link Implementation} schema requires `name` and `version`; other\nfields are optional.\n\nThe value is self-reported by the client and is not verified by the\nprotocol. It is intended for display, logging, and debugging. Servers\nSHOULD NOT use it to change their behavior, and SHOULD NOT rely on it for\nsecurity decisions."
        },
        "io.modelcontextprotocol/logLevel": {
          $ref: "#/$defs/LoggingLevel",
          description: "The desired log level for this request. Optional.\n\nIf absent, the server MUST NOT send any {@link LoggingMessageNotificationnotifications/message}\nnotifications for this request. The client opts in to log messages by\nexplicitly setting a level. Replaces the former `logging/setLevel` RPC."
        },
        "io.modelcontextprotocol/protocolVersion": {
          description: "The MCP Protocol Version being used for this request. Required.\n\nFor the HTTP transport, this value MUST match the `MCP-Protocol-Version`\nheader; otherwise the server MUST return a `400 Bad Request`. If the\nserver does not support the requested version, it MUST return an\n{@link UnsupportedProtocolVersionError}.",
          type: "string"
        },
        progressToken: {
          $ref: "#/$defs/ProgressToken",
          description: "If specified, the caller is requesting out-of-band progress notifications for this request (as represented by {@link ProgressNotificationnotifications/progress}). The value of this parameter is an opaque token that will be attached to any subsequent notifications. The receiver is not obligated to provide these notifications."
        }
      },
      required: [
        "io.modelcontextprotocol/clientCapabilities",
        "io.modelcontextprotocol/protocolVersion"
      ],
      type: "object"
    },
    RequestParams: {
      description: "Common params for any request.",
      properties: {
        _meta: {
          $ref: "#/$defs/RequestMetaObject"
        }
      },
      required: [
        "_meta"
      ],
      type: "object"
    },
    Resource: {
      description: "A known resource that the server is capable of reading.",
      properties: {
        _meta: {
          $ref: "#/$defs/MetaObject"
        },
        annotations: {
          $ref: "#/$defs/Annotations",
          description: "Optional annotations for the client."
        },
        description: {
          description: `A description of what this resource represents.

This can be used by clients to improve the LLM's understanding of available resources. It can be thought of like a "hint" to the model.`,
          type: "string"
        },
        icons: {
          description: "Optional set of sized icons that the client can display in a user interface.\n\nClients that support rendering icons MUST support at least the following MIME types:\n- `image/png` - PNG images (safe, universal compatibility)\n- `image/jpeg` (and `image/jpg`) - JPEG images (safe, universal compatibility)\n\nClients that support rendering icons SHOULD also support:\n- `image/svg+xml` - SVG images (scalable but requires security precautions)\n- `image/webp` - WebP images (modern, efficient format)",
          items: {
            $ref: "#/$defs/Icon"
          },
          type: "array"
        },
        mimeType: {
          description: "The MIME type of this resource, if known.",
          type: "string"
        },
        name: {
          description: "Intended for programmatic or logical use, but used as a display name in past specs or fallback (if title isn't present).",
          type: "string"
        },
        size: {
          description: "The size of the raw resource content, in bytes (i.e., before base64 encoding or any tokenization), if known.\n\nThis can be used by Hosts to display file sizes and estimate context window usage.",
          type: "integer"
        },
        title: {
          description: "Intended for UI and end-user contexts \u2014 optimized to be human-readable and easily understood,\neven by those unfamiliar with domain-specific terminology.\n\nIf not provided, the name should be used for display (except for {@link Tool},\nwhere `annotations.title` should be given precedence over using `name`,\nif present).",
          type: "string"
        },
        uri: {
          description: "The URI of this resource.",
          format: "uri",
          type: "string"
        }
      },
      required: [
        "name",
        "uri"
      ],
      type: "object"
    },
    ResourceContents: {
      description: "The contents of a specific resource or sub-resource.",
      properties: {
        _meta: {
          $ref: "#/$defs/MetaObject"
        },
        mimeType: {
          description: "The MIME type of this resource, if known.",
          type: "string"
        },
        uri: {
          description: "The URI of this resource.",
          format: "uri",
          type: "string"
        }
      },
      required: [
        "uri"
      ],
      type: "object"
    },
    ResourceLink: {
      description: "A resource that the server is capable of reading, included in a prompt or tool call result.\n\nNote: resource links returned by tools are not guaranteed to appear in the results of {@link ListResourcesRequestresources/list} requests.",
      properties: {
        _meta: {
          $ref: "#/$defs/MetaObject"
        },
        annotations: {
          $ref: "#/$defs/Annotations",
          description: "Optional annotations for the client."
        },
        description: {
          description: `A description of what this resource represents.

This can be used by clients to improve the LLM's understanding of available resources. It can be thought of like a "hint" to the model.`,
          type: "string"
        },
        icons: {
          description: "Optional set of sized icons that the client can display in a user interface.\n\nClients that support rendering icons MUST support at least the following MIME types:\n- `image/png` - PNG images (safe, universal compatibility)\n- `image/jpeg` (and `image/jpg`) - JPEG images (safe, universal compatibility)\n\nClients that support rendering icons SHOULD also support:\n- `image/svg+xml` - SVG images (scalable but requires security precautions)\n- `image/webp` - WebP images (modern, efficient format)",
          items: {
            $ref: "#/$defs/Icon"
          },
          type: "array"
        },
        mimeType: {
          description: "The MIME type of this resource, if known.",
          type: "string"
        },
        name: {
          description: "Intended for programmatic or logical use, but used as a display name in past specs or fallback (if title isn't present).",
          type: "string"
        },
        size: {
          description: "The size of the raw resource content, in bytes (i.e., before base64 encoding or any tokenization), if known.\n\nThis can be used by Hosts to display file sizes and estimate context window usage.",
          type: "integer"
        },
        title: {
          description: "Intended for UI and end-user contexts \u2014 optimized to be human-readable and easily understood,\neven by those unfamiliar with domain-specific terminology.\n\nIf not provided, the name should be used for display (except for {@link Tool},\nwhere `annotations.title` should be given precedence over using `name`,\nif present).",
          type: "string"
        },
        type: {
          const: "resource_link",
          type: "string"
        },
        uri: {
          description: "The URI of this resource.",
          format: "uri",
          type: "string"
        }
      },
      required: [
        "name",
        "type",
        "uri"
      ],
      type: "object"
    },
    ResourceListChangedNotification: {
      description: "An optional notification from the server to the client, informing it that the list of resources it can read from has changed. This is only delivered on a {@link SubscriptionsListenRequestsubscriptions/listen} stream when the client requested it via the `resourcesListChanged` filter field.",
      properties: {
        jsonrpc: {
          const: "2.0",
          type: "string"
        },
        method: {
          const: "notifications/resources/list_changed",
          type: "string"
        },
        params: {
          $ref: "#/$defs/NotificationParams"
        }
      },
      required: [
        "jsonrpc",
        "method"
      ],
      type: "object"
    },
    ResourceRequestParams: {
      description: "Common params for resource-related requests.",
      properties: {
        _meta: {
          $ref: "#/$defs/RequestMetaObject"
        },
        uri: {
          description: "The URI of the resource. The URI can use any protocol; it is up to the server how to interpret it.",
          format: "uri",
          type: "string"
        }
      },
      required: [
        "_meta",
        "uri"
      ],
      type: "object"
    },
    ResourceTemplate: {
      description: "A template description for resources available on the server.",
      properties: {
        _meta: {
          $ref: "#/$defs/MetaObject"
        },
        annotations: {
          $ref: "#/$defs/Annotations",
          description: "Optional annotations for the client."
        },
        description: {
          description: `A description of what this template is for.

This can be used by clients to improve the LLM's understanding of available resources. It can be thought of like a "hint" to the model.`,
          type: "string"
        },
        icons: {
          description: "Optional set of sized icons that the client can display in a user interface.\n\nClients that support rendering icons MUST support at least the following MIME types:\n- `image/png` - PNG images (safe, universal compatibility)\n- `image/jpeg` (and `image/jpg`) - JPEG images (safe, universal compatibility)\n\nClients that support rendering icons SHOULD also support:\n- `image/svg+xml` - SVG images (scalable but requires security precautions)\n- `image/webp` - WebP images (modern, efficient format)",
          items: {
            $ref: "#/$defs/Icon"
          },
          type: "array"
        },
        mimeType: {
          description: "The MIME type for all resources that match this template. This should only be included if all resources matching this template have the same type.",
          type: "string"
        },
        name: {
          description: "Intended for programmatic or logical use, but used as a display name in past specs or fallback (if title isn't present).",
          type: "string"
        },
        title: {
          description: "Intended for UI and end-user contexts \u2014 optimized to be human-readable and easily understood,\neven by those unfamiliar with domain-specific terminology.\n\nIf not provided, the name should be used for display (except for {@link Tool},\nwhere `annotations.title` should be given precedence over using `name`,\nif present).",
          type: "string"
        },
        uriTemplate: {
          description: "A URI template (according to RFC 6570) that can be used to construct resource URIs.",
          format: "uri-template",
          type: "string"
        }
      },
      required: [
        "name",
        "uriTemplate"
      ],
      type: "object"
    },
    ResourceTemplateReference: {
      description: "A reference to a resource or resource template definition.",
      properties: {
        type: {
          const: "ref/resource",
          type: "string"
        },
        uri: {
          description: "The URI or URI template of the resource.",
          format: "uri-template",
          type: "string"
        }
      },
      required: [
        "type",
        "uri"
      ],
      type: "object"
    },
    ResourceUpdatedNotification: {
      description: "A notification from the server to the client, informing it that a resource has changed and may need to be read again. This is only sent for resources the client opted in to via the `resourceSubscriptions` field of a {@link SubscriptionsListenRequestsubscriptions/listen} request.",
      properties: {
        jsonrpc: {
          const: "2.0",
          type: "string"
        },
        method: {
          const: "notifications/resources/updated",
          type: "string"
        },
        params: {
          $ref: "#/$defs/ResourceUpdatedNotificationParams"
        }
      },
      required: [
        "jsonrpc",
        "method",
        "params"
      ],
      type: "object"
    },
    ResourceUpdatedNotificationParams: {
      description: "Parameters for a `notifications/resources/updated` notification.",
      properties: {
        _meta: {
          $ref: "#/$defs/NotificationMetaObject"
        },
        uri: {
          description: "The URI of the resource that has been updated. This might be a sub-resource of the one that the client actually subscribed to.",
          format: "uri",
          type: "string"
        }
      },
      required: [
        "uri"
      ],
      type: "object"
    },
    Result: {
      additionalProperties: {},
      description: "Common result fields.",
      properties: {
        _meta: {
          $ref: "#/$defs/ResultMetaObject"
        },
        resultType: {
          description: 'Indicates the type of the result, which allows the client to determine\nhow to parse the result object.\n\nServers implementing this protocol version MUST include this field.\nFor backward compatibility, when a client receives a result from a\nserver implementing an earlier protocol version (which does not include\n`resultType`), the client MUST treat the absent field as `"complete"`.',
          type: "string"
        }
      },
      required: [
        "resultType"
      ],
      type: "object"
    },
    ResultMetaObject: {
      description: "Extends {@link MetaObject} with additional result-specific fields. All key naming rules from `MetaObject` apply.",
      properties: {
        "io.modelcontextprotocol/serverInfo": {
          $ref: "#/$defs/Implementation",
          description: "Identifies the server software producing the response. Servers SHOULD\ninclude this field on every response unless specifically configured not\nto do so.\n\nThe {@link Implementation} schema requires `name` and `version`; other\nfields are optional.\n\nThe value is self-reported by the server and is not verified by the\nprotocol. It is intended for display, logging, and debugging. Clients\nSHOULD NOT use it to change their behavior, and SHOULD NOT rely on it for\nsecurity decisions."
        }
      },
      type: "object"
    },
    ResultType: {
      description: "Indicates the type of a {@link Result} object, allowing the client to\ndetermine how to parse the response.\n\ncomplete - the request completed successfully and the result contains the final content.\ninput_required - the request requires additional input and the result contains an {@link InputRequiredResult} object with instructions for the client to provide additional input before retrying the original request.",
      type: "string"
    },
    Role: {
      description: "The sender or recipient of messages and data in a conversation.",
      enum: [
        "assistant",
        "user"
      ],
      type: "string"
    },
    Root: {
      description: "Represents a root directory or file that the server can operate on.",
      properties: {
        _meta: {
          $ref: "#/$defs/MetaObject"
        },
        name: {
          description: "An optional name for the root. This can be used to provide a human-readable\nidentifier for the root, which may be useful for display purposes or for\nreferencing the root in other parts of the application.",
          type: "string"
        },
        uri: {
          description: "The URI identifying the root. This *must* start with `file://` for now.\nThis restriction may be relaxed in future versions of the protocol to allow\nother URI schemes.",
          format: "uri",
          type: "string"
        }
      },
      required: [
        "uri"
      ],
      type: "object"
    },
    SamplingMessage: {
      description: "Describes a message issued to or received from an LLM API.",
      properties: {
        _meta: {
          $ref: "#/$defs/MetaObject"
        },
        content: {
          anyOf: [
            {
              $ref: "#/$defs/TextContent"
            },
            {
              $ref: "#/$defs/ImageContent"
            },
            {
              $ref: "#/$defs/AudioContent"
            },
            {
              $ref: "#/$defs/ToolUseContent"
            },
            {
              $ref: "#/$defs/ToolResultContent"
            },
            {
              items: {
                $ref: "#/$defs/SamplingMessageContentBlock"
              },
              type: "array"
            }
          ]
        },
        role: {
          $ref: "#/$defs/Role"
        }
      },
      required: [
        "content",
        "role"
      ],
      type: "object"
    },
    SamplingMessageContentBlock: {
      anyOf: [
        {
          $ref: "#/$defs/TextContent"
        },
        {
          $ref: "#/$defs/ImageContent"
        },
        {
          $ref: "#/$defs/AudioContent"
        },
        {
          $ref: "#/$defs/ToolUseContent"
        },
        {
          $ref: "#/$defs/ToolResultContent"
        }
      ]
    },
    ServerCapabilities: {
      description: "Capabilities that a server may support. Known capabilities are defined here, in this schema, but this is not a closed set: any server can define its own, additional capabilities.",
      properties: {
        completions: {
          $ref: "#/$defs/JSONObject",
          description: "Present if the server supports argument autocompletion suggestions."
        },
        experimental: {
          additionalProperties: {
            $ref: "#/$defs/JSONObject"
          },
          description: "Experimental, non-standard capabilities that the server supports.",
          type: "object"
        },
        extensions: {
          additionalProperties: {
            $ref: "#/$defs/JSONObject"
          },
          description: 'Optional MCP extensions that the server supports. Keys are extension identifiers\n(e.g., "io.modelcontextprotocol/tasks"), and values are per-extension settings\nobjects. An empty object indicates support with no settings.\n\nKeys MUST follow the {@link MetaObject`_meta` key naming rules}, with a\nmandatory prefix.',
          type: "object"
        },
        logging: {
          $ref: "#/$defs/JSONObject",
          description: "Present if the server supports sending log messages to the client."
        },
        prompts: {
          description: "Present if the server offers any prompt templates.",
          properties: {
            listChanged: {
              description: "Whether this server supports notifications for changes to the prompt list.",
              type: "boolean"
            }
          },
          type: "object"
        },
        resources: {
          description: "Present if the server offers any resources to read.",
          properties: {
            listChanged: {
              description: "Whether this server supports notifications for changes to the resource list.",
              type: "boolean"
            },
            subscribe: {
              description: "Whether this server supports subscribing to resource updates.",
              type: "boolean"
            }
          },
          type: "object"
        },
        tools: {
          description: "Present if the server offers any tools to call.",
          properties: {
            listChanged: {
              description: "Whether this server supports notifications for changes to the tool list.",
              type: "boolean"
            }
          },
          type: "object"
        }
      },
      type: "object"
    },
    ServerNotification: {
      anyOf: [
        {
          $ref: "#/$defs/CancelledNotification"
        },
        {
          $ref: "#/$defs/ProgressNotification"
        },
        {
          $ref: "#/$defs/ResourceListChangedNotification"
        },
        {
          $ref: "#/$defs/SubscriptionsAcknowledgedNotification"
        },
        {
          $ref: "#/$defs/ResourceUpdatedNotification"
        },
        {
          $ref: "#/$defs/PromptListChangedNotification"
        },
        {
          $ref: "#/$defs/ToolListChangedNotification"
        },
        {
          $ref: "#/$defs/LoggingMessageNotification"
        }
      ]
    },
    ServerResult: {
      anyOf: [
        {
          $ref: "#/$defs/Result"
        },
        {
          $ref: "#/$defs/InputRequiredResult"
        },
        {
          $ref: "#/$defs/DiscoverResult"
        },
        {
          $ref: "#/$defs/ListResourcesResult"
        },
        {
          $ref: "#/$defs/ListResourceTemplatesResult"
        },
        {
          $ref: "#/$defs/ReadResourceResult"
        },
        {
          $ref: "#/$defs/SubscriptionsListenResult"
        },
        {
          $ref: "#/$defs/ListPromptsResult"
        },
        {
          $ref: "#/$defs/GetPromptResult"
        },
        {
          $ref: "#/$defs/ListToolsResult"
        },
        {
          $ref: "#/$defs/CallToolResult"
        },
        {
          $ref: "#/$defs/CompleteResult"
        }
      ]
    },
    SingleSelectEnumSchema: {
      anyOf: [
        {
          $ref: "#/$defs/UntitledSingleSelectEnumSchema"
        },
        {
          $ref: "#/$defs/TitledSingleSelectEnumSchema"
        }
      ]
    },
    StringSchema: {
      properties: {
        default: {
          type: "string"
        },
        description: {
          type: "string"
        },
        format: {
          enum: [
            "date",
            "date-time",
            "email",
            "uri"
          ],
          type: "string"
        },
        maxLength: {
          type: "integer"
        },
        minLength: {
          type: "integer"
        },
        title: {
          type: "string"
        },
        type: {
          const: "string",
          type: "string"
        }
      },
      required: [
        "type"
      ],
      type: "object"
    },
    SubscriptionFilter: {
      description: "The set of notification types a client may opt in to on a\n{@link SubscriptionsListenRequestsubscriptions/listen} request.\n\nEach notification type is **opt-in**; the server **MUST NOT** send\nnotification types the client has not explicitly requested here.",
      properties: {
        promptsListChanged: {
          description: "If true, receive {@link PromptListChangedNotificationnotifications/prompts/list_changed}.",
          type: "boolean"
        },
        resourceSubscriptions: {
          description: "Subscribe to {@link ResourceUpdatedNotificationnotifications/resources/updated} for these resource URIs.\nReplaces the former `resources/subscribe` RPC.",
          items: {
            type: "string"
          },
          type: "array"
        },
        resourcesListChanged: {
          description: "If true, receive {@link ResourceListChangedNotificationnotifications/resources/list_changed}.",
          type: "boolean"
        },
        toolsListChanged: {
          description: "If true, receive {@link ToolListChangedNotificationnotifications/tools/list_changed}.",
          type: "boolean"
        }
      },
      type: "object"
    },
    SubscriptionsAcknowledgedNotification: {
      description: "Sent by the server to acknowledge that a\n{@link SubscriptionsListenRequestsubscriptions/listen} subscription has been\nestablished and to report which notification types it agreed to honor.\n\nThis notification MUST be the first message the server sends carrying the\nsubscription's ID in `io.modelcontextprotocol/subscriptionId`. The server MUST\nNOT send any notification on the subscription before acknowledging it. On\nstdio, where every subscription shares one channel, this ordering is defined\nper subscription ID and not per channel: messages belonging to other\nsubscriptions MAY be interleaved before it.",
      properties: {
        jsonrpc: {
          const: "2.0",
          type: "string"
        },
        method: {
          const: "notifications/subscriptions/acknowledged",
          type: "string"
        },
        params: {
          $ref: "#/$defs/SubscriptionsAcknowledgedNotificationParams"
        }
      },
      required: [
        "jsonrpc",
        "method",
        "params"
      ],
      type: "object"
    },
    SubscriptionsAcknowledgedNotificationParams: {
      description: "Parameters for a {@link SubscriptionsAcknowledgedNotificationnotifications/subscriptions/acknowledged} notification.",
      properties: {
        _meta: {
          $ref: "#/$defs/NotificationMetaObject"
        },
        notifications: {
          $ref: "#/$defs/SubscriptionFilter",
          description: "The subset of requested notification types the server agreed to honor.\nOnly includes notification types the server actually supports; if the\nclient requested an unsupported type (e.g., `promptsListChanged` when\nthe server has no prompts), it is omitted from this set."
        }
      },
      required: [
        "notifications"
      ],
      type: "object"
    },
    SubscriptionsListenRequest: {
      description: "Sent from the client to open a long-lived channel for receiving notifications\noutside the context of a specific request. Replaces the previous HTTP GET\nendpoint and ensures consistent behavior between HTTP and STDIO.",
      properties: {
        id: {
          $ref: "#/$defs/RequestId"
        },
        jsonrpc: {
          const: "2.0",
          type: "string"
        },
        method: {
          const: "subscriptions/listen",
          type: "string"
        },
        params: {
          $ref: "#/$defs/SubscriptionsListenRequestParams"
        }
      },
      required: [
        "id",
        "jsonrpc",
        "method",
        "params"
      ],
      type: "object"
    },
    SubscriptionsListenRequestParams: {
      description: "Parameters for a {@link SubscriptionsListenRequestsubscriptions/listen} request.",
      properties: {
        _meta: {
          $ref: "#/$defs/RequestMetaObject"
        },
        notifications: {
          $ref: "#/$defs/SubscriptionFilter",
          description: "The notifications the client opts in to on this stream. The server\n**MUST NOT** send notification types the client has not explicitly\nrequested."
        }
      },
      required: [
        "_meta",
        "notifications"
      ],
      type: "object"
    },
    SubscriptionsListenResult: {
      description: "The response to a {@link SubscriptionsListenRequestsubscriptions/listen}\nrequest, signalling that the subscription has ended gracefully (for example,\nduring server shutdown). Because the listen stream is long-lived, this result\nis sent only when the server tears the subscription down; an abrupt transport\nclose carries no response. The result body is otherwise empty.",
      properties: {
        _meta: {
          $ref: "#/$defs/SubscriptionsListenResultMetaObject"
        },
        resultType: {
          description: 'Indicates the type of the result, which allows the client to determine\nhow to parse the result object.\n\nServers implementing this protocol version MUST include this field.\nFor backward compatibility, when a client receives a result from a\nserver implementing an earlier protocol version (which does not include\n`resultType`), the client MUST treat the absent field as `"complete"`.',
          type: "string"
        }
      },
      required: [
        "_meta",
        "resultType"
      ],
      type: "object"
    },
    SubscriptionsListenResultMetaObject: {
      description: "Extends {@link ResultMetaObject} with the subscription-stream identifier carried by a\n{@link SubscriptionsListenResult}. All key naming rules from `MetaObject` apply.",
      properties: {
        "io.modelcontextprotocol/serverInfo": {
          $ref: "#/$defs/Implementation",
          description: "Identifies the server software producing the response. Servers SHOULD\ninclude this field on every response unless specifically configured not\nto do so.\n\nThe {@link Implementation} schema requires `name` and `version`; other\nfields are optional.\n\nThe value is self-reported by the server and is not verified by the\nprotocol. It is intended for display, logging, and debugging. Clients\nSHOULD NOT use it to change their behavior, and SHOULD NOT rely on it for\nsecurity decisions."
        },
        "io.modelcontextprotocol/subscriptionId": {
          $ref: "#/$defs/RequestId",
          description: "Identifies the subscription stream this response closes, so the client can\ncorrelate it with the originating subscription \u2014 mirroring the same key on\nthe stream's notifications. The value is the JSON-RPC ID of the\n`subscriptions/listen` request that opened the stream (and equals this\nresponse's `id`)."
        }
      },
      required: [
        "io.modelcontextprotocol/subscriptionId"
      ],
      type: "object"
    },
    SubscriptionsListenResultResponse: {
      description: "A successful response from the server for a {@link SubscriptionsListenRequestsubscriptions/listen}\nrequest, sent when the server tears the subscription down gracefully.",
      properties: {
        id: {
          $ref: "#/$defs/RequestId"
        },
        jsonrpc: {
          const: "2.0",
          type: "string"
        },
        result: {
          $ref: "#/$defs/SubscriptionsListenResult"
        }
      },
      required: [
        "id",
        "jsonrpc",
        "result"
      ],
      type: "object"
    },
    TextContent: {
      description: "Text provided to or from an LLM.",
      properties: {
        _meta: {
          $ref: "#/$defs/MetaObject"
        },
        annotations: {
          $ref: "#/$defs/Annotations",
          description: "Optional annotations for the client."
        },
        text: {
          description: "The text content of the message.",
          type: "string"
        },
        type: {
          const: "text",
          type: "string"
        }
      },
      required: [
        "text",
        "type"
      ],
      type: "object"
    },
    TextResourceContents: {
      properties: {
        _meta: {
          $ref: "#/$defs/MetaObject"
        },
        mimeType: {
          description: "The MIME type of this resource, if known.",
          type: "string"
        },
        text: {
          description: "The text of the item. This must only be set if the item can actually be represented as text (not binary data).",
          type: "string"
        },
        uri: {
          description: "The URI of this resource.",
          format: "uri",
          type: "string"
        }
      },
      required: [
        "text",
        "uri"
      ],
      type: "object"
    },
    TitledMultiSelectEnumSchema: {
      description: "Schema for multiple-selection enumeration with display titles for each option.",
      properties: {
        default: {
          description: "Optional default value.",
          items: {
            type: "string"
          },
          type: "array"
        },
        description: {
          description: "Optional description for the enum field.",
          type: "string"
        },
        items: {
          description: "Schema for array items with enum options and display labels.",
          properties: {
            anyOf: {
              description: "Array of enum options with values and display labels.",
              items: {
                properties: {
                  const: {
                    description: "The constant enum value.",
                    type: "string"
                  },
                  title: {
                    description: "Display title for this option.",
                    type: "string"
                  }
                },
                required: [
                  "const",
                  "title"
                ],
                type: "object"
              },
              type: "array"
            }
          },
          required: [
            "anyOf"
          ],
          type: "object"
        },
        maxItems: {
          description: "Maximum number of items to select.",
          type: "integer"
        },
        minItems: {
          description: "Minimum number of items to select.",
          type: "integer"
        },
        title: {
          description: "Optional title for the enum field.",
          type: "string"
        },
        type: {
          const: "array",
          type: "string"
        }
      },
      required: [
        "items",
        "type"
      ],
      type: "object"
    },
    TitledSingleSelectEnumSchema: {
      description: "Schema for single-selection enumeration with display titles for each option.",
      properties: {
        default: {
          description: "Optional default value.",
          type: "string"
        },
        description: {
          description: "Optional description for the enum field.",
          type: "string"
        },
        oneOf: {
          description: "Array of enum options with values and display labels.",
          items: {
            properties: {
              const: {
                description: "The enum value.",
                type: "string"
              },
              title: {
                description: "Display label for this option.",
                type: "string"
              }
            },
            required: [
              "const",
              "title"
            ],
            type: "object"
          },
          type: "array"
        },
        title: {
          description: "Optional title for the enum field.",
          type: "string"
        },
        type: {
          const: "string",
          type: "string"
        }
      },
      required: [
        "oneOf",
        "type"
      ],
      type: "object"
    },
    Tool: {
      description: "Definition for a tool the client can call.",
      properties: {
        _meta: {
          $ref: "#/$defs/MetaObject"
        },
        annotations: {
          $ref: "#/$defs/ToolAnnotations",
          description: "Optional additional tool information.\n\nDisplay name precedence order is: `title`, `annotations.title`, then `name`."
        },
        description: {
          description: `A human-readable description of the tool.

This can be used by clients to improve the LLM's understanding of available tools. It can be thought of like a "hint" to the model.`,
          type: "string"
        },
        icons: {
          description: "Optional set of sized icons that the client can display in a user interface.\n\nClients that support rendering icons MUST support at least the following MIME types:\n- `image/png` - PNG images (safe, universal compatibility)\n- `image/jpeg` (and `image/jpg`) - JPEG images (safe, universal compatibility)\n\nClients that support rendering icons SHOULD also support:\n- `image/svg+xml` - SVG images (scalable but requires security precautions)\n- `image/webp` - WebP images (modern, efficient format)",
          items: {
            $ref: "#/$defs/Icon"
          },
          type: "array"
        },
        inputSchema: {
          additionalProperties: {},
          description: 'A JSON Schema object defining the expected parameters for the tool.\n\nTool arguments are always JSON objects, so `type: "object"` is required at the root.\nBeyond that, any JSON Schema 2020-12 keyword may appear alongside `type` \u2014 including\ncomposition keywords (`oneOf`, `anyOf`, `allOf`, `not`), conditional keywords\n(`if`/`then`/`else`), reference keywords (`$ref`, `$defs`, `$anchor`), and any other\nstandard validation or annotation keywords.\n\nProperty schemas may carry an `x-mcp-header` annotation to mirror the\nargument value into an HTTP header on the Streamable HTTP transport. See\nthe Streamable HTTP transport specification for the validity and\nextraction rules.\n\nDefaults to JSON Schema 2020-12 when no explicit `$schema` is provided.',
          properties: {
            $schema: {
              type: "string"
            },
            type: {
              const: "object",
              type: "string"
            }
          },
          required: [
            "type"
          ],
          type: "object"
        },
        name: {
          description: "Intended for programmatic or logical use, but used as a display name in past specs or fallback (if title isn't present).",
          type: "string"
        },
        outputSchema: {
          additionalProperties: {},
          description: "An optional JSON Schema object defining the structure of the tool's output returned in\nthe structuredContent field of a {@link CallToolResult}. This can be any valid JSON Schema 2020-12.\n\nDefaults to JSON Schema 2020-12 when no explicit `$schema` is provided.",
          properties: {
            $schema: {
              type: "string"
            }
          },
          type: "object"
        },
        title: {
          description: "Intended for UI and end-user contexts \u2014 optimized to be human-readable and easily understood,\neven by those unfamiliar with domain-specific terminology.\n\nIf not provided, the name should be used for display (except for {@link Tool},\nwhere `annotations.title` should be given precedence over using `name`,\nif present).",
          type: "string"
        }
      },
      required: [
        "inputSchema",
        "name"
      ],
      type: "object"
    },
    ToolAnnotations: {
      description: "Additional properties describing a {@link Tool} to clients.\n\nNOTE: all properties in `ToolAnnotations` are **hints**.\nThey are not guaranteed to provide a faithful description of\ntool behavior (including descriptive properties like `title`).\n\nClients should never make tool use decisions based on `ToolAnnotations`\nreceived from untrusted servers.",
      properties: {
        destructiveHint: {
          description: "If true, the tool may perform destructive updates to its environment.\nIf false, the tool performs only additive updates.\n\n(This property is meaningful only when `readOnlyHint == false`)\n\nDefault: true",
          type: "boolean"
        },
        idempotentHint: {
          description: "If true, calling the tool repeatedly with the same arguments\nwill have no additional effect on its environment.\n\n(This property is meaningful only when `readOnlyHint == false`)\n\nDefault: false",
          type: "boolean"
        },
        openWorldHint: {
          description: `If true, this tool may interact with an "open world" of external
entities. If false, the tool's domain of interaction is closed.
For example, the world of a web search tool is open, whereas that
of a memory tool is not.

Default: true`,
          type: "boolean"
        },
        readOnlyHint: {
          description: "If true, the tool does not modify its environment.\n\nDefault: false",
          type: "boolean"
        },
        title: {
          description: "A human-readable title for the tool.",
          type: "string"
        }
      },
      type: "object"
    },
    ToolChoice: {
      description: "Controls tool selection behavior for sampling requests.",
      properties: {
        mode: {
          description: 'Controls the tool use ability of the model:\n- `"auto"`: Model decides whether to use tools (default)\n- `"required"`: Model MUST use at least one tool before completing\n- `"none"`: Model MUST NOT use any tools',
          enum: [
            "auto",
            "none",
            "required"
          ],
          type: "string"
        }
      },
      type: "object"
    },
    ToolListChangedNotification: {
      description: "An optional notification from the server to the client, informing it that the list of tools it offers has changed. This is only delivered on a {@link SubscriptionsListenRequestsubscriptions/listen} stream when the client requested it via the `toolsListChanged` filter field.",
      properties: {
        jsonrpc: {
          const: "2.0",
          type: "string"
        },
        method: {
          const: "notifications/tools/list_changed",
          type: "string"
        },
        params: {
          $ref: "#/$defs/NotificationParams"
        }
      },
      required: [
        "jsonrpc",
        "method"
      ],
      type: "object"
    },
    ToolResultContent: {
      description: "The result of a tool use, provided by the user back to the assistant.",
      properties: {
        _meta: {
          $ref: "#/$defs/MetaObject",
          description: "Optional metadata about the tool result. Clients SHOULD preserve this field when\nincluding tool results in subsequent sampling requests to enable caching optimizations."
        },
        content: {
          description: "The unstructured result content of the tool use.\n\nThis has the same format as {@link CallToolResult.content} and can include text, images,\naudio, resource links, and embedded resources.",
          items: {
            $ref: "#/$defs/ContentBlock"
          },
          type: "array"
        },
        isError: {
          description: "Whether the tool use resulted in an error.\n\nIf true, the content typically describes the error that occurred.\nDefault: false",
          type: "boolean"
        },
        structuredContent: {
          description: "An optional structured result value.\n\nThis can be any JSON value (object, array, string, number, boolean, or null).\nIf the tool defined an {@link Tool.outputSchema}, this SHOULD conform to that schema."
        },
        toolUseId: {
          description: "The ID of the tool use this result corresponds to.\n\nThis MUST match the ID from a previous {@link ToolUseContent}.",
          type: "string"
        },
        type: {
          const: "tool_result",
          type: "string"
        }
      },
      required: [
        "content",
        "toolUseId",
        "type"
      ],
      type: "object"
    },
    ToolUseContent: {
      description: "A request from the assistant to call a tool.",
      properties: {
        _meta: {
          $ref: "#/$defs/MetaObject",
          description: "Optional metadata about the tool use. Clients SHOULD preserve this field when\nincluding tool uses in subsequent sampling requests to enable caching optimizations."
        },
        id: {
          description: "A unique identifier for this tool use.\n\nThis ID is used to match tool results to their corresponding tool uses.",
          type: "string"
        },
        input: {
          additionalProperties: {},
          description: "The arguments to pass to the tool, conforming to the tool's input schema.",
          type: "object"
        },
        name: {
          description: "The name of the tool to call.",
          type: "string"
        },
        type: {
          const: "tool_use",
          type: "string"
        }
      },
      required: [
        "id",
        "input",
        "name",
        "type"
      ],
      type: "object"
    },
    UnsupportedProtocolVersionError: {
      description: "Returned when the request's protocol version is unknown to the server or\nunsupported (e.g., a known experimental or draft version the server has\nchosen not to implement). For HTTP, the response status code MUST be\n`400 Bad Request`.",
      properties: {
        error: {
          allOf: [
            {
              $ref: "#/$defs/Error"
            },
            {
              properties: {
                code: {
                  const: -32022,
                  type: "integer"
                },
                data: {
                  properties: {
                    requested: {
                      description: "The protocol version that was requested by the client.",
                      type: "string"
                    },
                    supported: {
                      description: "Protocol versions the server supports. The client should choose a\nmutually supported version from this list and retry.",
                      items: {
                        type: "string"
                      },
                      type: "array"
                    }
                  },
                  required: [
                    "requested",
                    "supported"
                  ],
                  type: "object"
                }
              },
              required: [
                "code",
                "data"
              ],
              type: "object"
            }
          ]
        },
        id: {
          $ref: "#/$defs/RequestId"
        },
        jsonrpc: {
          const: "2.0",
          type: "string"
        }
      },
      required: [
        "error",
        "jsonrpc"
      ],
      type: "object"
    },
    UntitledMultiSelectEnumSchema: {
      description: "Schema for multiple-selection enumeration without display titles for options.",
      properties: {
        default: {
          description: "Optional default value.",
          items: {
            type: "string"
          },
          type: "array"
        },
        description: {
          description: "Optional description for the enum field.",
          type: "string"
        },
        items: {
          description: "Schema for the array items.",
          properties: {
            enum: {
              description: "Array of enum values to choose from.",
              items: {
                type: "string"
              },
              type: "array"
            },
            type: {
              const: "string",
              type: "string"
            }
          },
          required: [
            "enum",
            "type"
          ],
          type: "object"
        },
        maxItems: {
          description: "Maximum number of items to select.",
          type: "integer"
        },
        minItems: {
          description: "Minimum number of items to select.",
          type: "integer"
        },
        title: {
          description: "Optional title for the enum field.",
          type: "string"
        },
        type: {
          const: "array",
          type: "string"
        }
      },
      required: [
        "items",
        "type"
      ],
      type: "object"
    },
    UntitledSingleSelectEnumSchema: {
      description: "Schema for single-selection enumeration without display titles for options.",
      properties: {
        default: {
          description: "Optional default value.",
          type: "string"
        },
        description: {
          description: "Optional description for the enum field.",
          type: "string"
        },
        enum: {
          description: "Array of enum values to choose from.",
          items: {
            type: "string"
          },
          type: "array"
        },
        title: {
          description: "Optional title for the enum field.",
          type: "string"
        },
        type: {
          const: "string",
          type: "string"
        }
      },
      required: [
        "enum",
        "type"
      ],
      type: "object"
    }
  }
};

// src/oracles/schema-validator.ts
var schemaIds = {
  "2025-11-25": "https://mcp-wringer.invalid/spec/2025-11-25",
  "2026-07-28": "https://mcp-wringer.invalid/spec/2026-07-28"
};
var schemas = {
  "2025-11-25": schema_default,
  "2026-07-28": schema_default2
};
var ajv = new import__.Ajv2020({ allErrors: true, strict: false, validateFormats: false });
var validators = /* @__PURE__ */ new Map();
for (const revision of Object.keys(schemaIds)) {
  const schema = schemas[revision];
  const schemaId = schemaIds[revision];
  ajv.addSchema({ ...schema, $id: schemaId }, schemaId);
}
function validateAgainstSchema(revision, definition, value) {
  const key = `${revision}:${definition}`;
  let validator = validators.get(key);
  if (validator === void 0) {
    const compiled = ajv.compile({
      $ref: `${schemaIds[revision]}#/$defs/${definition}`
    });
    validators.set(key, compiled);
    validator = compiled;
  }
  const valid = validator(value);
  return {
    valid,
    errors: valid ? [] : (validator.errors ?? []).map((error) => `${error.instancePath || "/"} ${error.message ?? "is invalid"}`)
  };
}

// src/oracles/builtins.ts
var MAX_TRACE_BYTES = 1048576;
function createOracles() {
  return [
    ["crash", {
      evaluate(context) {
        const { outcome } = context;
        const exitedDuringScenario = outcome.failure?.kind === "target-exit";
        const exitedWithError = outcome.exitCode !== null && outcome.exitCode !== 0 && (outcome.failure === void 0 || outcome.failure.kind === "target-exit");
        const exitedBySignal = outcome.signal !== null && (outcome.failure === void 0 || outcome.failure.kind === "target-exit");
        const exitedUnsuccessfully = exitedWithError || exitedBySignal;
        if (!exitedDuringScenario && !exitedUnsuccessfully) {
          return [];
        }
        return [draft(
          context,
          "crash.process-exit",
          "target-exited",
          "The target process exited unexpectedly while executing the scenario.",
          stableTraceEvidence(context, true)
        )];
      }
    }],
    ["hang", {
      evaluate(context) {
        if (context.outcome.failure?.kind !== "timeout" || context.outcome.failure.phase !== "response") {
          return [];
        }
        const requests = sentRequests(context.scenario);
        const responseMessages = parseResponseMessages(context).flatMap((line) => {
          const message = asRecord2(line.value);
          return message !== void 0 && ("result" in message || "error" in message) ? [message] : [];
        });
        const responseIds = responseMessages.flatMap((message) => {
          const id = readId(message.id);
          return id === void 0 ? [] : [id];
        });
        const request = requests.find((item) => {
          const id = item.id;
          return id !== void 0 && context.scenario.steps.some((step) => step.type === "await-response" && step.id === id) && !responseIds.some((responseId) => idKey(responseId) === idKey(id));
        });
        if (request === void 0) {
          return [];
        }
        const unmatchedResponse = responseMessages.some((message) => {
          const id = readId(message.id);
          if (id === void 0) {
            return true;
          }
          return !requests.some((sent) => sent.id !== void 0 && idKey(sent.id) === idKey(id));
        });
        if (unmatchedResponse) {
          return [];
        }
        return [draft(
          context,
          "hang.request-timeout",
          `request-timeout:${request.method ?? "unknown-method"}`,
          `The target did not answer the ${request.method ?? "unknown"} request before its timeout.`
        )];
      }
    }],
    ["liveness", {
      evaluate(context) {
        if (context.livenessProbe?.passed !== false) {
          return [];
        }
        return [draft(
          context,
          "liveness.probe-failed",
          "probe-failed",
          "The target failed its revision-specific liveness probe after the scenario."
        )];
      }
    }],
    ["state-consistency", {
      evaluate(context) {
        const comparison = context.baselineComparison;
        if (comparison === void 0 || canonicalJson(comparison.before) === canonicalJson(comparison.after)) {
          return [];
        }
        return [draft(
          context,
          "state-consistency.baseline-changed",
          "baseline-response-changed",
          "The baseline response changed after the scenario."
        )];
      }
    }],
    ["stdout-pollution", {
      evaluate(context) {
        const lines = parseStdout(context.trace);
        if (!lines.some((line) => line.error !== void 0 || !isJsonRpcMessage(line.value))) {
          return [];
        }
        return [draft(
          context,
          "stdout-pollution.non-protocol-bytes",
          "non-protocol-stdout",
          "The target wrote bytes to stdout that are not a JSON-RPC message."
        )];
      }
    }],
    ["jsonrpc-contract", {
      evaluate(context) {
        const requests = sentRequests(context.scenario);
        const requestById = indexRequestsById(requests);
        const seenResponses = /* @__PURE__ */ new Set();
        const concurrentHttpRequests = context.transport === "streamable-http" && context.scenario.steps.some((step) => (step.type === "send" || step.type === "send-raw") && step.wire?.transport === "streamable-http" && step.wire.fault === "concurrent-requests");
        const findings = [];
        for (const line of parseResponseMessages(context)) {
          const message = asRecord2(line.value);
          if (message === void 0 || !("result" in message || "error" in message)) {
            continue;
          }
          const id = readId(message.id);
          const key = id === void 0 ? void 0 : idKey(id);
          const request = key === void 0 ? void 0 : requestById.get(key);
          let violation;
          if (line.error !== void 0 || message.jsonrpc !== "2.0" || id === void 0 || key === void 0 || "result" in message && "error" in message) {
            violation = "invalid-response";
          } else if (request === void 0) {
            violation = "unmatched-response-id";
          } else if (seenResponses.has(key) && !concurrentHttpRequests) {
            violation = "duplicate-response";
          } else {
            seenResponses.add(key);
          }
          if (violation !== void 0) {
            findings.push(draft(
              context,
              "jsonrpc-contract.invalid-message",
              violation,
              `The target emitted a JSON-RPC response with a ${violation.replaceAll("-", " ")}.`
            ));
          }
        }
        return findings;
      }
    }],
    ["schema-response", {
      evaluate(context) {
        const requests = sentRequests(context.scenario);
        const requestById = indexRequestsById(requests);
        const findings = [];
        for (const line of parseResponseMessages(context)) {
          if (line.error !== void 0 || !isJsonRpcMessage(line.value)) {
            continue;
          }
          const messageValidation = validateAgainstSchema(context.rules.revision, "JSONRPCMessage", line.value);
          if (!messageValidation.valid) {
            findings.push(draft(
              context,
              "schema-response.invalid-result",
              `invalid-message:${firstError(messageValidation.errors)}`,
              `The target emitted a message that does not match the revision's JSON-RPC schema: ${firstError(messageValidation.errors)}.`
            ));
            continue;
          }
          const message = asRecord2(line.value);
          if (message === void 0 || !("result" in message)) {
            continue;
          }
          const id = readId(message.id);
          const request = id === void 0 ? void 0 : requestById.get(idKey(id));
          const schemaName = request?.method === void 0 ? void 0 : context.rules.responseSchemas[request.method];
          if (schemaName === void 0) {
            continue;
          }
          const resultValidation = validateAgainstSchema(context.rules.revision, schemaName, message.result);
          if (!resultValidation.valid) {
            findings.push(draft(
              context,
              "schema-response.invalid-result",
              `invalid-result:${request?.method ?? "unknown-method"}:${schemaName}:${firstError(resultValidation.errors)}`,
              `The result for ${request?.method ?? "unknown"} does not match the ${schemaName} schema: ${firstError(resultValidation.errors)}.`
            ));
          }
        }
        return findings;
      }
    }],
    ["error-code", {
      evaluate(context) {
        const expectedById = new Map(
          (context.expectedErrors ?? []).map((expectation) => [idKey(expectation.id), expectation.code])
        );
        const requests = sentRequests(context.scenario);
        const requestById = indexRequestsById(requests);
        const findings = [];
        for (const line of parseResponseMessages(context)) {
          const message = asRecord2(line.value);
          const error = message === void 0 ? void 0 : asRecord2(message.error);
          const id = message === void 0 ? void 0 : readId(message.id);
          if (error === void 0 || typeof error.code !== "number" || id === void 0) {
            continue;
          }
          const expectedCode = expectedById.get(idKey(id));
          if (expectedCode === void 0 || expectedCode === error.code) {
            continue;
          }
          const method = requestById.get(idKey(id))?.method ?? "unknown-method";
          findings.push(draft(
            context,
            "error-code.unexpected-code",
            `error-code:${method}:${expectedCode}`,
            `The ${method} request returned error code ${error.code}; the expected code is ${expectedCode}.`
          ));
        }
        return findings;
      }
    }],
    ["error-leak", {
      evaluate(context) {
        const leaked = parseResponseMessages(context).some((line) => {
          const message = asRecord2(line.value);
          const error = message === void 0 ? void 0 : asRecord2(message.error);
          if (error === void 0) {
            return false;
          }
          const details = `${String(error.message ?? "")} ${safeStringify(error.data)}`;
          return /(?:\bat\s+.+:\d+:\d+|(?:[A-Za-z]:\\|\/(?:home|Users|private|var|opt|workspace)\/)[^\s"'<>]+)/i.test(details);
        });
        return leaked ? [draft(
          context,
          "error-leak.sensitive-detail",
          "stack-or-absolute-path",
          "An error response exposed a stack frame or an absolute filesystem path."
        )] : [];
      }
    }],
    ["accepted-malformed", {
      evaluate(context) {
        const malformed = sentRequests(context.scenario).filter((request) => request.message.jsonrpc !== "2.0" || typeof request.message.method !== "string" || request.message.id !== void 0 && readId(request.message.id) === void 0);
        const responses = parseResponseMessages(context).flatMap((line) => {
          const message = asRecord2(line.value);
          return message !== void 0 && "result" in message ? [message] : [];
        });
        if (!malformed.some((request) => request.id === void 0 || responses.some((response) => readId(response.id) === request.id))) {
          return [];
        }
        return [draft(
          context,
          "accepted-malformed.success-response",
          "malformed-request-accepted",
          "The target returned a success result for a malformed JSON-RPC request."
        )];
      }
    }],
    ["http-transport", {
      evaluate(context) {
        if (context.transport !== "streamable-http" || context.httpExchanges === void 0) {
          return [];
        }
        const findings = [];
        for (const exchange of context.httpExchanges) {
          if (exchange.requestMethod !== "POST" || exchange.requestFault !== void 0 || exchange.responseAborted === true) {
            continue;
          }
          let request;
          try {
            request = JSON.parse(exchange.requestBody);
          } catch {
            continue;
          }
          const message = asRecord2(request);
          if (message === void 0) {
            continue;
          }
          const isNotification = !("id" in message);
          if (isNotification) {
            if (exchange.responseStatus >= 200 && exchange.responseStatus < 300 && (exchange.responseStatus !== 202 || exchange.responseBody.length !== 0)) {
              findings.push(draft(
                context,
                "http.notification-response",
                `notification-response:${message.method ?? "unknown-method"}`,
                "The server accepted an HTTP notification without returning 202 Accepted and an empty body."
              ));
            }
            continue;
          }
          if (exchange.responseStatus < 200 || exchange.responseStatus >= 300) {
            continue;
          }
          const contentType = readHeader(exchange.responseHeaders, "content-type")?.split(";", 1)[0]?.trim().toLowerCase();
          if (contentType !== "application/json" && contentType !== "text/event-stream") {
            findings.push(draft(
              context,
              "http.response-media-type",
              `response-media-type:${contentType ?? "missing"}`,
              "The server returned a successful HTTP response without an allowed JSON or event-stream media type."
            ));
            continue;
          }
          const responseMessages = contentType === "application/json" ? [exchange.responseBody] : parseHttpEventData(exchange.responseBody);
          const validBody = responseMessages.length > 0 && responseMessages.every((body) => {
            try {
              return isJsonRpcMessage(JSON.parse(body));
            } catch {
              return false;
            }
          });
          if (!validBody) {
            findings.push(draft(
              context,
              "http.response-body-invalid",
              `response-body-invalid:${contentType}`,
              "The server returned a successful HTTP response whose body did not contain a JSON-RPC message."
            ));
          }
        }
        return findings;
      }
    }],
    ["resource-usage", {
      evaluate(context) {
        const traceBytes = context.transport === "stdio" ? context.outcome.stdoutBytes + context.outcome.stderrBytes : (context.httpExchanges ?? []).reduce(
          (total, exchange) => total + Buffer.byteLength(exchange.responseBody),
          0
        );
        if (traceBytes <= MAX_TRACE_BYTES) {
          return [];
        }
        return [draft(
          context,
          "resource-usage.outlier",
          "trace-output-over-1mib",
          `The target produced ${traceBytes} bytes of transport output during this scenario.`
        )];
      }
    }]
  ];
}
function registerBuiltInOracles() {
  for (const [name, oracle] of createOracles()) {
    if (!oracleRegistry.names().includes(name)) {
      oracleRegistry.register(name, oracle);
    }
  }
}
function draft(context, ruleId, signature, message, evidence) {
  const selectedEvidence = evidence ?? stableTraceEvidence(context);
  return {
    ruleId,
    signature,
    message,
    ...selectedEvidence.length === 0 ? {} : { evidence: selectedEvidence }
  };
}
function stableTraceEvidence(context, includeProcess = false) {
  const evidence = [];
  if (context.transport === "streamable-http") {
    evidence.push(...context.trace.events.filter((event) => event.channel === "http-request" || event.channel === "http-response").map((event) => ({ ...event, offsetMs: 0 })));
    if (includeProcess) {
      evidence.push(...context.trace.events.filter((event) => event.channel === "process").map((event) => ({ ...event, offsetMs: 0 })));
    }
    return evidence;
  }
  const channels = ["stdin", "stdout", "stderr"];
  for (const channel of channels) {
    const channelEvents = context.trace.events.filter((event) => event.channel === channel);
    if (channelEvents.length === 0) {
      continue;
    }
    const bytes = Buffer.concat(channelEvents.map((event) => event.encoding === "base64" ? Buffer.from(event.data, "base64") : Buffer.from(event.data)));
    const text = bytes.toString("utf8");
    const isUtf8 = Buffer.from(text, "utf8").equals(bytes);
    evidence.push({
      offsetMs: 0,
      channel,
      encoding: isUtf8 ? "utf8" : "base64",
      data: isUtf8 ? text : bytes.toString("base64")
    });
  }
  if (includeProcess) {
    evidence.push(...context.trace.events.filter((event) => event.channel === "process").map((event) => ({ ...event, offsetMs: 0 })));
  }
  return evidence;
}
function parseResponseMessages(context) {
  return context.transport === "stdio" ? parseStdout(context.trace) : context.responses.map((value) => ({ value }));
}
function readHeader(headers, name) {
  const value = headers[name.toLowerCase()];
  return Array.isArray(value) ? value[0] : value;
}
function parseHttpEventData(body) {
  const messages = [];
  let data = [];
  for (const line of body.split(/\r?\n/u)) {
    if (line.length === 0) {
      if (data.length > 0 && data.join("\n").length > 0) {
        messages.push(data.join("\n"));
        data = [];
      }
    } else if (line.startsWith("data:")) {
      data.push(line.slice(5).replace(/^ /u, ""));
    }
  }
  if (data.length > 0 && data.join("\n").length > 0) {
    messages.push(data.join("\n"));
  }
  return messages;
}
function parseStdout(trace) {
  const bytes = Buffer.concat(
    trace.events.filter((event) => event.channel === "stdout").map((event) => event.encoding === "base64" ? Buffer.from(event.data, "base64") : Buffer.from(event.data))
  );
  const lines = [];
  let offset = 0;
  while (offset < bytes.length) {
    const newline = bytes.indexOf(10, offset);
    const end = newline < 0 ? bytes.length : newline;
    const raw = bytes.subarray(offset, end);
    offset = newline < 0 ? bytes.length : newline + 1;
    if (raw.length === 0 || raw.length === 1 && raw[0] === 13) {
      continue;
    }
    try {
      lines.push({ value: JSON.parse(raw.toString("utf8")) });
    } catch (error) {
      lines.push({ error: error instanceof Error ? error.message : String(error) });
    }
  }
  return lines;
}
function sentRequests(scenario) {
  const requests = [];
  for (const step of scenario.steps) {
    if (step.type === "send") {
      const message = asRecord2(step.message);
      if (message !== void 0) {
        requests.push(toSentRequest(message));
      }
    } else if (step.type === "send-raw") {
      const bytes = Buffer.from(step.bytesBase64, "base64");
      for (const frame of bytes.toString("utf8").split("\n")) {
        if (frame.trim().length === 0) {
          continue;
        }
        try {
          const message = asRecord2(JSON.parse(frame));
          if (message !== void 0) {
            requests.push(toSentRequest(message));
          }
        } catch {
          continue;
        }
      }
    }
  }
  return requests;
}
function toSentRequest(message) {
  const id = readId(message.id);
  return {
    ...id === void 0 ? {} : { id },
    ...typeof message.method === "string" ? { method: message.method } : {},
    message
  };
}
function indexRequestsById(requests) {
  const index = /* @__PURE__ */ new Map();
  for (const request of requests) {
    if (request.id !== void 0) {
      index.set(idKey(request.id), request);
    }
  }
  return index;
}
function isJsonRpcMessage(value) {
  if (!isRecord8(value) || value.jsonrpc !== "2.0") {
    return false;
  }
  if (typeof value.method === "string") {
    return value.id === void 0 || readId(value.id) !== void 0;
  }
  return readId(value.id) !== void 0 && "result" in value !== "error" in value;
}
function readId(value) {
  return typeof value === "string" || typeof value === "number" && Number.isFinite(value) ? value : void 0;
}
function idKey(value) {
  return `${typeof value}:${String(value)}`;
}
function asRecord2(value) {
  return isRecord8(value) ? value : void 0;
}
function isRecord8(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function firstError(errors) {
  return errors[0] ?? "schema mismatch";
}
function canonicalJson(value) {
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(",")}]`;
  }
  if (value !== null && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}
function safeStringify(value) {
  return JSON.stringify(value) ?? "";
}
registerBuiltInOracles();

// src/oracles/findings.ts
var import_node_crypto3 = require("crypto");
var MAX_EVIDENCE_BYTES = 512;
function createFinding(context, draft2, severityOverride) {
  const rule = context.rules.rules[draft2.ruleId];
  if (rule === void 0) {
    throw new Error(`Spec rules for ${context.rules.revision} do not define '${draft2.ruleId}'.`);
  }
  const id = (0, import_node_crypto3.createHash)("sha256").update(`${draft2.ruleId}\0${draft2.signature}`).digest("hex");
  return {
    id,
    ruleId: draft2.ruleId,
    severity: severityOverride ?? rule.severity,
    title: rule.title,
    message: draft2.message,
    cite: rule.cite,
    occurrences: 1,
    evidence: (draft2.evidence ?? []).map(toEvidenceExcerpt)
  };
}
function deduplicateFindings(findings) {
  const unique = /* @__PURE__ */ new Map();
  for (const finding of findings) {
    const previous = unique.get(finding.id);
    if (previous === void 0) {
      unique.set(finding.id, finding);
      continue;
    }
    const evidence = new Map(
      [...previous.evidence, ...finding.evidence].map((excerpt) => [
        `${excerpt.channel}:${excerpt.encoding}:${excerpt.sha256}`,
        excerpt
      ])
    );
    unique.set(finding.id, {
      ...previous,
      occurrences: previous.occurrences + finding.occurrences,
      evidence: [...evidence.values()]
    });
  }
  return [...unique.values()].sort((left, right) => left.id.localeCompare(right.id));
}
function toEvidenceExcerpt(event) {
  const bytes = event.encoding === "base64" ? Buffer.from(event.data, "base64") : Buffer.from(event.data, "utf8");
  const excerpt = bytes.subarray(0, MAX_EVIDENCE_BYTES);
  const utf8 = excerpt.toString("utf8");
  const encoding = event.encoding === "base64" || !Buffer.from(utf8, "utf8").equals(excerpt) ? "base64" : "utf8";
  return {
    channel: event.channel,
    encoding,
    data: encoding === "base64" ? excerpt.toString("base64") : utf8,
    originalLengthBytes: bytes.length,
    sha256: (0, import_node_crypto3.createHash)("sha256").update(bytes).digest("hex"),
    truncated: bytes.length > excerpt.length,
    ...event.http === void 0 ? {} : { http: event.http }
  };
}

// src/oracles/index.ts
function evaluateOracles(context, selections) {
  const enabledSelections = selections?.filter((selection) => selection.enabled);
  const active = enabledSelections ?? oracleRegistry.names().map((name) => ({ name, enabled: true }));
  const severityOverrides = /* @__PURE__ */ new Map();
  for (const selection of enabledSelections ?? []) {
    for (const [ruleId, severity] of Object.entries(selection.severityOverrides ?? {})) {
      severityOverrides.set(ruleId, severity);
    }
  }
  const findings = active.flatMap(({ name }) => oracleRegistry.get(name).evaluate(context).map((draft2) => createFinding(context, draft2, severityOverrides.get(draft2.ruleId))));
  return deduplicateFindings(findings);
}

// src/core/run.ts
var WIRE_GENERATOR_WEIGHT = 10;
var defaultGeneratorSequence = [
  "schema-valid",
  "schema-mutated",
  "jsonrpc-envelope",
  "raw-json",
  "sequence",
  "tool-args",
  "resources",
  "prompts",
  ...Array.from({ length: WIRE_GENERATOR_WEIGHT }, () => "wire-fault")
];
var profiles = {
  quick: { cases: 18, durationMs: 3e4 },
  standard: { cases: 256, durationMs: 12e4 },
  deep: { cases: 2e3, durationMs: 6e5 }
};
async function runFuzz(options) {
  const baselineIds = options.baselinePath === void 0 ? void 0 : await readBaseline(options.baselinePath);
  const profileName = options.profile ?? "quick";
  const defaults = profiles[profileName];
  const caseLimit = options.cases ?? defaults.cases;
  const durationLimitMs = options.durationMs ?? defaults.durationMs;
  const workers = options.workers ?? 1;
  const confirmations = options.confirmations ?? 2;
  if (!Number.isInteger(caseLimit) || caseLimit < 1 || !Number.isFinite(durationLimitMs) || durationLimitMs < 1 || !Number.isInteger(workers) || workers < 1 || workers > 32 || !Number.isInteger(confirmations) || confirmations < 1 || confirmations > 5) {
    throw new ScenarioError("Run budgets must be positive, and workers must be between 1 and 32.");
  }
  const seed = createRootSeed(options.seed);
  const startedAt = import_node_perf_hooks3.performance.now();
  const diagnostics = [];
  let surface = options.surface;
  if (surface === void 0) {
    try {
      surface = await inspectServer(options.revision, getTargetOptions(options));
    } catch (error) {
      if (!(error instanceof ScenarioError)) {
        throw error;
      }
      diagnostics.push(`Surface discovery failed; running only generators that do not need discovery: ${error.message}`);
      surface = {
        specRevision: options.revision,
        tools: [],
        resources: [],
        prompts: []
      };
    }
  }
  if (surface.specRevision !== options.revision) {
    throw new ScenarioError("Discovered surface revision does not match the selected specification profile.");
  }
  const restartPolicy = options.restartPolicy ?? "per-case";
  if (restartPolicy !== "per-case" && workers !== 1) {
    throw new ScenarioError("Restart policies 'on-failure' and 'never' require workers=1.");
  }
  const target = getTargetOptions(options);
  const transportName = target.transport ?? "stdio";
  const scenarios = generateScenarios(
    options.revision,
    surface,
    seed,
    caseLimit,
    options.generatorSequence ?? defaultGeneratorSequence,
    transportName,
    options.argumentStrategies
  );
  const deadline = startedAt + durationLimitMs;
  const caseResults = Array.from({ length: scenarios.length });
  let nextIndex = 0;
  let corpusEntriesAdded = 0;
  const corpusDirectory = options.corpusDirectory ?? (0, import_node_path2.resolve)(".mcp-wringer", "corpus");
  const adapter = transportRegistry.get(transportName);
  const recordCase = async (index, session) => {
    const generated = scenarios[index];
    if (generated === void 0) {
      return { ...session === void 0 ? {} : { session } };
    }
    const scenario = addHealthChecks(generated, session === void 0);
    assertScenarioSafety(scenario, surface, options.safety);
    const currentSession = session ?? adapter.createSession({ ...target, scenario });
    const result = await currentSession.execute(scenario, { closeAfterScenario: restartPolicy === "per-case" });
    const context = createOracleContext(scenario, result, options.revision);
    const findings2 = evaluateOracles(context, options.oracleSelections);
    caseResults[index] = { scenario, context, findings: findings2 };
    if (await recordNovelScenario(corpusDirectory, scenario, result.trace, seed)) {
      corpusEntriesAdded += 1;
    }
    if (restartPolicy === "per-case") {
      return {};
    }
    const targetExited = result.outcome.exitCode !== null || result.outcome.signal !== null;
    if (restartPolicy === "on-failure" && (findings2.length > 0 || result.outcome.failure !== void 0 || targetExited)) {
      await currentSession.close(true);
      return {};
    }
    if (targetExited) {
      diagnostics.push(`Target exited during case ${scenario.id}; later cases were not run under restartPolicy=${restartPolicy}.`);
      await currentSession.close(true);
      return { stop: true };
    }
    return { session: currentSession };
  };
  const worker = async () => {
    while (true) {
      const index = nextIndex;
      nextIndex += 1;
      if (index >= scenarios.length || import_node_perf_hooks3.performance.now() >= deadline) {
        return;
      }
      await recordCase(index);
    }
  };
  if (restartPolicy === "per-case") {
    await Promise.all(Array.from({ length: Math.min(workers, scenarios.length) }, worker));
  } else {
    let session;
    try {
      for (let index = 0; index < scenarios.length && import_node_perf_hooks3.performance.now() < deadline; index += 1) {
        const outcome = await recordCase(index, session);
        session = outcome.session;
        if (outcome.stop) {
          break;
        }
      }
    } finally {
      if (session !== void 0) {
        await session.close();
      }
    }
  }
  const executed = caseResults.filter((item) => item !== void 0);
  const observedFindings = deduplicateFindings(executed.flatMap((item) => item.findings));
  const findings = [];
  const reproducers = [];
  for (const finding of observedFindings) {
    const origin = executed.find((item) => item.findings.some((candidate) => candidate.id === finding.id));
    if (origin === void 0) {
      continue;
    }
    let confirmationCount = 0;
    for (let attempt = 0; attempt < confirmations; attempt += 1) {
      if (import_node_perf_hooks3.performance.now() >= deadline) {
        break;
      }
      const replay = await runSingleScenario({
        ...target,
        revision: options.revision,
        scenario: origin.scenario,
        surface,
        ...options.env === void 0 ? {} : { env: options.env },
        ...options.inheritEnvironment === void 0 ? {} : { inheritEnvironment: options.inheritEnvironment },
        ...options.safety === void 0 ? {} : { safety: options.safety },
        ...options.timeoutMs === void 0 ? {} : { timeoutMs: options.timeoutMs },
        ...options.oracleSelections === void 0 ? {} : { oracleSelections: options.oracleSelections }
      });
      if (replay.findings.some((candidate) => candidate.id === finding.id)) {
        confirmationCount += 1;
      }
    }
    if (confirmationCount === confirmations) {
      findings.push(finding);
      reproducers.push({ findingId: finding.id, scenario: origin.scenario });
    } else {
      diagnostics.push(
        `Finding ${finding.id} was not reproduced on ${confirmationCount} of ${confirmations} fresh targets and is flaky.`
      );
    }
  }
  const baseline = baselineIds === void 0 ? void 0 : compareBaseline(baselineIds, findings);
  if (baseline !== void 0) {
    for (const id of baseline.newFindingIds) {
      diagnostics.push(`Finding ${id} is new relative to the configured baseline.`);
    }
    for (const id of baseline.staleFindingIds) {
      diagnostics.push(`Baseline finding ${id} is stale because it did not reproduce.`);
    }
  }
  return {
    seed,
    profile: profileName,
    casesRun: executed.length,
    durationMs: Math.max(0, import_node_perf_hooks3.performance.now() - startedAt),
    findings,
    diagnostics,
    corpusEntriesAdded,
    reproducers,
    ...baseline === void 0 ? {} : { baseline }
  };
}
async function readBaseline(baselinePath) {
  let text;
  try {
    text = await (0, import_promises2.readFile)((0, import_node_path2.resolve)(baselinePath), "utf8");
  } catch (error) {
    throw new ScenarioError(
      `Could not read baseline '${baselinePath}': ${error instanceof Error ? error.message : String(error)}`
    );
  }
  let value;
  try {
    value = JSON.parse(text);
  } catch (error) {
    throw new ScenarioError(
      `Baseline '${baselinePath}' is not valid JSON: ${error instanceof Error ? error.message : String(error)}`
    );
  }
  if (!isRecord9(value) || value.formatVersion !== 1 || !Array.isArray(value.findingIds) || !value.findingIds.every((id) => typeof id === "string" && id.length > 0) || new Set(value.findingIds).size !== value.findingIds.length) {
    throw new ScenarioError(
      `Baseline '${baselinePath}' must contain formatVersion 1 and a unique string array named findingIds.`
    );
  }
  return value.findingIds;
}
function compareBaseline(findingIds, findings) {
  const baselineIds = new Set(findingIds);
  const currentIds = new Set(findings.map((finding) => finding.id));
  return {
    newFindingIds: [...currentIds].filter((id) => !baselineIds.has(id)).sort(),
    staleFindingIds: [...baselineIds].filter((id) => !currentIds.has(id)).sort()
  };
}
async function runSingleScenario(options) {
  const scenario = addHealthChecks(options.scenario);
  assertScenarioSafety(scenario, options.surface, options.safety);
  const target = getTargetOptions(options);
  const result = await transportRegistry.get(target.transport ?? "stdio").run({ ...target, scenario });
  const context = createOracleContext(scenario, result, options.revision);
  return { scenario, result, context, findings: evaluateOracles(context, options.oracleSelections) };
}
function addHealthChecks(scenario, includeLifecycle = true) {
  if (scenario.steps.some((step) => step.type === "send" && isRecord9(step.message) && [scenario.id + "-baseline-before", scenario.id + "-liveness", scenario.id + "-baseline-after"].includes(String(step.message.id)))) {
    return scenario;
  }
  const profile = specProfiles.get(scenario.specRevision);
  const lifecycleStepCount = profile.lifecycleSteps(`${scenario.id}-lifecycle`).length;
  const hasDiscoveryBootstrap = scenario.specRevision === "2026-07-28" && scenario.steps[0]?.type === "send" && isRecord9(scenario.steps[0].message) && scenario.steps[0].message.method === "server/discover" && scenario.steps[0].message.id === `${scenario.id}-discover` && scenario.steps[1]?.type === "await-response" && scenario.steps[1].id === scenario.steps[0].message.id;
  const prefixStepCount = lifecycleStepCount + (hasDiscoveryBootstrap ? 2 : 0);
  const prefix = includeLifecycle ? scenario.steps.slice(0, prefixStepCount) : [];
  const existingSteps = scenario.steps.slice(prefixStepCount);
  const beforeId = `${scenario.id}-baseline-before`;
  const livenessId = `${scenario.id}-liveness`;
  const afterId = `${scenario.id}-baseline-after`;
  const closesInput = existingSteps.some((step) => step.type === "transport" && step.operation === "close-stdin");
  const healthSteps = [
    { type: "send", message: profile.request(profile.toolListMethod, beforeId) },
    { type: "await-response", id: beforeId, timeoutMs: 1e3 },
    ...existingSteps
  ];
  if (closesInput) {
    return { ...scenario, steps: [...prefix, ...healthSteps] };
  }
  healthSteps.push(
    { type: "send", message: profile.livenessProbe(livenessId) },
    { type: "await-response", id: livenessId, timeoutMs: 1e3 },
    { type: "send", message: profile.request(profile.toolListMethod, afterId) },
    { type: "await-response", id: afterId, timeoutMs: 1e3 }
  );
  return { ...scenario, steps: [...prefix, ...healthSteps] };
}
function createOracleContext(scenario, result, revision) {
  const profile = specProfiles.get(revision);
  const beforeId = `${scenario.id}-baseline-before`;
  const livenessId = `${scenario.id}-liveness`;
  const afterId = `${scenario.id}-baseline-after`;
  const before = getResultById(result.responses, beforeId);
  const liveness = getResponseById(result.responses, livenessId);
  const after = getResultById(result.responses, afterId);
  return {
    scenario,
    ...result,
    rules: profile.rules,
    ...result.httpExchanges === void 0 ? {} : { httpExchanges: result.httpExchanges },
    ...liveness === void 0 ? {} : {
      livenessProbe: {
        passed: !isErrorResponse(liveness)
      }
    },
    ...before === void 0 || after === void 0 ? {} : { baselineComparison: { before, after } },
    expectedErrors: expectedInvalidRequestErrors(scenario, profile.rules.errorCodes.invalidRequest)
  };
}
function getTargetOptions(options) {
  const common = {
    ...options.env === void 0 ? {} : { env: options.env },
    ...options.inheritEnvironment === void 0 ? {} : { inheritEnvironment: options.inheritEnvironment },
    ...options.timeoutMs === void 0 ? {} : { timeoutMs: options.timeoutMs }
  };
  if (options.transport === "streamable-http") {
    return {
      transport: "streamable-http",
      url: options.url,
      ...options.command === void 0 ? {} : { command: options.command },
      ...options.args === void 0 ? {} : { args: options.args },
      ...options.allowNonLoopback === void 0 ? {} : { allowNonLoopback: options.allowNonLoopback },
      ...common
    };
  }
  return {
    transport: "stdio",
    command: options.command,
    args: options.args,
    ...common
  };
}
function expectedInvalidRequestErrors(scenario, code) {
  const expected = [];
  for (const step of scenario.steps) {
    if (step.type !== "send" || !isRecord9(step.message)) {
      continue;
    }
    const id = step.message.id;
    if (step.message.jsonrpc !== "2.0" && (typeof id === "string" || typeof id === "number")) {
      expected.push({ id, code });
    }
  }
  return expected;
}
function getResultById(responses, id) {
  const response = getResponseById(responses, id);
  if (response === void 0 || !isRecord9(response) || !("result" in response)) {
    return void 0;
  }
  return response.result;
}
function getResponseById(responses, id) {
  return responses.find((response) => isRecord9(response) && response.id === id);
}
function isErrorResponse(value) {
  return isRecord9(value) && "error" in value;
}
function isRecord9(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// src/config/load.ts
var import_promises3 = require("fs/promises");
var import_node_path4 = require("path");
var import__2 = require("ajv/dist/2020.js");

// src/reporters/console.ts
var severityOrder = {
  high: 0,
  medium: 1,
  low: 2,
  info: 3
};
var consoleReporter = {
  render(findings) {
    const ordered = [...findings].sort((left, right) => severityOrder[left.severity] - severityOrder[right.severity] || left.id.localeCompare(right.id));
    const lines = [`mcp-wringer: ${ordered.length} finding${ordered.length === 1 ? "" : "s"}`];
    for (const finding of ordered) {
      lines.push(
        `${finding.severity.toUpperCase()} ${finding.ruleId} ${finding.id}`,
        `  ${finding.message}`,
        `  ${finding.cite}`,
        `  occurrences: ${finding.occurrences}`
      );
    }
    return `${lines.join("\n")}
`;
  }
};

// src/reporters/json.ts
var jsonReporter = {
  render(findings) {
    const ordered = [...findings].sort((left, right) => left.id.localeCompare(right.id));
    return `${JSON.stringify({ formatVersion: 1, findings: ordered }, null, 2)}
`;
  }
};

// src/reporters/junit.ts
var junitReporter = {
  fileExtension: "xml",
  render(findings) {
    const ordered = [...findings].sort((left, right) => left.id.localeCompare(right.id));
    const testCases = ordered.map(
      (finding) => `    <testcase classname="${escapeXml(finding.ruleId)}" name="${escapeXml(finding.id)}"><failure type="${escapeXml(finding.severity)}" message="${escapeXml(finding.title)}">${escapeXml(finding.message)} [${escapeXml(finding.cite)}]</failure></testcase>`
    );
    return [
      '<?xml version="1.0" encoding="UTF-8"?>',
      `<testsuites tests="${ordered.length}" failures="${ordered.length}" errors="0" skipped="0">`,
      `  <testsuite name="mcp-wringer" tests="${ordered.length}" failures="${ordered.length}" errors="0" skipped="0">`,
      ...testCases,
      "  </testsuite>",
      "</testsuites>",
      ""
    ].join("\n");
  }
};
function escapeXml(value) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&apos;");
}

// src/reporters/markdown.ts
var markdownReporter = {
  fileExtension: "md",
  render(findings) {
    const rows = [...findings].sort((left, right) => left.id.localeCompare(right.id)).map(
      (finding) => `| ${escapeCell(finding.severity)} | ${escapeCell(finding.ruleId)} | ${escapeCell(finding.title)} | ${escapeCell(finding.message)} | ${escapeCell(finding.cite)} |`
    );
    return [
      "# MCP Wringer findings",
      "",
      `Confirmed findings: ${findings.length}`,
      "",
      "| Severity | Rule | Title | Finding | Specification citation |",
      "|---|---|---|---|---|",
      ...rows,
      ""
    ].join("\n");
  }
};
function escapeCell(value) {
  return value.replaceAll("|", "\\|").replaceAll("\r", " ").replaceAll("\n", " ");
}

// src/reporters/registry.ts
var reporterRegistry = new ExtensionRegistry();

// src/reporters/sarif.ts
var severityLevels = {
  high: "error",
  medium: "warning",
  low: "warning",
  info: "note"
};
var sarifReporter = {
  fileExtension: "sarif",
  render(findings) {
    const rules = [...new Map(
      findings.map((finding) => [finding.ruleId, {
        id: finding.ruleId,
        name: finding.title,
        shortDescription: { text: finding.title },
        fullDescription: { text: finding.message }
      }])
    ).values()].sort((left, right) => left.id.localeCompare(right.id));
    const ruleIndices = new Map(rules.map((rule, index) => [rule.id, index]));
    const results = [...findings].sort((left, right) => left.id.localeCompare(right.id)).map((finding) => ({
      ruleId: finding.ruleId,
      ruleIndex: ruleIndices.get(finding.ruleId),
      level: severityLevels[finding.severity],
      message: { text: finding.message },
      partialFingerprints: { "mcp-wringer/finding-id": finding.id }
    }));
    return `${JSON.stringify({
      $schema: "https://json.schemastore.org/sarif-2.1.0.json",
      version: "2.1.0",
      runs: [{
        tool: {
          driver: {
            name: "@stackql/mcp-wringer",
            version: "0.1.0",
            rules
          }
        },
        results
      }]
    }, null, 2)}
`;
  }
};

// src/reporters/index.ts
reporterRegistry.register("console", consoleReporter);
reporterRegistry.register("json", jsonReporter);
reporterRegistry.register("junit", junitReporter);
reporterRegistry.register("markdown", markdownReporter);
reporterRegistry.register("sarif", sarifReporter);

// src/plugin/loader.ts
var import_node_path3 = require("path");
var import_node_url = require("url");

// src/config/profiles.ts
var profileRegistry = new ExtensionRegistry();
profileRegistry.register("quick", { cases: 18, durationMs: 3e4 });
profileRegistry.register("standard", { cases: 256, durationMs: 12e4 });
profileRegistry.register("deep", { cases: 2e3, durationMs: 6e5 });

// src/plugin/index.ts
var WRINGER_PLUGIN_API_VERSION = "0.1";
var pluginApi = {
  apiVersion: WRINGER_PLUGIN_API_VERSION,
  registerGenerator(name, generator) {
    generatorRegistry.register(name, generator);
  },
  registerArgumentStrategy(name, strategy) {
    argumentStrategyRegistry.register(name, strategy);
  },
  registerOracle(name, oracle) {
    oracleRegistry.register(name, oracle);
  },
  registerReporter(name, reporter) {
    reporterRegistry.register(name, reporter);
  },
  registerProfile(name, profile) {
    profileRegistry.register(name, profile);
  }
};

// src/plugin/loader.ts
var loadedPlugins = /* @__PURE__ */ new Set();
async function loadConfiguredPlugins(specifiers, baseDirectory) {
  for (const specifier of specifiers) {
    const moduleUrl = getPluginUrl(specifier, baseDirectory);
    if (loadedPlugins.has(moduleUrl)) {
      continue;
    }
    let loaded;
    try {
      loaded = await import(moduleUrl);
    } catch (error) {
      throw new WringerError(
        "PLUGIN_ERROR",
        `Could not load configured plugin '${specifier}': ${error instanceof Error ? error.message : String(error)}`,
        { cause: error }
      );
    }
    const plugin = getDefaultPlugin(loaded, specifier);
    if (plugin.apiVersion !== WRINGER_PLUGIN_API_VERSION) {
      throw new WringerError(
        "PLUGIN_ERROR",
        `Plugin '${plugin.name}' requires API ${plugin.apiVersion}; this version supports ${WRINGER_PLUGIN_API_VERSION}.`
      );
    }
    try {
      plugin.register(pluginApi);
    } catch (error) {
      throw new WringerError(
        "PLUGIN_ERROR",
        `Plugin '${plugin.name}' failed while registering: ${error instanceof Error ? error.message : String(error)}`,
        { cause: error }
      );
    }
    loadedPlugins.add(moduleUrl);
  }
}
function getPluginUrl(specifier, baseDirectory) {
  if (specifier.startsWith("file:")) {
    return new URL(specifier).href;
  }
  if (specifier.startsWith(".") || (0, import_node_path3.isAbsolute)(specifier) || specifier.includes("\\")) {
    return (0, import_node_url.pathToFileURL)((0, import_node_path3.resolve)(baseDirectory, specifier)).href;
  }
  return specifier;
}
function getDefaultPlugin(value, specifier) {
  if (!isRecord10(value) || !("default" in value) || !isRecord10(value.default)) {
    throw new WringerError("PLUGIN_ERROR", `Plugin '${specifier}' must provide a default plugin object.`);
  }
  const candidate = value.default;
  if (!isWringerPlugin(candidate)) {
    throw new WringerError("PLUGIN_ERROR", `Plugin '${specifier}' has an invalid default export.`);
  }
  return candidate;
}
function isWringerPlugin(value) {
  return value.apiVersion === WRINGER_PLUGIN_API_VERSION && typeof value.name === "string" && value.name.length > 0 && typeof value.register === "function";
}
function isRecord10(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// src/config/definition.ts
var severitySchema = {
  type: "string",
  enum: ["high", "medium", "low", "info"]
};
var optionsSchema = {
  type: "object",
  additionalProperties: true
};
var extensionSelection = {
  type: "object",
  additionalProperties: false,
  properties: {
    name: { type: "string", minLength: 1 },
    enabled: { type: "boolean", default: true },
    options: { ...optionsSchema, default: {} }
  },
  required: ["name", "enabled", "options"]
};
var generatorSelection = {
  ...extensionSelection,
  properties: {
    ...extensionSelection.properties,
    weight: { type: "integer", minimum: 1, default: 1 }
  },
  required: [...extensionSelection.required, "weight"]
};
var oracleSelection = {
  ...extensionSelection,
  properties: {
    ...extensionSelection.properties,
    severityOverrides: {
      type: "object",
      additionalProperties: severitySchema,
      default: {}
    }
  },
  required: [...extensionSelection.required, "severityOverrides"]
};
var commonProperties = {
  specRevision: {
    type: "string",
    enum: ["2025-11-25", "2026-07-28"],
    default: "2025-11-25",
    description: "MCP specification revision used for lifecycle and response validation."
  },
  seed: {
    oneOf: [{ type: "integer" }, { type: "string" }],
    description: "Root seed. Omit to generate a seed at run time."
  },
  cases: {
    type: "integer",
    minimum: 1,
    default: 18,
    description: "Maximum scenarios to execute."
  },
  durationMs: {
    type: "integer",
    minimum: 1,
    default: 3e4,
    description: "Maximum run duration in milliseconds."
  },
  workers: {
    type: "integer",
    minimum: 1,
    maximum: 32,
    default: 1,
    description: "Number of independent target workers."
  },
  restartPolicy: {
    type: "string",
    enum: ["per-case", "on-failure", "never"],
    default: "per-case",
    description: "When to restart a spawned target between scenarios."
  },
  timeoutMs: {
    type: "integer",
    minimum: 1,
    default: 5e3,
    description: "Default per-request and target startup timeout in milliseconds."
  },
  confirmations: {
    type: "integer",
    minimum: 1,
    maximum: 5,
    default: 2,
    description: "Fresh-target replays required to confirm a finding."
  },
  transport: {
    type: "string",
    enum: ["stdio", "streamable-http"],
    default: "stdio",
    description: "Transport used to communicate with the target."
  },
  url: {
    type: "string",
    pattern: "^https?://",
    description: "Streamable HTTP endpoint. Non-loopback attach requires explicit authorization."
  },
  command: {
    type: "string",
    minLength: 1,
    description: "Executable used to start a spawned target."
  },
  args: {
    type: "array",
    items: { type: "string" },
    default: [],
    description: "Argument array for the spawned target command."
  },
  env: {
    type: "object",
    additionalProperties: { type: "string" },
    default: {},
    description: "Environment variables passed to the spawned target."
  },
  inheritEnvironment: {
    type: "boolean",
    default: false,
    description: "Pass the caller's environment to the target in addition to configured values."
  },
  allowNonLoopback: {
    type: "boolean",
    default: false,
    description: "Authorize attach mode to connect to a non-loopback HTTP address."
  },
  allowTools: {
    type: "array",
    items: { type: "string", minLength: 1 },
    uniqueItems: true,
    default: [],
    description: "Exact tool names permitted when they are not annotated read-only."
  },
  argumentStrategies: {
    type: "array",
    items: extensionSelection,
    default: [],
    description: "Argument strategy registry selections. Empty enables all registered strategies."
  },
  failOn: {
    ...severitySchema,
    default: "high",
    description: "Lowest finding severity that makes the CLI exit with code 1."
  },
  reportDirectory: {
    type: "string",
    minLength: 1,
    default: ".mcp-wringer/reports",
    description: "Directory for run reports and reproducer files."
  },
  corpusDirectory: {
    type: "string",
    minLength: 1,
    default: ".mcp-wringer/corpus",
    description: "Directory for response-novelty corpus entries."
  },
  baselinePath: {
    type: "string",
    minLength: 1,
    description: "JSON file containing finding IDs to use as the baseline."
  },
  plugins: {
    type: "array",
    items: { type: "string", minLength: 1 },
    uniqueItems: true,
    default: [],
    description: "Explicit plugin module paths or package specifiers to load."
  },
  generators: {
    type: "array",
    items: generatorSelection,
    default: [],
    description: "Generator registry selections. Empty uses the built-in default schedule."
  },
  oracles: {
    type: "array",
    items: oracleSelection,
    default: [],
    description: "Oracle registry selections. Empty enables every registered oracle."
  },
  reporters: {
    type: "array",
    items: extensionSelection,
    default: [
      { name: "console", enabled: true, options: {} },
      { name: "json", enabled: true, options: {} }
    ],
    description: "Report formats selected by registry name."
  }
};
var configDefinition = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "https://raw.githubusercontent.com/stackql/mcp-wringer/main/config.schema.json",
  title: "MCP Wringer configuration",
  type: "object",
  additionalProperties: false,
  properties: {
    $schema: {
      type: "string",
      default: "https://raw.githubusercontent.com/stackql/mcp-wringer/main/config.schema.json",
      description: "JSON Schema used by editors to validate this file."
    },
    profile: {
      type: "string",
      minLength: 1,
      default: "quick",
      description: "Named partial configuration profile."
    },
    profiles: {
      type: "object",
      default: {},
      additionalProperties: { $ref: "#/$defs/profile" },
      description: "User-defined named partial configuration profiles."
    },
    ...commonProperties
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
    "reporters"
  ],
  $defs: {
    profile: {
      type: "object",
      additionalProperties: false,
      properties: commonProperties
    }
  }
};

// src/config/load.ts
var defaultConfigPath = "mcp-wringer.config.json";
async function loadConfiguration(options = {}) {
  const environment = options.environment ?? process.env;
  const envConfigPath = environment.MCP_WRINGER_CONFIG;
  const configPath = options.configPath ?? envConfigPath;
  const path = (0, import_node_path4.resolve)(configPath ?? defaultConfigPath);
  const fileConfig = await readConfigFile(path, configPath !== void 0);
  validatePartialConfig(fileConfig, path);
  const environmentConfig = readEnvironmentConfig(environment);
  const defaults = createDefaultConfig();
  const selection = mergeConfig(defaults, fileConfig, environmentConfig, options.overrides ?? {});
  const pluginSpecifiers = selection.plugins;
  await loadConfiguredPlugins(pluginSpecifiers, configPath === void 0 ? process.cwd() : (0, import_node_path4.dirname)(path));
  const selectedProfile = selection.profile;
  const fileProfiles = isRecord11(fileConfig.profiles) ? fileConfig.profiles : {};
  const profile = fileProfiles[selectedProfile] ?? getRegisteredProfile(selectedProfile);
  const config = mergeConfig(defaults, profile, fileConfig, environmentConfig, options.overrides ?? {});
  normalizeExtensionDefaults(config);
  validateResolvedConfig(config);
  validateExtensionNames(config);
  const origins = {};
  markOrigins(defaults, "", "defaults", origins);
  markOrigins(profile, "", `profile:${selectedProfile}`, origins);
  markOrigins(fileConfig, "", "config file", origins);
  markOrigins(environmentConfig, "", "environment", origins);
  markOrigins(options.overrides ?? {}, "", "command line", origins);
  return {
    config,
    origins,
    ...fileConfigPathWasRead(configPath, environment, path) ? { path } : {}
  };
}
function fileConfigPathWasRead(configPath, environment, resolvedPath) {
  return configPath !== void 0 || environment.MCP_WRINGER_CONFIG !== void 0 || resolvedPath === (0, import_node_path4.resolve)(defaultConfigPath);
}
async function readConfigFile(path, required) {
  let contents;
  try {
    contents = await (0, import_promises3.readFile)(path, "utf8");
  } catch (error) {
    if (!required && isNodeError3(error) && error.code === "ENOENT") {
      return {};
    }
    throw new WringerError(
      "CONFIG_ERROR",
      `Could not read configuration file '${path}': ${error instanceof Error ? error.message : String(error)}`,
      { cause: error }
    );
  }
  let value;
  try {
    value = JSON.parse(contents);
  } catch (error) {
    throw new WringerError(
      "CONFIG_ERROR",
      `Configuration file '${path}' is not valid JSON: ${error instanceof Error ? error.message : String(error)}`,
      { cause: error }
    );
  }
  if (!isRecord11(value)) {
    throw new WringerError("CONFIG_ERROR", `Configuration file '${path}' must contain a JSON object.`);
  }
  return value;
}
function createDefaultConfig() {
  const validator = new import__2.Ajv2020({ allErrors: true, useDefaults: true, strict: false }).compile(configDefinition);
  const value = {};
  if (!validator(value)) {
    throw new WringerError("CONFIG_ERROR", formatValidationErrors(validator.errors, value, "built-in defaults"));
  }
  return value;
}
function validatePartialConfig(value, path) {
  const withDefaults = mergeConfig(createDefaultConfig(), value);
  const validator = new import__2.Ajv2020({ allErrors: true, useDefaults: true, strict: false }).compile(configDefinition);
  if (!validator(withDefaults)) {
    throw new WringerError("CONFIG_ERROR", formatValidationErrors(validator.errors, value, path));
  }
}
function validateResolvedConfig(value) {
  const validator = new import__2.Ajv2020({ allErrors: true, strict: false }).compile(configDefinition);
  if (!validator(value)) {
    throw new WringerError("CONFIG_ERROR", formatValidationErrors(validator.errors, value, "resolved configuration"));
  }
}
function readEnvironmentConfig(environment) {
  const value = {};
  for (const key of Object.keys(configDefinition.properties)) {
    if (key === "$schema" || key === "profiles") {
      continue;
    }
    const name = `MCP_WRINGER_${toEnvironmentName(key)}`;
    const raw = environment[name];
    if (raw === void 0) {
      continue;
    }
    value[key] = parseEnvironmentValue(raw, key);
  }
  return value;
}
function parseEnvironmentValue(value, key) {
  if (["seed"].includes(key)) {
    const numeric = Number(value);
    return value.trim() !== "" && Number.isSafeInteger(numeric) ? numeric : value;
  }
  if (["cases", "durationMs", "workers", "timeoutMs", "confirmations"].includes(key)) {
    if (!/^[1-9]\d*$/u.test(value) || !Number.isSafeInteger(Number(value))) {
      throw new WringerError("CONFIG_ERROR", `Environment variable MCP_WRINGER_${toEnvironmentName(key)} must be a positive integer.`);
    }
    return Number(value);
  }
  if (["inheritEnvironment", "allowNonLoopback"].includes(key)) {
    if (value !== "true" && value !== "false") {
      throw new WringerError("CONFIG_ERROR", `Environment variable MCP_WRINGER_${toEnvironmentName(key)} must be true or false.`);
    }
    return value === "true";
  }
  if (["args", "env", "allowTools", "argumentStrategies", "plugins", "generators", "oracles", "reporters", "profiles"].includes(key)) {
    try {
      return JSON.parse(value);
    } catch (error) {
      throw new WringerError(
        "CONFIG_ERROR",
        `Environment variable MCP_WRINGER_${toEnvironmentName(key)} must contain JSON: ${error instanceof Error ? error.message : String(error)}`,
        { cause: error }
      );
    }
  }
  return value;
}
function toEnvironmentName(key) {
  return key.replace(/[A-Z]/gu, (letter) => `_${letter}`).toUpperCase();
}
function mergeConfig(...layers) {
  const merged = {};
  for (const layer of layers) {
    mergeObject(merged, layer);
  }
  return merged;
}
function mergeObject(target, source) {
  for (const [key, value] of Object.entries(source)) {
    if (isRecord11(value) && isRecord11(target[key])) {
      mergeObject(target[key], value);
    } else if (isRecord11(value)) {
      const nested = {};
      mergeObject(nested, value);
      target[key] = nested;
    } else {
      target[key] = value;
    }
  }
}
function normalizeExtensionDefaults(config) {
  config.argumentStrategies = config.argumentStrategies.map((selection) => ({
    ...selection,
    enabled: selection.enabled ?? true,
    options: selection.options ?? {}
  }));
  config.generators = config.generators.map((selection) => ({
    ...selection,
    enabled: selection.enabled ?? true,
    weight: selection.weight ?? 1,
    options: selection.options ?? {}
  }));
  config.oracles = config.oracles.map((selection) => ({
    ...selection,
    enabled: selection.enabled ?? true,
    options: selection.options ?? {},
    severityOverrides: selection.severityOverrides ?? {}
  }));
  config.reporters = config.reporters.map((selection) => ({
    ...selection,
    enabled: selection.enabled ?? true,
    options: selection.options ?? {}
  }));
}
function validateExtensionNames(config) {
  for (const selection of config.argumentStrategies) {
    assertRegistered("argument strategy", selection.name, argumentStrategyRegistry.names());
  }
  if (config.argumentStrategies.length > 0 && !config.argumentStrategies.some((selection) => selection.enabled)) {
    throw new WringerError("CONFIG_ERROR", "At least one argument strategy must be enabled.");
  }
  for (const selection of config.generators) {
    assertRegistered("generator", selection.name, generatorRegistry.names());
  }
  for (const selection of config.oracles) {
    assertRegistered("oracle", selection.name, oracleRegistry.names());
    const ruleNames = Object.keys(specProfiles.get(config.specRevision).rules.rules);
    for (const ruleId of Object.keys(selection.severityOverrides)) {
      if (!ruleNames.includes(ruleId)) {
        const suggestion = nearestName(ruleId, ruleNames);
        throw new WringerError(
          "CONFIG_ERROR",
          `Unknown oracle rule '${ruleId}'.${suggestion === void 0 ? "" : ` Did you mean '${suggestion}'?`}`
        );
      }
    }
  }
  for (const selection of config.reporters) {
    assertRegistered("reporter", selection.name, reporterRegistry.names());
  }
  const enabledGenerators = config.generators.filter((selection) => selection.enabled);
  if (config.generators.length > 0 && enabledGenerators.length === 0) {
    throw new WringerError("CONFIG_ERROR", "At least one generator must be enabled.");
  }
  if (!config.reporters.some((selection) => selection.enabled)) {
    throw new WringerError("CONFIG_ERROR", "At least one reporter must be enabled.");
  }
}
function assertRegistered(kind, name, available) {
  if (available.includes(name)) {
    return;
  }
  const suggestion = nearestName(name, available);
  throw new WringerError(
    "CONFIG_ERROR",
    `Unknown ${kind} '${name}'.${suggestion === void 0 ? "" : ` Did you mean '${suggestion}'?`}`
  );
}
function getRegisteredProfile(name) {
  if (profileRegistry.names().includes(name)) {
    return profileRegistry.get(name);
  }
  const suggestion = nearestName(name, profileRegistry.names());
  throw new WringerError(
    "CONFIG_ERROR",
    `Unknown profile '${name}'.${suggestion === void 0 ? "" : ` Did you mean '${suggestion}'?`}`
  );
}
function nearestName(value, options) {
  const ranked = options.map((option) => ({ option, distance: editDistance(value.toLowerCase(), option.toLowerCase()) })).sort((left, right) => left.distance - right.distance || left.option.localeCompare(right.option));
  const best = ranked[0];
  return best !== void 0 && best.distance <= Math.max(2, Math.ceil(value.length / 3)) ? best.option : void 0;
}
function editDistance(left, right) {
  const row = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    let previous = row[0] ?? 0;
    row[0] = leftIndex;
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const current = row[rightIndex] ?? 0;
      row[rightIndex] = Math.min(
        current + 1,
        (row[rightIndex - 1] ?? 0) + 1,
        previous + (left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1)
      );
      previous = current;
    }
  }
  return row[right.length] ?? 0;
}
function markOrigins(value, prefix, origin, origins) {
  if (isRecord11(value)) {
    const entries = Object.entries(value);
    if (entries.length === 0 && prefix.length > 0) {
      origins[prefix] = origin;
    }
    for (const [key, child] of entries) {
      markOrigins(child, prefix.length === 0 ? key : `${prefix}.${key}`, origin, origins);
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((child, index) => markOrigins(child, `${prefix}.${index}`, origin, origins));
    if (value.length === 0) {
      origins[prefix] = origin;
    }
    return;
  }
  origins[prefix] = origin;
}
function formatValidationErrors(errors, value, label) {
  const error = errors?.[0];
  if (error === void 0) {
    return `Invalid ${label}.`;
  }
  if (error.keyword === "additionalProperties" && isRecord11(value)) {
    const unknown = error.params?.additionalProperty;
    if (typeof unknown === "string") {
      const suggestion = nearestName(unknown, Object.keys(configDefinition.properties));
      return `Unknown configuration key '${unknown}'.${suggestion === void 0 ? "" : ` Did you mean '${suggestion}'?`}`;
    }
  }
  const path = error.instancePath ?? "";
  return `Invalid ${label}${path.length === 0 ? "" : ` at ${path}`}: ${error.message ?? "validation failed"}.`;
}
function isRecord11(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function isNodeError3(error) {
  return error instanceof Error && "code" in error;
}

// src/reporters/run.ts
var import_promises5 = require("fs/promises");
var import_node_path5 = require("path");

// src/core/reproducer.ts
var import_promises4 = require("fs/promises");

// src/core/scenario.ts
var BASE64_PATTERN = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
function validateScenario(value) {
  if (!isRecord12(value) || value.formatVersion !== 1 || typeof value.id !== "string") {
    throw new ScenarioError("Scenario must have formatVersion 1 and a string id.");
  }
  assertOnlyKeys(value, ["formatVersion", "id", "specRevision", "description", "steps"], "Scenario");
  if (value.id.length === 0 || value.description !== void 0 && typeof value.description !== "string") {
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
function validateReproducer(value) {
  if (!isRecord12(value) || value.formatVersion !== 1 || !isSpecRevision(value.specRevision)) {
    throw new ScenarioError("Reproducer must have formatVersion 1 and a supported specRevision.");
  }
  assertOnlyKeys(value, ["formatVersion", "specRevision", "seed", "target", "scenario"], "Reproducer");
  if (value.seed !== void 0 && (typeof value.seed !== "number" || !Number.isInteger(value.seed) || value.seed < 0 || value.seed > 4294967295)) {
    throw new ScenarioError("Reproducer seed must be an unsigned 32-bit integer when present.");
  }
  if (!isRecord12(value.target)) {
    throw new ScenarioError("Reproducer target must be an object.");
  }
  const target = value.target;
  const isHttp = target.transport === "streamable-http";
  const isStdio = target.transport === "stdio" || target.transport === void 0;
  if (!isHttp && !isStdio || isHttp && (typeof target.url !== "string" || !isHttpUrl(target.url) || target.command !== void 0 && (typeof target.command !== "string" || target.command.length === 0) || target.args !== void 0 && (!Array.isArray(target.args) || !target.args.every((arg) => typeof arg === "string")) || target.command === void 0 !== (target.args === void 0)) || isStdio && (typeof target.command !== "string" || target.command.length === 0 || !Array.isArray(target.args) || !target.args.every((arg) => typeof arg === "string"))) {
    throw new ScenarioError("Reproducer target must contain a valid stdio command or HTTP URL.");
  }
  assertOnlyKeys(
    target,
    isHttp ? ["transport", "url", "command", "args", "environmentNames"] : ["transport", "command", "args", "environmentNames"],
    "Reproducer target"
  );
  if (!Array.isArray(target.environmentNames) || !target.environmentNames.every((name) => typeof name === "string") || new Set(target.environmentNames).size !== target.environmentNames.length) {
    throw new ScenarioError("Reproducer target environmentNames must contain unique strings.");
  }
  validateScenario(value.scenario);
  if (value.scenario.specRevision !== value.specRevision) {
    throw new ScenarioError("Reproducer and scenario specRevision values must match.");
  }
}
function validateStep(value, index) {
  if (!isRecord12(value) || typeof value.type !== "string") {
    throw new ScenarioError(`Scenario step ${index} must be an object with a type.`);
  }
  switch (value.type) {
    case "send":
      assertOnlyKeys(value, ["type", "message", "wire"], `Scenario step ${index}`);
      if (!("message" in value) || !isJsonValue3(value.message)) {
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
      if (value.id !== void 0 && typeof value.id !== "string" && typeof value.id !== "number") {
        throw new ScenarioError(`Scenario step ${index} has an invalid response id.`);
      }
      if (value.timeoutMs !== void 0 && !isPositiveNumber(value.timeoutMs)) {
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
function validateWire(value, index) {
  if (value === void 0) {
    return;
  }
  if (!isRecord12(value) || value.transport !== "stdio" && value.transport !== "streamable-http") {
    throw new ScenarioError(`Scenario step ${index} has an invalid wire descriptor.`);
  }
  if (value.transport === "stdio") {
    assertOnlyKeys(value, ["transport", "chunks", "delayMs"], `Scenario step ${index} wire descriptor`);
    if (value.chunks !== void 0 && (!Array.isArray(value.chunks) || !value.chunks.every((chunk) => Number.isInteger(chunk) && chunk > 0))) {
      throw new ScenarioError(`Scenario step ${index} stdio chunks must be positive integers.`);
    }
    if (value.delayMs !== void 0 && (typeof value.delayMs !== "number" || !Number.isFinite(value.delayMs) || value.delayMs < 0)) {
      throw new ScenarioError(`Scenario step ${index} stdio delayMs must not be negative.`);
    }
    return;
  }
  assertOnlyKeys(value, ["transport", "fault", "options"], `Scenario step ${index} wire descriptor`);
  if (typeof value.fault !== "string" || value.fault.length === 0) {
    throw new ScenarioError(`Scenario step ${index} HTTP wire descriptors require a fault name.`);
  }
  if (value.options !== void 0 && (!isRecord12(value.options) || !isJsonValue3(value.options))) {
    throw new ScenarioError(`Scenario step ${index} HTTP wire options must be a JSON object.`);
  }
}
function isSpecRevision(value) {
  return value === "2025-11-25" || value === "2026-07-28";
}
function isHttpUrl(value) {
  try {
    const url = new URL(value);
    return (url.protocol === "http:" || url.protocol === "https:") && url.username === "" && url.password === "";
  } catch {
    return false;
  }
}
function isPositiveNumber(value) {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}
function isRecord12(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function isJsonValue3(value) {
  if (value === null || typeof value === "string" || typeof value === "boolean") {
    return true;
  }
  if (typeof value === "number") {
    return Number.isFinite(value);
  }
  if (Array.isArray(value)) {
    return value.every(isJsonValue3);
  }
  if (isRecord12(value)) {
    return Object.values(value).every(isJsonValue3);
  }
  return false;
}
function assertOnlyKeys(value, allowed, label) {
  const unexpected = Object.keys(value).filter((key) => !allowed.includes(key));
  if (unexpected.length > 0) {
    throw new ScenarioError(`${label} contains unsupported field(s): ${unexpected.join(", ")}.`);
  }
}

// src/core/reproducer.ts
async function saveReproducer(path, reproducer) {
  validateReproducer(reproducer);
  await (0, import_promises4.writeFile)(path, `${JSON.stringify(reproducer, null, 2)}
`, "utf8");
}
function createReproducer(scenario, target, seed) {
  const environmentNames = [...new Set(target.environmentNames ?? [])].sort();
  const descriptor = "transport" in target && target.transport === "streamable-http" ? {
    transport: "streamable-http",
    url: target.url,
    ...target.command === void 0 ? {} : { command: target.command },
    ...target.args === void 0 ? {} : { args: [...target.args] },
    environmentNames
  } : {
    transport: "stdio",
    command: target.command,
    args: [...target.args],
    environmentNames
  };
  return {
    formatVersion: 1,
    specRevision: scenario.specRevision,
    ...seed === void 0 ? {} : { seed },
    target: descriptor,
    scenario
  };
}

// src/reporters/run.ts
async function writeRunReports(options) {
  const { directory, run } = options;
  const reproducerDirectory = (0, import_node_path5.join)(directory, "reproducers");
  await (0, import_promises5.mkdir)(reproducerDirectory, { recursive: true });
  const findingsPath = (0, import_node_path5.join)(directory, "findings.json");
  const metadataPath = (0, import_node_path5.join)(directory, "run-metadata.json");
  const findingsDocument = {
    formatVersion: 1,
    seed: run.seed,
    findings: sortFindings(run.findings)
  };
  const metadata = {
    formatVersion: 1,
    seed: run.seed,
    profile: run.profile,
    casesRun: run.casesRun,
    durationMs: run.durationMs,
    corpusEntriesAdded: run.corpusEntriesAdded,
    diagnostics: run.diagnostics,
    ...run.baseline === void 0 ? {} : { baseline: run.baseline }
  };
  await (0, import_promises5.writeFile)(metadataPath, `${JSON.stringify(metadata, null, 2)}
`, "utf8");
  const paths = [];
  const selections = options.reporters ?? [{ name: "json", enabled: true, options: {} }];
  if (selections.some((selection) => selection.enabled && selection.name === "json")) {
    await (0, import_promises5.writeFile)(findingsPath, `${JSON.stringify(findingsDocument, null, 2)}
`, "utf8");
    paths.push(findingsPath);
  }
  paths.push(metadataPath);
  for (const selection of selections) {
    if (!selection.enabled || selection.name === "console" || selection.name === "json") {
      continue;
    }
    const reporter = reporterRegistry.get(selection.name);
    const extension = reporter.fileExtension ?? "txt";
    const path = (0, import_node_path5.join)(directory, `${selection.name}.${extension}`);
    await (0, import_promises5.writeFile)(path, reporter.render(run.findings, selection.options), "utf8");
    paths.push(path);
  }
  const target = {
    ...options.target,
    environmentNames: [...new Set(options.environmentNames)].sort()
  };
  for (const item of run.reproducers) {
    const reproducer = createReproducer(item.scenario, target, run.seed);
    const path = (0, import_node_path5.join)(reproducerDirectory, `${item.findingId}.repro.json`);
    await saveReproducer(path, reproducer);
    paths.push(path);
  }
  return paths;
}
function sortFindings(findings) {
  return [...findings].sort((left, right) => left.id.localeCompare(right.id));
}

// src/action/index.ts
var severities = ["high", "medium", "low", "info"];
async function main() {
  const overrides = {};
  const configPath = input("config_path");
  const profile = input("profile");
  const seedInput = input("seed");
  const failOn = input("fail_on");
  const reportDirectory = input("report_directory");
  const command = input("command");
  const argsInput = input("args");
  const url = input("url");
  const args = argsInput.length === 0 ? [] : parseStringArray(argsInput, "args");
  if (profile.length > 0) {
    overrides.profile = profile;
  }
  if (seedInput.length > 0) {
    overrides.seed = seedInput;
  }
  if (failOn.length > 0) {
    if (!severities.includes(failOn)) {
      throw new WringerError("USAGE_ERROR", "The fail_on input must be high, medium, low, or info.");
    }
    overrides.failOn = failOn;
  }
  if (reportDirectory.length > 0) {
    overrides.reportDirectory = reportDirectory;
  }
  if (command.length > 0) {
    overrides.command = command;
    if (argsInput.length > 0) {
      overrides.args = args;
    }
  } else if (argsInput.length > 0) {
    overrides.args = args;
  }
  if (url.length > 0) {
    overrides.transport = "streamable-http";
    overrides.url = url;
  }
  if (input("allow_non_loopback") === "true") {
    overrides.allowNonLoopback = true;
  }
  const loaded = await loadConfiguration({
    ...configPath.length === 0 ? {} : { configPath },
    overrides
  });
  const config = loaded.config;
  const target = getTarget(config, parseEnvironment(input("env")));
  const seed = createRootSeed(config.seed);
  process.stderr.write(`Seed: ${seed}
`);
  const reporters = ensureActionReporters(config.reporters);
  const result = await runFuzz({
    ...target,
    revision: config.specRevision,
    seed,
    profile: config.profile,
    cases: config.cases,
    durationMs: config.durationMs,
    workers: config.workers,
    restartPolicy: config.restartPolicy,
    timeoutMs: config.timeoutMs,
    confirmations: config.confirmations,
    env: target.env ?? {},
    inheritEnvironment: config.inheritEnvironment,
    safety: { allowTools: config.allowTools },
    corpusDirectory: config.corpusDirectory,
    ...config.baselinePath === void 0 ? {} : { baselinePath: config.baselinePath },
    ...config.generators.length === 0 ? {} : {
      generatorSequence: config.generators.filter((selection) => selection.enabled).flatMap((selection) => Array.from({ length: selection.weight }, () => selection.name))
    },
    ...config.argumentStrategies.length === 0 ? {} : { argumentStrategies: config.argumentStrategies },
    ...config.oracles.length === 0 ? {} : { oracleSelections: config.oracles }
  });
  const reportDirectoryPath = (0, import_node_path6.resolve)(config.reportDirectory);
  const environmentNames = [
    .../* @__PURE__ */ new Set([
      ...Object.keys(target.env ?? {}),
      ...config.inheritEnvironment ? Object.keys(process.env) : []
    ])
  ].sort();
  await writeRunReports({
    directory: reportDirectoryPath,
    run: result,
    target: toReproducerTarget(target),
    environmentNames,
    reporters
  });
  const summaryPath = process.env.GITHUB_STEP_SUMMARY;
  if (summaryPath === void 0 || summaryPath.length === 0) {
    throw new WringerError("ACTION_ERROR", "GITHUB_STEP_SUMMARY is not set.");
  }
  await (0, import_promises6.appendFile)(summaryPath, await (0, import_promises6.readFile)((0, import_node_path6.join)(reportDirectoryPath, "markdown.md"), "utf8"), "utf8");
  const counts = { high: 0, medium: 0, low: 0, info: 0 };
  for (const finding of result.findings) {
    counts[finding.severity] += 1;
  }
  for (const [name, value] of Object.entries({
    finding_count: String(result.findings.length),
    high_count: String(counts.high),
    medium_count: String(counts.medium),
    low_count: String(counts.low),
    info_count: String(counts.info),
    sarif_path: (0, import_node_path6.join)(reportDirectoryPath, "sarif.sarif"),
    report_directory: reportDirectoryPath,
    seed: String(result.seed)
  })) {
    await setOutput(name, value);
  }
  for (const diagnostic of result.diagnostics) {
    process.stderr.write(`Diagnostic: ${diagnostic}
`);
  }
  const threshold = config.failOn;
  const hasFailingFinding = result.findings.some((finding) => severities.indexOf(finding.severity) <= severities.indexOf(threshold));
  const hasBaselineMismatch = result.baseline !== void 0 && (result.baseline.newFindingIds.length > 0 || result.baseline.staleFindingIds.length > 0);
  if (hasFailingFinding || hasBaselineMismatch) {
    process.exitCode = 1;
  }
}
function getTarget(config, inputEnvironment) {
  const env = { ...config.env, ...inputEnvironment };
  const common = {
    env,
    inheritEnvironment: config.inheritEnvironment,
    timeoutMs: config.timeoutMs
  };
  if (config.transport === "streamable-http") {
    if (config.url === void 0) {
      throw new WringerError("CONFIG_ERROR", "Streamable HTTP requires a configured or action-input URL.");
    }
    return {
      transport: "streamable-http",
      url: config.url,
      ...config.command === void 0 ? {} : { command: config.command, args: config.args },
      allowNonLoopback: config.allowNonLoopback,
      ...common
    };
  }
  if (config.command === void 0) {
    throw new WringerError("USAGE_ERROR", "The command input or a configured command is required for stdio.");
  }
  if (config.url !== void 0 || config.allowNonLoopback) {
    throw new WringerError("CONFIG_ERROR", "URL and non-loopback settings require transport streamable-http.");
  }
  return {
    transport: "stdio",
    command: config.command,
    args: config.args,
    ...common
  };
}
function ensureActionReporters(configured) {
  const reporters = configured.map((selection) => ({ ...selection }));
  for (const name of ["sarif", "markdown"]) {
    const existing = reporters.find((selection) => selection.name === name);
    if (existing === void 0) {
      reporters.push({ name, enabled: true, options: {} });
    } else {
      existing.enabled = true;
    }
  }
  return reporters;
}
function toReproducerTarget(target) {
  if (target.transport === "streamable-http") {
    return {
      transport: "streamable-http",
      url: target.url,
      ...target.command === void 0 ? {} : { command: target.command, args: target.args ?? [] },
      environmentNames: []
    };
  }
  return {
    transport: "stdio",
    command: target.command,
    args: target.args,
    environmentNames: []
  };
}
function input(name) {
  const normalized = name.toUpperCase().replaceAll("-", "_");
  return process.env[`INPUT_${normalized}`] ?? process.env[`INPUT_${name.toUpperCase()}`] ?? "";
}
function parseStringArray(value, inputName) {
  let parsed;
  try {
    parsed = JSON.parse(value);
  } catch (error) {
    throw new WringerError(
      "USAGE_ERROR",
      `The ${inputName} input must be a JSON string array: ${error instanceof Error ? error.message : String(error)}`,
      { cause: error }
    );
  }
  if (!Array.isArray(parsed) || !parsed.every((item) => typeof item === "string")) {
    throw new WringerError("USAGE_ERROR", `The ${inputName} input must be a JSON string array.`);
  }
  return parsed;
}
function parseEnvironment(value) {
  if (value.length === 0) {
    return {};
  }
  let parsed;
  try {
    parsed = JSON.parse(value);
  } catch (error) {
    throw new WringerError(
      "USAGE_ERROR",
      `The env input must be a JSON object of string values: ${error instanceof Error ? error.message : String(error)}`,
      { cause: error }
    );
  }
  if (!isRecord13(parsed) || !Object.values(parsed).every((item) => typeof item === "string")) {
    throw new WringerError("USAGE_ERROR", "The env input must be a JSON object of string values.");
  }
  return parsed;
}
async function setOutput(name, value) {
  const outputPath = process.env.GITHUB_OUTPUT;
  if (outputPath === void 0 || outputPath.length === 0) {
    throw new WringerError("ACTION_ERROR", "GITHUB_OUTPUT is not set.");
  }
  let delimiter = `MCP_WRINGER_${(0, import_node_crypto4.randomUUID)().replaceAll("-", "")}`;
  while (value.includes(delimiter)) {
    delimiter = `MCP_WRINGER_${(0, import_node_crypto4.randomUUID)().replaceAll("-", "")}`;
  }
  await (0, import_promises6.appendFile)(outputPath, `${name}<<${delimiter}
${value}
${delimiter}
`, "utf8");
}
function isRecord13(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`mcp-wringer action: ${message}
`);
  process.exitCode = 1;
});
//# sourceMappingURL=index.cjs.map