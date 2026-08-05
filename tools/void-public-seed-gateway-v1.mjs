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

function fail(message) {
  console.error(`${MARKER}_FAIL: ${message}`);
  process.exit(1);
}

if (UPSTREAM.protocol !== "http:" || !["127.0.0.1", "localhost", "::1"].includes(UPSTREAM.hostname)) {
  fail("upstream must be one loopback HTTP origin");
}
if (!Number.isInteger(PORT) || PORT < 1024 || PORT > 65535) fail("invalid gateway port");

function allowedPath(url) {
  const pathname = url.pathname;
  if (
    pathname === "/__void/ready.json" ||
    pathname === "/blocks/latest/number2.json" ||
    pathname === "/head" ||
    pathname === "/__void/demo/summary.json" ||
    pathname === "/api/health"
  ) {
    return true;
  }
  if (pathname === "/blocks/range") {
    const from = Number(url.searchParams.get("from"));
    const to = Number(url.searchParams.get("to"));
    return (
      Number.isInteger(from) &&
      Number.isInteger(to) &&
      from >= 0 &&
      to >= from &&
      to - from + 1 <= MAX_RANGE
    );
  }
  return false;
}

function writeJson(res, status, body) {
  const bytes = Buffer.from(JSON.stringify(body) + "\n");
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": bytes.length,
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
  });
  res.end(bytes);
}

const server = http.createServer((req, res) => {
  const method = String(req.method || "").toUpperCase();
  if (method !== "GET" && method !== "HEAD") {
    writeJson(res, 405, { ok: false, error: "method_not_allowed" });
    return;
  }

  let requestUrl;
  try {
    requestUrl = new URL(req.url || "/", "http://gateway.invalid");
  } catch {
    writeJson(res, 400, { ok: false, error: "invalid_url" });
    return;
  }

  if (!allowedPath(requestUrl)) {
    writeJson(res, 404, { ok: false, error: "route_not_public" });
    return;
  }

  const target = new URL(requestUrl.pathname + requestUrl.search, UPSTREAM);
  const upstreamRequest = http.request(
    target,
    {
      method,
      headers: {
        accept: "application/json",
        "user-agent": "void-public-seed-gateway-v1",
      },
      timeout: 60_000,
    },
    (upstreamResponse) => {
      const status = Number(upstreamResponse.statusCode || 502);
      const contentType = String(
        upstreamResponse.headers["content-type"] || "application/json; charset=utf-8",
      );

      if (method === "HEAD") {
        upstreamResponse.resume();
        res.writeHead(status, {
          "content-type": contentType,
          "cache-control": "no-store",
          "x-content-type-options": "nosniff",
          "x-void-public-seed-gateway": "v1",
        });
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
        res.writeHead(status, {
          "content-type": contentType,
          "content-length": body.length,
          "cache-control": "no-store",
          "x-content-type-options": "nosniff",
          "x-void-public-seed-gateway": "v1",
        });
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
  console.log("methods=GET,HEAD");
  console.log("private_mutation_routes_exposed=false");
});
