#!/usr/bin/env node
import fs from "node:fs";
import http from "node:http";
import https from "node:https";
import net from "node:net";
import path from "node:path";
import process from "node:process";

const MARKER = "VOID_PUBLIC_SEED_IP_TLS_PROXY_V1";
const PUBLIC_IP = String(process.env.VOID_PUBLIC_SEED_PUBLIC_IP || "").trim();
const HTTP_BIND = process.env.VOID_PUBLIC_SEED_HTTP_BIND || "0.0.0.0";
const HTTPS_BIND = process.env.VOID_PUBLIC_SEED_HTTPS_BIND || "0.0.0.0";
const HTTP_PORT = Number(process.env.VOID_PUBLIC_SEED_HTTP_PORT || 80);
const HTTPS_PORT = Number(process.env.VOID_PUBLIC_SEED_HTTPS_PORT || 443);
const ACME_ROOT = path.resolve(
  process.env.VOID_PUBLIC_SEED_ACME_ROOT || "/var/lib/void-public-seed/acme-webroot",
);
const CERT_FILE = path.resolve(
  process.env.VOID_PUBLIC_SEED_TLS_CERT_FILE ||
    "/var/lib/void-public-seed/tls/current/fullchain.pem",
);
const KEY_FILE = path.resolve(
  process.env.VOID_PUBLIC_SEED_TLS_KEY_FILE ||
    "/var/lib/void-public-seed/tls/current/privkey.pem",
);
const UPSTREAM = new URL(
  process.env.VOID_PUBLIC_SEED_TLS_UPSTREAM || "http://127.0.0.1:4111",
);
const MAX_RESPONSE_BYTES = Math.max(
  1024 * 1024,
  Math.min(
    128 * 1024 * 1024,
    Number(process.env.VOID_PUBLIC_SEED_TLS_MAX_RESPONSE_BYTES || 64 * 1024 * 1024),
  ),
);

function fail(message) {
  console.error(`${MARKER}_FAIL: ${message}`);
  process.exit(1);
}

function isRegularNoSymlink(target, label) {
  const stat = fs.lstatSync(target);
  if (!stat.isFile() || stat.isSymbolicLink()) {
    throw new Error(`${label} must be a regular non-symlink file`);
  }
  return stat;
}

function jsonResponse(res, status, error, method = "GET") {
  const bytes = Buffer.from(`${JSON.stringify({ ok: false, error })}\n`);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": String(bytes.length),
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
  });
  if (method === "HEAD") res.end();
  else res.end(bytes);
}

function normalizeHostHeader(raw) {
  const value = String(raw || "").trim().toLowerCase();
  if (value.startsWith("[")) {
    const end = value.indexOf("]");
    if (end < 0) return "";
    return value.slice(1, end);
  }
  return value.split(":", 1)[0];
}

function hostMatchesPublicIp(raw) {
  return normalizeHostHeader(raw) === PUBLIC_IP.toLowerCase();
}

function safeChallengeToken(pathname) {
  const prefix = "/.well-known/acme-challenge/";
  if (!pathname.startsWith(prefix)) return "";
  const token = pathname.slice(prefix.length);
  return /^[A-Za-z0-9_-]{1,200}$/.test(token) ? token : "";
}

function normalizeIncomingTarget(raw) {
  const text = String(raw || "");
  if (!text.startsWith("/") || /[\u0000-\u0020\u007f]/.test(text)) {
    throw new Error("request target must use visible origin-form");
  }
  const parsed = new URL(text, "http://proxy.invalid");
  if (
    parsed.origin !== "http://proxy.invalid" ||
    parsed.username ||
    parsed.password ||
    parsed.hash
  ) {
    throw new Error("request target must remain on the local proxy origin");
  }
  return parsed;
}

if (process.argv.includes("--self-test-targets")) {
  const accepted = normalizeIncomingTarget("/blocks/range?from=1&to=2");
  if (accepted.pathname !== "/blocks/range" || accepted.search !== "?from=1&to=2") {
    fail("origin-form target self-test failed");
  }
  for (const rejected of [
    "http://127.0.0.1:9999/admin",
    "//127.0.0.1:9999/admin",
    "/admin\r\nX-Test: injected",
    "admin",
  ]) {
    try {
      normalizeIncomingTarget(rejected);
      fail(`unsafe request target accepted: ${JSON.stringify(rejected)}`);
    } catch (error) {
      if (String(error?.message || error).includes("unsafe request target accepted")) {
        throw error;
      }
    }
  }
  console.log(`${MARKER}_TARGET_SELF_TEST_GREEN`);
  process.exit(0);
}

if (net.isIP(PUBLIC_IP) !== 4) fail("public seed endpoint must be one IPv4 literal");
if (!["0.0.0.0", "127.0.0.1"].includes(HTTP_BIND)) fail("invalid HTTP bind");
if (!["0.0.0.0", "127.0.0.1"].includes(HTTPS_BIND)) fail("invalid HTTPS bind");
if (HTTP_PORT !== 80 || HTTPS_PORT !== 443) fail("public ingress ports must be 80 and 443");
if (
  UPSTREAM.protocol !== "http:" ||
  UPSTREAM.hostname !== "127.0.0.1" ||
  Number(UPSTREAM.port || 80) !== 4111 ||
  UPSTREAM.username ||
  UPSTREAM.password ||
  UPSTREAM.search ||
  UPSTREAM.hash ||
  !["", "/"].includes(UPSTREAM.pathname)
) {
  fail("TLS upstream must be exactly http://127.0.0.1:4111");
}
if (!fs.existsSync(ACME_ROOT) || !fs.lstatSync(ACME_ROOT).isDirectory()) {
  fail("ACME webroot must exist as a directory");
}
const acmeRootReal = fs.realpathSync(ACME_ROOT);

const httpServer = http.createServer((req, res) => {
  const method = String(req.method || "").toUpperCase();
  if (method !== "GET" && method !== "HEAD") {
    jsonResponse(res, 405, "method_not_allowed", method);
    return;
  }
  let requestUrl;
  try {
    requestUrl = normalizeIncomingTarget(req.url);
  } catch {
    jsonResponse(res, 400, "invalid_url", method);
    return;
  }
  if (requestUrl.search || requestUrl.hash) {
    jsonResponse(res, 404, "route_not_public", method);
    return;
  }
  const token = safeChallengeToken(requestUrl.pathname);
  if (!token) {
    jsonResponse(res, 404, "route_not_public", method);
    return;
  }
  const candidate = path.join(ACME_ROOT, ".well-known", "acme-challenge", token);
  try {
    isRegularNoSymlink(candidate, "ACME challenge");
    const real = fs.realpathSync(candidate);
    if (!real.startsWith(`${acmeRootReal}${path.sep}`)) {
      throw new Error("ACME challenge escaped webroot");
    }
    const bytes = fs.readFileSync(real);
    if (bytes.length < 1 || bytes.length > 16 * 1024) {
      throw new Error("ACME challenge size is invalid");
    }
    res.writeHead(200, {
      "content-type": "application/octet-stream",
      "content-length": String(bytes.length),
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    });
    if (method === "HEAD") res.end();
    else res.end(bytes);
  } catch {
    jsonResponse(res, 404, "challenge_not_found", method);
  }
});

httpServer.maxHeadersCount = 32;
httpServer.headersTimeout = 10_000;
httpServer.requestTimeout = 15_000;
httpServer.keepAliveTimeout = 5_000;
httpServer.on("clientError", (_error, socket) => {
  socket.end("HTTP/1.1 400 Bad Request\r\nConnection: close\r\n\r\n");
});
httpServer.listen(HTTP_PORT, HTTP_BIND, () => {
  console.log(`${MARKER}_ACME_HTTP_READY`);
  console.log(`public_ip=${PUBLIC_IP}`);
  console.log("http_port=80");
  console.log("acme_only=true");
});

const certExists = fs.existsSync(CERT_FILE);
const keyExists = fs.existsSync(KEY_FILE);
if (certExists !== keyExists) fail("certificate and key must either both exist or both be absent");

let httpsServer = null;
if (certExists && keyExists) {
  isRegularNoSymlink(CERT_FILE, "TLS certificate");
  isRegularNoSymlink(KEY_FILE, "TLS private key");
  const keyMode = fs.lstatSync(KEY_FILE).mode & 0o777;
  if ((keyMode & 0o077) !== 0) fail("TLS private key permissions are too broad");

  httpsServer = https.createServer(
    {
      cert: fs.readFileSync(CERT_FILE),
      key: fs.readFileSync(KEY_FILE),
      minVersion: "TLSv1.2",
      maxVersion: "TLSv1.3",
    },
    (req, res) => {
      const method = String(req.method || "").toUpperCase();
      if (method !== "GET" && method !== "HEAD") {
        jsonResponse(res, 405, "method_not_allowed", method);
        return;
      }
      if (!hostMatchesPublicIp(req.headers.host)) {
        jsonResponse(res, 421, "misdirected_request", method);
        return;
      }
      let requestUrl;
      try {
        requestUrl = normalizeIncomingTarget(req.url);
      } catch {
        jsonResponse(res, 400, "invalid_url", method);
        return;
      }
      const upstreamRequest = http.request(
        new URL(`${requestUrl.pathname}${requestUrl.search}`, UPSTREAM),
        {
          method,
          headers: {
            accept: "application/json",
            connection: "close",
            "user-agent": "void-public-seed-ip-tls-proxy-v1",
          },
          timeout: 75_000,
        },
        (upstreamResponse) => {
          const headers = {};
          for (const name of [
            "content-type",
            "content-length",
            "cache-control",
            "content-security-policy",
            "cross-origin-resource-policy",
            "referrer-policy",
            "x-content-type-options",
            "x-frame-options",
            "x-void-public-seed-gateway",
          ]) {
            const value = upstreamResponse.headers[name];
            if (value !== undefined) headers[name] = value;
          }
          const advertised = Number(headers["content-length"] || 0);
          if (Number.isFinite(advertised) && advertised > MAX_RESPONSE_BYTES) {
            upstreamResponse.destroy();
            jsonResponse(res, 502, "upstream_response_too_large", method);
            return;
          }
          res.writeHead(Number(upstreamResponse.statusCode || 502), headers);
          if (method === "HEAD") {
            upstreamResponse.resume();
            res.end();
            return;
          }
          let total = 0;
          upstreamResponse.on("data", (chunk) => {
            total += chunk.length;
            if (total > MAX_RESPONSE_BYTES) {
              upstreamResponse.destroy();
              res.destroy(new Error("upstream response exceeded limit"));
              return;
            }
            res.write(chunk);
          });
          upstreamResponse.on("end", () => res.end());
          upstreamResponse.on("error", (error) => res.destroy(error));
        },
      );
      upstreamRequest.on("timeout", () => {
        upstreamRequest.destroy(new Error("upstream timeout"));
      });
      upstreamRequest.on("error", () => {
        if (!res.headersSent) jsonResponse(res, 502, "upstream_unavailable", method);
        else res.destroy();
      });
      upstreamRequest.end();
    },
  );
  httpsServer.maxHeadersCount = 64;
  httpsServer.headersTimeout = 10_000;
  httpsServer.requestTimeout = 80_000;
  httpsServer.keepAliveTimeout = 5_000;
  httpsServer.on("clientError", (_error, socket) => {
    socket.end("HTTP/1.1 400 Bad Request\r\nConnection: close\r\n\r\n");
  });
  httpsServer.listen(HTTPS_PORT, HTTPS_BIND, () => {
    console.log(`${MARKER}_HTTPS_READY`);
    console.log("https_port=443");
    console.log("tls_certificate_loaded=true");
    console.log("upstream=http://127.0.0.1:4111");
  });
} else {
  console.log(`${MARKER}_TLS_PENDING`);
  console.log("tls_certificate_loaded=false");
}

function shutdown(signal) {
  console.log(`${MARKER}_SHUTDOWN signal=${signal}`);
  const closers = [httpServer, httpsServer].filter(Boolean);
  let remaining = closers.length;
  if (remaining === 0) process.exit(0);
  const done = () => {
    remaining -= 1;
    if (remaining === 0) process.exit(0);
  };
  for (const server of closers) server.close(done);
  setTimeout(() => process.exit(1), 10_000).unref();
}
process.once("SIGTERM", () => shutdown("SIGTERM"));
process.once("SIGINT", () => shutdown("SIGINT"));
