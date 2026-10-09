import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { inspectServer } from "../../src/cli/inspect.js";
import { TargetError } from "../../src/core/errors.js";
import type { Scenario, SpecRevision } from "../../src/core/types.js";
import { evaluateOracles } from "../../src/oracles/index.js";
import { specProfiles } from "../../src/spec/profiles.js";
import { runStdioScenario } from "../../src/transports/stdio/runner.js";

const fixturePath = resolve("fixtures/stdio-server.mjs");

describe.each(["2025-11-25", "2026-07-28"] as const)("stdio replay for %s", (revision) => {
  it("replays a hand-written tools/list scenario and records exact wire bytes", async () => {
    const profile = specProfiles.get(revision);
    const id = "tools-case";
    const steps = [
      ...profile.lifecycleSteps("lifecycle-case"),
      { type: "send" as const, message: profile.request("tools/list", id) },
      { type: "await-response" as const, id },
    ];
    const scenario: Scenario = {
      formatVersion: 1,
      id: `tools-list-${revision}`,
      specRevision: revision,
      steps,
    };
    const { trace, responses } = await runStdioScenario({
      command: process.execPath,
      args: [fixturePath, "--revision", revision],
      scenario,
    });

    const expectedInput = Buffer.concat(
      steps
        .filter((step) => step.type === "send")
        .map((step) => Buffer.from(`${JSON.stringify(step.message)}\n`)),
    );
    expect(Buffer.concat(trace.events.filter((event) => event.channel === "stdin").map(toBuffer))).toEqual(expectedInput);
    const expectedResult = {
      tools: [
        {
          name: "search",
          description: "Search fixture records.",
          inputSchema: {
            type: "object",
            properties: { query: { type: "string" } },
            required: ["query"],
          },
          annotations: { readOnlyHint: true },
        },
        {
          name: "delete-record",
          description: "Delete a fixture record.",
          inputSchema: { type: "object", properties: { id: { type: "string" } } },
          annotations: { destructiveHint: true },
        },
      ],
    };
    const result = revision === "2026-07-28"
      ? {
          ...expectedResult,
          _meta: { "io.modelcontextprotocol/serverInfo": { name: "mcp-wringer-fixture", version: "0.1.0" } },
          resultType: "complete",
          cacheScope: "public",
          ttlMs: 0,
        }
      : expectedResult;
    const responseLines = [
      ...(revision === "2025-11-25"
        ? [
            JSON.stringify({
              jsonrpc: "2.0",
              id: "lifecycle-case-initialize",
              result: {
                protocolVersion: "2025-11-25",
                capabilities: { tools: {}, resources: {}, prompts: {} },
                serverInfo: { name: "mcp-wringer-fixture", version: "0.1.0" },
              },
            }),
          ]
        : []),
      JSON.stringify({ jsonrpc: "2.0", id, result }),
    ];
    const expectedResponse = Buffer.from(`${responseLines.join("\n")}\n`);
    expect(Buffer.concat(trace.events.filter((event) => event.channel === "stdout").map(toBuffer))).toEqual(expectedResponse);
    expect(responses.at(-1)).toEqual({ jsonrpc: "2.0", id, result });
    expect(trace.events.some((event) => event.channel === "stderr")).toBe(false);
  });
});

describe.each(["2025-11-25", "2026-07-28"] as const)("stdio trace privacy for %s", (revision) => {
  it("redacts configured environment values from captured output", async () => {
    const scenario: Scenario = {
      formatVersion: 1,
      id: `redaction-${revision}`,
      specRevision: revision,
      steps: [],
    };
    const { trace } = await runStdioScenario({
      command: process.execPath,
      args: [fixturePath, "--revision", revision],
      env: {
        FIXTURE_EMIT_SECRET: "do-not-record-this-value",
        FIXTURE_EMIT_SECRET_SPLIT: "yes",
      },
      scenario,
    });
    expect(JSON.stringify(trace)).not.toContain("do-not-record-this-value");
    expect(trace.events.filter((event) => event.channel === "stderr").length).toBeGreaterThan(0);
  });

});

describe("stdio response ordering", () => {
  it("matches responses that arrive in a different order from their requests", async () => {
    const reverseResponder = [
      "const lines = [];",
      "let buffer = '';",
      "process.stdin.on('data', (chunk) => {",
      "  buffer += chunk;",
      "  let index;",
      "  while ((index = buffer.indexOf('\\n')) >= 0) {",
      "    lines.push(JSON.parse(buffer.slice(0, index)));",
      "    buffer = buffer.slice(index + 1);",
      "  }",
      "  if (lines.length === 2) {",
      "    for (const request of lines.reverse()) {",
      "      process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: request.id, result: {} }) + '\\n');",
      "    }",
      "  }",
      "});",
    ].join("\n");
    const request = (id: string) => ({ jsonrpc: "2.0" as const, id, method: "tools/list" });
    // No lifecycle step precedes these awaits, so the first one also covers target startup, which can
    // take several seconds on a loaded host. This test checks ordering, not latency.
    const scenario: Scenario = {
      formatVersion: 1,
      id: "out-of-order",
      specRevision: "2025-11-25",
      steps: [
        { type: "send", message: request("first") },
        { type: "send", message: request("second") },
        { type: "await-response", id: "first", timeoutMs: 15_000 },
        { type: "await-response", id: "second", timeoutMs: 2_000 },
      ],
    };
    const result = await runStdioScenario({
      command: process.execPath,
      args: ["-e", reverseResponder],
      scenario,
    });
    expect(result.outcome.failure).toBeUndefined();
    expect(result.responses).toEqual([
      { jsonrpc: "2.0", id: "first", result: {} },
      { jsonrpc: "2.0", id: "second", result: {} },
    ]);
  });
});

describe("stdio target exit classification", () => {
  it("reports a target that exits just after a response timeout as a crash, not a hang", async () => {
    // The target acknowledges its input, then exits 200 ms later, after the 50 ms response timeout
    // has fired. Timing starts from the acknowledgement so that target startup time is excluded.
    // This is the ordering a crashing target can produce on a heavily loaded host.
    const scenario: Scenario = {
      formatVersion: 1,
      id: "late-exit",
      specRevision: "2025-11-25",
      steps: [
        { type: "send-raw", bytesBase64: Buffer.from("{not-json}\n").toString("base64") },
        { type: "await-response", id: "ack", timeoutMs: 10_000 },
        { type: "await-response", id: "never", timeoutMs: 50 },
      ],
    };
    const result = await runStdioScenario({
      command: process.execPath,
      args: [
        "-e",
        "process.stdin.once('data', () => { process.stdout.write('{\"jsonrpc\":\"2.0\",\"id\":\"ack\",\"result\":{}}\\n'); setTimeout(() => process.exit(17), 200); }); setInterval(() => {}, 1000);",
      ],
      scenario,
    });
    expect(result.outcome.failure?.kind).toBe("target-exit");
    expect(result.outcome.exitCode).toBe(17);
    const ruleIds = evaluateOracles({ scenario, rules: specProfiles.get("2025-11-25").rules, ...result })
      .map((finding) => finding.ruleId);
    expect(ruleIds).toContain("crash.process-exit");
    expect(ruleIds).not.toContain("hang.request-timeout");
  });

  it("uses the configured timeout for await-response steps without their own timeout", async () => {
    // The target answers "late" 2.5 s after acknowledging its input. With the configured 1 s
    // timeout the step must time out. The old hard-coded 5 s default would have accepted the reply.
    const scenario: Scenario = {
      formatVersion: 1,
      id: "configured-timeout",
      specRevision: "2025-11-25",
      steps: [
        { type: "send-raw", bytesBase64: Buffer.from("{}\n").toString("base64") },
        { type: "await-response", id: "ack", timeoutMs: 15_000 },
        { type: "await-response", id: "late" },
      ],
    };
    const result = await runStdioScenario({
      command: process.execPath,
      args: [
        "-e",
        "process.stdin.once('data', () => { process.stdout.write('{\"jsonrpc\":\"2.0\",\"id\":\"ack\",\"result\":{}}\\n'); setTimeout(() => process.stdout.write('{\"jsonrpc\":\"2.0\",\"id\":\"late\",\"result\":{}}\\n'), 2500); }); setInterval(() => {}, 1000);",
      ],
      scenario,
      timeoutMs: 1_000,
    });
    expect(result.outcome.failure?.kind).toBe("timeout");
    expect(result.responses).toEqual([{ jsonrpc: "2.0", id: "ack", result: {} }]);
  });
});

describe("inherited environment trace privacy", () => {
  it("redacts values inherited from the caller environment", async () => {
    const previousSecret = process.env.FIXTURE_EMIT_SECRET;
    const previousSplit = process.env.FIXTURE_EMIT_SECRET_SPLIT;
    process.env.FIXTURE_EMIT_SECRET = "inherited-secret-value";
    process.env.FIXTURE_EMIT_SECRET_SPLIT = "yes";
    try {
      const scenario: Scenario = {
        formatVersion: 1,
        id: "inherited-redaction-2025-11-25",
        specRevision: "2025-11-25",
        steps: [],
      };
      const { trace } = await runStdioScenario({
        command: process.execPath,
        args: [fixturePath, "--revision", "2025-11-25"],
        inheritEnvironment: true,
        scenario,
      });
      expect(JSON.stringify(trace)).not.toContain("inherited-secret-value");
    } finally {
      if (previousSecret === undefined) {
        delete process.env.FIXTURE_EMIT_SECRET;
      } else {
        process.env.FIXTURE_EMIT_SECRET = previousSecret;
      }
      if (previousSplit === undefined) {
        delete process.env.FIXTURE_EMIT_SECRET_SPLIT;
      } else {
        process.env.FIXTURE_EMIT_SECRET_SPLIT = previousSplit;
      }
    }
  });
});

describe("inspect command surface", () => {
  it.each(["2025-11-25", "2026-07-28"] as const)(
    "lists tools, resources, and prompts for %s",
    async (revision: SpecRevision) => {
      const surface = await inspectServer(revision, process.execPath, [fixturePath, "--revision", revision]);
      expect(surface.tools).toEqual([
        {
          name: "search",
          safety: "read-only",
          inputSchema: {
            type: "object",
            properties: { query: { type: "string" } },
            required: ["query"],
          },
        },
        {
          name: "delete-record",
          safety: "requires-exact-name-allow",
          inputSchema: { type: "object", properties: { id: { type: "string" } } },
        },
      ]);
      expect(surface.resources).toEqual([{ name: "Welcome", uri: "fixture://welcome" }]);
      expect(surface.prompts).toEqual([{ name: "summarize" }]);
    },
  );

  it("reports the underlying target failure when inspection is cut short", async () => {
    const inspection = inspectServer("2025-11-25", process.execPath, ["-e", "process.exit(7)"]);
    await expect(inspection).rejects.toBeInstanceOf(TargetError);
    await expect(inspection).rejects.toThrow(/Target failed during inspection after 0 response\(s\): target-exit: .*exit code 7/u);
  });
});

function toBuffer(event: { encoding: "utf8" | "base64"; data: string }): Buffer {
  return event.encoding === "base64" ? Buffer.from(event.data, "base64") : Buffer.from(event.data, "utf8");
}
