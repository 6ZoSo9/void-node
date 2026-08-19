#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const REVIEW_MARKER = "VOID_PUBLIC_NODE_OPERATOR_SELF_CHECK_RECEIPT_REVIEW_V1";
const RECEIPT_MARKER = "VOID_PUBLIC_NODE_OPERATOR_SELF_CHECK_V1";
const NETWORK = "Mainnet-0";
const MAX_RECEIPT_BYTES = 4 * 1024 * 1024;

const TARGET_HOST_CLASSES = new Set([
  "loopback",
  "private_or_overlay_ipv4",
  "public_ipv4",
  "private_or_linklocal_ipv6",
  "public_ipv6",
  "private_dns",
  "overlay_dns",
  "public_dns",
]);

const HTTP_TARGET_HOST_CLASSES = new Set([
  "loopback",
  "private_or_overlay_ipv4",
  "private_or_linklocal_ipv6",
]);

const EXPECTED_CHECK_IDS = [
  "health",
  "readiness",
  "chain_head",
  "peer_visibility",
  "well_known_discovery",
  "route_index",
  "route_manifest",
  "self_check_snapshot",
  "public_discovery_alignment",
];

const SAFETY_FALSE_FIELDS = [
  "redirects_followed",
  "credentials_sent",
  "mutation_attempted",
  "registration_attempted",
  "validator_activation_attempted",
  "staking_attempted",
  "wallet_connection_attempted",
  "ledger_write_attempted",
  "peer_state_write_attempted",
  "validator_set_write_attempted",
  "ticket_claim_attempted",
  "buy_void_fulfillment_attempted",
];

const BANNED_KEY_TOKENS = new Set([
  "authorization",
  "bearer",
  "credential",
  "credentials",
  "mnemonic",
  "password",
  "privatekey",
  "private_key",
  "rawbody",
  "raw_body",
  "requestbody",
  "request_body",
  "responsebody",
  "response_body",
  "secret",
  "secrets",
  "seedphrase",
  "seed_phrase",
  "token",
  "walletaddress",
  "wallet_address",
]);

function usage() {
  console.log(`VOID public-node operator self-check receipt reviewer v1

Usage:
  node tools/public-node-operator-self-check-receipt-review-v1.mjs [options]

Required:
  --receipt FILE              Receipt produced by the operator self-check

Options:
  --output FILE               Write a mode-0600 review JSON
  --require-green             Return exit 2 for a valid hold receipt
  --reviewed-at ISO8601       Fixed review timestamp for deterministic proofs
  --help                      Show this help

Exit codes:
  0  structurally valid receipt accepted
  1  invocation or unexpected execution error
  2  valid hold receipt rejected by --require-green
  3  malformed, inconsistent, unsafe, or tampered receipt

This reviewer is offline. It performs no network requests and no mutation.`);
}

function parseArgs(argv) {
  const result = {
    receipt: "",
    output: "",
    requireGreen: false,
    reviewedAt: "",
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = () => {
      index += 1;
      if (index >= argv.length) throw new Error(`missing value for ${arg}`);
      return argv[index];
    };

    if (arg === "--receipt") result.receipt = next();
    else if (arg === "--output") result.output = next();
    else if (arg === "--require-green") result.requireGreen = true;
    else if (arg === "--reviewed-at") result.reviewedAt = next();
    else if (arg === "--help" || arg === "-h") {
      usage();
      process.exit(0);
    } else {
      throw new Error(`unknown argument: ${arg}`);
    }
  }

  if (!result.receipt) throw new Error("--receipt is required");
  return result;
}

function isObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function exactKeys(value, expected) {
  if (!isObject(value)) return false;
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  return actual.length === wanted.length && actual.every((item, index) => item === wanted[index]);
}

function safeIso(raw, label) {
  if (typeof raw !== "string" || !raw.trim()) throw new Error(`${label} is required`);
  const parsed = new Date(raw);
  if (!Number.isFinite(parsed.getTime())) throw new Error(`${label} must be valid ISO-8601`);
  return parsed.toISOString();
}

function normalizeKey(raw) {
  return String(raw).toLowerCase().replace(/[^a-z0-9_]+/g, "");
}

function collectUnsafeFindings(value, pathValue = "$", output = []) {
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      collectUnsafeFindings(value[index], `${pathValue}[${index}]`, output);
    }
    return output;
  }

  if (isObject(value)) {
    for (const [key, child] of Object.entries(value)) {
      const normalized = normalizeKey(key);
      if (BANNED_KEY_TOKENS.has(normalized)) {
        output.push(`${pathValue}.${key}:banned_key`);
      }
      collectUnsafeFindings(child, `${pathValue}.${key}`, output);
    }
    return output;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (/^(?:https?|ssh|file|tailscale):\/\//i.test(trimmed)) {
      output.push(`${pathValue}:absolute_url`);
    }
    if (/-----BEGIN (?:OPENSSH|RSA|EC|PRIVATE) KEY-----/.test(trimmed)) {
      output.push(`${pathValue}:private_key_material`);
    }
    if (/\bBearer\s+[A-Za-z0-9._~-]{12,}\b/i.test(trimmed)) {
      output.push(`${pathValue}:bearer_material`);
    }
  }
  return output;
}

function pushCheck(checks, id, ok, detail) {
  checks.push({
    id,
    ok: Boolean(ok),
    detail: ok ? null : detail,
  });
}

function readReceipt(file) {
  const resolved = path.resolve(file);
  const stat = fs.statSync(resolved);
  if (!stat.isFile()) throw new Error("receipt must be a regular file");
  if (stat.size <= 0 || stat.size > MAX_RECEIPT_BYTES) {
    throw new Error(`receipt size must be from 1 to ${MAX_RECEIPT_BYTES} bytes`);
  }
  const bytes = fs.readFileSync(resolved);
  let value;
  try {
    value = JSON.parse(bytes.toString("utf8"));
  } catch {
    throw new Error("receipt is not valid JSON");
  }
  if (!isObject(value)) throw new Error("receipt must be a JSON object");
  return {
    bytes,
    value,
    sha256: crypto.createHash("sha256").update(bytes).digest("hex"),
  };
}

function reviewReceipt(receipt) {
  const checks = [];
  const expectedTopKeys = [
    "marker",
    "network",
    "read_only",
    "observed_at",
    "target",
    "summary",
    "runtime",
    "checks",
    "safety",
  ];

  pushCheck(checks, "top_level_shape", exactKeys(receipt, expectedTopKeys), "unexpected top-level fields");
  pushCheck(checks, "marker", receipt.marker === RECEIPT_MARKER, "receipt marker mismatch");
  pushCheck(checks, "network", receipt.network === NETWORK, "network mismatch");
  pushCheck(checks, "read_only", receipt.read_only === true, "read_only must be true");

  let observedAtValid = false;
  try {
    safeIso(receipt.observed_at, "observed_at");
    observedAtValid = true;
  } catch {
    observedAtValid = false;
  }
  pushCheck(checks, "observed_at", observedAtValid, "observed_at invalid");

  const targetScheme = receipt.target?.scheme;
  const targetHostClass = receipt.target?.host_class;
  const targetOk =
    exactKeys(receipt.target, ["scheme", "host_class", "port", "raw_target_included"]) &&
    ["http", "https"].includes(targetScheme) &&
    TARGET_HOST_CLASSES.has(targetHostClass) &&
    (targetScheme === "https" || HTTP_TARGET_HOST_CLASSES.has(targetHostClass)) &&
    Number.isInteger(receipt.target?.port) &&
    receipt.target.port >= 1 &&
    receipt.target.port <= 65535 &&
    receipt.target.raw_target_included === false;
  pushCheck(checks, "target_redaction", targetOk, "target redaction/transport contract mismatch");

  const receiptChecks = Array.isArray(receipt.checks) ? receipt.checks : [];
  const checkIds = receiptChecks.map((entry) => entry?.id);
  const uniqueIds = new Set(checkIds);
  const checkSetOk =
    receiptChecks.length === EXPECTED_CHECK_IDS.length &&
    uniqueIds.size === EXPECTED_CHECK_IDS.length &&
    EXPECTED_CHECK_IDS.every((id) => uniqueIds.has(id));
  pushCheck(checks, "check_set", checkSetOk, "expected check IDs mismatch");

  let checkEntriesOk = true;
  for (const entry of receiptChecks) {
    const ok =
      isObject(entry) &&
      typeof entry.id === "string" &&
      typeof entry.path === "string" &&
      typeof entry.ok === "boolean" &&
      isObject(entry.observed) &&
      ((entry.ok === true && entry.reason === null) ||
        (entry.ok === false && typeof entry.reason === "string" && entry.reason.length > 0));
    if (!ok) {
      checkEntriesOk = false;
      break;
    }
  }
  pushCheck(checks, "check_entries", checkEntriesOk, "check entry contract mismatch");

  const failedEntries = receiptChecks.filter((entry) => entry?.ok === false);
  const greenEntries = receiptChecks.filter((entry) => entry?.ok === true);
  const failedIds = failedEntries.map((entry) => entry.id);
  const summary = receipt.summary;
  const summaryOk =
    exactKeys(summary, [
      "status",
      "checks_total",
      "checks_green",
      "checks_failed",
      "failed_check_ids",
    ]) &&
    ["green", "hold"].includes(summary?.status) &&
    summary.checks_total === receiptChecks.length &&
    summary.checks_green === greenEntries.length &&
    summary.checks_failed === failedEntries.length &&
    Array.isArray(summary.failed_check_ids) &&
    summary.failed_check_ids.length === failedIds.length &&
    summary.failed_check_ids.every((id, index) => id === failedIds[index]) &&
    ((failedIds.length === 0 && summary.status === "green") ||
      (failedIds.length > 0 && summary.status === "hold"));
  pushCheck(checks, "summary_consistency", summaryOk, "summary does not match checks");

  const runtime = receipt.runtime;
  const runtimeShapeOk =
    exactKeys(runtime, [
      "node_id",
      "http_port",
      "p2p_port",
      "chain_head",
      "peer_count",
      "expected_peer_count",
      "ready",
      "gap",
      "txroot_live",
    ]) &&
    typeof runtime?.node_id === "string" &&
    runtime.node_id.length >= 8 &&
    Number.isInteger(runtime.http_port) &&
    Number.isInteger(runtime.p2p_port) &&
    Number.isInteger(runtime.chain_head) &&
    runtime.chain_head >= 0 &&
    Number.isInteger(runtime.peer_count) &&
    runtime.peer_count >= 0 &&
    Number.isInteger(runtime.expected_peer_count) &&
    runtime.expected_peer_count >= 0 &&
    typeof runtime.ready === "boolean" &&
    Number.isFinite(runtime.gap) &&
    Number.isFinite(runtime.txroot_live);
  pushCheck(checks, "runtime_shape", runtimeShapeOk, "runtime contract mismatch");

  const greenRuntimeOk =
    summary?.status !== "green" ||
    (runtime?.ready === true &&
      runtime?.gap === 0 &&
      runtime?.txroot_live === 1 &&
      runtime?.peer_count >= runtime?.expected_peer_count);
  pushCheck(checks, "green_runtime", greenRuntimeOk, "green receipt runtime is not green");

  const safety = receipt.safety;
  const methodsOk =
    Array.isArray(safety?.methods_used) &&
    safety.methods_used.length === 1 &&
    safety.methods_used[0] === "GET";
  const safetyFlagsOk =
    isObject(safety) &&
    SAFETY_FALSE_FIELDS.every((field) => safety[field] === false);
  const expectedSafetyKeys = ["methods_used", ...SAFETY_FALSE_FIELDS];
  pushCheck(
    checks,
    "safety_boundary",
    exactKeys(safety, expectedSafetyKeys) && methodsOk && safetyFlagsOk,
    "safety boundary mismatch",
  );

  const unsafeFindings = collectUnsafeFindings(receipt);
  pushCheck(
    checks,
    "public_sanitization",
    unsafeFindings.length === 0,
    unsafeFindings.slice(0, 16).join(", ") || "unsafe receipt content",
  );

  return {
    checks,
    accepted: checks.every((entry) => entry.ok),
    receiptStatus: summary?.status === "hold" ? "hold" : "green",
  };
}

function writeReview(output, review) {
  const encoded = `${JSON.stringify(review, null, 2)}\n`;
  if (output) {
    const resolved = path.resolve(output);
    fs.mkdirSync(path.dirname(resolved), { recursive: true, mode: 0o700 });
    fs.writeFileSync(resolved, encoded, { encoding: "utf8", mode: 0o600 });
    fs.chmodSync(resolved, 0o600);
  }
  process.stdout.write(encoded);
}

function baseSafety() {
  return {
    network_requests_performed: false,
    mutation_attempted: false,
    receipt_modified: false,
    raw_receipt_path_included: false,
    raw_receipt_body_included: false,
  };
}

function rejectedLoadReview(reviewedAt, requireGreen, detail) {
  return {
    marker: REVIEW_MARKER,
    network: NETWORK,
    reviewed_at: reviewedAt,
    offline: true,
    receipt_sha256: null,
    accepted: false,
    receipt_status: "unknown",
    gate: "rejected",
    require_green: requireGreen,
    summary: {
      checks_total: 1,
      checks_green: 0,
      checks_failed: 1,
      failed_check_ids: ["receipt_load"],
    },
    checks: [
      {
        id: "receipt_load",
        ok: false,
        detail,
      },
    ],
    safety: baseSafety(),
  };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const reviewedAt = safeIso(args.reviewedAt || new Date().toISOString(), "reviewed_at");

  let loaded;
  try {
    loaded = readReceipt(args.receipt);
  } catch (error) {
    const detail = error instanceof Error ? error.message : "receipt load failed";
    writeReview(
      args.output,
      rejectedLoadReview(reviewedAt, args.requireGreen, detail),
    );
    process.exitCode = 3;
    return;
  }

  const result = reviewReceipt(loaded.value);

  const gate =
    !result.accepted
      ? "rejected"
      : args.requireGreen && result.receiptStatus === "hold"
        ? "hold"
        : "passed";

  const review = {
    marker: REVIEW_MARKER,
    network: NETWORK,
    reviewed_at: reviewedAt,
    offline: true,
    receipt_sha256: loaded.sha256,
    accepted: result.accepted,
    receipt_status: result.receiptStatus,
    gate,
    require_green: args.requireGreen,
    summary: {
      checks_total: result.checks.length,
      checks_green: result.checks.filter((entry) => entry.ok).length,
      checks_failed: result.checks.filter((entry) => !entry.ok).length,
      failed_check_ids: result.checks.filter((entry) => !entry.ok).map((entry) => entry.id),
    },
    checks: result.checks,
    safety: baseSafety(),
  };

  writeReview(args.output, review);

  if (!result.accepted) process.exitCode = 3;
  else if (gate === "hold") process.exitCode = 2;
  else process.exitCode = 0;
}

try {
  main();
} catch (error) {
  console.error(
    JSON.stringify(
      {
        marker: REVIEW_MARKER,
        gate: "error",
        offline: true,
        mutation_attempted: false,
        error: error instanceof Error ? error.message : "unknown_error",
      },
      null,
      2,
    ),
  );
  process.exitCode = 1;
}
