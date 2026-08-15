#!/usr/bin/env node

import { createHash } from "node:crypto";
import {
  closeSync,
  constants as fsConstants,
  fstatSync,
  openSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const VOID_NODE_FLEET_RUNTIME_PIN_STATUS_V1 =
  "VOID_NODE_FLEET_RUNTIME_PIN_STATUS_V1";
export const VOID_NODE_FLEET_DRIFT_AUDIT_V1 = "VOID_NODE_FLEET_DRIFT_AUDIT_V1";

const SHA_RE = /^[0-9a-f]{40}$/;
const SHA256_RE = /^[0-9a-f]{64}$/;
const MAX_EVIDENCE_BYTES = 4 * 1024 * 1024;
const DEFAULT_MAX_EVIDENCE_AGE_SECONDS = 300;
const MAX_EVIDENCE_AGE_SECONDS = 86_400;

const DRIFT_TOP_LEVEL_KEYS = [
  "marker",
  "version",
  "canonical",
  "decision",
  "audit_id_sha256",
  "convergence_candidates",
  "nodes",
  "mutation_attempted",
  "authority",
];

const DRIFT_AUTHORITY_KEYS = [
  "git_fetch",
  "git_pull",
  "checkout",
  "reset",
  "service_restart",
  "deployment",
  "credential_read",
  "wallet_or_signer",
  "transaction",
  "funds_moved",
];

const DRIFT_NODE_KEYS = [
  "name",
  "transport",
  "reachable",
  "repo_ok",
  "head",
  "branch",
  "dirty_count",
  "service_active",
  "health_ok",
  "readiness_ok",
  "peer_count",
  "comparison",
  "classification",
  "reasons",
];

const VALID_DRIFT_DECISIONS = new Set(["CURRENT", "CONVERGENCE_RECOMMENDED", "HOLD"]);
const VALID_NODE_CLASSIFICATIONS = new Set([
  "CURRENT",
  "BEHIND_EVIDENCE_ONLY",
  "BEHIND_RUNTIME_RELEVANT",
  "HOLD",
]);
const VALID_RELATIONS = new Set([
  "current",
  "behind",
  "ahead",
  "diverged",
  "compare_failed",
  "node_object_missing",
  "canonical_object_missing",
  "unavailable",
]);

function fail(message) {
  const error = new Error(message);
  error.name = "VoidFleetRuntimePinStatusError";
  throw error;
}

function assertPlainObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    fail(`${label} must be an object`);
  }
  return value;
}

function assertExactKeys(value, expected, label) {
  assertPlainObject(value, label);
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (actual.length !== wanted.length || actual.some((key, index) => key !== wanted[index])) {
    fail(`${label} has unexpected or missing fields`);
  }
}

function assertString(value, label) {
  if (typeof value !== "string" || value.length === 0) fail(`${label} must be a non-empty string`);
  if (/[\0\r\n]/.test(value)) fail(`${label} contains a control character`);
  return value;
}

function assertSha(value, label) {
  const normalized = String(value ?? "");
  if (!SHA_RE.test(normalized)) fail(`${label} must be lowercase 40-hex`);
  return normalized;
}

function assertSha256(value, label) {
  const normalized = String(value ?? "");
  if (!SHA256_RE.test(normalized)) fail(`${label} must be lowercase 64-hex`);
  return normalized;
}

function assertBoolean(value, label) {
  if (typeof value !== "boolean") fail(`${label} must be boolean`);
  return value;
}

function assertNonnegativeSafeInteger(value, label) {
  if (!Number.isSafeInteger(value) || value < 0) fail(`${label} must be a nonnegative safe integer`);
  return value;
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function sha256Stable(value) {
  return sha256(stableJson(value));
}

function deepFreeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    for (const nested of Object.values(value)) deepFreeze(nested);
    Object.freeze(value);
  }
  return value;
}

function expandHome(input) {
  if (input === "~") return homedir();
  if (input.startsWith("~/")) return resolve(homedir(), input.slice(2));
  return input;
}

function runtimeRelevantPathCount(node) {
  const value = node?.comparison?.path_classification?.runtime_relevant_path_count;
  return Number.isSafeInteger(value) && value >= 0 ? value : null;
}

function commitsBehind(node) {
  const value = node?.comparison?.commits_behind;
  return Number.isSafeInteger(value) && value >= 0 ? value : null;
}

export function reproduceFleetDecisionV1(canonicalSha, nodes) {
  assertSha(canonicalSha, "canonical SHA");
  if (!Array.isArray(nodes) || nodes.length < 1) fail("nodes must be a non-empty array");
  const hold = nodes.some((node) => node.classification === "HOLD");
  const behind = nodes.some((node) => String(node.classification).startsWith("BEHIND_"));
  const decision = hold ? "HOLD" : behind ? "CONVERGENCE_RECOMMENDED" : "CURRENT";
  const convergenceCandidates = nodes
    .filter((node) => String(node.classification).startsWith("BEHIND_"))
    .map((node) => ({
      name: node.name,
      from_sha: node.head,
      to_sha: canonicalSha,
      classification: node.classification,
      commits_behind: commitsBehind(node),
      runtime_relevant_path_count: runtimeRelevantPathCount(node),
    }));
  const digestPayload = {
    marker: VOID_NODE_FLEET_DRIFT_AUDIT_V1,
    canonical_sha: canonicalSha,
    decision,
    nodes: nodes.map((node) => ({
      name: node.name,
      head: node.head || null,
      classification: node.classification,
      reasons: node.reasons,
      relation: node.comparison?.relation ?? null,
      commits_behind: commitsBehind(node),
      runtime_relevant_path_count: runtimeRelevantPathCount(node),
    })),
  };
  return {
    decision,
    convergence_candidates: convergenceCandidates,
    audit_id_sha256: sha256Stable(digestPayload),
  };
}

function validateDriftNode(node, index, canonicalSha, seenNames) {
  assertExactKeys(node, DRIFT_NODE_KEYS, `nodes[${index}]`);
  const name = assertString(node.name, `nodes[${index}].name`);
  if (seenNames.has(name)) fail(`duplicate node name ${name}`);
  seenNames.add(name);
  if (node.transport !== "local" && node.transport !== "ssh") {
    fail(`${name}.transport must be local or ssh`);
  }
  assertBoolean(node.reachable, `${name}.reachable`);
  assertBoolean(node.repo_ok, `${name}.repo_ok`);
  if (node.head !== null) assertSha(node.head, `${name}.head`);
  if (node.branch !== null) assertString(node.branch, `${name}.branch`);
  if (node.dirty_count !== null) assertNonnegativeSafeInteger(node.dirty_count, `${name}.dirty_count`);
  assertBoolean(node.service_active, `${name}.service_active`);
  assertBoolean(node.health_ok, `${name}.health_ok`);
  assertBoolean(node.readiness_ok, `${name}.readiness_ok`);
  assertNonnegativeSafeInteger(node.peer_count, `${name}.peer_count`);
  assertPlainObject(node.comparison, `${name}.comparison`);
  const relation = assertString(node.comparison.relation, `${name}.comparison.relation`);
  if (!VALID_RELATIONS.has(relation)) fail(`${name}.comparison.relation is unknown`);
  if (!VALID_NODE_CLASSIFICATIONS.has(node.classification)) {
    fail(`${name}.classification is unknown`);
  }
  if (!Array.isArray(node.reasons) || node.reasons.some((reason) => typeof reason !== "string")) {
    fail(`${name}.reasons must be a string array`);
  }

  if (node.classification !== "HOLD") {
    if (
      node.reachable !== true ||
      node.repo_ok !== true ||
      !SHA_RE.test(node.head || "") ||
      node.dirty_count !== 0 ||
      node.service_active !== true ||
      node.health_ok !== true ||
      node.readiness_ok !== true ||
      node.reasons.length !== 0
    ) {
      fail(`${name} non-HOLD classification contradicts runtime safety fields`);
    }
    if (node.branch !== "main") fail(`${name} non-HOLD node must be on main`);
    if (node.classification === "CURRENT") {
      if (relation !== "current" || node.head !== canonicalSha) {
        fail(`${name} CURRENT classification contradicts canonical main`);
      }
    } else if (relation !== "behind") {
      fail(`${name} behind classification requires comparison.relation=behind`);
    }
  }
}

export function validateFleetDriftAuditV1(audit) {
  assertExactKeys(audit, DRIFT_TOP_LEVEL_KEYS, "drift audit");
  if (audit.marker !== VOID_NODE_FLEET_DRIFT_AUDIT_V1) {
    fail(`drift audit marker must be ${VOID_NODE_FLEET_DRIFT_AUDIT_V1}`);
  }
  if (audit.version !== 1) fail("drift audit version must be 1");
  assertExactKeys(audit.canonical, ["remote", "branch", "sha"], "drift audit canonical");
  assertString(audit.canonical.remote, "drift audit canonical.remote");
  if (audit.canonical.branch !== "main") fail("drift audit canonical branch must be main");
  const canonicalSha = assertSha(audit.canonical.sha, "drift audit canonical SHA");
  if (!VALID_DRIFT_DECISIONS.has(audit.decision)) fail("drift audit decision is unknown");
  assertSha256(audit.audit_id_sha256, "drift audit id");
  if (!Array.isArray(audit.convergence_candidates)) fail("convergence_candidates must be an array");
  if (!Array.isArray(audit.nodes) || audit.nodes.length < 1 || audit.nodes.length > 16) {
    fail("drift audit nodes must contain 1..16 entries");
  }
  assertBoolean(audit.mutation_attempted, "drift audit mutation_attempted");
  if (audit.mutation_attempted !== false) fail("drift audit claims mutation_attempted");
  assertExactKeys(audit.authority, DRIFT_AUTHORITY_KEYS, "drift audit authority");
  for (const key of DRIFT_AUTHORITY_KEYS) {
    if (audit.authority[key] !== false) fail(`drift audit authority.${key} must be false`);
  }

  const seenNames = new Set();
  audit.nodes.forEach((node, index) => validateDriftNode(node, index, canonicalSha, seenNames));

  const reproduced = reproduceFleetDecisionV1(canonicalSha, audit.nodes);
  if (reproduced.decision !== audit.decision) fail("drift audit decision does not reproduce");
  if (reproduced.audit_id_sha256 !== audit.audit_id_sha256) fail("drift audit id does not reproduce");
  if (stableJson(reproduced.convergence_candidates) !== stableJson(audit.convergence_candidates)) {
    fail("drift audit convergence candidates do not reproduce");
  }
  return audit;
}

export function classifyRuntimePinNodeV1(node, approvedRuntimeSha, canonicalSha) {
  assertSha(approvedRuntimeSha, "approved runtime SHA");
  assertSha(canonicalSha, "canonical SHA");
  if (node.classification === "HOLD") {
    return {
      name: node.name,
      head: node.head,
      status: "HOLD",
      reason: "upstream_fleet_audit_hold",
      upstream_classification: node.classification,
      upstream_relation: node.comparison?.relation ?? null,
    };
  }
  if (node.head !== approvedRuntimeSha) {
    return {
      name: node.name,
      head: node.head,
      status: "UNEXPECTED_RUNTIME_DRIFT",
      reason: node.head === canonicalSha
        ? "runtime_advanced_to_current_main_outside_approved_pin"
        : "runtime_head_does_not_match_approved_pin",
      upstream_classification: node.classification,
      upstream_relation: node.comparison?.relation ?? null,
    };
  }
  if (approvedRuntimeSha === canonicalSha) {
    return {
      name: node.name,
      head: node.head,
      status: "CURRENT_WITH_MAIN",
      reason: "approved_runtime_equals_canonical_main",
      upstream_classification: node.classification,
      upstream_relation: node.comparison?.relation ?? null,
    };
  }
  return {
    name: node.name,
    head: node.head,
    status: "HEALTHY_INTENTIONAL_PIN",
    reason: "healthy_runtime_matches_explicit_approved_pin",
    upstream_classification: node.classification,
    upstream_relation: node.comparison?.relation ?? null,
  };
}

export function buildFleetRuntimePinStatusV1({
  audit,
  approvedRuntimeSha,
  sourceAuditFileSha256,
  sourceAuditMtimeEpochMs,
  evaluatedAtEpochMs = Date.now(),
  evidenceOutputCreated = false,
}) {
  validateFleetDriftAuditV1(audit);
  const approved = assertSha(approvedRuntimeSha, "approved runtime SHA");
  const sourceDigest = assertSha256(sourceAuditFileSha256, "source audit file SHA-256");
  if (!Number.isSafeInteger(sourceAuditMtimeEpochMs) || sourceAuditMtimeEpochMs < 0) {
    fail("sourceAuditMtimeEpochMs must be a nonnegative safe integer");
  }
  if (!Number.isSafeInteger(evaluatedAtEpochMs) || evaluatedAtEpochMs < 0) {
    fail("evaluatedAtEpochMs must be a nonnegative safe integer");
  }
  assertBoolean(evidenceOutputCreated, "evidenceOutputCreated");

  const canonicalSha = audit.canonical.sha;
  const nodes = audit.nodes.map((node) => classifyRuntimePinNodeV1(node, approved, canonicalSha));
  let status;
  if (nodes.some((node) => node.status === "HOLD")) {
    status = "HOLD";
  } else if (nodes.some((node) => node.status === "UNEXPECTED_RUNTIME_DRIFT")) {
    status = "UNEXPECTED_RUNTIME_DRIFT";
  } else if (nodes.every((node) => node.status === "CURRENT_WITH_MAIN")) {
    status = "CURRENT_WITH_MAIN";
  } else if (nodes.every((node) => node.status === "HEALTHY_INTENTIONAL_PIN")) {
    status = "HEALTHY_INTENTIONAL_PIN";
  } else {
    status = "HOLD";
  }

  const nextGate = {
    CURRENT_WITH_MAIN: "no_runtime_action_required_by_this_packet",
    HEALTHY_INTENTIONAL_PIN: "preserve_pin_until_separately_authorized_rollout",
    UNEXPECTED_RUNTIME_DRIFT: "investigate_runtime_drift_before_any_rollout_or_restart",
    HOLD: "refresh_or_repair_evidence_before_any_runtime_action",
  }[status];

  const idMaterial = {
    marker: VOID_NODE_FLEET_RUNTIME_PIN_STATUS_V1,
    version: 1,
    approved_runtime_sha: approved,
    canonical_main_sha: canonicalSha,
    source_audit_id_sha256: audit.audit_id_sha256,
    source_audit_file_sha256: sourceDigest,
    status,
    nodes,
  };

  return deepFreeze({
    marker: VOID_NODE_FLEET_RUNTIME_PIN_STATUS_V1,
    version: 1,
    approved_runtime_sha: approved,
    canonical_main_sha: canonicalSha,
    source_audit_id_sha256: audit.audit_id_sha256,
    source_audit_file_sha256: sourceDigest,
    source_audit_mtime_epoch_ms: sourceAuditMtimeEpochMs,
    evaluated_at_epoch_ms: evaluatedAtEpochMs,
    status,
    next_gate: nextGate,
    status_id_sha256: sha256Stable(idMaterial),
    nodes,
    source_drift_decision: audit.decision,
    mutation_attempted: false,
    evidence_output_created: evidenceOutputCreated,
    authority: {
      source_evidence_read_only: true,
      runtime_reclassification_only: true,
      git_fetch: false,
      git_pull: false,
      checkout: false,
      reset: false,
      service_restart: false,
      deployment: false,
      network_mutation: false,
      credential_read: false,
      wallet_or_signer: false,
      work_credit_mutation: false,
      validator_mutation: false,
      transaction: false,
      treasury_or_liquidity_action: false,
      funds_moved: false,
    },
  });
}

export function readFreshFleetDriftAuditV1(pathInput, maxAgeSeconds = DEFAULT_MAX_EVIDENCE_AGE_SECONDS) {
  const path = expandHome(assertString(pathInput, "audit path"));
  if (!Number.isSafeInteger(maxAgeSeconds) || maxAgeSeconds < 1 || maxAgeSeconds > MAX_EVIDENCE_AGE_SECONDS) {
    fail(`max evidence age must be 1..${MAX_EVIDENCE_AGE_SECONDS} seconds`);
  }
  const flags = fsConstants.O_RDONLY | (fsConstants.O_NOFOLLOW ?? 0) | (fsConstants.O_NONBLOCK ?? 0);
  let fd;
  try {
    fd = openSync(path, flags);
    const before = fstatSync(fd, { bigint: false });
    if (!before.isFile()) fail("audit evidence must be a regular file");
    if (before.size < 2 || before.size > MAX_EVIDENCE_BYTES) {
      fail(`audit evidence size must be 2..${MAX_EVIDENCE_BYTES} bytes`);
    }
    const rawBuffer = readFileSync(fd);
    const after = fstatSync(fd, { bigint: false });
    if (
      before.size !== after.size ||
      before.mtimeMs !== after.mtimeMs ||
      before.ctimeMs !== after.ctimeMs
    ) {
      fail("audit evidence changed while being read");
    }
    const nowMs = Date.now();
    if (after.mtimeMs > nowMs + 5_000) fail("audit evidence modification time is in the future");
    const ageMs = Math.max(0, nowMs - after.mtimeMs);
    if (ageMs > maxAgeSeconds * 1_000) fail("audit evidence is stale");
    let audit;
    try {
      audit = JSON.parse(rawBuffer.toString("utf8"));
    } catch {
      fail("audit evidence is not valid JSON");
    }
    validateFleetDriftAuditV1(audit);
    return {
      audit,
      file_sha256: sha256(rawBuffer),
      mtime_epoch_ms: Math.trunc(after.mtimeMs),
      age_seconds: Math.floor(ageMs / 1_000),
    };
  } finally {
    if (fd !== undefined) closeSync(fd);
  }
}

function parseUnpaddedInteger(value, label) {
  if (!/^(?:0|[1-9][0-9]*)$/.test(String(value ?? ""))) fail(`${label} must be an unpadded integer`);
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed)) fail(`${label} is outside the safe integer range`);
  return parsed;
}

function parseArgs(argv) {
  const out = {
    audit: "",
    approvedRuntimeSha: "",
    maxEvidenceAgeSeconds: DEFAULT_MAX_EVIDENCE_AGE_SECONDS,
    output: "",
  };
  const seen = new Set();
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help") {
      console.log(
        "Usage: node tools/void-node-fleet-runtime-pin-status-v1.mjs --audit PATH --approved-runtime-sha SHA [--max-evidence-age-seconds N] [--output PATH]",
      );
      process.exit(0);
    }
    if (!["--audit", "--approved-runtime-sha", "--max-evidence-age-seconds", "--output"].includes(arg)) {
      fail(`unknown argument: ${arg}`);
    }
    if (seen.has(arg)) fail(`duplicate argument: ${arg}`);
    seen.add(arg);
    const value = argv[++index];
    if (value === undefined) fail(`missing value for ${arg}`);
    if (arg === "--audit") out.audit = value;
    else if (arg === "--approved-runtime-sha") out.approvedRuntimeSha = value;
    else if (arg === "--max-evidence-age-seconds") {
      out.maxEvidenceAgeSeconds = parseUnpaddedInteger(value, "max evidence age");
    } else if (arg === "--output") out.output = value;
  }
  if (!out.audit) fail("--audit is required");
  if (!out.approvedRuntimeSha) fail("--approved-runtime-sha is required");
  return out;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const source = readFreshFleetDriftAuditV1(args.audit, args.maxEvidenceAgeSeconds);
  const packet = buildFleetRuntimePinStatusV1({
    audit: source.audit,
    approvedRuntimeSha: args.approvedRuntimeSha,
    sourceAuditFileSha256: source.file_sha256,
    sourceAuditMtimeEpochMs: source.mtime_epoch_ms,
    evaluatedAtEpochMs: Date.now(),
    evidenceOutputCreated: Boolean(args.output),
  });
  const json = `${JSON.stringify(packet, null, 2)}\n`;
  if (args.output) {
    writeFileSync(expandHome(args.output), json, {
      encoding: "utf8",
      mode: 0o600,
      flag: "wx",
    });
  }
  process.stdout.write(json);
  process.exitCode = ["HOLD", "UNEXPECTED_RUNTIME_DRIFT"].includes(packet.status) ? 2 : 0;
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : "";
if (invokedPath && fileURLToPath(import.meta.url) === invokedPath) {
  try {
    main();
  } catch (error) {
    console.error(
      JSON.stringify({
        marker: VOID_NODE_FLEET_RUNTIME_PIN_STATUS_V1,
        status: "HOLD",
        error: String(error?.message || error),
        mutation_attempted: false,
      }),
    );
    process.exitCode = 1;
  }
}
