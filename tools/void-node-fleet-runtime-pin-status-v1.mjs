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
export const VOID_NODE_FLEET_PROCESS_FRESHNESS_AUDIT_V1 =
  "VOID_NODE_FLEET_PROCESS_FRESHNESS_AUDIT_V1";

const SHA_RE = /^[0-9a-f]{40}$/;
const SHA256_RE = /^[0-9a-f]{64}$/;
const INVOCATION_RE = /^[0-9a-f]{32}$/;
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

const PROCESS_TOP_LEVEL_KEYS = [
  "marker",
  "version",
  "decision",
  "audit_id_sha256",
  "expected_process_entrypoint",
  "nodes",
  "process_source_identity_required",
  "version_git_commit_is_process_identity",
  "mutation_attempted",
  "authority",
];

const PROCESS_AUTHORITY_KEYS = [
  "git_mutation",
  "package_install",
  "build",
  "service_stop",
  "service_start_or_restart",
  "deployment",
  "credential_read",
  "wallet_or_signer",
  "transaction",
  "funds_moved",
];

const PROCESS_NODE_ALLOWED_KEYS = new Set([
  "name",
  "transport",
  "reachable",
  "source_head",
  "source_tree",
  "source_branch",
  "dirty_count",
  "worktree_status_readable",
  "source_stable",
  "service_active",
  "process_present",
  "process_cwd_matches_repo",
  "process_entrypoint",
  "process_entrypoint_matches",
  "process_executable_node",
  "process_identity_stable",
  "head_transition_epoch",
  "process_invocation_id",
  "process_start_epoch",
  "observed_at_epoch",
  "health_ok",
  "readiness_ok",
  "classification",
  "reasons",
  "source_to_process_start_seconds",
  "process_source_identity_bound",
  "process_source_commit",
  "process_source_tree",
  "process_source_matches_current",
  "version_git_commit_matches_source_head_diagnostic_only",
]);

const VALID_DRIFT_DECISIONS = new Set([
  "CURRENT",
  "CONVERGENCE_RECOMMENDED",
  "HOLD",
]);
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
const VALID_PROCESS_DECISIONS = new Set([
  "PROCESS_FRESH",
  "RESTART_REQUIRED",
  "HOLD",
]);
const VALID_PROCESS_CLASSIFICATIONS = new Set([
  "PROCESS_SOURCE_ALIGNED",
  "STALE_SOURCE_AFTER_PROCESS_START",
  "HOLD",
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
  if (
    actual.length !== wanted.length ||
    actual.some((key, index) => key !== wanted[index])
  ) {
    fail(`${label} has unexpected or missing fields`);
  }
}

function assertAllowedKeys(value, allowed, label) {
  assertPlainObject(value, label);
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) fail(`${label} has unexpected field ${key}`);
  }
}

function assertString(value, label) {
  if (typeof value !== "string" || value.length === 0) {
    fail(`${label} must be a non-empty string`);
  }
  if (/[\0\r\n]/.test(value)) fail(`${label} contains a control character`);
  return value;
}

function assertSha(value, label) {
  const normalized = String(value ?? "");
  if (!SHA_RE.test(normalized)) fail(`${label} must be lowercase 40-hex`);
  return normalized;
}

function assertNullableSha(value, label) {
  if (value === null) return null;
  return assertSha(value, label);
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
  if (!Number.isSafeInteger(value) || value < 0) {
    fail(`${label} must be a nonnegative safe integer`);
  }
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
  if (!Array.isArray(nodes) || nodes.length < 1) {
    fail("nodes must be a non-empty array");
  }
  const hold = nodes.some((node) => node.classification === "HOLD");
  const behind = nodes.some((node) =>
    String(node.classification).startsWith("BEHIND_"),
  );
  const decision = hold
    ? "HOLD"
    : behind
      ? "CONVERGENCE_RECOMMENDED"
      : "CURRENT";
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
  if (node.dirty_count !== null) {
    assertNonnegativeSafeInteger(node.dirty_count, `${name}.dirty_count`);
  }
  assertBoolean(node.service_active, `${name}.service_active`);
  assertBoolean(node.health_ok, `${name}.health_ok`);
  assertBoolean(node.readiness_ok, `${name}.readiness_ok`);
  assertNonnegativeSafeInteger(node.peer_count, `${name}.peer_count`);
  assertPlainObject(node.comparison, `${name}.comparison`);
  const relation = assertString(
    node.comparison.relation,
    `${name}.comparison.relation`,
  );
  if (!VALID_RELATIONS.has(relation)) {
    fail(`${name}.comparison.relation is unknown`);
  }
  if (!VALID_NODE_CLASSIFICATIONS.has(node.classification)) {
    fail(`${name}.classification is unknown`);
  }
  if (
    !Array.isArray(node.reasons) ||
    node.reasons.some((reason) => typeof reason !== "string")
  ) {
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
  assertExactKeys(
    audit.canonical,
    ["remote", "branch", "sha"],
    "drift audit canonical",
  );
  assertString(audit.canonical.remote, "drift audit canonical.remote");
  if (audit.canonical.branch !== "main") {
    fail("drift audit canonical branch must be main");
  }
  const canonicalSha = assertSha(
    audit.canonical.sha,
    "drift audit canonical SHA",
  );
  if (!VALID_DRIFT_DECISIONS.has(audit.decision)) {
    fail("drift audit decision is unknown");
  }
  assertSha256(audit.audit_id_sha256, "drift audit id");
  if (!Array.isArray(audit.convergence_candidates)) {
    fail("convergence_candidates must be an array");
  }
  if (
    !Array.isArray(audit.nodes) ||
    audit.nodes.length < 1 ||
    audit.nodes.length > 16
  ) {
    fail("drift audit nodes must contain 1..16 entries");
  }
  assertBoolean(audit.mutation_attempted, "drift audit mutation_attempted");
  if (audit.mutation_attempted !== false) {
    fail("drift audit claims mutation_attempted");
  }
  assertExactKeys(audit.authority, DRIFT_AUTHORITY_KEYS, "drift audit authority");
  for (const key of DRIFT_AUTHORITY_KEYS) {
    if (audit.authority[key] !== false) {
      fail(`drift audit authority.${key} must be false`);
    }
  }

  const seenNames = new Set();
  audit.nodes.forEach((node, index) =>
    validateDriftNode(node, index, canonicalSha, seenNames),
  );

  const reproduced = reproduceFleetDecisionV1(canonicalSha, audit.nodes);
  if (reproduced.decision !== audit.decision) {
    fail("drift audit decision does not reproduce");
  }
  if (reproduced.audit_id_sha256 !== audit.audit_id_sha256) {
    fail("drift audit id does not reproduce");
  }
  if (
    stableJson(reproduced.convergence_candidates) !==
    stableJson(audit.convergence_candidates)
  ) {
    fail("drift audit convergence candidates do not reproduce");
  }
  return audit;
}

export function reproduceProcessFreshnessDecisionV1(nodes) {
  if (!Array.isArray(nodes) || nodes.length < 1) {
    fail("process nodes must be a non-empty array");
  }
  const hold = nodes.some((node) => node.classification === "HOLD");
  const stale = nodes.some(
    (node) => node.classification === "STALE_SOURCE_AFTER_PROCESS_START",
  );
  const decision = hold
    ? "HOLD"
    : stale
      ? "RESTART_REQUIRED"
      : "PROCESS_FRESH";
  const payload = {
    marker: VOID_NODE_FLEET_PROCESS_FRESHNESS_AUDIT_V1,
    decision,
    nodes: nodes.map((node) => ({
      name: node.name,
      source_head: node.source_head,
      source_tree: node.source_tree,
      classification: node.classification,
      reasons: node.reasons,
      source_to_process_start_seconds: node.source_to_process_start_seconds,
      process_invocation_id: node.process_invocation_id,
      process_source_identity_bound: node.process_source_identity_bound,
      process_source_commit: node.process_source_commit,
      process_source_tree: node.process_source_tree,
      process_source_matches_current: node.process_source_matches_current,
      version_git_commit_matches_source_head_diagnostic_only:
        node.version_git_commit_matches_source_head_diagnostic_only,
    })),
  };
  return { decision, audit_id_sha256: sha256Stable(payload) };
}

function validateProcessNode(node, index, seenNames) {
  assertAllowedKeys(node, PROCESS_NODE_ALLOWED_KEYS, `process nodes[${index}]`);
  const name = assertString(node.name, `process nodes[${index}].name`);
  if (seenNames.has(name)) fail(`duplicate process node name ${name}`);
  seenNames.add(name);
  if (node.transport !== "local" && node.transport !== "ssh") {
    fail(`${name}.transport must be local or ssh`);
  }
  assertBoolean(node.reachable, `${name}.reachable`);
  if (!VALID_PROCESS_CLASSIFICATIONS.has(node.classification)) {
    fail(`${name}.process classification is unknown`);
  }
  if (
    !Array.isArray(node.reasons) ||
    node.reasons.some((reason) => typeof reason !== "string")
  ) {
    fail(`${name}.process reasons must be a string array`);
  }
  assertNullableSha(node.source_head, `${name}.source_head`);
  assertNullableSha(node.source_tree, `${name}.source_tree`);
  assertNullableSha(node.process_source_commit, `${name}.process_source_commit`);
  assertNullableSha(node.process_source_tree, `${name}.process_source_tree`);
  if (node.process_invocation_id !== null) {
    if (!INVOCATION_RE.test(String(node.process_invocation_id ?? ""))) {
      fail(`${name}.process_invocation_id must be lowercase 32-hex or null`);
    }
  }
  assertBoolean(
    node.process_source_identity_bound,
    `${name}.process_source_identity_bound`,
  );
  assertBoolean(
    node.process_source_matches_current,
    `${name}.process_source_matches_current`,
  );
  assertBoolean(
    node.version_git_commit_matches_source_head_diagnostic_only,
    `${name}.version diagnostic`,
  );
  if (
    node.source_to_process_start_seconds !== null &&
    !Number.isSafeInteger(node.source_to_process_start_seconds)
  ) {
    fail(`${name}.source_to_process_start_seconds must be integer or null`);
  }

  if (node.classification !== "HOLD") {
    for (const required of [
      "source_branch",
      "dirty_count",
      "worktree_status_readable",
      "source_stable",
      "service_active",
      "process_present",
      "process_cwd_matches_repo",
      "process_entrypoint",
      "process_entrypoint_matches",
      "process_executable_node",
      "process_identity_stable",
      "head_transition_epoch",
      "process_start_epoch",
      "observed_at_epoch",
      "health_ok",
      "readiness_ok",
    ]) {
      if (!(required in node)) fail(`${name}.${required} is required`);
    }
    if (node.source_branch !== "main") fail(`${name}.source_branch must be main`);
    assertNonnegativeSafeInteger(node.dirty_count, `${name}.dirty_count`);
    if (node.dirty_count !== 0) fail(`${name}.worktree must be clean`);
    for (const [key, expected] of [
      ["worktree_status_readable", true],
      ["source_stable", true],
      ["service_active", true],
      ["process_present", true],
      ["process_cwd_matches_repo", true],
      ["process_entrypoint_matches", true],
      ["process_executable_node", true],
      ["process_identity_stable", true],
      ["health_ok", true],
      ["readiness_ok", true],
      ["process_source_identity_bound", true],
    ]) {
      assertBoolean(node[key], `${name}.${key}`);
      if (node[key] !== expected) fail(`${name}.${key} must be ${expected}`);
    }
    if (node.process_entrypoint !== "src/index.ts") {
      fail(`${name}.process_entrypoint must be src/index.ts`);
    }
    assertNonnegativeSafeInteger(
      node.head_transition_epoch,
      `${name}.head_transition_epoch`,
    );
    assertNonnegativeSafeInteger(
      node.process_start_epoch,
      `${name}.process_start_epoch`,
    );
    assertNonnegativeSafeInteger(
      node.observed_at_epoch,
      `${name}.observed_at_epoch`,
    );
    const timelineDelta = node.process_start_epoch - node.head_transition_epoch;
    if (timelineDelta !== node.source_to_process_start_seconds) {
      fail(`${name}.source/process timeline delta does not reproduce`);
    }
    if (
      node.process_start_epoch > node.observed_at_epoch + 5 ||
      node.head_transition_epoch > node.observed_at_epoch + 5
    ) {
      fail(`${name}.source/process timeline is future-dated`);
    }
    assertSha(node.source_head, `${name}.source_head`);
    assertSha(node.source_tree, `${name}.source_tree`);
    assertSha(node.process_source_commit, `${name}.process_source_commit`);
    assertSha(node.process_source_tree, `${name}.process_source_tree`);
    if (!INVOCATION_RE.test(node.process_invocation_id)) {
      fail(`${name}.process_invocation_id must be lowercase 32-hex`);
    }
    if (node.reasons.length !== 0) {
      fail(`${name} non-HOLD process node must have no reasons`);
    }
    if (node.classification === "PROCESS_SOURCE_ALIGNED") {
      if (timelineDelta < 1) {
        fail(`${name} aligned process must start after the source transition`);
      }
      if (node.process_source_matches_current !== true) {
        fail(`${name} aligned process must match current source`);
      }
      if (
        node.process_source_commit !== node.source_head ||
        node.process_source_tree !== node.source_tree
      ) {
        fail(`${name} aligned process identity contradicts source identity`);
      }
    } else {
      if (timelineDelta > -1) {
        fail(`${name} stale process must predate the source transition`);
      }
      if (node.process_source_matches_current !== false) {
        fail(`${name} stale process must not match current source`);
      }
      if (node.process_source_commit === node.source_head) {
        fail(`${name} stale process commit must differ from source head`);
      }
    }
  }
}

export function validateFleetProcessFreshnessAuditV1(audit) {
  assertExactKeys(audit, PROCESS_TOP_LEVEL_KEYS, "process freshness audit");
  if (audit.marker !== VOID_NODE_FLEET_PROCESS_FRESHNESS_AUDIT_V1) {
    fail(
      `process freshness marker must be ${VOID_NODE_FLEET_PROCESS_FRESHNESS_AUDIT_V1}`,
    );
  }
  if (audit.version !== 1) fail("process freshness audit version must be 1");
  if (!VALID_PROCESS_DECISIONS.has(audit.decision)) {
    fail("process freshness decision is unknown");
  }
  assertSha256(audit.audit_id_sha256, "process freshness audit id");
  if (audit.expected_process_entrypoint !== "src/index.ts") {
    fail("process freshness expected entrypoint must be src/index.ts");
  }
  if (audit.process_source_identity_required !== true) {
    fail("process freshness must require process-source identity");
  }
  if (audit.version_git_commit_is_process_identity !== false) {
    fail("version.git_commit must not be process identity");
  }
  if (audit.mutation_attempted !== false) {
    fail("process freshness audit claims mutation_attempted");
  }
  assertExactKeys(
    audit.authority,
    PROCESS_AUTHORITY_KEYS,
    "process freshness authority",
  );
  for (const key of PROCESS_AUTHORITY_KEYS) {
    if (audit.authority[key] !== false) {
      fail(`process freshness authority.${key} must be false`);
    }
  }
  if (
    !Array.isArray(audit.nodes) ||
    audit.nodes.length < 1 ||
    audit.nodes.length > 16
  ) {
    fail("process freshness nodes must contain 1..16 entries");
  }
  const seenNames = new Set();
  audit.nodes.forEach((node, index) => validateProcessNode(node, index, seenNames));
  const reproduced = reproduceProcessFreshnessDecisionV1(audit.nodes);
  if (reproduced.decision !== audit.decision) {
    fail("process freshness decision does not reproduce");
  }
  if (reproduced.audit_id_sha256 !== audit.audit_id_sha256) {
    fail("process freshness audit id does not reproduce");
  }
  return audit;
}

function evidenceCoherenceProblems(driftAudit, processAudit) {
  const problems = [];
  const processByName = new Map(
    processAudit.nodes.map((node) => [node.name, node]),
  );
  if (processByName.size !== driftAudit.nodes.length) {
    problems.push("node_set_mismatch");
  }
  for (const driftNode of driftAudit.nodes) {
    const processNode = processByName.get(driftNode.name);
    if (!processNode) {
      problems.push(`missing_process_node:${driftNode.name}`);
      continue;
    }
    if (processNode.transport !== driftNode.transport) {
      problems.push(`transport_mismatch:${driftNode.name}`);
    }
    if (
      driftNode.head !== null &&
      processNode.source_head !== null &&
      driftNode.head !== processNode.source_head
    ) {
      problems.push(`source_head_mismatch:${driftNode.name}`);
    }
  }
  for (const processNode of processAudit.nodes) {
    if (!driftAudit.nodes.some((node) => node.name === processNode.name)) {
      problems.push(`unexpected_process_node:${processNode.name}`);
    }
  }
  return [...new Set(problems)].sort();
}

export function classifyRuntimePinNodeV1(
  driftNode,
  processNode,
  approvedRuntimeSha,
  canonicalSha,
  coherenceProblems = [],
) {
  const approved = assertSha(approvedRuntimeSha, "approved runtime SHA");
  const canonical = assertSha(canonicalSha, "canonical SHA");
  const base = {
    name: driftNode.name,
    transport: driftNode.transport,
    source_head: driftNode.head,
    source_tree: processNode?.source_tree ?? null,
    process_source_commit: processNode?.process_source_commit ?? null,
    process_source_tree: processNode?.process_source_tree ?? null,
    process_invocation_id: processNode?.process_invocation_id ?? null,
    process_start_epoch: processNode?.process_start_epoch ?? null,
    observed_at_epoch: processNode?.observed_at_epoch ?? null,
    source_drift_classification: driftNode.classification,
    source_relation: driftNode.comparison?.relation ?? null,
    process_freshness_classification: processNode?.classification ?? null,
  };

  if (coherenceProblems.length > 0) {
    return {
      ...base,
      status: "HOLD",
      reason: "source_process_evidence_not_coherent",
      coherence_problems: coherenceProblems,
    };
  }
  if (driftNode.classification === "HOLD") {
    return {
      ...base,
      status: "HOLD",
      reason: "upstream_source_drift_audit_hold",
      coherence_problems: [],
    };
  }
  if (!processNode || processNode.classification === "HOLD") {
    return {
      ...base,
      status: "HOLD",
      reason: "upstream_process_freshness_audit_hold",
      coherence_problems: [],
    };
  }
  if (
    processNode.process_source_identity_bound !== true ||
    !SHA_RE.test(processNode.process_source_commit ?? "") ||
    !SHA_RE.test(processNode.process_source_tree ?? "") ||
    !INVOCATION_RE.test(processNode.process_invocation_id ?? "")
  ) {
    return {
      ...base,
      status: "HOLD",
      reason: "process_identity_not_exact",
      coherence_problems: [],
    };
  }

  const runtimeCommit = processNode.process_source_commit;
  if (runtimeCommit !== approved) {
    return {
      ...base,
      status: "UNEXPECTED_RUNTIME_DRIFT",
      reason:
        runtimeCommit === canonical
          ? "runtime_advanced_to_current_main_outside_approved_pin"
          : "runtime_process_does_not_match_approved_pin",
      coherence_problems: [],
    };
  }
  if (approved === canonical) {
    return {
      ...base,
      status: "CURRENT_WITH_MAIN",
      reason: "approved_runtime_process_equals_canonical_main",
      coherence_problems: [],
    };
  }
  return {
    ...base,
    status: "HEALTHY_INTENTIONAL_PIN",
    reason: "healthy_process_identity_matches_explicit_approved_pin",
    coherence_problems: [],
  };
}

function buildStatus({
  driftAudit,
  processAudit,
  approvedRuntimeSha,
  driftAuditFileSha256,
  driftAuditMtimeEpochMs,
  processAuditFileSha256,
  processAuditMtimeEpochMs,
  evaluatedAtEpochMs,
  evidenceOutputCreated,
}) {
  const approved = assertSha(approvedRuntimeSha, "approved runtime SHA");
  const driftDigest = assertSha256(
    driftAuditFileSha256,
    "drift audit file SHA-256",
  );
  const processDigest = assertSha256(
    processAuditFileSha256,
    "process audit file SHA-256",
  );
  for (const [value, label] of [
    [driftAuditMtimeEpochMs, "driftAuditMtimeEpochMs"],
    [processAuditMtimeEpochMs, "processAuditMtimeEpochMs"],
    [evaluatedAtEpochMs, "evaluatedAtEpochMs"],
  ]) {
    if (!Number.isSafeInteger(value) || value < 0) {
      fail(`${label} must be a nonnegative safe integer`);
    }
  }
  assertBoolean(evidenceOutputCreated, "evidenceOutputCreated");

  const canonicalSha = driftAudit.canonical.sha;
  const globalProblems = evidenceCoherenceProblems(driftAudit, processAudit);
  const processByName = new Map(
    processAudit.nodes.map((node) => [node.name, node]),
  );
  const nodes = driftAudit.nodes.map((driftNode) => {
    const processNode = processByName.get(driftNode.name);
    const nodeProblems = globalProblems.filter(
      (problem) =>
        !problem.includes(":") || problem.endsWith(`:${driftNode.name}`),
    );
    return classifyRuntimePinNodeV1(
      driftNode,
      processNode,
      approved,
      canonicalSha,
      nodeProblems,
    );
  });

  let status;
  if (globalProblems.length > 0 || nodes.some((node) => node.status === "HOLD")) {
    status = "HOLD";
  } else if (
    nodes.some((node) => node.status === "UNEXPECTED_RUNTIME_DRIFT")
  ) {
    status = "UNEXPECTED_RUNTIME_DRIFT";
  } else if (nodes.every((node) => node.status === "CURRENT_WITH_MAIN")) {
    status = "CURRENT_WITH_MAIN";
  } else if (
    nodes.every((node) => node.status === "HEALTHY_INTENTIONAL_PIN")
  ) {
    status = "HEALTHY_INTENTIONAL_PIN";
  } else {
    status = "HOLD";
  }

  const nextGate = {
    CURRENT_WITH_MAIN: "no_runtime_action_required_by_this_packet",
    HEALTHY_INTENTIONAL_PIN:
      "preserve_pin_until_separately_authorized_rollout",
    UNEXPECTED_RUNTIME_DRIFT:
      "investigate_runtime_drift_before_any_rollout_or_restart",
    HOLD: "refresh_or_repair_evidence_before_any_runtime_action",
  }[status];

  const idMaterial = {
    marker: VOID_NODE_FLEET_RUNTIME_PIN_STATUS_V1,
    version: 1,
    approved_runtime_sha: approved,
    canonical_main_sha: canonicalSha,
    drift_audit_id_sha256: driftAudit.audit_id_sha256,
    drift_audit_file_sha256: driftDigest,
    process_freshness_audit_id_sha256: processAudit.audit_id_sha256,
    process_freshness_audit_file_sha256: processDigest,
    status,
    coherence_problems: globalProblems,
    nodes,
  };

  return deepFreeze({
    marker: VOID_NODE_FLEET_RUNTIME_PIN_STATUS_V1,
    version: 1,
    approved_runtime_sha: approved,
    canonical_main_sha: canonicalSha,
    drift_audit_id_sha256: driftAudit.audit_id_sha256,
    drift_audit_file_sha256: driftDigest,
    drift_audit_mtime_epoch_ms: driftAuditMtimeEpochMs,
    process_freshness_audit_id_sha256: processAudit.audit_id_sha256,
    process_freshness_audit_file_sha256: processDigest,
    process_freshness_audit_mtime_epoch_ms: processAuditMtimeEpochMs,
    evaluated_at_epoch_ms: evaluatedAtEpochMs,
    status,
    next_gate: nextGate,
    status_id_sha256: sha256Stable(idMaterial),
    coherence_problems: globalProblems,
    nodes,
    source_drift_decision: driftAudit.decision,
    process_freshness_decision: processAudit.decision,
    mutation_attempted: false,
    evidence_output_created: evidenceOutputCreated,
    authority: {
      source_evidence_read_only: true,
      process_identity_evidence_read_only: true,
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

export function buildFleetRuntimePinStatusV1({
  audit,
  processAudit,
  approvedRuntimeSha,
  sourceAuditFileSha256,
  sourceAuditMtimeEpochMs,
  processAuditFileSha256,
  processAuditMtimeEpochMs,
  evaluatedAtEpochMs = Date.now(),
  evidenceOutputCreated = false,
}) {
  validateFleetDriftAuditV1(audit);
  validateFleetProcessFreshnessAuditV1(processAudit);
  return buildStatus({
    driftAudit: audit,
    processAudit,
    approvedRuntimeSha,
    driftAuditFileSha256: sourceAuditFileSha256,
    driftAuditMtimeEpochMs: sourceAuditMtimeEpochMs,
    processAuditFileSha256,
    processAuditMtimeEpochMs,
    evaluatedAtEpochMs,
    evidenceOutputCreated,
  });
}

function readFreshJsonEvidenceV1(
  pathInput,
  label,
  maxAgeSeconds,
  validator,
  checkEmbeddedProcessAge = false,
) {
  const path = expandHome(assertString(pathInput, `${label} path`));
  if (
    !Number.isSafeInteger(maxAgeSeconds) ||
    maxAgeSeconds < 1 ||
    maxAgeSeconds > MAX_EVIDENCE_AGE_SECONDS
  ) {
    fail(`max evidence age must be 1..${MAX_EVIDENCE_AGE_SECONDS} seconds`);
  }
  const flags =
    fsConstants.O_RDONLY |
    (fsConstants.O_NOFOLLOW ?? 0) |
    (fsConstants.O_NONBLOCK ?? 0);
  let fd;
  try {
    fd = openSync(path, flags);
    const before = fstatSync(fd, { bigint: false });
    if (!before.isFile()) fail(`${label} evidence must be a regular file`);
    if (before.size < 2 || before.size > MAX_EVIDENCE_BYTES) {
      fail(
        `${label} evidence size must be 2..${MAX_EVIDENCE_BYTES} bytes`,
      );
    }
    const rawBuffer = readFileSync(fd);
    const after = fstatSync(fd, { bigint: false });
    if (
      before.size !== after.size ||
      before.mtimeMs !== after.mtimeMs ||
      before.ctimeMs !== after.ctimeMs
    ) {
      fail(`${label} evidence changed while being read`);
    }
    const nowMs = Date.now();
    if (after.mtimeMs > nowMs + 5_000) {
      fail(`${label} evidence modification time is in the future`);
    }
    const ageMs = Math.max(0, nowMs - after.mtimeMs);
    if (ageMs > maxAgeSeconds * 1_000) {
      fail(`${label} evidence is stale`);
    }
    let audit;
    try {
      audit = JSON.parse(rawBuffer.toString("utf8"));
    } catch {
      fail(`${label} evidence is not valid JSON`);
    }
    validator(audit);
    if (checkEmbeddedProcessAge) {
      for (const node of audit.nodes) {
        if (!Number.isSafeInteger(node.observed_at_epoch)) {
          if (node.classification !== "HOLD") {
            fail(`${node.name}.process observation time is unavailable`);
          }
          continue;
        }
        const observedMs = node.observed_at_epoch * 1_000;
        if (observedMs > nowMs + 5_000) {
          fail(`${node.name}.process observation time is in the future`);
        }
        if (nowMs - observedMs > maxAgeSeconds * 1_000) {
          fail(`${node.name}.process observation is stale`);
        }
      }
    }
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

export function readFreshFleetDriftAuditV1(
  pathInput,
  maxAgeSeconds = DEFAULT_MAX_EVIDENCE_AGE_SECONDS,
) {
  return readFreshJsonEvidenceV1(
    pathInput,
    "drift audit",
    maxAgeSeconds,
    validateFleetDriftAuditV1,
    false,
  );
}

export function readFreshFleetProcessAuditV1(
  pathInput,
  maxAgeSeconds = DEFAULT_MAX_EVIDENCE_AGE_SECONDS,
) {
  return readFreshJsonEvidenceV1(
    pathInput,
    "process freshness audit",
    maxAgeSeconds,
    validateFleetProcessFreshnessAuditV1,
    true,
  );
}

function parseUnpaddedInteger(value, label) {
  if (!/^(?:0|[1-9][0-9]*)$/.test(String(value ?? ""))) {
    fail(`${label} must be an unpadded integer`);
  }
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed)) {
    fail(`${label} is outside the safe integer range`);
  }
  return parsed;
}

function parseArgs(argv) {
  const out = {
    driftAudit: "",
    processAudit: "",
    approvedRuntimeSha: "",
    maxEvidenceAgeSeconds: DEFAULT_MAX_EVIDENCE_AGE_SECONDS,
    output: "",
  };
  const seen = new Set();
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help") {
      console.log(
        "Usage: node tools/void-node-fleet-runtime-pin-status-v1.mjs --drift-audit PATH --process-freshness-audit PATH --approved-runtime-sha SHA [--max-evidence-age-seconds N] [--output PATH]",
      );
      process.exit(0);
    }
    if (
      ![
        "--drift-audit",
        "--process-freshness-audit",
        "--approved-runtime-sha",
        "--max-evidence-age-seconds",
        "--output",
      ].includes(arg)
    ) {
      fail(`unknown argument: ${arg}`);
    }
    if (seen.has(arg)) fail(`duplicate argument: ${arg}`);
    seen.add(arg);
    const value = argv[++index];
    if (value === undefined) fail(`missing value for ${arg}`);
    if (arg === "--drift-audit") out.driftAudit = value;
    else if (arg === "--process-freshness-audit") out.processAudit = value;
    else if (arg === "--approved-runtime-sha") out.approvedRuntimeSha = value;
    else if (arg === "--max-evidence-age-seconds") {
      out.maxEvidenceAgeSeconds = parseUnpaddedInteger(
        value,
        "max evidence age",
      );
    } else if (arg === "--output") out.output = value;
  }
  if (!out.driftAudit) fail("--drift-audit is required");
  if (!out.processAudit) fail("--process-freshness-audit is required");
  if (!out.approvedRuntimeSha) fail("--approved-runtime-sha is required");
  return out;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const drift = readFreshFleetDriftAuditV1(
    args.driftAudit,
    args.maxEvidenceAgeSeconds,
  );
  const processEvidence = readFreshFleetProcessAuditV1(
    args.processAudit,
    args.maxEvidenceAgeSeconds,
  );
  const packet = buildFleetRuntimePinStatusV1({
    audit: drift.audit,
    processAudit: processEvidence.audit,
    approvedRuntimeSha: args.approvedRuntimeSha,
    sourceAuditFileSha256: drift.file_sha256,
    sourceAuditMtimeEpochMs: drift.mtime_epoch_ms,
    processAuditFileSha256: processEvidence.file_sha256,
    processAuditMtimeEpochMs: processEvidence.mtime_epoch_ms,
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
  process.exitCode = ["HOLD", "UNEXPECTED_RUNTIME_DRIFT"].includes(
    packet.status,
  )
    ? 2
    : 0;
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
