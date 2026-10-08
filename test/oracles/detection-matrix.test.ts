import { describe, expect, it } from "vitest";
import type { JsonValue, ScenarioStep } from "../../src/core/types.js";
import { evaluateOracles } from "../../src/oracles/index.js";
import type { OracleContext } from "../../src/oracles/types.js";
import { specProfiles } from "../../src/spec/profiles.js";
import { executeFixture, requestSteps } from "./helpers.js";

const revisions = ["2025-11-25", "2026-07-28"] as const;

describe.each(revisions)("stdio oracle detection for %s", (revision) => {
  it("detects a process exit after malformed JSON", async () => {
    const steps: ScenarioStep[] = [
      { type: "send-raw", bytesBase64: Buffer.from("{not-json}\n").toString("base64") },
      ...requestSteps(revision, "tools/list", "after-decode-error"),
    ];
    const context = await executeFixture(revision, steps, { defect: "exit-on-decode-error" });
    expectRule(context, "crash.process-exit");
    expect(context.outcome.exitCode).toBe(17);
  });

  it("detects a request that times out", async () => {
    const steps = requestSteps(revision, "fixture/hang", "hang-case", undefined, 60);
    const context = await executeFixture(revision, steps, { defect: "hang-on-request" });
    expectRule(context, "hang.request-timeout");
    expect(context.outcome.failure?.phase).toBe("response");
  });

  it("detects a failed revision-specific liveness probe", async () => {
    const profile = specProfiles.get(revision);
    const steps = [
      ...requestSteps(revision, "fixture/break-liveness", "break-liveness"),
      { type: "send" as const, message: profile.livenessProbe("liveness-probe") },
      { type: "await-response" as const, id: "liveness-probe" },
    ];
    const context = await executeFixture(revision, steps, { defect: "break-liveness" });
    const probeResponse = context.responses.find((response) => getId(response) === "liveness-probe");
    context.livenessProbe = {
      passed: !isErrorResponse(probeResponse),
      evidence: context.trace.events.filter((event) => event.channel === "stdout"),
    };
    expectRule(context, "liveness.probe-failed");
  });

  it("detects a changed baseline response", async () => {
    const steps = [
      ...requestSteps(revision, "tools/list", "baseline-before"),
      ...requestSteps(revision, "fixture/mutate-state", "mutate-state"),
      ...requestSteps(revision, "tools/list", "baseline-after"),
    ];
    const context = await executeFixture(revision, steps, { defect: "mutate-state" });
    context.baselineComparison = {
      before: responseResult(context, "baseline-before"),
      after: responseResult(context, "baseline-after"),
    };
    expectRule(context, "state-consistency.baseline-changed");
  });

  it("detects non-protocol stdout", async () => {
    const context = await executeFixture(
      revision,
      requestSteps(revision, "tools/list", "stdout-pollution"),
      { defect: "stdout-pollution" },
    );
    expectRule(context, "stdout-pollution.non-protocol-bytes");
  });

  it("detects an unmatched response id without misclassifying it as a hang", async () => {
    const context = await executeFixture(
      revision,
      requestSteps(revision, "tools/list", "wrong-id"),
      { defect: "wrong-response-id" },
    );
    expectRule(context, "jsonrpc-contract.invalid-message");
    expect(evaluateOracles(context).some((finding) => finding.ruleId === "hang.request-timeout")).toBe(false);
  });

  it("validates method-specific results against the vendored schema", async () => {
    const context = await executeFixture(
      revision,
      requestSteps(revision, "tools/list", "bad-schema"),
      { defect: "invalid-schema" },
    );
    expectRule(context, "schema-response.invalid-result");
  });

  it("detects a wrong spec-defined error code", async () => {
    const id = "bad-envelope";
    const context = await executeFixture(revision, [
      {
        type: "send",
        message: { jsonrpc: "1.0", id, method: "tools/list" },
      },
      { type: "await-response", id },
    ], { defect: "wrong-error-code" });
    context.expectedErrors = [{ id, code: context.rules.errorCodes.invalidRequest }];
    expectRule(context, "error-code.unexpected-code");
  });

  it("detects an exposed stack frame or absolute path", async () => {
    const context = await executeFixture(
      revision,
      requestSteps(revision, "fixture/unknown-method", "leaked-error"),
      { defect: "error-leak" },
    );
    expectRule(context, "error-leak.sensitive-detail");
  });

  it("reports success for malformed input as informational", async () => {
    const id = "malformed-request";
    const context = await executeFixture(revision, [
      { type: "send", message: { id, method: "tools/list" } },
      { type: "await-response", id },
    ], { defect: "accepts-malformed" });
    expectRule(context, "accepted-malformed.success-response");
    expect(evaluateOracles(context).find((finding) =>
      finding.ruleId === "accepted-malformed.success-response")?.severity).toBe("info");
  });

  it("reports an output-size outlier without treating it as a violation", async () => {
    const context = await executeFixture(
      revision,
      requestSteps(revision, "fixture/large", "large-response", undefined, 4_000),
      { defect: "large-response" },
    );
    expectRule(context, "resource-usage.outlier");
    expect(evaluateOracles(context).find((finding) =>
      finding.ruleId === "resource-usage.outlier")?.severity).toBe("info");
  });
});

function expectRule(context: OracleContext, ruleId: string): void {
  const findings = evaluateOracles(context);
  expect(findings.map((finding) => finding.ruleId)).toContain(ruleId);
  expect(findings.find((finding) => finding.ruleId === ruleId)?.cite).not.toHaveLength(0);
}

function responseResult(context: OracleContext, id: string): JsonValue {
  const response = context.responses.find((item) => getId(item) === id);
  if (response === undefined || typeof response !== "object" || response === null || Array.isArray(response)
    || !("result" in response) || response.result === undefined) {
    throw new Error(`No result response was recorded for ${id}. Responses: ${JSON.stringify(context.responses)}; outcome: ${JSON.stringify(context.outcome)}.`);
  }
  return response.result;
}

function getId(value: JsonValue): string | number | undefined {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return undefined;
  }
  const id = value.id;
  return typeof id === "string" || typeof id === "number" ? id : undefined;
}

function isErrorResponse(value: JsonValue | undefined): boolean {
  return typeof value === "object" && value !== null && !Array.isArray(value) && "error" in value;
}
