import { performance } from "node:perf_hooks";
import type { ChildProcess } from "node:child_process";
import { ScenarioError, TargetError, TransportError } from "../../core/errors.js";
import type {
  JsonValue,
  Scenario,
  ScenarioStep,
  Trace,
  TraceEvent,
  TraceEvent as TraceRecord,
  TransportRunFailure,
  TransportRunOutcome,
} from "../../core/types.js";
import { spawnTarget, terminateTarget, type SpawnTargetOptions } from "../../target/spawn.js";
import type { TransportRunResult, TransportSession } from "../types.js";

export interface StdioRunOptions extends SpawnTargetOptions {
  scenario: Scenario;
  timeoutMs?: number;
}

export interface StdioRunResult extends TransportRunResult {
  trace: Trace;
  responses: JsonValue[];
  outcome: StdioRunOutcome;
  transport: "stdio";
}

export type StdioRunFailure = TransportRunFailure;

export type StdioRunOutcome = TransportRunOutcome;

export class StdioScenarioSession implements TransportSession {
  readonly #child: ChildProcess;
  readonly #frames = new AsyncQueue<Buffer>();
  readonly #unmatched = new Map<string | number, JsonValue>();
  readonly #recorder: TraceRecorder;
  readonly #startedAt: number;
  readonly #timeoutMs: number;
  readonly #exitPromise: Promise<{ code: number | null; signal: NodeJS.Signals | null }>;
  #outputBuffer = Buffer.alloc(0);
  #spawnError: Error | undefined;
  #exitStatus: { code: number | null; signal: NodeJS.Signals | null } | undefined;
  #closeFailure: StdioRunFailure | undefined;
  #closed = false;

  constructor(options: StdioRunOptions) {
    this.#child = spawnTarget(options);
    this.#startedAt = performance.now();
    this.#timeoutMs = options.timeoutMs ?? 5_000;
    this.#recorder = new TraceRecorder(
      options.scenario.id,
      options.scenario.specRevision,
      this.#startedAt,
      [
        ...Object.values(options.env ?? {}),
        ...(options.inheritEnvironment ? Object.values(process.env).filter((value): value is string => value !== undefined) : []),
      ],
    );
    this.#exitPromise = new Promise((resolve) => {
      this.#child.once("exit", (code, signal) => {
        this.#exitStatus = { code, signal };
        this.#recorder.add("process", Buffer.from(`exit code=${String(code)} signal=${String(signal)}`));
        resolve(this.#exitStatus);
      });
    });
    this.#child.once("error", (error) => {
      this.#spawnError = error;
      this.#recorder.add("process", Buffer.from(`spawn error=${error.message}`));
      this.#frames.close(error);
    });
    this.#child.stdin?.on("error", (error) => {
      this.#spawnError = error;
      this.#recorder.add("process", Buffer.from(`stdin error=${error.message}`));
      this.#frames.close(new TransportError(`Target stdin failed: ${error.message}`, { cause: error }));
    });
    this.#child.stdout?.on("data", (chunk: Buffer) => {
      this.#recorder.add("stdout", chunk);
      this.#outputBuffer = Buffer.concat([this.#outputBuffer, chunk]);
      let newline = this.#outputBuffer.indexOf(0x0a);
      while (newline >= 0) {
        this.#frames.push(this.#outputBuffer.subarray(0, newline + 1));
        this.#outputBuffer = this.#outputBuffer.subarray(newline + 1);
        newline = this.#outputBuffer.indexOf(0x0a);
      }
    });
    this.#child.stdout?.on("error", (error) => {
      this.#recorder.add("process", Buffer.from(`stdout error=${error.message}`));
      this.#frames.close(new TransportError(`Target stdout failed: ${error.message}`, { cause: error }));
    });
    this.#child.stderr?.on("data", (chunk: Buffer) => this.#recorder.add("stderr", chunk));
    this.#child.stderr?.on("error", (error) =>
      this.#recorder.add("process", Buffer.from(`stderr error=${error.message}`)));
    this.#child.once("close", () => {
      if (this.#outputBuffer.length > 0) {
        this.#frames.push(this.#outputBuffer);
      }
      if (!this.#closed) {
        this.#frames.close(this.#spawnError);
      }
    });
  }

  async execute(
    scenario: Scenario,
    options: { closeAfterScenario?: boolean } = {},
  ): Promise<StdioRunResult> {
    if (this.#closed) {
      throw new TargetError("Cannot execute a scenario after the stdio target session is closed.");
    }
    if (scenario.specRevision !== this.#recorder.getRevision()) {
      throw new ScenarioError("All scenarios in a stdio target session must use the same spec revision.");
    }
    const startedAt = performance.now();
    const eventStart = this.#recorder.eventCount();
    const byteStart = this.#recorder.byteCounts();
    const responses: JsonValue[] = [];
    let failure: StdioRunFailure | undefined;
    this.#unmatched.clear();
    try {
      await waitForSpawn(this.#child, this.#spawnError, this.#timeoutMs);
      for (const step of scenario.steps) {
        try {
          const response = await executeStep(step, this.#child, this.#frames, this.#unmatched, this.#recorder);
          if (response !== undefined) {
            responses.push(response);
          }
        } catch (error) {
          if (!(error instanceof TransportError)) {
            throw error;
          }
          failure = classifyFailure(error, this.#exitStatus);
          break;
        }
      }
      if (failure?.kind === "transport-error" && /EPIPE/u.test(failure.message) && this.#exitStatus === undefined) {
        await Promise.race([
          this.#exitPromise,
          new Promise<void>((resolve) => setTimeout(resolve, 100)),
        ]);
        if (this.#exitStatus !== undefined) {
          failure = { ...failure, kind: "target-exit" };
        }
      }
      if (options.closeAfterScenario ?? true) {
        await this.close(failure !== undefined);
      }
    } catch (error) {
      await this.close(true);
      throw error;
    }
    const byteCounts = this.#recorder.byteCounts();
    const finalFailure = failure ?? this.#closeFailure;
    return {
      trace: this.#recorder.toTrace(scenario.id, eventStart),
      responses,
      outcome: {
        ...(finalFailure === undefined ? {} : { failure: finalFailure }),
        exitCode: this.#exitStatus?.code ?? null,
        signal: this.#exitStatus?.signal ?? null,
        durationMs: Math.max(0, performance.now() - startedAt),
        stdoutBytes: byteCounts.stdoutBytes - byteStart.stdoutBytes,
        stderrBytes: byteCounts.stderrBytes - byteStart.stderrBytes,
      },
      transport: "stdio",
    };
  }

  async close(terminate = false): Promise<void> {
    if (this.#closed) {
      return;
    }
    if (terminate) {
      await terminateTarget(this.#child);
    } else {
      if (!this.#child.stdin?.destroyed) {
        this.#child.stdin?.end();
      }
      try {
        await waitForExit(this.#exitPromise, this.#timeoutMs);
      } catch (error) {
        if (!(error instanceof TargetError)) {
          throw error;
        }
        this.#closeFailure = { kind: "timeout", phase: "shutdown", message: error.message };
        await terminateTarget(this.#child);
      }
    }
    this.#recorder.flush();
    this.#closed = true;
  }
}

export async function runStdioScenario(options: StdioRunOptions): Promise<StdioRunResult> {
  const session = new StdioScenarioSession(options);
  return session.execute(options.scenario);
}

async function executeStep(
  step: ScenarioStep,
  child: ChildProcess,
  frames: AsyncQueue<Buffer>,
  unmatched: Map<string | number, JsonValue>,
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
      return readResponse(frames, unmatched, step.id, step.timeoutMs ?? 5_000);
    case "transport":
      if (step.operation !== "close-stdin") {
        throw new ScenarioError(`Transport operation '${step.operation}' cannot run over stdio.`);
      }
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
  unmatched: Map<string | number, JsonValue>,
  expectedId: string | number | undefined,
  timeoutMs: number,
): Promise<JsonValue> {
  if (expectedId !== undefined) {
    const stashed = unmatched.get(expectedId);
    if (stashed !== undefined) {
      unmatched.delete(expectedId);
      return stashed;
    }
  }
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
    // JSON-RPC allows responses in any order, so keep this one for a later await-response step.
    if (isRecord(message) && (typeof message.id === "string" || typeof message.id === "number")) {
      unmatched.set(message.id, message as JsonValue);
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

  getRevision(): Scenario["specRevision"] {
    return this.#revision;
  }

  eventCount(): number {
    return this.#events.length;
  }

  toTrace(scenarioId = this.#scenarioId, fromIndex = 0): Trace {
    return {
      formatVersion: 1,
      scenarioId,
      specRevision: this.#revision,
      transport: "stdio",
      events: this.#events.slice(fromIndex).map((event) => ({
        offsetMs: event.offsetMs,
        channel: event.channel,
        encoding: event.encoding,
        data: event.data,
        ...(event.http === undefined ? {} : { http: event.http }),
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
