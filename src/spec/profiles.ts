import { ExtensionRegistry } from "../core/registry.js";
import type { JsonValue, ScenarioStep, SpecRevision } from "../core/types.js";

export interface SpecProfile {
  readonly revision: SpecRevision;
  readonly lifecycleSteps: (requestIdPrefix: string) => ScenarioStep[];
  readonly request: (method: string, id: string | number, params?: JsonValue) => JsonValue;
  readonly livenessProbe: (id: string | number) => JsonValue;
  readonly toolListMethod: string;
  readonly resourceListMethod: string;
  readonly promptListMethod: string;
}

const implementation = {
  name: "mcp-wringer",
  version: "0.1.0",
};

const capabilities = {};

const legacyProfile: SpecProfile = {
  revision: "2025-11-25",
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
            clientInfo: implementation,
          },
        },
      },
      { type: "await-response", id: initializeId },
      {
        type: "send",
        message: {
          jsonrpc: "2.0",
          method: "notifications/initialized",
        },
      },
    ];
  },
  request(method, id, params) {
    return {
      jsonrpc: "2.0",
      id,
      method,
      ...(params === undefined ? {} : { params }),
    };
  },
  livenessProbe(id) {
    return this.request("ping", id);
  },
  toolListMethod: "tools/list",
  resourceListMethod: "resources/list",
  promptListMethod: "prompts/list",
};

const statelessProfile: SpecProfile = {
  revision: "2026-07-28",
  lifecycleSteps() {
    return [];
  },
  request(method, id, params) {
    const requestParams = typeof params === "object" && params !== null && !Array.isArray(params)
      ? params
      : {};
    return {
      jsonrpc: "2.0",
      id,
      method,
      params: {
        ...requestParams,
        _meta: {
          "io.modelcontextprotocol/clientCapabilities": capabilities,
          "io.modelcontextprotocol/clientInfo": implementation,
          "io.modelcontextprotocol/protocolVersion": "2026-07-28",
        },
      },
    };
  },
  livenessProbe(id) {
    return this.request("server/discover", id);
  },
  toolListMethod: "tools/list",
  resourceListMethod: "resources/list",
  promptListMethod: "prompts/list",
};

export const specProfiles = new ExtensionRegistry<SpecProfile>();
specProfiles.register(legacyProfile.revision, legacyProfile);
specProfiles.register(statelessProfile.revision, statelessProfile);

export function requestScenarioSteps(
  profile: SpecProfile,
  method: string,
  id: string | number,
  params?: JsonValue,
): ScenarioStep[] {
  return [
    ...profile.lifecycleSteps(`lifecycle-${String(id)}`),
    { type: "send", message: profile.request(method, id, params) },
    { type: "await-response", id },
  ];
}
