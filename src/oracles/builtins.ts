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
        )];
      },
    }],
    ["hang", {
      evaluate(context) {
        if (context.outcome.failure?.kind !== "timeout" || context.outcome.failure.phase !== "response") {
          return [];
        }
        const requests = sentRequests(context.scenario);
        const responseMessages = parseStdout(context.trace).flatMap((line) => {
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
          context.livenessProbe.evidence,
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
        const findings: FindingDraft[] = [];
        for (const line of parseStdout(context.trace)) {
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
          } else if (seenResponses.has(key)) {
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
        for (const line of parseStdout(context.trace)) {
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
        for (const line of parseStdout(context.trace)) {
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
        const leaked = parseStdout(context.trace).some((line) => {
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
        const responses = parseStdout(context.trace).flatMap((line) => {
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
    ["resource-usage", {
      evaluate(context) {
        const traceBytes = context.outcome.stdoutBytes + context.outcome.stderrBytes;
        if (traceBytes <= MAX_TRACE_BYTES) {
          return [];
        }
        return [draft(
          context,
          "resource-usage.outlier",
          "trace-output-over-1mib",
          `The target produced ${traceBytes} bytes of stdout and stderr during this scenario.`,
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
  const selectedEvidence = evidence ?? context.trace.events.slice(-6);
  return {
    ruleId,
    signature,
    message,
    ...(selectedEvidence.length === 0 ? {} : { evidence: selectedEvidence }),
  };
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
      try {
        const message = asRecord(JSON.parse(bytes.toString("utf8")) as unknown);
        if (message !== undefined) {
          requests.push(toSentRequest(message));
        }
      } catch {
        continue;
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
