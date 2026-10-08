export type JsonPrimitive = string | number | boolean | null;

export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

export type SpecRevision = "2025-11-25" | "2026-07-28";

export type TransportName = "stdio" | "streamable-http";

export interface TransportRunFailure {
  kind: "timeout" | "target-exit" | "transport-error";
  phase: "response" | "shutdown" | "transport";
  message: string;
}

export interface TransportRunOutcome {
  failure?: TransportRunFailure;
  exitCode: number | null;
  signal: NodeJS.Signals | null;
  durationMs: number;
  stdoutBytes: number;
  stderrBytes: number;
}

export interface HttpExchangeObservation {
  requestMethod: string;
  requestHeaders: Record<string, string | string[]>;
  requestBody: string;
  responseStatus: number;
  responseHeaders: Record<string, string | string[]>;
  responseBody: string;
  requestFault?: string;
  responseAborted?: boolean;
}

export interface StdioWireDescriptor {
  transport: "stdio";
  chunks?: number[];
  delayMs?: number;
}

export interface HttpWireDescriptor {
  transport: "streamable-http";
  fault: string;
  options?: { [key: string]: JsonValue };
}

export type WireDescriptor = StdioWireDescriptor | HttpWireDescriptor;

export interface SendMessageStep {
  type: "send";
  message: JsonValue;
  wire?: WireDescriptor;
}

export interface SendRawStep {
  type: "send-raw";
  bytesBase64: string;
  wire?: WireDescriptor;
}

export interface AwaitResponseStep {
  type: "await-response";
  id?: string | number;
  timeoutMs?: number;
}

export interface TransportOperationStep {
  type: "transport";
  operation: "close-stdin";
}

export interface DelayStep {
  type: "delay";
  durationMs: number;
}

export type ScenarioStep =
  | SendMessageStep
  | SendRawStep
  | AwaitResponseStep
  | TransportOperationStep
  | DelayStep;

export interface Scenario {
  formatVersion: 1;
  id: string;
  specRevision: SpecRevision;
  description?: string;
  steps: ScenarioStep[];
}

export interface TraceEvent {
  offsetMs: number;
  channel: "stdin" | "stdout" | "stderr" | "process" | "http-request" | "http-response";
  encoding: "utf8" | "base64";
  data: string;
  http?: {
    method: string;
    headers: Record<string, string | string[]>;
    statusCode?: number;
    statusMessage?: string;
  };
}

export interface Trace {
  formatVersion: 1;
  scenarioId: string;
  specRevision: SpecRevision;
  transport?: TransportName;
  events: TraceEvent[];
}

export type FindingSeverity = "high" | "medium" | "low" | "info";

export interface Finding {
  id: string;
  ruleId: string;
  severity: FindingSeverity;
  title: string;
  message: string;
  cite: string;
  occurrences: number;
  evidence: EvidenceExcerpt[];
}

export interface EvidenceExcerpt {
  channel: TraceEvent["channel"];
  encoding: TraceEvent["encoding"];
  data: string;
  originalLengthBytes: number;
  sha256: string;
  truncated: boolean;
  http?: TraceEvent["http"];
}

export type TargetDescriptor =
  | {
    transport: "stdio";
    command: string;
    args: string[];
    environmentNames: string[];
  }
  | {
    transport: "streamable-http";
    url: string;
    command?: string;
    args?: string[];
    environmentNames: string[];
  }
  | {
    command: string;
    args: string[];
    environmentNames: string[];
  };

export interface Reproducer {
  formatVersion: 1;
  specRevision: SpecRevision;
  seed?: number;
  target: TargetDescriptor;
  scenario: Scenario;
}
