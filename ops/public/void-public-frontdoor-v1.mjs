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
const READ_ONLY = process.env.VOID_PUBLIC_FRONTDOOR_READ_ONLY || "0";
const STATUS_MAX_BYTES = 256 * 1024;
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
if (!["0", "1"].includes(READ_ONLY)) throw new Error("invalid read-only mode");

const home = readFileSync(HOME_PATH);
const HOP_BY_HOP = new Set([
  "connection", "proxy-connection", "keep-alive", "proxy-authenticate",
  "proxy-authorization", "te", "trailer", "transfer-encoding", "upgrade",
]);

const filteredHeaders = (headers) => {
  const denied = new Set(HOP_BY_HOP);
  const connection = headers.connection;
  if (connection !== undefined) {
    const value = Array.isArray(connection) ? connection.join(",") : connection;
    if (typeof value !== "string" || value.length > 16384) throw new Error("invalid Connection field");
    const options = value.split(",");
    if (options.length > 256) throw new Error("too many Connection options");
    let tokens = 0;
    for (const option of options) {
      const token = option.replace(/^[ \t]+|[ \t]+$/g, "");
      // RFC 9110 list recipients tolerate a bounded number of empty members.
      if (!token) continue;
      if (!/^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/.test(token)) throw new Error("invalid Connection option");
      denied.add(token.toLowerCase());
      tokens += 1;
    }
    if (!tokens) throw new Error("empty Connection field");
  }
  const out = {};
  for (const [name, value] of Object.entries(headers)) {
    if (value === undefined || denied.has(name.toLowerCase())) continue;
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
  let admittedResponse = null;
  let bytes = 0;
  const finish = (ready) => {
    if (settled) return;
    settled = true;
    if (timer) clearTimeout(timer);
    admittedResponse?.destroy();
    request.destroy();
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
    admittedResponse = response;
    response.on("error", () => finish(false));
    response.on("aborted", () => finish(false));
    response.on("close", () => { if (!settled) finish(false); });
    const statusCode = response.statusCode || 0;
    let headers;
    try { headers = filteredHeaders(response.headers); }
    catch (error) { finish(false); return; }
    const declared = headers["content-length"];
    if (statusCode < 200 || statusCode >= 300
      || headers[STATUS_PROBE_IDENTITY_HEADER] !== STATUS_PROBE_IDENTITY_VALUE
      || (declared !== undefined && (!/^\d+$/.test(declared) || Number(declared) > STATUS_MAX_BYTES))) {
      finish(false);
      return;
    }
    response.on("data", (chunk) => {
      bytes += chunk.length;
      if (bytes > STATUS_MAX_BYTES) finish(false);
    });
    response.on("end", () => finish(response.complete && bytes <= STATUS_MAX_BYTES));
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
    read_only: READ_ONLY === "1",
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
  let headers;
  try { headers = filteredHeaders(req.headers); }
  catch (error) {
    res.writeHead(400, { "content-type": "text/plain", connection: "close" });
    res.end("bad Connection field\n");
    return;
  }
  headers.host = `${UPSTREAM_HOST}:${UPSTREAM_PORT}`;
  headers["x-void-frontdoor"] = MARKER;
  let terminal = false;
  let admittedResponse = null;
  let timer = null;
  const finish = (failed) => {
    if (terminal) return;
    terminal = true;
    if (timer) clearTimeout(timer);
    req.unpipe(upstream);
    admittedResponse?.unpipe(res);
    admittedResponse?.destroy();
    upstream.destroy();
    if (!failed) return;
    if (res.headersSent || res.destroyed) { res.destroy(); return; }
    res.writeHead(502, {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "no-store", "x-void-frontdoor": MARKER,
      connection: "close",
    });
    res.end("public gateway unavailable\n");
  };
  const upstream = http.request({
    hostname: UPSTREAM_HOST,
    port: UPSTREAM_PORT,
    method: req.method,
    path: req.url || "/",
    headers,
  }, (upstreamRes) => {
    admittedResponse = upstreamRes;
    upstreamRes.on("error", () => finish(true));
    upstreamRes.on("aborted", () => finish(true));
    upstreamRes.on("close", () => {
      if (!upstreamRes.complete) finish(true);
    });
    upstreamRes.on("end", () => {
      if (!upstreamRes.complete) finish(true);
    });
    if (terminal) { upstreamRes.destroy(); return; }
    let responseHeaders;
    try { responseHeaders = filteredHeaders(upstreamRes.headers); }
    catch (error) { finish(true); return; }
    responseHeaders["x-void-frontdoor"] = MARKER;
    res.writeHead(upstreamRes.statusCode || 502, upstreamRes.statusMessage, responseHeaders);
    upstreamRes.pipe(res);
  });

  timer = setTimeout(() => finish(true), UPSTREAM_TIMEOUT_MS);
  timer.unref?.();
  upstream.on("error", () => finish(true));
  req.on("aborted", () => finish(true));
  req.on("error", () => finish(true));
  res.on("error", () => finish(true));
  res.on("close", () => finish(!res.writableFinished));
  res.on("finish", () => finish(false));
  req.pipe(upstream);
};

const server = http.createServer((req, res) => {
  if (READ_ONLY === "1" && !["GET", "HEAD"].includes(req.method || "")) {
    res.writeHead(405, { allow: "GET, HEAD", connection: "close" });
    res.end();
    return;
  }
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
