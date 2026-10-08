import http from "node:http";
import https from "node:https";
import net from "node:net";
import tls from "node:tls";
import { performance } from "node:perf_hooks";
import type { ChildProcess } from "node:child_process";
import { ScenarioError, TargetError, TransportError } from "../../core/errors.js";
import type {
  HttpExchangeObservation,
  JsonValue,
  Scenario,
  ScenarioStep,
  Trace,
  TraceEvent,
  TransportRunFailure,
  WireDescriptor,
} from "../../core/types.js";
import { specProfiles } from "../../spec/profiles.js";
import { spawnTarget, terminateTarget } from "../../target/spawn.js";
import type { HttpTransportOptions, TransportRunResult, TransportSession } from "../types.js";

const MAX_RESPONSE_BYTES = 2_097_152;
const OVERSIZED_BODY_BYTES = MAX_RESPONSE_BYTES + 1;

type HttpRunOptions = HttpTransportOptions & { scenario: Scenario };

export interface HttpRunResult extends TransportRunResult {
  transport: "streamable-http";
  httpExchanges: HttpExchangeObservation[];
}

export class HttpScenarioSession implements TransportSession {
  readonly #options: HttpRunOptions;
  readonly #url: URL;
  readonly #child: ChildProcess | undefined;
  readonly #recorder: HttpTraceRecorder;
  readonly #exitPromise: Promise<{ code: number | null; signal: NodeJS.Signals | null }> | undefined;
  readonly #pendingResponses: JsonValue[] = [];
  readonly #observedResponses: JsonValue[] = [];
  readonly #exchanges: HttpExchangeObservation[] = [];
  readonly #revision: Scenario["specRevision"];
  #sessionId: string | undefined;
  #exitStatus: { code: number | null; signal: NodeJS.Signals | null } | undefined;
  #spawnError: Error | undefined;
  #closed = false;
  #ready = false;
  #requestedTermination = false;

  constructor(options: HttpRunOptions) {
    this.#options = options;
    this.#revision = options.scenario.specRevision;
    this.#url = parseTargetUrl(options.url);
    if (options.command === undefined && options.args !== undefined) {
      throw new ScenarioError("HTTP target args require a spawned target command.");
    }
    if (options.command !== undefined && options.args === undefined) {
      throw new ScenarioError("A spawned HTTP target requires an argument array.");
    }
    if (options.command === undefined && !options.allowNonLoopback && !isLoopbackHost(this.#url.hostname)) {
      throw new TargetError("Attach mode refuses non-loopback HTTP targets; pass allowNonLoopback to authorize it.");
    }
    this.#recorder = new HttpTraceRecorder(options.env ?? {}, options.inheritEnvironment ?? false);
    if (options.command === undefined) {
      this.#child = undefined;
      this.#exitPromise = undefined;
      return;
    }
    this.#child = spawnTarget({
      command: options.command,
      args: options.args ?? [],
      ...(options.env === undefined ? {} : { env: options.env }),
      ...(options.inheritEnvironment === undefined ? {} : { inheritEnvironment: options.inheritEnvironment }),
    });
    this.#exitPromise = new Promise((resolve) => {
      this.#child?.once("exit", (code, signal) => {
        this.#exitStatus = { code, signal };
        this.#recorder.add("process", Buffer.from(`exit code=${String(code)} signal=${String(signal)}`));
        resolve(this.#exitStatus);
      });
    });
    this.#child.once("error", (error) => {
      this.#spawnError = error;
      this.#recorder.add("process", Buffer.from(`spawn error=${error.message}`));
    });
    this.#child.stdout?.on("data", () => undefined);
    this.#child.stderr?.on("data", () => undefined);
  }

  async execute(
    scenario: Scenario,
    options: { closeAfterScenario?: boolean } = {},
  ): Promise<HttpRunResult> {
    if (this.#closed) {
      throw new TargetError("Cannot execute a scenario after the HTTP target session is closed.");
    }
    if (scenario.specRevision !== this.#options.scenario.specRevision) {
      throw new ScenarioError("All scenarios in an HTTP target session must use the same spec revision.");
    }
    const startedAt = performance.now();
    const eventStart = this.#recorder.eventCount();
    const exchangeStart = this.#exchanges.length;
    const responseStart = this.#observedResponses.length;
    let failure: TransportRunFailure | undefined;
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
      if (failure !== undefined && this.#exitPromise !== undefined && this.#exitStatus === undefined) {
        await Promise.race([
          this.#exitPromise,
          new Promise<void>((resolve) => setTimeout(resolve, 100)),
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
    const processFailure = this.#exitStatus !== undefined
      && !this.#requestedTermination
      && (this.#exitStatus.code !== 0 || this.#exitStatus.signal !== null)
      ? {
        kind: "target-exit" as const,
        phase: "response" as const,
        message: `Target exited with code=${String(this.#exitStatus.code)} signal=${String(this.#exitStatus.signal)}.`,
      }
      : undefined;
    return {
      trace: this.#recorder.toTrace(scenario.id, scenario.specRevision, eventStart),
      responses,
      outcome: {
        ...(processFailure === undefined
          ? (failure === undefined ? {} : { failure })
          : { failure: processFailure }),
        exitCode: this.#requestedTermination ? null : this.#exitStatus?.code ?? null,
        signal: this.#requestedTermination ? null : this.#exitStatus?.signal ?? null,
        durationMs: Math.max(0, performance.now() - startedAt),
        stdoutBytes: 0,
        stderrBytes: 0,
      },
      transport: "streamable-http",
      httpExchanges: this.#exchanges.slice(exchangeStart),
    };
  }

  async close(terminate = false): Promise<void> {
    if (this.#closed) {
      return;
    }
    if (this.#child !== undefined) {
      if (terminate) {
        this.#requestedTermination = this.#exitStatus === undefined
          && this.#child.exitCode === null
          && this.#child.signalCode === null;
        await terminateTarget(this.#child);
      } else if (this.#exitPromise !== undefined) {
        this.#requestedTermination = this.#exitStatus === undefined
          && this.#child.exitCode === null
          && this.#child.signalCode === null;
        await terminateTarget(this.#child);
      }
    }
    this.#recorder.flush();
    this.#closed = true;
  }

  async #ensureReady(): Promise<void> {
    if (this.#ready) {
      if (this.#exitStatus !== undefined) {
        throw new TargetError("The spawned HTTP target exited before the scenario started.");
      }
      return;
    }
    if (this.#child === undefined) {
      this.#ready = true;
      return;
    }
    if (this.#spawnError !== undefined) {
      throw new TargetError(`Could not start target: ${this.#spawnError.message}`, { cause: this.#spawnError });
    }
    await waitForSpawn(this.#child, this.#spawnError, this.#options.timeoutMs ?? 5_000);
    await waitForHttpListener(this.#url, this.#child, Math.max(5_000, this.#options.timeoutMs ?? 5_000));
    this.#ready = true;
  }

  async #executeStep(step: ScenarioStep, scenario: Scenario): Promise<void> {
    switch (step.type) {
      case "send":
        await this.#sendMessage(
          Buffer.from(JSON.stringify(step.message)),
          step.message,
          step.wire,
          scenario,
          getResponseTimeout(scenario, step.message, this.#options.timeoutMs ?? 5_000),
        );
        return;
      case "send-raw":
        {
          const body = Buffer.from(step.bytesBase64, "base64");
          await this.#sendMessage(
            body,
            undefined,
            step.wire,
            scenario,
            getResponseTimeout(scenario, parseRequestMessage(body), this.#options.timeoutMs ?? 5_000),
          );
        }
        return;
      case "await-response":
        this.#takeResponse(step.id);
        return;
      case "transport":
        throw new ScenarioError(`Transport operation '${step.operation}' cannot run over Streamable HTTP.`);
      case "delay":
        await new Promise<void>((resolve) => setTimeout(resolve, step.durationMs));
        return;
    }
  }

  async #sendMessage(
    body: Buffer,
    message: JsonValue | undefined,
    wire: WireDescriptor | undefined,
    scenario: Scenario,
    timeoutMs: number,
  ): Promise<void> {
    if (wire !== undefined && wire.transport !== "streamable-http") {
      throw new ScenarioError(`Wire fault '${wire.transport}' cannot run over Streamable HTTP.`);
    }
    const fault = wire?.fault;
    const headers = createRequestHeaders(this.#options.url, scenario.specRevision, this.#sessionId);
    addMirroredHeaders(headers, scenario.specRevision, message, body);
    const method = fault === "wrong-method" ? "PUT" : "POST";
    applyHeaderFault(headers, fault, scenario.specRevision);
    if (fault === "truncated-body" || fault === "abort-response") {
      const raw = buildRawRequest(this.#url, method, headers, body, fault === "truncated-body");
      const exchange = await rawHttpRequest(
        this.#url,
        raw,
        timeoutMs,
        fault === "abort-response",
      );
      this.#recordExchange(method, headers, body, exchange, fault);
      this.#queueMessages(exchange.responseBody, exchange.responseHeaders, exchange.responseStatus);
      return;
    }
    if (fault === "oversized-body") {
      body = Buffer.alloc(OVERSIZED_BODY_BYTES, 0x41);
    }
    const requestCount = fault === "concurrent-requests" ? 2 : 1;
    const results = await Promise.all(Array.from({ length: requestCount }, () =>
      sendHttpRequest(this.#url, method, headers, body, timeoutMs)));
    for (const result of results) {
      this.#recordExchange(method, headers, body, result, fault);
      if (result.responseStatus === 404 && this.#sessionId !== undefined
        && scenarioIsLegacy(scenario.specRevision) && requestCount === 1
        && message !== undefined && isRecord(message) && message.method !== "initialize") {
        this.#sessionId = undefined;
        await this.#startNewSession(scenario.specRevision);
        const retryHeaders = createRequestHeaders(this.#options.url, scenario.specRevision, this.#sessionId);
        const retry = await sendHttpRequest(this.#url, method, retryHeaders, body, this.#options.timeoutMs ?? 5_000);
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

  async #startNewSession(revision: Scenario["specRevision"]): Promise<void> {
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
      const result = await sendHttpRequest(this.#url, "POST", headers, body, this.#options.timeoutMs ?? 5_000);
      this.#recordExchange("POST", headers, body, result, "automatic-session-reinitialize");
      if (result.responseStatus < 200 || result.responseStatus >= 300) {
        throw new TransportError(`HTTP session reinitialization failed with status ${result.responseStatus}.`);
      }
    }
  }

  #recordExchange(
    method: string,
    headers: Record<string, string>,
    body: Buffer,
    result: HttpExchangeObservation,
    requestFault?: string,
  ): void {
    const safeHeaders = redactHeaders(headers, this.#options.env);
    const safeResponseHeaders = redactHeaders(result.responseHeaders, this.#options.env);
    const safeRequestBody = redactBuffer(body, this.#options.env);
    const safeResponseBody = redactBuffer(Buffer.from(result.responseBody), this.#options.env).toString("utf8");
    this.#recorder.addHttp("http-request", safeRequestBody, { method, headers: safeHeaders });
    this.#recorder.addHttp("http-response", Buffer.from(safeResponseBody), {
      method,
      headers: safeResponseHeaders,
      statusCode: result.responseStatus,
    });
    this.#exchanges.push({
      ...result,
      requestMethod: method,
      requestHeaders: safeHeaders,
      requestBody: safeRequestBody.toString("utf8"),
      responseHeaders: safeResponseHeaders,
      responseBody: safeResponseBody,
      ...(requestFault === undefined ? {} : { requestFault }),
    });
    const sessionId = headerValue(result.responseHeaders, "mcp-session-id");
    if (scenarioIsLegacy(this.#revision) && sessionId !== undefined) {
      this.#sessionId = sessionId;
    }
  }

  #queueMessages(body: string, headers: Record<string, string | string[]>, statusCode: number): void {
    const success = statusCode >= 200 && statusCode < 300;
    const contentType = headerValue(headers, "content-type")?.split(";", 1)[0]?.trim().toLowerCase();
    if (body.length === 0) {
      return;
    }
    const messages: JsonValue[] = [];
    if (contentType === "text/event-stream" && success) {
      for (const data of parseSseData(body)) {
        parseJsonMessages(data, messages);
      }
    } else if (contentType === "application/json" || (contentType === undefined && success)) {
      parseJsonMessages(body, messages);
    }
    // Servers reject requests with an HTTP error status and a JSON-RPC error body, for example an unsupported protocol version.
    const accepted = success ? messages : messages.filter((message) => isRecord(message) && isRecord(message.error));
    this.#pendingResponses.push(...accepted);
    this.#observedResponses.push(...accepted);
  }

  #takeResponse(id: string | number | undefined): void {
    const index = this.#pendingResponses.findIndex((value) => {
      if (id === undefined) {
        return true;
      }
      return isRecord(value) && value.id === id;
    });
    if (index < 0) {
      throw new TransportError(
        `The HTTP response did not contain JSON-RPC response${id === undefined ? "" : ` ${String(id)}`}.`,
      );
    }
    this.#pendingResponses.splice(index, 1);
  }

  #classifyFailure(error: TransportError): TransportRunFailure {
    if (this.#exitStatus !== undefined) {
      return { kind: "target-exit", phase: "response", message: error.message };
    }
    return {
      kind: /timed out/iu.test(error.message) ? "timeout" : "transport-error",
      phase: "response",
      message: error.message,
    };
  }
}

export async function runHttpScenario(options: HttpRunOptions): Promise<HttpRunResult> {
  const session = new HttpScenarioSession(options);
  return session.execute(options.scenario);
}

function createRequestHeaders(url: string, revision: Scenario["specRevision"], sessionId?: string): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "application/json, text/event-stream",
    "Content-Type": "application/json",
    "MCP-Protocol-Version": revision,
    Host: new URL(url).host,
    Connection: "close",
  };
  if (sessionId !== undefined && revision === "2025-11-25") {
    headers["MCP-Session-Id"] = sessionId;
  }
  return headers;
}

const NAME_HEADER_METHODS: Readonly<Record<string, "name" | "uri">> = {
  "tools/call": "name",
  "prompts/get": "name",
  "resources/read": "uri",
};

// Streamable HTTP 2026-07-28 "Standard Request Headers": mirror method and params.name or params.uri.
function addMirroredHeaders(
  headers: Record<string, string>,
  revision: Scenario["specRevision"],
  message: JsonValue | undefined,
  body: Buffer,
): void {
  if (scenarioIsLegacy(revision)) {
    return;
  }
  let value: unknown = message;
  if (value === undefined) {
    try {
      value = JSON.parse(body.toString("utf8")) as unknown;
    } catch {
      return;
    }
  }
  if (!isRecord(value) || typeof value.method !== "string") {
    return;
  }
  if (isPlainHeaderValue(value.method)) {
    headers["Mcp-Method"] = value.method;
  }
  const nameField = NAME_HEADER_METHODS[value.method];
  const params = value.params;
  if (nameField !== undefined && isRecord(params) && typeof params[nameField] === "string") {
    headers["Mcp-Name"] = encodeHeaderValue(params[nameField]);
  }
}

function isPlainHeaderValue(value: string): boolean {
  return /^[\x21-\x7E](?:[\x20-\x7E\t]*[\x21-\x7E])?$/u.test(value)
    && !(value.startsWith("=?base64?") && value.endsWith("?="));
}

function encodeHeaderValue(value: string): string {
  return isPlainHeaderValue(value) ? value : `=?base64?${Buffer.from(value, "utf8").toString("base64")}?=`;
}

function applyHeaderFault(
  headers: Record<string, string>,
  fault: string | undefined,
  revision: Scenario["specRevision"],
): void {
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

function sendHttpRequest(
  url: URL,
  method: string,
  headers: Record<string, string>,
  body: Buffer,
  timeoutMs: number,
): Promise<HttpExchangeObservation> {
  const client = url.protocol === "https:" ? https : http;
  return new Promise((resolve, reject) => {
    let responseBody = Buffer.alloc(0);
    let settled = false;
    const request = client.request(url, { method, headers, timeout: timeoutMs }, (response) => {
      response.on("data", (chunk: Buffer) => {
        responseBody = Buffer.concat([responseBody, chunk]);
        if (responseBody.length > MAX_RESPONSE_BYTES) {
          request.destroy(new TransportError(`HTTP response exceeded ${MAX_RESPONSE_BYTES} bytes.`));
        }
      });
      response.once("aborted", () => {
        settled = true;
        resolve({
          requestMethod: method,
          requestHeaders: { ...headers },
          requestBody: body.toString("utf8"),
          responseStatus: response.statusCode ?? 0,
          responseHeaders: normalizeHeaders(response.headers),
          responseBody: responseBody.toString("utf8"),
          responseAborted: true,
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
        resolve({
        requestMethod: method,
        requestHeaders: { ...headers },
        requestBody: body.toString("utf8"),
        responseStatus: response.statusCode ?? 0,
        responseHeaders: normalizeHeaders(response.headers),
        responseBody: responseBody.toString("utf8"),
        });
      });
    });
    request.once("timeout", () => request.destroy(new TransportError("Timed out waiting for the HTTP response.")));
    request.once("error", (error) => {
      if (!settled) {
        settled = true;
        reject(error instanceof TransportError
          ? error
          : new TransportError(`HTTP request failed: ${error.message}`, { cause: error }));
      }
    });
    request.end(body);
  });
}

function buildRawRequest(
  url: URL,
  method: string,
  headers: Record<string, string>,
  body: Buffer,
  truncate: boolean,
): Buffer {
  const requestHeaders = { ...headers };
  requestHeaders.Connection = "close";
  requestHeaders["Content-Length"] = String(body.length + (truncate ? 20 : 0));
  const target = `${url.pathname}${url.search}`;
  const headerBytes = Buffer.from(
    `${method} ${target || "/"} HTTP/1.1\r\n`
      + `${Object.entries(requestHeaders).map(([key, value]) => `${key}: ${value}\r\n`).join("")}\r\n`,
    "utf8",
  );
  return Buffer.concat([headerBytes, body]);
}

function rawHttpRequest(
  url: URL,
  requestBytes: Buffer,
  timeoutMs: number,
  abortAfterHeaders: boolean,
): Promise<HttpExchangeObservation> {
  const port = Number(url.port) || (url.protocol === "https:" ? 443 : 80);
  return new Promise((resolve, reject) => {
    const socket = url.protocol === "https:"
      ? tls.connect({ host: url.hostname, port, servername: url.hostname })
      : net.createConnection({ host: url.hostname, port });
    const chunks: Buffer[] = [];
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
    socket.on("data", (chunk: Buffer) => {
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
          resolve(parseRawResponse(Buffer.concat(chunks)));
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
        resolve(parseRawResponse(Buffer.concat(chunks)));
      }
    });
    socket.once("close", () => {
      if (!settled) {
        settled = true;
        resolve(parseRawResponse(Buffer.concat(chunks)));
      }
    });
  });
}

function parseRawResponse(bytes: Buffer): HttpExchangeObservation {
  const separator = bytes.indexOf(Buffer.from("\r\n\r\n"));
  if (separator < 0) {
    return {
      requestMethod: "POST",
      requestHeaders: {},
      requestBody: "",
      responseStatus: 0,
      responseHeaders: {},
      responseBody: bytes.toString("utf8"),
    };
  }
  const headerText = bytes.subarray(0, separator).toString("latin1");
  const [statusLine = "", ...headerLines] = headerText.split("\r\n");
  const statusMatch = /^HTTP\/\d(?:\.\d)?\s+(\d{3})(?:\s+(.*))?$/u.exec(statusLine);
  const headers: Record<string, string> = {};
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
    responseStatus: statusMatch?.[1] === undefined ? 0 : Number(statusMatch[1]),
    responseHeaders: headers,
    responseBody: bytes.subarray(separator + 4).toString("utf8"),
  };
}

async function waitForSpawn(child: ChildProcess, spawnError: Error | undefined, timeoutMs: number): Promise<void> {
  if (spawnError !== undefined) {
    throw new TargetError(`Could not start target: ${spawnError.message}`, { cause: spawnError });
  }
  if (child.pid !== undefined) {
    return;
  }
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new TargetError("Timed out starting HTTP target.")), timeoutMs);
    child.once("spawn", () => {
      clearTimeout(timer);
      resolve();
    });
    child.once("error", (error) => {
      clearTimeout(timer);
      reject(new TargetError(`Could not start target: ${error.message}`, { cause: error }));
    });
  });
}

async function waitForHttpListener(url: URL, child: ChildProcess, timeoutMs: number): Promise<void> {
  const deadline = performance.now() + timeoutMs;
  const port = Number(url.port) || (url.protocol === "https:" ? 443 : 80);
  while (performance.now() < deadline) {
    if (child.exitCode !== null || child.signalCode !== null) {
      throw new TargetError("The spawned HTTP target exited before its endpoint became ready.");
    }
    const connected = await new Promise<boolean>((resolve) => {
      const socket = net.createConnection({ host: url.hostname, port });
      socket.once("connect", () => {
        socket.destroy();
        resolve(true);
      });
      socket.once("error", () => resolve(false));
      socket.setTimeout(250, () => {
        socket.destroy();
        resolve(false);
      });
    });
    if (connected) {
      return;
    }
    await new Promise<void>((resolve) => setTimeout(resolve, 50));
  }
  throw new TargetError(`HTTP target did not become ready at ${url.origin} within ${timeoutMs} ms.`);
}

function parseTargetUrl(value: string): URL {
  let url: URL;
  try {
    url = new URL(value);
  } catch (error) {
    throw new ScenarioError(`Invalid HTTP target URL: ${error instanceof Error ? error.message : String(error)}`);
  }
  if ((url.protocol !== "http:" && url.protocol !== "https:") || url.username !== "" || url.password !== "") {
    throw new ScenarioError("HTTP target URL must use HTTP(S) and must not contain credentials.");
  }
  return url;
}

function isLoopbackHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/gu, "");
  if (host === "localhost" || host === "::1") {
    return true;
  }
  const octets = host.split(".");
  return octets.length === 4 && Number(octets[0]) === 127
    && octets.every((octet) => /^\d{1,3}$/u.test(octet) && Number(octet) <= 255);
}

function parseSseData(body: string): string[] {
  const messages: string[] = [];
  let dataLines: string[] = [];
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

function getResponseTimeout(scenario: Scenario, message: JsonValue | undefined, fallback: number): number {
  if (!isRecord(message) || (typeof message.id !== "string" && typeof message.id !== "number")) {
    return fallback;
  }
  const responseStep = scenario.steps.find(
    (step): step is Extract<ScenarioStep, { type: "await-response" }> =>
      step.type === "await-response" && step.id === message.id,
  );
  return responseStep?.timeoutMs ?? fallback;
}

function parseRequestMessage(body: Buffer): JsonValue | undefined {
  try {
    const value: unknown = JSON.parse(body.toString("utf8"));
    return isJsonValue(value) ? value : undefined;
  } catch {
    return undefined;
  }
}

function parseJsonMessages(body: string, messages: JsonValue[]): void {
  try {
    const value: unknown = JSON.parse(body);
    if (isJsonValue(value)) {
      messages.push(value);
    }
  } catch {
    return;
  }
}

function normalizeHeaders(headers: http.IncomingHttpHeaders): Record<string, string | string[]> {
  const normalized: Record<string, string | string[]> = {};
  for (const [name, value] of Object.entries(headers)) {
    if (value !== undefined) {
      normalized[name.toLowerCase()] = value;
    }
  }
  return normalized;
}

function headerValue(headers: Record<string, string | string[]>, name: string): string | undefined {
  const value = headers[name.toLowerCase()];
  return Array.isArray(value) ? value[0] : value;
}

function redactHeaders(
  headers: Record<string, string | string[]>,
  env: Record<string, string> | undefined,
): Record<string, string | string[]> {
  const secrets = Object.values(env ?? {}).filter((value) => value.length > 0);
  const result: Record<string, string | string[]> = {};
  for (const [name, value] of Object.entries(headers)) {
    result[name.toLowerCase()] = Array.isArray(value)
      ? value.map((item) => redactString(item, secrets))
      : redactString(value, secrets);
  }
  if (result["mcp-session-id"] !== undefined) {
    result["mcp-session-id"] = "[redacted]";
  }
  return result;
}

function redactBuffer(value: Buffer, env: Record<string, string> | undefined): Buffer {
  return Buffer.from(redactString(value.toString("utf8"), Object.values(env ?? {}).filter((secret) => secret.length > 0)));
}

function redactString(value: string, secrets: string[]): string {
  return secrets.reduce((result, secret) => result.replaceAll(secret, "[redacted]"), value);
}

function scenarioIsLegacy(revision: Scenario["specRevision"]): boolean {
  return revision === "2025-11-25";
}

function isRecord(value: unknown): value is Record<string, JsonValue> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isJsonValue(value: unknown): value is JsonValue {
  if (value === null || typeof value === "string" || typeof value === "boolean") {
    return true;
  }
  if (typeof value === "number") {
    return Number.isFinite(value);
  }
  if (Array.isArray(value)) {
    return value.every(isJsonValue);
  }
  return isRecord(value) && Object.values(value).every(isJsonValue);
}

class HttpTraceRecorder {
  readonly #events: Array<TraceEvent & { order: number }> = [];
  readonly #secrets: string[];
  #order = 0;

  constructor(env: Record<string, string>, inheritEnvironment: boolean) {
    this.#secrets = [
      ...Object.values(env),
      ...(inheritEnvironment ? Object.values(process.env).filter((value): value is string => value !== undefined) : []),
    ].filter((value) => value.length > 0);
  }

  add(channel: TraceEvent["channel"], bytes: Buffer): void {
    this.#push(channel, Buffer.from(redactString(bytes.toString("utf8"), this.#secrets)));
  }

  addHttp(
    channel: "http-request" | "http-response",
    bytes: Buffer,
    metadata: NonNullable<TraceEvent["http"]>,
  ): void {
    const safeBytes = Buffer.from(redactString(bytes.toString("utf8"), this.#secrets));
    const safeMetadata = {
      ...metadata,
      headers: redactHeaders(metadata.headers, Object.fromEntries(this.#secrets.map((secret, index) => [`SECRET_${index}`, secret]))),
    };
    this.#push(channel, safeBytes, safeMetadata);
  }

  flush(): void {}

  eventCount(): number {
    return this.#events.length;
  }

  toTrace(scenarioId: string, revision: Scenario["specRevision"], fromIndex: number): Trace {
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
        ...(event.http === undefined ? {} : { http: event.http }),
      })),
    };
  }

  #push(channel: TraceEvent["channel"], bytes: Buffer, metadata?: NonNullable<TraceEvent["http"]>): void {
    const text = bytes.toString("utf8");
    const encoding = Buffer.from(text, "utf8").equals(bytes) ? "utf8" : "base64";
    const event: TraceEvent & { order: number } = {
      offsetMs: Math.max(0, performance.now() - this.#startedAt),
      channel,
      encoding,
      data: encoding === "utf8" ? text : bytes.toString("base64"),
      ...(metadata === undefined ? {} : { http: metadata }),
      order: this.#order++,
    };
    this.#events.push(event);
  }

  readonly #startedAt = performance.now();
}
