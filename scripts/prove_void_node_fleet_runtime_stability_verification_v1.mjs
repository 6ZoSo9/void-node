#!/usr/bin/env node
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  utimesSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import {
  VOID_NODE_FLEET_RUNTIME_STABILITY_VERIFICATION_V1,
  buildRuntimeStabilityVerificationV1,
  validateCompletedRolloutV1,
  validateRuntimeStabilityVerificationV1,
} from "../tools/void-node-fleet-runtime-stability-verification-v1.mjs";
import {
  VOID_NODE_FLEET_PROCESS_RESTART_ROLLOUT_STATE_V1,
  VOID_NODE_FLEET_PROCESS_RESTART_ROLLOUT_V1,
  validateFullFreshnessAuditV1,
  validateRolloutStateV1,
} from "../tools/void-node-fleet-process-restart-rollout-v1.mjs";
import {
  VOID_NODE_FLEET_PROCESS_FRESHNESS_AUDIT_V1,
  buildFleetProcessFreshnessDecisionV1,
} from "../tools/void-node-fleet-process-freshness-audit-v1.mjs";
import { VOID_NODE_FLEET_DRIFT_CONFIG_V1 } from "../tools/void-node-fleet-source-convergence-v1.mjs";

function stableJson(value) {
  if (Array.isArray(value)) return "[" + value.map(stableJson).join(",") + "]";
  if (value && typeof value === "object") {
    return "{" + Object.keys(value).sort()
      .map((key) => JSON.stringify(key) + ":" + stableJson(value[key]))
      .join(",") + "}";
  }
  return JSON.stringify(value);
}

function sha256(value) {
  return createHash("sha256")
    .update(typeof value === "string" ? value : stableJson(value))
    .digest("hex");
}

function clone(value) {
  return structuredClone(value);
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { encoding: "utf8" });
  if (!options.allowFailure && result.status !== 0) {
    throw new Error(
      command + " failed (" + result.status + "): " + result.stderr + "\n" + result.stdout,
    );
  }
  return result;
}

function writeJson(path, value) {
  writeFileSync(path, JSON.stringify(value, null, 2) + "\n", { mode: 0o600 });
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

function rolloutState(baseline, finalAudit, sourceSha, fromSha) {
  const staleOrder = baseline.nodes
    .filter((node) => node.classification === "STALE_SOURCE_AFTER_PROCESS_START")
    .map((node) => node.name);
  const nodeOrder = baseline.nodes.map((node) => node.name);
  const completed = staleOrder.map((name, index) => {
    const before = baseline.nodes.find((node) => node.name === name);
    const after = finalAudit.nodes.find((node) => node.name === name);
    return {
      sequence: index + 1,
      node: name,
      source_receipt_sha256: sha256("source-receipt:" + name),
      restart_receipt_sha256: sha256("restart-receipt:" + name),
      source_plan_id_sha256: sha256("source-plan:" + name),
      restart_plan_id_sha256: sha256("restart-plan:" + name),
      from_sha: fromSha,
      source_sha: sourceSha,
      old_process_commit: before.process_source_commit,
      old_process_tree: before.process_source_tree,
      new_process_commit: after.process_source_commit,
      new_process_tree: after.process_source_tree,
      old_process_start_epoch: before.process_start_epoch,
      new_process_start_epoch: after.process_start_epoch,
    };
  });
  const payload = {
    marker: VOID_NODE_FLEET_PROCESS_RESTART_ROLLOUT_STATE_V1,
    version: 1,
    baseline_audit: baseline,
    baseline_audit_id_sha256: baseline.audit_id_sha256,
    source_sha: sourceSha,
    source_tree: finalAudit.nodes[0].source_tree,
    node_order: nodeOrder,
    stale_order: staleOrder,
    completed,
  };
  return { ...payload, state_id_sha256: sha256(payload) };
}

function finalRollout(state, finalAudit) {
  return {
    marker: VOID_NODE_FLEET_PROCESS_RESTART_ROLLOUT_V1,
    version: 1,
    outcome: "FLEET_PROCESS_FRESH",
    state,
    current_audit_id_sha256: finalAudit.audit_id_sha256,
    next_node: null,
    reasons: [],
    mutation_attempted: false,
    automatic_retry: false,
    restart_command_invoked: false,
    authority: {
      rollout_evidence_state_advanced: true,
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
    },
  };
}

function resealAudit(audit) {
  return freshnessAudit(audit.nodes);
}

function resealState(state) {
  const payload = clone(state);
  delete payload.state_id_sha256;
  return { ...payload, state_id_sha256: sha256(payload) };
}

function expectThrow(fn, pattern, label) {
  assert.throws(fn, pattern, label);
}

const root = mkdtempSync(join(tmpdir(), "void-runtime-stability-v1-"));
try {
  const sourceSha = "b".repeat(40);
  const fromSha = "a".repeat(40);
  const sourceTree = "d".repeat(40);
  const fromTree = "c".repeat(40);
  const now = Math.floor(Date.now() / 1000);
  const transition = now - 120;
  const finalObserved = now - 45;
  const verificationObserved = now;
  const config = {
    marker: VOID_NODE_FLEET_DRIFT_CONFIG_V1,
    coordinator_repo: root,
    canonical_remote: "origin",
    canonical_branch: "main",
    nodes: ["precision", "nimo", "alienware"].map((name, index) => ({
      name,
      transport: "local",
      repo: root,
      service: "void-node-" + name + ".service",
      http_base: "http://127.0.0.1:" + (4100 + index),
      min_peers: 1,
      expected_remote_url: root,
    })),
  };
  const baseline = freshnessAudit([
    processNode("precision", sourceSha, sourceTree, sourceSha, sourceTree, transition, transition + 10, now - 100),
    processNode("nimo", sourceSha, sourceTree, fromSha, fromTree, transition, transition - 20, now - 100),
    processNode("alienware", sourceSha, sourceTree, fromSha, fromTree, transition, transition - 10, now - 100),
  ]);
  const finalAudit = freshnessAudit([
    processNode("precision", sourceSha, sourceTree, sourceSha, sourceTree, transition, transition + 10, finalObserved),
    processNode("nimo", sourceSha, sourceTree, sourceSha, sourceTree, transition, transition + 30, finalObserved),
    processNode("alienware", sourceSha, sourceTree, sourceSha, sourceTree, transition, transition + 40, finalObserved),
  ]);
  const verificationAudit = freshnessAudit([
    processNode("precision", sourceSha, sourceTree, sourceSha, sourceTree, transition, transition + 10, verificationObserved),
    processNode("nimo", sourceSha, sourceTree, sourceSha, sourceTree, transition, transition + 30, verificationObserved),
    processNode("alienware", sourceSha, sourceTree, sourceSha, sourceTree, transition, transition + 40, verificationObserved),
  ]);
  const state = rolloutState(baseline, finalAudit, sourceSha, fromSha);
  const rollout = finalRollout(state, finalAudit);

  assert.equal(validateRolloutStateV1(state, config).state.completed.length, 2);
  assert.equal(state.source_tree, sourceTree);
  assert.equal(state.completed[0].old_process_commit, fromSha);
  assert.equal(state.completed[0].old_process_tree, fromTree);
  assert.equal(state.completed[0].new_process_commit, sourceSha);
  assert.equal(state.completed[0].new_process_tree, sourceTree);
  assert.equal(finalAudit.process_source_identity_required, true);
  assert.equal(validateFullFreshnessAuditV1(finalAudit, config).decision, "PROCESS_FRESH");
  const completed = validateCompletedRolloutV1(rollout, finalAudit, config);
  assert.equal(completed.state.state_id_sha256, state.state_id_sha256);

  const input = {
    configInput: config,
    finalRollout: rollout,
    finalAudit,
    verificationAudit,
    minimumStabilitySeconds: 30,
    maxEvidenceAgeSeconds: 300,
    nowMs: now * 1000,
  };
  const receipt = buildRuntimeStabilityVerificationV1(input);
  const repeated = buildRuntimeStabilityVerificationV1(input);
  assert.equal(receipt.marker, VOID_NODE_FLEET_RUNTIME_STABILITY_VERIFICATION_V1);
  assert.equal(receipt.outcome, "FLEET_RUNTIME_STABLE");
  assert.equal(receipt.stability_id_sha256, repeated.stability_id_sha256);
  assert.equal(receipt.final_audit_id_sha256, finalAudit.audit_id_sha256);
  assert.equal(receipt.verification_audit_id_sha256, verificationAudit.audit_id_sha256);
  assert.equal(receipt.final_audit_id_sha256, receipt.verification_audit_id_sha256);
  assert.notEqual(
    receipt.final_audit_receipt_sha256,
    receipt.verification_audit_receipt_sha256,
  );
  assert.equal(receipt.rollout_state_id_sha256, state.state_id_sha256);
  assert.deepEqual(receipt.node_order, ["precision", "nimo", "alienware"]);
  assert.ok(receipt.node_evidence.every((entry) => entry.observed_stability_seconds === 45));
  assert.equal(receipt.authority.evidence_file_create_only, true);
  assert.equal(receipt.authority.service_start_or_restart, false);
  assert.equal(validateRuntimeStabilityVerificationV1(receipt), receipt);

  const rolloutOutcomeTamper = clone(rollout);
  rolloutOutcomeTamper.outcome = "NEXT_RESTART_READY";
  expectThrow(
    () => buildRuntimeStabilityVerificationV1({ ...input, finalRollout: rolloutOutcomeTamper }),
    /FLEET_PROCESS_FRESH/,
    "rollout outcome tamper",
  );
  const rolloutAuditTamper = clone(rollout);
  rolloutAuditTamper.current_audit_id_sha256 = "0".repeat(64);
  expectThrow(
    () => buildRuntimeStabilityVerificationV1({ ...input, finalRollout: rolloutAuditTamper }),
    /current audit ID/,
    "rollout audit binding tamper",
  );
  const rolloutAuthorityTamper = clone(rollout);
  rolloutAuthorityTamper.authority.service_start_or_restart = true;
  expectThrow(
    () => buildRuntimeStabilityVerificationV1({ ...input, finalRollout: rolloutAuthorityTamper }),
    /authority/,
    "rollout authority tamper",
  );
  const rolloutExtraField = clone(rollout);
  rolloutExtraField.unreviewed_authority = true;
  expectThrow(
    () => buildRuntimeStabilityVerificationV1({ ...input, finalRollout: rolloutExtraField }),
    /keys/,
    "rollout extra field",
  );

  const identityRequirementTamper = clone(verificationAudit);
  identityRequirementTamper.process_source_identity_required = false;
  expectThrow(
    () => buildRuntimeStabilityVerificationV1({
      ...input,
      verificationAudit: identityRequirementTamper,
    }),
    /process\/runtime truth is invalid/,
    "process-source identity requirement tamper",
  );

  const incompleteState = clone(state);
  incompleteState.completed.pop();
  const incompleteRollout = finalRollout(resealState(incompleteState), finalAudit);
  expectThrow(
    () => buildRuntimeStabilityVerificationV1({ ...input, finalRollout: incompleteRollout }),
    /incomplete stale-node receipts/,
    "incomplete rollout state",
  );

  const finalProcessTamper = clone(finalAudit);
  finalProcessTamper.nodes[1] = processNode(
    "nimo",
    sourceSha,
    sourceTree,
    sourceSha,
    sourceTree,
    transition,
    transition + 31,
    finalObserved,
  );
  const resealedFinalProcessTamper = resealAudit(finalProcessTamper);
  const reboundRollout = finalRollout(state, resealedFinalProcessTamper);
  expectThrow(
    () => buildRuntimeStabilityVerificationV1({
      ...input,
      finalRollout: reboundRollout,
      finalAudit: resealedFinalProcessTamper,
    }),
    /full completion/,
    "final process identity tamper",
  );

  const restartedVerification = clone(verificationAudit);
  restartedVerification.nodes[2] = processNode(
    "alienware",
    sourceSha,
    sourceTree,
    sourceSha,
    sourceTree,
    transition,
    transition + 41,
    verificationObserved,
  );
  expectThrow(
    () => buildRuntimeStabilityVerificationV1({
      ...input,
      verificationAudit: resealAudit(restartedVerification),
    }),
    /process identity changed/,
    "verification process restart",
  );

  const transitionTamper = clone(verificationAudit);
  transitionTamper.nodes[0] = processNode(
    "precision",
    sourceSha,
    sourceTree,
    sourceSha,
    sourceTree,
    transition + 1,
    transition + 10,
    verificationObserved,
  );
  expectThrow(
    () => buildRuntimeStabilityVerificationV1({
      ...input,
      verificationAudit: resealAudit(transitionTamper),
    }),
    /source transition epoch changed/,
    "source transition epoch tamper",
  );

  const sourceTamper = clone(verificationAudit);
  for (const node of sourceTamper.nodes) {
    node.source_head = "e".repeat(40);
    node.process_source_commit = node.source_head;
    node.process_source_matches_current = true;
  }
  expectThrow(
    () => buildRuntimeStabilityVerificationV1({
      ...input,
      verificationAudit: resealAudit(sourceTamper),
    }),
    /source SHA changed/,
    "source SHA movement",
  );

  const tooSoon = clone(verificationAudit);
  for (const node of tooSoon.nodes) node.observed_at_epoch = finalObserved + 29;
  expectThrow(
    () => buildRuntimeStabilityVerificationV1({
      ...input,
      verificationAudit: resealAudit(tooSoon),
    }),
    /shorter than the required minimum/,
    "short stability interval",
  );

  expectThrow(
    () => buildRuntimeStabilityVerificationV1({ ...input, verificationAudit: finalAudit }),
    /distinct later full receipt/,
    "same audit reuse",
  );
  expectThrow(
    () => buildRuntimeStabilityVerificationV1({ ...input, minimumStabilitySeconds: 29 }),
    /30..3600/,
    "too-small stability bound",
  );
  expectThrow(
    () => buildRuntimeStabilityVerificationV1({
      ...input,
      minimumStabilitySeconds: 301,
      maxEvidenceAgeSeconds: 300,
    }),
    /301..3600/,
    "age bound below stability bound",
  );

  const staleEmbedded = clone(verificationAudit);
  for (const node of staleEmbedded.nodes) {
    node.head_transition_epoch -= 400;
    node.process_start_epoch -= 400;
    node.observed_at_epoch -= 400;
  }
  expectThrow(
    () => buildRuntimeStabilityVerificationV1({
      ...input,
      verificationAudit: resealAudit(staleEmbedded),
    }),
    /observation is stale/,
    "stale embedded observation",
  );

  const receiptTamper = clone(receipt);
  receiptTamper.node_evidence[0].observed_stability_seconds += 1;
  expectThrow(
    () => validateRuntimeStabilityVerificationV1(receiptTamper),
    /stability interval/,
    "receipt interval tamper",
  );
  const receiptAuthorityTamper = clone(receipt);
  receiptAuthorityTamper.authority.git_mutation = true;
  expectThrow(
    () => validateRuntimeStabilityVerificationV1(receiptAuthorityTamper),
    /authority/,
    "receipt authority tamper",
  );
  const receiptIdTamper = clone(receipt);
  receiptIdTamper.stability_id_sha256 = "0".repeat(64);
  expectThrow(
    () => validateRuntimeStabilityVerificationV1(receiptIdTamper),
    /stability ID/,
    "receipt ID tamper",
  );

  const configPath = join(root, "config.json");
  const rolloutPath = join(root, "final-rollout.json");
  const finalAuditPath = join(root, "final-audit.json");
  const verificationPath = join(root, "verification-audit.json");
  const outputPath = join(root, "stability-receipt.json");
  for (const [path, value] of [
    [configPath, config],
    [rolloutPath, rollout],
    [finalAuditPath, finalAudit],
    [verificationPath, verificationAudit],
  ]) writeJson(path, value);

  const tool = join(
    process.cwd(),
    "tools",
    "void-node-fleet-runtime-stability-verification-v1.mjs",
  );
  const cli = run(process.execPath, [
    tool,
    "--config", configPath,
    "--final-rollout", rolloutPath,
    "--final-audit", finalAuditPath,
    "--verification-audit", verificationPath,
    "--min-stability-seconds", "30",
    "--max-evidence-age-seconds", "300",
    "--output", outputPath,
  ]);
  const cliReceipt = JSON.parse(cli.stdout);
  assert.equal(cliReceipt.outcome, "FLEET_RUNTIME_STABLE");
  assert.equal(cliReceipt.stability_id_sha256, receipt.stability_id_sha256);
  assert.equal(statSync(outputPath).mode & 0o777, 0o600);
  assert.deepEqual(JSON.parse(readFileSync(outputPath, "utf8")), cliReceipt);

  const overwrite = run(process.execPath, [
    tool,
    "--config", configPath,
    "--final-rollout", rolloutPath,
    "--final-audit", finalAuditPath,
    "--verification-audit", verificationPath,
    "--output", outputPath,
  ], { allowFailure: true });
  assert.notEqual(overwrite.status, 0);
  assert.deepEqual(JSON.parse(readFileSync(outputPath, "utf8")), cliReceipt);

  const paddedInteger = run(process.execPath, [
    tool,
    "--config", configPath,
    "--final-rollout", rolloutPath,
    "--final-audit", finalAuditPath,
    "--verification-audit", verificationPath,
    "--min-stability-seconds", "030",
  ], { allowFailure: true });
  assert.notEqual(paddedInteger.status, 0);
  assert.match(paddedInteger.stderr, /unpadded positive integer/);

  const earlyPath = join(root, "early-verification.json");
  writeJson(earlyPath, resealAudit(tooSoon));
  const early = run(process.execPath, [
    tool,
    "--config", configPath,
    "--final-rollout", rolloutPath,
    "--final-audit", finalAuditPath,
    "--verification-audit", earlyPath,
  ], { allowFailure: true });
  assert.notEqual(early.status, 0);
  assert.match(early.stderr, /shorter than the required minimum/);
  assert.match(early.stderr, /"outcome":"HOLD"/);

  const stalePath = join(root, "stale-verification.json");
  writeJson(stalePath, verificationAudit);
  const staleTime = new Date(Date.now() - 400_000);
  utimesSync(stalePath, staleTime, staleTime);
  const staleFile = run(process.execPath, [
    tool,
    "--config", configPath,
    "--final-rollout", rolloutPath,
    "--final-audit", finalAuditPath,
    "--verification-audit", stalePath,
  ], { allowFailure: true });
  assert.notEqual(staleFile.status, 0);
  assert.match(staleFile.stderr, /file is stale/);

  const unknownOption = run(process.execPath, [
    tool,
    "--config", configPath,
    "--final-rollout", rolloutPath,
    "--final-audit", finalAuditPath,
    "--verification-audit", verificationPath,
    "--apply", "true",
  ], { allowFailure: true });
  assert.notEqual(unknownOption.status, 0);
  assert.match(unknownOption.stderr, /unexpected option/);

  console.log("VOID_NODE_FLEET_RUNTIME_STABILITY_VERIFICATION_V1_PROOF_GREEN");
} finally {
  rmSync(root, { recursive: true, force: true });
}
