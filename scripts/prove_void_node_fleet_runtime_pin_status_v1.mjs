#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  chmodSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  utimesSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import {
  VOID_NODE_FLEET_DRIFT_AUDIT_V1,
  VOID_NODE_FLEET_RUNTIME_PIN_STATUS_V1,
  buildFleetRuntimePinStatusV1,
  classifyRuntimePinNodeV1,
  reproduceFleetDecisionV1,
  validateFleetDriftAuditV1,
} from "../tools/void-node-fleet-runtime-pin-status-v1.mjs";

const PIN = "1".repeat(40);
const MAIN = "2".repeat(40);
const OTHER = "3".repeat(40);
const FILE_SHA = "a".repeat(64);

function pathClassification(runtimeRelevant = 1) {
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

function healthyNode(name, head = PIN, canonical = MAIN) {
  const current = head === canonical;
  return {
    name,
    transport: name === "precision" ? "local" : "ssh",
    reachable: true,
    repo_ok: true,
    head,
    branch: "main",
    dirty_count: 0,
    service_active: true,
    health_ok: true,
    readiness_ok: true,
    peer_count: 2,
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
          commits_behind: 7,
          commits_ahead: 0,
          changed_paths: ["src/example.ts"],
          path_classification: pathClassification(1),
        },
    classification: current ? "CURRENT" : "BEHIND_RUNTIME_RELEVANT",
    reasons: [],
  };
}

function holdNode(name, head = PIN) {
  return {
    name,
    transport: "ssh",
    reachable: true,
    repo_ok: true,
    head,
    branch: "main",
    dirty_count: 0,
    service_active: false,
    health_ok: false,
    readiness_ok: false,
    peer_count: 0,
    comparison: {
      relation: "behind",
      commits_behind: 7,
      commits_ahead: 0,
      changed_paths: ["src/example.ts"],
      path_classification: pathClassification(1),
    },
    classification: "HOLD",
    reasons: ["health_not_green", "readiness_not_green", "service_inactive"],
  };
}

function driftAudit(nodes, canonical = MAIN) {
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

function packet(audit, approved = PIN) {
  return buildFleetRuntimePinStatusV1({
    audit,
    approvedRuntimeSha: approved,
    sourceAuditFileSha256: FILE_SHA,
    sourceAuditMtimeEpochMs: 1_700_000_000_000,
    evaluatedAtEpochMs: 1_700_000_010_000,
    evidenceOutputCreated: false,
  });
}

const pinnedAudit = driftAudit([
  healthyNode("precision"),
  healthyNode("nimo"),
  healthyNode("alienware"),
]);
assert.equal(pinnedAudit.decision, "CONVERGENCE_RECOMMENDED");
validateFleetDriftAuditV1(pinnedAudit);

const pinned = packet(pinnedAudit);
assert.equal(pinned.marker, VOID_NODE_FLEET_RUNTIME_PIN_STATUS_V1);
assert.equal(pinned.status, "HEALTHY_INTENTIONAL_PIN");
assert.equal(pinned.source_drift_decision, "CONVERGENCE_RECOMMENDED");
assert.equal(pinned.next_gate, "preserve_pin_until_separately_authorized_rollout");
assert.deepEqual(
  pinned.nodes.map((node) => node.status),
  ["HEALTHY_INTENTIONAL_PIN", "HEALTHY_INTENTIONAL_PIN", "HEALTHY_INTENTIONAL_PIN"],
);
assert.equal(Object.isFrozen(pinned), true);
assert.equal(Object.isFrozen(pinned.nodes), true);
assert.equal(Object.isFrozen(pinned.nodes[0]), true);
assert.equal(Object.isFrozen(pinned.authority), true);
assert.throws(() => {
  pinned.nodes[0].status = "CURRENT_WITH_MAIN";
}, TypeError);
assert.deepEqual(pinned.authority, {
  source_evidence_read_only: true,
  runtime_reclassification_only: true,
  git_fetch: false,
  git_pull: false,
  checkout: false,
  reset: false,
  service_restart: false,
  deployment: false,
  network_mutation: false,
  credential_read: false,
  wallet_or_signer: false,
  work_credit_mutation: false,
  validator_mutation: false,
  transaction: false,
  treasury_or_liquidity_action: false,
  funds_moved: false,
});

const currentAudit = driftAudit([
  healthyNode("precision", MAIN, MAIN),
  healthyNode("nimo", MAIN, MAIN),
  healthyNode("alienware", MAIN, MAIN),
]);
const current = packet(currentAudit, MAIN);
assert.equal(current.status, "CURRENT_WITH_MAIN");
assert.equal(current.next_gate, "no_runtime_action_required_by_this_packet");
assert.equal(current.source_drift_decision, "CURRENT");

const advancedWithoutApprovalAudit = driftAudit([
  healthyNode("precision", PIN),
  healthyNode("nimo", MAIN, MAIN),
  healthyNode("alienware", PIN),
]);
const advancedWithoutApproval = packet(advancedWithoutApprovalAudit, PIN);
assert.equal(advancedWithoutApproval.status, "UNEXPECTED_RUNTIME_DRIFT");
assert.equal(
  advancedWithoutApproval.nodes.find((node) => node.name === "nimo").reason,
  "runtime_advanced_to_current_main_outside_approved_pin",
);
assert.equal(
  advancedWithoutApproval.next_gate,
  "investigate_runtime_drift_before_any_rollout_or_restart",
);

const unknownHeadAudit = driftAudit([
  healthyNode("precision", PIN),
  healthyNode("nimo", OTHER),
  healthyNode("alienware", PIN),
]);
const unknownHead = packet(unknownHeadAudit, PIN);
assert.equal(unknownHead.status, "UNEXPECTED_RUNTIME_DRIFT");
assert.equal(
  unknownHead.nodes.find((node) => node.name === "nimo").reason,
  "runtime_head_does_not_match_approved_pin",
);

const heldAudit = driftAudit([
  healthyNode("precision", PIN),
  holdNode("nimo", PIN),
  healthyNode("alienware", PIN),
]);
const held = packet(heldAudit, PIN);
assert.equal(held.status, "HOLD");
assert.equal(held.next_gate, "refresh_or_repair_evidence_before_any_runtime_action");
assert.equal(held.nodes.find((node) => node.name === "nimo").status, "HOLD");

const oneNodePinned = classifyRuntimePinNodeV1(healthyNode("precision"), PIN, MAIN);
assert.equal(oneNodePinned.status, "HEALTHY_INTENTIONAL_PIN");

const deterministicAgain = packet(structuredClone(pinnedAudit), PIN);
assert.equal(deterministicAgain.status_id_sha256, pinned.status_id_sha256);
const differentApproval = packet(currentAudit, MAIN);
assert.notEqual(differentApproval.status_id_sha256, pinned.status_id_sha256);

const badAuthority = structuredClone(pinnedAudit);
badAuthority.authority.git_fetch = true;
assert.throws(() => validateFleetDriftAuditV1(badAuthority), /authority\.git_fetch/);

const tamperedId = structuredClone(pinnedAudit);
tamperedId.audit_id_sha256 = "b".repeat(64);
assert.throws(() => validateFleetDriftAuditV1(tamperedId), /id does not reproduce/);

const unknownField = structuredClone(pinnedAudit);
unknownField.extra = true;
assert.throws(() => validateFleetDriftAuditV1(unknownField), /unexpected or missing fields/);

const contradictory = structuredClone(pinnedAudit);
contradictory.nodes[0].health_ok = false;
const contradictedDecision = reproduceFleetDecisionV1(MAIN, contradictory.nodes);
contradictory.audit_id_sha256 = contradictedDecision.audit_id_sha256;
contradictory.decision = contradictedDecision.decision;
contradictory.convergence_candidates = contradictedDecision.convergence_candidates;
assert.throws(() => validateFleetDriftAuditV1(contradictory), /contradicts runtime safety fields/);

const toolPath = resolve(
  fileURLToPath(new URL("../tools/void-node-fleet-runtime-pin-status-v1.mjs", import.meta.url)),
);
const scratch = mkdtempSync(join(tmpdir(), "void-runtime-pin-status-proof-"));
try {
  const auditPath = join(scratch, "audit.json");
  const outputPath = join(scratch, "status.json");
  writeFileSync(auditPath, `${JSON.stringify(pinnedAudit, null, 2)}\n`, { mode: 0o600 });
  chmodSync(auditPath, 0o600);

  const cli = spawnSync(
    process.execPath,
    [
      toolPath,
      "--audit",
      auditPath,
      "--approved-runtime-sha",
      PIN,
      "--max-evidence-age-seconds",
      "300",
      "--output",
      outputPath,
    ],
    { encoding: "utf8" },
  );
  assert.equal(cli.status, 0, cli.stderr);
  const cliPacket = JSON.parse(cli.stdout);
  const filePacket = JSON.parse(readFileSync(outputPath, "utf8"));
  assert.deepEqual(filePacket, cliPacket);
  assert.equal(cliPacket.status, "HEALTHY_INTENTIONAL_PIN");
  assert.equal(cliPacket.evidence_output_created, true);
  assert.equal(statSync(outputPath).mode & 0o777, 0o600);
  const expectedSourceDigest = createHash("sha256")
    .update(readFileSync(auditPath))
    .digest("hex");
  assert.equal(cliPacket.source_audit_file_sha256, expectedSourceDigest);

  const overwrite = spawnSync(
    process.execPath,
    [toolPath, "--audit", auditPath, "--approved-runtime-sha", PIN, "--output", outputPath],
    { encoding: "utf8" },
  );
  assert.equal(overwrite.status, 1);
  assert.match(overwrite.stderr, /EEXIST|exist/i);

  const stalePath = join(scratch, "stale.json");
  writeFileSync(stalePath, `${JSON.stringify(pinnedAudit)}\n`, { mode: 0o600 });
  const staleDate = new Date(Date.now() - 10 * 60 * 1000);
  utimesSync(stalePath, staleDate, staleDate);
  const stale = spawnSync(
    process.execPath,
    [
      toolPath,
      "--audit",
      stalePath,
      "--approved-runtime-sha",
      PIN,
      "--max-evidence-age-seconds",
      "300",
    ],
    { encoding: "utf8" },
  );
  assert.equal(stale.status, 1);
  assert.match(stale.stderr, /stale/i);

  const driftPath = join(scratch, "drift.json");
  writeFileSync(driftPath, `${JSON.stringify(advancedWithoutApprovalAudit)}\n`, { mode: 0o600 });
  const drift = spawnSync(
    process.execPath,
    [toolPath, "--audit", driftPath, "--approved-runtime-sha", PIN],
    { encoding: "utf8" },
  );
  assert.equal(drift.status, 2, drift.stderr);
  assert.equal(JSON.parse(drift.stdout).status, "UNEXPECTED_RUNTIME_DRIFT");
} finally {
  rmSync(scratch, { recursive: true, force: true });
}

console.log("VOID_NODE_FLEET_RUNTIME_PIN_STATUS_V1_PROOF_GREEN");
