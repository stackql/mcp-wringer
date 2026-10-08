export type JsonPrimitive = string | number | boolean | null;

export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

export type SpecRevision = "2025-11-25" | "2026-07-28";

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
  channel: "stdin" | "stdout" | "stderr" | "process";
  encoding: "utf8" | "base64";
  data: string;
}

export interface Trace {
  formatVersion: 1;
  scenarioId: string;
  specRevision: SpecRevision;
  events: TraceEvent[];
}

export type FindingSeverity = "high" | "medium" | "low" | "info";

export interface Finding {
  id: string;
  ruleId: string;
  severity: FindingSeverity;
  title: string;
  message: string;
  evidence: TraceEvent[];
}

export interface TargetDescriptor {
  command: string;
  args: string[];
  environmentNames: string[];
}

export interface Reproducer {
  formatVersion: 1;
  specRevision: SpecRevision;
  target: TargetDescriptor;
  scenario: Scenario;
}
