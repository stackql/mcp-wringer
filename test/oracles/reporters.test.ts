import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { Ajv2020, type AnySchemaObject } from "ajv/dist/2020.js";
import { renderReport, reporterRegistry } from "../../src/reporters/index.js";
import { evaluateOracles } from "../../src/oracles/index.js";
import { executeFixture, requestSteps } from "./helpers.js";
import { specProfiles } from "../../src/spec/profiles.js";

describe("oracle finding reports", () => {
  it("deduplicates equivalent findings and keeps an occurrence count", async () => {
    const profile = specProfiles.get("2025-11-25");
    const context = await executeFixture("2025-11-25", [
      { type: "send", message: profile.request("tools/list", "wrong-a") },
      { type: "send", message: profile.request("tools/list", "wrong-b") },
      { type: "await-response", id: "wrong-a", timeoutMs: 80 },
    ], { defect: "wrong-response-id" });
    const finding = evaluateOracles(context).find((item) => item.ruleId === "jsonrpc-contract.invalid-message");
    expect(finding?.occurrences).toBe(2);
    expect(finding?.id).toMatch(/^[a-f0-9]{64}$/);
    expect(finding?.evidence.every((item) => item.originalLengthBytes > 0 && item.sha256.length === 64)).toBe(true);
  });

  it("renders deterministic JSON and severity-ordered console output", async () => {
    const context = await executeFixture("2025-11-25", requestSteps("2025-11-25", "tools/list", "wrong-id"), {
      defect: "wrong-response-id",
    });
    const findings = evaluateOracles(context);
    const json = renderReport("json", findings);
    expect(renderReport("json", [...findings].reverse())).toBe(json);
    expect(JSON.parse(json)).toMatchObject({
      formatVersion: 1,
      findings: [{ ruleId: "jsonrpc-contract.invalid-message", cite: expect.any(String) }],
    });
    expect(renderReport("console", findings)).toContain("MEDIUM jsonrpc-contract.invalid-message");
    expect(reporterRegistry.names()).toEqual(["console", "json", "junit", "markdown", "sarif"]);
  });

  it("renders SARIF 2.1.0 accepted by the official schema", async () => {
    const context = await executeFixture("2025-11-25", requestSteps("2025-11-25", "tools/list", "sarif"), {
      defect: "wrong-response-id",
    });
    const findings = evaluateOracles(context);
    const schemaText = await readFile(new URL("../schemas/sarif-schema-2.1.0.json", import.meta.url), "utf8");
    const schema = JSON.parse(schemaText) as AnySchemaObject & { id?: string };
    const schemaId = schema.id;
    if (schemaId === undefined) {
      throw new Error("The vendored SARIF schema has no ID.");
    }
    delete schema.id;
    schema.$id = schemaId;
    schema.$schema = "https://json-schema.org/draft/2020-12/schema";
    const validate = new Ajv2020({ allErrors: true, strict: false }).compile(schema);

    expect(validate(JSON.parse(renderReport("sarif", findings)) as unknown)).toBe(true);
    expect(reporterRegistry.get("junit").render(findings)).toContain("<testsuites");
    expect(reporterRegistry.get("markdown").render(findings)).toContain("| Severity | Rule |");
    expect(reporterRegistry.names()).toEqual(["console", "json", "junit", "markdown", "sarif"]);
  });

  it("honors oracle selection and rule severity overrides", async () => {
    const context = await executeFixture("2025-11-25", requestSteps("2025-11-25", "tools/list", "override"), {
      defect: "wrong-response-id",
    });
    const selected = evaluateOracles(context, [{
      name: "jsonrpc-contract",
      enabled: true,
      severityOverrides: { "jsonrpc-contract.invalid-message": "low" },
    }]);
    expect(selected.map((finding) => finding.severity)).toEqual(["low"]);
    expect(evaluateOracles(context, [{ name: "jsonrpc-contract", enabled: false }])).toEqual([]);
  });
});
