#!/usr/bin/env node
import { createHash } from "node:crypto";
import { readFileSync, statSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

export const VOID_NODE_FLEET_DRIFT_AUDIT_V1 = "VOID_NODE_FLEET_DRIFT_AUDIT_V1";
export const VOID_NODE_FLEET_DRIFT_CONFIG_V1 = "VOID_NODE_FLEET_DRIFT_CONFIG_V1";
export const VOID_NODE_FLEET_SOURCE_CONVERGENCE_V1 = "VOID_NODE_FLEET_SOURCE_CONVERGENCE_V1";
export const VOID_NODE_FLEET_SOURCE_CONVERGENCE_PLAN_V1 = "VOID_NODE_FLEET_SOURCE_CONVERGENCE_PLAN_V1";
export const VOID_NODE_FLEET_SOURCE_CONVERGENCE_APPLY_V1 = "VOID_NODE_FLEET_SOURCE_CONVERGENCE_APPLY_V1";

const SHA40_RE = /^[0-9a-f]{40}$/;
const SHA64_RE = /^[0-9a-f]{64}$/;
const NAME_RE = /^[a-z0-9][a-z0-9._-]{0,63}$/i;
const REMOTE_RE = /^[a-z0-9][a-z0-9._-]{0,63}$/i;
const SSH_TARGET_RE = /^[a-z0-9][a-z0-9._@:-]{0,254}$/i;
const SERVICE_RE = /^[a-z0-9][a-z0-9_.@:-]{0,126}\.service$/i;
const LOOPBACK_HTTP_RE = /^http:\/\/(?:127\.0\.0\.1|\[::1\]):([1-9][0-9]{0,4})$/;
const MAX_OUTPUT_BYTES = 4 * 1024 * 1024;
const DEFAULT_MAX_AUDIT_AGE_SECONDS = 300;
const AUDIT_AUTHORITY_KEYS_V1 = Object.freeze([
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
]);
const SAFE_GIT_REMOTE_URL_RE = /^(?:https|ssh):\/\/[^\s]+$/i;
const SAFE_GIT_SCP_REMOTE_RE = /^(?:[A-Za-z0-9._-]+@)?[A-Za-z0-9.-]+:[^\s]+$/;

function fail(message) {
  const error = new Error(message);
  error.name = "VoidFleetSourceConvergenceError";
  throw error;
}

function assertExactString(value, label) {
  if (typeof value !== "string" || value.length === 0) fail(`${label} must be a non-empty string`);
  if (/[^\x20-\x7e]/.test(value)) fail(`${label} contains a control or non-ASCII character`);
  return value;
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
  const path = assertExactString(value, label);
  if (path !== "~" && !path.startsWith("~/") && !path.startsWith("/")) {
    fail(`${label} must be absolute or begin with ~/`);
  }
  return path;
}

function assertSafeGitRemoteUrl(value, label) {
  const remote = assertExactString(value, label);
  if (remote.includes("::")) fail(`${label} uses forbidden Git remote-helper syntax`);
  if (remote.startsWith("/")) return remote;
  if (SAFE_GIT_REMOTE_URL_RE.test(remote)) return remote;
  if (/^[A-Za-z][A-Za-z0-9+.-]*:\/\//.test(remote)) {
    fail(`${label} must use HTTPS, SSH, scp-style SSH, or an absolute local path`);
  }
  if (SAFE_GIT_SCP_REMOTE_RE.test(remote)) return remote;
  fail(`${label} must use HTTPS, SSH, scp-style SSH, or an absolute local path`);
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
    timeout: options.timeoutMs ?? 15_000,
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

function decodeBase64Json(value) {
  if (!value) return { ok: false, value: null };
  try {
    return { ok: true, value: JSON.parse(Buffer.from(value, "base64").toString("utf8")) };
  } catch {
    return { ok: false, value: null };
  }
}

function peerCount(peers) {
  if (Array.isArray(peers)) return peers.length;
  if (peers && Array.isArray(peers.connected)) return peers.connected.length;
  if (peers && Array.isArray(peers.peers)) return peers.peers.length;
  return 0;
}

function parseInspection(stdout) {
  const fields = new Map();
  for (const line of stdout.split(/\r?\n/)) {
    const tab = line.indexOf("\t");
    if (tab > 0) fields.set(line.slice(0, tab), line.slice(tab + 1));
  }
  const health = decodeBase64Json(fields.get("health_b64") ?? "");
  const readiness = decodeBase64Json(fields.get("readiness_b64") ?? "");
  const peers = decodeBase64Json(fields.get("peers_b64") ?? "");
  return {
    repo_ok: fields.get("repo_ok") === "1",
    head: fields.get("head") ?? "",
    branch: fields.get("branch") ?? "",
    dirty_count: Number.parseInt(fields.get("dirty_count") ?? "-1", 10),
    remote_url: fields.get("remote_url") ?? "",
    shallow: fields.get("shallow") === "true",
    git_operation_in_progress: fields.get("git_operation_in_progress") === "1",
    service_active: fields.get("service_active") === "active",
    health_json_ok: health.ok,
    health: health.value,
    readiness_json_ok: readiness.ok,
    readiness: readiness.value,
    peers_json_ok: peers.ok,
    peers: peers.value,
  };
}

export function validateFleetConfigV1(input, selectedNode) {
  if (!input || input.marker !== VOID_NODE_FLEET_DRIFT_CONFIG_V1) {
    fail(`config marker must be ${VOID_NODE_FLEET_DRIFT_CONFIG_V1}`);
  }
  const coordinatorRepoRaw = assertSafePath(input.coordinator_repo, "coordinator_repo");
  const canonicalRemote = assertExactString(input.canonical_remote ?? "origin", "canonical_remote");
  const canonicalBranch = assertExactString(input.canonical_branch ?? "main", "canonical_branch");
  if (!REMOTE_RE.test(canonicalRemote)) fail("canonical_remote is invalid");
  if (canonicalBranch !== "main") fail("canonical_branch must be exact main in v1");
  if (!Array.isArray(input.nodes) || input.nodes.length < 1 || input.nodes.length > 16) {
    fail("nodes must contain 1..16 entries");
  }

  const seen = new Set();
  const nodes = input.nodes.map((node, index) => {
    if (!node || typeof node !== "object") fail(`nodes[${index}] must be an object`);
    const name = assertExactString(node.name, `nodes[${index}].name`);
    if (!NAME_RE.test(name)) fail(`${name} is not a valid node name`);
    if (seen.has(name)) fail(`duplicate node name ${name}`);
    seen.add(name);
    if (node.transport !== "local" && node.transport !== "ssh") fail(`${name}.transport must be local or ssh`);
    const sshTarget = node.transport === "ssh" ? assertExactString(node.ssh_target, `${name}.ssh_target`) : null;
    if (sshTarget && !SSH_TARGET_RE.test(sshTarget)) fail(`${name}.ssh_target is invalid`);
    const minPeers = Number.isInteger(node.min_peers) && node.min_peers >= 0 && node.min_peers <= 256
      ? node.min_peers
      : 1;
    const service = assertExactString(node.service, `${name}.service`);
    if (!SERVICE_RE.test(service)) fail(`${name}.service is not a safe user-systemd unit`);
    const httpBase = assertExactString(node.http_base, `${name}.http_base`).replace(/\/+$/, "");
    const httpMatch = LOOPBACK_HTTP_RE.exec(httpBase);
    if (!httpMatch || Number(httpMatch[1]) > 65535) fail(`${name}.http_base must be numeric loopback HTTP with a valid port`);
    return {
      name,
      transport: node.transport,
      ssh_target: sshTarget,
      repo: assertSafePath(node.repo, `${name}.repo`),
      service,
      http_base: httpBase,
      min_peers: minPeers,
      expected_remote_url: assertSafeGitRemoteUrl(node.expected_remote_url, `${name}.expected_remote_url`),
      git_remote: canonicalRemote,
      connect_timeout_seconds: Number.isInteger(node.connect_timeout_seconds)
        ? Math.max(1, Math.min(20, node.connect_timeout_seconds))
        : 5,
    };
  });
  const node = nodes.find((entry) => entry.name === selectedNode);
  if (!node) fail(`selected node ${selectedNode} is not present in config`);
  return {
    coordinator_repo: expandHome(coordinatorRepoRaw),
    canonical_remote: canonicalRemote,
    canonical_branch: canonicalBranch,
    node,
  };
}

export function verifyCoordinatorRemoteBindingV1(config) {
  const expected = assertSafeGitRemoteUrl(
    config.node.expected_remote_url,
    `${config.node.name}.expected_remote_url`,
  );
  const observedResult = run(
    "git",
    ["-C", config.coordinator_repo, "remote", "get-url", config.canonical_remote],
    { timeoutMs: 10_000 },
  );
  if (!observedResult.ok) fail("coordinator canonical remote URL is unavailable");
  const observed = assertSafeGitRemoteUrl(
    observedResult.stdout.trim(),
    "coordinator canonical remote URL",
  );
  if (observed !== expected) {
    fail("node expected_remote_url must exactly match coordinator canonical remote URL");
  }
  return true;
}

function normalizedAuditDigestPayload(audit) {
  return {
    marker: VOID_NODE_FLEET_DRIFT_AUDIT_V1,
    canonical_sha: audit.canonical.sha,
    decision: audit.decision,
    nodes: audit.nodes.map((node) => ({
      name: node.name,
      head: node.head || null,
      classification: node.classification,
      reasons: node.reasons,
      relation: node.comparison?.relation ?? null,
      commits_behind: node.comparison?.commits_behind ?? null,
      runtime_relevant_path_count: node.comparison?.path_classification?.runtime_relevant_path_count ?? null,
    })),
  };
}

export function validateFleetAuditV1(audit, config, selectedNode) {
  if (!audit || audit.marker !== VOID_NODE_FLEET_DRIFT_AUDIT_V1 || audit.version !== 1) {
    fail(`audit marker/version must be ${VOID_NODE_FLEET_DRIFT_AUDIT_V1}/1`);
  }
  if (audit.decision !== "CONVERGENCE_RECOMMENDED") fail("audit decision must be CONVERGENCE_RECOMMENDED");
  if (audit.mutation_attempted !== false) fail("audit must prove mutation_attempted=false");
  if (!audit.authority || typeof audit.authority !== "object" || Array.isArray(audit.authority)) {
    fail("audit authority must be an exact object");
  }
  const authorityKeys = Object.keys(audit.authority).sort();
  const expectedAuthorityKeys = [...AUDIT_AUTHORITY_KEYS_V1].sort();
  if (
    authorityKeys.length !== expectedAuthorityKeys.length ||
    authorityKeys.some((key, index) => key !== expectedAuthorityKeys[index]) ||
    expectedAuthorityKeys.some((key) => audit.authority[key] !== false)
  ) {
    fail("audit authority must contain the exact all-false authority schema");
  }
  if (!audit.canonical || audit.canonical.remote !== config.canonical_remote || audit.canonical.branch !== config.canonical_branch) {
    fail("audit canonical remote/branch does not match config");
  }
  const canonicalSha = assertSha40(audit.canonical.sha, "audit canonical SHA");
  const auditId = assertSha64(audit.audit_id_sha256, "audit ID");
  if (!Array.isArray(audit.nodes) || !Array.isArray(audit.convergence_candidates)) fail("audit node arrays are missing");
  const nodeNames = new Set();
  for (const node of audit.nodes) {
    if (!node || !NAME_RE.test(String(node.name ?? "")) || nodeNames.has(node.name)) fail("audit contains invalid or duplicate node names");
    nodeNames.add(node.name);
    if (node.classification === "HOLD") fail("audit contains a HOLD node");
  }
  if (sha256(normalizedAuditDigestPayload(audit)) !== auditId) fail("audit ID does not match normalized audit content");

  const candidateNames = new Set();
  for (const candidate of audit.convergence_candidates) {
    if (!candidate || candidateNames.has(candidate.name)) fail("audit contains duplicate convergence candidates");
    candidateNames.add(candidate.name);
  }
  const expectedCandidateNames = new Set(audit.nodes.filter((node) => String(node.classification).startsWith("BEHIND_")).map((node) => node.name));
  if (candidateNames.size !== expectedCandidateNames.size || [...candidateNames].some((name) => !expectedCandidateNames.has(name))) {
    fail("convergence candidates do not exactly match behind nodes");
  }

  const candidate = audit.convergence_candidates.find((entry) => entry.name === selectedNode);
  const node = audit.nodes.find((entry) => entry.name === selectedNode);
  if (!candidate || !node) fail(`selected node ${selectedNode} is not a convergence candidate`);
  const allowed = new Set(["BEHIND_EVIDENCE_ONLY", "BEHIND_RUNTIME_RELEVANT"]);
  if (!allowed.has(candidate.classification) || node.classification !== candidate.classification) fail("selected classification is invalid or inconsistent");
  const fromSha = assertSha40(candidate.from_sha, "candidate from SHA");
  const toSha = assertSha40(candidate.to_sha, "candidate target SHA");
  if (toSha !== canonicalSha || node.head !== fromSha) fail("candidate SHA binding does not match audit node/canonical state");
  if (!Number.isInteger(candidate.commits_behind) || candidate.commits_behind < 1) fail("candidate commits_behind must be positive");
  if (!Number.isInteger(candidate.runtime_relevant_path_count) || candidate.runtime_relevant_path_count < 0) {
    fail("candidate runtime_relevant_path_count must be non-negative");
  }
  if (node.reachable !== true || node.repo_ok !== true || node.dirty_count !== 0 || node.branch !== config.canonical_branch ||
      node.service_active !== true || node.health_ok !== true || node.readiness_ok !== true ||
      !Array.isArray(node.reasons) || node.reasons.length !== 0 || node.comparison?.relation !== "behind" ||
      node.comparison?.commits_behind !== candidate.commits_behind ||
      node.comparison?.path_classification?.runtime_relevant_path_count !== candidate.runtime_relevant_path_count) {
    fail("selected node is not an exact green behind-state candidate");
  }
  return {
    audit_id_sha256: auditId,
    canonical_sha: canonicalSha,
    from_sha: fromSha,
    to_sha: toSha,
    classification: candidate.classification,
    commits_behind: candidate.commits_behind,
    runtime_relevant_path_count: candidate.runtime_relevant_path_count,
  };
}

export function buildConvergencePlanV1(validatedAudit, config) {
  const privatePayload = {
    marker: VOID_NODE_FLEET_SOURCE_CONVERGENCE_PLAN_V1,
    audit_id_sha256: validatedAudit.audit_id_sha256,
    node: config.node.name,
    transport: config.node.transport,
    ssh_target: config.node.ssh_target,
    repo: config.node.repo,
    remote: config.node.git_remote,
    expected_remote_url: config.node.expected_remote_url,
    branch: config.canonical_branch,
    from_sha: validatedAudit.from_sha,
    to_sha: validatedAudit.to_sha,
    classification: validatedAudit.classification,
    commits_behind: validatedAudit.commits_behind,
    runtime_relevant_path_count: validatedAudit.runtime_relevant_path_count,
  };
  return {
    marker: VOID_NODE_FLEET_SOURCE_CONVERGENCE_PLAN_V1,
    audit_id_sha256: validatedAudit.audit_id_sha256,
    plan_id_sha256: sha256(privatePayload),
    node: config.node.name,
    transport: config.node.transport,
    remote: config.node.git_remote,
    branch: config.canonical_branch,
    from_sha: validatedAudit.from_sha,
    to_sha: validatedAudit.to_sha,
    classification: validatedAudit.classification,
    commits_behind: validatedAudit.commits_behind,
    runtime_relevant_path_count: validatedAudit.runtime_relevant_path_count,
    operation: "source_fast_forward_only",
  };
}

export function validateApplyConfirmationsV1(args, plan) {
  if (args.confirmOperation !== VOID_NODE_FLEET_SOURCE_CONVERGENCE_APPLY_V1) fail("exact operation confirmation mismatch");
  if (args.confirmAuditId !== plan.audit_id_sha256) fail("exact audit ID confirmation mismatch");
  if (args.confirmPlanId !== plan.plan_id_sha256) fail("exact plan ID confirmation mismatch");
  if (args.confirmNode !== plan.node) fail("exact node confirmation mismatch");
  if (args.confirmFromSha !== plan.from_sha) fail("exact from-SHA confirmation mismatch");
  if (args.confirmTargetSha !== plan.to_sha) fail("exact target-SHA confirmation mismatch");
  return true;
}

export function buildInspectionScriptV1(config) {
  const node = config.node;
  const repo = bashPathExpression(node.repo);
  const remote = bashLiteral(node.git_remote);
  const service = bashLiteral(node.service);
  const httpBase = bashLiteral(node.http_base);
  return `set -u
repo=${repo}
remote=${remote}
service=${service}
http_base=${httpBase}

if ! git -C "$repo" rev-parse --git-dir >/dev/null 2>&1; then
  printf 'repo_ok\\t0\\n'
  exit 0
fi
printf 'repo_ok\\t1\\n'
git_dir="$(git -C "$repo" rev-parse --absolute-git-dir 2>/dev/null || true)"
op=0
for p in index.lock MERGE_HEAD CHERRY_PICK_HEAD REVERT_HEAD rebase-merge rebase-apply sequencer; do
  test ! -e "$git_dir/$p" || op=1
done
health="$(curl -fsS --max-time 4 "$http_base/health" 2>/dev/null || true)"
ready="$(curl -fsS --max-time 4 "$http_base/__void/ready.json" 2>/dev/null || true)"
peers="$(curl -fsS --max-time 4 "$http_base/p2p/peers" 2>/dev/null || curl -fsS --max-time 4 "$http_base/peers" 2>/dev/null || true)"
printf 'head\\t%s\\n' "$(git -C "$repo" rev-parse HEAD 2>/dev/null || true)"
printf 'branch\\t%s\\n' "$(git -C "$repo" symbolic-ref --short -q HEAD 2>/dev/null || true)"
printf 'dirty_count\\t%s\\n' "$(git -C "$repo" status --porcelain=v1 2>/dev/null | wc -l | tr -d '[:space:]')"
printf 'remote_url\\t%s\\n' "$(git -C "$repo" remote get-url "$remote" 2>/dev/null || true)"
printf 'shallow\\t%s\\n' "$(git -C "$repo" rev-parse --is-shallow-repository 2>/dev/null || true)"
printf 'git_operation_in_progress\\t%s\\n' "$op"
printf 'service_active\\t%s\\n' "$(systemctl --user is-active "$service" 2>/dev/null || true)"
printf 'health_b64\\t%s\\n' "$(printf '%s' "$health" | base64 -w0 2>/dev/null || true)"
printf 'readiness_b64\\t%s\\n' "$(printf '%s' "$ready" | base64 -w0 2>/dev/null || true)"
printf 'peers_b64\\t%s\\n' "$(printf '%s' "$peers" | base64 -w0 2>/dev/null || true)"
`;
}

export function buildApplyScriptV1(config, plan) {
  const node = config.node;
  const repo = bashPathExpression(node.repo);
  return `set -euo pipefail
umask 077
export GIT_TERMINAL_PROMPT=0
repo=${repo}
remote=${bashLiteral(node.git_remote)}
branch=${bashLiteral(config.canonical_branch)}
expected_remote_url=${bashLiteral(assertSafeGitRemoteUrl(node.expected_remote_url, "node expected_remote_url"))}
from_sha=${bashLiteral(plan.from_sha)}
to_sha=${bashLiteral(plan.to_sha)}
git_dir="$(git -C "$repo" rev-parse --absolute-git-dir)"

test "$(git -C "$repo" rev-parse HEAD)" = "$from_sha"
test "$(git -C "$repo" symbolic-ref --short -q HEAD)" = "$branch"
test -z "$(git -C "$repo" status --porcelain=v1)"
test "$(git -C "$repo" remote get-url "$remote")" = "$expected_remote_url"
test "$(git -C "$repo" rev-parse --is-shallow-repository)" = "false"
for p in index.lock MERGE_HEAD CHERRY_PICK_HEAD REVERT_HEAD rebase-merge rebase-apply sequencer; do
  test ! -e "$git_dir/$p"
done
git -C "$repo" fetch --no-tags --no-recurse-submodules "$remote" "refs/heads/$branch"
test "$(git -C "$repo" rev-parse FETCH_HEAD)" = "$to_sha"
git -C "$repo" cat-file -e "$to_sha^{commit}"
git -C "$repo" merge-base --is-ancestor "$from_sha" "$to_sha"
test "$(git -C "$repo" rev-parse HEAD)" = "$from_sha"
test "$(git -C "$repo" remote get-url "$remote")" = "$expected_remote_url"
test -z "$(git -C "$repo" status --porcelain=v1)"
for p in index.lock MERGE_HEAD CHERRY_PICK_HEAD REVERT_HEAD rebase-merge rebase-apply sequencer; do
  test ! -e "$git_dir/$p"
done
git -C "$repo" -c core.hooksPath=/dev/null -c submodule.recurse=false merge --ff-only "$to_sha"
test "$(git -C "$repo" rev-parse HEAD)" = "$to_sha"
test "$(git -C "$repo" symbolic-ref --short -q HEAD)" = "$branch"
test -z "$(git -C "$repo" status --porcelain=v1)"
printf 'source_convergence\\tapplied\\n'
printf 'head\\t%s\\n' "$to_sha"
`;
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

export function assessInspectionV1(inspection, config, expectedHead) {
  const reasons = [];
  if (!inspection.repo_ok) reasons.push("repo_unavailable");
  if (inspection.head !== expectedHead) reasons.push("head_drift");
  if (inspection.branch !== config.canonical_branch) reasons.push("branch_mismatch");
  if (inspection.dirty_count !== 0) reasons.push("worktree_dirty");
  if (inspection.remote_url !== config.node.expected_remote_url) reasons.push("remote_url_mismatch");
  if (inspection.shallow) reasons.push("shallow_repository");
  if (inspection.git_operation_in_progress) reasons.push("git_operation_in_progress");
  if (!inspection.service_active) reasons.push("service_inactive");
  if (!inspection.health_json_ok || inspection.health?.ok !== true) reasons.push("health_not_green");
  if (!inspection.readiness_json_ok || inspection.readiness?.ready !== true ||
      ("gap" in (inspection.readiness ?? {}) && Number(inspection.readiness.gap) !== 0)) {
    reasons.push("readiness_not_green");
  }
  if (!inspection.peers_json_ok || peerCount(inspection.peers) < config.node.min_peers) reasons.push("peer_floor_not_met");
  return { ok: reasons.length === 0, reasons: [...new Set(reasons)].sort(), peer_count: peerCount(inspection.peers) };
}

function inspectNode(config) {
  const result = transportRun(config, buildInspectionScriptV1(config), 20_000);
  if (!result.ok) return { reachable: false, transport_status: result.status, inspection: null };
  return { reachable: true, transport_status: result.status, inspection: parseInspection(result.stdout) };
}

function verifyFreshCanonical(config, expectedSha) {
  const result = run("git", ["-C", config.coordinator_repo, "ls-remote", "--exit-code", config.canonical_remote, `refs/heads/${config.canonical_branch}`], { timeoutMs: 15_000 });
  if (!result.ok) return { ok: false, reason: "canonical_remote_unavailable" };
  const observed = result.stdout.trim().split(/\s+/)[0] ?? "";
  return observed === expectedSha
    ? { ok: true, reason: null }
    : { ok: false, reason: "canonical_target_advanced" };
}

function authorityState(overrides = {}) {
  return {
    git_fetch_attempted: false,
    git_fast_forward_proven: false,
    build: false,
    package_install: false,
    service_stop: false,
    service_start_or_restart: false,
    deployment: false,
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

function parseValue(argv, index, label) {
  const value = argv[index + 1];
  if (!value || value.startsWith("--")) fail(`${label} requires a value`);
  return value;
}

function parseArgs(argv) {
  const out = {
    config: "~/.config/void/node-fleet-drift-audit-v1.json",
    audit: "~/.config/void/node-fleet-drift-audit-result-v1.json",
    node: "",
    output: "",
    apply: false,
    maxAuditAgeSeconds: DEFAULT_MAX_AUDIT_AGE_SECONDS,
    confirmOperation: "",
    confirmAuditId: "",
    confirmPlanId: "",
    confirmNode: "",
    confirmFromSha: "",
    confirmTargetSha: "",
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--config") out.config = parseValue(argv, i++, arg);
    else if (arg === "--audit") out.audit = parseValue(argv, i++, arg);
    else if (arg === "--node") out.node = parseValue(argv, i++, arg);
    else if (arg === "--output") out.output = parseValue(argv, i++, arg);
    else if (arg === "--max-audit-age-seconds") out.maxAuditAgeSeconds = Number.parseInt(parseValue(argv, i++, arg), 10);
    else if (arg === "--apply") out.apply = true;
    else if (arg === "--confirm-operation") out.confirmOperation = parseValue(argv, i++, arg);
    else if (arg === "--confirm-audit-id") out.confirmAuditId = parseValue(argv, i++, arg);
    else if (arg === "--confirm-plan-id") out.confirmPlanId = parseValue(argv, i++, arg);
    else if (arg === "--confirm-node") out.confirmNode = parseValue(argv, i++, arg);
    else if (arg === "--confirm-from-sha") out.confirmFromSha = parseValue(argv, i++, arg);
    else if (arg === "--confirm-target-sha") out.confirmTargetSha = parseValue(argv, i++, arg);
    else if (arg === "--help") {
      console.log("Usage: node tools/void-node-fleet-source-convergence-v1.mjs --node NAME [--config PATH] [--audit PATH] [--output PATH] [--max-audit-age-seconds N] [--apply --confirm-operation MARKER --confirm-audit-id ID --confirm-plan-id ID --confirm-node NAME --confirm-from-sha SHA --confirm-target-sha SHA]");
      process.exit(0);
    } else fail(`unknown argument: ${arg}`);
  }
  if (!NAME_RE.test(out.node)) fail("--node is required and must be a valid exact node name");
  if (!Number.isInteger(out.maxAuditAgeSeconds) || out.maxAuditAgeSeconds < 1 || out.maxAuditAgeSeconds > 3600) {
    fail("--max-audit-age-seconds must be 1..3600");
  }
  return out;
}

function emit(output, path = "") {
  const json = `${JSON.stringify(output, null, 2)}\n`;
  if (path) writeFileSync(expandHome(path), json, { encoding: "utf8", mode: 0o600 });
  process.stdout.write(json);
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const configPath = expandHome(assertSafePath(args.config, "config path"));
  const auditPath = expandHome(assertSafePath(args.audit, "audit path"));
  const auditAgeSeconds = Math.max(0, (Date.now() - statSync(auditPath).mtimeMs) / 1000);
  if (auditAgeSeconds > args.maxAuditAgeSeconds) fail(`audit file is stale (${Math.floor(auditAgeSeconds)}s old)`);

  const config = validateFleetConfigV1(readJson(configPath, "config"), args.node);
  verifyCoordinatorRemoteBindingV1(config);
  const validatedAudit = validateFleetAuditV1(readJson(auditPath, "audit"), config, args.node);
  const plan = buildConvergencePlanV1(validatedAudit, config);
  if (args.apply) validateApplyConfirmationsV1(args, plan);

  const canonical = verifyFreshCanonical(config, plan.to_sha);
  const before = inspectNode(config);
  const beforeAssessment = before.reachable
    ? assessInspectionV1(before.inspection, config, plan.from_sha)
    : { ok: false, reasons: ["node_unreachable"], peer_count: 0 };
  if (!canonical.ok || !beforeAssessment.ok) {
    emit({
      marker: VOID_NODE_FLEET_SOURCE_CONVERGENCE_V1,
      version: 1,
      outcome: "HOLD",
      plan,
      reasons: [...new Set([canonical.reason, ...beforeAssessment.reasons].filter(Boolean))].sort(),
      mutation_attempted: false,
      automatic_retry: false,
      authority: authorityState(),
    }, args.output);
    process.exitCode = 2;
    return;
  }

  if (!args.apply) {
    emit({
      marker: VOID_NODE_FLEET_SOURCE_CONVERGENCE_V1,
      version: 1,
      outcome: "READY_TO_APPLY",
      plan,
      reasons: [],
      mutation_attempted: false,
      automatic_retry: false,
      required_confirmation_marker: VOID_NODE_FLEET_SOURCE_CONVERGENCE_APPLY_V1,
      authority: authorityState(),
    }, args.output);
    return;
  }

  const applied = transportRun(config, buildApplyScriptV1(config, plan), 60_000);
  const after = inspectNode(config);
  const afterTarget = after.reachable ? assessInspectionV1(after.inspection, config, plan.to_sha) : { ok: false, reasons: ["node_unreachable"] };
  const afterFrom = after.reachable ? assessInspectionV1(after.inspection, config, plan.from_sha) : { ok: false, reasons: ["node_unreachable"] };
  let outcome = "SOURCE_SYNC_UNKNOWN";
  let reasons = [];
  if (afterTarget.ok) {
    outcome = applied.ok ? "SOURCE_SYNCED" : "SOURCE_SYNCED_RECOVERED_AFTER_TRANSPORT_FAILURE";
  } else if (afterFrom.ok) {
    outcome = "SOURCE_NOT_SYNCED";
    reasons = [applied.ok ? "source_target_not_proven_after_apply" : "apply_command_failed_before_source_change"];
  } else {
    reasons = afterTarget.reasons;
  }
  emit({
    marker: VOID_NODE_FLEET_SOURCE_CONVERGENCE_V1,
    version: 1,
    outcome,
    plan,
    reasons,
    mutation_attempted: true,
    mutation_succeeded: outcome.startsWith("SOURCE_SYNCED"),
    transport_exit_code: applied.status,
    automatic_retry: false,
    fresh_audit_required_before_retry: !outcome.startsWith("SOURCE_SYNCED"),
    runtime_restarted: false,
    runtime_deployment_claimed: false,
    authority: authorityState({
      git_fetch_attempted: true,
      git_fast_forward_proven: outcome.startsWith("SOURCE_SYNCED"),
    }),
  }, args.output);
  if (!outcome.startsWith("SOURCE_SYNCED")) process.exitCode = 2;
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : "";
if (invokedPath && fileURLToPath(import.meta.url) === invokedPath) {
  try {
    main();
  } catch (error) {
    console.error(JSON.stringify({
      marker: VOID_NODE_FLEET_SOURCE_CONVERGENCE_V1,
      outcome: "HOLD",
      error: String(error?.message || error),
      mutation_attempted: false,
      automatic_retry: false,
    }));
    process.exitCode = 1;
  }
}
