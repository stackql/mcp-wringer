import { describe, expect, it } from "vitest";
import { ScenarioError } from "../../src/core/errors.js";
import { createReproducer } from "../../src/core/reproducer.js";
import { validateReproducer, validateScenario } from "../../src/core/scenario.js";
import type { Scenario } from "../../src/core/types.js";

describe("scenario model", () => {
  it("accepts raw bytes and transport-tagged wire descriptors", () => {
    const scenario: Scenario = {
      formatVersion: 1,
      id: "wire-case",
      specRevision: "2025-11-25",
      steps: [
        { type: "send", message: { jsonrpc: "2.0", id: 1, method: "tools/list" } },
        { type: "send-raw", bytesBase64: "e30K", wire: { transport: "stdio", chunks: [1, 2], delayMs: 1 } },
        { type: "transport", operation: "close-stdin" },
        { type: "delay", durationMs: 2 },
      ],
    };
    expect(() => validateScenario(scenario)).not.toThrow();
  });

  it("rejects malformed base64 and unknown step types", () => {
    expect(() => validateScenario({
      formatVersion: 1,
      id: "bad",
      specRevision: "2026-07-28",
      steps: [{ type: "send-raw", bytesBase64: "not base64!" }],
    })).toThrow(ScenarioError);
    expect(() => validateScenario({
      formatVersion: 1,
      id: "bad",
      specRevision: "2026-07-28",
      steps: [{ type: "sleep" }],
    })).toThrow(ScenarioError);
  });

  it("validates a versioned reproducer without accepting environment values", () => {
    const scenario: Scenario = {
      formatVersion: 1,
      id: "case-1",
      specRevision: "2026-07-28",
      steps: [{ type: "send", message: { jsonrpc: "2.0", id: 1, method: "tools/list" } }],
    };
    const reproducer = createReproducer(scenario, {
      command: "node",
      args: ["fixture.mjs"],
      environmentNames: ["TOKEN", "MODE", "TOKEN"],
    });
    validateReproducer(reproducer);
    expect(reproducer.target.environmentNames).toEqual(["MODE", "TOKEN"]);
    expect(JSON.stringify(reproducer)).not.toContain("secret");
    expect(() => validateReproducer({
      ...reproducer,
      target: { ...reproducer.target, TOKEN: "secret" },
    })).toThrow(ScenarioError);
  });
});
