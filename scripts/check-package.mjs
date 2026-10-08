import { readFileSync } from "node:fs";

const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
const lifecycleScripts = ["preinstall", "install", "postinstall"];
const installScripts = lifecycleScripts.filter((name) => packageJson.scripts?.[name] !== undefined);
if (installScripts.length > 0) {
  throw new Error(`Package must not define install scripts: ${installScripts.join(", ")}`);
}

let packed;
try {
  packed = JSON.parse(readFileSync(0, "utf8"));
} catch (error) {
  throw new Error(
    `npm pack did not return valid JSON: ${error instanceof Error ? error.message : String(error)}`,
    { cause: error },
  );
}
if (!Array.isArray(packed) || packed.length !== 1 || !Array.isArray(packed[0].files)) {
  throw new Error("npm pack returned an unexpected package listing.");
}

const allowedFiles = new Set(["README.md", "LICENSE", "config.schema.json", "package.json"]);
const allowedDirectories = ["dist/", "dist-action/", "spec/"];
const paths = packed[0].files.map((file) => file.path);
const unexpected = paths.filter((path) =>
  !allowedFiles.has(path) && !allowedDirectories.some((directory) => path.startsWith(directory)));
if (unexpected.length > 0) {
  throw new Error(`npm pack contains unexpected files: ${unexpected.join(", ")}`);
}
for (const required of ["README.md", "LICENSE", "config.schema.json", "dist/cli/index.js", "dist-action/index.cjs"]) {
  if (!paths.includes(required)) {
    throw new Error(`npm pack is missing required file '${required}'.`);
  }
}
process.stdout.write(`Verified ${paths.length} packed files; no install scripts are defined.\n`);
