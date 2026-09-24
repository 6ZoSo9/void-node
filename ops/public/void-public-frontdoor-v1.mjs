#!/usr/bin/env node
import http from "node:http";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { serveVoidPublicBootstrapV2StaticV1 } from "./void-public-bootstrap-v2-static-v1.mjs";

const MARKER = "VOID_PUBLIC_FRONTDOOR_V1";
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const HOME_PATH = process.env.VOID_PUBLIC_FRONTDOOR_HOME || resolve(ROOT, "public/void-public-frontdoor-v1/index.html");
const BIND = process.env.VOID_PUBLIC_FRONTDOOR_BIND || "127.0.0.1";
const PORT = Number(process.env.VOID_PUBLIC_FRONTDOOR_PORT || "8083");
const UPSTREAM_HOST = "127.0.0.1";
const UPSTREAM_PORT = Number(process.env.VOID_PUBLIC_FRONTDOOR_UPSTREAM_PORT || "8082");
const UPSTREAM_TIMEOUT_MS = 30_000;
const UPSTREAM_STATUS_TIMEOUT_MS = Number(
  process.env.VOID_PUBLIC_FRONTDOOR_STATUS_TIMEOUT_MS || "5000",
);
const UPSTREAM_STATUS_MAX_BYTES = 64 * 1024;
const UPSTREAM_STATUS_MAX_AGE_MS = 30_000;
const UPSTREAM_STATUS_PATH = "/__void/public-app/network.json";
const UPSTREAM_MARKER = "VOID_PUBLIC_APP_COMPOSITION_GATEWAY_V1";
const UPSTREAM_RUNTIME_TRUTH_MARKER = "VOID_PUBLIC_APP_RUNTIME_TRUTH_WALL_V1";

if (!Number.isSafeInteger(PORT) || PORT < 1 || PORT > 65535) throw new Error("invalid frontdoor port");
if (!Number.isSafeInteger(UPSTREAM_PORT) || UPSTREAM_PORT < 1 || UPSTREAM_PORT > 65535) throw new Error("invalid upstream port");
if (
  !Number.isSafeInteger(UPSTREAM_STATUS_TIMEOUT_MS) ||
  UPSTREAM_STATUS_TIMEOUT_MS < 100 ||
  UPSTREAM_STATUS_TIMEOUT_MS > 30_000
) throw new Error("invalid frontdoor status timeout");
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

function canonicalContentLength(value) {
  if (value === undefined) return null;
  if (typeof value !== "string" || !/^(?:0|[1-9][0-9]*)$/.test(value)) {
    throw new Error("upstream status content-length is invalid");
  }
  const parsed = BigInt(value);
  if (parsed > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new Error("upstream status content-length is unsafe");
  }
  return Number(parsed);
}

function validateUpstreamSnapshot(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("upstream status must be an object");
  }
  if (
    value.marker !== UPSTREAM_MARKER ||
    value.runtime_truth_marker !== UPSTREAM_RUNTIME_TRUTH_MARKER ||
    value.ok !== true ||
    value.read_only !== true ||
    value.public_safe !== true ||
    value.network_name !== "Mainnet-0"
  ) {
    throw new Error("upstream status identity/safety mismatch");
  }
  if (
    !value.node ||
    typeof value.node !== "object" ||
    Array.isArray(value.node) ||
    value.node.role !== "public-seed" ||
    value.node.public !== true
  ) {
    throw new Error("upstream node identity profile mismatch");
  }
  if (!["ready", "restricted_ready", "degraded", "unavailable"].includes(value.status)) {
    throw new Error("upstream runtime status is invalid");
  }
  for (const key of [
    "ready",
    "operational_ready",
    "strict_ready",
    "restricted_ready",
    "public_service_available",
    "chain_synchronized",
    "mesh_connected",
    "mesh_aligned",
  ]) {
    if (typeof value[key] !== "boolean") {
      throw new Error(`upstream ${key} must be boolean`);
    }
  }
  if (
    value.ready !== value.operational_ready ||
    value.ready !== value.strict_ready ||
    (value.ready && value.status !== "ready") ||
    (value.status === "ready" && !value.ready) ||
    (value.restricted_ready && value.status !== "restricted_ready")
  ) {
    throw new Error("upstream readiness fields are inconsistent");
  }
  if (!value.boundaries || typeof value.boundaries !== "object" || Array.isArray(value.boundaries)) {
    throw new Error("upstream boundaries are missing");
  }
  for (const key of [
    "account_enumeration",
    "wallet_records",
    "work_credit_balances",
    "job_history",
    "receipt_history",
    "peer_ids",
    "peer_addresses",
    "mutation",
    "money_movement",
    "validator_mutation",
    "operator_mutation",
  ]) {
    if (value.boundaries[key] !== false) {
      throw new Error(`upstream boundary elevated: ${key}`);
    }
  }
  if (!["normal", "txroot_quarantine"].includes(value.security_mode)) {
    throw new Error("upstream security mode is invalid");
  }
  if (typeof value.generated_at !== "string") {
    throw new Error("upstream generated_at is missing");
  }
  const generated = new Date(value.generated_at);
  if (
    !Number.isFinite(generated.getTime()) ||
    generated.toISOString() !== value.generated_at
  ) {
    throw new Error("upstream generated_at is not canonical");
  }
  const ageMs = Date.now() - generated.getTime();
  if (ageMs < -5_000 || ageMs > UPSTREAM_STATUS_MAX_AGE_MS) {
    throw new Error("upstream status evidence is stale");
  }
  return {
    ready: value.ready,
    status: value.status,
    strict_ready: value.strict_ready,
    restricted_ready: value.restricted_ready,
    public_service_available: value.public_service_available,
    chain_synchronized: value.chain_synchronized,
    mesh_connected: value.mesh_connected,
    mesh_aligned: value.mesh_aligned,
    security_mode: value.security_mode,
    generated_at: value.generated_at,
  };
}

function readUpstreamStatus() {
  return new Promise((resolvePromise, rejectPromise) => {
    let settled = false;
    let request;
    const finish = (error, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(deadline);
      if (error) rejectPromise(error);
      else resolvePromise(value);
    };
    const deadline = setTimeout(() => {
      request?.destroy(new Error("upstream status deadline exceeded"));
      finish(new Error("upstream status deadline exceeded"));
    }, UPSTREAM_STATUS_TIMEOUT_MS);

    request = http.request({
      hostname: UPSTREAM_HOST,
      port: UPSTREAM_PORT,
      method: "GET",
      path: UPSTREAM_STATUS_PATH,
      headers: {
        accept: "application/json",
        "user-agent": "void-public-frontdoor-v1",
      },
    }, (response) => {
      try {
        if (response.statusCode !== 200) {
          response.destroy();
          finish(new Error(`upstream status HTTP ${response.statusCode || 0}`));
          return;
        }
        const declared = canonicalContentLength(response.headers["content-length"]);
        if (declared !== null && declared > UPSTREAM_STATUS_MAX_BYTES) {
          response.destroy();
          finish(new Error("upstream status response exceeds byte limit"));
          return;
        }
      } catch (error) {
        response.destroy();
        finish(error);
        return;
      }

      const chunks = [];
      let total = 0;
      response.on("data", (chunk) => {
        if (settled) return;
        total += chunk.length;
        if (total > UPSTREAM_STATUS_MAX_BYTES) {
          response.destroy();
          finish(new Error("upstream status response exceeds byte limit"));
          return;
        }
        chunks.push(chunk);
      });
      response.on("end", () => {
        if (settled) return;
        let parsed;
        try {
          parsed = JSON.parse(Buffer.concat(chunks, total).toString("utf8"));
          finish(null, validateUpstreamSnapshot(parsed));
        } catch (error) {
          finish(error);
        }
      });
      response.on("error", (error) => finish(error));
    });
    request.on("error", (error) => finish(error));
    request.end();
  });
}

const sendStatus = async (req, res) => {
  let upstreamEvidence = null;
  let upstreamError = null;
  try {
    upstreamEvidence = await readUpstreamStatus();
  } catch (error) {
    upstreamError = error instanceof Error ? error.message : "upstream status unavailable";
  }
  const body = Buffer.from(`${JSON.stringify({
    marker: MARKER,
    ready: upstreamEvidence?.ready === true,
    bind: BIND,
    port: PORT,
    upstream: `http://${UPSTREAM_HOST}:${UPSTREAM_PORT}`,
    upstream_evidence_path: UPSTREAM_STATUS_PATH,
    upstream_marker: upstreamEvidence ? UPSTREAM_MARKER : null,
    upstream_runtime_truth_marker:
      upstreamEvidence ? UPSTREAM_RUNTIME_TRUTH_MARKER : null,
    upstream_status: upstreamEvidence?.status || "unavailable",
    upstream_strict_ready: upstreamEvidence?.strict_ready === true,
    upstream_restricted_ready: upstreamEvidence?.restricted_ready === true,
    upstream_public_service_available:
      upstreamEvidence?.public_service_available === true,
    upstream_chain_synchronized: upstreamEvidence?.chain_synchronized === true,
    upstream_mesh_connected: upstreamEvidence?.mesh_connected === true,
    upstream_mesh_aligned: upstreamEvidence?.mesh_aligned === true,
    upstream_security_mode: upstreamEvidence?.security_mode || null,
    upstream_generated_at: upstreamEvidence?.generated_at || null,
    upstream_error: upstreamError,
    read_only: true,
    public_safe: true,
    mutation: false,
    money_movement: false,
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
  let requestUrl;
  let pathname;
  try {
    requestUrl = new URL(req.url || "/", "http://frontdoor.invalid");
    pathname = requestUrl.pathname;
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
  if (serveVoidPublicBootstrapV2StaticV1(req, res, requestUrl)) {
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
