#!/usr/bin/env node
import http from "node:http";
import process from "node:process";

const MARKER = "VOID_PUBLIC_SEED_GATEWAY_V1";
const BIND_HOST = process.env.VOID_PUBLIC_SEED_BIND || "127.0.0.1";
const PORT = Number(process.env.VOID_PUBLIC_SEED_PORT || 4111);
const UPSTREAM = new URL(process.env.VOID_PUBLIC_SEED_UPSTREAM || "http://127.0.0.1:4100");
const MAX_RANGE = Math.max(
  1,
  Math.min(999, Number(process.env.VOID_PUBLIC_SEED_MAX_RANGE || 999) || 999),
);
const MAX_RESPONSE_BYTES = Math.max(
  1024 * 1024,
  Math.min(
    128 * 1024 * 1024,
    Number(process.env.VOID_PUBLIC_SEED_MAX_RESPONSE_BYTES || 64 * 1024 * 1024) ||
      64 * 1024 * 1024,
  ),
);
const UPSTREAM_TIMEOUT_MS = Math.max(
  1000,
  Math.min(120_000, Number(process.env.VOID_PUBLIC_SEED_UPSTREAM_TIMEOUT_MS || 60_000) || 60_000),
);

function fail(message) {
  console.error(`${MARKER}_FAIL: ${message}`);
  process.exit(1);
}

function isLoopbackLiteral(hostname) {
  return ["127.0.0.1", "::1", "[::1]"].includes(String(hostname).toLowerCase());
}

if (
  UPSTREAM.protocol !== "http:" ||
  !isLoopbackLiteral(UPSTREAM.hostname) ||
  UPSTREAM.username ||
  UPSTREAM.password ||
  UPSTREAM.search ||
  UPSTREAM.hash ||
  (UPSTREAM.pathname !== "/" && UPSTREAM.pathname !== "")
) {
  fail("upstream must be one credential-free loopback HTTP origin");
}
if (!isLoopbackLiteral(BIND_HOST)) {
  fail("gateway must bind to a numeric loopback literal; publish it through a separate HTTPS proxy");
}
if (!Number.isInteger(PORT) || PORT < 1024 || PORT > 65535) fail("invalid gateway port");

function exactSearchKeys(url, expected) {
  const keys = [...url.searchParams.keys()];
  return keys.length === expected.length && keys.every((key, index) => key === expected[index]);
}

function allowedPath(url) {
  const pathname = url.pathname;
  if (
    pathname === "/__void/ready.json" ||
    pathname === "/blocks/latest/number2.json" ||
    pathname === "/head" ||
    pathname === "/__void/demo/summary.json" ||
    pathname === "/api/health"
  ) {
    return url.search === "";
  }
  if (pathname === "/blocks/range") {
    if (!exactSearchKeys(url, ["from", "to"])) return false;
    const fromRaw = url.searchParams.get("from");
    const toRaw = url.searchParams.get("to");
    if (!/^\d+$/.test(fromRaw || "") || !/^\d+$/.test(toRaw || "")) return false;
    const from = Number(fromRaw);
    const to = Number(toRaw);
    return (
      Number.isSafeInteger(from) &&
      Number.isSafeInteger(to) &&
      from >= 0 &&
      to >= from &&
      to - from + 1 <= MAX_RANGE
    );
  }
  return false;
}

function responseHeaders(contentType, contentLength) {
  const headers = {
    "content-type": contentType,
    "cache-control": "no-store",
    "content-security-policy": "default-src 'none'; frame-ancestors 'none'",
    "cross-origin-resource-policy": "same-site",
    "referrer-policy": "no-referrer",
    "x-content-type-options": "nosniff",
    "x-frame-options": "DENY",
    "x-void-public-seed-gateway": "v1",
  };
  if (contentLength !== undefined) headers["content-length"] = contentLength;
  return headers;
}

function writeJson(res, status, body, method = "GET") {
  const bytes = Buffer.from(`${JSON.stringify(body)}\n`);
  res.writeHead(status, responseHeaders("application/json; charset=utf-8", bytes.length));
  if (method === "HEAD") res.end();
  else res.end(bytes);
}

function upstreamContentType(headers) {
  const value = String(headers["content-type"] || "").trim();
  if (!/^application\/(?:[a-z0-9.+-]*\+)?json(?:\s*;|$)/i.test(value)) {
    throw new Error("upstream_content_type_not_json");
  }
  return value;
}

const server = http.createServer((req, res) => {
  const method = String(req.method || "").toUpperCase();
  if (method !== "GET" && method !== "HEAD") {
    writeJson(res, 405, { ok: false, error: "method_not_allowed" }, method);
    return;
  }

  let requestUrl;
  try {
    requestUrl = new URL(req.url || "/", "http://gateway.invalid");
  } catch {
    writeJson(res, 400, { ok: false, error: "invalid_url" }, method);
    return;
  }

  if (!allowedPath(requestUrl)) {
    writeJson(res, 404, { ok: false, error: "route_not_public" }, method);
    return;
  }

  const target = new URL(`${requestUrl.pathname}${requestUrl.search}`, UPSTREAM);
  const upstreamRequest = http.request(
    target,
    {
      method,
      headers: {
        accept: "application/json",
        connection: "close",
        "user-agent": "void-public-seed-gateway-v1",
      },
      timeout: UPSTREAM_TIMEOUT_MS,
    },
    (upstreamResponse) => {
      const status = Number(upstreamResponse.statusCode || 502);
      if (status >= 300 && status < 400) {
        upstreamResponse.destroy();
        writeJson(res, 502, { ok: false, error: "upstream_redirect_not_allowed" }, method);
        return;
      }
      let contentType;
      try {
        contentType = upstreamContentType(upstreamResponse.headers);
      } catch {
        upstreamResponse.destroy();
        writeJson(res, 502, { ok: false, error: "upstream_content_type_not_json" }, method);
        return;
      }

      if (method === "HEAD") {
        upstreamResponse.resume();
        res.writeHead(status, responseHeaders(contentType));
        res.end();
        return;
      }

      const advertisedLength = Number(upstreamResponse.headers["content-length"] || 0);
      if (Number.isFinite(advertisedLength) && advertisedLength > MAX_RESPONSE_BYTES) {
        upstreamResponse.destroy();
        writeJson(res, 502, { ok: false, error: "upstream_response_too_large" });
        return;
      }

      const chunks = [];
      let total = 0;
      let rejected = false;
      upstreamResponse.on("data", (chunk) => {
        if (rejected) return;
        total += chunk.length;
        if (total > MAX_RESPONSE_BYTES) {
          rejected = true;
          upstreamResponse.destroy();
          writeJson(res, 502, { ok: false, error: "upstream_response_too_large" });
          return;
        }
        chunks.push(chunk);
      });
      upstreamResponse.on("end", () => {
        if (rejected || res.writableEnded) return;
        const body = Buffer.concat(chunks, total);
        res.writeHead(status, responseHeaders(contentType, body.length));
        res.end(body);
      });
      upstreamResponse.on("error", (error) => {
        if (!res.headersSent) writeJson(res, 502, { ok: false, error: "upstream_unavailable" });
        else res.destroy(error);
      });
    },
  );

  upstreamRequest.on("timeout", () => upstreamRequest.destroy(new Error("upstream timeout")));
  upstreamRequest.on("error", (error) => {
    if (!res.headersSent) writeJson(res, 502, { ok: false, error: "upstream_unavailable" });
    else res.destroy(error);
  });
  upstreamRequest.end();
});

server.maxHeadersCount = 64;
server.headersTimeout = 10_000;
server.requestTimeout = 75_000;
server.keepAliveTimeout = 5_000;
server.on("clientError", (_error, socket) => {
  socket.end("HTTP/1.1 400 Bad Request\r\nConnection: close\r\n\r\n");
});

server.listen(PORT, BIND_HOST, () => {
  console.log(`${MARKER}_READY`);
  console.log(`bind=${BIND_HOST}`);
  console.log(`port=${PORT}`);
  console.log(`upstream=${UPSTREAM.origin}`);
  console.log(`max_range=${MAX_RANGE}`);
  console.log(`max_response_bytes=${MAX_RESPONSE_BYTES}`);
  console.log(`upstream_timeout_ms=${UPSTREAM_TIMEOUT_MS}`);
  console.log("methods=GET,HEAD");
  console.log("private_mutation_routes_exposed=false");
  console.log("wallet_authority=false");
  console.log("signer_authority=false");
  console.log("validator_authority=false");
  console.log("treasury_authority=false");
  console.log("work_credit_authority=false");
  console.log("money_movement_authority=false");
});
