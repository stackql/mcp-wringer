import type { JsonValue, Scenario, TraceEvent } from "../core/types.js";
import { oracleRegistry } from "./registry.js";
import type { FindingDraft, Oracle, OracleContext } from "./types.js";
import { validateAgainstSchema } from "./schema-validator.js";

const MAX_TRACE_BYTES = 1_048_576;

interface ParsedLine {
  value?: unknown;
  error?: string;
}

interface SentRequest {
  id?: string | number;
  method?: string;
  message: Record<string, unknown>;
}

function createOracles(): Array<[string, Oracle]> {
  return [
    ["crash", {
      evaluate(context) {
        const { outcome } = context;
        const exitedDuringScenario = outcome.failure?.kind === "target-exit";
        const exitedWithError = outcome.exitCode !== null
          && outcome.exitCode !== 0
          && (outcome.failure === undefined || outcome.failure.kind === "target-exit");
        const exitedBySignal = outcome.signal !== null
          && (outcome.failure === undefined || outcome.failure.kind === "target-exit");
        const exitedUnsuccessfully = exitedWithError || exitedBySignal;
        if (!exitedDuringScenario && !exitedUnsuccessfully) {
          return [];
        }
        return [draft(
          context,
          "crash.process-exit",
          "target-exited",
          "The target process exited unexpectedly while executing the scenario.",
          stableTraceEvidence(context, true),
        )];
      },
    }],
    ["hang", {
      evaluate(context) {
        if (context.outcome.failure?.kind !== "timeout" || context.outcome.failure.phase !== "response") {
          return [];
        }
        const requests = sentRequests(context.scenario);
        const responseMessages = parseResponseMessages(context).flatMap((line) => {
          const message = asRecord(line.value);
          return message !== undefined && ("result" in message || "error" in message) ? [message] : [];
        });
        const responseIds = responseMessages.flatMap((message) => {
          const id = readId(message.id);
          return id === undefined ? [] : [id];
        });
        const request = requests.find((item) => {
          const id = item.id;
          return id !== undefined
            && context.scenario.steps.some((step) => step.type === "await-response" && step.id === id)
            && !responseIds.some((responseId) => idKey(responseId) === idKey(id));
        });
        if (request === undefined) {
          return [];
        }
        const unmatchedResponse = responseMessages.some((message) => {
          const id = readId(message.id);
          if (id === undefined) {
            return true;
          }
          return !requests.some((sent) => sent.id !== undefined && idKey(sent.id) === idKey(id));
        });
        if (unmatchedResponse) {
          return [];
        }
        return [draft(
          context,
          "hang.request-timeout",
          `request-timeout:${request.method ?? "unknown-method"}`,
          `The target did not answer the ${request.method ?? "unknown"} request before its timeout.`,
        )];
      },
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
          "The target failed its revision-specific liveness probe after the scenario.",
        )];
      },
    }],
    ["state-consistency", {
      evaluate(context) {
        const comparison = context.baselineComparison;
        if (comparison === undefined || canonicalJson(comparison.before) === canonicalJson(comparison.after)) {
          return [];
        }
        return [draft(
          context,
          "state-consistency.baseline-changed",
          "baseline-response-changed",
          "The baseline response changed after the scenario.",
        )];
      },
    }],
    ["stdout-pollution", {
      evaluate(context) {
        const lines = parseStdout(context.trace);
        if (!lines.some((line) => line.error !== undefined || !isJsonRpcMessage(line.value))) {
          return [];
        }
        return [draft(
          context,
          "stdout-pollution.non-protocol-bytes",
          "non-protocol-stdout",
          "The target wrote bytes to stdout that are not a JSON-RPC message.",
        )];
      },
    }],
    ["jsonrpc-contract", {
      evaluate(context) {
        const requests = sentRequests(context.scenario);
        const requestById = indexRequestsById(requests);
        const seenResponses = new Set<string>();
        const concurrentHttpRequests = context.transport === "streamable-http"
          && context.scenario.steps.some((step) => (step.type === "send" || step.type === "send-raw")
            && step.wire?.transport === "streamable-http" && step.wire.fault === "concurrent-requests");
        const findings: FindingDraft[] = [];
        for (const line of parseResponseMessages(context)) {
          const message = asRecord(line.value);
          if (message === undefined || !("result" in message || "error" in message)) {
            continue;
          }
          const id = readId(message.id);
          const key = id === undefined ? undefined : idKey(id);
          const request = key === undefined ? undefined : requestById.get(key);
          let violation: string | undefined;
          if (line.error !== undefined || message.jsonrpc !== "2.0" || id === undefined || key === undefined
            || ("result" in message && "error" in message)) {
            violation = "invalid-response";
          } else if (request === undefined) {
            violation = "unmatched-response-id";
          } else if (seenResponses.has(key) && !concurrentHttpRequests) {
            violation = "duplicate-response";
          } else {
            seenResponses.add(key);
          }
          if (violation !== undefined) {
            findings.push(draft(
              context,
              "jsonrpc-contract.invalid-message",
              violation,
              `The target emitted a JSON-RPC response with a ${violation.replaceAll("-", " ")}.`,
            ));
          }
        }
        return findings;
      },
    }],
    ["schema-response", {
      evaluate(context) {
        const requests = sentRequests(context.scenario);
        const requestById = indexRequestsById(requests);
        const findings: FindingDraft[] = [];
        for (const line of parseResponseMessages(context)) {
          if (line.error !== undefined || !isJsonRpcMessage(line.value)) {
            continue;
          }
          const messageValidation = validateAgainstSchema(context.rules.revision, "JSONRPCMessage", line.value);
          if (!messageValidation.valid) {
            findings.push(draft(
              context,
              "schema-response.invalid-result",
              `invalid-message:${firstError(messageValidation.errors)}`,
              `The target emitted a message that does not match the revision's JSON-RPC schema: ${firstError(messageValidation.errors)}.`,
            ));
            continue;
          }
          const message = asRecord(line.value);
          if (message === undefined || !("result" in message)) {
            continue;
          }
          const id = readId(message.id);
          const request = id === undefined ? undefined : requestById.get(idKey(id));
          const schemaName = request?.method === undefined ? undefined : context.rules.responseSchemas[request.method];
          if (schemaName === undefined) {
            continue;
          }
          const resultValidation = validateAgainstSchema(context.rules.revision, schemaName, message.result);
          if (!resultValidation.valid) {
            findings.push(draft(
              context,
              "schema-response.invalid-result",
              `invalid-result:${request?.method ?? "unknown-method"}:${schemaName}:${firstError(resultValidation.errors)}`,
              `The result for ${request?.method ?? "unknown"} does not match the ${schemaName} schema: ${firstError(resultValidation.errors)}.`,
            ));
          }
        }
        return findings;
      },
    }],
    ["error-code", {
      evaluate(context) {
        const expectedById = new Map(
          (context.expectedErrors ?? []).map((expectation) => [idKey(expectation.id), expectation.code]),
        );
        const requests = sentRequests(context.scenario);
        const requestById = indexRequestsById(requests);
        const findings: FindingDraft[] = [];
        for (const line of parseResponseMessages(context)) {
          const message = asRecord(line.value);
          const error = message === undefined ? undefined : asRecord(message.error);
          const id = message === undefined ? undefined : readId(message.id);
          if (error === undefined || typeof error.code !== "number" || id === undefined) {
            continue;
          }
          const expectedCode = expectedById.get(idKey(id));
          if (expectedCode === undefined || expectedCode === error.code) {
            continue;
          }
          const method = requestById.get(idKey(id))?.method ?? "unknown-method";
          findings.push(draft(
            context,
            "error-code.unexpected-code",
            `error-code:${method}:${expectedCode}`,
            `The ${method} request returned error code ${error.code}; the expected code is ${expectedCode}.`,
          ));
        }
        return findings;
      },
    }],
    ["error-leak", {
      evaluate(context) {
        const leaked = parseResponseMessages(context).some((line) => {
          const message = asRecord(line.value);
          const error = message === undefined ? undefined : asRecord(message.error);
          if (error === undefined) {
            return false;
          }
          const details = `${String(error.message ?? "")} ${safeStringify(error.data)}`;
          return /(?:\bat\s+.+:\d+:\d+|(?:[A-Za-z]:\\|\/(?:home|Users|private|var|opt|workspace)\/)[^\s"'<>]+)/i.test(details);
        });
        return leaked
          ? [draft(
              context,
              "error-leak.sensitive-detail",
              "stack-or-absolute-path",
              "An error response exposed a stack frame or an absolute filesystem path.",
            )]
          : [];
      },
    }],
    ["accepted-malformed", {
      evaluate(context) {
        const malformed = sentRequests(context.scenario).filter((request) =>
          request.message.jsonrpc !== "2.0"
          || typeof request.message.method !== "string"
          || (request.message.id !== undefined && readId(request.message.id) === undefined));
        const responses = parseResponseMessages(context).flatMap((line) => {
          const message = asRecord(line.value);
          return message !== undefined && "result" in message ? [message] : [];
        });
        if (!malformed.some((request) =>
          request.id === undefined || responses.some((response) => readId(response.id) === request.id))) {
          return [];
        }
        return [draft(
          context,
          "accepted-malformed.success-response",
          "malformed-request-accepted",
          "The target returned a success result for a malformed JSON-RPC request.",
        )];
      },
    }],
    ["http-transport", {
      evaluate(context) {
        if (context.transport !== "streamable-http" || context.httpExchanges === undefined) {
          return [];
        }
        const findings: FindingDraft[] = [];
        for (const exchange of context.httpExchanges) {
          if (exchange.requestMethod !== "POST" || exchange.requestFault !== undefined || exchange.responseAborted === true) {
            continue;
          }
          let request: unknown;
          try {
            request = JSON.parse(exchange.requestBody) as unknown;
          } catch {
            continue;
          }
          const message = asRecord(request);
          if (message === undefined) {
            continue;
          }
          const isNotification = !("id" in message);
          if (isNotification) {
            if (exchange.responseStatus >= 200 && exchange.responseStatus < 300
              && (exchange.responseStatus !== 202 || exchange.responseBody.length !== 0)) {
              findings.push(draft(
                context,
                "http.notification-response",
                `notification-response:${message.method ?? "unknown-method"}`,
                "The server accepted an HTTP notification without returning 202 Accepted and an empty body.",
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
              "The server returned a successful HTTP response without an allowed JSON or event-stream media type.",
            ));
            continue;
          }
          const responseMessages = contentType === "application/json"
            ? [exchange.responseBody]
            : parseHttpEventData(exchange.responseBody);
          const validBody = responseMessages.length > 0 && responseMessages.every((body) => {
            try {
              return isJsonRpcMessage(JSON.parse(body) as unknown);
            } catch {
              return false;
            }
          });
          if (!validBody) {
            findings.push(draft(
              context,
              "http.response-body-invalid",
              `response-body-invalid:${contentType}`,
              "The server returned a successful HTTP response whose body did not contain a JSON-RPC message.",
            ));
          }
        }
        return findings;
      },
    }],
    ["resource-usage", {
      evaluate(context) {
        const traceBytes = context.transport === "stdio"
          ? context.outcome.stdoutBytes + context.outcome.stderrBytes
          : (context.httpExchanges ?? []).reduce(
            (total, exchange) => total + Buffer.byteLength(exchange.responseBody),
            0,
          );
        if (traceBytes <= MAX_TRACE_BYTES) {
          return [];
        }
        return [draft(
          context,
          "resource-usage.outlier",
          "trace-output-over-1mib",
          `The target produced ${traceBytes} bytes of transport output during this scenario.`,
        )];
      },
    }],
  ];
}

export function registerBuiltInOracles(): void {
  for (const [name, oracle] of createOracles()) {
    if (!oracleRegistry.names().includes(name)) {
      oracleRegistry.register(name, oracle);
    }
  }
}

function draft(
  context: OracleContext,
  ruleId: string,
  signature: string,
  message: string,
  evidence?: TraceEvent[],
): FindingDraft {
  const selectedEvidence = evidence ?? stableTraceEvidence(context);
  return {
    ruleId,
    signature,
    message,
    ...(selectedEvidence.length === 0 ? {} : { evidence: selectedEvidence }),
  };
}

function stableTraceEvidence(context: OracleContext, includeProcess = false): TraceEvent[] {
  const evidence: TraceEvent[] = [];
  if (context.transport === "streamable-http") {
    evidence.push(...context.trace.events
      .filter((event) => event.channel === "http-request" || event.channel === "http-response")
      .map((event) => ({ ...event, offsetMs: 0 })));
    if (includeProcess) {
      evidence.push(...context.trace.events
        .filter((event) => event.channel === "process")
        .map((event) => ({ ...event, offsetMs: 0 })));
    }
    return evidence;
  }
  const channels = ["stdin", "stdout", "stderr"] as const;
  for (const channel of channels) {
    const channelEvents = context.trace.events.filter((event) => event.channel === channel);
    if (channelEvents.length === 0) {
      continue;
    }
    const bytes = Buffer.concat(channelEvents.map((event) =>
      event.encoding === "base64" ? Buffer.from(event.data, "base64") : Buffer.from(event.data)));
    const text = bytes.toString("utf8");
    const isUtf8 = Buffer.from(text, "utf8").equals(bytes);
    evidence.push({
      offsetMs: 0,
      channel,
      encoding: isUtf8 ? "utf8" : "base64",
      data: isUtf8 ? text : bytes.toString("base64"),
    });
  }
  if (includeProcess) {
    evidence.push(...context.trace.events
      .filter((event) => event.channel === "process")
      .map((event) => ({ ...event, offsetMs: 0 })));
  }
  return evidence;
}

function parseResponseMessages(context: OracleContext): ParsedLine[] {
  return context.transport === "stdio"
    ? parseStdout(context.trace)
    : context.responses.map((value) => ({ value }));
}

function readHeader(headers: Record<string, string | string[]>, name: string): string | undefined {
  const value = headers[name.toLowerCase()];
  return Array.isArray(value) ? value[0] : value;
}

function parseHttpEventData(body: string): string[] {
  const messages: string[] = [];
  let data: string[] = [];
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

function parseStdout(trace: OracleContext["trace"]): ParsedLine[] {
  const bytes = Buffer.concat(
    trace.events
      .filter((event) => event.channel === "stdout")
      .map((event) => event.encoding === "base64" ? Buffer.from(event.data, "base64") : Buffer.from(event.data)),
  );
  const lines: ParsedLine[] = [];
  let offset = 0;
  while (offset < bytes.length) {
    const newline = bytes.indexOf(0x0a, offset);
    const end = newline < 0 ? bytes.length : newline;
    const raw = bytes.subarray(offset, end);
    offset = newline < 0 ? bytes.length : newline + 1;
    if (raw.length === 0 || (raw.length === 1 && raw[0] === 0x0d)) {
      continue;
    }
    try {
      lines.push({ value: JSON.parse(raw.toString("utf8")) as unknown });
    } catch (error) {
      lines.push({ error: error instanceof Error ? error.message : String(error) });
    }
  }
  return lines;
}

function sentRequests(scenario: Scenario): SentRequest[] {
  const requests: SentRequest[] = [];
  for (const step of scenario.steps) {
    if (step.type === "send") {
      const message = asRecord(step.message);
      if (message !== undefined) {
        requests.push(toSentRequest(message));
      }
    } else if (step.type === "send-raw") {
      const bytes = Buffer.from(step.bytesBase64, "base64");
      for (const frame of bytes.toString("utf8").split("\n")) {
        if (frame.trim().length === 0) {
          continue;
        }
        try {
          const message = asRecord(JSON.parse(frame) as unknown);
          if (message !== undefined) {
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

function toSentRequest(message: Record<string, unknown>): SentRequest {
  const id = readId(message.id);
  return {
    ...(id === undefined ? {} : { id }),
    ...(typeof message.method === "string" ? { method: message.method } : {}),
    message,
  };
}

function indexRequestsById(requests: SentRequest[]): Map<string, SentRequest> {
  const index = new Map<string, SentRequest>();
  for (const request of requests) {
    if (request.id !== undefined) {
      index.set(idKey(request.id), request);
    }
  }
  return index;
}

function isJsonRpcMessage(value: unknown): boolean {
  if (!isRecord(value) || value.jsonrpc !== "2.0") {
    return false;
  }
  if (typeof value.method === "string") {
    return value.id === undefined || readId(value.id) !== undefined;
  }
  return readId(value.id) !== undefined && (("result" in value) !== ("error" in value));
}

function readId(value: unknown): string | number | undefined {
  return typeof value === "string" || (typeof value === "number" && Number.isFinite(value))
    ? value
    : undefined;
}

function idKey(value: string | number): string {
  return `${typeof value}:${String(value)}`;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return isRecord(value) ? value : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function firstError(errors: string[]): string {
  return errors[0] ?? "schema mismatch";
}

function canonicalJson(value: JsonValue): string {
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(",")}]`;
  }
  if (value !== null && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key]!)}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function safeStringify(value: unknown): string {
  return JSON.stringify(value) ?? "";
}

registerBuiltInOracles();
