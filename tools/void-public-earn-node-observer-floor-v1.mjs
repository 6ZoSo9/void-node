#!/usr/bin/env node
// VOID Community License (VCL) v1.0 — see LICENSE

import crypto from "node:crypto";
import fs from "node:fs";
import { isIP } from "node:net";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

export const MARKER = "VOID_PUBLIC_EARN_NODE_OBSERVER_FLOOR_V1";
export const PROTOCOL = "void-public-earn-node-observer-floor/1";
export const SOURCE_MARKER = "VOID_PARTICIPANT_NODE_OBSERVER_CHECK_V1";
export const DECISION = "GREEN_MINIMUM_PEER_FLOOR_SATISFIED";
export const DEFAULT_EXPECTED_PEER_COUNT = 1;

const MAX_REPORT_BYTES = 2 * 1024 * 1024;

export const AUTHORITY_KEYS = [
  "credential_file_access_authorized",
  "private_key_access_authorized",
  "wallet_or_signer_access_authorized",
  "network_mutation_authorized",
  "coordinator_enablement_authorized",
  "ticket_issuance_authorized",
  "work_credit_write_authorized",
  "settlement_authorized",
  "validator_registration_authorized",
  "validator_waiting_transition_authorized",
  "validator_activation_authorized",
  "service_install_authorized",
  "service_restart_authorized",
  "transaction_construction_authorized",
  "transaction_signing_authorized",
  "transaction_broadcast_authorized",
  "contract_deployment_authorized",
  "fund_movement_authorized",
];

class ObserverFloorError extends Error {
  constructor(code, message = code, details = {}) {
    super(message);
    this.name = "ObserverFloorError";
    this.code = code;
    this.details = details;
  }
}

function fail(code, message = code, details = {}) {
  throw new ObserverFloorError(code, message, details);
}

export function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export function canonicalJson(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  return `{${Object.keys(value)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`)
    .join(",")}}`;
}

function plainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function boundedInteger(raw, minimum, maximum, code) {
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
    fail(code, code, { value: raw, minimum, maximum });
  }
  return value;
}

function timestamp(raw, code) {
  const value = String(raw || "").trim();
  const milliseconds = Date.parse(value);
  if (!value || !Number.isFinite(milliseconds)) fail(code);
  return new Date(milliseconds).toISOString();
}

function nodeId(raw) {
  const value = String(raw || "").trim().toLowerCase().replace(/^0x/, "");
  if (!/^[0-9a-f]{32,64}$/.test(value)) fail("node_id_invalid");
  return value;
}

function safeNodeOrigin(raw) {
  let parsed;
  try {
    parsed = new URL(String(raw || ""));
  } catch {
    fail("node_origin_invalid");
  }
  const hostname = parsed.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  let privateHost =
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1" ||
    hostname.endsWith(".ts.net");
  const family = isIP(hostname);
  if (family === 4) {
    const octets = hostname.split(".").map(Number);
    privateHost = privateHost ||
      octets[0] === 10 ||
      octets[0] === 127 ||
      (octets[0] === 192 && octets[1] === 168) ||
      (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) ||
      (octets[0] === 100 && octets[1] >= 64 && octets[1] <= 127);
  } else if (family === 6) {
    privateHost = privateHost || /^(fc|fd|fe8|fe9|fea|feb)/i.test(hostname);
  }
  if (
    parsed.username ||
    parsed.password ||
    parsed.search ||
    parsed.hash ||
    (parsed.pathname && parsed.pathname !== "/") ||
    (parsed.protocol !== "https:" && !(parsed.protocol === "http:" && privateHost))
  ) {
    fail("node_origin_invalid");
  }
  return parsed.origin;
}

export function countVisiblePeers(body) {
  if (Array.isArray(body)) return body.length;
  if (!plainObject(body)) return null;
  for (const key of ["peers", "connected", "items", "nodes"]) {
    if (Array.isArray(body[key])) return body[key].length;
  }
  for (const key of ["peer_count", "peerCount", "count", "connected_count"]) {
    const value = Number(body[key]);
    if (Number.isSafeInteger(value) && value >= 0) return value;
  }
  return null;
}

function pickNodeId(...bodies) {
  for (const body of bodies) {
    if (!plainObject(body)) continue;
    for (const key of ["nodeId", "node_id", "node", "id"]) {
      const candidate = String(body[key] || "").trim().toLowerCase().replace(/^0x/, "");
      if (/^[0-9a-f]{32,64}$/.test(candidate)) return candidate;
    }
  }
  return "";
}

function successfulGet(entry, code, { allowArrayBody = false } = {}) {
  const validBody = plainObject(entry?.body) ||
    (allowArrayBody && Array.isArray(entry?.body));
  if (
    !plainObject(entry) ||
    entry.ok !== true ||
    Number(entry.status) !== 200 ||
    entry.error !== null ||
    !validBody
  ) {
    fail(code);
  }
  return entry.body;
}

export function validateObserverReport({
  report,
  reportBytes,
  expectedPeerCount = DEFAULT_EXPECTED_PEER_COUNT,
  validatedAt,
}) {
  if (!plainObject(report)) fail("observer_report_invalid");
  if (!Buffer.isBuffer(reportBytes) || reportBytes.length <= 0) {
    fail("observer_report_bytes_invalid");
  }
  let parsedBytes;
  try {
    parsedBytes = JSON.parse(reportBytes.toString("utf8"));
  } catch {
    fail("observer_report_bytes_json_invalid");
  }
  if (canonicalJson(parsedBytes) !== canonicalJson(report)) {
    fail("observer_report_bytes_object_mismatch");
  }

  const floor = boundedInteger(
    expectedPeerCount,
    0,
    10_000,
    "expected_peer_count_invalid",
  );
  const reportFloor = boundedInteger(
    report.expected_peer_count,
    0,
    10_000,
    "reported_expected_peer_count_invalid",
  );
  if (reportFloor !== floor) {
    fail("expected_peer_count_mismatch", undefined, {
      requested: floor,
      reported: reportFloor,
    });
  }

  if (
    report.marker !== SOURCE_MARKER ||
    report.health_reachable !== true ||
    report.health_contract_valid !== true ||
    report.readiness_reachable !== true ||
    report.readiness_contract_valid !== true ||
    report.ready !== true ||
    report.latest_block_reachable !== true ||
    report.latest_block_aligned !== true ||
    report.peer_visibility_valid !== true ||
    report.observer_validation_ready !== true ||
    report.consensus_validator_active !== false ||
    report.consensus_validator_activation_attempted !== false ||
    report.wallet_or_signer_accessed !== false
  ) {
    fail("observer_contract_not_green");
  }

  const origin = safeNodeOrigin(report.node_base);
  const reportedNodeId = nodeId(report.node_id);
  const latestNumber = boundedInteger(
    report.latest_block_number,
    0,
    Number.MAX_SAFE_INTEGER,
    "latest_block_number_invalid",
  );
  const reportedPeerCount = boundedInteger(
    report.peer_count,
    0,
    10_000,
    "peer_count_invalid",
  );
  if (!["/p2p/peers", "/peers"].includes(report.peer_route)) {
    fail("peer_route_invalid");
  }
  if (reportedPeerCount < floor) {
    fail("peer_floor_not_met", undefined, {
      peer_count: reportedPeerCount,
      expected_peer_count: floor,
    });
  }

  if (!plainObject(report.details)) fail("observer_details_invalid");
  const health = successfulGet(report.details.health, "health_evidence_invalid");
  const readiness = successfulGet(
    report.details.readiness,
    "readiness_evidence_invalid",
  );
  const peers = successfulGet(report.details.peers, "peer_evidence_invalid", {
    allowArrayBody: true,
  });
  const latest = successfulGet(report.details.latest, "latest_evidence_invalid");

  const evidencePeerCount = countVisiblePeers(peers);
  if (!Number.isSafeInteger(evidencePeerCount)) fail("peer_evidence_count_invalid");
  if (evidencePeerCount !== reportedPeerCount) {
    fail("peer_count_evidence_mismatch", undefined, {
      reported: reportedPeerCount,
      observed: evidencePeerCount,
    });
  }
  if (evidencePeerCount < floor) fail("peer_floor_not_met");

  const evidenceNodeId = pickNodeId(health, readiness, peers);
  if (!evidenceNodeId || evidenceNodeId !== reportedNodeId) {
    fail("node_id_evidence_mismatch");
  }
  if (
    health.ok !== true ||
    readiness.ready !== true ||
    Number(readiness.gap) !== 0 ||
    Number(readiness.txroot_live) !== 1 ||
    !Array.isArray(readiness.reasons) ||
    readiness.reasons.length !== 0 ||
    Number(latest.number) !== latestNumber ||
    (Number.isSafeInteger(Number(readiness.head)) &&
      Number(readiness.head) !== latestNumber) ||
    (Number.isSafeInteger(Number(readiness.lastmile_seen)) &&
      Number(readiness.lastmile_seen) !== latestNumber)
  ) {
    fail("node_readiness_evidence_mismatch");
  }

  const body = {
    marker: MARKER,
    protocol: PROTOCOL,
    version: 1,
    validated_at_utc: timestamp(validatedAt, "validated_at_invalid"),
    source: {
      marker: SOURCE_MARKER,
      report_sha256: sha256(reportBytes),
      report_bytes: reportBytes.length,
    },
    node: {
      node_base: origin,
      node_id: reportedNodeId,
      latest_block_number: latestNumber,
      peer_route: report.peer_route,
      peer_count: reportedPeerCount,
      expected_peer_count: floor,
      excess_peer_count: reportedPeerCount - floor,
      minimum_peer_floor_semantics: true,
    },
    evidence: {
      health_contract_valid: true,
      readiness_contract_valid: true,
      latest_block_aligned: true,
      peer_visibility_valid: true,
      observer_validation_ready: true,
      connected_array_supported: Array.isArray(peers.connected),
    },
    authority: Object.fromEntries(AUTHORITY_KEYS.map((key) => [key, false])),
    decision: {
      status: DECISION,
      ready: true,
      exact_peer_count_required: false,
      minimum_peer_count_required: true,
      peer_floor_met: true,
      next_gate:
        "evaluate_public_earn_coordinator_and_gateway_readiness_under_separate_authority",
    },
  };
  return {
    validation_id: `voidpenof1_${sha256(canonicalJson(body))}`,
    ...body,
  };
}

function regularFile(file, maximumBytes, code) {
  let stats;
  try {
    stats = fs.lstatSync(file);
  } catch {
    fail(code);
  }
  if (
    !stats.isFile() ||
    stats.isSymbolicLink() ||
    stats.size <= 0 ||
    stats.size > maximumBytes
  ) {
    fail(code);
  }
  return stats;
}

function ensurePrivateDirectory(directory) {
  if (fs.existsSync(directory)) {
    const stats = fs.lstatSync(directory);
    if (!stats.isDirectory() || stats.isSymbolicLink()) {
      fail("output_directory_invalid");
    }
  } else {
    fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
  }
  fs.chmodSync(directory, 0o700);
}

function atomicWriteJson(file, value) {
  const resolved = path.resolve(file);
  ensurePrivateDirectory(path.dirname(resolved));
  if (fs.existsSync(resolved) && fs.lstatSync(resolved).isSymbolicLink()) {
    fail("output_symlink_forbidden");
  }
  const temporary = `${resolved}.tmp-${process.pid}-${crypto.randomBytes(6).toString("hex")}`;
  fs.writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
  fs.chmodSync(temporary, 0o600);
  fs.renameSync(temporary, resolved);
  fs.chmodSync(resolved, 0o600);
}

function parseArgs(argv) {
  const options = {};
  const allowed = new Set(["report", "expected-peer-count", "output"]);
  for (let index = 0; index < argv.length; index += 1) {
    const raw = argv[index];
    if (["-h", "--help"].includes(raw)) {
      if (options.help === true) fail("duplicate_option");
      options.help = true;
      continue;
    }
    if (!raw.startsWith("--")) fail("unexpected_argument", raw);
    const separator = raw.indexOf("=");
    const key = separator >= 0 ? raw.slice(2, separator) : raw.slice(2);
    if (!allowed.has(key)) fail("unknown_option", key);
    if (Object.hasOwn(options, key)) fail("duplicate_option", key);
    let value = separator >= 0 ? raw.slice(separator + 1) : "";
    if (separator < 0) {
      if (index + 1 >= argv.length || argv[index + 1].startsWith("--")) {
        fail("missing_option_value", key);
      }
      value = argv[index + 1];
      index += 1;
    }
    if (!value) fail("missing_option_value", key);
    options[key] = value;
  }
  return options;
}

function usage() {
  return `${MARKER}\n\nUsage:\n  node tools/void-public-earn-node-observer-floor-v1.mjs \\
    --report PATH [--expected-peer-count 1] [--output PATH]\n\nValidates a maintained read-only node observer report using minimum-peer-floor\nsemantics. It performs no network request and authorizes no mutation.\n`;
}

async function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  if (options.help === true) {
    process.stdout.write(usage());
    return;
  }
  if (!options.report) fail("report_required");
  const reportPath = path.resolve(options.report);
  const reportStats = regularFile(
    reportPath,
    MAX_REPORT_BYTES,
    "report_file_invalid",
  );
  const reportBytes = fs.readFileSync(reportPath);
  let report;
  try {
    report = JSON.parse(reportBytes.toString("utf8"));
  } catch {
    fail("report_json_invalid");
  }
  const validation = validateObserverReport({
    report,
    reportBytes,
    expectedPeerCount:
      options["expected-peer-count"] ?? DEFAULT_EXPECTED_PEER_COUNT,
    validatedAt: new Date().toISOString(),
  });
  if (reportStats.size !== reportBytes.length) fail("report_size_changed_during_read");
  if (options.output) {
    const outputPath = path.resolve(options.output);
    if (outputPath === reportPath) fail("output_must_not_overwrite_report");
    atomicWriteJson(outputPath, validation);
  }
  process.stdout.write(`${JSON.stringify(validation, null, 2)}\n`);
}

const invokedDirectly =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) {
  main().catch((error) => {
    const code = error?.code || error?.name || "observer_floor_failed";
    console.error(`${MARKER} HOLD code=${code} message=${error?.message}`);
    if (error?.details && Object.keys(error.details).length > 0) {
      console.error(JSON.stringify(error.details, null, 2));
    }
    process.exitCode = 1;
  });
}
