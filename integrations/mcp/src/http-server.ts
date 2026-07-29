import {
  createServer,
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from "node:http";
import type { AddressInfo } from "node:net";

import {
  hostHeaderValidation,
  originValidation,
  toNodeHandler,
} from "@modelcontextprotocol/node";
import { createMcpHandler } from "@modelcontextprotocol/server";

import type { VoidMcpBridgeApi } from "./bridge.js";
import type { VoidMcpHttpConfig } from "./http-config.js";
import { buildVoidMcpServer } from "./server.js";

const ALLOWED_METHODS = new Set(["GET", "POST", "DELETE"]);

class HttpRequestError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "HttpRequestError";
    this.status = status;
  }
}

export type VoidMcpHttpAddress = Readonly<{
  host: string;
  port: number;
  path: string;
  url: string;
}>;

export type VoidMcpHttpServerHandle = Readonly<{
  server: Server;
  listen: () => Promise<VoidMcpHttpAddress>;
  close: () => Promise<void>;
}>;

function singleHeader(
  value: string | string[] | undefined,
): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function jsonError(
  response: ServerResponse,
  status: number,
  message: string,
  headers: Record<string, string> = {},
): void {
  if (response.headersSent || response.destroyed) return;
  response.writeHead(status, {
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8",
    ...headers,
  });
  response.end(JSON.stringify({
    jsonrpc: "2.0",
    error: {
      code: -32_000,
      message,
    },
    id: null,
  }));
}

function requestPath(request: IncomingMessage): string {
  let parsed: URL;
  try {
    parsed = new URL(request.url ?? "/", "http://localhost");
  } catch {
    throw new HttpRequestError(400, "Malformed request URL");
  }
  if (parsed.search !== "") {
    throw new HttpRequestError(404, "Not found");
  }
  return parsed.pathname;
}

function requireJsonContentType(request: IncomingMessage): void {
  const raw = singleHeader(request.headers["content-type"]);
  if (raw === undefined) {
    throw new HttpRequestError(415, "Content-Type must be application/json");
  }
  const mediaType = raw.split(";", 1)[0]?.trim().toLowerCase();
  if (mediaType !== "application/json") {
    throw new HttpRequestError(415, "Content-Type must be application/json");
  }

  const encoding = singleHeader(request.headers["content-encoding"]);
  if (
    encoding !== undefined
    && encoding.trim().toLowerCase() !== "identity"
  ) {
    throw new HttpRequestError(415, "Content-Encoding is not supported");
  }
}

async function readBoundedJsonBody(
  request: IncomingMessage,
  maximumBytes: number,
): Promise<unknown> {
  requireJsonContentType(request);
  const contentLength = singleHeader(request.headers["content-length"]);
  if (contentLength !== undefined) {
    if (!/^\d+$/.test(contentLength)) {
      throw new HttpRequestError(400, "Content-Length is invalid");
    }
    const length = Number(contentLength);
    if (!Number.isSafeInteger(length)) {
      throw new HttpRequestError(400, "Content-Length is invalid");
    }
    if (length > maximumBytes) {
      request.resume();
      throw new HttpRequestError(413, "MCP request body is too large");
    }
  }

  const chunks: Buffer[] = [];
  let total = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk)
      ? chunk
      : Buffer.from(chunk as Uint8Array);
    total += buffer.byteLength;
    if (total > maximumBytes) {
      request.resume();
      throw new HttpRequestError(413, "MCP request body is too large");
    }
    chunks.push(buffer);
  }
  if (total === 0) {
    throw new HttpRequestError(400, "MCP request body is required");
  }

  const text = Buffer.concat(chunks, total).toString("utf8");
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new HttpRequestError(400, "MCP request body must be valid JSON");
  }
}

export function createVoidMcpHttpServer(
  config: VoidMcpHttpConfig,
  bridge?: VoidMcpBridgeApi,
): VoidMcpHttpServerHandle {
  if (config.bridge.allowSubmit || config.bridge.tokenFile !== null) {
    throw new Error("VOID MCP HTTP server requires a read-only bridge config");
  }

  const handler = createMcpHandler(
    () => buildVoidMcpServer(config.bridge, bridge),
  );
  const nodeHandler = toNodeHandler(handler);
  const validateHost = hostHeaderValidation([...config.allowedHostnames]);
  const validateOrigin = originValidation([
    ...config.allowedOriginHostnames,
  ]);
  let activeRequests = 0;
  let closing = false;

  const server = createServer((request, response) => {
    void (async () => {
      if (!validateHost(request, response)) {
        request.resume();
        return;
      }
      if (!validateOrigin(request, response)) {
        request.resume();
        return;
      }

      let path: string;
      try {
        path = requestPath(request);
      } catch (error) {
        const failure = error as HttpRequestError;
        request.resume();
        jsonError(response, failure.status, failure.message);
        return;
      }
      if (path !== config.path) {
        request.resume();
        jsonError(response, 404, "Not found");
        return;
      }

      const method = (request.method ?? "GET").toUpperCase();
      const nodeRequest = Object.assign(request, {
        method,
        url: request.url ?? path,
      });
      if (!ALLOWED_METHODS.has(method)) {
        request.resume();
        jsonError(response, 405, "Method not allowed", {
          Allow: "GET, POST, DELETE",
        });
        return;
      }
      if (closing) {
        request.resume();
        jsonError(response, 503, "MCP HTTP server is closing");
        return;
      }
      if (activeRequests >= config.maxConcurrentRequests) {
        request.resume();
        jsonError(response, 503, "MCP HTTP concurrency limit reached", {
          "Retry-After": "1",
        });
        return;
      }

      activeRequests += 1;
      try {
        if (method === "POST") {
          const body = await readBoundedJsonBody(
            request,
            config.maxRequestBytes,
          );
          await nodeHandler(nodeRequest, response, body);
        } else {
          await nodeHandler(nodeRequest, response);
        }
      } catch (error) {
        if (error instanceof HttpRequestError) {
          request.resume();
          jsonError(response, error.status, error.message);
          return;
        }
        jsonError(response, 500, "Internal server error");
      } finally {
        activeRequests -= 1;
      }
    })().catch(() => {
      request.resume();
      jsonError(response, 500, "Internal server error");
    });
  });

  server.requestTimeout = 30_000;
  server.headersTimeout = 10_000;
  server.keepAliveTimeout = 5_000;
  server.maxHeadersCount = 64;
  server.maxRequestsPerSocket = 100;
  server.maxConnections = Math.max(16, config.maxConcurrentRequests * 4);
  server.on("clientError", (_error, socket) => {
    socket.destroy();
  });

  let closed = false;
  return Object.freeze({
    server,
    listen: async () => {
      if (closed || closing) {
        throw new Error("VOID MCP HTTP server is closed");
      }
      if (server.listening) {
        throw new Error("VOID MCP HTTP server is already listening");
      }

      await new Promise<void>((resolve, reject) => {
        const onError = (error: Error): void => {
          server.off("listening", onListening);
          reject(error);
        };
        const onListening = (): void => {
          server.off("error", onError);
          resolve();
        };
        server.once("error", onError);
        server.once("listening", onListening);
        server.listen(config.port, config.host);
      });

      const address = server.address();
      if (address === null || typeof address === "string") {
        throw new Error("VOID MCP HTTP server address is unavailable");
      }
      const port = (address as AddressInfo).port;
      return Object.freeze({
        host: config.host,
        port,
        path: config.path,
        url: `http://${config.host}:${port}${config.path}`,
      });
    },
    close: async () => {
      if (closed) return;
      closing = true;
      try {
        try {
          if (server.listening) {
            await new Promise<void>((resolve, reject) => {
              server.close((error) => {
                if (error) reject(error);
                else resolve();
              });
              server.closeIdleConnections();
              server.closeAllConnections();
            });
          }
        } finally {
          await handler.close();
        }
      } finally {
        closed = true;
      }
    },
  });
}
