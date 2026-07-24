#!/usr/bin/env node
import http from "node:http";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const MARKER = "VOID_AI_AGENT_PUBLIC_GATEWAY_V1";
const DEFAULT_HOST = "127.0.0.1";
const DEFAULT_PORT = 4112;

const here = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(
  process.env.VOID_REPO_ROOT || path.join(here, ".."),
);

const routeFiles = new Map([
  [
    "/public-node/agents/discovery-v1.json",
    "public/public-node/agents/discovery-v1.json",
  ],
  [
    "/public-node/agents/discovery-v1.schema.json",
    "public/public-node/agents/discovery-v1.schema.json",
  ],
  [
    "/.well-known/void-agent-discovery.json",
    "public/.well-known/void-agent-discovery.json",
  ],
  [
    "/.well-known/void-agent-discovery.schema.json",
    "public/.well-known/void-agent-discovery.schema.json",
  ],
  [
    "/public-node/agents/capabilities-v1.json",
    "public/public-node/agents/capabilities-v1.json",
  ],
  [
    "/public-node/agents/capabilities-v1.schema.json",
    "public/public-node/agents/capabilities-v1.schema.json",
  ],
  [
    "/.well-known/void-agent-capabilities.json",
    "public/.well-known/void-agent-capabilities.json",
  ],
  [
    "/.well-known/void-agent-capabilities.schema.json",
    "public/.well-known/void-agent-capabilities.schema.json",
  ],
]);

function fail(message) {
  process.stderr.write(`HOLD: ${message}\n`);
  process.exit(78);
}

const host =
  process.env.VOID_AI_AGENT_PUBLIC_GATEWAY_HOST || DEFAULT_HOST;

if (host !== DEFAULT_HOST) {
  fail(`gateway host must remain ${DEFAULT_HOST}`);
}

const rawPort =
  process.env.VOID_AI_AGENT_PUBLIC_GATEWAY_PORT ||
  String(DEFAULT_PORT);
const port = Number.parseInt(rawPort, 10);
const proofMode =
  process.env.VOID_AI_AGENT_PUBLIC_GATEWAY_PROOF_MODE === "1";

if (
  !Number.isInteger(port) ||
  port < 0 ||
  port > 65535 ||
  (port === 0 && !proofMode)
) {
  fail(`invalid gateway port: ${rawPort}`);
}

const payloads = new Map();

for (const [route, relativePath] of routeFiles.entries()) {
  const absolutePath = path.join(repositoryRoot, relativePath);
  let bytes;

  try {
    bytes = readFileSync(absolutePath);
    JSON.parse(bytes.toString("utf8"));
  } catch (error) {
    fail(
      `cannot load valid JSON for ${route} from ${absolutePath}: ` +
        String(error),
    );
  }

  payloads.set(route, bytes);
}

function commonHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Cache-Control": "no-store",
    "Content-Security-Policy": "default-src 'none'",
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
  };
}

function emptyResponse(response, statusCode, extraHeaders = {}) {
  response.writeHead(statusCode, {
    ...commonHeaders(),
    "Content-Length": "0",
    ...extraHeaders,
  });
  response.end();
}

const server = http.createServer((request, response) => {
  const method = request.method || "";

  if (method !== "GET" && method !== "HEAD") {
    emptyResponse(response, 405, { Allow: "GET, HEAD" });
    return;
  }

  let parsed;
  try {
    parsed = new URL(request.url || "/", "http://127.0.0.1");
  } catch {
    emptyResponse(response, 400);
    return;
  }

  if (parsed.search || parsed.hash) {
    emptyResponse(response, 404);
    return;
  }

  const bytes = payloads.get(parsed.pathname);
  if (!bytes) {
    emptyResponse(response, 404);
    return;
  }

  response.writeHead(200, {
    ...commonHeaders(),
    "Content-Length": String(bytes.length),
    "Content-Type": "application/json; charset=utf-8",
  });

  if (method === "HEAD") {
    response.end();
    return;
  }

  response.end(bytes);
});

server.requestTimeout = 5_000;
server.headersTimeout = 5_000;
server.keepAliveTimeout = 5_000;
server.maxRequestsPerSocket = 100;

server.on("clientError", (_error, socket) => {
  if (socket.writable) {
    socket.end(
      "HTTP/1.1 400 Bad Request\r\n" +
        "Connection: close\r\n" +
        "Content-Length: 0\r\n\r\n",
    );
  }
});

function shutdown(signal) {
  server.close((error) => {
    if (error) {
      process.stderr.write(
        `${MARKER} shutdown_error=${String(error)}\n`,
      );
      process.exit(1);
    }

    process.stdout.write(
      `${MARKER} stopped signal=${signal}\n`,
    );
    process.exit(0);
  });

  setTimeout(() => process.exit(1), 5_000).unref();
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

server.listen({ host, port, exclusive: true }, () => {
  const address = server.address();

  if (!address || typeof address === "string") {
    fail("unexpected gateway listen address");
  }

  process.stdout.write(
    JSON.stringify({
      marker: MARKER,
      ready: true,
      host: address.address,
      port: address.port,
      repository_root: repositoryRoot,
      allowed_methods: ["GET", "HEAD"],
      allowed_routes: [...routeFiles.keys()],
      mutation_authority: false,
      proxy_authority: false,
    }) + "\n",
  );
});
