#!/usr/bin/env node
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import {
  VOID_NODE_FLEET_PROCESS_RESTART_ROLLOUT_ADVANCE_V1,
  advanceRolloutStateV1,
  assessRolloutStateV1,
  createRolloutStateV1,
  validateAdvanceConfirmationsV1,
  validateFullFreshnessAuditV1,
  validateRolloutStateV1,
  validateSuccessfulRestartReceiptV1,
} from "../tools/void-node-fleet-process-restart-rollout-v1.mjs";
import {
  VOID_NODE_FLEET_PROCESS_FRESHNESS_AUDIT_V1,
  buildFleetProcessFreshnessDecisionV1,
} from "../tools/void-node-fleet-process-freshness-audit-v1.mjs";
import {
  VOID_NODE_FLEET_PROCESS_RESTART_CONTROLLER_V1,
  VOID_NODE_FLEET_PROCESS_RESTART_POST_RESTART_IDENTITY_V1,
  buildRestartPlanV1,
  inspectRestartTransitionV1,
  validateProcessFreshnessAuditV1,
  validateSourceConvergenceReceiptV1,
} from "../tools/void-node-fleet-process-restart-controller-v1.mjs";
import {
  VOID_NODE_FLEET_DRIFT_CONFIG_V1,
  VOID_NODE_FLEET_SOURCE_CONVERGENCE_PLAN_V1,
  VOID_NODE_FLEET_SOURCE_CONVERGENCE_V1,
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
  return createHash("sha256").update(typeof value === "string" ? value : stableJson(value)).digest("hex");
}

function clone(value) {
  return structuredClone(value);
}

function git(cwd, ...args) {
  const result = spawnSync("git", ["-C", cwd, ...args], { encoding: "utf8" });
  if (result.status !== 0) throw new Error(`git ${args.join(" ")} failed: ${result.stderr}`);
  return result.stdout.trim();
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    env: options.env ?? process.env,
  });
  if (!options.allowFailure && result.status !== 0) {
    throw new Error(`${command} failed (${result.status}): ${result.stderr}\n${result.stdout}`);
  }
  return result;
}

function writeJson(path, value) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
}

function processNode(
  name,
  sourceSha,
  sourceTree,
  processCommit,
  processTree,
  headTransitionEpoch,
  processStartEpoch,
  observedAtEpoch,
  processInvocationId = sha256(`${name}:${processStartEpoch}`).slice(0, 32),
) {
  const delta = processStartEpoch - headTransitionEpoch;
  const processMatchesCurrent = processCommit === sourceSha && processTree === sourceTree;
  return {
    name,
    transport: "local",
    reachable: true,
    source_head: sourceSha,
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
    head_transition_epoch: headTransitionEpoch,
    process_invocation_id: processInvocationId,
    process_start_epoch: processStartEpoch,
    observed_at_epoch: observedAtEpoch,
    health_ok: true,
    readiness_ok: true,
    classification: delta >= 1 ? "PROCESS_SOURCE_ALIGNED" : "STALE_SOURCE_AFTER_PROCESS_START",
    reasons: [],
    source_to_process_start_seconds: delta,
    process_source_identity_bound: true,
    process_source_commit: processCommit,
    process_source_tree: processTree,
    process_source_matches_current: processMatchesCurrent,
    version_git_commit_matches_source_head_diagnostic_only: true,
  };
}

function freshnessAudit(nodes) {
  const fleet = buildFleetProcessFreshnessDecisionV1(nodes);
  return {
    marker: VOID_NODE_FLEET_PROCESS_FRESHNESS_AUDIT_V1,
    version: 1,
    decision: fleet.decision,
    audit_id_sha256: fleet.audit_id_sha256,
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

function sourceReceipt(configInput, nodeName, fromSha, toSha) {
  const config = validateFleetConfigV1(configInput, nodeName);
  const auditId = sha256(`source-audit:${nodeName}`);
  const privatePlan = {
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
    classification: "BEHIND_RUNTIME_RELEVANT",
    commits_behind: 1,
    runtime_relevant_path_count: 1,
  };
  const plan = {
    marker: VOID_NODE_FLEET_SOURCE_CONVERGENCE_PLAN_V1,
    audit_id_sha256: auditId,
    plan_id_sha256: sha256(privatePlan),
    node: config.node.name,
    transport: config.node.transport,
    remote: config.node.git_remote,
    branch: config.canonical_branch,
    from_sha: fromSha,
    to_sha: toSha,
    classification: "BEHIND_RUNTIME_RELEVANT",
    commits_behind: 1,
    runtime_relevant_path_count: 1,
    operation: "source_fast_forward_only",
  };
  return {
    marker: VOID_NODE_FLEET_SOURCE_CONVERGENCE_V1,
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

function restartReceipt(configInput, baseline, nodeName, source, postRestartNode) {
  const config = validateFleetConfigV1(configInput, nodeName);
  const validatedSource = validateSourceConvergenceReceiptV1(source, config, nodeName);
  const validatedFreshness = validateProcessFreshnessAuditV1(baseline, nodeName, validatedSource.to_sha);
  const transition = inspectRestartTransitionV1(config, validatedSource.from_sha, validatedSource.to_sha);
  assert.equal(transition.ok, true);
  const plan = buildRestartPlanV1(validatedSource, validatedFreshness, transition, config);
  return {
    marker: VOID_NODE_FLEET_PROCESS_RESTART_CONTROLLER_V1,
    version: 1,
    outcome: "PROCESS_RESTARTED",
    plan,
    reasons: [],
    mutation_attempted: true,
    mutation_succeeded: true,
    transport_exit_code: 0,
    automatic_retry: false,
    fresh_evidence_required_before_retry: false,
    runtime_transition_proven: true,
    post_restart_identity: {
      marker: VOID_NODE_FLEET_PROCESS_RESTART_POST_RESTART_IDENTITY_V1,
      process_invocation_id: postRestartNode.process_invocation_id,
      process_start_epoch: postRestartNode.process_start_epoch,
      process_source_commit: postRestartNode.process_source_commit,
      process_source_tree: postRestartNode.process_source_tree,
    },
    authority: {
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
    },
  };
}

function expectThrow(fn, pattern, label) {
  assert.throws(fn, pattern, label);
}

const root = mkdtempSync(join(tmpdir(), "void-restart-rollout-v1-"));
try {
  const repo = join(root, "repo");
  const remote = join(root, "remote.git");
  run("git", ["init", "--bare", remote]);
  run("git", ["init", "-b", "main", repo]);
  git(repo, "config", "user.name", "VOID Proof");
  git(repo, "config", "user.email", "void-proof@example.invalid");
  writeFileSync(join(repo, "README.md"), "one\n");
  git(repo, "add", "README.md");
  git(repo, "commit", "-m", "one");
  const fromSha = git(repo, "rev-parse", "HEAD");
  const fromTree = git(repo, "rev-parse", "HEAD^{tree}");
  mkdirSync(join(repo, "src"));
  writeFileSync(join(repo, "src", "proof.ts"), "export const proof = 2;\n");
  git(repo, "add", "src/proof.ts");
  git(repo, "commit", "-m", "two");
  const sourceSha = git(repo, "rev-parse", "HEAD");
  const sourceTree = git(repo, "rev-parse", "HEAD^{tree}");
  git(repo, "remote", "add", "origin", remote);
  git(repo, "push", "origin", "main");

  const config = {
    marker: VOID_NODE_FLEET_DRIFT_CONFIG_V1,
    coordinator_repo: repo,
    canonical_remote: "origin",
    canonical_branch: "main",
    nodes: ["precision", "nimo", "alienware"].map((name, index) => ({
      name,
      transport: "local",
      repo,
      service: `void-node-${name}.service`,
      http_base: `http://127.0.0.1:${4100 + index}`,
      min_peers: 1,
      expected_remote_url: remote,
    })),
  };
  const observed = Math.floor(Date.now() / 1000);
  const transitionEpoch = observed - 40;
  const baseline = freshnessAudit([
    processNode("precision", sourceSha, sourceTree, sourceSha, sourceTree, transitionEpoch, transitionEpoch + 5, observed),
    processNode("nimo", sourceSha, sourceTree, fromSha, fromTree, transitionEpoch, transitionEpoch - 8, observed),
    processNode("alienware", sourceSha, sourceTree, fromSha, fromTree, transitionEpoch, transitionEpoch - 7, observed),
  ]);
  const validatedBaseline = validateFullFreshnessAuditV1(baseline, config);
  assert.equal(validatedBaseline.decision, "RESTART_REQUIRED");
  assert.deepEqual(validatedBaseline.stale_order, ["nimo", "alienware"]);
  assert.equal(validatedBaseline.source_tree, sourceTree);

  const missingIdentityRequirement = clone(baseline);
  delete missingIdentityRequirement.process_source_identity_required;
  expectThrow(
    () => validateFullFreshnessAuditV1(missingIdentityRequirement, config),
    /freshness audit keys/,
    "identity requirement omission",
  );
  const unboundProcessIdentity = clone(baseline);
  unboundProcessIdentity.nodes[1].process_source_identity_bound = false;
  expectThrow(
    () => validateFullFreshnessAuditV1(unboundProcessIdentity, config),
    /not exact green process evidence/,
    "unbound process identity",
  );
  const transportMismatch = clone(baseline);
  transportMismatch.nodes[1].transport = "ssh";
  expectThrow(
    () => validateFullFreshnessAuditV1(transportMismatch, config),
    /transport does not match the exact fleet config/,
    "producer transport/config mismatch",
  );

  const state0 = createRolloutStateV1(baseline, config);
  const validatedState0 = validateRolloutStateV1(state0, config);
  const initialAssessment = assessRolloutStateV1(validatedState0, validatedBaseline);
  assert.equal(initialAssessment.ok, true);
  assert.equal(initialAssessment.next_node, "nimo");
  assert.equal(initialAssessment.all_complete, false);

  const currentNimo = freshnessAudit([
    clone(baseline.nodes[0]),
    processNode("nimo", sourceSha, sourceTree, sourceSha, sourceTree, transitionEpoch, transitionEpoch + 20, observed),
    clone(baseline.nodes[2]),
  ]);
  const validatedCurrentNimo = validateFullFreshnessAuditV1(currentNimo, config);
  const nimoSource = sourceReceipt(config, "nimo", fromSha, sourceSha);
  const nimoRestart = restartReceipt(config, baseline, "nimo", nimoSource, currentNimo.nodes[1]);
  const advanceAssessment = assessRolloutStateV1(validatedState0, validatedCurrentNimo, { advancingNode: "nimo" });
  assert.equal(advanceAssessment.ok, true);
  assert.equal(advanceAssessment.next_node, "alienware");
  const validatedReceipt = validateSuccessfulRestartReceiptV1(
    nimoRestart,
    nimoSource,
    validatedState0,
    config,
    "nimo",
  );
  assert.equal(validatedReceipt.plan.node, "nimo");
  assert.deepEqual(validatedReceipt.post_restart_identity, nimoRestart.post_restart_identity);
  const advancedNimo = advanceRolloutStateV1(
    validatedState0,
    validatedCurrentNimo,
    nimoSource,
    nimoRestart,
    config,
  );
  assert.equal(advancedNimo.state.completed.length, 1);
  assert.equal(advancedNimo.state.completed[0].node, "nimo");
  assert.equal(advancedNimo.state.completed[0].old_process_commit, fromSha);
  assert.equal(advancedNimo.state.completed[0].old_process_tree, fromTree);
  assert.equal(advancedNimo.state.completed[0].new_process_commit, sourceSha);
  assert.equal(advancedNimo.state.completed[0].new_process_tree, sourceTree);
  assert.notEqual(
    advancedNimo.state.completed[0].new_process_invocation_id,
    advancedNimo.state.completed[0].old_process_invocation_id,
  );
  const validatedState1 = validateRolloutStateV1(advancedNimo.state, config);
  assert.equal(assessRolloutStateV1(validatedState1, validatedCurrentNimo).next_node, "alienware");

  const currentAll = freshnessAudit([
    clone(baseline.nodes[0]),
    clone(currentNimo.nodes[1]),
    processNode("alienware", sourceSha, sourceTree, sourceSha, sourceTree, transitionEpoch, transitionEpoch + 30, observed),
  ]);
  const validatedCurrentAll = validateFullFreshnessAuditV1(currentAll, config);
  const alienSource = sourceReceipt(config, "alienware", fromSha, sourceSha);
  const alienRestart = restartReceipt(config, baseline, "alienware", alienSource, currentAll.nodes[2]);
  const advancedAll = advanceRolloutStateV1(
    validatedState1,
    validatedCurrentAll,
    alienSource,
    alienRestart,
    config,
  );
  const validatedState2 = validateRolloutStateV1(advancedAll.state, config);
  const finalAssessment = assessRolloutStateV1(validatedState2, validatedCurrentAll);
  assert.equal(finalAssessment.ok, true);
  assert.equal(finalAssessment.all_complete, true);
  assert.equal(finalAssessment.next_node, null);

  const changedAligned = clone(baseline);
  changedAligned.nodes[0] = processNode(
    "precision",
    sourceSha,
    sourceTree,
    sourceSha,
    sourceTree,
    transitionEpoch,
    transitionEpoch + 6,
    observed,
  );
  Object.assign(changedAligned, freshnessAudit(changedAligned.nodes));
  const changedAlignedAssessment = assessRolloutStateV1(
    validatedState0,
    validateFullFreshnessAuditV1(changedAligned, config),
  );
  assert.equal(changedAlignedAssessment.ok, false);
  assert.ok(changedAlignedAssessment.reasons.includes("precision:initially_aligned_process_changed"));

  const skippedNimo = freshnessAudit([
    clone(baseline.nodes[0]),
    clone(baseline.nodes[1]),
    processNode("alienware", sourceSha, sourceTree, sourceSha, sourceTree, transitionEpoch, transitionEpoch + 30, observed),
  ]);
  const skippedAssessment = assessRolloutStateV1(
    validatedState0,
    validateFullFreshnessAuditV1(skippedNimo, config),
  );
  assert.equal(skippedAssessment.ok, false);
  assert.ok(skippedAssessment.reasons.includes("alienware:pending_process_changed_without_receipt"));

  const changedPendingIdentity = clone(baseline);
  changedPendingIdentity.nodes[1].process_source_commit = "1".repeat(40);
  changedPendingIdentity.nodes[1].process_source_tree = "2".repeat(40);
  Object.assign(changedPendingIdentity, freshnessAudit(changedPendingIdentity.nodes));
  const changedPendingIdentityAssessment = assessRolloutStateV1(
    validatedState0,
    validateFullFreshnessAuditV1(changedPendingIdentity, config),
  );
  assert.equal(changedPendingIdentityAssessment.ok, false);
  assert.ok(changedPendingIdentityAssessment.reasons.includes("nimo:pending_process_changed_without_receipt"));

  const currentTreeTamper = clone(currentNimo);
  currentTreeTamper.nodes[0].source_tree = "3".repeat(40);
  Object.assign(currentTreeTamper, freshnessAudit(currentTreeTamper.nodes));
  expectThrow(
    () => validateFullFreshnessAuditV1(currentTreeTamper, config),
    /one exact source tree|current binding is inconsistent/,
    "fleet source tree divergence",
  );

  const tamperedState = clone(state0);
  tamperedState.stale_order.reverse();
  expectThrow(() => validateRolloutStateV1(tamperedState, config), /baseline bindings|state ID/, "state tamper");
  const tamperedPlan = clone(nimoRestart);
  tamperedPlan.plan.node = "alienware";
  expectThrow(
    () => validateSuccessfulRestartReceiptV1(tamperedPlan, nimoSource, validatedState0, config, "nimo"),
    /plan does not match/,
    "restart plan tamper",
  );
  const tamperedAuthority = clone(nimoRestart);
  tamperedAuthority.authority.service_restart_proven = false;
  expectThrow(
    () => validateSuccessfulRestartReceiptV1(tamperedAuthority, nimoSource, validatedState0, config, "nimo"),
    /authority/,
    "restart authority tamper",
  );
  const ambiguousReceipt = clone(nimoRestart);
  ambiguousReceipt.outcome = "PROCESS_RESTART_UNKNOWN";
  ambiguousReceipt.mutation_succeeded = false;
  expectThrow(
    () => validateSuccessfulRestartReceiptV1(ambiguousReceipt, nimoSource, validatedState0, config, "nimo"),
    /does not prove/,
    "ambiguous restart receipt",
  );
  const missingPostRestartIdentity = clone(nimoRestart);
  delete missingPostRestartIdentity.post_restart_identity;
  expectThrow(
    () => validateSuccessfulRestartReceiptV1(
      missingPostRestartIdentity,
      nimoSource,
      validatedState0,
      config,
      "nimo",
    ),
    /restart receipt keys/,
    "post-restart identity omission",
  );
  const tamperedPostRestartIdentity = clone(nimoRestart);
  tamperedPostRestartIdentity.post_restart_identity.process_source_commit = fromSha;
  tamperedPostRestartIdentity.post_restart_identity.process_source_tree = fromTree;
  expectThrow(
    () => validateSuccessfulRestartReceiptV1(
      tamperedPostRestartIdentity,
      nimoSource,
      validatedState0,
      config,
      "nimo",
    ),
    /does not match the exact rollout source/,
    "post-restart identity tamper",
  );
  const repeatedInvocationIdentity = clone(nimoRestart);
  repeatedInvocationIdentity.post_restart_identity.process_invocation_id =
    repeatedInvocationIdentity.plan.old_process_invocation_id;
  expectThrow(
    () => validateSuccessfulRestartReceiptV1(
      repeatedInvocationIdentity,
      nimoSource,
      validatedState0,
      config,
      "nimo",
    ),
    /new process invocation/,
    "same invocation ID restart receipt",
  );
  const unreceiptedRestart = clone(currentNimo);
  unreceiptedRestart.nodes[1].process_start_epoch += 1;
  unreceiptedRestart.nodes[1].source_to_process_start_seconds += 1;
  Object.assign(unreceiptedRestart, freshnessAudit(unreceiptedRestart.nodes));
  expectThrow(
    () => advanceRolloutStateV1(
      validatedState0,
      validateFullFreshnessAuditV1(unreceiptedRestart, config),
      nimoSource,
      nimoRestart,
      config,
    ),
    /current process identity does not match the receipted post-restart identity/,
    "unreceipted post-controller restart",
  );
  const sourceTamper = clone(nimoSource);
  sourceTamper.plan.to_sha = fromSha;
  expectThrow(
    () => validateSuccessfulRestartReceiptV1(nimoRestart, sourceTamper, validatedState0, config, "nimo"),
    /plan ID|real source transition|source SHA/,
    "source receipt tamper",
  );
  const sourceMissingCompletionTruth = clone(nimoSource);
  delete sourceMissingCompletionTruth.fresh_audit_required_before_retry;
  expectThrow(
    () => validateSuccessfulRestartReceiptV1(
      nimoRestart,
      sourceMissingCompletionTruth,
      validatedState0,
      config,
      "nimo",
    ),
    /source convergence receipt keys/,
    "source completion truth omission",
  );
  expectThrow(
    () => advanceRolloutStateV1(
      validatedState0,
      validateFullFreshnessAuditV1(skippedNimo, config),
      alienSource,
      alienRestart,
      config,
    ),
    /rollout advance is not safe/,
    "out-of-order receipt advance",
  );

  expectThrow(
    () => validateAdvanceConfirmationsV1({
      confirmOperation: `${VOID_NODE_FLEET_PROCESS_RESTART_ROLLOUT_ADVANCE_V1} `,
      confirmStateId: state0.state_id_sha256,
      confirmNode: "nimo",
      confirmRestartPlanId: nimoRestart.plan.plan_id_sha256,
    }, state0, "nimo", nimoRestart),
    /operation confirmation/,
    "confirmation padding",
  );
  expectThrow(
    () => validateAdvanceConfirmationsV1({
      confirmOperation: VOID_NODE_FLEET_PROCESS_RESTART_ROLLOUT_ADVANCE_V1,
      confirmStateId: state0.state_id_sha256,
      confirmNode: "alienware",
      confirmRestartPlanId: nimoRestart.plan.plan_id_sha256,
    }, state0, "nimo", nimoRestart),
    /next-node confirmation/,
    "out-of-order next node",
  );

  const staleAudit = clone(baseline);
  for (const node of staleAudit.nodes) {
    node.observed_at_epoch -= 301;
    node.head_transition_epoch -= 301;
    node.process_start_epoch -= 301;
  }
  Object.assign(staleAudit, freshnessAudit(staleAudit.nodes));
  expectThrow(
    () => validateFullFreshnessAuditV1(staleAudit, config, { nowMs: observed * 1000, maxAgeSeconds: 300 }),
    /observation is stale/,
    "stale embedded observation",
  );
  const reordered = clone(baseline);
  [reordered.nodes[0], reordered.nodes[1]] = [reordered.nodes[1], reordered.nodes[0]];
  Object.assign(reordered, freshnessAudit(reordered.nodes));
  expectThrow(() => validateFullFreshnessAuditV1(reordered, config), /node order/, "node order tamper");
  const extraAuditField = clone(baseline);
  extraAuditField.unreviewed_authority = true;
  expectThrow(() => validateFullFreshnessAuditV1(extraAuditField, config), /audit keys/, "extra audit field");
  const futureProcess = clone(baseline);
  futureProcess.nodes[0].process_start_epoch = observed + 6;
  futureProcess.nodes[0].source_to_process_start_seconds =
    futureProcess.nodes[0].process_start_epoch - futureProcess.nodes[0].head_transition_epoch;
  Object.assign(futureProcess, freshnessAudit(futureProcess.nodes));
  expectThrow(() => validateFullFreshnessAuditV1(futureProcess, config), /process start is in the future/, "future process");

  const configPath = join(root, "config.json");
  const baselinePath = join(root, "baseline.json");
  const currentNimoPath = join(root, "current-nimo.json");
  const currentAllPath = join(root, "current-all.json");
  const nimoSourcePath = join(root, "nimo-source.json");
  const nimoRestartPath = join(root, "nimo-restart.json");
  const alienSourcePath = join(root, "alien-source.json");
  const alienRestartPath = join(root, "alien-restart.json");
  const state0Path = join(root, "state-0.json");
  const state1Path = join(root, "state-1.json");
  const state2Path = join(root, "state-2.json");
  for (const [path, value] of [
    [configPath, config], [baselinePath, baseline], [currentNimoPath, currentNimo], [currentAllPath, currentAll],
    [nimoSourcePath, nimoSource], [nimoRestartPath, nimoRestart],
    [alienSourcePath, alienSource], [alienRestartPath, alienRestart],
  ]) writeJson(path, value);
  const tool = join(process.cwd(), "tools", "void-node-fleet-process-restart-rollout-v1.mjs");
  const initialize = run(process.execPath, [
    tool,
    "--config", configPath,
    "--baseline-audit", baselinePath,
    "--current-audit", baselinePath,
    "--output", state0Path,
  ]);
  const initialized = JSON.parse(initialize.stdout);
  assert.equal(initialized.outcome, "NEXT_RESTART_READY");
  assert.equal(initialized.next_node, "nimo");
  assert.equal(initialized.restart_command_invoked, false);
  assert.equal(statSync(state0Path).mode & 0o777, 0o600);
  assert.deepEqual(JSON.parse(readFileSync(state0Path, "utf8")), initialized);

  const cliAdvanceNimo = run(process.execPath, [
    tool,
    "--config", configPath,
    "--state", state0Path,
    "--current-audit", currentNimoPath,
    "--advance-source-convergence-receipt", nimoSourcePath,
    "--advance-restart-receipt", nimoRestartPath,
    "--confirm-operation", VOID_NODE_FLEET_PROCESS_RESTART_ROLLOUT_ADVANCE_V1,
    "--confirm-state-id", initialized.state.state_id_sha256,
    "--confirm-node", "nimo",
    "--confirm-restart-plan-id", nimoRestart.plan.plan_id_sha256,
    "--output", state1Path,
  ]);
  const cliState1 = JSON.parse(cliAdvanceNimo.stdout);
  assert.equal(cliState1.outcome, "NEXT_RESTART_READY");
  assert.equal(cliState1.next_node, "alienware");
  assert.equal(cliState1.authority.rollout_evidence_state_advanced, true);
  assert.equal(cliState1.authority.service_start_or_restart, false);

  const cliPaddedConfirmation = run(process.execPath, [
    tool,
    "--config", configPath,
    "--state", state0Path,
    "--current-audit", currentNimoPath,
    "--advance-source-convergence-receipt", nimoSourcePath,
    "--advance-restart-receipt", nimoRestartPath,
    "--confirm-operation", `${VOID_NODE_FLEET_PROCESS_RESTART_ROLLOUT_ADVANCE_V1} `,
    "--confirm-state-id", initialized.state.state_id_sha256,
    "--confirm-node", "nimo",
    "--confirm-restart-plan-id", nimoRestart.plan.plan_id_sha256,
  ], { allowFailure: true });
  assert.notEqual(cliPaddedConfirmation.status, 0);
  assert.match(cliPaddedConfirmation.stderr, /exact operation confirmation mismatch/);

  const cliAdvanceAlien = run(process.execPath, [
    tool,
    "--config", configPath,
    "--state", state1Path,
    "--current-audit", currentAllPath,
    "--advance-source-convergence-receipt", alienSourcePath,
    "--advance-restart-receipt", alienRestartPath,
    "--confirm-operation", VOID_NODE_FLEET_PROCESS_RESTART_ROLLOUT_ADVANCE_V1,
    "--confirm-state-id", cliState1.state.state_id_sha256,
    "--confirm-node", "alienware",
    "--confirm-restart-plan-id", alienRestart.plan.plan_id_sha256,
    "--output", state2Path,
  ]);
  const cliState2 = JSON.parse(cliAdvanceAlien.stdout);
  assert.equal(cliState2.outcome, "FLEET_PROCESS_FRESH");
  assert.equal(cliState2.next_node, null);
  assert.equal(cliState2.state.completed.length, 2);
  assert.equal(cliState2.restart_command_invoked, false);

  const overwrite = run(process.execPath, [
    tool,
    "--config", configPath,
    "--baseline-audit", baselinePath,
    "--current-audit", baselinePath,
    "--output", state0Path,
  ], { allowFailure: true });
  assert.notEqual(overwrite.status, 0, "rollout evidence output must not overwrite an existing file");
  assert.deepEqual(JSON.parse(readFileSync(state0Path, "utf8")), initialized);

  chmodSync(currentNimoPath, 0o600);
  console.log("VOID_NODE_FLEET_PROCESS_RESTART_ROLLOUT_V1_PROOF_GREEN");
} finally {
  rmSync(root, { recursive: true, force: true });
}
