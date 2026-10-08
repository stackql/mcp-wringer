import { performance } from "node:perf_hooks";
import type { ChildProcess } from "node:child_process";
import { ScenarioError, TargetError, TransportError } from "../../core/errors.js";
import type { JsonValue, Scenario, ScenarioStep, Trace, TraceEvent, TraceEvent as TraceRecord } from "../../core/types.js";
import { spawnTarget, terminateTarget, type SpawnTargetOptions } from "../../target/spawn.js";

export interface StdioRunOptions extends SpawnTargetOptions {
  scenario: Scenario;
  timeoutMs?: number;
}

export interface StdioRunResult {
  trace: Trace;
  responses: JsonValue[];
  outcome: StdioRunOutcome;
}

export interface StdioRunFailure {
  kind: "timeout" | "target-exit" | "transport-error";
  phase: "response" | "shutdown" | "transport";
  message: string;
}

export interface StdioRunOutcome {
  failure?: StdioRunFailure;
  exitCode: number | null;
  signal: NodeJS.Signals | null;
  durationMs: number;
  stdoutBytes: number;
  stderrBytes: number;
}

export async function runStdioScenario(options: StdioRunOptions): Promise<StdioRunResult> {
  const child = spawnTarget(options);
  const startedAt = performance.now();
  const recorder = new TraceRecorder(options.scenario.id, options.scenario.specRevision, startedAt, Object.values(options.env ?? {}));
  const frames = new AsyncQueue<Buffer>();
  let outputBuffer = Buffer.alloc(0);
  let spawnError: Error | undefined;
  let closed = false;
  let exitStatus: { code: number | null; signal: NodeJS.Signals | null } | undefined;
  let failure: StdioRunFailure | undefined;
  const responses: JsonValue[] = [];

  const exitPromise = new Promise<{ code: number | null; signal: NodeJS.Signals | null }>((resolve) => {
    child.once("exit", (code, signal) => {
      exitStatus = { code, signal };
      recorder.add("process", Buffer.from(`exit code=${String(code)} signal=${String(signal)}`));
      resolve(exitStatus);
    });
  });

  child.once("error", (error) => {
    spawnError = error;
    recorder.add("process", Buffer.from(`spawn error=${error.message}`));
    frames.close(error);
  });
  child.stdin?.on("error", (error) => {
    spawnError = error;
    recorder.add("process", Buffer.from(`stdin error=${error.message}`));
    frames.close(new TransportError(`Target stdin failed: ${error.message}`, { cause: error }));
  });
  child.stdout?.on("data", (chunk: Buffer) => {
    recorder.add("stdout", chunk);
    outputBuffer = Buffer.concat([outputBuffer, chunk]);
    let newline = outputBuffer.indexOf(0x0a);
    while (newline >= 0) {
      frames.push(outputBuffer.subarray(0, newline + 1));
      outputBuffer = outputBuffer.subarray(newline + 1);
      newline = outputBuffer.indexOf(0x0a);
    }
  });
  child.stdout?.on("error", (error) => {
    recorder.add("process", Buffer.from(`stdout error=${error.message}`));
    frames.close(new TransportError(`Target stdout failed: ${error.message}`, { cause: error }));
  });
  child.stderr?.on("data", (chunk: Buffer) => recorder.add("stderr", chunk));
  child.stderr?.on("error", (error) => recorder.add("process", Buffer.from(`stderr error=${error.message}`)));
  child.once("close", () => {
    if (outputBuffer.length > 0) {
      frames.push(outputBuffer);
    }
    if (!closed) {
      frames.close(spawnError);
    }
  });

  try {
    await waitForSpawn(child, spawnError, options.timeoutMs ?? 5_000);
    for (const step of options.scenario.steps) {
      try {
        const response = await executeStep(step, child, frames, recorder);
        if (response !== undefined) {
          responses.push(response);
        }
      } catch (error) {
        if (!(error instanceof TransportError)) {
          throw error;
        }
        failure = classifyFailure(error, exitStatus);
        break;
      }
    }
    if (failure === undefined) {
      if (!child.stdin?.destroyed) {
        child.stdin?.end();
      }
      try {
        await waitForExit(exitPromise, options.timeoutMs ?? 5_000);
      } catch (error) {
        if (!(error instanceof TargetError)) {
          throw error;
        }
        failure = { kind: "timeout", phase: "shutdown", message: error.message };
      }
    }
    if (failure !== undefined) {
      await terminateTarget(child);
    }
  } catch (error) {
    await terminateTarget(child);
    throw error;
  } finally {
    closed = true;
    recorder.flush();
  }

  return {
    trace: recorder.toTrace(),
    responses,
    outcome: {
      ...(failure === undefined ? {} : { failure }),
      exitCode: exitStatus?.code ?? null,
      signal: exitStatus?.signal ?? null,
      durationMs: Math.max(0, performance.now() - startedAt),
      ...recorder.byteCounts(),
    },
  };
}

async function executeStep(
  step: ScenarioStep,
  child: ChildProcess,
  frames: AsyncQueue<Buffer>,
  recorder: TraceRecorder,
): Promise<JsonValue | undefined> {
  switch (step.type) {
    case "send": {
      if (step.wire !== undefined && step.wire.transport !== "stdio") {
        throw new ScenarioError(`Wire fault '${step.wire.transport}' cannot run over stdio.`);
      }
      const bytes = Buffer.from(`${JSON.stringify(step.message)}\n`, "utf8");
      await writeBytes(bytes, step.wire?.transport === "stdio" ? step.wire : undefined, child, recorder);
      return undefined;
    }
    case "send-raw": {
      if (step.wire !== undefined && step.wire.transport !== "stdio") {
        throw new ScenarioError(`Wire fault '${step.wire.transport}' cannot run over stdio.`);
      }
      const bytes = Buffer.from(step.bytesBase64, "base64");
      await writeBytes(bytes, step.wire?.transport === "stdio" ? step.wire : undefined, child, recorder);
      return undefined;
    }
    case "await-response":
      return readResponse(frames, step.id, step.timeoutMs ?? 5_000);
    case "transport":
      child.stdin?.end();
      return undefined;
    case "delay":
      await new Promise<void>((resolve) => setTimeout(resolve, step.durationMs));
      return undefined;
  }
}

async function writeBytes(
  bytes: Buffer,
  wire: { chunks?: number[]; delayMs?: number } | undefined,
  child: ChildProcess,
  recorder: TraceRecorder,
): Promise<void> {
  const stdin = child.stdin;
  if (stdin === null || stdin.destroyed || stdin.writableEnded) {
    throw new TransportError("Cannot write to the target because stdin is closed.");
  }
  const sizes = wire?.chunks ?? [bytes.length];
  let offset = 0;
  for (const size of sizes) {
    if (offset >= bytes.length) {
      break;
    }
    const chunk = bytes.subarray(offset, Math.min(bytes.length, offset + size));
    offset += chunk.length;
    recorder.add("stdin", chunk);
    await writeChunk(stdin, chunk);
    if (wire?.delayMs && offset < bytes.length) {
      await new Promise<void>((resolve) => setTimeout(resolve, wire.delayMs));
    }
  }
  if (offset < bytes.length) {
    const chunk = bytes.subarray(offset);
    recorder.add("stdin", chunk);
    await writeChunk(stdin, chunk);
  }
}

async function writeChunk(stream: NodeJS.WritableStream, chunk: Buffer): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    stream.write(chunk, (error?: Error | null) => {
      if (error) {
        reject(new TransportError(`Failed writing to target stdin: ${error.message}`, { cause: error }));
        return;
      }
      resolve();
    });
  });
}

async function readResponse(
  frames: AsyncQueue<Buffer>,
  expectedId: string | number | undefined,
  timeoutMs: number,
): Promise<JsonValue> {
  const deadline = performance.now() + timeoutMs;
  while (true) {
    const remaining = deadline - performance.now();
    if (remaining <= 0) {
      throw new TransportError(`Timed out waiting for response${expectedId === undefined ? "" : ` ${String(expectedId)}`}.`);
    }
    const frame = await frames.shift(remaining);
    let message: unknown;
    try {
      message = JSON.parse(frame.toString("utf8")) as unknown;
    } catch (error) {
      throw new TransportError(`Target wrote a non-JSON stdio frame: ${error instanceof Error ? error.message : String(error)}`);
    }
    if (expectedId === undefined || (isRecord(message) && message.id === expectedId)) {
      return message as JsonValue;
    }
  }
}

async function waitForSpawn(child: ChildProcess, spawnError: Error | undefined, timeoutMs: number): Promise<void> {
  if (spawnError) {
    throw new TargetError(`Could not start target: ${spawnError.message}`, { cause: spawnError });
  }
  if (child.pid !== undefined) {
    return;
  }
  try {
    await withTimeout(
      new Promise<void>((resolve, reject) => {
        child.once("spawn", resolve);
        child.once("error", reject);
      }),
      timeoutMs,
      "Timed out starting target.",
    );
  } catch (error) {
    if (error instanceof TargetError) {
      throw error;
    }
    throw new TargetError(`Could not start target: ${error instanceof Error ? error.message : String(error)}`, {
      cause: error,
    });
  }
}

async function waitForExit(
  exitPromise: Promise<{ code: number | null; signal: NodeJS.Signals | null }>,
  timeoutMs: number,
): Promise<void> {
  await withTimeout(exitPromise, timeoutMs, "Target did not exit after stdin closed.");
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_resolve, reject) => {
        timer = setTimeout(() => reject(new TargetError(message)), timeoutMs);
      }),
    ]);
  } finally {
    if (timer !== undefined) {
      clearTimeout(timer);
    }
  }
}

class AsyncQueue<T> {
  readonly #items: T[] = [];
  readonly #waiters: Array<{ resolve: (item: T) => void; reject: (error: Error) => void }> = [];
  #closedError: Error | undefined;

  push(item: T): void {
    const waiter = this.#waiters.shift();
    if (waiter) {
      waiter.resolve(item);
    } else {
      this.#items.push(item);
    }
  }

  close(error?: Error): void {
    this.#closedError = error ?? new TransportError("Target closed stdout before replying.");
    for (const waiter of this.#waiters.splice(0)) {
      waiter.reject(this.#closedError);
    }
  }

  shift(timeoutMs: number): Promise<T> {
    const item = this.#items.shift();
    if (item !== undefined) {
      return Promise.resolve(item);
    }
    if (this.#closedError) {
      return Promise.reject(this.#closedError);
    }
    return new Promise<T>((resolve, reject) => {
      const waiter = { resolve, reject };
      this.#waiters.push(waiter);
      const timer = setTimeout(() => {
        const index = this.#waiters.indexOf(waiter);
        if (index >= 0) {
          this.#waiters.splice(index, 1);
        }
        reject(new TransportError("Timed out waiting for a stdio frame."));
      }, timeoutMs);
      const resolveWithClear = waiter.resolve;
      waiter.resolve = (queuedItem) => {
        clearTimeout(timer);
        resolveWithClear(queuedItem);
      };
      const rejectWithClear = waiter.reject;
      waiter.reject = (error) => {
        clearTimeout(timer);
        rejectWithClear(error);
      };
    });
  }
}

class TraceRecorder {
  readonly #events: Array<TraceEvent & { order: number }> = [];
  readonly #startedAt: number;
  readonly #scenarioId: string;
  readonly #revision: Scenario["specRevision"];
  readonly #redactors = new Map<"stdout" | "stderr", ByteRedactor>();
  #stdoutBytes = 0;
  #stderrBytes = 0;
  #order = 0;

  constructor(scenarioId: string, revision: Scenario["specRevision"], startedAt: number, secrets: string[]) {
    this.#scenarioId = scenarioId;
    this.#revision = revision;
    this.#startedAt = startedAt;
    this.#redactors.set("stdout", new ByteRedactor(secrets));
    this.#redactors.set("stderr", new ByteRedactor(secrets));
  }

  add(channel: TraceEvent["channel"], bytes: Buffer): void {
    const offsetMs = Math.max(0, performance.now() - this.#startedAt);
    if (channel === "stdout") {
      this.#stdoutBytes += bytes.length;
    } else if (channel === "stderr") {
      this.#stderrBytes += bytes.length;
    }
    const safeBytes = channel === "stdout" || channel === "stderr"
      ? this.#redactors.get(channel)?.push(bytes) ?? bytes
      : bytes;
    if (safeBytes.length > 0) {
      this.#push(channel, safeBytes, offsetMs);
    }
  }

  flush(): void {
    for (const channel of ["stdout", "stderr"] as const) {
      const remaining = this.#redactors.get(channel)?.flush();
      if (remaining && remaining.length > 0) {
        this.#push(channel, remaining, performance.now() - this.#startedAt);
      }
    }
  }

  toTrace(): Trace {
    return {
      formatVersion: 1,
      scenarioId: this.#scenarioId,
      specRevision: this.#revision,
      events: this.#events.map((event) => ({
        offsetMs: event.offsetMs,
        channel: event.channel,
        encoding: event.encoding,
        data: event.data,
      })),
    };
  }

  byteCounts(): { stdoutBytes: number; stderrBytes: number } {
    return { stdoutBytes: this.#stdoutBytes, stderrBytes: this.#stderrBytes };
  }

  #push(channel: TraceEvent["channel"], bytes: Buffer, offsetMs: number): void {
    const text = bytes.toString("utf8");
    const encoding = Buffer.from(text, "utf8").equals(bytes) ? "utf8" : "base64";
    const event: TraceRecord & { order: number } = {
      offsetMs,
      channel,
      encoding,
      data: encoding === "utf8" ? text : bytes.toString("base64"),
      order: this.#order++,
    };
    this.#events.push(event);
    this.#events.sort((a, b) => a.offsetMs - b.offsetMs || a.order - b.order);
  }

}

class ByteRedactor {
  readonly #secrets: Buffer[];
  readonly #holdback: number;
  #pending = Buffer.alloc(0);

  constructor(secrets: string[]) {
    this.#secrets = secrets.filter((secret) => secret.length > 0).map((secret) => Buffer.from(secret, "utf8"));
    this.#holdback = Math.max(0, ...this.#secrets.map((secret) => secret.length - 1));
  }

  push(bytes: Buffer): Buffer {
    const combined = Buffer.concat([this.#pending, bytes]);
    let safeLength = Math.max(0, combined.length - this.#holdback);
    let adjusted = true;
    while (adjusted) {
      adjusted = false;
      for (const secret of this.#secrets) {
        let position = combined.indexOf(secret);
        while (position >= 0) {
          if (position < safeLength && position + secret.length > safeLength) {
            safeLength = position;
            adjusted = true;
          }
          position = combined.indexOf(secret, position + 1);
        }
      }
    }
    const redacted = this.#redact(combined);
    const safe = redacted.subarray(0, safeLength);
    this.#pending = combined.subarray(safeLength);
    return safe;
  }

  flush(): Buffer {
    const safe = this.#redact(this.#pending);
    this.#pending = Buffer.alloc(0);
    return safe;
  }

  #redact(bytes: Buffer): Buffer {
    if (this.#secrets.length === 0) {
      return bytes;
    }
    const result = Buffer.from(bytes);
    for (const secret of this.#secrets) {
      let position = result.indexOf(secret);
      while (position >= 0) {
        result.fill(0x2a, position, position + secret.length);
        position = result.indexOf(secret, position + secret.length);
      }
    }
    return result;
  }
}

function classifyFailure(
  error: TransportError,
  exitStatus: { code: number | null; signal: NodeJS.Signals | null } | undefined,
): StdioRunFailure {
  const message = error.message;
  if (/timed out/i.test(message)) {
    return { kind: "timeout", phase: "response", message };
  }
  if (exitStatus !== undefined) {
    return { kind: "target-exit", phase: "transport", message };
  }
  return { kind: "transport-error", phase: "transport", message };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
