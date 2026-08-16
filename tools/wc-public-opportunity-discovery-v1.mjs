#!/usr/bin/env node

import { parseArgs } from "node:util";
import { readBoundedTextOwned } from "./wc-public-response-teardown-v1.mjs";

const MARKER = "VOID_WC_PUBLIC_OPPORTUNITY_DISCOVERY_V1";
const PILOT_MARKER = "VOID_WC_PUBLIC_EARNING_PILOT_V1";
const DEFAULT_TIMEOUT_MS = 5000;
const DEFAULT_EXPECTED_AWARD_WC = 3;
const MAX_RESPONSE_BYTES = 64 * 1024;

function fail(message, details = {}) {
  process.stdout.write(JSON.stringify({
    marker: MARKER,
    status: "hold",
    opportunity_state: "unavailable",
    reason: message,
    ...details,
    safety: {
      read_only: true,
      http_methods_used: ["GET"],
      mutation_attempted: false,
      ticket_issuance_attempted: false,
      receipt_submission_attempted: false,
      wc_award_attempted: false,
    },
  }, null, 2) + "\n");
  process.exitCode = 2;
}

function safeNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function strictEvidenceNumber(value) {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : null;
}

function asObject(value) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value
    : null;
}

function walk(value, visitor, path = []) {
  visitor(value, path);
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) walk(value[index], visitor, [...path, String(index)]);
    return;
  }
  const object = asObject(value);
  if (!object) return;
  for (const [key, child] of Object.entries(object)) walk(child, visitor, [...path, key]);
}

function findObjectByMarker(value, predicate) {
  let found = null;
  walk(value, (candidate) => {
    if (found) return;
    const object = asObject(candidate);
    const marker = typeof object?.marker === "string" ? object.marker : "";
    if (object && predicate(marker, object)) found = object;
  });
  return found;
}

function findFirstScalar(value, wantedKeys, type) {
  const normalized = new Set(wantedKeys.map((key) => key.toLowerCase()));
  let found;
  walk(value, (candidate, path) => {
    if (found !== undefined || path.length === 0) return;
    const last = path[path.length - 1]?.toLowerCase();
    if (!last || !normalized.has(last)) return;
    if (type === "number") {
      const number = strictEvidenceNumber(candidate);
      if (number !== null) found = number;
      return;
    }
    if (typeof candidate === type) found = candidate;
  });
  return found;
}

function normalizeHttpHostname(hostname) {
  const host = String(hostname || "").trim().toLowerCase();
  return host.startsWith("[") && host.endsWith("]")
    ? host.slice(1, -1)
    : host;
}

function isPrivateHttpHost(hostname) {
  const host = normalizeHttpHostname(hostname);
  if (host === "localhost" || host === "127.0.0.1" || host === "::1") return true;
  if (host.endsWith(".ts.net")) return true;
  const match = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/u.exec(host);
  if (!match) return false;
  const octets = match.slice(1).map(Number);
  if (octets.some((value) => value < 0 || value > 255)) return false;
  if (octets[0] === 10 || octets[0] === 127) return true;
  if (octets[0] === 192 && octets[1] === 168) return true;
  if (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) return true;
  if (octets[0] === 100 && octets[1] >= 64 && octets[1] <= 127) return true;
  return false;
}

function sanitizeBase(raw) {
  let parsed;
  try { parsed = new URL(raw); } catch { throw new Error("base must be an absolute HTTP(S) URL"); }
  const publicHttps = parsed.protocol === "https:";
  const reviewedPrivateHttp = parsed.protocol === "http:" && isPrivateHttpHost(parsed.hostname);
  if (!publicHttps && !reviewedPrivateHttp) {
    throw new Error("base must use public HTTPS or reviewed private/dev HTTP");
  }
  if (parsed.username || parsed.password) throw new Error("base must not contain credentials");
  return parsed.origin;
}

function normalizePath(raw, origin) {
  if (typeof raw !== "string" || raw.length === 0) return null;
  let parsed;
  try { parsed = new URL(raw, origin); } catch { return null; }
  if (parsed.origin !== origin || parsed.username || parsed.password) return null;
  const lower = `${parsed.pathname}${parsed.search}`.toLowerCase();
  const relevant = /(earn|work[-_]?credit|wc[-_/]|opportunit|gateway)/u.test(lower);
  const readSurface = /(status|gateway|discover|opportunit|public|read|index|earn)/u.test(lower);
  const forbidden = /(award|credit-account|settle|execute|submit|accept|issue|write|mutat|fulfill|activate|private|admin)/u.test(lower);
  const claimWithoutStatus = /claim/u.test(lower) && !/status|gateway|discover|opportunit/u.test(lower);
  if (!relevant || !readSurface || forbidden || claimWithoutStatus) return null;
  return `${parsed.pathname}${parsed.search}`;
}

function collectDiscoveryPaths(value, origin) {
  const paths = new Set();
  walk(value, (candidate) => {
    if (typeof candidate !== "string") return;
    const normalized = normalizePath(candidate, origin);
    if (normalized) paths.add(normalized);
  });
  return [...paths];
}

function findClaimPath(value, origin) {
  let found = null;
  walk(value, (candidate, path) => {
    if (found || typeof candidate !== "string") return;
    const key = path[path.length - 1]?.toLowerCase() ?? "";
    if (!/(claim|ticket|intake|request|path|url|route)/u.test(key)) return;
    let parsed;
    try { parsed = new URL(candidate, origin); } catch { return; }
    if (parsed.origin !== origin || !/claim|ticket/u.test(parsed.pathname.toLowerCase())) return;
    found = parsed.pathname;
  });
  return found;
}

async function readBoundedText(response, maximum, abort) {
  return readBoundedTextOwned(response, {
    maximumBytes: maximum,
    abort,
  });
}

async function fetchJson(origin, path, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(new URL(path, origin), {
      method: "GET",
      headers: { accept: "application/json", "user-agent": "void-wc-public-opportunity-discovery-v1" },
      redirect: "error",
      signal: controller.signal,
    });
    const contentType = response.headers.get("content-type") ?? "";
    const text = await readBoundedText(
      response,
      MAX_RESPONSE_BYTES,
      (reason) => {
        if (!controller.signal.aborted) controller.abort(reason);
      },
    );
    let body = null;
    if (contentType.includes("json") || /^[\s]*[{[]/u.test(text)) {
      try { body = JSON.parse(text); } catch { body = null; }
    }
    return { path, status: response.status, ok: response.ok, content_type: contentType.split(";", 1)[0], body };
  } catch (error) {
    return { path, status: null, ok: false, content_type: null, body: null, error: error instanceof Error ? error.message : "request_error" };
  } finally { clearTimeout(timer); }
}

function summarizeAttempt(attempt) {
  const marker = findFirstScalar(attempt.body, ["marker"], "string");
  return { path: attempt.path, http_status: attempt.status, json: attempt.body !== null, marker: marker ?? null, error: attempt.error ?? null };
}

function directBoolean(object, keys) {
  for (const key of keys) {
    if (typeof object?.[key] === "boolean") return object[key];
  }
  return null;
}

function directString(object, keys) {
  for (const key of keys) {
    if (typeof object?.[key] === "string") return object[key];
  }
  return null;
}

function claimRouteNoDirectAward(safety, publicClaim) {
  return (
    directBoolean(safety, ["public_ticket_issue"]) === true &&
    directBoolean(safety, ["public_signed_ticket_claim"]) === true &&
    directBoolean(safety, ["claim_server_selected_work"]) === true &&
    directBoolean(safety, ["participant_selected_award"]) === false &&
    directBoolean(safety, ["submission_response_canonical_accounting"]) === true &&
    directBoolean(publicClaim, ["server_selected_work"]) === true &&
    directBoolean(publicClaim, ["participant_selected_award"]) === false
  );
}

function analyze(body, sourcePath, origin, expectedAwardWc, attempts) {
  const gateway = findObjectByMarker(
    body,
    (marker, object) => /PUBLIC.*EARN.*GATEWAY/u.test(marker) || Boolean(object.public_claim),
  );
  const gatewayPilot = asObject(gateway?.pilot_status);
  const pilot =
    (gatewayPilot?.marker === PILOT_MARKER ? gatewayPilot : null) ??
    findObjectByMarker(body, (marker) => marker === PILOT_MARKER);
  const publicClaim =
    asObject(gateway?.public_claim) ??
    asObject(pilot?.public_claim) ??
    null;
  if (!pilot && !gateway && !publicClaim) return null;

  const safety = asObject(gateway?.safety) ?? asObject(pilot?.safety);

  const coordinatorEnabled =
    typeof pilot?.coordinator_enabled === "boolean"
      ? pilot.coordinator_enabled
      : null;
  const executorEnabled =
    typeof pilot?.executor_enabled === "boolean"
      ? pilot.executor_enabled
      : null;

  const pilotAwardWc = strictEvidenceNumber(pilot?.fixed_award_wc);
  const claimAwardWc = strictEvidenceNumber(publicClaim?.fixed_award_wc);
  const awardEvidenceConsistent =
    pilotAwardWc !== null &&
    (claimAwardWc === null || claimAwardWc === pilotAwardWc);
  const fixedAwardWc = awardEvidenceConsistent ? pilotAwardWc : null;

  const claimEnabled = directBoolean(publicClaim, [
    "enabled",
    "available",
    "claim_enabled",
    "claimEnabled",
  ]);
  const claimMethod = directString(publicClaim, [
    "method",
    "http_method",
    "httpMethod",
  ]);
  const claimPath = publicClaim ? findClaimPath(publicClaim, origin) : null;
  const publicClaimRouteNoDirectAward = claimRouteNoDirectAward(safety, publicClaim);

  const gatewayCompatible = Boolean(pilot || gateway || publicClaim);
  const awardMatches = fixedAwardWc !== null && fixedAwardWc === expectedAwardWc;
  const coordinatorReady = coordinatorEnabled === true;
  const claimConfigured = Boolean(publicClaim || claimPath);
  const claimNotDisabled = claimEnabled !== false;
  const publicAwardBoundaryConfirmed = publicClaimRouteNoDirectAward === true;
  const reasons = [];
  if (!pilot) reasons.push("pilot_status_missing");
  if (!coordinatorReady) reasons.push("coordinator_not_enabled");
  if (!awardEvidenceConsistent) reasons.push("fixed_award_evidence_missing_or_conflicting");
  if (!awardMatches) reasons.push("fixed_award_mismatch_or_missing");
  if (!claimConfigured) reasons.push("public_claim_not_discovered");
  if (!claimNotDisabled) reasons.push("public_claim_disabled");
  if (!publicAwardBoundaryConfirmed) reasons.push("public_claim_award_boundary_unconfirmed");
  const opportunityState =
    pilot &&
    coordinatorReady &&
    awardMatches &&
    claimConfigured &&
    claimNotDisabled &&
    publicAwardBoundaryConfirmed
      ? "available"
      : "hold";
  return {
    marker: MARKER,
    status: "green",
    opportunity_state: opportunityState,
    reason: opportunityState === "available" ? "bounded_public_earning_opportunity_available" : reasons.join(","),
    source_path: sourcePath,
    gateway_compatible: gatewayCompatible,
    participant: { node_required: false, public_status_only: true, next_tool: "ops/mainnet0/wc-public-ticket-claim-v1.sh", next_document: "docs/public/wc-public-ticket-claim-v1.md" },
    pilot: { marker: pilot?.marker ?? null, coordinator_enabled: coordinatorEnabled, executor_enabled: executorEnabled, fixed_award_wc: fixedAwardWc, expected_fixed_award_wc: expectedAwardWc, fixed_award_matches: awardMatches },
    public_claim: { configured: claimConfigured, enabled: claimEnabled, method: claimMethod, path: claimPath },
    safety: { read_only: true, http_methods_used: ["GET"], public_claim_route_no_direct_award: publicClaimRouteNoDirectAward, public_award_boundary_confirmed: publicAwardBoundaryConfirmed, public_award_boundary_safe: publicAwardBoundaryConfirmed, mutation_attempted: false, ticket_issuance_attempted: false, receipt_submission_attempted: false, wc_award_attempted: false, wallet_access_attempted: false, settlement_attempted: false },
    attempts: attempts.map(summarizeAttempt),
  };
}

function emitResult(result, requireAvailable) {
  process.stdout.write(JSON.stringify(result, null, 2) + "\n");
  if (requireAvailable && result.opportunity_state !== "available") process.exitCode = 2;
}

async function main() {
  const { values } = parseArgs({
    options: {
      base: { type: "string" },
      path: { type: "string", multiple: true, default: [] },
      "timeout-ms": { type: "string", default: String(DEFAULT_TIMEOUT_MS) },
      "expected-award-wc": { type: "string", default: String(DEFAULT_EXPECTED_AWARD_WC) },
      "require-available": { type: "boolean", default: false },
      help: { type: "boolean", short: "h", default: false },
    }, allowPositionals: false, strict: true,
  });
  if (values.help) {
    process.stdout.write("Usage: node tools/wc-public-opportunity-discovery-v1.mjs --base https://public-node.example [--path /public/earn/status] [--require-available]\n");
    return;
  }
  if (!values.base) throw new Error("--base is required");
  const origin = sanitizeBase(values.base);
  const timeoutMs = safeNumber(values["timeout-ms"]);
  const expectedAwardWc = safeNumber(values["expected-award-wc"]);
  if (!timeoutMs || timeoutMs < 250 || timeoutMs > 30000) throw new Error("--timeout-ms must be between 250 and 30000");
  if (expectedAwardWc === null || expectedAwardWc <= 0) throw new Error("--expected-award-wc must be positive");
  const defaultCandidates = ["/__void/public-earn-gateway-v1/status.json", "/wc/public-earning-pilot-v1/status", "/public-node/public-earn-gateway-v1.json", "/public-node/work-credits/public-earn-status-v1.json", "/public-node/earn/status-v1.json", "/public/earn/status-v1", "/public/earn/status", "/wc/public/earning/status", "/wc/public/status"];
  const attempts = [];
  let firstHold = null;
  const discovery = await fetchJson(origin, "/.well-known/void-public-node.json", timeoutMs);
  attempts.push(discovery);
  const candidates = new Set();
  for (const raw of values.path) {
    const normalized = normalizePath(raw, origin);
    if (!normalized) throw new Error(`unsafe or non-read discovery path: ${raw}`);
    candidates.add(normalized);
  }
  if (discovery.ok && discovery.body) {
    for (const path of collectDiscoveryPaths(discovery.body, origin)) candidates.add(path);
    const discoveryAnalysis = analyze(discovery.body, discovery.path, origin, expectedAwardWc, attempts);
    if (discoveryAnalysis?.opportunity_state === "available") {
      emitResult(discoveryAnalysis, values["require-available"]);
      return;
    }
    if (discoveryAnalysis) firstHold = { body: discovery.body, path: discovery.path };
  }
  for (const path of defaultCandidates) candidates.add(path);
  for (const path of candidates) {
    if (path === discovery.path) continue;
    const attempt = await fetchJson(origin, path, timeoutMs);
    attempts.push(attempt);
    if (!attempt.ok || !attempt.body) continue;
    const result = analyze(attempt.body, attempt.path, origin, expectedAwardWc, attempts);
    if (!result) continue;
    if (result.opportunity_state === "available") {
      emitResult(result, values["require-available"]);
      return;
    }
    if (!firstHold) firstHold = { body: attempt.body, path: attempt.path };
  }
  if (firstHold) {
    const result = analyze(firstHold.body, firstHold.path, origin, expectedAwardWc, attempts);
    if (result) {
      emitResult(result, values["require-available"]);
      return;
    }
  }
  fail("compatible public earning gateway not discovered", { base_origin: origin, attempts: attempts.map(summarizeAttempt) });
}

main().catch((error) => { fail(error instanceof Error ? error.message : "unexpected error"); });
