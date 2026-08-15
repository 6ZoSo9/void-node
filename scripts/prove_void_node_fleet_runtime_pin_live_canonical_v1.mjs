#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
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
  publishReservedEvidenceOutputV1,
  queryCanonicalMainExplicitUrlV1,
  reserveEvidenceOutputV1,
  resolveSafeEvidenceOutputPathV1,
  sampleLiveCanonicalMainV1,
} from "../ops/run_void_node_fleet_runtime_pin_status_v1.mjs";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
void ROOT;

function git(cwd, args, env = process.env) {
  const result = spawnSync("git", args, {
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
  const currentPacket = evalPacket({
    coordinator,
    remote,
    drift: driftA,
    process: processA,
    approved: commitA,
  });
  assert.equal(currentPacket.status, "CURRENT_WITH_MAIN");

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
  mkdirSync(globalHome);
  writeFileSync(
    join(globalHome, ".gitconfig"),
    `[url "${alternate}"]\n\tinsteadOf = ${remote}\n`,
  );
  const globalEnv = { ...process.env, HOME: globalHome };
  assert.equal(git(coordinator, ["remote", "get-url", "origin"], globalEnv), alternate);
  const globalOutput = join(tempRoot, "global-rewrite-output.json");
  assert.throws(
    () => {
      const packet = evalPacket({
        coordinator,
        remote,
        drift: driftB,
        process: processA,
        approved: commitA,
        env: globalEnv,
      });
      writeFileSync(globalOutput, `${JSON.stringify(packet)}\n`);
    },
    /ambient Git URL rewrite changes canonical remote identity/,
  );
  assert.equal(existsSync(globalOutput), false);
  assert.equal(queryCanonicalMainExplicitUrlV1({ canonicalUrl: remote, env: globalEnv }), commitB);

  const xdgHome = join(tempRoot, "xdg-home");
  const xdgConfigHome = join(tempRoot, "xdg-config");
  mkdirSync(xdgHome);
  mkdirSync(join(xdgConfigHome, "git"), { recursive: true });
  writeFileSync(
    join(xdgConfigHome, "git", "config"),
    `[url "${alternate}"]\n\tinsteadOf = ${remote}\n`,
  );
  const xdgEnv = {
    ...process.env,
    HOME: xdgHome,
    XDG_CONFIG_HOME: xdgConfigHome,
  };
  assert.equal(git(coordinator, ["remote", "get-url", "origin"], xdgEnv), alternate);
  const xdgOutput = join(tempRoot, "xdg-rewrite-output.json");
  assert.throws(
    () => {
      const packet = evalPacket({
        coordinator,
        remote,
        drift: driftB,
        process: processA,
        approved: commitA,
        env: xdgEnv,
      });
      writeFileSync(xdgOutput, `${JSON.stringify(packet)}\n`);
    },
    /ambient Git URL rewrite changes canonical remote identity/,
  );
  assert.equal(existsSync(xdgOutput), false);
  assert.equal(queryCanonicalMainExplicitUrlV1({ canonicalUrl: remote, env: xdgEnv }), commitB);

  const tlsOverrides = [
    ["GIT_SSL_NO_VERIFY", "1"],
    ["GIT_SSL_CAINFO", join(tempRoot, "caller-ca.pem")],
    ["GIT_SSL_CAPATH", join(tempRoot, "caller-ca-dir")],
    ["CURL_CA_BUNDLE", join(tempRoot, "curl-ca.pem")],
    ["SSL_CERT_FILE", join(tempRoot, "ssl-cert.pem")],
    ["SSL_CERT_DIR", join(tempRoot, "ssl-cert-dir")],
  ];
  for (const [key, value] of tlsOverrides) {
    const tlsEnv = { ...process.env, [key]: value };
    assert.throws(
      () => assertCanonicalEvaluationGitEnvironmentV1(tlsEnv),
      /HTTPS-authentication override environment is not allowed/,
    );
    assert.throws(
      () =>
        sampleLiveCanonicalMainV1({
          coordinatorRepo: coordinator,
          canonicalRemote: "origin",
          expectedCanonicalUrl: remote,
          env: tlsEnv,
        }),
      /HTTPS-authentication override environment is not allowed/,
    );
  }

  const statusBeforeOutputChecks = git(coordinator, ["status", "--porcelain=v1"]);
  const inWorktreeOutput = join(coordinator, "runtime-pin-status.json");
  assert.throws(
    () =>
      resolveSafeEvidenceOutputPathV1({
        outputPath: inWorktreeOutput,
        coordinatorRepo: coordinator,
      }),
    /outside the selected coordinator worktree/,
  );
  assert.equal(existsSync(inWorktreeOutput), false);

  const gitDir = git(coordinator, ["rev-parse", "--absolute-git-dir"]);
  const inGitDirOutput = join(gitDir, "runtime-pin-status.json");
  assert.throws(
    () =>
      resolveSafeEvidenceOutputPathV1({
        outputPath: inGitDirOutput,
        coordinatorRepo: coordinator,
      }),
    /outside the selected coordinator worktree|outside the selected Git directory/,
  );
  assert.equal(existsSync(inGitDirOutput), false);

  const worktreeAlias = join(tempRoot, "coordinator-alias");
  symlinkSync(coordinator, worktreeAlias, "dir");
  const aliasedOutput = join(worktreeAlias, "runtime-pin-status.json");
  assert.throws(
    () =>
      resolveSafeEvidenceOutputPathV1({
        outputPath: aliasedOutput,
        coordinatorRepo: coordinator,
      }),
    /outside the selected coordinator worktree/,
  );
  assert.equal(existsSync(join(coordinator, "runtime-pin-status.json")), false);
  assert.equal(git(coordinator, ["status", "--porcelain=v1"]), statusBeforeOutputChecks);

  const externalEvidenceDir = join(tempRoot, "evidence");
  mkdirSync(externalEvidenceDir);
  const externalOutput = join(externalEvidenceDir, "runtime-pin-status.json");
  const reservation = reserveEvidenceOutputV1({
    outputPath: externalOutput,
    coordinatorRepo: coordinator,
  });
  const externalPacket = evalPacket({
    coordinator,
    remote,
    drift: driftB,
    process: processAudit(commitA, treeA, Math.floor(Date.now() / 1000) - 1),
    approved: commitA,
    outputCreated: true,
  });
  assert.equal(externalPacket.evidence_output_created, true);
  publishReservedEvidenceOutputV1(reservation, externalPacket);
  const publishedPacket = JSON.parse(readFileSync(externalOutput, "utf8"));
  assert.equal(publishedPacket.evidence_output_created, true);
  assert.equal(publishedPacket.status, "HEALTHY_INTENTIONAL_PIN");
  assert.equal(statSync(externalOutput).mode & 0o777, 0o600);
  assert.equal(git(coordinator, ["status", "--porcelain=v1"]), statusBeforeOutputChecks);

  const normalSample = sampleLiveCanonicalMainV1({
    coordinatorRepo: coordinator,
    canonicalRemote: "origin",
    expectedCanonicalUrl: remote,
  });
  assert.equal(normalSample.sha, commitB);
  assert.equal(normalSample.remote_url, remote);
  assert.equal(normalSample.effective_remote_url, remote);
  assert.equal(
    assertCanonicalBracketV1({ driftCanonicalSha: commitB, before: normalSample, after: normalSample }),
    commitB,
  );

  console.log(`fresh_current_sha=${commitA}`);
  console.log(`advanced_canonical_sha=${commitB}`);
  console.log("copied_or_touched_stale_drift_rejected=true");
  console.log("fresh_intentional_pin_preserved=true");
  console.log("stored_canonical_remote_identity_required=true");
  console.log("global_insteadof_redirect_rejected_before_packet=true");
  console.log("xdg_insteadof_redirect_rejected_before_packet=true");
  console.log("explicit_canonical_query_ignores_ambient_rewrite=true");
  console.log("caller_tls_trust_overrides_rejected_before_query=true");
  console.log("repository_internal_output_paths_rejected=true");
  console.log("symlinked_output_parent_cannot_redirect_into_worktree=true");
  console.log("external_evidence_create_only_mode_0600=true");
  console.log("external_evidence_reports_created_only_after_reservation=true");
  console.log("network_mutation_performed=false");
  console.log("git_fetch_performed=false");
  console.log("service_or_runtime_mutation_performed=false");
  console.log("VOID_NODE_FLEET_RUNTIME_PIN_LIVE_CANONICAL_V1_PROOF_GREEN");
} finally {
  rmSync(tempRoot, { recursive: true, force: true });
}
