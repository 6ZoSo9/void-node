#!/usr/bin/env node
"use strict";

/**
 * Local-only IPv6 loopback proxy:
 *   listens on [::1]:4100
 *   forwards to 127.0.0.1:4100
 *
 * Fixes clients that resolve localhost -> ::1 first while void-node binds to 127.0.0.1.
 */

const http = require("http");

function parsePort(rawValue, label) {
  const text = String(rawValue);
  if (!/^[1-9][0-9]{0,4}$/.test(text)) {
    throw new TypeError(`${label} must be a canonical decimal port`);
  }
  const value = Number(text);
  if (!Number.isSafeInteger(value) || value > 65535) {
    throw new RangeError(`${label} must be between 1 and 65535`);
  }
  return value;
}

const LISTEN_HOST = process.env.V6PROXY_LISTEN_HOST || "::1";
const LISTEN_PORT = parsePort(
  process.env.V6PROXY_LISTEN_PORT ?? "4100",
  "V6PROXY_LISTEN_PORT",
);

const TARGET_HOST = process.env.V6PROXY_TARGET_HOST || "127.0.0.1";
const TARGET_PORT = parsePort(
  process.env.V6PROXY_TARGET_PORT ?? "4100",
  "V6PROXY_TARGET_PORT",
);

function normalizeHeaders(inHeaders) {
  const h = { ...(inHeaders || {}) };
  delete h["connection"];
  delete h["proxy-connection"];
  delete h["keep-alive"];
  delete h["transfer-encoding"];
  delete h["upgrade"];
  return h;
}

const server = http.createServer((req, res) => {
  const headers = normalizeHeaders(req.headers);
  headers["x-forwarded-proto"] = headers["x-forwarded-proto"] || "http";
  headers["x-forwarded-host"] = headers["x-forwarded-host"] || (req.headers && req.headers.host) || "";
  headers["x-forwarded-for"] = headers["x-forwarded-for"] || (req.socket && req.socket.remoteAddress) || "";

  const opts = {
    host: TARGET_HOST,
    port: TARGET_PORT,
    method: req.method,
    path: req.url,
    headers,
  };

  const upstream = http.request(opts, (up) => {
    res.writeHead(up.statusCode || 502, up.headers || {});
    up.pipe(res);
  });

  upstream.on("error", (e) => {
    try {
      res.statusCode = 502;
      res.setHeader("content-type", "text/plain; charset=utf-8");
      res.end("v6proxy upstream error: " + (e && e.message ? e.message : String(e)));
    } catch (__void_diag_pack4_err) { __voidSrcDiagPack4Visible("VOID_SRC_DIAG_HTTP_GUARD_PACK4_HTTP_V6_LOOPBACK_PROXY_4100_V1_CJS_1_1_VISIBLE", __void_diag_pack4_err); }
  });

  req.pipe(upstream);
});

server.on("clientError", (_err, socket) => {
  try { socket.end("HTTP/1.1 400 Bad Request\r\n\r\n"); } catch (__void_diag_pack4_err) { __voidSrcDiagPack4Visible("VOID_SRC_DIAG_HTTP_GUARD_PACK4_HTTP_V6_LOOPBACK_PROXY_4100_V1_CJS_3_2_VISIBLE", __void_diag_pack4_err); }
});

server.listen(LISTEN_PORT, LISTEN_HOST, () => {
  console.error(`[v6proxy] listening http://[${LISTEN_HOST}]:${LISTEN_PORT} -> http://${TARGET_HOST}:${TARGET_PORT}`);
});
