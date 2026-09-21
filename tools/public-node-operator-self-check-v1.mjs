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

const REQUIRED_PUBLIC_ROUTE_MARKERS = new Map([
  ["/public-node", "VOID_PUBLIC_NODE_PROFILE_ROUTE_V1"],
  ["/public-node/route-index.json", "VOID_PUBLIC_NODE_ROUTE_INDEX_V1"],
  ["/public-node/route-manifest.json", "VOID_PUBLIC_NODE_ROUTE_MANIFEST_V1"],
  ["/public-node/self-check-snapshot.json", "VOID_PUBLIC_NODE_SELF_CHECK_SNAPSHOT_V1"],
  ["/public-node/share-link.json", "VOID_PUBLIC_NODE_SHARE_LINK_V1"],
  ["/public-node/tester-bundle.json", "VOID_PUBLIC_NODE_TESTER_BUNDLE_V1"],
  ["/public-node/outside-tester-smoke.json", "VOID_PUBLIC_NODE_OUTSIDE_TESTER_SMOKE_SURFACE_V1"],
  ["/proofs", "VOID_PUBLIC_PROOFS_INDEX_V1"],
]);

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
  if (typeof raw !== "string" || !/^(?:0|[1-9][0-9]*)$/u.test(raw)) {
    throw new Error(
      `${label} must be a canonical unsigned decimal integer from ${minimum} to ${maximum}`,
    );
  }
  const value = Number(raw);
  if (
    !Number.isSafeInteger(value) ||
    value < minimum ||
    value > maximum
  ) {
    throw new Error(
      `${label} must be a canonical unsigned decimal integer from ${minimum} to ${maximum}`,
    );
  }
  return value;
}

function exactNonNegativeSafeInteger(value) {
  return (
    typeof value === "number" &&
    Number.isSafeInteger(value) &&
    value >= 0
  )
    ? value
    : null;
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
  if (value.protocol === "http:") {
    const hostClass = classifyHost(value.hostname);
    if (![
      "loopback",
      "private_or_overlay_ipv4",
      "private_or_linklocal_ipv6",
    ].includes(hostClass)) {
      throw new Error("public IP and DNS names require https");
    }
  }
  value.pathname = "/";
  return value;
}

function classifyHost(hostname) {
  const lower = hostname.toLowerCase();
  if (lower === "localhost") return "loopback";
  const literal =
    lower.startsWith("[") && lower.endsWith("]")
      ? lower.slice(1, -1)
      : lower;
  const family = net.isIP(literal);
  if (family === 4) {
    const parts = literal.split(".").map(Number);
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
    if (literal === "::1") return "loopback";
    return /^(fc|fd|fe8|fe9|fea|feb)/i.test(literal)
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

function collectStrings(value, output = []) {
  if (typeof value === "string") output.push(value);
  else if (Array.isArray(value)) {
    for (const child of value.slice(0, 10_000)) collectStrings(child, output);
  } else if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      output.push(key);
      collectStrings(child, output);
    }
  }
  return output;
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

function collectRouteStrings(value) {
  const routes = [];
  for (const item of collectStrings(value)) {
    const route = routePathFromString(item);
    if (route) routes.push(route);
  }
  return [...new Set(routes)];
}

function containsMarker(value, marker) {
  return collectStrings(value).includes(marker);
}

function findKeyValues(value, wanted, output = []) {
  if (Array.isArray(value)) {
    for (const child of value) findKeyValues(child, wanted, output);
  } else if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      if (key === wanted) output.push(child);
      findKeyValues(child, wanted, output);
    }
  }
  return output;
}

function sensitiveRoutes(routes) {
  return routes.filter((route) =>
    SENSITIVE_NAMESPACES.some(
      (prefix) =>
        route === prefix ||
        route.startsWith(prefix) ||
        (prefix.endsWith("/") && route === prefix.slice(0, -1)),
    ),
  );
}

function plainRecord(value) {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}

function canonicalRoutePath(value) {
  if (typeof value !== "string" || !value.startsWith("/")) return null;
  try {
    const parsed = new URL(value, "http://void.invalid");
    if (
      parsed.origin !== "http://void.invalid" ||
      parsed.username ||
      parsed.password ||
      parsed.search ||
      parsed.hash ||
      parsed.pathname !== value
    ) {
      return null;
    }
    return value;
  } catch {
    return null;
  }
}

function exactReadOnlyPolicy(value, { publicPostEndpoint = undefined } = {}) {
  if (!plainRecord(value)) return false;
  const expected = {
    public_routes_only: true,
    private_api: false,
    mutation: false,
    read_only: true,
    money_movement: false,
    wallet_send: false,
    wc_to_void_swap: false,
    buy_void_fulfillment: false,
    validator_mutation: false,
  };
  for (const [key, wanted] of Object.entries(expected)) {
    if (value[key] !== wanted) return false;
  }
  if (
    publicPostEndpoint !== undefined &&
    value.public_post_endpoint !== publicPostEndpoint
  ) {
    return false;
  }
  return true;
}

function exactEffectiveBase(value, base) {
  if (typeof value !== "string") return false;
  try {
    const parsed = new URL(value);
    return (
      ["http:", "https:"].includes(parsed.protocol) &&
      parsed.href === base.href &&
      !parsed.username &&
      !parsed.password &&
      !parsed.search &&
      !parsed.hash
    );
  } catch {
    return false;
  }
}

function inspectPublicLinks(value, base, requiredRoutes = []) {
  const result = {
    ok: false,
    routes: [],
    absoluteUrlCount: 0,
  };
  if (!plainRecord(value)) return result;

  const routes = [];
  for (const link of Object.values(value)) {
    if (typeof link !== "string") return result;
    let parsed;
    try {
      parsed = new URL(link);
    } catch {
      return result;
    }
    if (
      !["http:", "https:"].includes(parsed.protocol) ||
      parsed.origin !== base.origin ||
      parsed.username ||
      parsed.password ||
      parsed.search ||
      parsed.hash
    ) {
      return result;
    }
    const route = canonicalRoutePath(parsed.pathname);
    if (route === null || sensitiveRoutes([route]).length !== 0) return result;
    routes.push(route);
  }

  const uniqueRoutes = [...new Set(routes)];
  result.routes = uniqueRoutes;
  result.absoluteUrlCount = Object.keys(value).length;
  result.ok = requiredRoutes.every((route) => uniqueRoutes.includes(route));
  return result;
}

function inspectRouteIndexRows(value) {
  const result = { ok: false, routes: [] };
  if (!Array.isArray(value)) return result;
  const routes = [];
  for (const row of value) {
    const route = canonicalRoutePath(row?.path);
    const requiredMarker =
      route === null ? undefined : REQUIRED_PUBLIC_ROUTE_MARKERS.get(route);
    if (
      !plainRecord(row) ||
      route === null ||
      typeof row.marker !== "string" ||
      row.marker.length === 0 ||
      (requiredMarker !== undefined && row.marker !== requiredMarker) ||
      typeof row.purpose !== "string" ||
      row.purpose.length === 0
    ) {
      return result;
    }
    routes.push(route);
  }
  result.routes = [...new Set(routes)];
  result.ok = result.routes.length === value.length;
  return result;
}

function inspectRouteManifestRows(value) {
  const result = { ok: false, routes: [] };
  if (!Array.isArray(value)) return result;
  const routes = [];
  for (const row of value) {
    const route = canonicalRoutePath(row?.path);
    const requiredMarker =
      route === null ? undefined : REQUIRED_PUBLIC_ROUTE_MARKERS.get(route);
    if (
      !plainRecord(row) ||
      route === null ||
      typeof row.marker !== "string" ||
      row.marker.length === 0 ||
      (requiredMarker !== undefined && row.marker !== requiredMarker) ||
      row.safety_class !== "public_read_only" ||
      typeof row.purpose !== "string" ||
      row.purpose.length === 0
    ) {
      return result;
    }
    routes.push(route);
  }
  result.routes = [...new Set(routes)];
  result.ok = result.routes.length === value.length;
  return result;
}

function peerArrayCount(value) {
  if (!Array.isArray(value)) return null;
  for (const entry of value) {
    if (
      !entry ||
      typeof entry !== "object" ||
      Array.isArray(entry) ||
      typeof entry.id !== "string" ||
      entry.id.length === 0
    ) {
      return null;
    }
  }
  return value.length;
}

function parsePeerCount(value) {
  if (Array.isArray(value)) return peerArrayCount(value);
  if (!value || typeof value !== "object") return null;
  if (
    Object.prototype.hasOwnProperty.call(value, "ok") &&
    value.ok !== true
  ) {
    return null;
  }
  for (const key of ["peers", "connected", "items", "nodes"]) {
    if (Object.prototype.hasOwnProperty.call(value, key)) {
      return peerArrayCount(value[key]);
    }
  }
  for (const key of ["peer_count", "peerCount", "count", "connected_count"]) {
    if (Object.prototype.hasOwnProperty.call(value, key)) {
      return exactNonNegativeSafeInteger(value[key]);
    }
  }
  return null;
}

async function boundedCancel(target, reason) {
  if (!target || typeof target.cancel !== "function") return;
  try {
    await Promise.race([
      Promise.resolve(target.cancel(reason)).catch(() => undefined),
      new Promise((resolve) => setTimeout(resolve, 250)),
    ]);
  } catch {
    // Cleanup failure must not replace the primary response-admission failure.
  }
}

async function readReaderWithSignal(reader, signal) {
  if (signal?.aborted) {
    const error = new Error("request aborted");
    error.name = "AbortError";
    throw error;
  }
  return await new Promise((resolve, reject) => {
    let settled = false;
    const finish = (callback, value) => {
      if (settled) return;
      settled = true;
      signal?.removeEventListener("abort", onAbort);
      callback(value);
    };
    const onAbort = () => {
      const error = new Error("request aborted");
      error.name = "AbortError";
      finish(reject, error);
    };
    signal?.addEventListener("abort", onAbort, { once: true });
    Promise.resolve()
      .then(() => reader.read())
      .then(
        (value) => finish(resolve, value),
        (error) => finish(reject, error),
      );
  });
}

async function readBoundedResponseBytes(response, signal) {
  const declared = response.headers.get("content-length");
  if (declared !== null) {
    if (!/^(?:0|[1-9][0-9]*)$/u.test(declared)) {
      await boundedCancel(response.body, "invalid_content_length");
      throw new Error("invalid_content_length");
    }
    let declaredBytes;
    try {
      declaredBytes = BigInt(declared);
    } catch {
      await boundedCancel(response.body, "invalid_content_length");
      throw new Error("invalid_content_length");
    }
    if (declaredBytes > BigInt(MAX_RESPONSE_BYTES)) {
      await boundedCancel(response.body, "response_too_large");
      throw new Error("response_too_large");
    }
  }

  if (!response.body || typeof response.body.getReader !== "function") {
    throw new Error("response_body_unavailable");
  }
  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;
  try {
    while (true) {
      let read;
      try {
        read = await readReaderWithSignal(reader, signal);
      } catch (error) {
        if (error?.name === "AbortError") {
          await boundedCancel(reader, "timeout");
          throw error;
        }
        await boundedCancel(reader, "response_body_read_failed");
        throw new Error("response_body_read_failed");
      }
      const { done, value } = read;
      if (done) break;
      if (!(value instanceof Uint8Array)) {
        await boundedCancel(reader, "invalid_response_chunk");
        throw new Error("invalid_response_chunk");
      }
      total += value.byteLength;
      if (total > MAX_RESPONSE_BYTES) {
        await boundedCancel(reader, "response_too_large");
        throw new Error("response_too_large");
      }
      chunks.push(value);
    }
  } finally {
    try {
      reader.releaseLock();
    } catch {
      // Reader cleanup never upgrades invalid evidence.
    }
  }
  const bytes = Buffer.allocUnsafe(total);
  let offset = 0;
  for (const chunk of chunks) {
    Buffer.from(chunk).copy(bytes, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

async function fetchJson(base, pathname, timeoutMs) {
  const url = new URL(pathname, base);
  const requestedUrl = url.href;
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

    const finalUrl = new URL(response.url).href;
    if (
      response.redirected ||
      finalUrl !== requestedUrl ||
      (response.status >= 300 && response.status < 400)
    ) {
      await boundedCancel(response.body, "response_provenance_mismatch");
      return {
        ok: false,
        statusCode: response.status,
        error: "response_provenance_mismatch",
        json: null,
      };
    }

    const body = await readBoundedResponseBytes(response, controller.signal);
    let text;
    try {
      text = new TextDecoder("utf-8", { fatal: true }).decode(body);
    } catch {
      return {
        ok: false,
        statusCode: response.status,
        error: "invalid_utf8",
        json: null,
      };
    }

    let json = null;
    let parseError = "";
    try {
      json = JSON.parse(text);
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
    const known = new Set([
      "invalid_content_length",
      "response_too_large",
      "response_body_unavailable",
      "response_body_read_failed",
      "invalid_response_chunk",
    ]);
    const message = error instanceof Error ? error.message : "";
    return {
      ok: false,
      statusCode: 0,
      error:
        error?.name === "AbortError"
          ? "timeout"
          : known.has(message)
            ? message
            : "request_failed",
      json: null,
    };
  } finally {
    clearTimeout(timer);
    controller.abort();
  }
}

function check(id, pathValue, ok, reason, observed = {}) {
  return {
    id,
    path: pathValue,
    ok: Boolean(ok),
    reason: ok ? null : reason,
    observed,
  };
}

function publishReceiptCreateOnly(rawPath, encoded) {
  const output = path.resolve(rawPath);
  const parent = path.dirname(output);
  if (!fs.existsSync(parent)) {
    throw new Error("output parent directory must already exist");
  }
  const parentStat = fs.lstatSync(parent);
  if (!parentStat.isDirectory() || parentStat.isSymbolicLink()) {
    throw new Error("output parent must be a real directory");
  }
  if (fs.realpathSync(parent) !== parent) {
    throw new Error("output parent path must not traverse symlinks");
  }
  if (fs.existsSync(output)) {
    throw new Error("output receipt already exists");
  }

  const flags =
    fs.constants.O_WRONLY |
    fs.constants.O_CREAT |
    fs.constants.O_EXCL |
    (fs.constants.O_NOFOLLOW ?? 0);
  const descriptor = fs.openSync(output, flags, 0o600);
  try {
    fs.fchmodSync(descriptor, 0o600);
    fs.writeFileSync(descriptor, encoded, "utf8");
    fs.fsyncSync(descriptor);
  } finally {
    fs.closeSync(descriptor);
  }

  const parentDescriptor = fs.openSync(parent, "r");
  try {
    fs.fsyncSync(parentDescriptor);
  } finally {
    fs.closeSync(parentDescriptor);
  }

  const finalStat = fs.lstatSync(output);
  if (!finalStat.isFile() || finalStat.isSymbolicLink()) {
    throw new Error("published receipt is not a regular file");
  }
  if ((finalStat.mode & 0o777) !== 0o600) {
    throw new Error("published receipt mode is not 0600");
  }
  if (fs.readFileSync(output, "utf8") !== encoded) {
    throw new Error("published receipt readback mismatch");
  }
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
      http_port: Number.isInteger(healthValue?.http) ? healthValue.http : null,
      p2p_port: Number.isInteger(healthValue?.p2p) ? healthValue.p2p : null,
      peer_count: healthPeers,
    }),
  );

  const ready = await fetchJson(base, "/__void/ready.json", args.timeoutMs);
  const readyValue = ready.json;
  const readyGap = exactNonNegativeSafeInteger(readyValue?.gap);
  const readyTxrootLive =
    exactNonNegativeSafeInteger(readyValue?.txroot_live);
  const readinessOk =
    ready.ok &&
    readyValue?.ready === true &&
    readyGap === 0 &&
    readyTxrootLive === 1 &&
    Array.isArray(readyValue?.reasons) &&
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
        head: Number.isInteger(readyValue?.head) ? readyValue.head : null,
        lastmile_seen: Number.isInteger(readyValue?.lastmile_seen)
          ? readyValue.lastmile_seen
          : null,
        gap: readyGap,
        txroot_live: readyTxrootLive,
        reason_count: Array.isArray(readyValue?.reasons) ? readyValue.reasons.length : null,
      },
    ),
  );

  const head = await fetchJson(base, "/blocks/latest/number2.json", args.timeoutMs);
  const headNumber = exactNonNegativeSafeInteger(head.json?.number);
  const headOk =
    head.ok &&
    headNumber !== null &&
    (!Number.isInteger(readyValue?.head) || headNumber === readyValue.head) &&
    (!Number.isInteger(readyValue?.lastmile_seen) || headNumber === readyValue.lastmile_seen);
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
  const peersOk =
    peers.ok &&
    peers.json?.ok !== false &&
    Number.isInteger(peerCount) &&
    peerCount >= args.expectedPeerCount;
  checks.push(
    check(
      "peer_visibility",
      peersPath,
      peersOk,
      peers.error || "peer_count_below_expected",
      {
        status_code: peers.statusCode,
        peer_count: Number.isInteger(peerCount) ? peerCount : null,
        expected_minimum: args.expectedPeerCount,
      },
    ),
  );

  const wellKnown = await fetchJson(
    base,
    "/.well-known/void-public-node.json",
    args.timeoutMs,
  );
  const wellKnownValue = wellKnown.json;
  const wellKnownLinks = inspectPublicLinks(
    wellKnownValue?.links,
    base,
    REQUIRED_WELL_KNOWN_ROUTES,
  );
  const wellKnownRoutes = wellKnownLinks.routes;
  const wellKnownMissing = REQUIRED_WELL_KNOWN_ROUTES.filter(
    (route) => !wellKnownRoutes.includes(route),
  );
  const wellKnownPolicy = wellKnownValue?.policy;
  const wellKnownOk =
    wellKnown.ok &&
    plainRecord(wellKnownValue) &&
    wellKnownValue.marker === "VOID_PUBLIC_NODE_AGENT_DISCOVERY_V1" &&
    wellKnownValue.purpose === "well_known_public_node_agent_discovery" &&
    wellKnownValue.protocol === "void-public-node-discovery-v1" &&
    wellKnownValue.status === "public_node_agent_discovery_ready" &&
    exactEffectiveBase(wellKnownValue.effective_base_url, base) &&
    wellKnownLinks.ok &&
    exactReadOnlyPolicy(wellKnownPolicy);
  checks.push(
    check(
      "well_known_discovery",
      "/.well-known/void-public-node.json",
      wellKnownOk,
      wellKnown.error || "well_known_discovery_contract_mismatch",
      {
        status_code: wellKnown.statusCode,
        marker_present:
          wellKnownValue?.marker === "VOID_PUBLIC_NODE_AGENT_DISCOVERY_V1",
        public_route_pointer_count: wellKnownRoutes.filter((route) =>
          route.startsWith("/public-node"),
        ).length,
        required_pointer_count: REQUIRED_WELL_KNOWN_ROUTES.length,
        missing_pointer_count: wellKnownMissing.length,
        absolute_url_pointer_count: wellKnownLinks.absoluteUrlCount,
        public_routes_only: wellKnownPolicy?.public_routes_only === true,
        read_only: wellKnownPolicy?.read_only === true,
        mutation_false: wellKnownPolicy?.mutation === false,
      },
    ),
  );

  const routeIndex = await fetchJson(base, "/public-node/route-index.json", args.timeoutMs);
  const routeIndexValue = routeIndex.json;
  const routeIndexRows = inspectRouteIndexRows(routeIndexValue?.routes);
  const indexRoutes = routeIndexRows.routes;
  const indexSensitive = sensitiveRoutes(indexRoutes);
  const routeIndexOk =
    routeIndex.ok &&
    plainRecord(routeIndexValue) &&
    routeIndexValue.marker === "VOID_PUBLIC_NODE_ROUTE_INDEX_V1" &&
    routeIndexValue.purpose === "public_node_route_index" &&
    routeIndexRows.ok &&
    REQUIRED_PUBLIC_ROUTES.every((route) => indexRoutes.includes(route)) &&
    indexSensitive.length === 0 &&
    exactReadOnlyPolicy(routeIndexValue.policy);
  checks.push(
    check(
      "route_index",
      "/public-node/route-index.json",
      routeIndexOk,
      routeIndex.error || "route_index_contract_mismatch",
      {
        status_code: routeIndex.statusCode,
        marker_present:
          routeIndexValue?.marker === "VOID_PUBLIC_NODE_ROUTE_INDEX_V1",
        route_count: indexRoutes.length,
        sensitive_route_count: indexSensitive.length,
      },
    ),
  );

  const routeManifest = await fetchJson(
    base,
    "/public-node/route-manifest.json",
    args.timeoutMs,
  );
  const routeManifestValue = routeManifest.json;
  const routeManifestRows = inspectRouteManifestRows(routeManifestValue?.routes);
  const manifestRoutes = routeManifestRows.routes;
  const manifestMissing = REQUIRED_PUBLIC_ROUTES.filter(
    (route) => !manifestRoutes.includes(route),
  );
  const manifestSensitive = sensitiveRoutes(manifestRoutes);
  const routeManifestOk =
    routeManifest.ok &&
    plainRecord(routeManifestValue) &&
    routeManifestValue.marker === "VOID_PUBLIC_NODE_ROUTE_MANIFEST_V1" &&
    routeManifestValue.purpose === "canonical_public_node_route_manifest" &&
    routeManifestValue.status === "public_node_route_manifest_ready" &&
    exactEffectiveBase(routeManifestValue.effective_base_url, base) &&
    exactNonNegativeSafeInteger(routeManifestValue.route_count) ===
      routeManifestRows.routes.length &&
    routeManifestRows.ok &&
    manifestMissing.length === 0 &&
    manifestSensitive.length === 0 &&
    exactReadOnlyPolicy(routeManifestValue.policy);
  checks.push(
    check(
      "route_manifest",
      "/public-node/route-manifest.json",
      routeManifestOk,
      routeManifest.error || "route_manifest_contract_mismatch",
      {
        status_code: routeManifest.statusCode,
        marker_present:
          routeManifestValue?.marker === "VOID_PUBLIC_NODE_ROUTE_MANIFEST_V1",
        required_route_count: REQUIRED_PUBLIC_ROUTES.length,
        missing_route_count: manifestMissing.length,
        sensitive_route_count: manifestSensitive.length,
      },
    ),
  );

  const snapshot = await fetchJson(
    base,
    "/public-node/self-check-snapshot.json",
    args.timeoutMs,
  );
  const snapshotValue = snapshot.json;
  const snapshotRoutes = Array.isArray(snapshotValue?.expected_routes)
    ? snapshotValue.expected_routes.map(canonicalRoutePath)
    : [];
  const snapshotRoutesValid =
    Array.isArray(snapshotValue?.expected_routes) &&
    snapshotRoutes.every((route) => route !== null) &&
    new Set(snapshotRoutes).size === snapshotRoutes.length;
  const snapshotMissing = REQUIRED_PUBLIC_ROUTES.filter(
    (route) => !snapshotRoutes.includes(route),
  );
  const snapshotSensitive = sensitiveRoutes(snapshotRoutes.filter(Boolean));
  const snapshotLinks = inspectPublicLinks(
    snapshotValue?.links,
    base,
    [
      "/.well-known/void-public-node.json",
      "/public-node",
      "/public-node/route-manifest.json",
      "/proofs",
    ],
  );
  const snapshotChecks = snapshotValue?.checks;
  const snapshotChecksOk =
    plainRecord(snapshotChecks) &&
    [
      "self_check_snapshot",
      "agent_discovery_present",
      "route_index_present",
      "route_manifest_present",
      "outside_tester_smoke_surface_present",
      "externally_testable",
    ].every((key) => snapshotChecks[key] === true);
  const snapshotOk =
    snapshot.ok &&
    plainRecord(snapshotValue) &&
    snapshotValue.marker === "VOID_PUBLIC_NODE_SELF_CHECK_SNAPSHOT_V1" &&
    snapshotValue.purpose === "public_node_self_check_snapshot" &&
    snapshotValue.status ===
      "public_node_externally_testable_read_only_surface_ready" &&
    exactEffectiveBase(snapshotValue.effective_base_url, base) &&
    snapshotRoutesValid &&
    exactNonNegativeSafeInteger(snapshotValue.expected_route_count) ===
      snapshotRoutes.length &&
    snapshotMissing.length === 0 &&
    snapshotSensitive.length === 0 &&
    snapshotLinks.ok &&
    snapshotChecksOk &&
    exactReadOnlyPolicy(snapshotValue.policy, { publicPostEndpoint: false });
  checks.push(
    check(
      "self_check_snapshot",
      "/public-node/self-check-snapshot.json",
      snapshotOk,
      snapshot.error || "self_check_snapshot_contract_mismatch",
      {
        status_code: snapshot.statusCode,
        marker_present:
          snapshotValue?.marker === "VOID_PUBLIC_NODE_SELF_CHECK_SNAPSHOT_V1",
        required_route_count: REQUIRED_PUBLIC_ROUTES.length,
        missing_route_count: snapshotMissing.length,
        sensitive_route_count: snapshotSensitive.length,
        public_post_endpoint_false:
          snapshotValue?.policy?.public_post_endpoint === false,
      },
    ),
  );

  const discoveryAlignmentOk =
    routeIndexOk &&
    routeManifestOk &&
    snapshotOk &&
    REQUIRED_PUBLIC_ROUTES.every(
      (route) => manifestRoutes.includes(route) && snapshotRoutes.includes(route),
    );
  checks.push(
    check(
      "public_discovery_alignment",
      "route-index + route-manifest + self-check-snapshot",
      discoveryAlignmentOk,
      "public_discovery_surfaces_not_aligned",
      {
        required_routes_aligned: discoveryAlignmentOk,
      },
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
      http_port: Number.isInteger(healthValue?.http) ? healthValue.http : null,
      p2p_port: Number.isInteger(healthValue?.p2p) ? healthValue.p2p : null,
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
    publishReceiptCreateOnly(args.output, encoded);
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
