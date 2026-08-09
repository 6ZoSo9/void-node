#!/usr/bin/env node
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { chmodSync, mkdtempSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import {
  VOID_NODE_FLEET_DRIFT_AUDIT_V1,
  VOID_NODE_FLEET_DRIFT_CONFIG_V1,
  buildConvergencePlanV1,
  validateFleetAuditV1,
  validateFleetConfigV1,
} from "../tools/void-node-fleet-source-convergence-v1.mjs";
import {
  VOID_NODE_FLEET_PROCESS_FRESHNESS_AUDIT_V1,
  buildFleetProcessFreshnessDecisionV1,
} from "../tools/void-node-fleet-process-freshness-audit-v1.mjs";
import {
  VOID_NODE_FLEET_PROCESS_RESTART_APPLY_V1,
  assessPostRestartV1,
  assessPreRestartV1,
  buildRestartApplyScriptV1,
  buildRestartCollectorScriptV1,
  buildRestartPlanV1,
  classifyRestartOnlyPathsV1,
  collectRestartSnapshotV1,
  inspectRestartTransitionV1,
  validateProcessFreshnessAuditV1,
  validateRestartConfirmationsV1,
  validateSourceConvergenceReceiptV1,
} from "../tools/void-node-fleet-process-restart-controller-v1.mjs";

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

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd,
    input: options.input,
    encoding: "utf8",
    timeout: options.timeoutMs ?? 25_000,
    env: options.env ?? process.env,
  });
  if (options.allowFailure) return result;
  assert.equal(result.status, 0, `${command} ${args.join(" ")} failed:\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`);
  return result.stdout.trim();
}

function git(cwd, ...args) {
  return run("git", args, { cwd });
}

function shellLiteral(value) {
  return `'${String(value).replaceAll("'", `'\\''`)}'`;
}

function baseConfig(coordinatorRepo, nodeRepo, expectedRemoteUrl, port = 4101) {
  return {
    marker: VOID_NODE_FLEET_DRIFT_CONFIG_V1,
    coordinator_repo: coordinatorRepo,
    canonical_remote: "origin",
    canonical_branch: "main",
    nodes: [{
      name: "nimo",
      transport: "local",
      repo: nodeRepo,
      service: "void-node-live.service",
      http_base: `http://127.0.0.1:${port}`,
      min_peers: 1,
      expected_remote_url: expectedRemoteUrl,
    }],
  };
}

function buildDriftAudit(fromSha, toSha, runtimeRelevantPathCount = 1) {
  const node = {
    name: "nimo",
    transport: "local",
    reachable: true,
    repo_ok: true,
    head: fromSha,
    branch: "main",
    dirty_count: 0,
    service_active: true,
    health_ok: true,
    readiness_ok: true,
    peer_count: 1,
    comparison: {
      relation: "behind",
      commits_behind: 1,
      commits_ahead: 0,
      changed_paths: ["src/index.ts"],
      path_classification: { runtime_relevant_path_count: runtimeRelevantPathCount },
    },
    classification: "BEHIND_RUNTIME_RELEVANT",
    reasons: [],
  };
  const audit = {
    marker: VOID_NODE_FLEET_DRIFT_AUDIT_V1,
    version: 1,
    canonical: { remote: "origin", branch: "main", sha: toSha },
    decision: "CONVERGENCE_RECOMMENDED",
    audit_id_sha256: "",
    convergence_candidates: [{
      name: "nimo",
      from_sha: fromSha,
      to_sha: toSha,
      classification: node.classification,
      commits_behind: 1,
      runtime_relevant_path_count: runtimeRelevantPathCount,
    }],
    nodes: [node],
    mutation_attempted: false,
    authority: {
      git_fetch: false,
      git_pull: false,
      checkout: false,
      reset: false,
      service_restart: false,
      deployment: false,
      credential_read: false,
      wallet_or_signer: false,
      transaction: false,
      funds_moved: false,
    },
  };
  audit.audit_id_sha256 = sha256({
    marker: VOID_NODE_FLEET_DRIFT_AUDIT_V1,
    canonical_sha: toSha,
    decision: audit.decision,
    nodes: [{
      name: node.name,
      head: node.head,
      classification: node.classification,
      reasons: node.reasons,
      relation: node.comparison.relation,
      commits_behind: node.comparison.commits_behind,
      runtime_relevant_path_count: runtimeRelevantPathCount,
    }],
  });
  return audit;
}

function buildSourceReceipt(config, fromSha, toSha) {
  const validatedAudit = validateFleetAuditV1(buildDriftAudit(fromSha, toSha), config, "nimo");
  const plan = buildConvergencePlanV1(validatedAudit, config);
  return {
    marker: "VOID_NODE_FLEET_SOURCE_CONVERGENCE_V1",
    version: 1,
    outcome: "SOURCE_SYNCED",
    plan,
    reasons: [],
    mutation_attempted: true,
    mutation_succeeded: true,
    transport_exit_code: 0,
    automatic_retry: false,
    fresh_audit_required_before_retry: false,
    runtime_restarted: false,
    runtime_deployment_claimed: false,
    authority: {
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
    },
  };
}

function buildFreshnessAudit(sourceSha, processStartEpoch = 1_700_000_000, headTransitionEpoch = 1_700_000_010) {
  const node = {
    name: "nimo",
    transport: "local",
    reachable: true,
    source_head: sourceSha,
    source_branch: "main",
    dirty_count: 0,
    worktree_status_readable: true,
    source_stable: true,
    service_active: true,
    process_present: true,
    process_cwd_matches_repo: true,
    process_entrypoint: "src/index.ts",
    process_entrypoint_matches: true,
    process_executable_node: true,
    process_identity_stable: true,
    head_transition_epoch: headTransitionEpoch,
    process_start_epoch: processStartEpoch,
    observed_at_epoch: headTransitionEpoch + 5,
    health_ok: true,
    readiness_ok: true,
    classification: "STALE_SOURCE_AFTER_PROCESS_START",
    reasons: [],
    source_to_process_start_seconds: processStartEpoch - headTransitionEpoch,
    version_git_commit_matches_source_head_diagnostic_only: true,
  };
  const fleet = buildFleetProcessFreshnessDecisionV1([node]);
  return {
    marker: VOID_NODE_FLEET_PROCESS_FRESHNESS_AUDIT_V1,
    version: 1,
    decision: fleet.decision,
    audit_id_sha256: fleet.audit_id_sha256,
    expected_process_entrypoint: "src/index.ts",
    nodes: [node],
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
}

const fixedFrom = "1".repeat(40);
const fixedTo = "2".repeat(40);
const fixedConfig = validateFleetConfigV1(baseConfig("/tmp/coordinator", "/tmp/node", "/tmp/origin.git"), "nimo");
const fixedReceipt = buildSourceReceipt(fixedConfig, fixedFrom, fixedTo);
const validatedReceipt = validateSourceConvergenceReceiptV1(fixedReceipt, fixedConfig, "nimo");
const fixedFreshnessAudit = buildFreshnessAudit(fixedTo);
const validatedFreshness = validateProcessFreshnessAuditV1(fixedFreshnessAudit, "nimo", fixedTo);

assert.equal(validatedReceipt.from_sha, fixedFrom);
assert.equal(validatedReceipt.to_sha, fixedTo);
assert.equal(validatedFreshness.old_process_start_epoch, 1_700_000_000);
assert.throws(
  () => validateProcessFreshnessAuditV1({ ...fixedFreshnessAudit, decision: "PROCESS_FRESH" }, "nimo", fixedTo),
  /RESTART_REQUIRED/,
);
const tamperedFreshness = structuredClone(fixedFreshnessAudit);
tamperedFreshness.nodes[0].process_start_epoch -= 1;
assert.throws(() => validateProcessFreshnessAuditV1(tamperedFreshness, "nimo", fixedTo), /ID|timestamp/);
const heldFreshness = structuredClone(fixedFreshnessAudit);
heldFreshness.nodes[0].classification = "HOLD";
assert.throws(() => validateProcessFreshnessAuditV1(heldFreshness, "nimo", fixedTo), /HOLD/);

const tamperedReceipt = structuredClone(fixedReceipt);
tamperedReceipt.plan.to_sha = "3".repeat(40);
assert.throws(() => validateSourceConvergenceReceiptV1(tamperedReceipt, fixedConfig, "nimo"), /plan ID/);
const restartedReceipt = structuredClone(fixedReceipt);
restartedReceipt.runtime_restarted = true;
assert.throws(() => validateSourceConvergenceReceiptV1(restartedReceipt, fixedConfig, "nimo"), /mutation\/runtime truth/);
const authorityReceipt = structuredClone(fixedReceipt);
authorityReceipt.authority.build = true;
assert.throws(() => validateSourceConvergenceReceiptV1(authorityReceipt, fixedConfig, "nimo"), /authority/);

const safePaths = [
  "src/index.ts",
  "public/index.html",
  "docs/operations/note.md",
  "scripts/prove_note.mjs",
];
const safePolicy = classifyRestartOnlyPathsV1(safePaths);
assert.equal(safePolicy.restart_only_eligible, true);
assert.equal(safePolicy.runtime_loadable_path_count, 2);
assert.equal(safePolicy.evidence_only_path_count, 2);
for (const path of [
  "package-lock.json",
  "ops/run-void-node-live-v1.sh",
  "config/network.json",
  "integrations/adapter.ts",
  "unknown.runtime",
]) {
  const policy = classifyRestartOnlyPathsV1(["src/index.ts", path]);
  assert.equal(policy.restart_only_eligible, false, `${path} must block restart-only apply`);
  assert.equal(policy.blocked_path_count, 1);
}
assert.deepEqual(classifyRestartOnlyPathsV1(["docs/readme.md"]).reasons, ["no_runtime_loadable_change"]);
assert.throws(() => classifyRestartOnlyPathsV1(["src/../package.json"]), /unsafe repository path/);
assert.throws(() => classifyRestartOnlyPathsV1(["src/index.ts", "src/index.ts"]), /duplicate/);

const fixedTransition = {
  ok: true,
  reasons: [],
  changed_paths: safePaths,
  path_policy: safePolicy,
  changed_paths_sha256: sha256(safePaths),
};
const fixedPlan = buildRestartPlanV1(validatedReceipt, validatedFreshness, fixedTransition, fixedConfig);
assert.match(fixedPlan.plan_id_sha256, /^[0-9a-f]{64}$/);
assert.deepEqual(buildRestartPlanV1(validatedReceipt, validatedFreshness, fixedTransition, fixedConfig), fixedPlan);
assert.equal("repo" in fixedPlan, false);
assert.equal("ssh_target" in fixedPlan, false);
assert.equal("service" in fixedPlan, false);
assert.equal("http_base" in fixedPlan, false);

const confirmations = {
  confirmOperation: VOID_NODE_FLEET_PROCESS_RESTART_APPLY_V1,
  confirmFreshnessAuditId: fixedPlan.freshness_audit_id_sha256,
  confirmSourcePlanId: fixedPlan.source_plan_id_sha256,
  confirmRestartPlanId: fixedPlan.plan_id_sha256,
  confirmNode: fixedPlan.node,
  confirmFromSha: fixedPlan.from_sha,
  confirmSourceSha: fixedPlan.source_sha,
  confirmOldProcessStartEpoch: String(fixedPlan.old_process_start_epoch),
};
assert.equal(validateRestartConfirmationsV1(confirmations, fixedPlan), true);
for (const key of Object.keys(confirmations)) {
  assert.throws(() => validateRestartConfirmationsV1({ ...confirmations, [key]: `${confirmations[key]} ` }, fixedPlan), /mismatch/);
}

const greenSnapshot = {
  reachable: true,
  repo_ok: true,
  source_head: fixedPlan.source_sha,
  source_branch: "main",
  dirty_count: 0,
  worktree_status_readable: true,
  source_stable: true,
  remote_url: fixedConfig.node.expected_remote_url,
  shallow: false,
  git_operation_in_progress: false,
  service_active: true,
  process_present: true,
  process_cwd_matches_repo: true,
  process_entrypoint_matches: true,
  process_executable_node: true,
  process_identity_stable: true,
  health_json_ok: true,
  health: { ok: true },
  readiness_json_ok: true,
  readiness: { ready: true, gap: 0 },
  peers_json_ok: true,
  peer_count: 1,
  classification: "STALE_SOURCE_AFTER_PROCESS_START",
  reasons: [],
  process_start_epoch: fixedPlan.old_process_start_epoch,
  head_transition_epoch: fixedPlan.head_transition_epoch,
};
assert.equal(assessPreRestartV1(greenSnapshot, fixedConfig, fixedPlan).ok, true);
assert.deepEqual(
  assessPreRestartV1({ ...greenSnapshot, peer_count: 0, process_start_epoch: fixedPlan.old_process_start_epoch + 1 }, fixedConfig, fixedPlan).reasons,
  ["peer_floor_not_met", "process_identity_advanced"],
);
const postSnapshot = {
  ...greenSnapshot,
  classification: "PROCESS_SOURCE_ALIGNED",
  process_start_epoch: fixedPlan.head_transition_epoch + 5,
};
assert.equal(assessPostRestartV1(postSnapshot, fixedConfig, fixedPlan).ok, true);
assert.equal(assessPostRestartV1({ ...postSnapshot, readiness: { ready: false } }, fixedConfig, fixedPlan).ok, false);

const collectorScript = buildRestartCollectorScriptV1(fixedConfig.node);
assert.ok(collectorScript.indexOf("peers=") < collectorScript.indexOf("head_after="), "peer evidence must be inside source/process bracketing");
assert.doesNotMatch(collectorScript, /systemctl --user (?:start|stop|restart)/);
const applyScript = buildRestartApplyScriptV1(fixedConfig, fixedPlan);
assert.equal((applyScript.match(/systemctl --user restart/g) ?? []).length, 1, "apply must contain exactly one restart operation");
assert.match(applyScript, /expected_process_argv/);
assert.match(applyScript, /node_modules\/tsx\/dist\/preflight\.cjs/);
assert.match(applyScript, /node_modules\/tsx\/dist\/loader\.mjs/);
assert.doesNotMatch(applyScript, /grep -Fxq -e "\$entrypoint"/,
  "apply must not accept the expected entrypoint as an arbitrary argv token");
for (const forbidden of [
  /systemctl --user (?:start|stop|enable|disable|reload|daemon-reload)/,
  /\bgit[^\n]*\b(?:fetch|pull|merge|reset|checkout|switch)\b/,
  /\b(?:npm|pnpm|yarn|sudo)\b/,
  /\brm\s/,
]) assert.doesNotMatch(applyScript, forbidden);

const transitionRoot = mkdtempSync(join(tmpdir(), "void-restart-transition-v1-"));
try {
  const remote = join(transitionRoot, "origin.git");
  const repo = join(transitionRoot, "repo");
  git(transitionRoot, "init", "--bare", remote);
  mkdirSync(repo);
  git(repo, "init", "-b", "main");
  git(repo, "config", "user.name", "VOID Proof");
  git(repo, "config", "user.email", "proof@void.invalid");
  mkdirSync(join(repo, "src"));
  writeFileSync(join(repo, "src", "index.ts"), "export const value = 1;\n");
  git(repo, "add", "--", "src/index.ts");
  git(repo, "commit", "-m", "runtime one");
  const fromSha = git(repo, "rev-parse", "HEAD");
  git(repo, "remote", "add", "origin", remote);
  git(repo, "push", "-u", "origin", "main");
  mkdirSync(join(repo, "docs"));
  writeFileSync(join(repo, "src", "index.ts"), "export const value = 2;\n");
  writeFileSync(join(repo, "docs", "note.md"), "evidence\n");
  git(repo, "add", "--", "src/index.ts", "docs/note.md");
  git(repo, "commit", "-m", "runtime two");
  const safeToSha = git(repo, "rev-parse", "HEAD");
  git(repo, "push", "origin", "main");
  const config = validateFleetConfigV1(baseConfig(repo, repo, remote), "nimo");
  const safe = inspectRestartTransitionV1(config, fromSha, safeToSha);
  assert.equal(safe.ok, true);
  assert.deepEqual(safe.changed_paths, ["docs/note.md", "src/index.ts"]);
  writeFileSync(join(repo, "package.json"), "{\"type\":\"module\"}\n");
  git(repo, "add", "--", "package.json");
  git(repo, "commit", "-m", "dependency boundary");
  const blockedToSha = git(repo, "rev-parse", "HEAD");
  git(repo, "push", "origin", "main");
  const blocked = inspectRestartTransitionV1(config, safeToSha, blockedToSha);
  assert.equal(blocked.ok, false);
  assert.ok(blocked.reasons.includes("restart_only_transition_not_proven"));
} finally {
  rmSync(transitionRoot, { recursive: true, force: true });
}

function delay(milliseconds) {
  return new Promise((resolveDelay) => setTimeout(resolveDelay, milliseconds));
}

async function waitForJson(url, predicate, timeoutMs = 8_000) {
  const deadline = Date.now() + timeoutMs;
  let lastDiagnostic = "no response";
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      const value = await response.json();
      if (response.ok && predicate(value)) return value;
      lastDiagnostic = `status=${response.status} body=${JSON.stringify(value)}`;
    } catch (error) {
      lastDiagnostic = String(error?.message || error);
    }
    await delay(100);
  }
  assert.fail(`timed out waiting for ${url}: ${lastDiagnostic}`);
}

async function moveToLaterSecond(epoch) {
  while (Math.floor(Date.now() / 1000) <= epoch) await delay(100);
}

const liveRoot = mkdtempSync(join(tmpdir(), "void-process-restart-live-v1-"));
const priorPath = process.env.PATH;
const proofEnvironmentKeys = [
  "VOID_PROOF_MAIN_PID",
  "VOID_PROOF_REPO",
  "VOID_PROOF_NODE_EXE",
  "VOID_PROOF_REAL_READLINK",
  "VOID_PROOF_REAL_TR",
  "VOID_PROOF_CMDLINE_MODE",
  "VOID_PROOF_DECOY_ENTRY",
  "VOID_PROOF_PROC_VISIBLE",
  "VOID_PROOF_MAIN_PID_OVERRIDE",
];
const priorProofEnvironment = new Map(proofEnvironmentKeys.map((key) => [key, process.env[key]]));
let oldChild = null;
let decoyChild = null;
try {
  const remote = join(liveRoot, "origin.git");
  const repo = join(liveRoot, "repo");
  const fakeBin = join(liveRoot, "bin");
  const state = join(liveRoot, "state");
  const log = join(liveRoot, "node.log");
  mkdirSync(repo);
  mkdirSync(fakeBin);
  mkdirSync(state);
  git(liveRoot, "init", "--bare", remote);
  git(repo, "init", "-b", "main");
  git(repo, "config", "user.name", "VOID Proof");
  git(repo, "config", "user.email", "proof@void.invalid");
  git(repo, "remote", "add", "origin", remote);
  mkdirSync(join(repo, "src"));
  writeFileSync(join(repo, ".gitignore"), "node_modules/\n");
  writeFileSync(join(repo, "package.json"), "{\"type\":\"module\"}\n");
  writeFileSync(join(repo, "src", "payload.txt"), "one\n");
  writeFileSync(join(repo, "src", "index.ts"), `
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createServer } from "node:http";
const loaded = readFileSync(new URL("./payload.txt", import.meta.url), "utf8").trim();
const json = (res, value) => { res.setHeader("content-type", "application/json"); res.end(JSON.stringify(value)); };
const server = createServer((req, res) => {
  if (req.url === "/health") return json(res, { ok: true });
  if (req.url === "/__void/ready.json") return json(res, { ready: true, gap: 0 });
  if (req.url === "/p2p/peers") return json(res, { connected: [{ id: "proof-peer" }] });
  if (req.url === "/version") return json(res, { git_commit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim() });
  if (req.url === "/loaded") return json(res, { loaded });
  res.statusCode = 404; res.end();
});
server.listen(Number(process.env.VOID_PROOF_PORT), "127.0.0.1");
for (const signal of ["SIGTERM", "SIGINT"]) process.on(signal, () => server.close(() => process.exit(0)));
`);
  git(repo, "add", "--", ".gitignore", "package.json", "src/payload.txt", "src/index.ts");
  git(repo, "commit", "-m", "live v1");
  const fromSha = git(repo, "rev-parse", "HEAD");
  git(repo, "push", "-u", "origin", "main");

  const tsxDist = join(repo, "node_modules", "tsx", "dist");
  mkdirSync(join(repo, "node_modules"));
  mkdirSync(join(repo, "node_modules", "tsx"));
  mkdirSync(tsxDist);
  const preflightPath = join(tsxDist, "preflight.cjs");
  const loaderPath = join(tsxDist, "loader.mjs");
  writeFileSync(preflightPath, "module.exports = {};\n");
  writeFileSync(loaderPath, "export {};\n");

  const port = 43_000 + (process.pid % 1_000);
  const entrypoint = join(repo, "src", "index.ts");
  const oldStartEpoch = Math.floor(Date.now() / 1000);
  oldChild = spawn(process.execPath, [
    "--require", preflightPath,
    "--import", pathToFileURL(loaderPath).href,
    entrypoint,
  ], {
    cwd: repo,
    env: { ...process.env, VOID_PROOF_PORT: String(port) },
    stdio: ["ignore", "ignore", "ignore"],
  });
  writeFileSync(join(state, "pid"), `${oldChild.pid}\n`);
  writeFileSync(join(state, "start_epoch"), `${oldStartEpoch}\n`);
  await waitForJson(`http://127.0.0.1:${port}/loaded`, (value) => value.loaded === "one");

  const fakeSystemctl = join(fakeBin, "systemctl");
  writeFileSync(fakeSystemctl, `#!/usr/bin/env bash
set -euo pipefail
test "$1" = --user
shift
command="$1"
shift
pid_file=${shellLiteral(join(state, "pid"))}
epoch_file=${shellLiteral(join(state, "start_epoch"))}
case "$command" in
  show)
    epoch="$(cat "$epoch_file")"
    kill -0 "$(cat "$pid_file")"
    if test -n "\${VOID_PROOF_MAIN_PID_OVERRIDE:-}"; then
      main_pid="$VOID_PROOF_MAIN_PID_OVERRIDE"
    elif test "\${VOID_PROOF_PROC_VISIBLE:-0}" = 1; then
      main_pid="$(cat "$pid_file")"
    else
      main_pid="$VOID_PROOF_MAIN_PID"
    fi
    printf 'ActiveState=active\\n'
    printf 'MainPID=%s\\n' "$main_pid"
    printf 'ExecMainStartTimestamp=%s\\n' "$(date -u --date="@$epoch" '+%Y-%m-%d %H:%M:%S UTC')"
    ;;
  restart)
    old_pid="$(cat "$pid_file")"
    kill "$old_pid"
    for unused in $(seq 1 50); do
      kill -0 "$old_pid" 2>/dev/null || break
      sleep 0.02
    done
    cd ${shellLiteral(repo)}
    VOID_PROOF_PORT=${shellLiteral(String(port))} nohup \
      ${shellLiteral(process.execPath)} \
      --require ${shellLiteral(preflightPath)} \
      --import ${shellLiteral(pathToFileURL(loaderPath).href)} \
      ${shellLiteral(entrypoint)} >>${shellLiteral(log)} 2>&1 &
    new_pid=$!
    printf '%s\\n' "$new_pid" > "$pid_file"
    date +%s > "$epoch_file"
    ;;
  *) exit 64 ;;
esac
`);
  chmodSync(fakeSystemctl, 0o755);
  const procVisible = run("bash", ["-c", `test -d /proc/${oldChild.pid}`], { allowFailure: true }).status === 0;
  const collectorPid = procVisible ? oldChild.pid : 1;
  if (!procVisible) {
    const realReadlink = run("sh", ["-c", "command -v readlink"]);
    const realTr = run("sh", ["-c", "command -v tr"]);
    const fakeReadlink = join(fakeBin, "readlink");
    const fakeTr = join(fakeBin, "tr");
    writeFileSync(fakeReadlink, `#!/bin/sh
last=""
for last do :; done
case "$last" in
  "/proc/$VOID_PROOF_MAIN_PID/cwd") printf '%s\\n' "$VOID_PROOF_REPO" ;;
  "/proc/$VOID_PROOF_MAIN_PID/exe") printf '%s\\n' "$VOID_PROOF_NODE_EXE" ;;
  *) exec "$VOID_PROOF_REAL_READLINK" "$@" ;;
esac
`);
    writeFileSync(fakeTr, `#!/bin/sh
if test "$#" -eq 2 && test "$1" = '\\0' && test "$2" = '\\n'; then
  if test "\${VOID_PROOF_CMDLINE_MODE:-exact}" = decoy; then
    printf '%s\\n' \
      "$VOID_PROOF_NODE_EXE" \
      "$VOID_PROOF_DECOY_ENTRY" \
      "$VOID_PROOF_REPO/src/index.ts"
  else
    printf '%s\\n' \
      "$VOID_PROOF_NODE_EXE" \
      --require \
      "$VOID_PROOF_REPO/node_modules/tsx/dist/preflight.cjs" \
      --import \
      "file://$VOID_PROOF_REPO/node_modules/tsx/dist/loader.mjs" \
      "$VOID_PROOF_REPO/src/index.ts"
  fi
else
  exec "$VOID_PROOF_REAL_TR" "$@"
fi
`);
    chmodSync(fakeReadlink, 0o755);
    chmodSync(fakeTr, 0o755);
    process.env.VOID_PROOF_REPO = repo;
    process.env.VOID_PROOF_NODE_EXE = process.execPath;
    process.env.VOID_PROOF_REAL_READLINK = realReadlink;
    process.env.VOID_PROOF_REAL_TR = realTr;
  }
  process.env.VOID_PROOF_MAIN_PID = String(collectorPid);
  process.env.VOID_PROOF_PROC_VISIBLE = procVisible ? "1" : "0";
  process.env.PATH = `${fakeBin}:${priorPath}`;

  await moveToLaterSecond(oldStartEpoch);
  writeFileSync(join(repo, "src", "payload.txt"), "two\n");
  git(repo, "add", "--", "src/payload.txt");
  git(repo, "commit", "-m", "live v2");
  const sourceSha = git(repo, "rev-parse", "HEAD");
  git(repo, "push", "origin", "main");
  const headLog = git(repo, "rev-parse", "--path-format=absolute", "--git-path", "logs/HEAD");
  const headTransitionEpoch = Math.floor(statSync(headLog).mtimeMs / 1000);
  await moveToLaterSecond(headTransitionEpoch);
  assert.deepEqual(await waitForJson(`http://127.0.0.1:${port}/loaded`, (value) => value.loaded === "one"), { loaded: "one" });

  const config = validateFleetConfigV1(baseConfig(repo, repo, remote, port), "nimo");
  const before = collectRestartSnapshotV1(config);
  assert.equal(before.classification, "STALE_SOURCE_AFTER_PROCESS_START", JSON.stringify(before));
  const sourceReceipt = buildSourceReceipt(config, fromSha, sourceSha);
  const freshnessAudit = buildFreshnessAudit(sourceSha, oldStartEpoch, headTransitionEpoch);
  const configPath = join(liveRoot, "fleet-config.json");
  const sourceReceiptPath = join(liveRoot, "source-receipt.json");
  const freshnessPath = join(liveRoot, "freshness.json");
  const planOutputPath = join(liveRoot, "restart-plan.json");
  writeFileSync(configPath, `${JSON.stringify(baseConfig(repo, repo, remote, port), null, 2)}\n`);
  writeFileSync(sourceReceiptPath, `${JSON.stringify(sourceReceipt, null, 2)}\n`);
  writeFileSync(freshnessPath, `${JSON.stringify(freshnessAudit, null, 2)}\n`);
  const controllerPath = join(process.cwd(), "tools", "void-node-fleet-process-restart-controller-v1.mjs");
  const dryRun = JSON.parse(run(process.execPath, [
    controllerPath,
    "--node", "nimo",
    "--config", configPath,
    "--source-convergence-receipt", sourceReceiptPath,
    "--freshness-audit", freshnessPath,
    "--output", planOutputPath,
    "--postcheck-seconds", "5",
  ], { env: process.env }));
  assert.equal(dryRun.outcome, "READY_TO_APPLY");
  assert.equal(dryRun.mutation_attempted, false);
  assert.equal(dryRun.plan.path_policy.restart_only_eligible, true);
  assert.equal(statSync(planOutputPath).mode & 0o777, 0o600);
  assert.deepEqual(JSON.parse(readFileSync(planOutputPath, "utf8")), dryRun);
  chmodSync(planOutputPath, 0o644);
  run(process.execPath, [
    controllerPath,
    "--node", "nimo",
    "--config", configPath,
    "--source-convergence-receipt", sourceReceiptPath,
    "--freshness-audit", freshnessPath,
    "--output", planOutputPath,
    "--postcheck-seconds", "5",
  ], { env: process.env });
  assert.equal(statSync(planOutputPath).mode & 0o777, 0o600, "existing restart receipts must be tightened to 0600");
  assert.equal(assessPreRestartV1(before, config, dryRun.plan).ok, true);

  const decoyPath = join(liveRoot, "old-entry.cjs");
  writeFileSync(decoyPath, "setInterval(() => {}, 1000);\n");
  decoyChild = spawn(process.execPath, [decoyPath, entrypoint], {
    cwd: repo,
    stdio: ["ignore", "ignore", "ignore"],
  });
  await delay(100);
  assert.equal(decoyChild.exitCode, null, "decoy process must remain live for apply-preflight proof");
  process.env.VOID_PROOF_MAIN_PID_OVERRIDE = String(procVisible ? decoyChild.pid : 1);
  process.env.VOID_PROOF_CMDLINE_MODE = "decoy";
  process.env.VOID_PROOF_DECOY_ENTRY = decoyPath;
  const decoyApply = run("bash", ["-s"], {
    input: buildRestartApplyScriptV1(config, dryRun.plan),
    allowFailure: true,
    timeoutMs: 20_000,
  });
  assert.notEqual(decoyApply.status, 0, "a different script with the expected path as an argument must fail before restart");
  assert.equal(readFileSync(join(state, "pid"), "utf8").trim(), String(oldChild.pid),
    "rejected decoy identity must not invoke systemctl restart");
  assert.deepEqual(await waitForJson(`http://127.0.0.1:${port}/loaded`, (value) => value.loaded === "one"), { loaded: "one" });
  delete process.env.VOID_PROOF_MAIN_PID_OVERRIDE;
  process.env.VOID_PROOF_CMDLINE_MODE = "exact";
  decoyChild.kill("SIGTERM");
  await Promise.race([
    new Promise((resolveExit) => decoyChild.once("exit", resolveExit)),
    delay(2_000),
  ]);
  if (decoyChild.exitCode === null) decoyChild.kill("SIGKILL");

  const appliedRun = JSON.parse(run(process.execPath, [
    controllerPath,
    "--node", "nimo",
    "--config", configPath,
    "--source-convergence-receipt", sourceReceiptPath,
    "--freshness-audit", freshnessPath,
    "--postcheck-seconds", "5",
    "--apply",
    "--confirm-operation", VOID_NODE_FLEET_PROCESS_RESTART_APPLY_V1,
    "--confirm-freshness-audit-id", dryRun.plan.freshness_audit_id_sha256,
    "--confirm-source-plan-id", dryRun.plan.source_plan_id_sha256,
    "--confirm-restart-plan-id", dryRun.plan.plan_id_sha256,
    "--confirm-node", dryRun.plan.node,
    "--confirm-from-sha", dryRun.plan.from_sha,
    "--confirm-source-sha", dryRun.plan.source_sha,
    "--confirm-old-process-start-epoch", String(dryRun.plan.old_process_start_epoch),
  ], { env: process.env, timeoutMs: 30_000 }));
  assert.equal(appliedRun.outcome, "PROCESS_RESTARTED");
  assert.equal(appliedRun.mutation_attempted, true);
  assert.equal(appliedRun.mutation_succeeded, true);
  assert.equal(appliedRun.runtime_transition_proven, true);
  assert.equal(appliedRun.authority.service_start_or_restart_attempted, true);
  assert.equal(appliedRun.authority.service_restart_proven, true);
  assert.equal(appliedRun.authority.git_mutation, false);

  let after = collectRestartSnapshotV1(config);
  let afterAssessment = assessPostRestartV1(after, config, dryRun.plan);
  const deadline = Date.now() + 8_000;
  while (!afterAssessment.ok && Date.now() < deadline) {
    await delay(100);
    after = collectRestartSnapshotV1(config);
    afterAssessment = assessPostRestartV1(after, config, dryRun.plan);
  }
  assert.deepEqual(afterAssessment.reasons, []);
  assert.ok(after.process_start_epoch > oldStartEpoch);
  assert.deepEqual(await waitForJson(`http://127.0.0.1:${port}/loaded`, (value) => value.loaded === "two"), { loaded: "two" });
  assert.equal(git(repo, "rev-parse", "HEAD"), sourceSha);
  assert.equal(git(repo, "status", "--porcelain=v1"), "");
} finally {
  process.env.PATH = priorPath;
  for (const [key, value] of priorProofEnvironment) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  try {
    const pid = Number.parseInt(readFileSync(join(liveRoot, "state", "pid"), "utf8"), 10);
    if (Number.isInteger(pid) && pid > 1) process.kill(pid, "SIGTERM");
  } catch (error) {
    if (error?.code !== "ENOENT" && error?.code !== "ESRCH") throw error;
  }
  if (oldChild && oldChild.exitCode === null) {
    try {
      oldChild.kill("SIGTERM");
    } catch (error) {
      if (error?.code !== "ESRCH") throw error;
    }
  }
  if (decoyChild && decoyChild.exitCode === null) {
    try {
      decoyChild.kill("SIGTERM");
    } catch (error) {
      if (error?.code !== "ESRCH") throw error;
    }
  }
  rmSync(liveRoot, { recursive: true, force: true });
}

console.log("VOID_NODE_FLEET_PROCESS_RESTART_CONTROLLER_V1_PROOF_GREEN");
