import { createServer } from "node:http";
import net from "node:net";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { runFuzz, runSingleScenario } from "../../src/core/run.js";
import { TargetError } from "../../src/core/errors.js";
import { inspectServer } from "../../src/cli/inspect.js";
import { createReproducer, loadReproducer, saveReproducer } from "../../src/core/reproducer.js";
import type { JsonValue, Scenario, ScenarioStep, SpecRevision } from "../../src/core/types.js";
import { specProfiles } from "../../src/spec/profiles.js";
import type { InspectedSurface } from "../../src/target/surface.js";
import { HttpScenarioSession } from "../../src/transports/http/runner.js";

const httpFixture = resolve("fixtures/http-server.mjs");
const stdioFixture = resolve("fixtures/stdio-server.mjs");
const revisions = ["2025-11-25", "2026-07-28"] as const;
const emptySurface: InspectedSurface = {
  specRevision: "2025-11-25",
  tools: [],
  resources: [],
  prompts: [],
};
const httpDefectCases = [
  {
    defect: "exit-on-decode-error",
    ruleId: "crash.process-exit",
    steps: [{ type: "send-raw" as const, bytesBase64: Buffer.from("{not-json}").toString("base64") }],
  },
  {
    defect: "hang-on-request",
    ruleId: "hang.request-timeout",
    steps: (revision: SpecRevision) => requestSteps(revision, "fixture/hang", "hang-case"),
  },
  {
    defect: "break-liveness",
    ruleId: "liveness.probe-failed",
    steps: (revision: SpecRevision) => requestSteps(revision, "fixture/break-liveness", "break-live"),
  },
  {
    defect: "mutate-state",
    ruleId: "state-consistency.baseline-changed",
    steps: (revision: SpecRevision) => requestSteps(revision, "fixture/mutate-state", "mutate-state"),
  },
  {
    defect: "wrong-response-id",
    ruleId: "jsonrpc-contract.invalid-message",
    steps: (revision: SpecRevision) => requestSteps(revision, "tools/list", "wrong-id"),
  },
  {
    defect: "invalid-schema",
    ruleId: "schema-response.invalid-result",
    steps: (revision: SpecRevision) => requestSteps(revision, "tools/list", "bad-schema"),
  },
  {
    defect: "wrong-error-code",
    ruleId: "error-code.unexpected-code",
    steps: [{ type: "send" as const, message: { jsonrpc: "1.0", id: "bad-code", method: "tools/list" } },
      { type: "await-response" as const, id: "bad-code" }],
  },
  {
    defect: "error-leak",
    ruleId: "error-leak.sensitive-detail",
    steps: (revision: SpecRevision) => requestSteps(revision, "fixture/unknown-method", "leaked-error"),
  },
  {
    defect: "accepts-malformed",
    ruleId: "accepted-malformed.success-response",
    steps: [{ type: "send" as const, message: { id: "accepted-malformed", method: "tools/list" } },
      { type: "await-response" as const, id: "accepted-malformed" }],
  },
  {
    defect: "large-response",
    ruleId: "resource-usage.outlier",
    steps: (revision: SpecRevision) => requestSteps(revision, "fixture/large", "large-response"),
  },
  {
    defect: "http-invalid-media-type",
    ruleId: "http.response-media-type",
    steps: (revision: SpecRevision) => requestSteps(revision, "tools/list", "bad-media-type"),
  },
  {
    defect: "http-invalid-response-body",
    ruleId: "http.response-body-invalid",
    steps: (revision: SpecRevision) => requestSteps(revision, "tools/list", "bad-http-body"),
  },
  {
    defect: "respond-to-notification",
    ruleId: "http.notification-response",
    steps: (revision: SpecRevision) => requestSteps(revision, "tools/list", "notification-response"),
  },
];

describe.each(revisions)("Streamable HTTP transport on %s", (revision) => {
  it("spawns the fixture, observes revision headers, and handles optional HTTP sessions", async () => {
    const target = await fixtureTarget(revision);
    const profile = specProfiles.get(revision);
    const scenario = createScenario(revision, "header-observation", [
      ...profile.lifecycleSteps("header-lifecycle"),
      { type: "send", message: profile.request(profile.toolListMethod, "header-tools") },
      { type: "await-response", id: "header-tools" },
    ]);
    const session = new HttpScenarioSession({ ...target, scenario });
    const result = await session.execute(scenario);
    const protocolHeader = result.httpExchanges[0]?.requestHeaders["mcp-protocol-version"];
    expect(protocolHeader).toBe(revision);
    if (revision === "2025-11-25") {
      expect(result.httpExchanges.some((exchange) =>
        exchange.requestHeaders["mcp-session-id"] === "[redacted]")).toBe(true);
    } else {
      expect(result.httpExchanges.every((exchange) =>
        exchange.requestHeaders["mcp-session-id"] === undefined)).toBe(true);
    }
    expect(result.responses.some((response) => getId(response) === "header-tools")).toBe(true);
  });

  it("replays a no-wire-fault reproducer equivalently over stdio and HTTP", async () => {
    const httpTarget = await fixtureTarget(revision);
    const reproducerDirectory = await mkdtemp(join(tmpdir(), "mcp-wringer-http-reproducer-"));
    const stdioTarget = {
      transport: "stdio" as const,
      command: process.execPath,
      args: [stdioFixture, "--revision", revision],
    };
    const profile = specProfiles.get(revision);
    const scenario = createScenario(revision, "cross-transport", [
      ...profile.lifecycleSteps("cross-transport-lifecycle"),
      { type: "send", message: profile.request(profile.toolListMethod, "cross-transport-tools") },
      { type: "await-response", id: "cross-transport-tools" },
    ]);
    try {
      const stdioPath = join(reproducerDirectory, "stdio.repro.json");
      await saveReproducer(stdioPath, createReproducer(scenario, stdioTarget));
      const recordedOnStdio = await loadReproducer(stdioPath);
      const stdio = await runSingleScenario({
        ...stdioTarget,
        revision,
        scenario: recordedOnStdio.scenario,
        surface: withRevision(revision),
      });
      const http = await runSingleScenario({
        ...httpTarget,
        revision,
        scenario: recordedOnStdio.scenario,
        surface: withRevision(revision),
      });
      expect(http.result.responses).toEqual(stdio.result.responses);
      expect(http.findings.map((finding) => finding.ruleId)).toEqual(stdio.findings.map((finding) => finding.ruleId));
      expect(http.result.trace.transport).toBe("streamable-http");
      expect(stdio.result.trace.transport).toBe("stdio");

      const httpPath = join(reproducerDirectory, "http.repro.json");
      await saveReproducer(httpPath, createReproducer(scenario, httpTarget));
      const recordedOnHttp = await loadReproducer(httpPath);
      const reverseStdio = await runSingleScenario({
        ...stdioTarget,
        revision,
        scenario: recordedOnHttp.scenario,
        surface: withRevision(revision),
      });
      const reverseHttp = await runSingleScenario({
        ...httpTarget,
        revision,
        scenario: recordedOnHttp.scenario,
        surface: withRevision(revision),
      });
      expect(reverseStdio.result.responses).toEqual(reverseHttp.result.responses);
      expect(reverseStdio.findings.map((finding) => finding.ruleId))
        .toEqual(reverseHttp.findings.map((finding) => finding.ruleId));
    } finally {
      await rm(reproducerDirectory, { recursive: true, force: true });
    }
  });

  it("passes the HTTP quick clean-run gate across all generated HTTP wire faults", async () => {
    const target = await fixtureTarget(revision);
    const corpusDirectory = await mkdtemp(join(tmpdir(), "mcp-wringer-http-corpus-"));
    try {
      const result = await runFuzz({
        ...target,
        revision,
        seed: 12_005,
        cases: 18,
        durationMs: 90_000,
        confirmations: 1,
        surface: withRevision(revision),
        corpusDirectory,
      });
      expect(result.casesRun).toBe(18);
      expect(result.findings).toEqual([]);
    } finally {
      await rm(corpusDirectory, { recursive: true, force: true });
    }
  }, 120_000);

  it("uses the await-response timeout instead of the longer transport timeout", async () => {
    const target = await fixtureTarget(revision, "hang-on-request");
    const scenario = createScenario(revision, "http-request-timeout", [
      ...specProfiles.get(revision).lifecycleSteps("http-timeout-lifecycle"),
      ...requestSteps(revision, "tools/list", "http-timeout"),
    ]);
    const result = await new HttpScenarioSession({ ...target, scenario, timeoutMs: 5_000 }).execute(scenario);
    expect(result.outcome.failure?.kind).toBe("timeout");
    expect(result.outcome.durationMs).toBeLessThan(2_000);
  }, 10_000);

  it.each([
    ...httpDefectCases.filter((testCase) =>
      testCase.defect !== "respond-to-notification" || revision === "2025-11-25"),
  ])("detects $defect as $ruleId", async ({ defect, ruleId, steps }) => {
    const target = await fixtureTarget(revision, defect);
    const scenario = createScenario(revision, `http-${defect}`, [
      ...specProfiles.get(revision).lifecycleSteps(`http-${defect}-lifecycle`),
      ...(typeof steps === "function" ? steps(revision) : steps),
    ]);
    const result = await runSingleScenario({
      ...target,
      revision,
      scenario,
      surface: withRevision(revision),
      timeoutMs: 350,
    });
    expect(result.findings.map((finding) => finding.ruleId)).toContain(ruleId);
    expect(result.findings.find((finding) => finding.ruleId === ruleId)?.cite).not.toHaveLength(0);
  }, 15_000);
});

it("supports attach mode on loopback and refuses non-loopback URLs by default", async () => {
  const server = createServer((request, response) => {
    const chunks: Buffer[] = [];
    request.on("data", (chunk: Buffer) => chunks.push(chunk));
    request.on("end", () => {
      const message = JSON.parse(Buffer.concat(chunks).toString("utf8")) as {
        id?: string | number;
        method?: string;
      };
      if (message.method === "notifications/initialized") {
        response.writeHead(202).end();
        return;
      }
      const result = message.method === "initialize"
        ? {
          protocolVersion: "2025-11-25",
          capabilities: {},
          serverInfo: { name: "attached-fixture", version: "1" },
        }
        : { tools: [] };
      response.writeHead(200, {
        "Content-Type": "application/json",
        ...(message.method === "initialize" ? { "MCP-Session-Id": "attach-session" } : {}),
      }).end(JSON.stringify({ jsonrpc: "2.0", id: message.id, result }));
    });
  });
  await new Promise<void>((resolveListen, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolveListen);
  });
  const address = server.address();
  if (address === null || typeof address === "string") {
    throw new Error("HTTP attach fixture did not bind a TCP address.");
  }
  try {
    const revision: SpecRevision = "2025-11-25";
    const profile = specProfiles.get(revision);
    const scenario = createScenario(revision, "attach-loopback", [
      ...profile.lifecycleSteps("attach-lifecycle"),
      { type: "send", message: profile.request("tools/list", "attached-tools") },
      { type: "await-response", id: "attached-tools" },
    ]);
    const result = await runSingleScenario({
      transport: "streamable-http",
      url: `http://127.0.0.1:${address.port}/mcp`,
      revision,
      scenario,
      surface: withRevision(revision),
    });
    expect(result.result.responses.some((response) => getId(response) === "attached-tools")).toBe(true);
    expect(() => new HttpScenarioSession({
      transport: "streamable-http",
      url: "https://example.com/mcp",
      scenario,
    })).toThrow(TargetError);
  } finally {
    await new Promise<void>((resolveClose, reject) => {
      server.close((error) => error ? reject(error) : resolveClose());
    });
  }
}, 15_000);

it("surfaces JSON-RPC error bodies sent with HTTP error statuses", async () => {
  const seenHeaders: Array<Record<string, string | string[] | undefined>> = [];
  const server = createServer((request, response) => {
    seenHeaders.push(request.headers);
    const chunks: Buffer[] = [];
    request.on("data", (chunk: Buffer) => chunks.push(chunk));
    request.on("end", () => {
      const message = JSON.parse(Buffer.concat(chunks).toString("utf8")) as { id?: string | number };
      const id = request.headers["mcp-method"] === "tools/list" ? message.id : null;
      response.writeHead(400, { "Content-Type": "application/json" }).end(JSON.stringify({
        jsonrpc: "2.0",
        id,
        error: { code: -32022, message: "unsupported protocol version" },
      }));
    });
  });
  await new Promise<void>((resolveListen, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolveListen);
  });
  const address = server.address();
  if (address === null || typeof address === "string") {
    throw new Error("HTTP rejection fixture did not bind a TCP address.");
  }
  const url = `http://127.0.0.1:${address.port}/mcp`;
  try {
    const revision: SpecRevision = "2026-07-28";
    await expect(inspectServer(revision, { transport: "streamable-http", url }))
      .rejects.toThrow(/rejected inspection.*-32022/u);
    const profile = specProfiles.get(revision);
    const scenario = createScenario(revision, "http-null-id-error", [
      { type: "send", message: profile.request("resources/list", "unknown-id") },
      { type: "await-response", id: "unknown-id", timeoutMs: 300 },
    ]);
    const result = await runSingleScenario({
      transport: "streamable-http",
      url,
      revision,
      scenario,
      surface: withRevision(revision),
    });
    expect(result.result.responses.some((response) => isNullIdError(response))).toBe(true);
    expect(result.findings.map((finding) => finding.ruleId)).not.toContain("jsonrpc-contract.invalid-message");
    seenHeaders.length = 0;
    const toolCall = createScenario(revision, "http-mirrored-headers", [
      {
        type: "send",
        message: profile.request("prompts/get", "call-1", { name: "naïve prompt" }),
      },
      { type: "await-response", id: "call-1", timeoutMs: 300 },
    ]);
    await runSingleScenario({ transport: "streamable-http", url, revision, scenario: toolCall, surface: withRevision(revision) });
    const promptHeaders = seenHeaders.find((headers) => headers["mcp-method"] === "prompts/get");
    expect(promptHeaders?.["mcp-name"]).toBe(`=?base64?${Buffer.from("naïve prompt").toString("base64")}?=`);
  } finally {
    await new Promise<void>((resolveClose, reject) => {
      server.close((error) => error ? reject(error) : resolveClose());
    });
  }
}, 15_000);

async function fixtureTarget(
  revision: SpecRevision,
  defect?: string,
): Promise<{
  transport: "streamable-http";
  url: string;
  command: string;
  args: string[];
  env?: Record<string, string>;
}> {
  const port = await reservePort();
  return {
    transport: "streamable-http",
    url: `http://127.0.0.1:${port}/mcp`,
    command: process.execPath,
    args: [httpFixture, "--revision", revision, "--port", String(port)],
    ...(defect === undefined ? {} : { env: { MCP_WRINGER_DEFECTS: defect } }),
  };
}

async function reservePort(): Promise<number> {
  const server = net.createServer();
  await new Promise<void>((resolveListen, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolveListen);
  });
  const address = server.address();
  if (address === null || typeof address === "string") {
    throw new Error("Could not reserve a fixture port.");
  }
  await new Promise<void>((resolveClose, reject) => {
    server.close((error) => error ? reject(error) : resolveClose());
  });
  return address.port;
}

function requestSteps(
  revision: SpecRevision,
  method: string,
  id: string,
): ScenarioStep[] {
  const profile = specProfiles.get(revision);
  return [
    { type: "send", message: profile.request(method, id) },
    { type: "await-response", id, timeoutMs: 300 },
  ];
}

function createScenario(revision: SpecRevision, id: string, steps: ScenarioStep[]): Scenario {
  return { formatVersion: 1, id, specRevision: revision, steps };
}

function isNullIdError(value: JsonValue): boolean {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    && value.id === null && typeof value.error === "object";
}

function withRevision(revision: SpecRevision): InspectedSurface {
  return { ...emptySurface, specRevision: revision };
}

function getId(value: JsonValue): string | number | undefined {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return undefined;
  }
  const id = value.id;
  return typeof id === "string" || typeof id === "number" ? id : undefined;
}
