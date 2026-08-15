#!/usr/bin/env node

import fs from "node:fs";
import net from "node:net";
import path from "node:path";

const MARKER = "VOID_PUBLIC_NODE_OPERATOR_SELF_CHECK_V1";
const NETWORK = "Mainnet-0";
const DEFAULT_BASE = process.env.VOID_PUBLIC_BASE || "http://127.0.0.1:4100";
const DEFAULT_TIMEOUT_MS = 8_000;
const DEFAULT_EXPECTED_PEERS = 1;
const MAX_RESPONSE_BYTES = 2 * 1024 * 1024;
const CANCEL_SETTLE_TIMEOUT_MS = 250;

const REQUIRED_PUBLIC_ROUTES = [
  "/public-node",
  "/public-node/route-index.json",
  "/public-node/route-manifest.json",
  "/public-node/self-check-snapshot.json",
  "/public-node/share-link.json",
  "/public-node/tester-bundle.json",
  "/public-node/outside-tester-smoke.json",
  "/proofs",
];

const REQUIRED_WELL_KNOWN_ROUTES = [
  "/public-node",
  "/public-node/route-manifest.json",
  "/public-node/self-check-snapshot.json",
  "/proofs",
];

const SENSITIVE_NAMESPACES = [
  "/__void/diag/",
  "/__void/dev/",
  "/__void/operator/",
  "/__void/admin/",
  "/__debug/",
  "/dev/",
  "/__void/participant/wallet/export",
];

function usage() {
  console.log(`VOID public-node operator self-check v1

Usage:
  node tools/public-node-operator-self-check-v1.mjs [options]

Options:
  --base URL                    Node base URL (default: ${DEFAULT_BASE})
  --output FILE                 Write a mode-0600 JSON receipt
  --timeout-ms N                Per-request timeout (default: ${DEFAULT_TIMEOUT_MS})
  --expected-peer-count N       Minimum peer count (default: ${DEFAULT_EXPECTED_PEERS})
  --observed-at ISO8601         Fixed timestamp for deterministic proof fixtures
  --help                        Show this help

The command performs GET-only, read-only checks. It never submits, registers,
claims, signs, stakes, sends, fulfills, or mutates network state.`);
}

function parseInteger(raw, label, minimum, maximum) {
  const value = Number(raw);
  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    throw new Error(`${label} must be an integer from ${minimum} to ${maximum}`);
  }
  return value;
}

function parseArgs(argv) {
  const result = {
    base: DEFAULT_BASE,
    output: "",
    timeoutMs: DEFAULT_TIMEOUT_MS,
    expectedPeerCount: DEFAULT_EXPECTED_PEERS,
    observedAt: "",
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = () => {
      index += 1;
      if (index >= argv.length) throw new Error(`missing value for ${arg}`);
      return argv[index];
    };

    if (arg === "--base") result.base = next();
    else if (arg === "--output") result.output = next();
    else if (arg === "--timeout-ms") {
      result.timeoutMs = parseInteger(next(), "--timeout-ms", 250, 120_000);
    } else if (arg === "--expected-peer-count") {
      result.expectedPeerCount = parseInteger(next(), "--expected-peer-count", 0, 10_000);
    } else if (arg === "--observed-at") result.observedAt = next();
    else if (arg === "--help" || arg === "-h") {
      usage();
      process.exit(0);
    } else {
      throw new Error(`unknown argument: ${arg}`);
    }
  }

  return result;
}

function normalizeBase(raw) {
  const value = new URL(raw);
  if (!["http:", "https:"].includes(value.protocol)) {
    throw new Error("base URL must use http or https");
  }
  if (value.username || value.password || value.search || value.hash) {
    throw new Error("base URL must not contain credentials, query, or fragment");
  }
  if (value.pathname !== "/" && value.pathname !== "") {
    throw new Error("base URL must not contain a path");
  }
  value.pathname = "/";
  return value;
}

function classifyHost(hostname) {
  const lower = hostname.toLowerCase();
  if (lower === "localhost") return "loopback";
  const family = net.isIP(hostname);
  if (family === 4) {
    const parts = hostname.split(".").map(Number);
    if (
      parts[0] === 10 ||
      parts[0] === 127 ||
      (parts[0] === 169 && parts[1] === 254) ||
      (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
      (parts[0] === 192 && parts[1] === 168) ||
      (parts[0] === 100 && parts[1] >= 64 && parts[1] <= 127)
    ) {
      return parts[0] === 127 ? "loopback" : "private_or_overlay_ipv4";
    }
    return "public_ipv4";
  }
  if (family === 6) {
    if (hostname === "::1") return "loopback";
    return /^(fc|fd|fe8|fe9|fea|feb)/i.test(hostname)
      ? "private_or_linklocal_ipv6"
      : "public_ipv6";
  }
  if (lower.endsWith(".local") || lower.endsWith(".lan") || lower.endsWith(".internal")) {
    return "private_dns";
  }
  if (lower.endsWith(".ts.net")) return "overlay_dns";
  return "public_dns";
}

function safeIso(raw) {
  const date = raw ? new Date(raw) : new Date();
  if (!Number.isFinite(date.getTime())) throw new Error("--observed-at must be valid ISO-8601");
  return date.toISOString();
}

function isPlainObject(value) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function routePathFromString(value) {
  if (typeof value !== "string") return null;
  try {
    if (value.startsWith("/")) {
      return new URL(value, "http://void.invalid").pathname;
    }
    if (/^https?:\/\//i.test(value)) {
      return new URL(value).pathname;
    }
  } catch {
    return null;
  }
  return null;
}

function routeStringArrayAt(value, key) {
  if (!isPlainObject(value) || !Array.isArray(value[key])) return null;
  const routes = [];
  for (const item of value[key]) {
    const route = routePathFromString(item);
    if (!route) return null;
    routes.push(route);
  }
  return [...new Set(routes)];
}

function routeRowArrayAt(value, key, requireManifestMetadata = false) {
  if (!isPlainObject(value) || !Array.isArray(value[key])) return null;
  const routes = [];
  for (const item of value[key]) {
    if (!isPlainObject(item)) return null;
    const route = routePathFromString(item.path);
    if (!route) return null;
    if (
      requireManifestMetadata &&
      (!isNonEmptyString(item.marker) ||
        item.safety_class !== "public_read_only" ||
        !isNonEmptyString(item.purpose))
    ) {
      return null;
    }
    routes.push(route);
  }
  return [...new Set(routes)];
}

function linkRoutesAt(value) {
  if (!isPlainObject(value) || !isPlainObject(value.links)) return null;
  const routes = [];
  for (const item of Object.values(value.links)) {
    const route = routePathFromString(item);
    if (!route) return null;
    routes.push(route);
  }
  return [...new Set(routes)];
}

function markerAt(value, marker) {
  return isPlainObject(value) && value.marker === marker;
}

function sensitiveRoutes(routes) {
  if (!Array.isArray(routes)) return [];
  return routes.filter((route) =>
    SENSITIVE_NAMESPACES.some(
      (prefix) =>
        route === prefix ||
        route.startsWith(prefix) ||
        (prefix.endsWith("/") && route === prefix.slice(0, -1)),
    ),
  );
}

function nonNegativeSafeInteger(value) {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0
    ? value
    : null;
}

function binarySafeInteger(value) {
  return value === 0 || value === 1 ? value : null;
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.length > 0;
}

function isLegacyPeerRecord(value) {
  return Boolean(
    value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      isNonEmptyString(value.id),
  );
}

function isCanonicalConnectedPeer(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const keys = Object.keys(value).sort();
  const expected = ["addr", "id", "listens", "outbound"];
  if (keys.length !== expected.length || !keys.every((key, index) => key === expected[index])) {
    return false;
  }
  return (
    isNonEmptyString(value.id) &&
    typeof value.addr === "string" &&
    Array.isArray(value.listens) &&
    value.listens.every((entry) => typeof entry === "string") &&
    typeof value.outbound === "boolean"
  );
}

function isLegacyPeerArray(value) {
  return (
    Array.isArray(value) &&
    value.every((entry) => isNonEmptyString(entry) || isLegacyPeerRecord(entry))
  );
}

function parsePeerCount(value) {
  if (isLegacyPeerArray(value)) return value.length;
  if (!isPlainObject(value)) return null;
  if (Object.hasOwn(value, "ok") && value.ok !== true) return null;

  if (Object.hasOwn(value, "connected")) {
    if (!Array.isArray(value.connected)) return null;
    return value.connected.every(isCanonicalConnectedPeer) ? value.connected.length : null;
  }
  for (const key of ["peers", "items", "nodes"]) {
    if (Object.hasOwn(value, key)) {
      return isLegacyPeerArray(value[key]) ? value[key].length : null;
    }
  }
  for (const key of ["peer_count", "peerCount", "count", "connected_count"]) {
    if (Object.hasOwn(value, key)) return nonNegativeSafeInteger(value[key]);
  }
  return null;
}

async function settleCancellation(target) {
  let result;
  try {
    result = target?.cancel?.();
  } catch (error) {
    void error;
    return;
  }
  if (!result || typeof result.then !== "function") return;

  let timer;
  try {
    await Promise.race([
      Promise.resolve(result).catch(() => undefined),
      new Promise((resolve) => {
        timer = setTimeout(resolve, CANCEL_SETTLE_TIMEOUT_MS);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function boundedResponseBody(response, maximum) {
  const contentLengthRaw = response.headers.get("content-length");
  if (contentLengthRaw !== null) {
    if (!/^\d+$/.test(contentLengthRaw)) {
      await settleCancellation(response.body);
      throw new Error("invalid_content_length");
    }
    const declared = Number(contentLengthRaw);
    if (!Number.isSafeInteger(declared) || declared < 0) {
      await settleCancellation(response.body);
      throw new Error("invalid_content_length");
    }
    if (declared > maximum) {
      await settleCancellation(response.body);
      throw new Error("response_too_large");
    }
  }

  const reader = response.body?.getReader?.();
  if (!reader) throw new Error("response_body_unavailable");

  const chunks = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!(value instanceof Uint8Array)) throw new Error("response_body_invalid_chunk");
      total += value.byteLength;
      if (total > maximum) {
        await settleCancellation(reader);
        throw new Error("response_too_large");
      }
      chunks.push(Buffer.from(value));
    }
  } finally {
    try {
      reader.releaseLock();
    } catch (error) {
      void error;
    }
  }

  return Buffer.concat(chunks, total);
}

async function fetchJson(base, pathname, timeoutMs) {
  const url = new URL(pathname, base);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      method: "GET",
      redirect: "manual",
      signal: controller.signal,
      headers: {
        accept: "application/json",
        "user-agent": "void-public-node-operator-self-check-v1",
      },
    });
    const body = await boundedResponseBody(response, MAX_RESPONSE_BYTES);
    let json = null;
    let parseError = "";
    try {
      json = JSON.parse(body.toString("utf8"));
    } catch {
      parseError = "invalid_json";
    }
    return {
      ok: response.status === 200 && parseError === "",
      statusCode: response.status,
      error: response.status === 200 ? parseError : `http_${response.status}`,
      json,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const boundedError = new Set([
      "invalid_content_length",
      "response_too_large",
      "response_body_unavailable",
      "response_body_invalid_chunk",
    ]).has(message);
    return {
      ok: false,
      statusCode: 0,
      error:
        error?.name === "AbortError"
          ? "timeout"
          : boundedError
            ? message
            : "request_failed",
      json: null,
    };
  } finally {
    clearTimeout(timer);
  }
}

function check(id, pathValue, ok, reason, observed = {}) {
  return { id, path: pathValue, ok: Boolean(ok), reason: ok ? null : reason, observed };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const base = normalizeBase(args.base);
  const observedAt = safeIso(args.observedAt);
  const checks = [];

  const health = await fetchJson(base, "/health", args.timeoutMs);
  const healthValue = health.json;
  const healthPeers = parsePeerCount(healthValue?.peers ?? healthValue);
  const healthOk =
    health.ok &&
    healthValue?.ok === true &&
    typeof healthValue?.nodeId === "string" &&
    healthValue.nodeId.length >= 8;
  checks.push(
    check("health", "/health", healthOk, health.error || "health_contract_mismatch", {
      status_code: health.statusCode,
      node_id_present: typeof healthValue?.nodeId === "string",
      http_port: nonNegativeSafeInteger(healthValue?.http),
      p2p_port: nonNegativeSafeInteger(healthValue?.p2p),
      peer_count: healthPeers,
    }),
  );

  const ready = await fetchJson(base, "/__void/ready.json", args.timeoutMs);
  const readyValue = ready.json;
  const readyHead = nonNegativeSafeInteger(readyValue?.head);
  const readyLastmileSeen = nonNegativeSafeInteger(readyValue?.lastmile_seen);
  const readyGap = nonNegativeSafeInteger(readyValue?.gap);
  const readyTxrootLive = binarySafeInteger(readyValue?.txroot_live);
  const readyReasonsValid =
    Array.isArray(readyValue?.reasons) &&
    readyValue.reasons.every((reason) => typeof reason === "string");
  const readinessOk =
    ready.ok &&
    readyValue?.ready === true &&
    readyHead !== null &&
    readyLastmileSeen !== null &&
    readyGap === 0 &&
    readyTxrootLive === 1 &&
    readyReasonsValid &&
    readyValue.reasons.length === 0;
  checks.push(
    check(
      "readiness",
      "/__void/ready.json",
      readinessOk,
      ready.error || "readiness_contract_mismatch",
      {
        status_code: ready.statusCode,
        ready: readyValue?.ready === true,
        head: readyHead,
        lastmile_seen: readyLastmileSeen,
        gap: readyGap,
        txroot_live: readyTxrootLive,
        reason_count: readyReasonsValid ? readyValue.reasons.length : null,
      },
    ),
  );

  const head = await fetchJson(base, "/blocks/latest/number2.json", args.timeoutMs);
  const headNumber = nonNegativeSafeInteger(head.json?.number);
  const headOk =
    head.ok &&
    headNumber !== null &&
    readyHead !== null &&
    readyLastmileSeen !== null &&
    headNumber === readyHead &&
    headNumber === readyLastmileSeen;
  checks.push(
    check(
      "chain_head",
      "/blocks/latest/number2.json",
      headOk,
      head.error || "chain_head_mismatch",
      {
        status_code: head.statusCode,
        number: headNumber,
        aligned_with_readiness: headOk && ready.ok,
      },
    ),
  );

  let peersPath = "/p2p/peers";
  let peers = await fetchJson(base, peersPath, args.timeoutMs);
  if (!peers.ok) {
    peersPath = "/peers";
    peers = await fetchJson(base, peersPath, args.timeoutMs);
  }
  const peerCount = parsePeerCount(peers.json);
  const peersOk = peerCount !== null && peers.ok && peerCount >= args.expectedPeerCount;
  checks.push(
    check(
      "peer_visibility",
      peersPath,
      peersOk,
      peers.error || "peer_count_below_expected",
      {
        status_code: peers.statusCode,
        peer_count: peerCount,
        expected_minimum: args.expectedPeerCount,
      },
    ),
  );

  const wellKnown = await fetchJson(base, "/.well-known/void-public-node.json", args.timeoutMs);
  const wellKnownRoutes = linkRoutesAt(wellKnown.json);
  const wellKnownMissing = REQUIRED_WELL_KNOWN_ROUTES.filter(
    (route) => !wellKnownRoutes?.includes(route),
  );
  const wellKnownPolicy =
    isPlainObject(wellKnown.json) && isPlainObject(wellKnown.json.policy)
      ? wellKnown.json.policy
      : null;
  const wellKnownLinks =
    isPlainObject(wellKnown.json) && isPlainObject(wellKnown.json.links)
      ? wellKnown.json.links
      : null;
  const wellKnownOk =
    wellKnown.ok &&
    markerAt(wellKnown.json, "VOID_PUBLIC_NODE_AGENT_DISCOVERY_V1") &&
    wellKnownRoutes !== null &&
    wellKnownMissing.length === 0 &&
    wellKnownPolicy?.public_routes_only === true &&
    wellKnownPolicy?.read_only === true &&
    wellKnownPolicy?.mutation === false;
  checks.push(
    check(
      "well_known_discovery",
      "/.well-known/void-public-node.json",
      wellKnownOk,
      wellKnown.error || "well_known_discovery_contract_mismatch",
      {
        status_code: wellKnown.statusCode,
        marker_present: markerAt(wellKnown.json, "VOID_PUBLIC_NODE_AGENT_DISCOVERY_V1"),
        public_route_pointer_count:
          wellKnownRoutes?.filter((route) => route.startsWith("/public-node")).length ?? null,
        required_pointer_count: REQUIRED_WELL_KNOWN_ROUTES.length,
        missing_pointer_count: wellKnownMissing.length,
        absolute_url_pointer_count: wellKnownLinks
          ? Object.values(wellKnownLinks).filter(
              (value) => typeof value === "string" && /^https?:\/\//i.test(value),
            ).length
          : null,
        public_routes_only: wellKnownPolicy?.public_routes_only === true,
        read_only: wellKnownPolicy?.read_only === true,
        mutation_false: wellKnownPolicy?.mutation === false,
      },
    ),
  );

  const routeIndex = await fetchJson(base, "/public-node/route-index.json", args.timeoutMs);
  const indexRoutes = routeRowArrayAt(routeIndex.json, "routes");
  const indexSensitive = sensitiveRoutes(indexRoutes);
  const routeIndexOk =
    routeIndex.ok &&
    markerAt(routeIndex.json, "VOID_PUBLIC_NODE_ROUTE_INDEX_V1") &&
    indexRoutes !== null &&
    indexSensitive.length === 0;
  checks.push(
    check(
      "route_index",
      "/public-node/route-index.json",
      routeIndexOk,
      routeIndex.error || "route_index_contract_mismatch",
      {
        status_code: routeIndex.statusCode,
        marker_present: markerAt(routeIndex.json, "VOID_PUBLIC_NODE_ROUTE_INDEX_V1"),
        route_count: indexRoutes?.length ?? null,
        sensitive_route_count: indexSensitive.length,
      },
    ),
  );

  const routeManifest = await fetchJson(base, "/public-node/route-manifest.json", args.timeoutMs);
  const manifestRoutes = routeRowArrayAt(routeManifest.json, "routes", true);
  const manifestRouteCount = nonNegativeSafeInteger(routeManifest.json?.route_count);
  const manifestCountMatches =
    manifestRoutes !== null && manifestRouteCount !== null && manifestRouteCount === manifestRoutes.length;
  const manifestMissing = REQUIRED_PUBLIC_ROUTES.filter(
    (route) => !manifestRoutes?.includes(route),
  );
  const manifestSensitive = sensitiveRoutes(manifestRoutes);
  const routeManifestOk =
    routeManifest.ok &&
    markerAt(routeManifest.json, "VOID_PUBLIC_NODE_ROUTE_MANIFEST_V1") &&
    manifestRoutes !== null &&
    manifestCountMatches &&
    manifestMissing.length === 0 &&
    manifestSensitive.length === 0;
  checks.push(
    check(
      "route_manifest",
      "/public-node/route-manifest.json",
      routeManifestOk,
      routeManifest.error || "route_manifest_contract_mismatch",
      {
        status_code: routeManifest.statusCode,
        marker_present: markerAt(routeManifest.json, "VOID_PUBLIC_NODE_ROUTE_MANIFEST_V1"),
        route_count: manifestRouteCount,
        route_count_matches: manifestCountMatches,
        required_route_count: REQUIRED_PUBLIC_ROUTES.length,
        missing_route_count: manifestMissing.length,
        sensitive_route_count: manifestSensitive.length,
      },
    ),
  );

  const snapshot = await fetchJson(base, "/public-node/self-check-snapshot.json", args.timeoutMs);
  const snapshotRoutes = routeStringArrayAt(snapshot.json, "expected_routes");
  const snapshotExpectedRouteCount = nonNegativeSafeInteger(snapshot.json?.expected_route_count);
  const snapshotCountMatches =
    snapshotRoutes !== null &&
    snapshotExpectedRouteCount !== null &&
    snapshotExpectedRouteCount === snapshotRoutes.length;
  const snapshotMissing = REQUIRED_PUBLIC_ROUTES.filter(
    (route) => !snapshotRoutes?.includes(route),
  );
  const snapshotSensitive = sensitiveRoutes(snapshotRoutes);
  const snapshotPolicy =
    isPlainObject(snapshot.json) && isPlainObject(snapshot.json.policy)
      ? snapshot.json.policy
      : null;
  const snapshotPublicPostFalse = snapshotPolicy?.public_post_endpoint === false;
  const snapshotOk =
    snapshot.ok &&
    markerAt(snapshot.json, "VOID_PUBLIC_NODE_SELF_CHECK_SNAPSHOT_V1") &&
    snapshotRoutes !== null &&
    snapshotCountMatches &&
    snapshotMissing.length === 0 &&
    snapshotSensitive.length === 0 &&
    snapshotPublicPostFalse;
  checks.push(
    check(
      "self_check_snapshot",
      "/public-node/self-check-snapshot.json",
      snapshotOk,
      snapshot.error || "self_check_snapshot_contract_mismatch",
      {
        status_code: snapshot.statusCode,
        marker_present: markerAt(snapshot.json, "VOID_PUBLIC_NODE_SELF_CHECK_SNAPSHOT_V1"),
        expected_route_count: snapshotExpectedRouteCount,
        route_count_matches: snapshotCountMatches,
        required_route_count: REQUIRED_PUBLIC_ROUTES.length,
        missing_route_count: snapshotMissing.length,
        sensitive_route_count: snapshotSensitive.length,
        public_post_endpoint_false: snapshotPublicPostFalse,
      },
    ),
  );

  const discoveryAlignmentOk =
    routeIndexOk &&
    routeManifestOk &&
    snapshotOk &&
    Array.isArray(manifestRoutes) &&
    Array.isArray(snapshotRoutes) &&
    REQUIRED_PUBLIC_ROUTES.every(
      (route) => manifestRoutes.includes(route) && snapshotRoutes.includes(route),
    );
  checks.push(
    check(
      "public_discovery_alignment",
      "route-index + route-manifest + self-check-snapshot",
      discoveryAlignmentOk,
      "public_discovery_surfaces_not_aligned",
      { required_routes_aligned: discoveryAlignmentOk },
    ),
  );

  const failed = checks.filter((entry) => !entry.ok);
  const receipt = {
    marker: MARKER,
    network: NETWORK,
    read_only: true,
    observed_at: observedAt,
    target: {
      scheme: base.protocol.slice(0, -1),
      host_class: classifyHost(base.hostname),
      port: Number(base.port || (base.protocol === "https:" ? 443 : 80)),
      raw_target_included: false,
    },
    summary: {
      status: failed.length === 0 ? "green" : "hold",
      checks_total: checks.length,
      checks_green: checks.length - failed.length,
      checks_failed: failed.length,
      failed_check_ids: failed.map((entry) => entry.id),
    },
    runtime: {
      node_id: typeof healthValue?.nodeId === "string" ? healthValue.nodeId : null,
      http_port: nonNegativeSafeInteger(healthValue?.http),
      p2p_port: nonNegativeSafeInteger(healthValue?.p2p),
      chain_head: headNumber,
      peer_count: peerCount,
      expected_peer_count: args.expectedPeerCount,
      ready: readyValue?.ready === true,
      gap: readyGap,
      txroot_live: readyTxrootLive,
    },
    checks,
    safety: {
      methods_used: ["GET"],
      redirects_followed: false,
      credentials_sent: false,
      mutation_attempted: false,
      registration_attempted: false,
      validator_activation_attempted: false,
      staking_attempted: false,
      wallet_connection_attempted: false,
      ledger_write_attempted: false,
      peer_state_write_attempted: false,
      validator_set_write_attempted: false,
      ticket_claim_attempted: false,
      buy_void_fulfillment_attempted: false,
    },
  };

  const encoded = `${JSON.stringify(receipt, null, 2)}\n`;
  if (args.output) {
    const output = path.resolve(args.output);
    fs.mkdirSync(path.dirname(output), { recursive: true, mode: 0o700 });
    fs.writeFileSync(output, encoded, { encoding: "utf8", mode: 0o600 });
    fs.chmodSync(output, 0o600);
  }
  process.stdout.write(encoded);
  process.exitCode = failed.length === 0 ? 0 : 2;
}

main().catch((error) => {
  console.error(
    JSON.stringify(
      {
        marker: MARKER,
        status: "error",
        error: error instanceof Error ? error.message : "unknown_error",
        mutation_attempted: false,
      },
      null,
      2,
    ),
  );
  process.exitCode = 1;
});
