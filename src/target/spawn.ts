import crossSpawn from "cross-spawn";
import { execFile } from "node:child_process";
import type { ChildProcess } from "node:child_process";
import { TargetError } from "../core/errors.js";

export interface SpawnTargetOptions {
  command: string;
  args: string[];
  cwd?: string;
  env?: Record<string, string>;
  inheritEnvironment?: boolean;
}

// After a step fails, how long to wait for a target that is already exiting before terminating it.
// Without this, a slow host can turn a real crash into a timeout or transport error.
export const TARGET_EXIT_GRACE_MS = 500;

export async function waitForExitGrace(exitPromise: Promise<unknown>): Promise<void> {
  let timer: NodeJS.Timeout | undefined;
  await Promise.race([
    exitPromise,
    new Promise<void>((resolve) => {
      timer = setTimeout(resolve, TARGET_EXIT_GRACE_MS);
    }),
  ]);
  clearTimeout(timer);
}

export function spawnTarget(options: SpawnTargetOptions): ChildProcess {
  const env = options.inheritEnvironment
    ? { ...process.env, ...options.env }
    : { ...minimalEnvironment(), ...options.env };

  return crossSpawn(options.command, options.args, {
    cwd: options.cwd,
    env,
    stdio: ["pipe", "pipe", "pipe"],
    windowsHide: true,
    detached: process.platform !== "win32",
  });
}

export async function terminateTarget(child: ChildProcess): Promise<void> {
  if (child.exitCode !== null || child.signalCode !== null || child.pid === undefined) {
    return;
  }
  if (process.platform === "win32") {
    const taskkillPath = process.env.SystemRoot
      ? `${process.env.SystemRoot}\\System32\\taskkill.exe`
      : "taskkill.exe";
    await new Promise<void>((resolve, reject) => {
      execFile(taskkillPath, ["/PID", String(child.pid), "/T", "/F"], (error) => {
        if (error && child.exitCode === null && child.signalCode === null) {
          reject(new TargetError(`Could not terminate target process tree: ${error.message}`, { cause: error }));
          return;
        }
        resolve();
      });
    });
    return;
  }
  const exited = new Promise<void>((resolve) => {
    if (child.exitCode !== null || child.signalCode !== null) {
      resolve();
    } else {
      child.once("exit", () => resolve());
    }
  });
  try {
    process.kill(-child.pid, "SIGTERM");
  } catch (error) {
    if (!isNodeError(error) || error.code !== "ESRCH") {
      throw new TargetError(`Could not terminate target process group: ${errorMessage(error)}`, { cause: error });
    }
  }
  let timer: NodeJS.Timeout | undefined;
  const didExit = await Promise.race([
    exited.then(() => true),
    new Promise<boolean>((resolve) => {
      timer = setTimeout(() => resolve(false), 1_000);
    }),
  ]);
  if (timer !== undefined) {
    clearTimeout(timer);
  }
  if (!didExit && child.pid !== undefined) {
    try {
      process.kill(-child.pid, "SIGKILL");
    } catch (error) {
      if (!isNodeError(error) || error.code !== "ESRCH") {
        throw new TargetError(`Could not force-terminate target process group: ${errorMessage(error)}`, { cause: error });
      }
    }
    await exited;
  }
}

function minimalEnvironment(): NodeJS.ProcessEnv {
  const keys = process.platform === "win32"
    ? ["PATH", "SystemRoot", "WINDIR", "TEMP", "TMP"]
    : ["PATH", "HOME", "TMPDIR"];
  const env: NodeJS.ProcessEnv = {};
  for (const key of keys) {
    const value = process.env[key];
    if (value !== undefined) {
      env[key] = value;
    }
  }
  return env;
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
