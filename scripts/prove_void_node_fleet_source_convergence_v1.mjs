#!/usr/bin/env node
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import {
  VOID_NODE_FLEET_DRIFT_AUDIT_V1,
  VOID_NODE_FLEET_DRIFT_CONFIG_V1,
  VOID_NODE_FLEET_SOURCE_CONVERGENCE_APPLY_V1,
  assessInspectionV1,
  buildApplyScriptV1,
  buildConvergencePlanV1,
  buildInspectionScriptV1,
  validateApplyConfirmationsV1,
  validateFleetAuditV1,
  validateFleetConfigV1,
} from "../tools/void-node-fleet-source-convergence-v1.mjs";

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
    timeout: 20_000,
    env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
  });
  if (options.allowFailure) return result;
  assert.equal(result.status, 0, `${command} ${args.join(" ")} failed:\n${result.stderr}`);
  return result.stdout.trim();
}

function git(cwd, ...args) {
  return run("git", args, { cwd });
}

function baseConfig(repo, expectedRemoteUrl) {
  return {
    marker: VOID_NODE_FLEET_DRIFT_CONFIG_V1,
    coordinator_repo: repo,
    canonical_remote: "origin",
    canonical_branch: "main",
    nodes: [{
      name: "nimo",
      transport: "local",
      repo,
      service: "void-node-live.service",
      http_base: "http://127.0.0.1:4101",
      min_peers: 1,
      expected_remote_url: expectedRemoteUrl,
    }],
  };
}

function buildAudit(fromSha, toSha, overrides = {}) {
  const runtimeRelevant = overrides.runtime_relevant_path_count ?? 3;
  const classification = overrides.classification ?? "BEHIND_RUNTIME_RELEVANT";
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
    peer_count: 2,
    comparison: {
      relation: "behind",
      commits_behind: 1,
      commits_ahead: 0,
      changed_paths: ["src/index.ts"],
      path_classification: { runtime_relevant_path_count: runtimeRelevant },
    },
    classification,
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
      classification,
      commits_behind: 1,
      runtime_relevant_path_count: runtimeRelevant,
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
      runtime_relevant_path_count: node.comparison.path_classification.runtime_relevant_path_count,
    }],
  });
  return audit;
}

const fixedFrom = "1".repeat(40);
const fixedTo = "2".repeat(40);
const fixedConfig = validateFleetConfigV1(baseConfig("/tmp/void-fixture", "/tmp/void-origin.git"), "nimo");
const fixedAudit = buildAudit(fixedFrom, fixedTo);
const validatedAudit = validateFleetAuditV1(fixedAudit, fixedConfig, "nimo");
const fixedPlan = buildConvergencePlanV1(validatedAudit, fixedConfig);

assert.equal(fixedPlan.node, "nimo");
assert.equal(fixedPlan.from_sha, fixedFrom);
assert.equal(fixedPlan.to_sha, fixedTo);
assert.match(fixedPlan.plan_id_sha256, /^[0-9a-f]{64}$/);
assert.deepEqual(buildConvergencePlanV1(validatedAudit, fixedConfig), fixedPlan, "plan must be deterministic");
assert.equal("repo" in fixedPlan, false, "sanitized plan must not expose repo path");
assert.equal("ssh_target" in fixedPlan, false, "sanitized plan must not expose SSH target");
assert.equal("expected_remote_url" in fixedPlan, false, "sanitized plan must not expose remote URL");

const confirmations = {
  confirmOperation: VOID_NODE_FLEET_SOURCE_CONVERGENCE_APPLY_V1,
  confirmAuditId: fixedPlan.audit_id_sha256,
  confirmPlanId: fixedPlan.plan_id_sha256,
  confirmNode: fixedPlan.node,
  confirmFromSha: fixedPlan.from_sha,
  confirmTargetSha: fixedPlan.to_sha,
};
assert.equal(validateApplyConfirmationsV1(confirmations, fixedPlan), true);
for (const key of Object.keys(confirmations)) {
  assert.throws(() => validateApplyConfirmationsV1({ ...confirmations, [key]: `${confirmations[key]} ` }, fixedPlan), /mismatch/);
}
assert.throws(() => validateApplyConfirmationsV1({ ...confirmations, confirmPlanId: fixedPlan.plan_id_sha256.toUpperCase() }, fixedPlan), /mismatch/);

const malformedCases = [
  { label: "wrong marker", mutate: (audit) => { audit.marker = "WRONG"; } },
  { label: "hold decision", mutate: (audit) => { audit.decision = "HOLD"; } },
  { label: "prior mutation", mutate: (audit) => { audit.mutation_attempted = true; } },
  { label: "authority escalation", mutate: (audit) => { audit.authority.git_fetch = true; } },
  { label: "candidate mismatch", mutate: (audit) => { audit.convergence_candidates[0].to_sha = "3".repeat(40); } },
  { label: "dirty node", mutate: (audit) => { audit.nodes[0].dirty_count = 1; } },
  { label: "unhealthy node", mutate: (audit) => { audit.nodes[0].health_ok = false; } },
  { label: "audit digest mismatch", mutate: (audit) => { audit.nodes[0].peer_count = 99; audit.nodes[0].head = "4".repeat(40); } },
];
for (const test of malformedCases) {
  const audit = structuredClone(fixedAudit);
  test.mutate(audit);
  assert.throws(() => validateFleetAuditV1(audit, fixedConfig, "nimo"), undefined, test.label);
}

assert.throws(() => validateFleetConfigV1({ ...baseConfig("/tmp/x", "/tmp/o"), canonical_branch: "release" }, "nimo"), /exact main/);
const unsafeService = baseConfig("/tmp/x", "/tmp/o");
unsafeService.nodes[0].service = "--user";
assert.throws(() => validateFleetConfigV1(unsafeService, "nimo"), /safe user-systemd unit/);
const unsafeHttp = baseConfig("/tmp/x", "/tmp/o");
unsafeHttp.nodes[0].http_base = "http://example.com:4100";
assert.throws(() => validateFleetConfigV1(unsafeHttp, "nimo"), /numeric loopback/);

const inspectionGood = {
  repo_ok: true,
  head: fixedFrom,
  branch: "main",
  dirty_count: 0,
  remote_url: "/tmp/void-origin.git",
  shallow: false,
  git_operation_in_progress: false,
  service_active: true,
  health_json_ok: true,
  health: { ok: true },
  readiness_json_ok: true,
  readiness: { ready: true, gap: 0 },
  peers_json_ok: true,
  peers: {
    connected: [{ id: "a", addr: "127.0.0.1:4700" }],
    knownAddrs: ["127.0.0.1:4700"],
    verifiedPeers: [],
  },
};
assert.deepEqual(assessInspectionV1(inspectionGood, fixedConfig, fixedFrom).reasons, []);
assert.deepEqual(
  assessInspectionV1({
    ...inspectionGood,
    peers: {
      connected: [],
      knownAddrs: ["127.0.0.1:4700"],
      verifiedPeers: [{ node_id: "cached-peer", addresses: ["127.0.0.1:4700"] }],
    },
  }, fixedConfig, fixedFrom).reasons,
  ["peer_floor_not_met"],
);
assert.deepEqual(
  assessInspectionV1({ ...inspectionGood, dirty_count: 1, git_operation_in_progress: true }, fixedConfig, fixedFrom).reasons,
  ["git_operation_in_progress", "worktree_dirty"],
);

const inspectionScript = buildInspectionScriptV1(fixedConfig);
assert.match(inspectionScript, /systemctl --user is-active/);
assert.doesNotMatch(inspectionScript, /systemctl --user (?:start|stop|restart)/);
const applyScript = buildApplyScriptV1(fixedConfig, fixedPlan);
assert.match(applyScript, /fetch --no-tags --no-recurse-submodules/);
assert.match(applyScript, /merge --ff-only/);
for (const forbidden of [
  /\bgit[^\n]*\bpull\b/,
  /\bgit[^\n]*\breset\b/,
  /\bgit[^\n]*\bcheckout\b/,
  /\bsystemctl\b/,
  /\bnpm\b/,
  /\bpnpm\b/,
  /\byarn\b/,
  /\bsudo\b/,
  /\brm\s/,
]) assert.doesNotMatch(applyScript, forbidden);

const root = mkdtempSync(join(tmpdir(), "void-fleet-source-convergence-v1-"));
try {
  const remote = join(root, "origin.git");
  const seed = join(root, "seed");
  const good = join(root, "good");
  const race = join(root, "race");
  mkdirSync(seed);
  git(root, "init", "--bare", remote);
  git(seed, "init", "-b", "main");
  git(seed, "config", "user.name", "VOID Proof");
  git(seed, "config", "user.email", "proof@void.invalid");
  writeFileSync(join(seed, "state.txt"), "one\n");
  git(seed, "add", "--", "state.txt");
  git(seed, "commit", "-m", "first");
  const fromSha = git(seed, "rev-parse", "HEAD");
  git(seed, "remote", "add", "origin", remote);
  git(seed, "push", "-u", "origin", "main");
  git(root, "clone", "--branch", "main", remote, good);
  git(root, "clone", "--branch", "main", remote, race);

  writeFileSync(join(seed, "state.txt"), "two\n");
  git(seed, "add", "--", "state.txt");
  git(seed, "commit", "-m", "second");
  const toSha = git(seed, "rev-parse", "HEAD");
  git(seed, "push", "origin", "main");

  const fixtureConfig = validateFleetConfigV1(baseConfig(good, remote), "nimo");
  const fixtureAudit = validateFleetAuditV1(buildAudit(fromSha, toSha), fixtureConfig, "nimo");
  const fixturePlan = buildConvergencePlanV1(fixtureAudit, fixtureConfig);
  assert.equal(git(good, "rev-parse", "HEAD"), fromSha, "plan construction must not mutate source");
  run("bash", ["-s"], { input: buildApplyScriptV1(fixtureConfig, fixturePlan) });
  assert.equal(git(good, "rev-parse", "HEAD"), toSha, "apply must fast-forward to exact target");
  assert.equal(git(good, "status", "--porcelain=v1"), "", "apply must leave a clean worktree");

  writeFileSync(join(seed, "state.txt"), "three\n");
  git(seed, "add", "--", "state.txt");
  git(seed, "commit", "-m", "third");
  git(seed, "push", "origin", "main");
  const raceConfig = validateFleetConfigV1(baseConfig(race, remote), "nimo");
  const racePlan = buildConvergencePlanV1(validateFleetAuditV1(buildAudit(fromSha, toSha), raceConfig, "nimo"), raceConfig);
  const raced = run("bash", ["-s"], { input: buildApplyScriptV1(raceConfig, racePlan), allowFailure: true });
  assert.notEqual(raced.status, 0, "advanced remote main must fail closed");
  assert.equal(git(race, "rev-parse", "HEAD"), fromSha, "target drift must not change source HEAD");
  assert.equal(git(race, "status", "--porcelain=v1"), "", "target drift must leave source clean");
} finally {
  rmSync(root, { recursive: true, force: true });
}

console.log("VOID_NODE_FLEET_SOURCE_CONVERGENCE_V1_PROOF_GREEN");
