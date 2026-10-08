import { readFile, mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import ts from "typescript";

const root = process.cwd();
const sourcePath = join(root, "src", "config", "definition.ts");
const source = await readFile(sourcePath, "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2023 },
}).outputText;
const { configDefinition } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);
const outputDir = join(root, "docs");
const schemaPath = join(root, "config.schema.json");
const referencePath = join(outputDir, "config-reference.md");
const schemaJson = `${JSON.stringify(configDefinition, null, 2)}\n`;
const rows = Object.entries(configDefinition.properties).map(([name, property]) => {
  const types = Array.isArray(property.enum)
    ? property.enum.map((value) => `\`${value}\``).join(", ")
    : Array.isArray(property.oneOf)
      ? property.oneOf.map((choice) => choice.type).join(" or ")
      : property.type ?? "object";
  const required = configDefinition.required.includes(name) ? "Required" : "Optional";
  const defaultValue = Object.hasOwn(property, "default")
    ? `\`${JSON.stringify(property.default)}\``
    : "-";
  return `| \`${name}\` | ${types} | ${required} | ${defaultValue} | ${escapeCell(property.description ?? "")} |`;
});
const reference = `# Configuration reference

This document and [config.schema.json](../config.schema.json) are generated from \`src/config/definition.ts\` by \`npm run docs:config\`. Do not edit them by hand.

## Loading and precedence

Configuration is merged in this order, from lowest to highest priority: built-in defaults, the selected profile, the configuration file, \`MCP_WRINGER_*\` environment variables, and CLI flags. Unknown keys and invalid values are errors. Use \`mcp-wringer run --show-config\` to print the resolved values and their origins.

## Options

| Key | Type | Requirement | Default | Description |
|---|---|---|---|---|
${rows.join("\n")}

## Profiles

Built-in profiles are \`quick\`, \`standard\`, and \`deep\`. A \`profiles\` object in the config file can add named partial configurations. Select one with \`profile\` or \`--profile\`.

## Extension selections

\`argumentStrategies\`, \`generators\`, \`oracles\`, and \`reporters\` are arrays of objects with a registry \`name\`, an \`enabled\` flag, and an \`options\` object. An empty argument strategy list enables all registered strategies. Generator selections also accept a positive \`weight\`; oracle selections accept a \`severityOverrides\` map from rule IDs to \`high\`, \`medium\`, \`low\`, or \`info\`. An empty generator list uses the built-in schedule, and an empty oracle list enables all registered oracles.

## Baseline format

A baseline is a JSON object containing format version 1 and unique finding IDs:

\`\`\`json
{
  "formatVersion": 1,
  "findingIds": ["<finding-id>"]
}
\`\`\`

The run fails if a confirmed finding is new or a baseline ID no longer reproduces.
`;

await mkdir(outputDir, { recursive: true });
await writeFile(schemaPath, schemaJson, "utf8");
await writeFile(referencePath, reference, "utf8");
process.stdout.write(`Wrote ${schemaPath} and ${referencePath}\n`);

function escapeCell(value) {
  return value.replaceAll("|", "\\|").replaceAll("\r", " ").replaceAll("\n", " ");
}
