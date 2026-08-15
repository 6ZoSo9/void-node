#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
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

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const RUNNER = join(ROOT, "ops/run_void_node_fleet_runtime_pin_status_v1.mjs");

function git(cwd, args) {
  const result = spawnSync("git", args, {
    cwd,
    encoding: "utf8",
    timeout: 10_000,
    env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
  });
  assert.equal(
    result.status,
    0,
    `git ${args.join(" ")} failed: ${result.stderr || result.stdout}`,
  );
  return result.stdout.trim();
}

function sha256Stable(value) {
  function stableJson(input) {
    if (Array.isArray(input)) return `[${input.map(stableJson).join(",")}]`;
    if (input && typeof input === "object") {
      return `{${Object.keys(input)
        .sort()
        .map((key) => `${JSON.stringify(key)}:${stableJson(input[key])}`)
        .join(",")}}`;
    }
    return JSON.stringify(input);
  }
  return createHash("sha256").update(stableJson(value)).digest("hex");
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

function runEvaluator({ coordinatorRepo, driftPath, processPath, approvedSha, outputPath, env = {} }) {
  return spawnSync(
    process.execPath,
    [
      RUNNER,
      "--coordinator-repo",
      coordinatorRepo,
      "--drift-audit",
      driftPath,
      "--process-freshness-audit",
      processPath,
      "--approved-runtime-sha",
      approvedSha,
      "--max-evidence-age-seconds",
      "300",
      "--output",
      outputPath,
    ],
    {
      cwd: ROOT,
      encoding: "utf8",
      timeout: 20_000,
      env: { ...process.env, ...env },
    },
  );
}

const tempRoot = mkdtempSync(join(tmpdir(), "void-runtime-pin-live-canonical-"));
try {
  const remote = join(tempRoot, "remote.git");
  const coordinator = join(tempRoot, "coordinator");
  git(tempRoot, ["init", "--bare", remote]);
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
  const driftPath = join(tempRoot, "drift.json");
  const processPath = join(tempRoot, "process.json");
  writeFileSync(driftPath, `${JSON.stringify(driftA, null, 2)}\n`);
  writeFileSync(processPath, `${JSON.stringify(processA, null, 2)}\n`);

  const currentOutput = join(tempRoot, "current.json");
  const currentRun = runEvaluator({
    coordinatorRepo: coordinator,
    driftPath,
    processPath,
    approvedSha: commitA,
    outputPath: currentOutput,
  });
  assert.equal(currentRun.status, 0, currentRun.stderr || currentRun.stdout);
  const currentPacket = JSON.parse(readFileSync(currentOutput, "utf8"));
  assert.equal(currentPacket.status, "CURRENT_WITH_MAIN");
  assert.equal(currentPacket.canonical_main_sha, commitA);

  writeFileSync(join(coordinator, "fixture.txt"), "B\n");
  git(coordinator, ["add", "fixture.txt"]);
  git(coordinator, ["commit", "-m", "fixture B"]);
  git(coordinator, ["push", "origin", "main"]);
  const commitB = git(coordinator, ["rev-parse", "HEAD"]);
  assert.notEqual(commitB, commitA);

  // Recreate the old drift bytes after canonical main moved. Filesystem freshness
  // alone must not restore authority to claim CURRENT_WITH_MAIN.
  writeFileSync(driftPath, `${JSON.stringify(driftA, null, 2)}\n`);
  const staleOutput = join(tempRoot, "stale.json");
  const staleRun = runEvaluator({
    coordinatorRepo: coordinator,
    driftPath,
    processPath,
    approvedSha: commitA,
    outputPath: staleOutput,
  });
  assert.equal(staleRun.status, 1);
  assert.equal(existsSync(staleOutput), false);
  const staleError = JSON.parse(staleRun.stderr.trim());
  assert.equal(staleError.status, "HOLD");
  assert.match(staleError.error, /canonical main is stale/);
  assert.equal(staleError.mutation_attempted, false);
  assert.equal(staleError.canonical_remote_read_only, true);

  // Fresh source/process evidence at A with canonical B is still a legitimate
  // intentional runtime pin when A is the explicit approved runtime.
  const freshDriftB = driftAudit(commitA, commitB);
  writeFileSync(driftPath, `${JSON.stringify(freshDriftB, null, 2)}\n`);
  writeFileSync(
    processPath,
    `${JSON.stringify(processAudit(commitA, treeA, Math.floor(Date.now() / 1000) - 1), null, 2)}\n`,
  );
  const pinnedOutput = join(tempRoot, "pinned.json");
  const pinnedRun = runEvaluator({
    coordinatorRepo: coordinator,
    driftPath,
    processPath,
    approvedSha: commitA,
    outputPath: pinnedOutput,
  });
  assert.equal(pinnedRun.status, 0, pinnedRun.stderr || pinnedRun.stdout);
  const pinnedPacket = JSON.parse(readFileSync(pinnedOutput, "utf8"));
  assert.equal(pinnedPacket.status, "HEALTHY_INTENTIONAL_PIN");
  assert.equal(pinnedPacket.canonical_main_sha, commitB);
  assert.equal(pinnedPacket.nodes[0].process_source_commit, commitA);

  const redirectedOutput = join(tempRoot, "redirected.json");
  const redirectedRun = runEvaluator({
    coordinatorRepo: coordinator,
    driftPath,
    processPath,
    approvedSha: commitA,
    outputPath: redirectedOutput,
    env: { GIT_DIR: remote },
  });
  assert.equal(redirectedRun.status, 1);
  assert.equal(existsSync(redirectedOutput), false);
  assert.match(redirectedRun.stderr, /override environment is not allowed/);

  assert.equal(
    sha256Stable({ stale: commitA, live: commitB }) !==
      sha256Stable({ stale: commitA, live: commitA }),
    true,
  );

  console.log(`fresh_current_sha=${commitA}`);
  console.log(`advanced_canonical_sha=${commitB}`);
  console.log("copied_or_touched_stale_drift_rejected=true");
  console.log("live_canonical_bracket_required=true");
  console.log("fresh_intentional_pin_preserved=true");
  console.log("git_selection_override_rejected=true");
  console.log("network_mutation_performed=false");
  console.log("git_fetch_performed=false");
  console.log("service_or_runtime_mutation_performed=false");
  console.log("VOID_NODE_FLEET_RUNTIME_PIN_LIVE_CANONICAL_V1_PROOF_GREEN");
} finally {
  rmSync(tempRoot, { recursive: true, force: true });
}
