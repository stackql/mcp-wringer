import type {
  HttpExchangeObservation,
  Scenario,
  TransportName,
  TransportRunOutcome,
  Trace,
  JsonValue,
} from "../core/types.js";

export interface CommonTransportOptions {
  env?: Record<string, string>;
  inheritEnvironment?: boolean;
  timeoutMs?: number;
}

export type StdioTransportOptions = CommonTransportOptions & {
  transport?: "stdio";
  command: string;
  args: string[];
};

export type HttpTransportOptions = CommonTransportOptions & {
  transport: "streamable-http";
  url: string;
  command?: string;
  args?: string[];
  allowNonLoopback?: boolean;
};

export type TransportTargetOptions = StdioTransportOptions | HttpTransportOptions;

export type TransportRunOptions = TransportTargetOptions & {
  scenario: Scenario;
};

export interface TransportRunResult {
  trace: Trace;
  responses: JsonValue[];
  outcome: TransportRunOutcome;
  transport: TransportName;
  httpExchanges?: HttpExchangeObservation[];
}

export interface TransportSession {
  execute(scenario: Scenario, options?: { closeAfterScenario?: boolean }): Promise<TransportRunResult>;
  close(terminate?: boolean): Promise<void>;
}

export interface TransportAdapter {
  createSession(options: TransportRunOptions): TransportSession;
  run(options: TransportRunOptions): Promise<TransportRunResult>;
}
