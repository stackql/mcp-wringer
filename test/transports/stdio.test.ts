import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { inspectServer } from "../../src/cli/inspect.js";
import type { Scenario, SpecRevision } from "../../src/core/types.js";
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

});

function toBuffer(event: { encoding: "utf8" | "base64"; data: string }): Buffer {
  return event.encoding === "base64" ? Buffer.from(event.data, "base64") : Buffer.from(event.data, "utf8");
}
