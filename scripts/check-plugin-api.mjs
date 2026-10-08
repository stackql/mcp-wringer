import { readFile } from "node:fs/promises";
import { join } from "node:path";

const root = process.cwd();
const generatedPath = join(root, "dist", "plugin", "index.d.ts");
const reportPath = join(root, "docs", "dev", "plugin-api.d.ts");
const [generated, report] = await Promise.all([
  readFile(generatedPath, "utf8"),
  readFile(reportPath, "utf8"),
]);
if (generated !== report) {
  process.stderr.write(
    "The public plugin declarations changed. Review the change and update docs/dev/plugin-api.d.ts deliberately.\n",
  );
  process.exitCode = 1;
} else {
  process.stdout.write("The generated plugin declarations match docs/dev/plugin-api.d.ts.\n");
}
