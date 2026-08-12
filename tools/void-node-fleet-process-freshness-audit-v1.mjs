#!/usr/bin/env node
import { createHash } from "node:crypto";
import { chmodSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

export const VOID_NODE_FLEET_DRIFT_CONFIG_V1 = "VOID_NODE_FLEET_DRIFT_CONFIG_V1";
export const VOID_NODE_FLEET_PROCESS_FRESHNESS_AUDIT_V1 = "VOID_NODE_FLEET_PROCESS_FRESHNESS_AUDIT_V1";
export const VOID_NODE_PROCESS_SOURCE_IDENTITY_V1 = "VOID_NODE_PROCESS_SOURCE_IDENTITY_V1";

const SHA40_RE = /^[0-9a-f]{40}$/;
const SYSTEMD_INVOCATION_ID_RE = /^[0-9a-f]{32}$/;
const SHA_PREFIX_RE = /^[0-9a-f]{7,40}$/;
const NAME_RE = /^[a-z0-9][a-z0-9._-]{0,63}$/i;
const SSH_TARGET_RE = /^[a-z0-9][a-z0-9._@:-]{0,254}$/i;
const SERVICE_RE = /^[a-z0-9][a-z0-9_.@:-]{0,126}\.service$/i;
const LOOPBACK_HTTP_RE = /^http:\/\/(?:127\.0\.0\.1|\[::1\]):([1-9][0-9]{0,4})$/;
const PROCESS_ENTRYPOINT_V1 = "src/index.ts";
const MAX_OUTPUT_BYTES = 4 * 1024 * 1024;

function fail(message) {
  const error = new Error(message);
  error.name = "VoidFleetProcessFreshnessAuditError";
  throw error;
}

function assertString(value, label) {
  if (typeof value !== "string" || value.length === 0) fail(`${label} must be a non-empty string`);
  if (/[^\x20-\x7e]/.test(value)) fail(`${label} contains a control or non-ASCII character`);
  return value;
}

function assertPath(value, label) {
  const path = assertString(value, label);
  if (path !== "~" && !path.startsWith("~/") && !path.startsWith("/")) {
    fail(`${label} must be absolute or begin with ~/`);
  }
  return path;
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
  return createHash("sha256").update(stableJson(value)).digest("hex");
}

function bashLiteral(value) {
  return `'${String(value).replaceAll("'", `'\\''`)}'`;
}

function bashPathExpression(value) {
  const path = assertPath(value, "node repo");
  if (path === "~") return '"$HOME"';
  if (path.startsWith("~/")) return `"$HOME"/${bashLiteral(path.slice(2))}`;
  return bashLiteral(path);
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    input: options.input,
    timeout: options.timeoutMs ?? 20_000,
    maxBuffer: MAX_OUTPUT_BYTES,
    env: process.env,
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

export function validateProcessFreshnessConfigV1(input, selectedNode = "") {
  if (!input || input.marker !== VOID_NODE_FLEET_DRIFT_CONFIG_V1) {
    fail(`config marker must be ${VOID_NODE_FLEET_DRIFT_CONFIG_V1}`);
  }
  if ((input.canonical_branch ?? "main") !== "main") fail("canonical_branch must be exact main in v1");
  if (!Array.isArray(input.nodes) || input.nodes.length < 1 || input.nodes.length > 16) {
    fail("nodes must contain 1..16 entries");
  }
  const seen = new Set();
  const nodes = input.nodes.map((node, index) => {
    if (!node || typeof node !== "object") fail(`nodes[${index}] must be an object`);
    const name = assertString(node.name, `nodes[${index}].name`);
    if (!NAME_RE.test(name)) fail(`${name} is not a valid node name`);
    if (seen.has(name)) fail(`duplicate node name ${name}`);
    seen.add(name);
    if (node.transport !== "local" && node.transport !== "ssh") fail(`${name}.transport must be local or ssh`);
    const sshTarget = node.transport === "ssh" ? assertString(node.ssh_target, `${name}.ssh_target`) : null;
    if (sshTarget && !SSH_TARGET_RE.test(sshTarget)) fail(`${name}.ssh_target is invalid`);
    const service = assertString(node.service, `${name}.service`);
    if (!SERVICE_RE.test(service)) fail(`${name}.service is not a safe user-systemd unit`);
    const httpBase = assertString(node.http_base, `${name}.http_base`).replace(/\/+$/, "");
    const httpMatch = LOOPBACK_HTTP_RE.exec(httpBase);
    if (!httpMatch || Number(httpMatch[1]) > 65535) {
      fail(`${name}.http_base must be numeric loopback HTTP with a valid port`);
    }
    return {
      name,
      transport: node.transport,
      ssh_target: sshTarget,
      repo: assertPath(node.repo, `${name}.repo`),
      service,
      http_base: httpBase,
      connect_timeout_seconds: Number.isInteger(node.connect_timeout_seconds)
        ? Math.max(1, Math.min(20, node.connect_timeout_seconds))
        : 5,
    };
  });
  if (selectedNode && !nodes.some((node) => node.name === selectedNode)) {
    fail(`selected node ${selectedNode} is not present in config`);
  }
  return selectedNode ? nodes.filter((node) => node.name === selectedNode) : nodes;
}

export function buildProcessFreshnessCollectorScriptV1(node) {
  const repo = bashPathExpression(node.repo);
  const service = bashLiteral(node.service);
  const httpBase = bashLiteral(node.http_base);
  const entrypoint = bashLiteral(PROCESS_ENTRYPOINT_V1);
  return `set -u
export LC_ALL=C
repo=${repo}
service=${service}
http_base=${httpBase}
entrypoint=${entrypoint}

if ! git -C "$repo" rev-parse --git-dir >/dev/null 2>&1; then
  printf 'repo_ok\\t0\\n'
  exit 0
fi
printf 'repo_ok\\t1\\n'
repo_real="$(readlink -f -- "$repo" 2>/dev/null || true)"
entrypoint_absolute="$repo_real/$entrypoint"
preflight_absolute="$repo_real/node_modules/tsx/dist/preflight.cjs"
loader_url="file://$repo_real/node_modules/tsx/dist/loader.mjs"
head_before="$(git -C "$repo" rev-parse HEAD 2>/dev/null || true)"
tree_before="$(git -C "$repo" rev-parse 'HEAD^{tree}' 2>/dev/null || true)"
branch_before="$(git -C "$repo" symbolic-ref --short -q HEAD 2>/dev/null || true)"
status_readable=0
status_before=""
if status_before="$(git -C "$repo" status --porcelain=v1 2>/dev/null)"; then
  status_readable=1
fi
dirty_count=0
if test -n "$status_before"; then
  dirty_count="$(printf '%s\\n' "$status_before" | wc -l | tr -d '[:space:]')"
fi
head_log="$(git -C "$repo" rev-parse --path-format=absolute --git-path logs/HEAD 2>/dev/null || true)"
head_transition_epoch=""
head_log_size=""
head_log_present=0
if test -n "$head_log" && test -f "$head_log"; then
  head_log_present=1
  head_transition_epoch="$(stat -c %Y -- "$head_log" 2>/dev/null || true)"
  head_log_size="$(stat -c %s -- "$head_log" 2>/dev/null || true)"
fi

service_show_before="$(systemctl --user show "$service" \
  --property=ActiveState --property=MainPID --property=ExecMainStartTimestamp \
  --property=InvocationID 2>/dev/null || true)"
active_state="$(printf '%s\\n' "$service_show_before" | sed -n 's/^ActiveState=//p' | tail -n 1)"
main_pid="$(printf '%s\\n' "$service_show_before" | sed -n 's/^MainPID=//p' | tail -n 1)"
start_text="$(printf '%s\\n' "$service_show_before" | sed -n 's/^ExecMainStartTimestamp=//p' | tail -n 1)"
process_invocation_id="$(printf '%s\\n' "$service_show_before" | sed -n 's/^InvocationID=//p' | tail -n 1)"
process_start_epoch="$(date --date="$start_text" +%s 2>/dev/null || true)"
process_present=0
cwd_match=0
entrypoint_match=0
executable_node=0
process_source_argv_exact=0
process_source_marker=""
process_source_commit=""
process_source_tree=""
process_source_branch=""
process_source_git_object_valid=0
process_source_ancestor_of_current=0
if printf '%s' "$main_pid" | grep -Eq '^[1-9][0-9]*$' && test -d "/proc/$main_pid"; then
  process_present=1
  process_cwd="$(readlink -f -- "/proc/$main_pid/cwd" 2>/dev/null || true)"
  test -n "$repo_real" && test "$process_cwd" = "$repo_real" && cwd_match=1
  executable="$(readlink -f -- "/proc/$main_pid/exe" 2>/dev/null || true)"
  executable_base="\${executable##*/}"
  test "$executable_base" = "node" -o "$executable_base" = "nodejs" && executable_node=1
  process_argv="$(tr '\\0' '\\n' < "/proc/$main_pid/cmdline" 2>/dev/null || true)"
  process_source_marker_arg="$(printf '%s\\n' "$process_argv" | sed -n '2p')"
  process_source_commit_arg="$(printf '%s\\n' "$process_argv" | sed -n '3p')"
  process_source_tree_arg="$(printf '%s\\n' "$process_argv" | sed -n '4p')"
  process_source_branch_arg="$(printf '%s\\n' "$process_argv" | sed -n '5p')"
  if test "$process_source_marker_arg" = "--conditions=void-process-source-identity-v1" &&
     printf '%s' "$process_source_commit_arg" | grep -Eq '^--conditions=void-process-source-commit-[0-9a-f]{40}$' &&
     printf '%s' "$process_source_tree_arg" | grep -Eq '^--conditions=void-process-source-tree-[0-9a-f]{40}$' &&
     test "$process_source_branch_arg" = "--conditions=void-process-source-branch-main"; then
    process_source_argv_exact=1
    process_source_marker="VOID_NODE_PROCESS_SOURCE_IDENTITY_V1"
    process_source_commit="\${process_source_commit_arg#--conditions=void-process-source-commit-}"
    process_source_tree="\${process_source_tree_arg#--conditions=void-process-source-tree-}"
    process_source_branch="main"
    process_source_resolved_tree="$(git -C "$repo" rev-parse "$process_source_commit^{tree}" 2>/dev/null || true)"
    test "$process_source_resolved_tree" = "$process_source_tree" && process_source_git_object_valid=1
    if git -C "$repo" merge-base --is-ancestor "$process_source_commit" "$head_before" 2>/dev/null; then
      process_source_ancestor_of_current=1
    fi
  fi
  expected_process_argv="$(printf '%s\\n' \
    "$executable" \
    --conditions=void-process-source-identity-v1 \
    "--conditions=void-process-source-commit-$process_source_commit" \
    "--conditions=void-process-source-tree-$process_source_tree" \
    --conditions=void-process-source-branch-main \
    --require \
    "$preflight_absolute" \
    --import \
    "$loader_url" \
    "$entrypoint_absolute")"
  test "$process_source_argv_exact" = 1 &&
    test "$process_argv" = "$expected_process_argv" && entrypoint_match=1
fi

health="$(curl -fsS --max-time 4 "$http_base/health" 2>/dev/null || true)"
ready="$(curl -fsS --max-time 4 "$http_base/__void/ready.json" 2>/dev/null || true)"
version="$(curl -fsS --max-time 4 "$http_base/version" 2>/dev/null || true)"

head_after="$(git -C "$repo" rev-parse HEAD 2>/dev/null || true)"
tree_after="$(git -C "$repo" rev-parse 'HEAD^{tree}' 2>/dev/null || true)"
branch_after="$(git -C "$repo" symbolic-ref --short -q HEAD 2>/dev/null || true)"
status_after_readable=0
status_after=""
if status_after="$(git -C "$repo" status --porcelain=v1 2>/dev/null)"; then
  status_after_readable=1
fi
head_transition_epoch_after=""
head_log_size_after=""
if test -n "$head_log" && test -f "$head_log"; then
  head_transition_epoch_after="$(stat -c %Y -- "$head_log" 2>/dev/null || true)"
  head_log_size_after="$(stat -c %s -- "$head_log" 2>/dev/null || true)"
fi
source_stable=0
if test "$status_readable" = 1 && test "$status_after_readable" = 1 &&
   test "$head_before" = "$head_after" && test "$tree_before" = "$tree_after" &&
   test "$branch_before" = "$branch_after" &&
   test "$status_before" = "$status_after" &&
   test "$head_transition_epoch" = "$head_transition_epoch_after" &&
   test "$head_log_size" = "$head_log_size_after"; then
  source_stable=1
fi

service_show_after="$(systemctl --user show "$service" \
  --property=ActiveState --property=MainPID --property=ExecMainStartTimestamp \
  --property=InvocationID 2>/dev/null || true)"
process_identity_stable=0
test "$service_show_before" = "$service_show_after" && process_identity_stable=1

printf 'head\\t%s\\n' "$head_before"
printf 'tree\\t%s\\n' "$tree_before"
printf 'branch\\t%s\\n' "$branch_before"
printf 'dirty_count\\t%s\\n' "$dirty_count"
printf 'worktree_status_readable\\t%s\\n' "$status_readable"
printf 'source_stable\\t%s\\n' "$source_stable"
printf 'head_log_present\\t%s\\n' "$head_log_present"
printf 'head_transition_epoch\\t%s\\n' "$head_transition_epoch"
printf 'observed_at_epoch\\t%s\\n' "$(date +%s)"
printf 'service_active\\t%s\\n' "$active_state"
printf 'process_present\\t%s\\n' "$process_present"
printf 'process_invocation_id\\t%s\\n' "$process_invocation_id"
printf 'process_start_epoch\\t%s\\n' "$process_start_epoch"
printf 'process_cwd_matches_repo\\t%s\\n' "$cwd_match"
printf 'process_entrypoint_matches\\t%s\\n' "$entrypoint_match"
printf 'process_executable_node\\t%s\\n' "$executable_node"
printf 'process_identity_stable\\t%s\\n' "$process_identity_stable"
printf 'process_source_argv_exact\\t%s\\n' "$process_source_argv_exact"
printf 'process_source_marker\\t%s\\n' "$process_source_marker"
printf 'process_source_commit\\t%s\\n' "$process_source_commit"
printf 'process_source_tree\\t%s\\n' "$process_source_tree"
printf 'process_source_branch\\t%s\\n' "$process_source_branch"
printf 'process_source_git_object_valid\\t%s\\n' "$process_source_git_object_valid"
printf 'process_source_ancestor_of_current\\t%s\\n' "$process_source_ancestor_of_current"
printf 'health_b64\\t%s\\n' "$(printf '%s' "$health" | base64 -w0 2>/dev/null || true)"
printf 'readiness_b64\\t%s\\n' "$(printf '%s' "$ready" | base64 -w0 2>/dev/null || true)"
printf 'version_b64\\t%s\\n' "$(printf '%s' "$version" | base64 -w0 2>/dev/null || true)"
`;
}

export function parseProcessFreshnessCollectorOutputV1(stdout) {
  const fields = new Map();
  for (const line of stdout.split(/\r?\n/)) {
    const tab = line.indexOf("\t");
    if (tab > 0) fields.set(line.slice(0, tab), line.slice(tab + 1));
  }
  const health = decodeBase64Json(fields.get("health_b64") ?? "");
  const readiness = decodeBase64Json(fields.get("readiness_b64") ?? "");
  const version = decodeBase64Json(fields.get("version_b64") ?? "");
  const integer = (key) => {
    const raw = fields.get(key) ?? "";
    return /^[0-9]+$/.test(raw) ? Number.parseInt(raw, 10) : null;
  };
  return {
    repo_ok: fields.get("repo_ok") === "1",
    source_head: fields.get("head") ?? "",
    source_tree: fields.get("tree") ?? "",
    source_branch: fields.get("branch") ?? "",
    dirty_count: integer("dirty_count"),
    worktree_status_readable: fields.get("worktree_status_readable") === "1",
    source_stable: fields.get("source_stable") === "1",
    head_log_present: fields.get("head_log_present") === "1",
    head_transition_epoch: integer("head_transition_epoch"),
    observed_at_epoch: integer("observed_at_epoch"),
    service_active: fields.get("service_active") === "active",
    process_present: fields.get("process_present") === "1",
    process_invocation_id: fields.get("process_invocation_id") ?? "",
    process_start_epoch: integer("process_start_epoch"),
    process_cwd_matches_repo: fields.get("process_cwd_matches_repo") === "1",
    process_entrypoint_matches: fields.get("process_entrypoint_matches") === "1",
    process_executable_node: fields.get("process_executable_node") === "1",
    process_identity_stable: fields.get("process_identity_stable") === "1",
    process_source_argv_exact: fields.get("process_source_argv_exact") === "1",
    process_source_marker: fields.get("process_source_marker") ?? "",
    process_source_commit: fields.get("process_source_commit") ?? "",
    process_source_tree: fields.get("process_source_tree") ?? "",
    process_source_branch: fields.get("process_source_branch") ?? "",
    process_source_git_object_valid: fields.get("process_source_git_object_valid") === "1",
    process_source_ancestor_of_current: fields.get("process_source_ancestor_of_current") === "1",
    health_json_ok: health.ok,
    health: health.value,
    readiness_json_ok: readiness.ok,
    readiness: readiness.value,
    version_json_ok: version.ok,
    version: version.value,
  };
}

function readinessGreen(snapshot) {
  const ready = snapshot.readiness;
  return Boolean(
    snapshot.readiness_json_ok && ready && typeof ready === "object" && ready.ready === true &&
    (!("gap" in ready) || Number(ready.gap) === 0)
  );
}

function processSourceIdentity(snapshot) {
  const argvValid = Boolean(
    snapshot.process_source_argv_exact === true &&
    snapshot.process_source_marker === VOID_NODE_PROCESS_SOURCE_IDENTITY_V1 &&
    SHA40_RE.test(snapshot.process_source_commit ?? "") &&
    SHA40_RE.test(snapshot.process_source_tree ?? "") &&
    snapshot.process_source_branch === "main"
  );
  const gitObjectValid = Boolean(argvValid && snapshot.process_source_git_object_valid === true);
  const ancestorOfCurrent = Boolean(argvValid && snapshot.process_source_ancestor_of_current === true);
  const endpoint = snapshot.version?.process_source;
  const endpointValid = Boolean(
    snapshot.version_json_ok && endpoint && typeof endpoint === "object" && !Array.isArray(endpoint) &&
    stableJson(Object.keys(endpoint).sort()) ===
      stableJson(["branch", "commit", "immutable", "marker", "tree"].sort()) &&
    endpoint.marker === VOID_NODE_PROCESS_SOURCE_IDENTITY_V1 &&
    SHA40_RE.test(endpoint.commit ?? "") && SHA40_RE.test(endpoint.tree ?? "") &&
    endpoint.branch === "main" && endpoint.immutable === true
  );
  const endpointMatchesArgv = Boolean(
    argvValid && endpointValid &&
    endpoint.marker === snapshot.process_source_marker &&
    endpoint.commit === snapshot.process_source_commit &&
    endpoint.tree === snapshot.process_source_tree &&
    endpoint.branch === snapshot.process_source_branch
  );
  return {
    argv_valid: argvValid,
    endpoint_valid: endpointValid,
    endpoint_matches_argv: endpointMatchesArgv,
    git_object_valid: gitObjectValid,
    ancestor_of_current: ancestorOfCurrent,
    bound: argvValid && gitObjectValid && ancestorOfCurrent && endpointValid && endpointMatchesArgv,
    commit: argvValid ? snapshot.process_source_commit : null,
    tree: argvValid ? snapshot.process_source_tree : null,
    branch: argvValid ? snapshot.process_source_branch : null,
  };
}

export function classifyProcessFreshnessV1(snapshot) {
  const reasons = [];
  const processSource = processSourceIdentity(snapshot);
  if (!snapshot.repo_ok) reasons.push("repo_unavailable");
  if (!SHA40_RE.test(snapshot.source_head ?? "")) reasons.push("invalid_source_head");
  if (!SHA40_RE.test(snapshot.source_tree ?? "")) reasons.push("invalid_source_tree");
  if (snapshot.source_branch !== "main") reasons.push("source_branch_not_main");
  if (!snapshot.worktree_status_readable) reasons.push("worktree_status_unreadable");
  if (snapshot.worktree_status_readable && snapshot.dirty_count !== 0) reasons.push("worktree_dirty");
  if (!snapshot.source_stable) reasons.push("source_changed_during_collection");
  if (!snapshot.head_log_present || !Number.isSafeInteger(snapshot.head_transition_epoch)) reasons.push("head_transition_time_unavailable");
  if (!snapshot.service_active) reasons.push("service_inactive");
  if (!snapshot.process_present) reasons.push("main_process_unavailable");
  if (!SYSTEMD_INVOCATION_ID_RE.test(snapshot.process_invocation_id ?? "")) {
    reasons.push("process_invocation_id_unavailable");
  }
  if (!Number.isSafeInteger(snapshot.process_start_epoch)) reasons.push("process_start_time_unavailable");
  if (!Number.isSafeInteger(snapshot.observed_at_epoch)) reasons.push("observation_time_unavailable");
  if (!snapshot.process_cwd_matches_repo) reasons.push("process_cwd_mismatch");
  if (!snapshot.process_entrypoint_matches) reasons.push("process_entrypoint_mismatch");
  if (!snapshot.process_executable_node) reasons.push("process_executable_not_node");
  if (!snapshot.process_identity_stable) reasons.push("process_changed_during_collection");
  if (!processSource.argv_valid) reasons.push("process_source_argv_unavailable");
  if (processSource.argv_valid && !processSource.git_object_valid) {
    reasons.push("process_source_git_object_invalid");
  }
  if (processSource.argv_valid && processSource.git_object_valid && !processSource.ancestor_of_current) {
    reasons.push("process_source_not_ancestor_of_current");
  }
  if (!processSource.endpoint_valid) reasons.push("process_source_endpoint_unavailable");
  if (processSource.argv_valid && processSource.endpoint_valid &&
      !processSource.endpoint_matches_argv) {
    reasons.push("process_source_endpoint_argv_mismatch");
  }
  if (!snapshot.health_json_ok || snapshot.health?.ok !== true) reasons.push("health_not_green");
  if (!readinessGreen(snapshot)) reasons.push("readiness_not_green");
  if (Number.isSafeInteger(snapshot.observed_at_epoch) && Number.isSafeInteger(snapshot.process_start_epoch) &&
      snapshot.process_start_epoch > snapshot.observed_at_epoch + 5) reasons.push("process_start_time_in_future");
  if (Number.isSafeInteger(snapshot.observed_at_epoch) && Number.isSafeInteger(snapshot.head_transition_epoch) &&
      snapshot.head_transition_epoch > snapshot.observed_at_epoch + 5) reasons.push("head_transition_time_in_future");

  let classification = "HOLD";
  let delta = null;
  let processSourceMatchesCurrent = false;
  if (reasons.length === 0) {
    delta = snapshot.process_start_epoch - snapshot.head_transition_epoch;
    processSourceMatchesCurrent =
      processSource.commit === snapshot.source_head &&
      processSource.tree === snapshot.source_tree &&
      processSource.branch === snapshot.source_branch;
    if (delta >= 1 && processSourceMatchesCurrent) {
      classification = "PROCESS_SOURCE_ALIGNED";
    } else if (delta <= -1 && processSource.commit !== snapshot.source_head) {
      classification = "STALE_SOURCE_AFTER_PROCESS_START";
    } else if (delta > -1 && delta < 1) {
      reasons.push("timestamp_order_ambiguous");
    } else {
      reasons.push("process_source_timeline_inconsistent");
    }
  }
  const versionCommit = typeof snapshot.version?.git_commit === "string"
    ? snapshot.version.git_commit
    : typeof snapshot.version?.git?.commit === "string" ? snapshot.version.git.commit : "";
  const diagnosticMatches = Boolean(
    SHA_PREFIX_RE.test(versionCommit) && SHA40_RE.test(snapshot.source_head ?? "") &&
    snapshot.source_head.startsWith(versionCommit)
  );
  return {
    classification,
    reasons: [...new Set(reasons)].sort(),
    source_to_process_start_seconds: delta,
    process_source_identity_bound: processSource.bound,
    process_source_commit: processSource.commit,
    process_source_tree: processSource.tree,
    process_source_matches_current: processSourceMatchesCurrent,
    version_git_commit_matches_source_head_diagnostic_only: diagnosticMatches,
  };
}

export function buildFleetProcessFreshnessDecisionV1(nodes) {
  const hold = nodes.some((node) => node.classification === "HOLD");
  const stale = nodes.some((node) => node.classification === "STALE_SOURCE_AFTER_PROCESS_START");
  const decision = hold ? "HOLD" : stale ? "RESTART_REQUIRED" : "PROCESS_FRESH";
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
  return { decision, audit_id_sha256: sha256(payload) };
}

export function collectNodeProcessFreshnessV1(node) {
  const script = buildProcessFreshnessCollectorScriptV1(node);
  const result = node.transport === "local"
    ? run("bash", ["-s"], { input: script, timeoutMs: 20_000 })
    : run("ssh", [
      "-o", "BatchMode=yes",
      "-o", `ConnectTimeout=${node.connect_timeout_seconds}`,
      node.ssh_target,
      "bash", "-s",
    ], { input: script, timeoutMs: 25_000 });
  if (!result.ok) {
    return {
      name: node.name,
      transport: node.transport,
      reachable: false,
      classification: "HOLD",
      reasons: ["collector_transport_failed"],
      source_head: null,
      source_tree: null,
      source_to_process_start_seconds: null,
      process_invocation_id: null,
      process_source_identity_bound: false,
      process_source_commit: null,
      process_source_tree: null,
      process_source_matches_current: false,
      version_git_commit_matches_source_head_diagnostic_only: false,
    };
  }
  const snapshot = parseProcessFreshnessCollectorOutputV1(result.stdout);
  const assessment = classifyProcessFreshnessV1(snapshot);
  return {
    name: node.name,
    transport: node.transport,
    reachable: true,
    source_head: SHA40_RE.test(snapshot.source_head) ? snapshot.source_head : null,
    source_tree: SHA40_RE.test(snapshot.source_tree) ? snapshot.source_tree : null,
    source_branch: snapshot.source_branch || null,
    dirty_count: snapshot.dirty_count,
    worktree_status_readable: snapshot.worktree_status_readable,
    source_stable: snapshot.source_stable,
    service_active: snapshot.service_active,
    process_present: snapshot.process_present,
    process_cwd_matches_repo: snapshot.process_cwd_matches_repo,
    process_entrypoint: PROCESS_ENTRYPOINT_V1,
    process_entrypoint_matches: snapshot.process_entrypoint_matches,
    process_executable_node: snapshot.process_executable_node,
    process_identity_stable: snapshot.process_identity_stable,
    head_transition_epoch: snapshot.head_transition_epoch,
    process_invocation_id: SYSTEMD_INVOCATION_ID_RE.test(snapshot.process_invocation_id)
      ? snapshot.process_invocation_id
      : null,
    process_start_epoch: snapshot.process_start_epoch,
    observed_at_epoch: snapshot.observed_at_epoch,
    health_ok: Boolean(snapshot.health_json_ok && snapshot.health?.ok === true),
    readiness_ok: readinessGreen(snapshot),
    classification: assessment.classification,
    reasons: assessment.reasons,
    source_to_process_start_seconds: assessment.source_to_process_start_seconds,
    process_source_identity_bound: assessment.process_source_identity_bound,
    process_source_commit: assessment.process_source_commit,
    process_source_tree: assessment.process_source_tree,
    process_source_matches_current: assessment.process_source_matches_current,
    version_git_commit_matches_source_head_diagnostic_only:
      assessment.version_git_commit_matches_source_head_diagnostic_only,
  };
}

function parseValue(argv, index, label) {
  const value = argv[index + 1];
  if (!value || value.startsWith("--")) fail(`${label} requires a value`);
  return value;
}

function parseArgs(argv) {
  const out = {
    config: "~/.config/void/node-fleet-drift-audit-v1.json",
    output: "",
    node: "",
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--config") out.config = parseValue(argv, i++, arg);
    else if (arg === "--output") out.output = parseValue(argv, i++, arg);
    else if (arg === "--node") out.node = parseValue(argv, i++, arg);
    else if (arg === "--help") {
      console.log("Usage: node tools/void-node-fleet-process-freshness-audit-v1.mjs [--config PATH] [--node NAME] [--output PATH]");
      process.exit(0);
    } else fail(`unknown argument: ${arg}`);
  }
  if (out.node && !NAME_RE.test(out.node)) fail("--node must be a valid exact node name");
  return out;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const configPath = expandHome(assertPath(args.config, "config path"));
  const input = JSON.parse(readFileSync(configPath, "utf8"));
  const configNodes = validateProcessFreshnessConfigV1(input, args.node);
  const nodes = configNodes.map(collectNodeProcessFreshnessV1);
  const fleet = buildFleetProcessFreshnessDecisionV1(nodes);
  const output = {
    marker: VOID_NODE_FLEET_PROCESS_FRESHNESS_AUDIT_V1,
    version: 1,
    decision: fleet.decision,
    audit_id_sha256: fleet.audit_id_sha256,
    expected_process_entrypoint: PROCESS_ENTRYPOINT_V1,
    nodes,
    process_source_identity_required: true,
    version_git_commit_is_process_identity: false,
    mutation_attempted: false,
    authority: {
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
    },
  };
  const json = `${JSON.stringify(output, null, 2)}\n`;
  if (args.output) {
    const outputPath = expandHome(assertPath(args.output, "output path"));
    writeFileSync(outputPath, json, { encoding: "utf8", mode: 0o600 });
    chmodSync(outputPath, 0o600);
  }
  process.stdout.write(json);
  process.exitCode = fleet.decision === "HOLD" ? 2 : fleet.decision === "RESTART_REQUIRED" ? 3 : 0;
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : "";
if (invokedPath && fileURLToPath(import.meta.url) === invokedPath) {
  try {
    main();
  } catch (error) {
    console.error(JSON.stringify({
      marker: VOID_NODE_FLEET_PROCESS_FRESHNESS_AUDIT_V1,
      decision: "HOLD",
      error: String(error?.message || error),
      mutation_attempted: false,
    }));
    process.exitCode = 1;
  }
}
