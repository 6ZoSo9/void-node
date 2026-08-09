#!/usr/bin/env node
import { createHash } from "node:crypto";
import { chmodSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  VOID_NODE_FLEET_SOURCE_CONVERGENCE_V1,
  VOID_NODE_FLEET_SOURCE_CONVERGENCE_PLAN_V1,
  validateFleetConfigV1,
} from "./void-node-fleet-source-convergence-v1.mjs";
import {
  VOID_NODE_FLEET_PROCESS_FRESHNESS_AUDIT_V1,
  buildFleetProcessFreshnessDecisionV1,
  buildProcessFreshnessCollectorScriptV1,
  classifyProcessFreshnessV1,
  parseProcessFreshnessCollectorOutputV1,
} from "./void-node-fleet-process-freshness-audit-v1.mjs";

export const VOID_NODE_FLEET_PROCESS_RESTART_CONTROLLER_V1 = "VOID_NODE_FLEET_PROCESS_RESTART_CONTROLLER_V1";
export const VOID_NODE_FLEET_PROCESS_RESTART_PLAN_V1 = "VOID_NODE_FLEET_PROCESS_RESTART_PLAN_V1";
export const VOID_NODE_FLEET_PROCESS_RESTART_APPLY_V1 = "VOID_NODE_FLEET_PROCESS_RESTART_APPLY_V1";

const SHA40_RE = /^[0-9a-f]{40}$/;
const SHA64_RE = /^[0-9a-f]{64}$/;
const NAME_RE = /^[a-z0-9][a-z0-9._-]{0,63}$/i;
const MAX_OUTPUT_BYTES = 4 * 1024 * 1024;
const DEFAULT_MAX_EVIDENCE_AGE_SECONDS = 300;
const DEFAULT_POSTCHECK_SECONDS = 30;
const PROCESS_ENTRYPOINT_V1 = "src/index.ts";

function fail(message) {
  const error = new Error(message);
  error.name = "VoidFleetProcessRestartControllerError";
  throw error;
}

function assertExactString(value, label) {
  if (typeof value !== "string" || value.length === 0) fail(`${label} must be a non-empty string`);
  if (/[^\x20-\x7e]/.test(value)) fail(`${label} contains a control or non-ASCII character`);
  return value;
}

function assertSafePath(value, label) {
  const path = assertExactString(value, label);
  if (path !== "~" && !path.startsWith("~/") && !path.startsWith("/")) {
    fail(`${label} must be absolute or begin with ~/`);
  }
  return path;
}

function assertSha40(value, label) {
  if (!SHA40_RE.test(String(value ?? ""))) fail(`${label} must be lowercase 40-hex`);
  return String(value);
}

function assertSha64(value, label) {
  if (!SHA64_RE.test(String(value ?? ""))) fail(`${label} must be lowercase 64-hex`);
  return String(value);
}

function expandHome(value) {
  if (value === "~") return homedir();
  if (value.startsWith("~/")) return resolve(homedir(), value.slice(2));
  return value;
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

function bashLiteral(value) {
  return `'${String(value).replaceAll("'", `'\\''`)}'`;
}

function bashPathExpression(value) {
  const path = assertSafePath(value, "node repo");
  if (path === "~") return '"$HOME"';
  if (path.startsWith("~/")) return `"$HOME"/${bashLiteral(path.slice(2))}`;
  return bashLiteral(path);
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd,
    encoding: "utf8",
    input: options.input,
    timeout: options.timeoutMs ?? 20_000,
    maxBuffer: MAX_OUTPUT_BYTES,
    env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
  });
  return {
    ok: result.status === 0 && !result.error,
    status: result.status,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
    error: result.error ? String(result.error.message || result.error) : "",
  };
}

function transportRun(config, script, timeoutMs) {
  if (config.node.transport === "local") return run("bash", ["-s"], { input: script, timeoutMs });
  return run("ssh", [
    "-o", "BatchMode=yes",
    "-o", `ConnectTimeout=${config.node.connect_timeout_seconds}`,
    config.node.ssh_target,
    "bash", "-s",
  ], { input: script, timeoutMs });
}

function decodeBase64Json(value) {
  if (!value) return { ok: false, value: null };
  try {
    return { ok: true, value: JSON.parse(Buffer.from(value, "base64").toString("utf8")) };
  } catch (error) {
    return { ok: false, value: null, error: String(error?.message || error) };
  }
}

function peerCount(peers) {
  if (Array.isArray(peers)) return peers.length;
  if (peers && Array.isArray(peers.connected)) return peers.connected.length;
  if (peers && Array.isArray(peers.peers)) return peers.peers.length;
  return 0;
}

function fieldsFromOutput(stdout) {
  const fields = new Map();
  for (const line of stdout.split(/\r?\n/)) {
    const tab = line.indexOf("\t");
    if (tab > 0) fields.set(line.slice(0, tab), line.slice(tab + 1));
  }
  return fields;
}

function authorityOnlyFalse(authority, label) {
  if (!authority || typeof authority !== "object" || Array.isArray(authority) || Object.keys(authority).length === 0) {
    fail(`${label} must be a non-empty object`);
  }
  if (Object.values(authority).some((value) => value !== false)) fail(`${label} must contain only false values`);
}

export function validateSourceConvergenceReceiptV1(receipt, config, selectedNode) {
  if (!receipt || receipt.marker !== VOID_NODE_FLEET_SOURCE_CONVERGENCE_V1 || receipt.version !== 1) {
    fail(`source convergence marker/version must be ${VOID_NODE_FLEET_SOURCE_CONVERGENCE_V1}/1`);
  }
  if (!new Set(["SOURCE_SYNCED", "SOURCE_SYNCED_RECOVERED_AFTER_TRANSPORT_FAILURE"]).has(receipt.outcome)) {
    fail("source convergence outcome must prove SOURCE_SYNCED");
  }
  if (receipt.mutation_attempted !== true || receipt.mutation_succeeded !== true || receipt.automatic_retry !== false ||
      receipt.runtime_restarted !== false || receipt.runtime_deployment_claimed !== false) {
    fail("source convergence receipt mutation/runtime truth is invalid");
  }
  if (!Array.isArray(receipt.reasons) || receipt.reasons.length !== 0) fail("source convergence receipt must have no reasons");
  const expectedAuthority = {
    git_fetch_attempted: true,
    git_fast_forward_proven: true,
    build: false,
    package_install: false,
    service_stop: false,
    service_start_or_restart: false,
    deployment: false,
    credential_material_exposed: false,
    wallet_or_signer: false,
    transaction: false,
    funds_moved: false,
  };
  if (!receipt.authority || stableJson(receipt.authority) !== stableJson(expectedAuthority)) {
    fail("source convergence authority does not match exact successful source-only authority");
  }

  const plan = receipt.plan;
  if (!plan || plan.marker !== VOID_NODE_FLEET_SOURCE_CONVERGENCE_PLAN_V1) fail("source convergence plan marker is invalid");
  if (plan.node !== selectedNode || plan.node !== config.node.name || plan.transport !== config.node.transport ||
      plan.remote !== config.node.git_remote || plan.branch !== config.canonical_branch ||
      plan.operation !== "source_fast_forward_only") {
    fail("source convergence plan does not match selected config");
  }
  const fromSha = assertSha40(plan.from_sha, "source convergence from SHA");
  const toSha = assertSha40(plan.to_sha, "source convergence target SHA");
  if (fromSha === toSha) fail("source convergence must bind a real source transition");
  const auditId = assertSha64(plan.audit_id_sha256, "source convergence audit ID");
  const planId = assertSha64(plan.plan_id_sha256, "source convergence plan ID");
  if (!new Set(["BEHIND_EVIDENCE_ONLY", "BEHIND_RUNTIME_RELEVANT"]).has(plan.classification)) {
    fail("source convergence classification is invalid");
  }
  if (!Number.isInteger(plan.commits_behind) || plan.commits_behind < 1 ||
      !Number.isInteger(plan.runtime_relevant_path_count) || plan.runtime_relevant_path_count < 0) {
    fail("source convergence counts are invalid");
  }
  const privatePayload = {
    marker: VOID_NODE_FLEET_SOURCE_CONVERGENCE_PLAN_V1,
    audit_id_sha256: auditId,
    node: config.node.name,
    transport: config.node.transport,
    ssh_target: config.node.ssh_target,
    repo: config.node.repo,
    remote: config.node.git_remote,
    expected_remote_url: config.node.expected_remote_url,
    branch: config.canonical_branch,
    from_sha: fromSha,
    to_sha: toSha,
    classification: plan.classification,
    commits_behind: plan.commits_behind,
    runtime_relevant_path_count: plan.runtime_relevant_path_count,
  };
  if (sha256(privatePayload) !== planId) fail("source convergence plan ID does not match exact config-bound content");
  return {
    outcome: receipt.outcome,
    source_audit_id_sha256: auditId,
    source_plan_id_sha256: planId,
    from_sha: fromSha,
    to_sha: toSha,
    classification: plan.classification,
    commits_behind: plan.commits_behind,
    runtime_relevant_path_count: plan.runtime_relevant_path_count,
  };
}

export function validateProcessFreshnessAuditV1(audit, selectedNode, expectedSourceSha) {
  if (!audit || audit.marker !== VOID_NODE_FLEET_PROCESS_FRESHNESS_AUDIT_V1 || audit.version !== 1) {
    fail(`freshness marker/version must be ${VOID_NODE_FLEET_PROCESS_FRESHNESS_AUDIT_V1}/1`);
  }
  if (audit.decision !== "RESTART_REQUIRED" || audit.mutation_attempted !== false ||
      audit.expected_process_entrypoint !== PROCESS_ENTRYPOINT_V1 || audit.version_git_commit_is_process_identity !== false) {
    fail("freshness audit must be read-only RESTART_REQUIRED evidence for src/index.ts");
  }
  authorityOnlyFalse(audit.authority, "freshness authority");
  const auditId = assertSha64(audit.audit_id_sha256, "freshness audit ID");
  if (!Array.isArray(audit.nodes) || audit.nodes.length < 1 || audit.nodes.length > 16) fail("freshness nodes must contain 1..16 entries");
  const seen = new Set();
  for (const node of audit.nodes) {
    if (!node || !NAME_RE.test(String(node.name ?? "")) || seen.has(node.name)) fail("freshness audit has invalid or duplicate node names");
    seen.add(node.name);
    if (!new Set(["PROCESS_SOURCE_ALIGNED", "STALE_SOURCE_AFTER_PROCESS_START"]).has(node.classification)) {
      fail("freshness audit contains a HOLD or invalid node");
    }
    if (!Array.isArray(node.reasons) || node.reasons.length !== 0) fail("freshness audit node contains reasons");
  }
  const reproduced = buildFleetProcessFreshnessDecisionV1(audit.nodes);
  if (reproduced.decision !== audit.decision || reproduced.audit_id_sha256 !== auditId) {
    fail("freshness audit ID or fleet decision does not match normalized content");
  }
  const node = audit.nodes.find((entry) => entry.name === selectedNode);
  if (!node || node.classification !== "STALE_SOURCE_AFTER_PROCESS_START") fail("selected node is not exact stale-process evidence");
  const sourceSha = assertSha40(node.source_head, "freshness source SHA");
  if (sourceSha !== expectedSourceSha) fail("freshness source SHA does not match converged target");
  if (node.reachable !== true || node.source_branch !== "main" || node.dirty_count !== 0 ||
      node.worktree_status_readable !== true || node.source_stable !== true || node.service_active !== true ||
      node.process_present !== true || node.process_cwd_matches_repo !== true ||
      node.process_entrypoint !== PROCESS_ENTRYPOINT_V1 || node.process_entrypoint_matches !== true ||
      node.process_executable_node !== true || node.process_identity_stable !== true ||
      node.health_ok !== true || node.readiness_ok !== true) {
    fail("selected freshness node is not exact green stale-process evidence");
  }
  for (const [value, label] of [
    [node.head_transition_epoch, "head transition epoch"],
    [node.process_start_epoch, "process start epoch"],
    [node.observed_at_epoch, "observed epoch"],
  ]) {
    if (!Number.isSafeInteger(value) || value < 1) fail(`freshness ${label} is invalid`);
  }
  const delta = node.process_start_epoch - node.head_transition_epoch;
  if (delta > -1 || node.source_to_process_start_seconds !== delta) fail("freshness timestamp ordering is not exact stale evidence");
  return {
    freshness_audit_id_sha256: auditId,
    source_sha: sourceSha,
    old_process_start_epoch: node.process_start_epoch,
    head_transition_epoch: node.head_transition_epoch,
    observed_at_epoch: node.observed_at_epoch,
  };
}

function assertRepositoryPath(path) {
  if (typeof path !== "string" || path.length === 0 || /[^\x20-\x7e]/.test(path) ||
      path.startsWith("/") || path.includes("\\") || path.split("/").includes("..")) {
    fail("Git transition contains an unsafe repository path");
  }
  return path;
}

export function classifyRestartOnlyPathsV1(changedPaths) {
  if (!Array.isArray(changedPaths) || changedPaths.length > 4096) fail("changed paths must be an array of at most 4096 entries");
  const buckets = {
    runtime_loadable: [],
    evidence_only: [],
    dependency_or_build: [],
    operator_or_service: [],
    protocol_or_config: [],
    integration_runtime: [],
    review_required: [],
  };
  const seen = new Set();
  for (const raw of changedPaths) {
    const path = assertRepositoryPath(String(raw));
    if (seen.has(path)) fail("changed paths contain a duplicate");
    seen.add(path);
    if (path.startsWith("src/") || path.startsWith("public/")) {
      buckets.runtime_loadable.push(path);
    } else if (
      path === "package.json" || path === "package-lock.json" || path === "Dockerfile" || path === ".nvmrc" ||
      path.startsWith("tsconfig")
    ) {
      buckets.dependency_or_build.push(path);
    } else if (path.startsWith("ops/") || (path.startsWith("scripts/") && !path.startsWith("scripts/prove_"))) {
      buckets.operator_or_service.push(path);
    } else if (path.startsWith("contracts/") || path.startsWith("config/")) {
      buckets.protocol_or_config.push(path);
    } else if (path.startsWith("integrations/")) {
      buckets.integration_runtime.push(path);
    } else if (
      path.startsWith(".github/") || path.startsWith("docs/") || path.startsWith("fixtures/") ||
      path.startsWith("schemas/") || path.startsWith("examples/") || path.startsWith("scripts/prove_")
    ) {
      buckets.evidence_only.push(path);
    } else {
      buckets.review_required.push(path);
    }
  }
  const blockedPaths = [
    ...buckets.dependency_or_build,
    ...buckets.operator_or_service,
    ...buckets.protocol_or_config,
    ...buckets.integration_runtime,
    ...buckets.review_required,
  ];
  const reasons = [];
  if (buckets.runtime_loadable.length === 0) reasons.push("no_runtime_loadable_change");
  if (blockedPaths.length > 0) reasons.push("restart_only_transition_not_proven");
  return {
    ...buckets,
    changed_path_count: changedPaths.length,
    runtime_loadable_path_count: buckets.runtime_loadable.length,
    evidence_only_path_count: buckets.evidence_only.length,
    blocked_path_count: blockedPaths.length,
    restart_only_eligible: reasons.length === 0,
    reasons,
  };
}

export function inspectRestartTransitionV1(config, fromShaInput, toShaInput) {
  const fromSha = assertSha40(fromShaInput, "transition from SHA");
  const toSha = assertSha40(toShaInput, "transition target SHA");
  const reasons = [];
  const remote = run("git", [
    "-C", config.coordinator_repo,
    "ls-remote", "--exit-code", config.canonical_remote, `refs/heads/${config.canonical_branch}`,
  ], { timeoutMs: 15_000 });
  if (!remote.ok) reasons.push("canonical_remote_unavailable");
  else if ((remote.stdout.trim().split(/\s+/)[0] ?? "") !== toSha) reasons.push("canonical_target_advanced");

  for (const [sha, label] of [[fromSha, "from_object_missing"], [toSha, "target_object_missing"]]) {
    if (!run("git", ["-C", config.coordinator_repo, "cat-file", "-e", `${sha}^{commit}`]).ok) reasons.push(label);
  }
  if (reasons.some((reason) => reason.endsWith("object_missing"))) {
    return { ok: false, reasons: [...new Set(reasons)].sort(), changed_paths: [], path_policy: classifyRestartOnlyPathsV1([]), changed_paths_sha256: sha256([]) };
  }
  if (!run("git", ["-C", config.coordinator_repo, "merge-base", "--is-ancestor", fromSha, toSha]).ok) {
    reasons.push("source_transition_not_fast_forward");
  }
  const diff = run("git", [
    "-C", config.coordinator_repo,
    "diff", "--name-only", "-z", "--no-renames", `${fromSha}..${toSha}`,
  ], { timeoutMs: 20_000 });
  if (!diff.ok) reasons.push("source_transition_diff_failed");
  let changedPaths = [];
  try {
    changedPaths = diff.ok ? diff.stdout.split("\0").filter(Boolean).map(assertRepositoryPath) : [];
    if (new Set(changedPaths).size !== changedPaths.length) fail("source transition diff contains duplicate paths");
  } catch (error) {
    reasons.push("source_transition_path_invalid");
    changedPaths = [];
  }
  const pathPolicy = classifyRestartOnlyPathsV1(changedPaths);
  reasons.push(...pathPolicy.reasons);
  return {
    ok: reasons.length === 0,
    reasons: [...new Set(reasons)].sort(),
    changed_paths: changedPaths,
    path_policy: pathPolicy,
    changed_paths_sha256: sha256(changedPaths),
  };
}

export function buildRestartPlanV1(sourceReceipt, freshness, transition, config) {
  const privatePayload = {
    marker: VOID_NODE_FLEET_PROCESS_RESTART_PLAN_V1,
    freshness_audit_id_sha256: freshness.freshness_audit_id_sha256,
    source_audit_id_sha256: sourceReceipt.source_audit_id_sha256,
    source_plan_id_sha256: sourceReceipt.source_plan_id_sha256,
    node: config.node.name,
    transport: config.node.transport,
    ssh_target: config.node.ssh_target,
    repo: config.node.repo,
    service: config.node.service,
    http_base: config.node.http_base,
    remote: config.node.git_remote,
    expected_remote_url: config.node.expected_remote_url,
    branch: config.canonical_branch,
    from_sha: sourceReceipt.from_sha,
    source_sha: freshness.source_sha,
    old_process_start_epoch: freshness.old_process_start_epoch,
    head_transition_epoch: freshness.head_transition_epoch,
    changed_paths_sha256: transition.changed_paths_sha256,
    path_policy: transition.path_policy,
  };
  return {
    marker: VOID_NODE_FLEET_PROCESS_RESTART_PLAN_V1,
    plan_id_sha256: sha256(privatePayload),
    freshness_audit_id_sha256: freshness.freshness_audit_id_sha256,
    source_audit_id_sha256: sourceReceipt.source_audit_id_sha256,
    source_plan_id_sha256: sourceReceipt.source_plan_id_sha256,
    node: config.node.name,
    transport: config.node.transport,
    branch: config.canonical_branch,
    from_sha: sourceReceipt.from_sha,
    source_sha: freshness.source_sha,
    old_process_start_epoch: freshness.old_process_start_epoch,
    head_transition_epoch: freshness.head_transition_epoch,
    changed_paths_sha256: transition.changed_paths_sha256,
    path_policy: transition.path_policy,
    operation: "restart_user_service_only",
  };
}

export function validateRestartConfirmationsV1(args, plan) {
  if (args.confirmOperation !== VOID_NODE_FLEET_PROCESS_RESTART_APPLY_V1) fail("exact operation confirmation mismatch");
  if (args.confirmFreshnessAuditId !== plan.freshness_audit_id_sha256) fail("exact freshness audit ID confirmation mismatch");
  if (args.confirmSourcePlanId !== plan.source_plan_id_sha256) fail("exact source plan ID confirmation mismatch");
  if (args.confirmRestartPlanId !== plan.plan_id_sha256) fail("exact restart plan ID confirmation mismatch");
  if (args.confirmNode !== plan.node) fail("exact node confirmation mismatch");
  if (args.confirmFromSha !== plan.from_sha) fail("exact from-SHA confirmation mismatch");
  if (args.confirmSourceSha !== plan.source_sha) fail("exact source-SHA confirmation mismatch");
  if (args.confirmOldProcessStartEpoch !== String(plan.old_process_start_epoch)) fail("exact old-process-start confirmation mismatch");
  return true;
}

export function buildRestartCollectorScriptV1(node) {
  const source = buildProcessFreshnessCollectorScriptV1(node);
  const sentinel = '\nhead_after="$(git -C "$repo" rev-parse HEAD 2>/dev/null || true)"';
  if (source.split(sentinel).length !== 2) fail("process freshness collector seam changed");
  const injection = `
git_remote=${bashLiteral(node.git_remote)}
git_dir="$(git -C "$repo" rev-parse --absolute-git-dir 2>/dev/null || true)"
git_operation_in_progress=0
for p in index.lock MERGE_HEAD CHERRY_PICK_HEAD REVERT_HEAD rebase-merge rebase-apply sequencer; do
  test ! -e "$git_dir/$p" || git_operation_in_progress=1
done
remote_url="$(git -C "$repo" remote get-url "$git_remote" 2>/dev/null || true)"
shallow="$(git -C "$repo" rev-parse --is-shallow-repository 2>/dev/null || true)"
peers="$(curl -fsS --max-time 4 "$http_base/p2p/peers" 2>/dev/null || curl -fsS --max-time 4 "$http_base/peers" 2>/dev/null || true)"
`;
  const withCollection = source.replace(sentinel, `${injection}${sentinel}`);
  return `${withCollection}
printf 'remote_url\\t%s\\n' "$remote_url"
printf 'shallow\\t%s\\n' "$shallow"
printf 'git_operation_in_progress\\t%s\\n' "$git_operation_in_progress"
printf 'peers_b64\\t%s\\n' "$(printf '%s' "$peers" | base64 -w0 2>/dev/null || true)"
`;
}

export function parseRestartCollectorOutputV1(stdout) {
  const process = parseProcessFreshnessCollectorOutputV1(stdout);
  const fields = fieldsFromOutput(stdout);
  const peers = decodeBase64Json(fields.get("peers_b64") ?? "");
  const assessment = classifyProcessFreshnessV1(process);
  return {
    ...process,
    classification: assessment.classification,
    reasons: assessment.reasons,
    source_to_process_start_seconds: assessment.source_to_process_start_seconds,
    remote_url: fields.get("remote_url") ?? "",
    shallow: fields.get("shallow") === "true",
    git_operation_in_progress: fields.get("git_operation_in_progress") === "1",
    peers_json_ok: peers.ok,
    peer_count: peerCount(peers.value),
  };
}

export function collectRestartSnapshotV1(config) {
  const result = transportRun(config, buildRestartCollectorScriptV1(config.node), 25_000);
  if (!result.ok) {
    return { reachable: false, classification: "HOLD", reasons: ["collector_transport_failed"], peer_count: 0 };
  }
  return { reachable: true, ...parseRestartCollectorOutputV1(result.stdout) };
}

function exactGreenProcessEvidence(snapshot, config, plan) {
  const reasons = [];
  if (!snapshot.reachable) reasons.push("node_unreachable");
  if (!snapshot.repo_ok) reasons.push("repo_unavailable");
  if (snapshot.source_head !== plan.source_sha) reasons.push("source_head_drift");
  if (snapshot.source_branch !== "main") reasons.push("source_branch_not_main");
  if (!snapshot.worktree_status_readable || snapshot.dirty_count !== 0) reasons.push("worktree_not_exact_clean");
  if (!snapshot.source_stable) reasons.push("source_changed_during_collection");
  if (snapshot.remote_url !== config.node.expected_remote_url) reasons.push("remote_url_mismatch");
  if (snapshot.shallow) reasons.push("shallow_repository");
  if (snapshot.git_operation_in_progress) reasons.push("git_operation_in_progress");
  if (!snapshot.service_active || !snapshot.process_present || !snapshot.process_cwd_matches_repo ||
      !snapshot.process_entrypoint_matches || !snapshot.process_executable_node || !snapshot.process_identity_stable) {
    reasons.push("process_identity_not_exact");
  }
  if (!snapshot.health_json_ok || snapshot.health?.ok !== true) reasons.push("health_not_green");
  if (!snapshot.readiness_json_ok || snapshot.readiness?.ready !== true ||
      ("gap" in (snapshot.readiness ?? {}) && Number(snapshot.readiness.gap) !== 0)) reasons.push("readiness_not_green");
  if (!snapshot.peers_json_ok || snapshot.peer_count < config.node.min_peers) reasons.push("peer_floor_not_met");
  return [...new Set(reasons)].sort();
}

export function assessPreRestartV1(snapshot, config, plan) {
  const reasons = exactGreenProcessEvidence(snapshot, config, plan);
  if (snapshot.classification !== "STALE_SOURCE_AFTER_PROCESS_START" || snapshot.reasons?.length !== 0) {
    reasons.push("process_no_longer_exact_stale");
  }
  if (snapshot.process_start_epoch !== plan.old_process_start_epoch) reasons.push("process_identity_advanced");
  if (snapshot.head_transition_epoch !== plan.head_transition_epoch) reasons.push("source_transition_epoch_drift");
  return { ok: reasons.length === 0, reasons: [...new Set(reasons)].sort() };
}

export function assessPostRestartV1(snapshot, config, plan) {
  const reasons = exactGreenProcessEvidence(snapshot, config, plan);
  if (snapshot.classification !== "PROCESS_SOURCE_ALIGNED" || snapshot.reasons?.length !== 0) {
    reasons.push("process_source_not_aligned");
  }
  if (!Number.isSafeInteger(snapshot.process_start_epoch) || snapshot.process_start_epoch <= plan.old_process_start_epoch) {
    reasons.push("new_process_start_not_proven");
  }
  if (snapshot.head_transition_epoch !== plan.head_transition_epoch) reasons.push("source_transition_epoch_drift");
  return { ok: reasons.length === 0, reasons: [...new Set(reasons)].sort() };
}

export function buildRestartApplyScriptV1(config, plan) {
  const repo = bashPathExpression(config.node.repo);
  return `set -euo pipefail
export LC_ALL=C
repo=${repo}
service=${bashLiteral(config.node.service)}
remote=${bashLiteral(config.node.git_remote)}
expected_remote_url=${bashLiteral(config.node.expected_remote_url)}
source_sha=${bashLiteral(plan.source_sha)}
old_process_start_epoch=${bashLiteral(String(plan.old_process_start_epoch))}
head_transition_epoch=${bashLiteral(String(plan.head_transition_epoch))}
entrypoint=${bashLiteral(PROCESS_ENTRYPOINT_V1)}
http_base=${bashLiteral(config.node.http_base)}
min_peers=${bashLiteral(String(config.node.min_peers))}

repo_real="$(readlink -f -- "$repo")"
entrypoint_absolute="$repo_real/$entrypoint"
preflight_absolute="$repo_real/node_modules/tsx/dist/preflight.cjs"
loader_url="file://$repo_real/node_modules/tsx/dist/loader.mjs"
git_dir="$(git -C "$repo" rev-parse --absolute-git-dir)"
test "$(git -C "$repo" rev-parse HEAD)" = "$source_sha"
test "$(git -C "$repo" symbolic-ref --short -q HEAD)" = main
test -z "$(git -C "$repo" status --porcelain=v1)"
test "$(git -C "$repo" remote get-url "$remote")" = "$expected_remote_url"
test "$(git -C "$repo" rev-parse --is-shallow-repository)" = false
for p in index.lock MERGE_HEAD CHERRY_PICK_HEAD REVERT_HEAD rebase-merge rebase-apply sequencer; do
  test ! -e "$git_dir/$p"
done
head_log="$(git -C "$repo" rev-parse --path-format=absolute --git-path logs/HEAD)"
test -f "$head_log"
test "$(stat -c %Y -- "$head_log")" = "$head_transition_epoch"

service_show_before="$(systemctl --user show "$service" --property=ActiveState --property=MainPID --property=ExecMainStartTimestamp)"
test "$(printf '%s\\n' "$service_show_before" | sed -n 's/^ActiveState=//p' | tail -n 1)" = active
main_pid="$(printf '%s\\n' "$service_show_before" | sed -n 's/^MainPID=//p' | tail -n 1)"
start_text="$(printf '%s\\n' "$service_show_before" | sed -n 's/^ExecMainStartTimestamp=//p' | tail -n 1)"
test "$(date --date="$start_text" +%s)" = "$old_process_start_epoch"
printf '%s' "$main_pid" | grep -Eq '^[1-9][0-9]*$'
test -d "/proc/$main_pid"
test "$(readlink -f -- "/proc/$main_pid/cwd")" = "$repo_real"
process_exe="$(readlink -f -- "/proc/$main_pid/exe")"
process_exe_base="\${process_exe##*/}"
test "$process_exe_base" = node -o "$process_exe_base" = nodejs
process_argv="$(tr '\\0' '\\n' < "/proc/$main_pid/cmdline")"
expected_process_argv="$(printf '%s\\n' \
  "$process_exe" \
  --require \
  "$preflight_absolute" \
  --import \
  "$loader_url" \
  "$entrypoint_absolute")"
test "$process_argv" = "$expected_process_argv"

health="$(curl -fsS --max-time 4 "$http_base/health")"
ready="$(curl -fsS --max-time 4 "$http_base/__void/ready.json")"
peers="$(curl -fsS --max-time 4 "$http_base/p2p/peers" 2>/dev/null || curl -fsS --max-time 4 "$http_base/peers")"
printf '%s' "$health" | "$process_exe" -e 'let s="";process.stdin.on("data",d=>s+=d);process.stdin.on("end",()=>{const v=JSON.parse(s);if(v?.ok!==true)process.exit(1)})'
printf '%s' "$ready" | "$process_exe" -e 'let s="";process.stdin.on("data",d=>s+=d);process.stdin.on("end",()=>{const v=JSON.parse(s);if(v?.ready!==true||(Object.hasOwn(v,"gap")&&Number(v.gap)!==0))process.exit(1)})'
printf '%s' "$peers" | "$process_exe" -e 'const min=Number(process.argv[1]);let s="";process.stdin.on("data",d=>s+=d);process.stdin.on("end",()=>{const v=JSON.parse(s);const n=Array.isArray(v)?v.length:Array.isArray(v?.connected)?v.connected.length:Array.isArray(v?.peers)?v.peers.length:0;if(n<min)process.exit(1)})' "$min_peers"

test "$(systemctl --user show "$service" --property=ActiveState --property=MainPID --property=ExecMainStartTimestamp)" = "$service_show_before"
test "$(git -C "$repo" rev-parse HEAD)" = "$source_sha"
test -z "$(git -C "$repo" status --porcelain=v1)"
test "$(git -C "$repo" remote get-url "$remote")" = "$expected_remote_url"
test "$(git -C "$repo" rev-parse --is-shallow-repository)" = false
test "$(stat -c %Y -- "$head_log")" = "$head_transition_epoch"
for p in index.lock MERGE_HEAD CHERRY_PICK_HEAD REVERT_HEAD rebase-merge rebase-apply sequencer; do
  test ! -e "$git_dir/$p"
done

systemctl --user restart "$service"
printf 'process_restart\\tattempted\\n'
`;
}

function sleepMs(milliseconds) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, milliseconds);
}

function collectPostRestart(config, plan, seconds) {
  const deadline = Date.now() + seconds * 1000;
  let snapshot = collectRestartSnapshotV1(config);
  let assessment = assessPostRestartV1(snapshot, config, plan);
  while (!assessment.ok && Date.now() < deadline) {
    sleepMs(500);
    snapshot = collectRestartSnapshotV1(config);
    assessment = assessPostRestartV1(snapshot, config, plan);
  }
  return { snapshot, assessment };
}

function authorityState(overrides = {}) {
  return {
    git_mutation: false,
    package_install: false,
    build: false,
    service_stop: false,
    service_start_or_restart_attempted: false,
    service_restart_proven: false,
    network_configuration: false,
    credential_material_exposed: false,
    wallet_or_signer: false,
    transaction: false,
    funds_moved: false,
    ...overrides,
  };
}

function readJson(path, label) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    fail(`${label} is not valid JSON: ${String(error?.message || error)}`);
  }
}

function assertFreshFile(path, label, maxAgeSeconds) {
  const ageSeconds = (Date.now() - statSync(path).mtimeMs) / 1000;
  if (ageSeconds < -5) fail(`${label} file timestamp is in the future`);
  if (ageSeconds > maxAgeSeconds) fail(`${label} file is stale (${Math.floor(ageSeconds)}s old)`);
}

function parseValue(argv, index, label) {
  const value = argv[index + 1];
  if (!value || value.startsWith("--")) fail(`${label} requires a value`);
  return value;
}

function parseArgs(argv) {
  const out = {
    config: "~/.config/void/node-fleet-drift-audit-v1.json",
    freshnessAudit: "~/.config/void/node-fleet-process-freshness-audit-result-v1.json",
    sourceReceipt: "",
    node: "",
    output: "",
    apply: false,
    maxEvidenceAgeSeconds: DEFAULT_MAX_EVIDENCE_AGE_SECONDS,
    postcheckSeconds: DEFAULT_POSTCHECK_SECONDS,
    confirmOperation: "",
    confirmFreshnessAuditId: "",
    confirmSourcePlanId: "",
    confirmRestartPlanId: "",
    confirmNode: "",
    confirmFromSha: "",
    confirmSourceSha: "",
    confirmOldProcessStartEpoch: "",
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--config") out.config = parseValue(argv, i++, arg);
    else if (arg === "--freshness-audit") out.freshnessAudit = parseValue(argv, i++, arg);
    else if (arg === "--source-convergence-receipt") out.sourceReceipt = parseValue(argv, i++, arg);
    else if (arg === "--node") out.node = parseValue(argv, i++, arg);
    else if (arg === "--output") out.output = parseValue(argv, i++, arg);
    else if (arg === "--max-evidence-age-seconds") out.maxEvidenceAgeSeconds = Number.parseInt(parseValue(argv, i++, arg), 10);
    else if (arg === "--postcheck-seconds") out.postcheckSeconds = Number.parseInt(parseValue(argv, i++, arg), 10);
    else if (arg === "--apply") out.apply = true;
    else if (arg === "--confirm-operation") out.confirmOperation = parseValue(argv, i++, arg);
    else if (arg === "--confirm-freshness-audit-id") out.confirmFreshnessAuditId = parseValue(argv, i++, arg);
    else if (arg === "--confirm-source-plan-id") out.confirmSourcePlanId = parseValue(argv, i++, arg);
    else if (arg === "--confirm-restart-plan-id") out.confirmRestartPlanId = parseValue(argv, i++, arg);
    else if (arg === "--confirm-node") out.confirmNode = parseValue(argv, i++, arg);
    else if (arg === "--confirm-from-sha") out.confirmFromSha = parseValue(argv, i++, arg);
    else if (arg === "--confirm-source-sha") out.confirmSourceSha = parseValue(argv, i++, arg);
    else if (arg === "--confirm-old-process-start-epoch") out.confirmOldProcessStartEpoch = parseValue(argv, i++, arg);
    else if (arg === "--help") {
      console.log("Usage: node tools/void-node-fleet-process-restart-controller-v1.mjs --node NAME --source-convergence-receipt PATH [--config PATH] [--freshness-audit PATH] [--output PATH] [--max-evidence-age-seconds N] [--postcheck-seconds N] [--apply plus exact confirmations]");
      process.exit(0);
    } else fail(`unknown argument: ${arg}`);
  }
  if (!NAME_RE.test(out.node)) fail("--node is required and must be a valid exact node name");
  if (!out.sourceReceipt) out.sourceReceipt = `~/.config/void/node-fleet-source-convergence-${out.node}-result-v1.json`;
  if (!Number.isInteger(out.maxEvidenceAgeSeconds) || out.maxEvidenceAgeSeconds < 1 || out.maxEvidenceAgeSeconds > 3600) {
    fail("--max-evidence-age-seconds must be 1..3600");
  }
  if (!Number.isInteger(out.postcheckSeconds) || out.postcheckSeconds < 5 || out.postcheckSeconds > 120) {
    fail("--postcheck-seconds must be 5..120");
  }
  return out;
}

function emit(output, path = "") {
  const json = `${JSON.stringify(output, null, 2)}\n`;
  if (path) {
    const outputPath = expandHome(assertSafePath(path, "output path"));
    writeFileSync(outputPath, json, { encoding: "utf8", mode: 0o600 });
    chmodSync(outputPath, 0o600);
  }
  process.stdout.write(json);
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const configPath = expandHome(assertSafePath(args.config, "config path"));
  const freshnessPath = expandHome(assertSafePath(args.freshnessAudit, "freshness audit path"));
  const receiptPath = expandHome(assertSafePath(args.sourceReceipt, "source convergence receipt path"));
  assertFreshFile(freshnessPath, "freshness audit", args.maxEvidenceAgeSeconds);
  assertFreshFile(receiptPath, "source convergence receipt", args.maxEvidenceAgeSeconds);

  const config = validateFleetConfigV1(readJson(configPath, "config"), args.node);
  const sourceReceipt = validateSourceConvergenceReceiptV1(readJson(receiptPath, "source convergence receipt"), config, args.node);
  const freshness = validateProcessFreshnessAuditV1(readJson(freshnessPath, "freshness audit"), args.node, sourceReceipt.to_sha);
  const freshnessObservationAgeSeconds = Date.now() / 1000 - freshness.observed_at_epoch;
  if (freshnessObservationAgeSeconds < -5) fail("freshness observation timestamp is in the future");
  if (freshnessObservationAgeSeconds > args.maxEvidenceAgeSeconds) {
    fail(`freshness observation is stale (${Math.floor(freshnessObservationAgeSeconds)}s old)`);
  }
  const transition = inspectRestartTransitionV1(config, sourceReceipt.from_sha, sourceReceipt.to_sha);
  const plan = buildRestartPlanV1(sourceReceipt, freshness, transition, config);
  if (args.apply) validateRestartConfirmationsV1(args, plan);

  const before = collectRestartSnapshotV1(config);
  const beforeAssessment = assessPreRestartV1(before, config, plan);
  const transitionAfter = inspectRestartTransitionV1(config, sourceReceipt.from_sha, sourceReceipt.to_sha);
  const transitionStable = transitionAfter.changed_paths_sha256 === plan.changed_paths_sha256 &&
    stableJson(transitionAfter.path_policy) === stableJson(plan.path_policy);
  const reasons = [...new Set([
    ...transition.reasons,
    ...(!transitionAfter.ok ? transitionAfter.reasons : []),
    ...beforeAssessment.reasons,
    ...(!transitionStable ? ["source_transition_changed_during_preflight"] : []),
  ])].sort();
  if (reasons.length > 0) {
    emit({
      marker: VOID_NODE_FLEET_PROCESS_RESTART_CONTROLLER_V1,
      version: 1,
      outcome: "HOLD",
      plan,
      reasons,
      mutation_attempted: false,
      automatic_retry: false,
      authority: authorityState(),
    }, args.output);
    process.exitCode = 2;
    return;
  }

  if (!args.apply) {
    emit({
      marker: VOID_NODE_FLEET_PROCESS_RESTART_CONTROLLER_V1,
      version: 1,
      outcome: "READY_TO_APPLY",
      plan,
      reasons: [],
      mutation_attempted: false,
      automatic_retry: false,
      required_confirmation_marker: VOID_NODE_FLEET_PROCESS_RESTART_APPLY_V1,
      authority: authorityState(),
    }, args.output);
    return;
  }

  const applied = transportRun(config, buildRestartApplyScriptV1(config, plan), 45_000);
  const after = collectPostRestart(config, plan, args.postcheckSeconds);
  const oldProcessStillExact = assessPreRestartV1(after.snapshot, config, plan).ok;
  let outcome = "PROCESS_RESTART_UNKNOWN";
  let outcomeReasons = after.assessment.reasons;
  if (after.assessment.ok) {
    outcome = applied.ok ? "PROCESS_RESTARTED" : "PROCESS_RESTARTED_RECOVERED_AFTER_TRANSPORT_FAILURE";
    outcomeReasons = [];
  } else if (oldProcessStillExact) {
    outcome = "PROCESS_NOT_RESTARTED";
    outcomeReasons = [applied.ok ? "restart_returned_without_process_transition" : "restart_command_failed_before_process_transition"];
  }
  const succeeded = outcome.startsWith("PROCESS_RESTARTED");
  emit({
    marker: VOID_NODE_FLEET_PROCESS_RESTART_CONTROLLER_V1,
    version: 1,
    outcome,
    plan,
    reasons: outcomeReasons,
    mutation_attempted: true,
    mutation_succeeded: succeeded,
    transport_exit_code: applied.status,
    automatic_retry: false,
    fresh_evidence_required_before_retry: !succeeded,
    runtime_transition_proven: succeeded,
    authority: authorityState({
      service_start_or_restart_attempted: true,
      service_restart_proven: succeeded,
    }),
  }, args.output);
  if (!succeeded) process.exitCode = 2;
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : "";
if (invokedPath && fileURLToPath(import.meta.url) === invokedPath) {
  try {
    main();
  } catch (error) {
    console.error(JSON.stringify({
      marker: VOID_NODE_FLEET_PROCESS_RESTART_CONTROLLER_V1,
      outcome: "HOLD",
      error: String(error?.message || error),
      mutation_attempted: false,
      automatic_retry: false,
    }));
    process.exitCode = 1;
  }
}
