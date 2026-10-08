import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import type { JsonValue, Scenario, ScenarioStep, SpecRevision } from "../../src/core/types.js";
import { evaluateOracles } from "../../src/oracles/index.js";
import { specProfiles } from "../../src/spec/profiles.js";
import { runStdioScenario } from "../../src/transports/stdio/runner.js";
import { executeFixture } from "./helpers.js";

const revisions = ["2025-11-25", "2026-07-28"] as const;

describe.each(revisions)("clean stdio fixture for %s", (revision) => {
  it("produces no findings", async () => {
    const context = await executeFixture(revision, cleanRequestSteps(revision));
    setLiveness(context, "liveness");
    expect(evaluateOracles(context)).toEqual([]);
  });

  it("accepts a JSON-RPC null-id error response to an unreadable request", async () => {
    const context = await executeFixture(revision, cleanRequestSteps(revision));
    setLiveness(context, "liveness");
    const stdoutEvent = context.trace.events.find((event) => event.channel === "stdout");
    if (stdoutEvent === undefined) {
      throw new Error("The clean fixture wrote no stdout.");
    }
    context.trace.events.push({
      ...stdoutEvent,
      encoding: "utf8",
      data: `${JSON.stringify({ jsonrpc: "2.0", id: null, error: { code: -32600, message: "Invalid Request" } })}\n`,
    });
    expect(evaluateOracles(context)).toEqual([]);
  });
});

describe("official MCP reference server", () => {
  it("produces no findings with the clean legacy profile", async () => {
    const revision: SpecRevision = "2025-11-25";
    const scenario: Scenario = {
      formatVersion: 1,
      id: "reference-server-clean-run",
      specRevision: revision,
      steps: [
        ...specProfiles.get(revision).lifecycleSteps("reference-lifecycle"),
        ...cleanRequestSteps(revision),
      ],
    };
    const result = await runStdioScenario({
      command: process.execPath,
      args: [resolve("node_modules", "@modelcontextprotocol", "server-everything", "dist", "index.js"), "stdio"],
      scenario,
    });
    const context = {
      scenario,
      ...result,
      rules: specProfiles.get(revision).rules,
    };
    setLiveness(context, "liveness");
    expect(evaluateOracles(context)).toEqual([]);
  }, 30_000);
});

function cleanRequestSteps(revision: SpecRevision): ScenarioStep[] {
  const profile = specProfiles.get(revision);
  const requests = [
    profile.livenessProbe("liveness"),
    profile.request(profile.toolListMethod, "tools-list"),
    profile.request(profile.resourceListMethod, "resources-list"),
    profile.request(profile.promptListMethod, "prompts-list"),
  ];
  return requests.flatMap((message) => {
    const id = getId(message);
    if (id === undefined) {
      throw new Error("Clean-run requests must have an id.");
    }
    return [
      { type: "send" as const, message },
      { type: "await-response" as const, id },
    ];
  });
}

function setLiveness(context: {
  responses: JsonValue[];
  livenessProbe?: { passed: boolean };
}, id: string): void {
  const response = context.responses.find((item) => getId(item) === id);
  context.livenessProbe = { passed: response !== undefined && !isErrorResponse(response) };
}

function getId(value: JsonValue): string | number | undefined {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return undefined;
  }
  const id = value.id;
  return typeof id === "string" || typeof id === "number" ? id : undefined;
}

function isErrorResponse(value: JsonValue): boolean {
  return typeof value === "object" && value !== null && !Array.isArray(value) && "error" in value;
}
