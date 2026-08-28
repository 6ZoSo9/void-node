#!/usr/bin/env node
import crypto from "node:crypto";
import http from "node:http";
import process from "node:process";
import { performance } from "node:perf_hooks";
import { pathToFileURL } from "node:url";
import {
  DEFAULT_MAX_RESPONSE_BYTES,
  normalizePublicSeedBase,
} from "../scripts/lib/void_public_seed_qualification_v1.mjs";
import { requestPublicSeedRouteV1 } from "../scripts/lib/void_public_seed_client_transport_v1.mjs";

const MARKER = "VOID_PUBLIC_SEED_CLIENT_ADAPTER_V1";
const COMPILED_MAX_RANGE = 999;
const COMPILED_MAX_RESPONSE_BYTES = 128 * 1024 * 1024;
const RANGE_CACHE_TTL_MS = 2000;
const CHECKPOINT_DISCOVERY_ROUTE_V1 = "/__void/checkpoint/v1.json";
const CHECKPOINT_MANIFEST_PATH_RE_V1 =
  /^\/checkpoints\/v1\/(voidpbc1_[0-9a-f]{64})\/checkpoint\.json$/;
const CHECKPOINT_SEGMENT_PATH_RE_V1 =
  /^\/checkpoints\/v1\/(voidpbc1_[0-9a-f]{64})\/segments\/([0-9]{8})\/blocks\.bin$/;

const FIXED_ROUTES = new Set([
  CHECKPOINT_DISCOVERY_ROUTE_V1,
  "/__void/ready.json",
  "/blocks/latest/number2.json",
  "/head",
  "/__void/demo/summary.json",
  "/api/health",
]);

const RESPONSE_AUTHORITY_SCHEMA = "void_public_seed_response_authority_v1";
const AUTHORITY_CHALLENGE_HEADER = "x-void-public-seed-authority-challenge";
const AUTHORITY_SCHEMA_HEADER = "x-void-public-seed-authority-schema";
const AUTHORITY_GENERATION_HEADER = "x-void-public-seed-authority-generation";
const AUTHORITY_SEQUENCE_HEADER = "x-void-public-seed-authority-sequence";
const AUTHORITY_ROUTE_HEADER = "x-void-public-seed-authority-route-b64url";
const AUTHORITY_BODY_SHA256_HEADER = "x-void-public-seed-authority-body-sha256";
const AUTHORITY_HMAC_HEADER = "x-void-public-seed-authority-hmac";

function normalizeResponseAuthorityV1(raw) {
  if (raw == null) return null;
  if (
    !raw ||
    typeof raw !== "object" ||
    raw.schema !== RESPONSE_AUTHORITY_SCHEMA ||
    typeof raw.generation !== "string" ||
    !/^[0-9a-f]{32}$/.test(raw.generation) ||
    typeof raw.sequence !== "number" ||
    !Number.isSafeInteger(raw.sequence) ||
    raw.sequence <= 0 ||
    !Buffer.isBuffer(raw.secret) ||
    raw.secret.length !== 32
  ) {
    throw new Error("invalid public seed response authority");
  }
  return Object.freeze({
    generation: raw.generation,
    sequence: raw.sequence,
    secret: Buffer.from(raw.secret),
  });
}

function responseAuthorityEligibleRouteV1(route) {
  if (route.startsWith("/blocks/range?")) return true;
  let parsed;
  try {
    parsed = new URL(route, "http://adapter.invalid");
  } catch {
    return false;
  }
  if (parsed.search !== "") return false;
  if (parsed.pathname === CHECKPOINT_DISCOVERY_ROUTE_V1) return true;
  if (CHECKPOINT_MANIFEST_PATH_RE_V1.test(parsed.pathname)) return true;
  return CHECKPOINT_SEGMENT_PATH_RE_V1.test(parsed.pathname);
}

function responseAuthorityHeadersV1(req, method, remote, authority) {
  if (!authority || method !== "GET") return null;
  const route = String(req.url || "/");
  if (!responseAuthorityEligibleRouteV1(route)) return null;

  const nonce = String(req.headers[AUTHORITY_CHALLENGE_HEADER] || "").trim();
  if (!/^[0-9a-f]{64}$/.test(nonce)) return null;

  const bytes = Buffer.from(remote.bytes);
  const bodySha256 = crypto.createHash("sha256").update(bytes).digest("hex");
  const transcript = JSON.stringify({
    schema: RESPONSE_AUTHORITY_SCHEMA,
    generation: authority.generation,
    sequence: authority.sequence,
    nonce,
    method,
    route,
    status: Number(remote.status),
    byte_length: bytes.length,
    body_sha256: bodySha256,
  });
  const hmac = crypto
    .createHmac("sha256", authority.secret)
    .update(transcript, "utf8")
    .digest("hex");

  return {
    [AUTHORITY_SCHEMA_HEADER]: RESPONSE_AUTHORITY_SCHEMA,
    [AUTHORITY_GENERATION_HEADER]: authority.generation,
    [AUTHORITY_SEQUENCE_HEADER]: String(authority.sequence),
    [AUTHORITY_ROUTE_HEADER]: Buffer.from(route, "utf8").toString("base64url"),
    [AUTHORITY_BODY_SHA256_HEADER]: bodySha256,
    [AUTHORITY_HMAC_HEADER]: hmac,
  };
}

function boundedInteger(raw, fallback, minimum, maximum) {
  const value = Number(raw);
  if (!Number.isFinite(value)) return fallback;
  return Math.min(maximum, Math.max(minimum, Math.floor(value)));
}

function exactProgrammaticInteger(raw, label, minimum, maximum) {
  if (
    typeof raw !== "number" ||
    !Number.isSafeInteger(raw) ||
    raw < minimum ||
    raw > maximum
  ) {
    throw new Error(`${label} must be a safe integer in range ${minimum}..${maximum}`);
  }
  return raw;
}

function json(res, status, body, method = "GET") {
  const bytes = Buffer.from(`${JSON.stringify(body)}\n`);
  res.statusCode = status;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("content-length", String(method === "HEAD" ? 0 : bytes.length));
  res.setHeader("cache-control", "no-store");
  res.setHeader("x-content-type-options", "nosniff");
  res.setHeader("x-void-public-seed-client", "v1");
  if (method === "HEAD") res.end();
  else res.end(bytes);
}

function writeRemote(res, remote, method, authorityHeaders = null) {
  res.statusCode = remote.status;
  res.setHeader("content-type", remote.contentType);
  res.setHeader("content-length", String(remote.bytes.length));
  res.setHeader("cache-control", "no-store");
  res.setHeader("x-content-type-options", "nosniff");
  res.setHeader("x-void-public-seed-client", "v1");
  res.setHeader("x-void-public-seed-gateway", "v1");
  if (authorityHeaders) {
    for (const [name, value] of Object.entries(authorityHeaders)) {
      res.setHeader(name, value);
    }
  }
  if (method === "HEAD") res.end();
  else res.end(remote.bytes);
}

function normalizePeers(raw, { allowLoopbackFixture = false } = {}) {
  const candidates = String(raw || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  if (candidates.length === 0) throw new Error("no public seed peers configured");
  if (candidates.length > 8) throw new Error("at most eight public seed peers are supported");

  const peers = [];
  for (const candidate of candidates) {
    const normalized = normalizePublicSeedBase(candidate, { allowLoopbackFixture });
    if (!peers.some((peer) => peer.base === normalized.base)) peers.push(normalized);
  }
  if (peers.length === 0) throw new Error("no unique public seed peers configured");
  return peers;
}

function validatePublicRoute(requestUrl) {
  const parsed = new URL(requestUrl || "/", "http://127.0.0.1");
  if (FIXED_ROUTES.has(parsed.pathname)) {
    if ([...parsed.searchParams.keys()].length !== 0) {
      throw new Error("fixed route does not accept query parameters");
    }
    return parsed.pathname;
  }
  if (
    parsed.search === "" &&
    (
      CHECKPOINT_MANIFEST_PATH_RE_V1.test(parsed.pathname) ||
      CHECKPOINT_SEGMENT_PATH_RE_V1.test(parsed.pathname)
    )
  ) {
    return parsed.pathname;
  }

  if (parsed.pathname !== "/blocks/range") throw new Error("route_not_public");

  const keys = [...parsed.searchParams.keys()];
  if (keys.length !== 2 || !keys.includes("from") || !keys.includes("to")) {
    throw new Error("invalid block range query");
  }
  if (
    parsed.searchParams.getAll("from").length !== 1 ||
    parsed.searchParams.getAll("to").length !== 1
  ) {
    throw new Error("duplicate block range query");
  }

  const fromRaw = parsed.searchParams.get("from");
  const toRaw = parsed.searchParams.get("to");
  if (!/^\d+$/.test(String(fromRaw)) || !/^\d+$/.test(String(toRaw))) {
    throw new Error("block range bounds must be decimal integers");
  }
  const from = Number(fromRaw);
  const to = Number(toRaw);
  if (!Number.isSafeInteger(from) || !Number.isSafeInteger(to) || to < from) {
    throw new Error("block range bounds are invalid");
  }
  if (to - from + 1 > COMPILED_MAX_RANGE) {
    throw new Error(`block range exceeds ${COMPILED_MAX_RANGE}`);
  }
  return `/blocks/range?from=${from}&to=${to}`;
}

export async function createPublicSeedClientAdapterV1({
  peers: rawPeers = process.env.VOID_PUBLIC_SEED_CLIENT_PEERS,
  host = process.env.VOID_PUBLIC_SEED_CLIENT_HOST || "127.0.0.1",
  port = boundedInteger(process.env.VOID_PUBLIC_SEED_CLIENT_PORT, 4191, 0, 65535),
  timeoutMs = boundedInteger(
    process.env.VOID_PUBLIC_SEED_CLIENT_TIMEOUT_MS,
    15_000,
    1_000,
    60_000,
  ),
  maxBytes = boundedInteger(
    process.env.VOID_PUBLIC_SEED_CLIENT_MAX_RESPONSE_BYTES,
    64 * 1024 * 1024,
    64 * 1024,
    COMPILED_MAX_RESPONSE_BYTES,
  ),
  authority = null,
  allowLoopbackFixture =
    process.env.VOID_PUBLIC_BOOTSTRAP_ALLOW_LOOPBACK_FIXTURE === "1",
} = {}) {
  if (!["127.0.0.1", "::1"].includes(String(host))) {
    throw new Error("public seed client adapter bind must be a numeric loopback literal");
  }
  const effectivePort = exactProgrammaticInteger(
    port,
    "public seed client adapter port",
    0,
    65535,
  );
  const effectiveTimeoutMs = exactProgrammaticInteger(
    timeoutMs,
    "public seed client adapter timeoutMs",
    1_000,
    60_000,
  );
  const effectiveMaxBytes = exactProgrammaticInteger(
    maxBytes,
    "public seed client adapter maxBytes",
    64 * 1024,
    COMPILED_MAX_RESPONSE_BYTES,
  );
  const peers = normalizePeers(rawPeers, { allowLoopbackFixture });
  const responseAuthority = normalizeResponseAuthorityV1(authority);
  let activeIndex = 0;
  let requestCount = 0;
  let failoverCount = 0;
  let lastSuccessAt = null;
  let lastError = null;
  let rangeCache = null;
  let rangeCacheHits = 0;

  const server = http.createServer(async (req, res) => {
    const method = String(req.method || "GET").toUpperCase();
    if (!new Set(["GET", "HEAD"]).has(method)) {
      json(res, 405, { ok: false, error: "method_not_allowed" }, method);
      return;
    }

    const pathname = new URL(req.url || "/", "http://127.0.0.1").pathname;
    if (pathname === "/__void/public-seed-client-v1.json") {
      json(
        res,
        200,
        {
          schema: "void_public_seed_client_adapter_v1",
          ok: true,
          peer_count: peers.length,
          active_peer_index: activeIndex,
          request_count: requestCount,
          failover_count: failoverCount,
          range_cache_hits: rangeCacheHits,
          range_cache_ttl_ms: RANGE_CACHE_TTL_MS,
          last_success_at: lastSuccessAt,
          last_error: lastError,
          loopback_only: true,
          dns_pinned: true,
          redirects_followed: false,
          max_range: COMPILED_MAX_RANGE,
          max_response_bytes: effectiveMaxBytes,
          tailnet_required: false,
          private_mutation_routes_exposed: false,
        },
        method,
      );
      return;
    }

    let route;
    try {
      route = validatePublicRoute(req.url || "/");
    } catch (error) {
      const detail = error?.message || String(error);
      json(
        res,
        detail === "route_not_public" ? 404 : 400,
        {
          ok: false,
          error: detail === "route_not_public" ? "route_not_public" : "invalid_request",
          detail,
        },
        method,
      );
      return;
    }

    const cacheableRange = method === "GET" && route.startsWith("/blocks/range?");
    if (
      cacheableRange &&
      rangeCache &&
      rangeCache.route === route &&
      rangeCache.peerBase === peers[activeIndex].base &&
      Date.now() - rangeCache.storedAt <= RANGE_CACHE_TTL_MS
    ) {
      rangeCacheHits += 1;
      writeRemote(
        res,
        rangeCache.remote,
        method,
        responseAuthorityHeadersV1(req, method, rangeCache.remote, responseAuthority),
      );
      return;
    }

    requestCount += 1;
    const failures = [];
    const logicalDeadlineAtMs = performance.now() + effectiveTimeoutMs;
    for (let offset = 0; offset < peers.length; offset += 1) {
      const index = (activeIndex + offset) % peers.length;
      const peer = peers[index];
      try {
        const remote = await requestPublicSeedRouteV1(peer, route, {
          method,
          timeoutMs: effectiveTimeoutMs,
          maxBytes: effectiveMaxBytes,
          allowLoopbackFixture,
          logicalDeadlineAtMs,
        });
        if (index !== activeIndex) failoverCount += 1;
        activeIndex = index;
        lastSuccessAt = new Date().toISOString();
        lastError = null;
        if (cacheableRange) {
          rangeCache = {
            route,
            peerBase: peer.base,
            storedAt: Date.now(),
            remote: {
              status: remote.status,
              contentType: remote.contentType,
              bytes: Buffer.from(remote.bytes),
            },
          };
        }
        writeRemote(
          res,
          remote,
          method,
          responseAuthorityHeadersV1(req, method, remote, responseAuthority),
        );
        return;
      } catch (error) {
        const detail = `${peer.base}: ${error?.message || String(error)}`;
        failures.push(detail);
        lastError = detail;
        console.error("VOID_PUBLIC_SEED_CLIENT_PEER_FAILOVER", {
          failedPeer: peer.base,
          nextPeer: peers[(index + 1) % peers.length].base,
          message: error?.message || String(error),
        });
        if (error?.logicalSeedDeadline === true) break;
      }
    }

    json(res, 502, {
      ok: false,
      error: "all_public_seed_peers_failed",
      failures,
    }, method);
  });

  server.on("clientError", (_error, socket) => {
    socket.end("HTTP/1.1 400 Bad Request\r\nConnection: close\r\n\r\n");
  });

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(effectivePort, host, resolve);
  });

  const address = server.address();
  const actualPort = typeof address === "object" && address ? address.port : effectivePort;
  const hostLiteral = host === "::1" ? "[::1]" : host;
  const base = `http://${hostLiteral}:${actualPort}`;
  console.log(`${MARKER}_READY`);
  console.log(`base=${base}`);
  console.log(`peer_count=${peers.length}`);
  console.log("loopback_only=true");
  console.log("dns_pinned=true");
  console.log("redirects_followed=false");
  console.log("tailnet_required=false");
  console.log("private_mutation_routes_exposed=false");

  return Object.freeze({
    server,
    base,
    port: actualPort,
    peers: peers.map((peer) => peer.base),
  });
}

async function main() {
  const adapter = await createPublicSeedClientAdapterV1();
  const close = () => {
    adapter.server.close(() => process.exit(0));
  };
  process.once("SIGINT", close);
  process.once("SIGTERM", close);
}

const invokedPath = process.argv[1] ? pathToFileURL(process.argv[1]).href : "";
if (import.meta.url === invokedPath) {
  main().catch((error) => {
    console.error(`${MARKER}_FAIL: ${error?.stack || error}`);
    process.exit(1);
  });
}
