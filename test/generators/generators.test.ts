import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import type { JsonValue, Scenario } from "../../src/core/types.js";
import { assertScenarioSafety } from "../../src/core/safety.js";
import { generateToolArguments } from "../../src/generators/argument-strategies.js";
import { generateScenarios } from "../../src/generators/index.js";
import { inspectServer } from "../../src/cli/inspect.js";
import { specProfiles } from "../../src/spec/profiles.js";
import type { InspectedSurface } from "../../src/target/surface.js";

const fixture = resolve("fixtures/stdio-server.mjs");

describe.each(["2025-11-25", "2026-07-28"] as const)("scenario generators for %s", (revision) => {
  it("generates identical scenarios for a fixed seed", async () => {
    const surface = await inspectFixture(revision);
    const first = generateScenarios(revision, surface, 4_137, 32);
    const second = generateScenarios(revision, surface, 4_137, 32);
    expect(first).toEqual(second);
    expect(first).toHaveLength(32);
  });

  it("generates tool arguments and calls only read-only tools by default", async () => {
    const surface = await inspectFixture(revision);
    const scenarios = generateScenarios(revision, surface, 71, 64, ["tool-args"]);
    for (const scenario of scenarios) {
      assertScenarioSafety(scenario, surface);
      for (const step of scenario.steps) {
        if (step.type === "send" && isRecord(step.message) && step.message.method === "tools/call") {
          const params = step.message.params;
          expect(isRecord(params) ? params.name : undefined).toBe("search");
        }
      }
    }
  });

  it("generates arguments from the advertised JSON Schema", async () => {
    const surface = await inspectFixture(revision);
    const tool = surface.tools.find((candidate) => candidate.name === "search");
    const argumentsValue = generateToolArguments(tool?.name ?? "search", tool?.inputSchema, 119);
    if (!isRecord(argumentsValue)) {
      throw new Error("Expected generated tool arguments to be an object.");
    }
    expect(typeof argumentsValue.query).toBe("string");
  });

  it("refuses unapproved non-read-only tool calls, including malformed raw requests", async () => {
    const surface = await inspectFixture(revision);
    const profile = specProfiles.get(revision);
    const scenario: Scenario = {
      formatVersion: 1,
      id: `safety-${revision}`,
      specRevision: revision,
      steps: [
        {
          type: "send",
          message: profile.request("tools/call", "delete", { name: "delete-record", arguments: { id: "x" } }),
        },
      ],
    };
    expect(() => assertScenarioSafety(scenario, surface)).toThrow(/Safety policy refused tool/);
    expect(() => assertScenarioSafety(scenario, surface, { allowTools: ["delete-record"] })).not.toThrow();
    const malformedRaw: Scenario = {
      ...scenario,
      steps: [{
        type: "send-raw",
        bytesBase64: Buffer.from('{"jsonrpc":"2.0","id":"x","method":"tools/call","params":').toString("base64"),
      }],
    };
    expect(() => assertScenarioSafety(malformedRaw, surface)).toThrow(/unparseable raw bytes/);
  });
});

async function inspectFixture(revision: "2025-11-25" | "2026-07-28"): Promise<InspectedSurface> {
  return inspectServer(revision, process.execPath, [fixture, "--revision", revision]);
}

function isRecord(value: unknown): value is Record<string, JsonValue> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
