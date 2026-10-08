import { execFile } from "node:child_process";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { CoverageError } from "../core/errors.js";
import type { CoverageProvider } from "./types.js";

const execFileAsync = promisify(execFile);

export const goCoverageProvider: CoverageProvider = {
  environmentVariable: "GOCOVERDIR",
  async collect(directory) {
    const entries = await readdir(directory);
    if (!entries.some((name) => name.startsWith("covmeta."))
      || !entries.some((name) => name.startsWith("covcounters."))) {
      throw new CoverageError(
        "Go coverage data is missing. Build the target with 'go build -cover' and ensure it exits cleanly.",
      );
    }
    const temporaryDirectory = await mkdtemp(join(tmpdir(), "mcp-wringer-go-cover-"));
    const profilePath = join(temporaryDirectory, "coverage.out");
    try {
      try {
        await execFileAsync("go", ["tool", "covdata", "textfmt", `-i=${directory}`, `-o=${profilePath}`], {
          windowsHide: true,
          maxBuffer: 4 * 1024 * 1024,
        });
      } catch (error) {
        throw new CoverageError(
          `Could not read Go coverage data. Build the target with 'go build -cover' and ensure Go is on PATH: ${error instanceof Error ? error.message : String(error)}`,
          { cause: error },
        );
      }
      const profile = await readFile(profilePath, "utf8");
      const covered = new Set<string>();
      for (const line of profile.split(/\r?\n/u)) {
        if (line.length === 0 || line.startsWith("mode:")) {
          continue;
        }
        const match = /^(.+):(\d+)\.(\d+),(\d+)\.(\d+) (\d+) (\d+)$/u.exec(line);
        if (match === null) {
          throw new CoverageError(`Go coverage profile contains an unrecognized entry: '${line}'.`);
        }
        if (Number(match[7]) > 0) {
          covered.add(`${match[1]}:${match[2]}.${match[3]}-${match[4]}.${match[5]}`);
        }
      }
      return covered;
    } finally {
      await rm(temporaryDirectory, { recursive: true, force: true });
    }
  },
};
