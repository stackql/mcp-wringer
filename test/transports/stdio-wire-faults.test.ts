import { describe, expect, it } from "vitest";
import type { ScenarioStep } from "../../src/core/types.js";
import { evaluateOracles } from "../../src/oracles/index.js";
import { specProfiles } from "../../src/spec/profiles.js";
import { executeFixture, requestSteps } from "../oracles/helpers.js";

const revisions = ["2025-11-25", "2026-07-28"] as const;
// Each defect below makes the fixture exit. Exiting closes stdout and ends the wait at once, so this
// only bounds how long a CPU-starved fixture may take to exit. It is not a latency assertion.
const crashWaitMs = 10_000;
const defectFaults = [
  "split-write",
  "coalesced-frames",
  "missing-newline",
  "doubled-newline",
  "crlf",
  "invalid-utf8",
  "byte-order-mark",
  "oversized-frame",
  "closed-mid-request",
  "slow-read",
] as const;

describe.each(revisions)("stdio wire handling for %s", (revision) => {
  it.each(defectFaults)("detects a fixture defect in the %s fault family", async (fault) => {
    const { steps, defect } = defectScenario(revision, fault);
    const context = await executeFixture(revision, steps, { defect, timeoutMs: 2_000 });
    const ruleIds = evaluateOracles(context).map((finding) => finding.ruleId);
    expect(ruleIds, JSON.stringify(context.outcome)).toContain("crash.process-exit");
  });

  it("accepts split writes with delays", async () => {
    const steps = requestSteps(revision, "tools/list", "split", undefined, 2_000);
    const send = steps[0];
    const awaitStep = steps[1];
    if (send?.type !== "send" || awaitStep?.type !== "await-response") {
      throw new Error("Expected a send step.");
    }
    const context = await executeFixture(revision, [
      { ...send, wire: { transport: "stdio", chunks: [1, 2, 3], delayMs: 1 } },
      awaitStep,
    ]);
    expect(evaluateOracles(context)).toEqual([]);
  });

  function defectScenario(
    revision: (typeof revisions)[number],
    fault: (typeof defectFaults)[number],
  ): { steps: ScenarioStep[]; defect: string } {
    const profile = specProfiles.get(revision);
    const request = profile.request("tools/list", `wire-${fault}`);
    const requestText = JSON.stringify(request);
    switch (fault) {
      case "split-write":
        return {
          defect: "whole-frame-write-only",
          steps: [
            { type: "send", message: request, wire: { transport: "stdio", chunks: [1, 2, 3], delayMs: 500 } },
            { type: "await-response", id: `wire-${fault}`, timeoutMs: crashWaitMs },
          ],
        };
      case "coalesced-frames": {
        const second = profile.request("resources/list", "wire-coalesced-second");
        return {
          defect: "one-frame-per-read",
          steps: [
            {
              type: "send-raw",
              bytesBase64: Buffer.from(`${requestText}\n${JSON.stringify(second)}\n`).toString("base64"),
            },
            { type: "await-response", id: `wire-${fault}`, timeoutMs: crashWaitMs },
            { type: "await-response", id: "wire-coalesced-second", timeoutMs: crashWaitMs },
          ],
        };
      }
      case "missing-newline":
        return {
          defect: "require-final-newline",
          steps: [
            { type: "send-raw", bytesBase64: Buffer.from(requestText).toString("base64") },
            { type: "transport", operation: "close-stdin" },
            { type: "await-response", id: `wire-${fault}`, timeoutMs: crashWaitMs },
          ],
        };
      case "doubled-newline":
        return {
          defect: "reject-empty-frame",
          steps: [
            { type: "send-raw", bytesBase64: Buffer.from(`${requestText}\n\n`).toString("base64") },
            { type: "await-response", id: `wire-${fault}`, timeoutMs: crashWaitMs },
          ],
        };
      case "crlf":
        return {
          defect: "reject-crlf",
          steps: [
            { type: "send-raw", bytesBase64: Buffer.from(`${requestText}\r\n`).toString("base64") },
            { type: "await-response", id: `wire-${fault}`, timeoutMs: crashWaitMs },
          ],
        };
      case "invalid-utf8":
        return {
          defect: "exit-on-decode-error",
          steps: [
            { type: "send-raw", bytesBase64: Buffer.from([0xff, 0x0a]).toString("base64") },
            ...requestSteps(revision, "tools/list", "after-invalid-utf8", undefined, crashWaitMs),
          ],
        };
      case "byte-order-mark":
        return {
          defect: "exit-on-decode-error",
          steps: [
            { type: "send-raw", bytesBase64: Buffer.from(`\uFEFF${requestText}\n`).toString("base64") },
            ...requestSteps(revision, "tools/list", "after-bom", undefined, crashWaitMs),
          ],
        };
      case "oversized-frame": {
        if (typeof request !== "object" || request === null || Array.isArray(request)) {
          throw new Error("Expected the profile to create an object request.");
        }
        const largeRequest = { ...request, padding: "x".repeat(70_000) };
        return {
          defect: "reject-oversized-frame",
          steps: [
            { type: "send-raw", bytesBase64: Buffer.from(`${JSON.stringify(largeRequest)}\n`).toString("base64") },
            { type: "await-response", id: `wire-${fault}`, timeoutMs: crashWaitMs },
          ],
        };
      }
      case "closed-mid-request":
        return {
          defect: "exit-on-partial-eof",
          steps: [
            { type: "send-raw", bytesBase64: Buffer.from("{").toString("base64") },
            { type: "transport", operation: "close-stdin" },
          ],
        };
      case "slow-read":
        return {
          defect: "partial-frame-timeout",
          steps: [
            { type: "send", message: request, wire: { transport: "stdio", chunks: [1], delayMs: 60 } },
            { type: "await-response", id: `wire-${fault}`, timeoutMs: crashWaitMs },
          ],
        };
    }
  }

  it("handles coalesced requests before awaiting either response", async () => {
    const first = requestSteps(revision, "tools/list", "coalesced-a");
    const second = requestSteps(revision, "resources/list", "coalesced-b");
    const context = await executeFixture(revision, [first[0]!, second[0]!, first[1]!, second[1]!]);
    expect(context.responses).toHaveLength(3);
    expect(evaluateOracles(context)).toEqual([]);
  });

  it("accepts a final frame without a newline when stdin closes", async () => {
    const message = specProfiles.get(revision).request("tools/list", "missing-newline");
    const steps: ScenarioStep[] = [
      { type: "send-raw", bytesBase64: Buffer.from(JSON.stringify(message)).toString("base64") },
      { type: "transport", operation: "close-stdin" },
      { type: "await-response", id: "missing-newline", timeoutMs: 2_000 },
    ];
    const context = await executeFixture(revision, steps);
    expect(evaluateOracles(context)).toEqual([]);
  });

  it("ignores an empty frame after a doubled newline", async () => {
    const message = specProfiles.get(revision).request("tools/list", "double-newline");
    const context = await executeFixture(revision, [
      { type: "send-raw", bytesBase64: Buffer.from(`${JSON.stringify(message)}\n\n`).toString("base64") },
      { type: "await-response", id: "double-newline" },
    ]);
    expect(evaluateOracles(context)).toEqual([]);
  });

  it("accepts CRLF-delimited frames", async () => {
    const message = specProfiles.get(revision).request("tools/list", "crlf");
    const context = await executeFixture(revision, [
      { type: "send-raw", bytesBase64: Buffer.from(`${JSON.stringify(message)}\r\n`).toString("base64") },
      { type: "await-response", id: "crlf" },
    ]);
    expect(evaluateOracles(context)).toEqual([]);
  });

  it("continues after invalid UTF-8 input", async () => {
    const valid = requestSteps(revision, "tools/list", "after-invalid-utf8");
    const context = await executeFixture(revision, [
      { type: "send-raw", bytesBase64: Buffer.from([0xff, 0x0a]).toString("base64") },
      ...valid,
    ]);
    expect(evaluateOracles(context)).toEqual([]);
  });

  it("continues after a byte order mark", async () => {
    const valid = requestSteps(revision, "tools/list", "after-bom");
    const message = specProfiles.get(revision).request("tools/list", "bom-frame");
    const context = await executeFixture(revision, [
      { type: "send-raw", bytesBase64: Buffer.from(`\uFEFF${JSON.stringify(message)}\n`).toString("base64") },
      ...valid,
    ]);
    expect(evaluateOracles(context)).toEqual([]);
  });

  it("handles a large valid frame", async () => {
    const request = specProfiles.get(revision).request("tools/list", "oversized-frame");
    if (typeof request !== "object" || request === null || Array.isArray(request)) {
      throw new Error("Expected the profile to create an object request.");
    }
    const message = { ...request, padding: "x".repeat(70_000) };
    const context = await executeFixture(revision, [
      { type: "send-raw", bytesBase64: Buffer.from(`${JSON.stringify(message)}\n`).toString("base64") },
      { type: "await-response", id: "oversized-frame", timeoutMs: 2_000 },
    ]);
    expect(evaluateOracles(context)).toEqual([]);
  });

  it("closes stdin while a partial frame is pending", async () => {
    const context = await executeFixture(revision, [
      { type: "send-raw", bytesBase64: Buffer.from("{").toString("base64") },
      { type: "transport", operation: "close-stdin" },
    ]);
    expect(context.outcome.failure).toBeUndefined();
    expect(evaluateOracles(context)).toEqual([]);
  });
});
