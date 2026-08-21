#!/usr/bin/env node
import http from "node:http";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const MARKER = "VOID_PUBLIC_FRONTDOOR_V1";
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const HOME_PATH = resolve(ROOT, "public/void-public-frontdoor-v1/index.html");
const BIND = process.env.VOID_PUBLIC_FRONTDOOR_BIND || "127.0.0.1";
const PORT = Number(process.env.VOID_PUBLIC_FRONTDOOR_PORT || "8083");
const UPSTREAM_HOST = "127.0.0.1";
const UPSTREAM_PORT = Number(process.env.VOID_PUBLIC_FRONTDOOR_UPSTREAM_PORT || "8082");
const UPSTREAM_TIMEOUT_MS = 30_000;

if (!Number.isSafeInteger(PORT) || PORT < 1 || PORT > 65535) throw new Error("invalid frontdoor port");
if (!Number.isSafeInteger(UPSTREAM_PORT) || UPSTREAM_PORT < 1 || UPSTREAM_PORT > 65535) throw new Error("invalid upstream port");
if (BIND !== "127.0.0.1") throw new Error("frontdoor must remain loopback-only");

const home = readFileSync(HOME_PATH);
const HOP_BY_HOP = new Set([
  "connection", "proxy-connection", "keep-alive", "proxy-authenticate",
  "proxy-authorization", "te", "trailer", "transfer-encoding", "upgrade",
]);

const filteredHeaders = (headers) => {
  const out = {};
  for (const [name, value] of Object.entries(headers)) {
    if (value === undefined || HOP_BY_HOP.has(name.toLowerCase())) continue;
    out[name] = value;
  }
  return out;
};

const sendHome = (req, res) => {
  res.writeHead(200, {
    "content-type": "text/html; charset=utf-8",
    "content-length": home.byteLength,
    "cache-control": "no-store",
    "x-void-frontdoor": MARKER,
  });
  if (req.method === "HEAD") res.end();
  else res.end(home);
};

const sendStatus = (req, res) => {
  const body = Buffer.from(`${JSON.stringify({
    marker: MARKER,
    ready: true,
    bind: BIND,
    port: PORT,
    upstream: `http://${UPSTREAM_HOST}:${UPSTREAM_PORT}`,
  })}\n`);
  res.writeHead(200, {
    "content-type": "application/json; charset=utf-8",
    "content-length": body.byteLength,
    "cache-control": "no-store",
    "x-void-frontdoor": MARKER,
  });
  if (req.method === "HEAD") res.end();
  else res.end(body);
};

const proxy = (req, res) => {
  const headers = filteredHeaders(req.headers);
  headers.host = `${UPSTREAM_HOST}:${UPSTREAM_PORT}`;
  headers["x-void-frontdoor"] = MARKER;

  const upstream = http.request({
    hostname: UPSTREAM_HOST,
    port: UPSTREAM_PORT,
    method: req.method,
    path: req.url || "/",
    headers,
  }, (upstreamRes) => {
    const responseHeaders = filteredHeaders(upstreamRes.headers);
    responseHeaders["x-void-frontdoor"] = MARKER;
    res.writeHead(upstreamRes.statusCode || 502, upstreamRes.statusMessage, responseHeaders);
    upstreamRes.pipe(res);
  });

  upstream.setTimeout(UPSTREAM_TIMEOUT_MS, () => upstream.destroy(new Error("upstream timeout")));
  upstream.on("error", () => {
    if (res.headersSent) {
      res.destroy();
      return;
    }
    const body = Buffer.from("public gateway unavailable\n");
    res.writeHead(502, {
      "content-type": "text/plain; charset=utf-8",
      "content-length": body.byteLength,
      "cache-control": "no-store",
      "x-void-frontdoor": MARKER,
    });
    res.end(body);
  });
  req.pipe(upstream);
};

const server = http.createServer((req, res) => {
  let pathname;
  try {
    pathname = new URL(req.url || "/", "http://frontdoor.invalid").pathname;
  } catch {
    res.writeHead(400, { "content-type": "text/plain; charset=utf-8" });
    res.end("bad request\n");
    return;
  }

  if (["GET", "HEAD"].includes(req.method || "") && (pathname === "/" || pathname === "/index.html")) {
    sendHome(req, res);
    return;
  }
  if (["GET", "HEAD"].includes(req.method || "") && pathname === "/__void/frontdoor/status.json") {
    sendStatus(req, res);
    return;
  }
  proxy(req, res);
});

server.on("clientError", (_error, socket) => {
  if (socket.writable) socket.end("HTTP/1.1 400 Bad Request\r\nConnection: close\r\n\r\n");
});

server.listen(PORT, BIND, () => {
  console.log("VOID_PUBLIC_FRONTDOOR_V1_READY");
  console.log(`bind=${BIND}`);
  console.log(`port=${PORT}`);
  console.log(`upstream=http://${UPSTREAM_HOST}:${UPSTREAM_PORT}`);
  console.log("node_runtime_mutated=false");
});
