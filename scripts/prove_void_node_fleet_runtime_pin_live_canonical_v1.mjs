#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import {
  VOID_NODE_FLEET_DRIFT_AUDIT_V1,
  VOID_NODE_FLEET_PROCESS_FRESHNESS_AUDIT_V1,
  reproduceFleetDecisionV1,
  reproduceProcessFreshnessDecisionV1,
} from "../tools/void-node-fleet-runtime-pin-status-v1.mjs";
import {
  assertCanonicalBracketV1,
  assertCanonicalEvaluationGitEnvironmentV1,
  evaluateRuntimePinStatusLiveCanonicalV1,
  inspectReviewedGitExecutableV1,
  publishReservedEvidenceOutputV1,
  queryCanonicalMainExplicitUrlV1,
  reserveEvidenceOutputV1,
  resolveSafeEvidenceOutputPathV1,
  sampleLiveCanonicalMainV1,
} from "../ops/run_void_node_fleet_runtime_pin_status_v1.mjs";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
void ROOT;
const REVIEWED_GIT = realpathSync("/usr/bin/git");

function git(cwd, args, env = process.env) {
  const result = spawnSync(REVIEWED_GIT, args, {
    cwd,
    encoding: "utf8",
    timeout: 10_000,
    env: { ...env, GIT_TERMINAL_PROMPT: "0" },
  });
  assert.equal(result.status, 0, `git ${args.join(" ")} failed: ${result.stderr || result.stdout}`);
  return result.stdout.trim();
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function pathClassification(runtimeRelevant = 0) {
  return {
    runtime_core: runtimeRelevant ? ["src/example.ts"] : [],
    operator_surface: [],
    public_surface: [],
    protocol_source: [],
    integration_runtime: [],
    evidence_only: runtimeRelevant ? [] : ["docs/example.md"],
    review_required: [],
    runtime_relevant_path_count: runtimeRelevant,
    evidence_only_path_count: runtimeRelevant ? 0 : 1,
    changed_path_count: 1,
  };
}

function driftNode(head, canonical) {
  const current = head === canonical;
  return {
    name: "precision",
    transport: "local",
    reachable: true,
    repo_ok: true,
    head,
    branch: "main",
    dirty_count: 0,
    service_active: true,
    health_ok: true,
    readiness_ok: true,
    peer_count: 1,
    comparison: current
      ? {
          relation: "current",
          commits_behind: 0,
          commits_ahead: 0,
          changed_paths: [],
          path_classification: pathClassification(0),
        }
      : {
          relation: "behind",
          commits_behind: 1,
          commits_ahead: 0,
          changed_paths: ["src/example.ts"],
          path_classification: pathClassification(1),
        },
    classification: current ? "CURRENT" : "BEHIND_RUNTIME_RELEVANT",
    reasons: [],
  };
}

function driftAudit(head, canonical) {
  const nodes = [driftNode(head, canonical)];
  const reproduced = reproduceFleetDecisionV1(canonical, nodes);
  return {
    marker: VOID_NODE_FLEET_DRIFT_AUDIT_V1,
    version: 1,
    canonical: { remote: "origin", branch: "main", sha: canonical },
    decision: reproduced.decision,
    audit_id_sha256: reproduced.audit_id_sha256,
    convergence_candidates: reproduced.convergence_candidates,
    nodes,
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
}

function processAudit(sourceHead, sourceTree, nowEpoch) {
  const node = {
    name: "precision",
    transport: "local",
    reachable: true,
    source_head: sourceHead,
    source_tree: sourceTree,
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
    head_transition_epoch: nowEpoch - 20,
    process_invocation_id: "a".repeat(32),
    process_start_epoch: nowEpoch - 10,
    observed_at_epoch: nowEpoch,
    health_ok: true,
    readiness_ok: true,
    classification: "PROCESS_SOURCE_ALIGNED",
    reasons: [],
    source_to_process_start_seconds: 10,
    process_source_identity_bound: true,
    process_source_commit: sourceHead,
    process_source_tree: sourceTree,
    process_source_matches_current: true,
    version_git_commit_matches_source_head_diagnostic_only: true,
  };
  const nodes = [node];
  const reproduced = reproduceProcessFreshnessDecisionV1(nodes);
  return {
    marker: VOID_NODE_FLEET_PROCESS_FRESHNESS_AUDIT_V1,
    version: 1,
    decision: reproduced.decision,
    audit_id_sha256: reproduced.audit_id_sha256,
    expected_process_entrypoint: "src/index.ts",
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
}

function evidence(audit) {
  return {
    audit,
    file_sha256: sha256(JSON.stringify(audit)),
    mtime_epoch_ms: Date.now() - 1000,
  };
}

function evalPacket({ coordinator, remote, drift, process, approved, env = process.env, outputCreated = false }) {
  return evaluateRuntimePinStatusLiveCanonicalV1({
    driftEvidence: evidence(drift),
    processEvidence: evidence(process),
    approvedRuntimeSha: approved,
    coordinatorRepo: coordinator,
    gitExecutable: REVIEWED_GIT,
    expectedCanonicalUrl: remote,
    env,
    evaluatedAtEpochMs: Date.now(),
    evidenceOutputCreated: outputCreated,
  });
}

const tempRoot = mkdtempSync(join(tmpdir(), "void-runtime-pin-live-canonical-"));
try {
  const remote = join(tempRoot, "remote.git");
  const alternate = join(tempRoot, "alternate.git");
  const coordinator = join(tempRoot, "coordinator");
  git(tempRoot, ["init", "--bare", remote]);
  git(tempRoot, ["init", "--bare", alternate]);
  git(tempRoot, ["init", coordinator]);
  git(coordinator, ["config", "user.name", "VOID proof"]);
  git(coordinator, ["config", "user.email", "void-proof@example.invalid"]);
  writeFileSync(join(coordinator, "fixture.txt"), "A\n");
  git(coordinator, ["add", "fixture.txt"]);
  git(coordinator, ["commit", "-m", "fixture A"]);
  git(coordinator, ["branch", "-M", "main"]);
  git(coordinator, ["remote", "add", "origin", remote]);
  git(coordinator, ["push", "-u", "origin", "main"]);
  const commitA = git(coordinator, ["rev-parse", "HEAD"]);
  const treeA = git(coordinator, ["rev-parse", "HEAD^{tree}"]);
  const nowEpoch = Math.floor(Date.now() / 1000) - 1;
  const driftA = driftAudit(commitA, commitA);
  const processA = processAudit(commitA, treeA, nowEpoch);

  const gitIdentity = inspectReviewedGitExecutableV1(REVIEWED_GIT);
  assert.equal(gitIdentity.path, REVIEWED_GIT);
  assert.equal(gitIdentity.sha256, sha256(readFileSync(REVIEWED_GIT)));

  const currentPacket = evalPacket({
    coordinator,
    remote,
    drift: driftA,
    process: processA,
    approved: commitA,
  });
  assert.equal(currentPacket.status, "CURRENT_WITH_MAIN");
  assert.equal(currentPacket.canonical_git_executable.path, REVIEWED_GIT);
  assert.match(currentPacket.operator_evidence_id_sha256, /^[0-9a-f]{64}$/);

  writeFileSync(join(coordinator, "fixture.txt"), "B\n");
  git(coordinator, ["add", "fixture.txt"]);
  git(coordinator, ["commit", "-m", "fixture B"]);
  git(coordinator, ["push", "origin", "main"]);
  const commitB = git(coordinator, ["rev-parse", "HEAD"]);
  assert.notEqual(commitB, commitA);

  assert.throws(
    () => evalPacket({ coordinator, remote, drift: driftA, process: processA, approved: commitA }),
    /canonical main is stale/,
  );

  const driftB = driftAudit(commitA, commitB);
  const pinnedPacket = evalPacket({
    coordinator,
    remote,
    drift: driftB,
    process: processAudit(commitA, treeA, Math.floor(Date.now() / 1000) - 1),
    approved: commitA,
  });
  assert.equal(pinnedPacket.status, "HEALTHY_INTENTIONAL_PIN");
  assert.equal(pinnedPacket.canonical_main_sha, commitB);
  assert.equal(pinnedPacket.nodes[0].process_source_commit, commitA);

  git(coordinator, ["remote", "add", "alternate", alternate]);
  git(coordinator, ["push", "alternate", `${commitA}:refs/heads/main`]);

  const globalHome = join(tempRoot, "global-home");
  mkdirSync(nlobalHome);
  writeFileSync(
    join(globalHome, ".gitconfig"),
    `[url "${alternate}"]\n\tinsteadOf = ${remote}\n`,
  );
  const globalEnv = { ...process.env, HOME: globalHome };
  assert.equal(git(coordinator, ["remote", "get-url", "origin"], globalEnv), alternate);
  assert.throws(
    () => evalPacket({ coordinator, remote, drift: driftB, process: processA, approved: commitA, env: globalEnv }),
    /ambient Git URL rewrite changes canonical remote identity/,
  );
  assert.equal(
    queryCanonicalMainExplicitUrlV1({ canonicalUrl: remote, gitExecutable: REVIEWED_GIT, env: globalEnv }),
    commitB,
  );

  const xdgHome = join(tempRoot, "xdg-home");
  const xdgConfigHome = join(tempRoot, "xdg-config");
  mkdirSync(xdgHome);
  mkdirSync(join(xdgConfigHome, "git"), { recursive: true });
  writeFileSync(join(xdgConfigHome, "git", "config"), `[url "${alternate}"]\n\tinsteadOf = ${remote}\n`);
  const xdgEnv = { ...process.env, HOME: xdgHome, XDG_CONFIG_HOME: xdgConfigHome };
  assert.equal(git(coordinator, ["remote", "get-url", "origin"], xdgEnv), alternate);
  assert.throws(
    () => evalPacket({ coordinator, remote, drift: driftB,