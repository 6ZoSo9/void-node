#!/usr/bin/env node
import { createHash } from "node:crypto";
import { chmodSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  VOID_NODE_FLEET_PROCESS_FRESHNESS_AUDIT_V1,
  buildFleetProcessFreshnessDecisionV1,
  validateProcessFreshnessConfigV1,
} from "./void-node-fleet-process-freshness-audit-v1.mjs";
import {
  VOID_NODE_FLEET_PROCESS_RESTART_CONTROLLER_V1,
  buildRestartPlanV1,
  inspectRestartTransitionV1,
  validateProcessFreshnessAuditV1,
  validateSourceConvergenceReceiptV1,
} from "./void-node-fleet-process-restart-controller-v1.mjs";
import { validateFleetConfigV1 } from "./void-node-fleet-source-convergence-v1.mjs";

export const VOID_NODE_FLEET_PROCESS_RESTART_ROLLOUT_V1 = "VOID_NODE_FLEET_PROCESS_RESTART_ROLLOUT_V1";
export const VOID_NODE_FLEET_PROCESS_RESTART_ROLLOUT_STATE_V1 = "VOID_NODE_FLEET_PROCESS_RESTART_ROLLOUT_STATE_V1";
export const VOID_NODE_FLEET_PROCESS_RESTART_ROLLOUT_ADVANCE_V1 = "VOID_NODE_FLEET_PROCESS_RESTART_ROLLOUT_ADVANCE_V1";

const SHA40_RE = /^[0-9a-f]{40}$/;
const SHA64_RE = /^[0-9a-f]{64}$/;
const DEFAULT_MAX_CURRENT_AUDIT_AGE_SECONDS = 300;
const PROCESS_ENTRYPOINT_V1 = "src/index.ts";
const FRESHNESS_AUTHORITY_V1 = {
  git_mutation: false,
  package_install: false,
  build: false,
  service_stop: false,
  service_start_or_restart: false,
  deployment: false,
  credential_read: false,
  wallet_or_signer: false,
  transaction: false,
  funds_moved: false,
};
const SUCCESSFUL_RESTART_AUTHORITY_V1 = {
  git_mutation: false,
  package_install: false,
  build: false,
  service_stop: false,
  service_start_or_restart_attempted: true,
  service_restart_proven: true,
  network_configuration: false,
  credential_material_exposed: false,
  wallet_or_signer: false,
  transaction: false,
  funds_moved: false,
};

function fail(message) {
  const error = new Error(message);
  error.name = "VoidFleetProcessRestartRolloutError";
  throw error;
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function sha256(value) {
  return createHash("sha256").update(typeof value === "string" ? value : stableJson(value)).digest("hex");
}

function exactObject(value, expected, label) {
  if (!value || stableJson(value) !== stableJson(expected)) fail(`${label} does not match the exact v1 contract`);
}

function exactKeys(value, expected, label) {
  if (!value || typeof value !== "object" || Array.isArray(value) ||
      stableJson(Object.keys(value).sort()) !== stableJson([...expected].sort())) {
    fail(`${label} keys do not match the exact v1 contract`);
  }
}

function assertSha40(value, label) {
  if (!SHA40_RE.test(String(value ?? ""))) fail(`${label} must be lowercase 40-hex`);
  return String(value);
}

function assertSha64(value, label) {
  if (!SHA64_RE.test(String(value ?? ""))) fail(`${label} must be lowercase 64-hex`);
  return String(value);
}

function assertSafePath(value, label) {
  if (typeof value !== "string" || value.length === 0 || /[^\x20-\x7e]/.test(value)) {
    fail(`${label} must be a non-empty printable path`);
  }
  if (value !== "~" && !value.startsWith("~/") && !value.startsWith("/")) {
    fail(`${label} must be absolute or begin with ~/`);
  }
  return value;
}

function expandHome(value) {
  if (value === "~") return homedir();
  if (value.startsWith("~/")) return resolve(homedir(), value.slice(2));
  return value;
}

function assertFreshPath(path, label, maxAgeSeconds) {
  const ageSeconds = (Date.now() - statSync(path).mtimeMs) / 1000;
  if (ageSeconds < -5) fail(`${label} file timestamp is in the future`);
  if (ageSeconds > maxAgeSeconds) fail(`${label} file is stale (${Math.floor(ageSeconds)}s old)`);
}

function readJson(path, label) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    fail(`${label} is not valid JSON: ${String(error?.message || error)}`);
  }
}

function extractState(input) {
  if (input?.marker === VOID_NODE_FLEET_PROCESS_RESTART_ROLLOUT_STATE_V1) return input;
  if (input?.marker === VOID_NODE_FLEET_PROCESS_RESTART_ROLLOUT_V1 && input?.state) return input.state;
  fail(`state input must contain ${VOID_NODE_FLEET_PROCESS_RESTART_ROLLOUT_STATE_V1}`);
}

function validateGreenNode(node, label) {
  if (!node || typeof node !== "object") fail(`${label} must be an object`);
  exactKeys(node, [
    "name", "reachable", "source_head", "source_branch", "dirty_count", "worktree_status_readable",
    "source_stable", "service_active", "process_present", "process_cwd_matches_repo", "process_entrypoint",
    "process_entrypoint_matches", "process_executable_node", "process_identity_stable", "head_transition_epoch",
    "process_start_epoch", "observed_at_epoch", "health_ok", "readiness_ok", "classification", "reasons",
    "source_to_process_start_seconds", "version_git_commit_matches_source_head_diagnostic_only",
  ], label);
  if (!new Set(["PROCESS_SOURCE_ALIGNED", "STALE_SOURCE_AFTER_PROCESS_START"]).has(node.classification)) {
    fail(`${label} classification must be aligned or stale`);
  }
  if (!Array.isArray(node.reasons) || node.reasons.length !== 0) fail(`${label} must have no reasons`);
  if (node.reachable !== true || node.source_branch !== "main" || node.dirty_count !== 0 ||
      node.worktree_status_readable !== true || node.source_stable !== true || node.service_active !== true ||
      node.process_present !== true || node.process_cwd_matches_repo !== true ||
      node.process_entrypoint !== PROCESS_ENTRYPOINT_V1 || node.process_entrypoint_matches !== true ||
      node.process_executable_node !== true || node.process_identity_stable !== true ||
      node.health_ok !== true || node.readiness_ok !== true) {
    fail(`${label} is not exact green process evidence`);
  }
  const sourceSha = assertSha40(node.source_head, `${label}.source_head`);
  for (const [value, field] of [
    [node.head_transition_epoch, "head_transition_epoch"],
    [node.process_start_epoch, "process_start_epoch"],
    [node.observed_at_epoch, "observed_at_epoch"],
  ]) {
    if (!Number.isSafeInteger(value) || value < 1) fail(`${label}.${field} must be a positive safe integer`);
  }
  const delta = node.process_start_epoch - node.head_transition_epoch;
  if (node.process_start_epoch > node.observed_at_epoch + 5) fail(`${label} process start is in the future`);
  if (node.head_transition_epoch > node.observed_at_epoch + 5) fail(`${label} source transition is in the future`);
  if (node.source_to_process_start_seconds !== delta) fail(`${label} timestamp delta is inconsistent`);
  if (typeof node.version_git_commit_matches_source_head_diagnostic_only !== "boolean") {
    fail(`${label} version diagnostic must be boolean`);
  }
  if (node.classification === "PROCESS_SOURCE_ALIGNED" && delta < 1) fail(`${label} aligned ordering is not proven`);
  if (node.classification === "STALE_SOURCE_AFTER_PROCESS_START" && delta > -1) fail(`${label} stale ordering is not proven`);
  return { sourceSha, delta };
}

export function validateFullFreshnessAuditV1(audit, configInput, options = {}) {
  if (!audit || audit.marker !== VOID_NODE_FLEET_PROCESS_FRESHNESS_AUDIT_V1 || audit.version !== 1) {
    fail(`freshness marker/version must be ${VOID_NODE_FLEET_PROCESS_FRESHNESS_AUDIT_V1}/1`);
  }
  if (!new Set(["PROCESS_FRESH", "RESTART_REQUIRED"]).has(audit.decision)) {
    fail("full-fleet freshness audit must contain no HOLD node");
  }
  exactKeys(audit, [
    "marker", "version", "decision", "audit_id_sha256", "expected_process_entrypoint", "nodes",
    "version_git_commit_is_process_identity", "mutation_attempted", "authority",
  ], "freshness audit");
  if (audit.expected_process_entrypoint !== PROCESS_ENTRYPOINT_V1 ||
      audit.version_git_commit_is_process_identity !== false || audit.mutation_attempted !== false) {
    fail("freshness audit process/runtime truth is invalid");
  }
  exactObject(audit.authority, FRESHNESS_AUTHORITY_V1, "freshness authority");
  const configNodes = validateProcessFreshnessConfigV1(configInput);
  if (!Array.isArray(audit.nodes) || audit.nodes.length !== configNodes.length) {
    fail("freshness audit must cover every configured node exactly once");
  }
  const nowSeconds = (options.nowMs ?? Date.now()) / 1000;
  const enforceAge = options.enforceAge !== false;
  const maxAgeSeconds = options.maxAgeSeconds ?? DEFAULT_MAX_CURRENT_AUDIT_AGE_SECONDS;
  let sourceSha = "";
  for (let index = 0; index < audit.nodes.length; index += 1) {
    const node = audit.nodes[index];
    if (node?.name !== configNodes[index].name) fail("freshness audit node order must exactly match config order");
    const validated = validateGreenNode(node, `freshness.nodes[${index}]`);
    if (!sourceSha) sourceSha = validated.sourceSha;
    if (validated.sourceSha !== sourceSha) fail("freshness audit nodes do not share one exact source SHA");
    if (enforceAge) {
      const age = nowSeconds - node.observed_at_epoch;
      if (age < -5) fail(`${node.name} freshness observation is in the future`);
      if (age > maxAgeSeconds) fail(`${node.name} freshness observation is stale (${Math.floor(age)}s old)`);
    }
  }
  const reproduced = buildFleetProcessFreshnessDecisionV1(audit.nodes);
  const auditId = assertSha64(audit.audit_id_sha256, "freshness audit ID");
  if (reproduced.decision !== audit.decision || reproduced.audit_id_sha256 !== auditId) {
    fail("freshness audit decision or ID does not match normalized content");
  }
  return {
    audit,
    audit_id_sha256: auditId,
    decision: audit.decision,
    source_sha: sourceSha,
    node_order: configNodes.map((node) => node.name),
    stale_order: audit.nodes.filter((node) => node.classification === "STALE_SOURCE_AFTER_PROCESS_START").map((node) => node.name),
  };
}

function stateDigestPayload(state) {
  return {
    marker: VOID_NODE_FLEET_PROCESS_RESTART_ROLLOUT_STATE_V1,
    version: 1,
    baseline_audit: state.baseline_audit,
    baseline_audit_id_sha256: state.baseline_audit_id_sha256,
    source_sha: state.source_sha,
    node_order: state.node_order,
    stale_order: state.stale_order,
    completed: state.completed,
  };
}

function sealState(state) {
  const next = stateDigestPayload(state);
  return { ...next, state_id_sha256: sha256(next) };
}

export function createRolloutStateV1(baselineAudit, configInput, options = {}) {
  const baseline = validateFullFreshnessAuditV1(baselineAudit, configInput, options);
  return sealState({
    marker: VOID_NODE_FLEET_PROCESS_RESTART_ROLLOUT_STATE_V1,
    version: 1,
    baseline_audit: baseline.audit,
    baseline_audit_id_sha256: baseline.audit_id_sha256,
    source_sha: baseline.source_sha,
    node_order: baseline.node_order,
    stale_order: baseline.stale_order,
    completed: [],
  });
}

export function validateRolloutStateV1(stateInput, configInput) {
  const state = extractState(stateInput);
  exactKeys(state, [
    "marker", "version", "baseline_audit", "baseline_audit_id_sha256", "source_sha", "node_order",
    "stale_order", "completed", "state_id_sha256",
  ], "rollout state");
  if (state.version !== 1) fail("rollout state version must be 1");
  const baseline = validateFullFreshnessAuditV1(state.baseline_audit, configInput, { enforceAge: false });
  if (state.baseline_audit_id_sha256 !== baseline.audit_id_sha256 || state.source_sha !== baseline.source_sha ||
      stableJson(state.node_order) !== stableJson(baseline.node_order) ||
      stableJson(state.stale_order) !== stableJson(baseline.stale_order)) {
    fail("rollout state baseline bindings are inconsistent");
  }
  if (!Array.isArray(state.completed) || state.completed.length > baseline.stale_order.length) {
    fail("rollout completed entries exceed the baseline stale set");
  }
  for (let index = 0; index < state.completed.length; index += 1) {
    const entry = state.completed[index];
    const expectedNode = baseline.stale_order[index];
    if (!entry || entry.sequence !== index + 1 || entry.node !== expectedNode) {
      fail("rollout completed entries must be the exact stale-node prefix");
    }
    exactKeys(entry, [
      "sequence", "node", "source_receipt_sha256", "restart_receipt_sha256", "source_plan_id_sha256",
      "restart_plan_id_sha256", "from_sha", "source_sha", "old_process_start_epoch", "new_process_start_epoch",
    ], `rollout completed[${index}]`);
    for (const [value, label] of [
      [entry.source_receipt_sha256, "source receipt digest"],
      [entry.restart_receipt_sha256, "restart receipt digest"],
      [entry.source_plan_id_sha256, "source plan ID"],
      [entry.restart_plan_id_sha256, "restart plan ID"],
    ]) assertSha64(value, label);
    assertSha40(entry.from_sha, "completed from SHA");
    if (entry.source_sha !== baseline.source_sha) fail("completed source SHA does not match rollout source");
    for (const [value, label] of [
      [entry.old_process_start_epoch, "completed old process start"],
      [entry.new_process_start_epoch, "completed new process start"],
    ]) {
      if (!Number.isSafeInteger(value) || value < 1) fail(`${label} must be a positive safe integer`);
    }
    if (entry.new_process_start_epoch <= entry.old_process_start_epoch) fail("completed entry does not prove a newer process");
  }
  const stateId = assertSha64(state.state_id_sha256, "rollout state ID");
  if (sha256(stateDigestPayload(state)) !== stateId) fail("rollout state ID does not match normalized content");
  return { state, baseline };
}

function nodeByName(audit, name) {
  const node = audit.nodes.find((entry) => entry.name === name);
  if (!node) fail(`freshness audit is missing node ${name}`);
  return node;
}

export function assessRolloutStateV1(validatedState, currentValidated, options = {}) {
  const { state, baseline } = validatedState;
  const current = currentValidated;
  const reasons = [];
  if (current.source_sha !== state.source_sha) reasons.push("fleet_source_sha_changed");
  if (stableJson(current.node_order) !== stableJson(state.node_order)) reasons.push("fleet_node_order_changed");
  const advancingNode = options.advancingNode ?? "";
  const expectedNext = state.stale_order[state.completed.length] ?? "";
  if (advancingNode && advancingNode !== expectedNext) reasons.push("advance_node_is_not_exact_next");
  const completedByName = new Map(state.completed.map((entry) => [entry.node, entry]));
  const baselineStale = new Set(state.stale_order);
  for (const name of state.node_order) {
    const before = nodeByName(baseline.audit, name);
    const now = nodeByName(current.audit, name);
    if (now.head_transition_epoch !== before.head_transition_epoch) reasons.push(`${name}:source_transition_epoch_changed`);
    const completed = completedByName.get(name);
    if (completed) {
      if (now.classification !== "PROCESS_SOURCE_ALIGNED") reasons.push(`${name}:completed_node_not_aligned`);
      if (now.process_start_epoch !== completed.new_process_start_epoch) reasons.push(`${name}:completed_process_identity_changed`);
      continue;
    }
    if (!baselineStale.has(name)) {
      if (now.classification !== "PROCESS_SOURCE_ALIGNED" || now.process_start_epoch !== before.process_start_epoch) {
        reasons.push(`${name}:initially_aligned_process_changed`);
      }
      continue;
    }
    if (name === advancingNode) {
      if (now.classification !== "PROCESS_SOURCE_ALIGNED" || now.process_start_epoch <= before.process_start_epoch) {
        reasons.push(`${name}:advanced_restart_not_proven`);
      }
      continue;
    }
    if (now.classification !== "STALE_SOURCE_AFTER_PROCESS_START" || now.process_start_epoch !== before.process_start_epoch) {
      reasons.push(`${name}:pending_process_changed_without_receipt`);
    }
  }
  const completedAfter = state.completed.length + (advancingNode && reasons.length === 0 ? 1 : 0);
  const allComplete = completedAfter === state.stale_order.length;
  const expectedDecision = allComplete ? "PROCESS_FRESH" : "RESTART_REQUIRED";
  if (current.decision !== expectedDecision) reasons.push("current_fleet_decision_inconsistent_with_rollout");
  return {
    ok: reasons.length === 0,
    reasons: [...new Set(reasons)].sort(),
    next_node: reasons.length === 0 ? (state.stale_order[completedAfter] ?? null) : null,
    all_complete: reasons.length === 0 && allComplete,
  };
}

export function validateSuccessfulRestartReceiptV1(receipt, sourceReceipt, stateValidated, configInput, expectedNode) {
  if (!receipt || receipt.marker !== VOID_NODE_FLEET_PROCESS_RESTART_CONTROLLER_V1 || receipt.version !== 1) {
    fail(`restart receipt marker/version must be ${VOID_NODE_FLEET_PROCESS_RESTART_CONTROLLER_V1}/1`);
  }
  if (!new Set(["PROCESS_RESTARTED", "PROCESS_RESTARTED_RECOVERED_AFTER_TRANSPORT_FAILURE"]).has(receipt.outcome) ||
      receipt.mutation_attempted !== true || receipt.mutation_succeeded !== true || receipt.automatic_retry !== false ||
      receipt.fresh_evidence_required_before_retry !== false || receipt.runtime_transition_proven !== true ||
      !Array.isArray(receipt.reasons) || receipt.reasons.length !== 0) {
    fail("restart receipt does not prove one successful non-retried restart");
  }
  exactKeys(receipt, [
    "marker", "version", "outcome", "plan", "reasons", "mutation_attempted", "mutation_succeeded",
    "transport_exit_code", "automatic_retry", "fresh_evidence_required_before_retry",
    "runtime_transition_proven", "authority",
  ], "restart receipt");
  if (!Number.isInteger(receipt.transport_exit_code) && receipt.transport_exit_code !== null) {
    fail("restart receipt transport exit code is invalid");
  }
  exactObject(receipt.authority, SUCCESSFUL_RESTART_AUTHORITY_V1, "restart receipt authority");
  exactKeys(sourceReceipt, [
    "marker", "version", "outcome", "plan", "reasons", "mutation_attempted", "mutation_succeeded",
    "transport_exit_code", "automatic_retry", "fresh_audit_required_before_retry", "runtime_restarted",
    "runtime_deployment_claimed", "authority",
  ], "source convergence receipt");
  if (sourceReceipt.fresh_audit_required_before_retry !== false ||
      (!Number.isInteger(sourceReceipt.transport_exit_code) && sourceReceipt.transport_exit_code !== null)) {
    fail("source convergence receipt completion truth is invalid");
  }
  const config = validateFleetConfigV1(configInput, expectedNode);
  const source = validateSourceConvergenceReceiptV1(sourceReceipt, config, expectedNode);
  const freshness = validateProcessFreshnessAuditV1(
    stateValidated.baseline.audit,
    expectedNode,
    stateValidated.state.source_sha,
  );
  const transition = inspectRestartTransitionV1(config, source.from_sha, source.to_sha);
  if (!transition.ok) fail(`restart source transition is no longer exact: ${transition.reasons.join(",")}`);
  const expectedPlan = buildRestartPlanV1(source, freshness, transition, config);
  if (stableJson(receipt.plan) !== stableJson(expectedPlan)) fail("restart receipt plan does not match reproduced exact plan");
  return {
    source,
    plan: expectedPlan,
    source_receipt_sha256: sha256(sourceReceipt),
    restart_receipt_sha256: sha256(receipt),
  };
}

export function advanceRolloutStateV1(stateValidated, currentValidated, sourceReceipt, restartReceipt, configInput) {
  const expectedNode = stateValidated.state.stale_order[stateValidated.state.completed.length] ?? "";
  if (!expectedNode) fail("rollout has no remaining node to advance");
  const assessment = assessRolloutStateV1(stateValidated, currentValidated, { advancingNode: expectedNode });
  if (!assessment.ok) fail(`rollout advance is not safe: ${assessment.reasons.join(",")}`);
  const receipt = validateSuccessfulRestartReceiptV1(
    restartReceipt,
    sourceReceipt,
    stateValidated,
    configInput,
    expectedNode,
  );
  const currentNode = nodeByName(currentValidated.audit, expectedNode);
  const completion = {
    sequence: stateValidated.state.completed.length + 1,
    node: expectedNode,
    source_receipt_sha256: receipt.source_receipt_sha256,
    restart_receipt_sha256: receipt.restart_receipt_sha256,
    source_plan_id_sha256: receipt.source.source_plan_id_sha256,
    restart_plan_id_sha256: receipt.plan.plan_id_sha256,
    from_sha: receipt.source.from_sha,
    source_sha: receipt.source.to_sha,
    old_process_start_epoch: receipt.plan.old_process_start_epoch,
    new_process_start_epoch: currentNode.process_start_epoch,
  };
  const nextState = sealState({ ...stateValidated.state, completed: [...stateValidated.state.completed, completion] });
  return { state: nextState, assessment, completion };
}

export function validateAdvanceConfirmationsV1(args, state, expectedNode, restartReceipt) {
  if (args.confirmOperation !== VOID_NODE_FLEET_PROCESS_RESTART_ROLLOUT_ADVANCE_V1) fail("exact operation confirmation mismatch");
  if (args.confirmStateId !== state.state_id_sha256) fail("exact rollout state ID confirmation mismatch");
  if (args.confirmNode !== expectedNode) fail("exact next-node confirmation mismatch");
  if (args.confirmRestartPlanId !== restartReceipt?.plan?.plan_id_sha256) fail("exact restart plan ID confirmation mismatch");
  return true;
}

function parseValue(argv, index, label) {
  const value = argv[index + 1];
  if (!value || value.startsWith("--")) fail(`${label} requires a value`);
  return value;
}

function parseArgs(argv) {
  const out = {
    config: "~/.config/void/node-fleet-drift-audit-v1.json",
    baselineAudit: "",
    state: "",
    currentAudit: "~/.config/void/node-fleet-process-freshness-audit-result-v1.json",
    sourceReceipt: "",
    restartReceipt: "",
    output: "",
    maxCurrentAuditAgeSeconds: DEFAULT_MAX_CURRENT_AUDIT_AGE_SECONDS,
    confirmOperation: "",
    confirmStateId: "",
    confirmNode: "",
    confirmRestartPlanId: "",
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--config") out.config = parseValue(argv, index++, arg);
    else if (arg === "--baseline-audit") out.baselineAudit = parseValue(argv, index++, arg);
    else if (arg === "--state") out.state = parseValue(argv, index++, arg);
    else if (arg === "--current-audit") out.currentAudit = parseValue(argv, index++, arg);
    else if (arg === "--advance-source-convergence-receipt") out.sourceReceipt = parseValue(argv, index++, arg);
    else if (arg === "--advance-restart-receipt") out.restartReceipt = parseValue(argv, index++, arg);
    else if (arg === "--output") out.output = parseValue(argv, index++, arg);
    else if (arg === "--max-current-audit-age-seconds") out.maxCurrentAuditAgeSeconds = Number.parseInt(parseValue(argv, index++, arg), 10);
    else if (arg === "--confirm-operation") out.confirmOperation = parseValue(argv, index++, arg);
    else if (arg === "--confirm-state-id") out.confirmStateId = parseValue(argv, index++, arg);
    else if (arg === "--confirm-node") out.confirmNode = parseValue(argv, index++, arg);
    else if (arg === "--confirm-restart-plan-id") out.confirmRestartPlanId = parseValue(argv, index++, arg);
    else if (arg === "--help") {
      console.log("Usage: node tools/void-node-fleet-process-restart-rollout-v1.mjs (--baseline-audit PATH | --state PATH) [--current-audit PATH] [--advance-source-convergence-receipt PATH --advance-restart-receipt PATH plus exact confirmations] [--output NEW_PATH]");
      process.exit(0);
    } else fail(`unknown argument: ${arg}`);
  }
  if (Boolean(out.baselineAudit) === Boolean(out.state)) fail("provide exactly one of --baseline-audit or --state");
  if (Boolean(out.sourceReceipt) !== Boolean(out.restartReceipt)) fail("advance requires both source and restart receipts");
  if (out.sourceReceipt && !out.state) fail("advance requires an existing rollout state");
  if (!Number.isInteger(out.maxCurrentAuditAgeSeconds) || out.maxCurrentAuditAgeSeconds < 1 || out.maxCurrentAuditAgeSeconds > 3600) {
    fail("--max-current-audit-age-seconds must be 1..3600");
  }
  return out;
}

function authorityState(advanced) {
  return {
    rollout_evidence_state_advanced: advanced,
    git_mutation: false,
    package_install: false,
    build: false,
    service_stop: false,
    service_start_or_restart: false,
    deployment: false,
    network_configuration: false,
    credential_material_exposed: false,
    wallet_or_signer: false,
    transaction: false,
    funds_moved: false,
  };
}

function emit(output, path = "") {
  const json = `${JSON.stringify(output, null, 2)}\n`;
  if (path) {
    const outputPath = expandHome(assertSafePath(path, "output path"));
    writeFileSync(outputPath, json, { encoding: "utf8", mode: 0o600, flag: "wx" });
    chmodSync(outputPath, 0o600);
  }
  process.stdout.write(json);
}

function resultFor(state, current, assessment, advanced) {
  const outcome = assessment.ok
    ? (assessment.all_complete ? "FLEET_PROCESS_FRESH" : "NEXT_RESTART_READY")
    : "HOLD";
  return {
    marker: VOID_NODE_FLEET_PROCESS_RESTART_ROLLOUT_V1,
    version: 1,
    outcome,
    state,
    current_audit_id_sha256: current.audit_id_sha256,
    next_node: assessment.next_node,
    reasons: assessment.reasons,
    mutation_attempted: false,
    automatic_retry: false,
    restart_command_invoked: false,
    authority: authorityState(advanced),
  };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const configPath = expandHome(assertSafePath(args.config, "config path"));
  const currentPath = expandHome(assertSafePath(args.currentAudit, "current audit path"));
  assertFreshPath(currentPath, "current freshness audit", args.maxCurrentAuditAgeSeconds);
  const configInput = readJson(configPath, "config");
  const currentAudit = readJson(currentPath, "current freshness audit");
  const current = validateFullFreshnessAuditV1(currentAudit, configInput, {
    maxAgeSeconds: args.maxCurrentAuditAgeSeconds,
  });
  let stateValidated;
  if (args.baselineAudit) {
    const baselinePath = expandHome(assertSafePath(args.baselineAudit, "baseline audit path"));
    assertFreshPath(baselinePath, "baseline freshness audit", args.maxCurrentAuditAgeSeconds);
    const state = createRolloutStateV1(readJson(baselinePath, "baseline freshness audit"), configInput, {
      maxAgeSeconds: args.maxCurrentAuditAgeSeconds,
    });
    stateValidated = validateRolloutStateV1(state, configInput);
  } else {
    stateValidated = validateRolloutStateV1(
      readJson(expandHome(assertSafePath(args.state, "state path")), "rollout state"),
      configInput,
    );
  }

  let state = stateValidated.state;
  let advanced = false;
  let assessment;
  if (args.sourceReceipt) {
    const sourceReceipt = readJson(
      expandHome(assertSafePath(args.sourceReceipt, "source convergence receipt path")),
      "source convergence receipt",
    );
    const restartReceipt = readJson(
      expandHome(assertSafePath(args.restartReceipt, "restart receipt path")),
      "restart receipt",
    );
    const expectedNode = state.stale_order[state.completed.length] ?? "";
    validateAdvanceConfirmationsV1(args, state, expectedNode, restartReceipt);
    const advancedState = advanceRolloutStateV1(
      stateValidated,
      current,
      sourceReceipt,
      restartReceipt,
      configInput,
    );
    state = advancedState.state;
    advanced = true;
    stateValidated = validateRolloutStateV1(state, configInput);
    assessment = assessRolloutStateV1(stateValidated, current);
  } else {
    assessment = assessRolloutStateV1(stateValidated, current);
  }
  const output = resultFor(state, current, assessment, advanced);
  emit(output, args.output);
  if (output.outcome === "HOLD") process.exitCode = 2;
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : "";
if (invokedPath && fileURLToPath(import.meta.url) === invokedPath) {
  try {
    main();
  } catch (error) {
    console.error(JSON.stringify({
      marker: VOID_NODE_FLEET_PROCESS_RESTART_ROLLOUT_V1,
      outcome: "HOLD",
      error: String(error?.message || error),
      mutation_attempted: false,
      automatic_retry: false,
      restart_command_invoked: false,
    }));
    process.exitCode = 1;
  }
}
