#!/usr/bin/env node
import http from "node:http";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const MARKER = "VOID_PUBLIC_FRONTDOOR_V1";
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const HOME_PATH = process.env.VOID_PUBLIC_FRONTDOOR_HOME || resolve(ROOT, "public/void-public-frontdoor-v1/index.html");
const BIND = process.env.VOID_PUBLIC_FRONTDOOR_BIND || "127.0.0.1";
const PORT = Number(process.env.VOID_PUBLIC_FRONTDOOR_PORT || "8083");
const UPSTREAM_HOST = "127.0.0.1";
const UPSTREAM_PORT = Number(process.env.VOID_PUBLIC_FRONTDOOR_UPSTREAM_PORT || "8082");
const UPSTREAM_TIMEOUT_MS = 30_000;
const STATUS_PROBE_PATH = "/app/";
const STATUS_PROBE_IDENTITY_HEADER = "x-void-public-app-composition";
const STATUS_PROBE_IDENTITY_VALUE = "v1";
const STATUS_PROBE_TIMEOUT_MS = Number(
  process.env.VOID_PUBLIC_FRONTDOOR_STATUS_TIMEOUT_MS || "1000",
);

if (!Number.isSafeInteger(PORT) || PORT < 1 || PORT > 65535) throw new Error("invalid frontdoor port");
if (!Number.isSafeInteger(UPSTREAM_PORT) || UPSTREAM_PORT < 1 || UPSTREAM_PORT > 65535) throw new Error("invalid upstream port");
if (
  !Number.isSafeInteger(STATUS_PROBE_TIMEOUT_MS)
  || STATUS_PROBE_TIMEOUT_MS < 100
  || STATUS_PROBE_TIMEOUT_MS > 5000
) throw new Error("invalid frontdoor status probe timeout");
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

let statusProbeInFlight = null;

const probeUpstreamReady = () => new Promise((resolvePromise) => {
  let settled = false;
  let timer = null;
  const finish = (ready) => {
    if (settled) return;
    settled = true;
    if (timer) clearTimeout(timer);
    resolvePromise(ready);
  };

  const request = http.request({
    hostname: UPSTREAM_HOST,
    port: UPSTREAM_PORT,
    method: "GET",
    path: STATUS_PROBE_PATH,
    headers: {
      accept: "text/html",
      "user-agent": "void-public-frontdoor-status-probe-v1",
    },
  }, (response) => {
    const statusCode = response.statusCode || 0;
    const upstreamIdentity =
      response.headers[STATUS_PROBE_IDENTITY_HEADER];
    response.on("error", () => {});
    response.destroy();
    finish(
      statusCode >= 200
      && statusCode < 300
      && upstreamIdentity === STATUS_PROBE_IDENTITY_VALUE,
    );
  });

  timer = setTimeout(() => {
    request.destroy();
    finish(false);
  }, STATUS_PROBE_TIMEOUT_MS);
  timer.unref?.();

  request.on("error", () => finish(false));
  request.end();
});

const getUpstreamReady = () => {
  if (statusProbeInFlight) return statusProbeInFlight;
  const probe = probeUpstreamReady();
  statusProbeInFlight = probe;
  void probe.finally(() => {
    if (statusProbeInFlight === probe) statusProbeInFlight = null;
  });
  return probe;
};

const sendStatus = async (req, res) => {
  const upstreamReady = await getUpstreamReady();
  if (res.destroyed || res.writableEnded) return;

  const body = Buffer.from(`${JSON.stringify({
    marker: MARKER,
    ready: upstreamReady,
    listener_ready: true,
    upstream_ready: upstreamReady,
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
    void sendStatus(req, res);
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