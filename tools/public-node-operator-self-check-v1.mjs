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

const REQUIRED_ROUTE_INDEX_ROUTES = [
  "/public-node",
  "/public-node/route-index.json",
  "/public-node/share-pack.json",
  "/public-node/tester-checklist.json",
  "/public-node/client-work-pack.json",
  "/public-node/ai-readiness.json",
  "/public-node/fresh-proof-seed.json",
  "/public-node/requester-work-policy.json",
  "/public-node/data-quality.json",
  "/public-node/link-health.json",
  "/public-node/intelligence.json",
  "/proofs",
];

const CANONICAL_SNAPSHOT_ROUTES = [
  "/.well-known/void-public-node.json",
  "/public-node/external-tester-copy-pack.json",
  "/public-node/tester-result-intake.json",
  "/public-node/standalone-outside-tester-smoke.sh",
  "/public-node/tester-share",
  "/public-node/tester-lane-summary.json",
  "/public-node/first-tester-request-copy-pack.json",
  "/public-node/local-data-drop/manifest.json",
  "/public-node/local-data-drop.json",
  "/public-node/local-data-drop/proof/:sha256.json",
  "/public-node/local-data-drop/by-sha256/:sha256",
  "/public-node/local-data-drop/:objectId",
  "/public-node",
  "/public-node/self-check-snapshot.json",
  "/public-node/route-manifest.json",
  "/public-node/share-link.json",
  "/public-node/tester-bundle.json",
  "/public-node/outside-tester-smoke.json",
  "/public-node/tester-loop-status.json",
  "/public-node/tester-result-receipt.json",
  "/public-node/quickstart.json",
  "/public-node/tester-handoff.json",
  "/public-node/public-exposure-smoke-pack.json",
  "/public-node/route-index.json",
  "/proofs",
];

const REQUIRED_MANIFEST_MARKERS = new Map([
  ["/.well-known/void-public-node.json", "VOID_PUBLIC_NODE_AGENT_DISCOVERY_V1"],
  ["/public-node", "VOID_PUBLIC_NODE_PROFILE_ROUTE_V1"],
  ["/public-node/route-manifest.json", "VOID_PUBLIC_NODE_ROUTE_MANIFEST_V1"],
  ["/public-node/self-check-snapshot.json", "VOID_PUBLIC_NODE_SELF_CHECK_SNAPSHOT_V1"],
  ["/public-node/share-link.json", "VOID_PUBLIC_NODE_SHARE_LINK_V1"],
  ["/public-node/tester-bundle.json", "VOID_PUBLIC_NODE_TESTER_BUNDLE_V1"],
  ["/public-node/outside-tester-smoke.json", "VOID_PUBLIC_NODE_OUTSIDE_TESTER_SMOKE_SURFACE_V1"],
  ["/public-node/tester-loop-status.json", "VOID_PUBLIC_NODE_TESTER_LOOP_STATUS_V1"],
  ["/public-node/tester-result-receipt.json", "VOID_PUBLIC_NODE_TESTER_RESULT_RECEIPT_V1"],
  ["/public-node/quickstart.json", "VOID_PUBLIC_NODE_QUICKSTART_V1"],
  ["/public-node/tester-handoff.json", "VOID_PUBLIC_NODE_TESTER_HANDOFF_V1"],
  ["/public-node/public-exposure-smoke-pack.json", "VOID_PUBLIC_NODE_PUBLIC_EXPOSURE_SMOKE_PACK_V1"],
  ["/public-node/route-index.json", "VOID_PUBLIC_NODE_ROUTE_INDEX_V1"],
  ["/proofs", "VOID_PUBLIC_PROOFS_INDEX_V1"],
]);

const REQUIRED_WELL_KNOWN_ROUTES = [
  "/public-node",
  "/public-node/route-manifest.json",
  "/public-node/self-check-snapshot.json",
  "/public-node/outside-tester-smoke.json",
  "/public-node/tester-bundle.json",
  "/public-node/tester-result-receipt.json",
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

function normalizedHostname(hostname) {
  const lower = hostname.toLowerCase();
  return lower.startsWith("[") && lower.endsWith("]") ? lower.slice(1, -1) : lower;
}

function classifyHost(hostname) {
  const normalized = normalizedHostname(hostname);
  if (normalized === "localhost") return "loopback";
  const family = net.isIP(normalized);
  if (family === 4) {
    const parts = normalized.split(".").map(Number);
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
    if (normalized === "::1") return "loopback";
    return /^(fc|fd|fe8|fe9|fea|feb)/i.test(normalized)
      ? "private_or_linklocal_ipv6"
      : "public_ipv6";
  }
  if (
    normalized.endsWith(".local") ||
    normalized.endsWith(".lan") ||
    normalized.endsWith(".internal")
  ) {
    return "private_dns";
  }
  if (normalized.endsWith(".ts.net")) return "overlay_dns";
  return "public_dns";
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
  const hostClass = classifyHost(value.hostname);
  if (value.protocol === "http:" && hostClass.startsWith("public_")) {
    throw new Error("public base URL must use https; http is limited to loopback/private/overlay hosts");
  }
  value.pathname = "/";
  return value;
}

function safeIso(raw) {
  const date = raw ? new Date(raw) : new Date();
  if (!Number.isFinite(date.getTime())) throw new Error("--observed-at must be valid ISO-8601");
  return date.toISOString();
}

function isPlainObject(value) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function exactCanonicalRoutePath(value) {
  if (typeof value !== "string" || value.length === 0 || value.trim() !== value) return null;
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("?") || value.includes("#")) {
    return null;
  }
  try {
    const parsed = new URL(value, "https://void.invalid");
    if (parsed.origin !== "https://void.invalid" || parsed.pathname !== value) return null;
    return value;
  } catch {
    return null;
  }
}

function absolutePublicLinkPath(value) {
  if (typeof value !== "string" || value.length === 0 || value.trim() !== value) return null;
  try {
    const parsed = new URL(value);
    if (!["http:", "https:"].includes(parsed.protocol)) return null;
    if (parsed.username || parsed.password || parsed.search || parsed.hash) return null;
    return exactCanonicalRoutePath(parsed.pathname);
  } catch {
    return null;
  }
}

function routeStringArrayAt(value, key) {
  if (!isPlainObject(value) || !Array.isArray(value[key])) return null;
  const routes = [];
  for (const item of value[key]) {
    const route = exactCanonicalRoutePath(item);
    if (!route) return null;
    routes.push(route);
  }
  return routes.length === new Set(routes).size ? routes : null;
}

function routeRowArrayAt(value, key, requireManifestMetadata = false) {
  if (!isPlainObject(value) || !Array.isArray(value[key])) return null;
  const rows = [];
  for (const item of value[key]) {
    if (!isPlainObject(item)) return null;
    const route = exactCanonicalRoutePath(item.path);
    if (!route || !isNonEmptyString(item.marker) || !isNonEmptyString(item.purpose)) return null;
    if (requireManifestMetadata && item.safety_class !== "public_read_only") return null;
    rows.push({ route, item });
  }
  if (rows.length !== new Set(rows.map(({ route }) => route)).size) return null;
  return rows;
}

function linkRoutesAt(value) {
  if (!isPlainObject(value) || !isPlainObject(value.links)) return null;
  const routes = [];
  for (const item of Object.values(value.links)) {
    const route = absolutePublicLinkPath(item);
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
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : null;
}

function binarySafeInteger(value) {
  return value === 0 || value === 1 ? value : null;
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.length > 0;
}

function hasCanonicalReadOnlyPolicy(value) {
  if (!isPlainObject(value)) return false;
  return (
    value.public_routes_only === true &&
    value.private_api === false &&
    value.mutation === false &&
    value.read_only === true &&
    value.money_movement === false &&
    value.wallet_send === false &&
    value.wc_to_void_swap === false &&
    value.buy_void_fulfillment === false &&
    value.validator_mutation === false
  );
}

function exactRouteSet(routes, expected) {
  return (
    Array.isArray(routes) &&
    routes.length === expected.length &&
    routes.every((route) => expected.includes(route))
  );
}

function manifestMetadataOk(rows) {
  if (!Array.isArray(rows)) return false;
  for (const [route, expectedMarker] of REQUIRED_MANIFEST_MARKERS) {
    const row = rows.find((entry) => entry.route === route)?.item;
    if (!row || row.marker !== expectedMarker || row.safety_class !== "public_read_only" || !isNonEmptyString(row.purpose)) {
      return false;
    }
  }
  return true;
}

function snapshotChecksOk(value) {
  if (!isPlainObject(value)) return false;
  return (
    value.self_check_snapshot === true &&
    value.agent_discovery_present === true &&
    value.route_index_present === true &&
    value.route_manifest_present === true &&
    value.outside_tester_smoke_surface_present === true &&
    value.externally_testable === true
  );
}

function snapshotLinksOk(value, baseOrigin) {
  if (!isPlainObject(value)) return false;
  const expected = {
    agent_discovery: `${baseOrigin}/.well-known/void-public-node.json`,
    public_node: `${baseOrigin}/public-node`,
    route_index: `${baseOrigin}/public-node/route-index.json`,
    route_manifest: `${baseOrigin}/public-node/route-manifest.json`,
    smoke_surface: `${baseOrigin}/public-node/outside-tester-smoke.json`,
    proofs: `${baseOrigin}/proofs`,
  };
  const actualKeys = Object.keys(value).sort();
  const expectedKeys = Object.keys(expected).sort();
  return (
    actualKeys.length === expectedKeys.length &&
    actualKeys.every((key, index) => key === expectedKeys[index]) &&
    Object.entries(expected).every(([key, expectedValue]) => value[key] === expectedValue)
  );
}

function wellKnownLinksOk(value, baseOrigin) {
  if (!isPlainObject(value)) return false;
  const expected = {
    public_node: `${baseOrigin}/public-node`,
    route_manifest: `${baseOrigin}/public-node/route-manifest.json`,
    self_check_snapshot: `${baseOrigin}/public-node/self-check-snapshot.json`,
    outside_tester_smoke: `${baseOrigin}/public-node/outside-tester-smoke.json`,
    tester_bundle: `${baseOrigin}/public-node/tester-bundle.json`,
    result_receipt: `${baseOrigin}/public-node/tester-result-receipt.json`,
    proofs: `${baseOrigin}/proofs`,
  };
  const actualKeys = Object.keys(value).sort();
  const expectedKeys = Object.keys(expected).sort();
  return (
    actualKeys.length === expectedKeys.length &&
    actualKeys.every((key, index) => key === expectedKeys[index]) &&
    Object.entries(expected).every(([key, expectedValue]) => value[key] === expectedValue)
  );
}

function isLegacyPeerRecord(value) {
  return Boolean(
    value && typeof value === "object" && !Array.isArray(value) && isNonEmptyString(value.id),
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
  return Array.isArray(value) && value.every((entry) => isNonEmptyString(entry) || isLegacyPeerRecord(entry));
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

function remainingCancellationWindow(deadlineMs) {
  return Math.max(0, Math.min(CANCEL_SETTLE_TIMEOUT_MS, deadlineMs - Date.now()));
}

async function settleCancellation(target, controller, deadlineMs) {
  if (!controller.signal.aborted) controller.abort();

  let result;
  try {
    result = target?.cancel?.();
  } catch (error) {
    void error;
    return;
  }
  if (!result || typeof result.then !== "function") return;

  const waitMs = remainingCancellationWindow(deadlineMs);
  if (waitMs <= 0) return;

  let timer;
  try {
    await Promise.race([
      Promise.resolve(result).catch(() => undefined),
      new Promise((resolve) => {
        timer = setTimeout(resolve, waitMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function boundedResponseBody(response, maximum, controller, deadlineMs) {
  const rejectBody = async (target, code) => {
    await settleCancellation(target, controller, deadlineMs);
    throw new Error(code);
  };

  const contentLengthRaw = response.headers.get("content-length");
  if (contentLengthRaw !== null) {
    if (!/^\d+$/.test(contentLengthRaw)) {
      await rejectBody(response.body, "invalid_content_length");
    }
    const declared = Number(contentLengthRaw);
    if (!Number.isSafeInteger(declared) || declared < 0) {
      await rejectBody(response.body, "invalid_content_length");
    }
    if (declared > maximum) {
      await rejectBody(response.body, "response_too_large");
    }
  }

  const reader = response.body?.getReader?.();
  if (!reader) {
    await rejectBody(response.body, "response_body_unavailable");
  }

  const chunks = [];
  let total = 0;
  try {
    while (true) {
      let nextChunk;
      try {
        nextChunk = await reader.read();
      } catch (error) {
        const timedOut = controller.signal.aborted;
        await settleCancellation(reader, controller, deadlineMs);
        if (timedOut) {
          const timeoutError = new Error("request timed out");
          timeoutError.name = "AbortError";
          throw timeoutError;
        }
        void error;
        throw new Error("response_body_read_failed");
      }
      const { done, value } = nextChunk;
      if (done) break;
      if (!(value instanceof Uint8Array)) {
        await rejectBody(reader, "response_body_invalid_chunk");
      }
      total += value.byteLength;
      if (total > maximum) {
        await rejectBody(reader, "response_too_large");
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
  const deadlineMs = Date.now() + timeoutMs;
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
    const body = await boundedResponseBody(response, MAX_RESPONSE_BYTES, controller, deadlineMs);
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
      "response_body_read_failed",
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

function validateOutputParent(output) {
  const parent = path.dirname(output);
  let parentStat;
  try {
    parentStat = fs.lstatSync(parent);
  } catch {
    throw new Error("output parent must already exist");
  }
  if (!parentStat.isDirectory() || parentStat.isSymbolicLink()) {
    throw new Error("output parent must be a real directory");
  }
  const resolvedParent = fs.realpathSync.native(parent);
  if (path.resolve(resolvedParent) !== parent) {
    throw new Error("output parent must not traverse symlinks");
  }
}

function writeReceiptCreateOnly(rawOutput, encoded) {
  const output = path.resolve(rawOutput);
  validateOutputParent(output);
  const flags =
    fs.constants.O_WRONLY |
    fs.constants.O_CREAT |
    fs.constants.O_EXCL |
    (fs.constants.O_NOFOLLOW ?? 0);
  const fd = fs.openSync(output, flags, 0o600);
  try {
    fs.writeFileSync(fd, encoded, { encoding: "utf8" });
    fs.fchmodSync(fd, 0o600);
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const base = normalizeBase(args.base);
  const baseOrigin = base.origin;
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
    Array.isArray(readyValue?.reasons) && readyValue.reasons.every((reason) => typeof reason === "string");
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
  const wellKnownRouteSetMatches = exactRouteSet(wellKnownRoutes, REQUIRED_WELL_KNOWN_ROUTES);
  const wellKnownPolicy =
    isPlainObject(wellKnown.json) && isPlainObject(wellKnown.json.policy) ? wellKnown.json.policy : null;
  const wellKnownLinks =
    isPlainObject(wellKnown.json) && isPlainObject(wellKnown.json.links) ? wellKnown.json.links : null;
  const wellKnownPolicyOk = hasCanonicalReadOnlyPolicy(wellKnownPolicy);
  const wellKnownLinksMatch = wellKnownLinksOk(wellKnownLinks, baseOrigin);
  const wellKnownOk =
    wellKnown.ok &&
    markerAt(wellKnown.json, "VOID_PUBLIC_NODE_AGENT_DISCOVERY_V1") &&
    wellKnown.json?.purpose === "well_known_public_node_agent_discovery" &&
    wellKnown.json?.protocol === "void-public-node-discovery-v1" &&
    wellKnown.json?.status === "public_node_agent_discovery_ready" &&
    wellKnown.json?.effective_base_url === baseOrigin &&
    wellKnownRoutes !== null &&
    wellKnownMissing.length === 0 &&
    wellKnownRouteSetMatches &&
    wellKnownLinksMatch &&
    wellKnownPolicyOk;
  checks.push(
    check(
      "well_known_discovery",
      "/.well-known/void-public-node.json",
      wellKnownOk,
      wellKnown.error || "well_known_discovery_contract_mismatch",
      {
        status_code: wellKnown.statusCode,
        marker_present: markerAt(wellKnown.json, "VOID_PUBLIC_NODE_AGENT_DISCOVERY_V1"),
        purpose_matches: wellKnown.json?.purpose === "well_known_public_node_agent_discovery",
        protocol_matches: wellKnown.json?.protocol === "void-public-node-discovery-v1",
        status_matches: wellKnown.json?.status === "public_node_agent_discovery_ready",
        effective_base_matches: wellKnown.json?.effective_base_url === baseOrigin,
        public_route_pointer_count:
          wellKnownRoutes?.filter((route) => route.startsWith("/public-node")).length ?? null,
        required_pointer_count: REQUIRED_WELL_KNOWN_ROUTES.length,
        missing_pointer_count: wellKnownMissing.length,
        exact_pointer_set_matches: wellKnownRouteSetMatches,
        absolute_url_pointer_count: wellKnownLinks
          ? Object.values(wellKnownLinks).filter(
              (value) => typeof value === "string" && /^https?:\/\//i.test(value),
            ).length
          : null,
        links_match: wellKnownLinksMatch,
        policy_matches: wellKnownPolicyOk,
        public_routes_only: wellKnownPolicy?.public_routes_only === true,
        read_only: wellKnownPolicy?.read_only === true,
        mutation_false: wellKnownPolicy?.mutation === false,
      },
    ),
  );

  const routeIndex = await fetchJson(base, "/public-node/route-index.json", args.timeoutMs);
  const indexRows = routeRowArrayAt(routeIndex.json, "routes");
  const indexRoutes = indexRows?.map(({ route }) => route) ?? null;
  const indexSensitive = sensitiveRoutes(indexRoutes);
  const indexMissing = REQUIRED_ROUTE_INDEX_ROUTES.filter((route) => !indexRoutes?.includes(route));
  const routeIndexPolicyOk = hasCanonicalReadOnlyPolicy(routeIndex.json?.policy);
  const routeIndexOk =
    routeIndex.ok &&
    markerAt(routeIndex.json, "VOID_PUBLIC_NODE_ROUTE_INDEX_V1") &&
    routeIndex.json?.purpose === "public_node_route_index" &&
    indexRows !== null &&
    indexMissing.length === 0 &&
    indexSensitive.length === 0 &&
    routeIndexPolicyOk;
  checks.push(
    check(
      "route_index",
      "/public-node/route-index.json",
      routeIndexOk,
      routeIndex.error || "route_index_contract_mismatch",
      {
        status_code: routeIndex.statusCode,
        marker_present: markerAt(routeIndex.json, "VOID_PUBLIC_NODE_ROUTE_INDEX_V1"),
        purpose_matches: routeIndex.json?.purpose === "public_node_route_index",
        route_count: indexRoutes?.length ?? null,
        required_route_count: REQUIRED_ROUTE_INDEX_ROUTES.length,
        missing_route_count: indexMissing.length,
        sensitive_route_count: indexSensitive.length,
        policy_matches: routeIndexPolicyOk,
      },
    ),
  );

  const routeManifest = await fetchJson(base, "/public-node/route-manifest.json", args.timeoutMs);
  const manifestRows = routeRowArrayAt(routeManifest.json, "routes", true);
  const manifestRoutes = manifestRows?.map(({ route }) => route) ?? null;
  const manifestRouteCount = nonNegativeSafeInteger(routeManifest.json?.route_count);
  const manifestCountMatches =
    manifestRoutes !== null && manifestRouteCount !== null && manifestRouteCount === manifestRoutes.length;
  const manifestCanonicalRoutes = exactRouteSet(manifestRoutes, CANONICAL_SNAPSHOT_ROUTES);
  const manifestMetadataMatches = manifestMetadataOk(manifestRows);
  const manifestSensitive = sensitiveRoutes(manifestRoutes);
  const manifestPolicyOk = hasCanonicalReadOnlyPolicy(routeManifest.json?.policy);
  const routeManifestOk =
    routeManifest.ok &&
    markerAt(routeManifest.json, "VOID_PUBLIC_NODE_ROUTE_MANIFEST_V1") &&
    routeManifest.json?.purpose === "canonical_public_node_route_manifest" &&
    routeManifest.json?.status === "public_node_route_manifest_ready" &&
    routeManifest.json?.effective_base_url === baseOrigin &&
    manifestRows !== null &&
    manifestCountMatches &&
    manifestCanonicalRoutes &&
    manifestMetadataMatches &&
    manifestSensitive.length === 0 &&
    manifestPolicyOk;
  checks.push(
    check(
      "route_manifest",
      "/public-node/route-manifest.json",
      routeManifestOk,
      routeManifest.error || "route_manifest_contract_mismatch",
      {
        status_code: routeManifest.statusCode,
        marker_present: markerAt(routeManifest.json, "VOID_PUBLIC_NODE_ROUTE_MANIFEST_V1"),
        purpose_matches: routeManifest.json?.purpose === "canonical_public_node_route_manifest",
        status_matches: routeManifest.json?.status === "public_node_route_manifest_ready",
        effective_base_matches: routeManifest.json?.effective_base_url === baseOrigin,
        route_count: manifestRouteCount,
        route_count_matches: manifestCountMatches,
        canonical_route_set_matches: manifestCanonicalRoutes,
        route_metadata_matches: manifestMetadataMatches,
        required_route_count: CANONICAL_SNAPSHOT_ROUTES.length,
        sensitive_route_count: manifestSensitive.length,
        policy_matches: manifestPolicyOk,
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
  const snapshotCanonicalRoutes = exactRouteSet(snapshotRoutes, CANONICAL_SNAPSHOT_ROUTES);
  const snapshotSensitive = sensitiveRoutes(snapshotRoutes);
  const snapshotPolicy =
    isPlainObject(snapshot.json) && isPlainObject(snapshot.json.policy) ? snapshot.json.policy : null;
  const snapshotPolicyOk = hasCanonicalReadOnlyPolicy(snapshotPolicy);
  const snapshotPublicPostFalse =
    !snapshotPolicy ||
    !Object.hasOwn(snapshotPolicy, "public_post_endpoint") ||
    snapshotPolicy.public_post_endpoint === false;
  const snapshotChecksMatch = snapshotChecksOk(snapshot.json?.checks);
  const snapshotLinksMatch = snapshotLinksOk(snapshot.json?.links, baseOrigin);
  const snapshotOk =
    snapshot.ok &&
    markerAt(snapshot.json, "VOID_PUBLIC_NODE_SELF_CHECK_SNAPSHOT_V1") &&
    snapshot.json?.purpose === "public_node_self_check_snapshot" &&
    snapshot.json?.status === "public_node_externally_testable_read_only_surface_ready" &&
    snapshot.json?.effective_base_url === baseOrigin &&
    snapshotRoutes !== null &&
    snapshotCountMatches &&
    snapshotCanonicalRoutes &&
    snapshotSensitive.length === 0 &&
    snapshotChecksMatch &&
    snapshotLinksMatch &&
    snapshotPolicyOk &&
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
        purpose_matches: snapshot.json?.purpose === "public_node_self_check_snapshot",
        status_matches: snapshot.json?.status === "public_node_externally_testable_read_only_surface_ready",
        effective_base_matches: snapshot.json?.effective_base_url === baseOrigin,
        expected_route_count: snapshotExpectedRouteCount,
        route_count_matches: snapshotCountMatches,
        canonical_route_set_matches: snapshotCanonicalRoutes,
        required_route_count: CANONICAL_SNAPSHOT_ROUTES.length,
        sensitive_route_count: snapshotSensitive.length,
        checks_match: snapshotChecksMatch,
        links_match: snapshotLinksMatch,
        policy_matches: snapshotPolicyOk,
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
    writeReceiptCreateOnly(args.output, encoded);
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