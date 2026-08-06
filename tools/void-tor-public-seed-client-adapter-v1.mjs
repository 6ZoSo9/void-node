#!/usr/bin/env node
import http from "node:http";
import process from "node:process";
import { pathToFileURL } from "node:url";
import {
  normalizeOnionBase,
  requestOnionRouteV1,
} from "../scripts/lib/void_tor_native_bootstrap_transport_v1.mjs";

const MARKER = "VOID_TOR_PUBLIC_SEED_CLIENT_ADAPTER_V1";
const COMPILED_MAX_RANGE = 999;
const COMPILED_MAX_RESPONSE_BYTES = 128 * 1024 * 1024;
const RANGE_CACHE_TTL_MS = 2000;
const FIXED_ROUTES = new Set([
  "/__void/ready.json",
  "/blocks/latest/number2.json",
  "/head",
  "/__void/demo/summary.json",
  "/api/health",
]);

function boundedInteger(raw, fallback, minimum, maximum) {
  const value = Number(raw);
  if (!Number.isFinite(value)) return fallback;
  return Math.min(maximum, Math.max(minimum, Math.floor(value)));
}

function json(res, status, body, method = "GET") {
  const bytes = Buffer.from(`${JSON.stringify(body)}\n`);
  res.statusCode = status;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("content-length", String(method === "HEAD" ? 0 : bytes.length));
  res.setHeader("cache-control", "no-store");
  res.setHeader("x-content-type-options", "nosniff");
  res.setHeader("x-void-tor-public-seed-client", "v1");
  if (method === "HEAD") res.end();
  else res.end(bytes);
}

function writeRemote(res, remote, method) {
  res.statusCode = remote.status;
  res.setHeader("content-type", remote.contentType);
  res.setHeader("content-length", String(remote.bytes.length));
  res.setHeader("cache-control", "no-store");
  res.setHeader("x-content-type-options", "nosniff");
  res.setHeader("x-void-tor-public-seed-client", "v1");
  res.setHeader("x-void-public-seed-gateway", "v1");
  if (method === "HEAD") res.end();
  else res.end(remote.bytes);
}

function normalizePeers(raw) {
  const candidates = String(raw || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  if (candidates.length === 0) throw new Error("no Tor public seed peers configured");
  if (candidates.length > 8) throw new Error("at most eight Tor public seed peers are supported");
  const peers = [];
  for (const candidate of candidates) {
    const normalized = normalizeOnionBase(candidate);
    if (!peers.some((peer) => peer.base === normalized.base)) peers.push(normalized);
  }
  if (peers.length === 0) throw new Error("no unique Tor public seed peers configured");
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

export async function createTorPublicSeedClientAdapterV1({
  peers: rawPeers = process.env.VOID_TOR_PUBLIC_SEED_CLIENT_PEERS,
  host = process.env.VOID_TOR_PUBLIC_SEED_CLIENT_HOST || "127.0.0.1",
  port = boundedInteger(process.env.VOID_TOR_PUBLIC_SEED_CLIENT_PORT, 0, 0, 65535),
  socksHost = process.env.VOID_TOR_SOCKS_HOST || "127.0.0.1",
  socksPort = boundedInteger(process.env.VOID_TOR_SOCKS_PORT, 9050, 1024, 65535),
  timeoutMs = boundedInteger(
    process.env.VOID_TOR_PUBLIC_SEED_CLIENT_TIMEOUT_MS,
    30_000,
    1_000,
    60_000,
  ),
  maxBytes = boundedInteger(
    process.env.VOID_TOR_PUBLIC_SEED_CLIENT_MAX_RESPONSE_BYTES,
    64 * 1024 * 1024,
    64 * 1024,
    COMPILED_MAX_RESPONSE_BYTES,
  ),
} = {}) {
  if (!["127.0.0.1", "::1"].includes(String(host))) {
    throw new Error("Tor public seed client adapter bind must be numeric loopback");
  }
  if (!["127.0.0.1", "::1"].includes(String(socksHost))) {
    throw new Error("Tor SOCKS proxy must be numeric loopback");
  }
  const peers = normalizePeers(rawPeers);
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
    if (pathname === "/__void/tor-public-seed-client-v1.json") {
      json(res, 200, {
        schema: "void_tor_public_seed_client_adapter_v1",
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
        socks_proxy_loopback_only: true,
        dns_resolution_required: false,
        domain_registrar_required: false,
        certificate_authority_required: false,
        max_range: COMPILED_MAX_RANGE,
        max_response_bytes: maxBytes,
        tailnet_required: false,
        private_mutation_routes_exposed: false,
      }, method);
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
      writeRemote(res, rangeCache.remote, method);
      return;
    }

    requestCount += 1;
    const failures = [];
    for (let offset = 0; offset < peers.length; offset += 1) {
      const index = (activeIndex + offset) % peers.length;
      const peer = peers[index];
      try {
        const remote = await requestOnionRouteV1(peer, route, {
          method,
          socksHost,
          socksPort,
          timeoutMs,
          maxBytes,
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
        writeRemote(res, remote, method);
        return;
      } catch (error) {
        const detail = `${peer.base}: ${error?.message || String(error)}`;
        failures.push(detail);
        lastError = detail;
        console.error("VOID_TOR_PUBLIC_SEED_CLIENT_PEER_FAILOVER", {
          failedPeer: peer.base,
          nextPeer: peers[(index + 1) % peers.length].base,
          message: error?.message || String(error),
        });
      }
    }

    json(res, 502, {
      ok: false,
      error: "all_tor_public_seed_peers_failed",
      failures,
    }, method);
  });

  server.on("clientError", (_error, socket) => {
    socket.end("HTTP/1.1 400 Bad Request\r\nConnection: close\r\n\r\n");
  });

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, host, resolve);
  });

  const address = server.address();
  const actualPort = typeof address === "object" && address ? address.port : port;
  const hostLiteral = host === "::1" ? "[::1]" : host;
  const base = `http://${hostLiteral}:${actualPort}`;
  console.log(`${MARKER}_READY`);
  console.log(`base=${base}`);
  console.log(`peer_count=${peers.length}`);
  console.log("loopback_only=true");
  console.log("socks_proxy_loopback_only=true");
  console.log("dns_resolution_required=false");
  console.log("domain_registrar_required=false");
  console.log("certificate_authority_required=false");
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
  const adapter = await createTorPublicSeedClientAdapterV1();
  const close = () => adapter.server.close(() => process.exit(0));
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
