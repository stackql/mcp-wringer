import { readFileSync } from "node:fs";
import { join } from "node:path";

const mode = process.argv[2];
if (mode === "clean") {
  if (process.env.FINDING_COUNT !== "0") {
    throw new Error("Clean fixture produced findings.");
  }
  if (process.env.EXPECTED_SEED !== "20261118") {
    throw new Error("Action returned the wrong seed.");
  }
  for (const severity of ["HIGH", "MEDIUM", "LOW", "INFO"]) {
    if (process.env[`${severity}_COUNT`] !== "0") {
      throw new Error(`Clean fixture returned a nonzero ${severity.toLowerCase()} count.`);
    }
  }
  readFileSync(requiredEnvironment("SARIF_PATH"), "utf8");
  const markdown = readFileSync(join(requiredEnvironment("REPORT_DIRECTORY"), "markdown.md"), "utf8");
  verifySummary(markdown);
} else if (mode === "defective") {
  if (process.env.OUTCOME !== "failure") {
    throw new Error("Defective fixture did not fail the Action.");
  }
  const findingCount = Number(requiredEnvironment("FINDING_COUNT"));
  const highCount = Number(requiredEnvironment("HIGH_COUNT"));
  if (!Number.isSafeInteger(findingCount) || findingCount < 1
    || !Number.isSafeInteger(highCount) || highCount < 1) {
    throw new Error("Defective fixture did not report a high-severity finding.");
  }
  readFileSync(requiredEnvironment("SARIF_PATH"), "utf8");
  const markdown = readFileSync(join(requiredEnvironment("REPORT_DIRECTORY"), "markdown.md"), "utf8");
  verifySummary(markdown);
} else {
  throw new Error("Expected assertion mode 'clean' or 'defective'.");
}

function requiredEnvironment(name) {
  const value = process.env[name];
  if (value === undefined || value.length === 0) {
    throw new Error(`Required environment variable ${name} is not set.`);
  }
  return value;
}

function verifySummary(markdown) {
  const summaryPath = process.env.SUMMARY_PATH;
  if (summaryPath !== undefined && !readFileSync(summaryPath, "utf8").includes(markdown)) {
    throw new Error("Markdown report was not appended to the job summary.");
  }
}
