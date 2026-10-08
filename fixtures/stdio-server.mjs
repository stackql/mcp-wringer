const revisionIndex = process.argv.indexOf("--revision");
const revision = revisionIndex >= 0 ? process.argv[revisionIndex + 1] : undefined;
const defects = new Set((process.env.MCP_WRINGER_DEFECTS ?? "").split(",").filter(Boolean));
if (revision !== "2025-11-25" && revision !== "2026-07-28") {
  process.stderr.write("Expected --revision 2025-11-25 or 2026-07-28\n");
  process.exit(2);
}
if (process.env.FIXTURE_EMIT_SECRET_SPLIT && process.env.FIXTURE_EMIT_SECRET) {
  const secret = process.env.FIXTURE_EMIT_SECRET;
  const splitAt = Math.floor(secret.length / 2);
  process.stderr.write(`fixture secret: ${secret.slice(0, splitAt)}`);
  setImmediate(() => process.stderr.write(`${secret.slice(splitAt)}\n`));
} else if (process.env.FIXTURE_EMIT_SECRET) {
  process.stderr.write(`fixture secret: ${process.env.FIXTURE_EMIT_SECRET}\n`);
}

let initialized = revision === "2026-07-28";
let livenessBroken = false;
let stateChanged = false;
const tools = [
  {
    name: "search",
    description: "Search fixture records.",
    inputSchema: {
      type: "object",
      properties: { query: { type: "string" } },
      required: ["query"],
    },
    annotations: { readOnlyHint: true },
  },
  {
    name: "delete-record",
    description: "Delete a fixture record.",
    inputSchema: { type: "object", properties: { id: { type: "string" } } },
    annotations: { destructiveHint: true },
  },
];
const resources = [{ uri: "fixture://welcome", name: "Welcome", mimeType: "text/plain" }];
const prompts = [{ name: "summarize", description: "Summarize supplied text." }];

let inputBuffer = Buffer.alloc(0);
let partialFrameTimer;
process.stdin.on("data", (chunk) => {
  let frameCount = 0;
  for (const byte of chunk) {
    if (byte === 0x0a) {
      frameCount += 1;
    }
  }
  if (defects.has("whole-frame-write-only") && !chunk.includes(0x0a)) {
    process.exit(17);
  }
  if (defects.has("one-frame-per-read") && frameCount > 1) {
    process.exit(17);
  }
  inputBuffer = Buffer.concat([inputBuffer, chunk]);
  if (defects.has("reject-oversized-frame") && inputBuffer.length > 65_536) {
    process.exit(17);
  }
  let newline = inputBuffer.indexOf(0x0a);
  while (newline >= 0) {
    let frame = inputBuffer.subarray(0, newline);
    inputBuffer = inputBuffer.subarray(newline + 1);
    if (frame.at(-1) === 0x0d) {
      if (defects.has("reject-crlf")) {
        process.exit(17);
      }
      frame = frame.subarray(0, -1);
    }
    if (frame.length === 0 && defects.has("reject-empty-frame")) {
      process.exit(17);
    }
    if (defects.has("reject-oversized-frame") && frame.length > 65_536) {
      process.exit(17);
    }
    handleFrame(frame);
    newline = inputBuffer.indexOf(0x0a);
  }
  if (inputBuffer.length === 0) {
    clearTimeout(partialFrameTimer);
    partialFrameTimer = undefined;
  } else if (defects.has("partial-frame-timeout") && partialFrameTimer === undefined) {
    partialFrameTimer = setTimeout(() => process.exit(17), 30);
  }
});
process.stdin.on("end", () => {
  clearTimeout(partialFrameTimer);
  if (inputBuffer.length === 0) {
    return;
  }
  if (defects.has("require-final-newline") || defects.has("exit-on-partial-eof")) {
    process.exit(17);
  }
  handleFrame(inputBuffer);
});

function handleFrame(bytes) {
  if (!Buffer.from(bytes.toString("utf8"), "utf8").equals(bytes)) {
    if (defects.has("exit-on-decode-error")) {
      process.exit(17);
    }
    return;
  }
  const line = bytes.toString("utf8");
  let request;
  try {
    request = JSON.parse(line);
  } catch {
    if (defects.has("exit-on-decode-error")) {
      process.exit(17);
    }
    return;
  }

  if (!request || typeof request !== "object" || Array.isArray(request)) {
    return;
  }

  if (defects.has("accepts-malformed")
    && (request.jsonrpc !== "2.0" || typeof request.method !== "string")) {
    sendResponse(request, typeof request.method === "string" ? getResult(request.method) ?? { accepted: true } : { accepted: true });
    return;
  }

  if (typeof request.method !== "string") {
    send({
      jsonrpc: "2.0",
      id: request.id ?? null,
      error: { code: -32600, message: "Invalid request." },
    });
    return;
  }

  if (request.jsonrpc !== "2.0") {
    send({
      jsonrpc: "2.0",
      id: request.id ?? null,
      error: {
        code: defects.has("wrong-error-code") ? -32000 : -32600,
        message: "Invalid request.",
      },
    });
    return;
  }

  if (defects.has("stdout-pollution")) {
    process.stdout.write("fixture diagnostic: not JSON-RPC\n");
  }

  if (request.method === "notifications/initialized" && revision === "2025-11-25") {
    initialized = true;
    if (defects.has("respond-to-notification")) {
      sendResponse({ id: "unexpected-notification-response" }, {});
    }
    return;
  }

  if (request.method === "initialize" && revision === "2025-11-25") {
    send({
      jsonrpc: "2.0",
      id: request.id,
      result: {
        protocolVersion: "2025-11-25",
        capabilities: { tools: {}, resources: {}, prompts: {} },
        serverInfo: { name: "mcp-wringer-fixture", version: "0.1.0" },
      },
    });
    return;
  }

  if (!initialized) {
    send({ jsonrpc: "2.0", id: request.id, error: { code: -32600, message: "Not initialized" } });
    return;
  }

  const method = request.method;
  if (method === "fixture/hang" && defects.has("hang-on-request")) {
    return;
  }
  if (method === "fixture/break-liveness" && defects.has("break-liveness")) {
    livenessBroken = true;
    sendResponse(request, { changed: true });
    return;
  }
  if (method === "fixture/mutate-state" && defects.has("mutate-state")) {
    stateChanged = true;
    sendResponse(request, { changed: true });
    return;
  }
  if ((method === "ping" || method === "server/discover") && livenessBroken) {
    send({
      jsonrpc: "2.0",
      id: request.id,
      error: { code: -32603, message: "Liveness probe failed." },
    });
    return;
  }
  if (method === "fixture/large" && defects.has("large-response")) {
    sendResponse(request, { payload: "x".repeat(1_100_000) });
    return;
  }
  if (method === "fixture/invalid-envelope" && defects.has("wrong-error-code")) {
    send({
      jsonrpc: "2.0",
      id: request.id,
      error: { code: -32000, message: "Invalid request." },
    });
    return;
  }
  const result = getResult(method);
  if (result === undefined) {
    send({
      jsonrpc: "2.0",
      id: request.id,
      error: {
        code: defects.has("wrong-error-code") ? -32000 : -32601,
        message: defects.has("error-leak")
          ? "Error: fixture failure at handler (C:\\private\\fixture.js:4:2)"
          : "Method not found",
      },
    });
    return;
  }
  if (method === "tools/list" && defects.has("invalid-schema")) {
    sendResponse(request, { tools: "not-an-array" });
    return;
  }
  if (method === "tools/list" && stateChanged) {
    result.tools = result.tools.filter((tool) => tool.name !== "search");
  }
  sendResponse(request, result);
}

function getResult(method) {
  switch (method) {
    case "ping":
      return revision === "2025-11-25" ? {} : undefined;
    case "server/discover":
      if (livenessBroken) {
        return undefined;
      }
      return {
        supportedVersions: ["2026-07-28"],
        capabilities: { tools: {}, resources: {}, prompts: {} },
      };
    case "tools/list":
      return { tools };
    case "resources/list":
      return { resources };
    case "prompts/list":
      return { prompts };
    default:
      return undefined;
  }
}

function sendResponse(request, result) {
  const responseId = defects.has("wrong-response-id")
    && request.id !== undefined
    && request.method !== "initialize"
    && request.method !== "server/discover"
    ? typeof request.id === "number" ? request.id + 1 : `${request.id}-wrong`
    : request.id;
  send({
    jsonrpc: "2.0",
    ...(responseId === undefined ? {} : { id: responseId }),
    result: revision === "2026-07-28"
      ? {
          ...result,
          _meta: { "io.modelcontextprotocol/serverInfo": { name: "mcp-wringer-fixture", version: "0.1.0" } },
          resultType: "complete",
          cacheScope: "public",
          ttlMs: 0,
        }
      : result,
  });
}

function send(message) {
  process.stdout.write(`${JSON.stringify(message)}\n`);
}
