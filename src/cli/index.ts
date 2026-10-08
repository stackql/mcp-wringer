#!/usr/bin/env node

import { writeFile } from "node:fs/promises";
import { ScenarioError, TargetError, TransportError, WringerError } from "../core/errors.js";
import { loadReproducer } from "../core/reproducer.js";
import { inspectServer } from "./inspect.js";
import { transportRegistry } from "../transports/registry.js";

const VERSION = "0.1.0";

async function main(args: string[]): Promise<void> {
  const [command, ...rest] = args;
  if (command === "--version" || command === "-v") {
    process.stdout.write(`${VERSION}\n`);
    return;
  }
  if (command === "--help" || command === "-h" || command === undefined) {
    printHelp();
    return;
  }
  if (command === "replay") {
    await replay(rest);
    return;
  }
  if (command === "inspect") {
    await inspect(rest);
    return;
  }
  throw new WringerError("USAGE_ERROR", `Unknown command '${command}'.`);
}

async function replay(args: string[]): Promise<void> {
  const separatorIndex = args.indexOf("--");
  const optionArgs = separatorIndex < 0 ? args : args.slice(0, separatorIndex);
  const overrideCommand = separatorIndex < 0 ? undefined : args[separatorIndex + 1];
  const overrideArgs = separatorIndex < 0 ? [] : args.slice(separatorIndex + 2);
  const reproPath = optionArgs[0];
  if (reproPath === undefined || reproPath.startsWith("--")) {
    throw new WringerError("USAGE_ERROR", "Usage: mcp-wringer replay <file.repro.json> [-- <command> [args...]]");
  }
  const outFlag = optionArgs.indexOf("--out");
  const outPath = outFlag >= 0 ? optionArgs[outFlag + 1] : undefined;
  if (outFlag >= 0 && outPath === undefined) {
    throw new WringerError("USAGE_ERROR", "--out requires a file path.");
  }
  const reproducer = await loadReproducer(reproPath);
  const { trace } = await transportRegistry.get("stdio")({
    command: overrideCommand ?? reproducer.target.command,
    args: overrideCommand === undefined ? reproducer.target.args : overrideArgs,
    scenario: reproducer.scenario,
  });
  const output = `${JSON.stringify(trace, null, 2)}\n`;
  if (outPath !== undefined) {
    await writeFile(outPath, output, "utf8");
    process.stdout.write(`Wrote trace to ${outPath}\n`);
  } else {
    process.stdout.write(output);
  }
}

async function inspect(args: string[]): Promise<void> {
  const separatorIndex = args.indexOf("--");
  const optionArgs = separatorIndex < 0 ? args : args.slice(0, separatorIndex);
  const command = separatorIndex < 0 ? undefined : args[separatorIndex + 1];
  const targetArgs = separatorIndex < 0 ? [] : args.slice(separatorIndex + 2);
  if (command === undefined) {
    throw new WringerError("USAGE_ERROR", "Usage: mcp-wringer inspect [--spec <revision>] -- <command> [args...]");
  }
  const specIndex = optionArgs.indexOf("--spec");
  const revision = specIndex >= 0 ? optionArgs[specIndex + 1] : "2025-11-25";
  if (revision !== "2025-11-25" && revision !== "2026-07-28") {
    throw new WringerError("USAGE_ERROR", "--spec must be 2025-11-25 or 2026-07-28.");
  }
  const result = await inspectServer(revision, command, targetArgs);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

function printHelp(): void {
  process.stdout.write(
    [
      "mcp-wringer 0.1.0",
      "",
      "Usage:",
      "  mcp-wringer replay <file.repro.json> [--out <trace.json>] [-- <command> [args...]]",
      "  mcp-wringer inspect [--spec <revision>] -- <command> [args...]",
      "",
      "Use only on servers you own or are authorised to test.",
    ].join("\n") + "\n",
  );
}

main(process.argv.slice(2)).catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  const code = error instanceof WringerError ? error.code : "UNEXPECTED_ERROR";
  process.stderr.write(`mcp-wringer: [${code}] ${message}\n`);
  if (error instanceof TargetError || error instanceof TransportError) {
    process.exitCode = 3;
  } else if (error instanceof ScenarioError || code === "USAGE_ERROR") {
    process.exitCode = 2;
  } else {
    process.exitCode = 3;
  }
});
