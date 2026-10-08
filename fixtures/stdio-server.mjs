import readline from "node:readline";

const revisionIndex = process.argv.indexOf("--revision");
const revision = revisionIndex >= 0 ? process.argv[revisionIndex + 1] : undefined;
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

const input = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });
input.on("line", (line) => {
  let request;
  try {
    request = JSON.parse(line);
  } catch {
    return;
  }

  if (!request || typeof request !== "object" || typeof request.method !== "string") {
    return;
  }

  if (request.method === "notifications/initialized" && revision === "2025-11-25") {
    initialized = true;
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
  const result = getResult(method);
  if (result === undefined) {
    send({ jsonrpc: "2.0", id: request.id, error: { code: -32601, message: "Method not found" } });
    return;
  }
  send({
    jsonrpc: "2.0",
    id: request.id,
    result: revision === "2026-07-28"
      ? {
          ...result,
          _meta: { "io.modelcontextprotocol/serverInfo": { name: "mcp-wringer-fixture", version: "0.1.0" } },
          resultType: "complete",
        }
      : result,
  });
});

function getResult(method) {
  switch (method) {
    case "ping":
      return revision === "2025-11-25" ? {} : undefined;
    case "server/discover":
      return {
        supportedProtocolVersions: ["2026-07-28"],
        capabilities: { tools: {}, resources: {}, prompts: {} },
        serverInfo: { name: "mcp-wringer-fixture", version: "0.1.0" },
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

function send(message) {
  process.stdout.write(`${JSON.stringify(message)}\n`);
}
