import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";

const directory = await mkdtemp(join(tmpdir(), "mcp-wringer-plugin-"));
try {
  const reportDirectory = join(directory, "reports");
  const configPath = join(directory, "config.json");
  const config = {
    profile: "quick",
    cases: 2,
    durationMs: 10_000,
    timeoutMs: 1_000,
    confirmations: 1,
    reportDirectory,
    plugins: [pathToFileURL(resolve("examples", "example-plugin.mjs")).href],
    generators: [
      { name: "tool-args", weight: 1, enabled: true, options: {} },
      { name: "example-empty", weight: 1, enabled: true, options: {} },
    ],
    argumentStrategies: [{ name: "example-name", enabled: true, options: { prefix: "consumer" } }],
    oracles: [{ name: "example-noop", enabled: true, options: {}, severityOverrides: {} }],
    reporters: [{ name: "example-summary", enabled: true, options: { label: "Consumer test" } }],
  };
  await writeFile(configPath, JSON.stringify(config, null, 2), "utf8");
  const result = spawnSync(process.execPath, [
    resolve("dist", "cli", "index.js"),
    "run",
    "--config",
    configPath,
    "--",
    process.execPath,
    resolve("fixtures", "stdio-server.mjs"),
  ], { encoding: "utf8", timeout: 30_000 });
  if (result.error !== undefined) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(`Example plugin run failed (${result.status}):\n${result.stderr}`);
  }
  const output = await readFile(join(reportDirectory, "example-summary.txt"), "utf8");
  if (output !== "Consumer test: 0 finding(s)\n") {
    throw new Error(`Unexpected plugin reporter output: ${JSON.stringify(output)}`);
  }
  process.stdout.write("The example plugin loaded and its generator, oracle, argument strategy, and reporter registered.\n");
} finally {
  await rm(directory, { recursive: true, force: true });
}
