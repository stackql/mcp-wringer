import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const SOURCE = {
  repository: "modelcontextprotocol/modelcontextprotocol",
  commit: "0a11bf68c7ec4473526ec15589f592afcd12d1e8",
  pinnedAt: "2026-10-08",
  revisions: ["2025-11-25", "2026-07-28"],
};

async function fetchText(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
  }
  return response.text();
}

function sha256(input) {
  return createHash("sha256").update(input, "utf8").digest("hex");
}

const root = process.cwd();
const specDir = join(root, "spec");
await mkdir(specDir, { recursive: true });

const hashes = {};
for (const revision of SOURCE.revisions) {
  const rawUrl = `https://raw.githubusercontent.com/${SOURCE.repository}/${SOURCE.commit}/schema/${revision}/schema.json`;
  const content = await fetchText(rawUrl);
  const revisionDir = join(specDir, revision);
  const outFile = join(revisionDir, "schema.json");
  await mkdir(revisionDir, { recursive: true });
  await writeFile(outFile, content, "utf8");
  hashes[`${revision}/schema.json`] = sha256(content);
  process.stdout.write(`Synced spec/${revision}/schema.json\n`);
}

const sourceMetadata = {
  ...SOURCE,
  hashes,
};

await writeFile(join(specDir, "SOURCE.json"), `${JSON.stringify(sourceMetadata, null, 2)}\n`, "utf8");
process.stdout.write("Wrote spec/SOURCE.json\n");
