import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const actionPath = join(root, "dist-action", "index.cjs");
const temporaryDirectory = await mkdtemp(join(tmpdir(), "mcp-wringer-action-"));
const configPath = join(temporaryDirectory, "config.json");
await writeFile(configPath, JSON.stringify({
  corpusDirectory: join(temporaryDirectory, "corpus"),
}), "utf8");

try {
  const clean = await runAction("clean", {});
  assert.equal(clean.status, 0, JSON.stringify(clean, null, 2));
  assert.equal(clean.outputs.finding_count, "0");
  assert.equal(clean.outputs.seed, "20261118");
  const cleanSarif = JSON.parse(await readFile(clean.outputs.sarif_path, "utf8"));
  assert.equal(cleanSarif.version, "2.1.0");
  const cleanMarkdown = await readFile(join(clean.outputs.report_directory, "markdown.md"), "utf8");
  assert.ok(cleanMarkdown.length > 0);
  assert.ok((await readFile(clean.summaryPath, "utf8")).includes(cleanMarkdown));

  const defective = await runAction("defective", { MCP_WRINGER_DEFECTS: "exit-on-decode-error" });
  assert.equal(defective.status, 1, defective.stderr);
  assert.ok(Number(defective.outputs.finding_count) > 0);
  assert.ok(Number(defective.outputs.high_count) > 0);
  const defectiveSarif = JSON.parse(await readFile(defective.outputs.sarif_path, "utf8"));
  assert.equal(defectiveSarif.version, "2.1.0");
  const defectiveMarkdown = await readFile(join(defective.outputs.report_directory, "markdown.md"), "utf8");
  assert.ok((await readFile(defective.summaryPath, "utf8")).includes(defectiveMarkdown));
  process.stdout.write("Action clean and defective fixture checks passed.\n");
} finally {
  await rm(temporaryDirectory, { recursive: true, force: true });
}

async function runAction(name, targetEnvironment) {
  const reportDirectory = join(temporaryDirectory, name);
  const outputPath = join(temporaryDirectory, `${name}.output`);
  const summaryPath = join(temporaryDirectory, `${name}.summary`);
  const result = spawnSync(process.execPath, [actionPath], {
    cwd: root,
    encoding: "utf8",
    timeout: 120_000,
    env: {
      ...process.env,
      GITHUB_OUTPUT: outputPath,
      GITHUB_STEP_SUMMARY: summaryPath,
      INPUT_COMMAND: process.execPath,
      INPUT_ARGS: JSON.stringify(["fixtures/stdio-server.mjs", "--revision", "2025-11-25"]),
      INPUT_CONFIG_PATH: configPath,
      INPUT_ENV: JSON.stringify(targetEnvironment),
      INPUT_FAIL_ON: "high",
      INPUT_PROFILE: "quick",
      INPUT_REPORT_DIRECTORY: reportDirectory,
      INPUT_SEED: "20261118",
    },
  });
  if (result.error !== undefined) {
    throw result.error;
  }
  let output;
  try {
    output = await readFile(outputPath, "utf8");
  } catch (error) {
    throw new Error(
      `Action exited with status ${result.status} without writing outputs.\n${result.stderr}`,
      { cause: error },
    );
  }
  const outputs = Object.fromEntries([...output.matchAll(/^([a-z_]+)<<([^\r\n]+)\r?\n([\s\S]*?)\r?\n\2\r?$/gm)]
    .map(([, key, , value]) => [key, value]));
  return { ...result, outputs, summaryPath };
}
