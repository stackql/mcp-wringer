import http from "node:http";

const revisionIndex = process.argv.indexOf("--revision");
const revision = revisionIndex >= 0 ? process.argv[revisionIndex + 1] : undefined;
const portIndex = process.argv.indexOf("--port");
const port = Number(portIndex >= 0 ? process.argv[portIndex + 1] : undefined);
const defects = new Set((process.env.MCP_WRINGER_DEFECTS ?? "").split(",").filter(Boolean));
if ((revision !== "2025-11-25" && revision !== "2026-07-28") || !Number.isInteger(port) || port < 1) {
  process.stderr.write("Expected --revision and --port\n");
  process.exit(2);
}

let initialized = revision === "2026-07-28";
let livenessBroken = false;
let stateChanged = false;
const sessionId = "mcp-wringer-fixture-session";
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

const server = http.createServer((request, response) => {
  if (request.method !== "POST") {
    response.writeHead(405, { Allow: "POST" }).end();
    return;
  }
  if (!request.headers.accept?.includes("application/json")
    || !request.headers.accept.includes("text/event-stream")) {
    response.writeHead(400).end();
    return;
  }
  if (!request.headers["content-type"]?.startsWith("application/json")) {
    response.writeHead(400).end();
    return;
  }
  if (revision === "2026-07-28" && request.headers["mcp-protocol-version"] === undefined) {
    response.writeHead(400).end();
    return;
  }
  if (request.headers["mcp-protocol-version"] !== undefined
    && request.headers["mcp-protocol-version"] !== revision) {
    response.writeHead(400, { "Content-Type": "application/json" })
      .end(JSON.stringify({ jsonrpc: "2.0", id: null, error: { code: -32600, message: "Header mismatch" } }));
    return;
  }
  let body = Buffer.alloc(0);
  request.on("data", (chunk) => {
    body = Buffer.concat([body, chunk]);
    if (body.length > 65_536 && defects.has("reject-oversized-frame")) {
      process.exit(17);
    }
  });
  request.on("aborted", () => {
    if (defects.has("exit-on-partial-eof")) {
      process.exit(17);
    }
    if (!response.destroyed) {
      response.writeHead(400).end();
    }
  });
  request.on("end", () => {
    if (body.length > 65_536 && defects.has("reject-oversized-frame")) {
      process.exit(17);
    }
    let message;
    try {
      message = JSON.parse(body.toString("utf8"));
    } catch {
      if (defects.has("exit-on-decode-error")) {
        process.exit(17);
      }
      response.writeHead(400).end();
      return;
    }
    if (defects.has("accepts-malformed")
      && (message?.jsonrpc !== "2.0" || typeof message?.method !== "string")) {
      sendResponse(response, message, { accepted: true });
      return;
    }
    if (!message || typeof message !== "object" || Array.isArray(message)
      || message.jsonrpc !== "2.0" || typeof message.method !== "string") {
      send(response, {
        jsonrpc: "2.0",
        id: message?.id ?? null,
        error: {
          code: defects.has("wrong-error-code") ? -32000 : -32600,
          message: "Invalid request.",
        },
      });
      return;
    }
    if (revision === "2026-07-28" && "id" in message && !headersMatchBody(request.headers, message)) {
      response.writeHead(400, { "Content-Type": "application/json" }).end(JSON.stringify({
        jsonrpc: "2.0",
        id: message.id ?? null,
        error: { code: -32020, message: "Header mismatch" },
      }));
      return;
    }
    if (revision === "2025-11-25" && initialized && message.method !== "initialize"
      && request.headers["mcp-session-id"] !== sessionId) {
      response.writeHead(404).end();
      return;
    }
    if (message.method === "initialize" && revision === "2025-11-25") {
      sendResponse(response, message, {
        protocolVersion: revision,
        capabilities: { tools: {}, resources: {}, prompts: {} },
        serverInfo: { name: "mcp-wringer-fixture", version: "0.1.0" },
      }, { "MCP-Session-Id": sessionId });
      return;
    }
    if (message.method === "notifications/initialized" && revision === "2025-11-25") {
      initialized = true;
      if (defects.has("respond-to-notification")) {
        response.writeHead(200, { "Content-Type": "application/json" })
          .end(JSON.stringify({ jsonrpc: "2.0", id: "unexpected-notification-response", result: {} }));
      } else {
        response.writeHead(202).end();
      }
      return;
    }
    if (!initialized) {
      send(response, {
        jsonrpc: "2.0",
        id: message.id,
        error: { code: -32600, message: "Not initialized" },
      });
      return;
    }
    if ((message.method === "fixture/hang" || message.method === "tools/list")
      && defects.has("hang-on-request")) {
      return;
    }
    if (message.method === "fixture/break-liveness" && defects.has("break-liveness")) {
      livenessBroken = true;
      sendResponse(response, message, { changed: true });
      return;
    }
    if (message.method === "fixture/mutate-state" && defects.has("mutate-state")) {
      stateChanged = true;
      sendResponse(response, message, { changed: true });
      return;
    }
    if ((message.method === "ping" || message.method === "server/discover") && livenessBroken) {
      send(response, { jsonrpc: "2.0", id: message.id, error: { code: -32603, message: "Liveness probe failed." } });
      return;
    }
    if (message.method === "tools/call" && message.params?.name === "search") {
      if (defects.has("mutate-state")) {
        stateChanged = true;
      }
      sendResponse(response, message, { content: [{ type: "text", text: "Search completed." }] });
      return;
    }
    if (message.method === "fixture/large" && defects.has("large-response")) {
      sendResponse(response, message, { payload: "x".repeat(1_100_000) });
      return;
    }
    let result = getResult(message.method);
    if (message.method === "tools/list" && defects.has("large-response")) {
      result = { tools, padding: "x".repeat(1_100_000) };
    }
    if (message.method === "tools/list" && defects.has("break-liveness")) {
      result = stateChanged ? { tools: tools.filter((tool) => tool.name !== "search") } : { tools };
      sendResponse(response, message, result);
      livenessBroken = true;
      return;
    }
    if (result === undefined) {
      send(response, {
        jsonrpc: "2.0",
        id: message.id,
        error: {
          code: defects.has("wrong-error-code") ? -32000 : -32601,
          message: defects.has("error-leak")
            ? "Error: fixture failure at handler (C:\\private\\fixture.js:4:2)"
            : "Method not found",
        },
      });
      return;
    }
    if (message.method === "tools/list" && defects.has("invalid-schema")) {
      sendResponse(response, message, { tools: "not-an-array" });
      return;
    }
    if (message.method === "tools/list" && stateChanged) {
      result = { ...result, tools: tools.filter((tool) => tool.name !== "search") };
    }
    if (defects.has("http-invalid-media-type")) {
      response.writeHead(200, { "Content-Type": "text/plain" }).end(JSON.stringify({ jsonrpc: "2.0", id: message.id, result }));
      return;
    }
    if (defects.has("http-invalid-response-body")) {
      response.writeHead(200, { "Content-Type": "application/json" }).end("{not-json");
      return;
    }
    sendResponse(response, message, result);
  });
});

server.listen(port, "127.0.0.1");

function getResult(method) {
  switch (method) {
    case "ping":
      return revision === "2025-11-25" ? {} : undefined;
    case "server/discover":
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

function sendResponse(response, request, result, headers = {}) {
  const responseId = defects.has("wrong-response-id")
    && request?.id !== undefined
    && request.method !== "initialize"
    && request.method !== "server/discover"
    ? typeof request.id === "number" ? request.id + 1 : `${request.id}-wrong`
    : request?.id;
  const responseBody = {
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
  };
  if (defects.has("http-abort-response")) {
    response.writeHead(200, { "Content-Type": "application/json" });
    response.write('{"jsonrpc":"2.0"');
    response.destroy();
    return;
  }
  response.writeHead(200, { "Content-Type": "application/json", ...headers });
  response.end(JSON.stringify(responseBody));
}

function send(response, message) {
  response.writeHead(200, { "Content-Type": "application/json" });
  response.end(JSON.stringify(message));
}

function headersMatchBody(headers, message) {
  if (headers["mcp-method"] !== message.method) {
    return false;
  }
  const field = { "tools/call": "name", "prompts/get": "name", "resources/read": "uri" }[message.method];
  const expected = field === undefined ? undefined : message.params?.[field];
  if (typeof expected !== "string") {
    return true;
  }
  return decodeHeaderValue(headers["mcp-name"]) === expected;
}

function decodeHeaderValue(value) {
  if (typeof value === "string" && value.startsWith("=?base64?") && value.endsWith("?=")) {
    return Buffer.from(value.slice(9, -2), "base64").toString("utf8");
  }
  return value;
}
