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
  VOID_NODE_FLEET_PROCESS_FRESHNESS_AUDIT_V1,
  VOID_NODE_FLEET_RUNTIME_PIN_STATUS_V1,
  buildFleetRuntimePinStatusV1,
  classifyRuntimePinNodeV1,
  reproduceFleetDecisionV1,
  reproduceProcessFreshnessDecisionV1,
  validateFleetDriftAuditV1,
  validateFleetProcessFreshnessAuditV1,
} from "../tools/void-node-fleet-runtime-pin-status-v1.mjs";

const PIN = "1".repeat(40);
const MAIN = "2".repeat(40);
const OTHER = "3".repeat(40);
const PIN_TREE = "a".repeat(40);
const MAIN_TREE = "b".repeat(40);
const OTHER_TREE = "c".repeat(40);
const DRIFT_FILE_SHA = "d".repeat(64);
const PROCESS_FILE_SHA = "e".repeat(64);
const STATIC_MTIME = 1_700_000_000_000;
const STATIC_EVALUATED = 1_700_000_010_000;

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

function driftNode(name, head = MAIN, canonical = MAIN, overrides = {}) {
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
    ...overrides,
  };
}

function driftHoldNode(name, head = MAIN) {
  const node = driftNode(name, head, MAIN);
  return {
    ...node,
    service_active: false,
    health_ok: false,
    readiness_ok: false,
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

function processNode(name, {
  sourceHead = MAIN,
  sourceTree = MAIN_TREE,
  processCommit = PIN,
  processTree = PIN_TREE,
  classification = processCommit === sourceHead
    ? "PROCESS_SOURCE_ALIGNED"
    : "STALE_SOURCE_AFTER_PROCESS_START",
  observedAtEpoch = 1_700_000_010,
  invocation = name === "precision" ? "a".repeat(32)
    : name === "nimo" ? "b".repeat(32) : "c".repeat(32),
  overrides = {},
} = {}) {
  const aligned = classification === "PROCESS_SOURCE_ALIGNED";
  return {
    name,
    transport: name === "precision" ? "local" : "ssh",
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
    head_transition_epoch: aligned ? observedAtEpoch - 20 : observedAtEpoch - 5,
    process_invocation_id: invocation,
    process_start_epoch: aligned ? observedAtEpoch - 10 : observedAtEpoch - 20,
    observed_at_epoch: observedAtEpoch,
    health_ok: true,
    readiness_ok: true,
    classification,
    reasons: [],
    source_to_process_start_seconds: aligned ? 10 : -15,
    process_source_identity_bound: true,
    process_source_commit: processCommit,
    process_source_tree: processTree,
    process_source_matches_current: aligned,
    version_git_commit_matches_source_head_diagnostic_only: true,
    ...overrides,
  };
}

function processHoldNode(name, {
  sourceHead = PIN,
  sourceTree = PIN_TREE,
  processCommit = OTHER,
  processTree = OTHER_TREE,
  observedAtEpoch = 1_700_000_010,
  reason = "process_source_not_ancestor_of_current",
  overrides = {},
} = {}) {
  return {
    name,
    transport: name === "precision" ? "local" : "ssh",
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
    process_identity_stable: reason !== "process_changed_during_collection",
    head_transition_epoch: observedAtEpoch - 10,
    process_invocation_id: "f".repeat(32),
    process_start_epoch: observedAtEpoch - 20,
    observed_at_epoch: observedAtEpoch,
    health_ok: true,
    readiness_ok: true,
    classification: "HOLD",
    reasons: [reason],
    source_to_process_start_seconds: null,
    process_source_identity_bound: false,
    process_source_commit: processCommit,
    process_source_tree: processTree,
    process_source_matches_current: false,
    version_git_commit_matches_source_head_diagnostic_only: true,
    ...overrides,
  };
}

function processAudit(nodes) {
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

function packet(drift, process, approved = PIN) {
  return buildFleetRuntimePinStatusV1({
    audit: drift,
    processAudit: process,
    approvedRuntimeSha: approved,
    sourceAuditFileSha256: DRIFT_FILE_SHA,
    sourceAuditMtimeEpochMs: STATIC_MTIME,
    processAuditFileSha256: PROCESS_FILE_SHA,
    processAuditMtimeEpochMs: STATIC_MTIME,
    evaluatedAtEpochMs: STATIC_EVALUATED,
    evidenceOutputCreated: false,
  });
}

const nodeNames = ["precision", "nimo", "alienware"];

const advancedSourceDrift = driftAudit(nodeNames.map((name) => driftNode(name, MAIN)));
const pinnedProcesses = processAudit(nodeNames.map((name) => processNode(name)));
validateFleetDriftAuditV1(advancedSourceDrift);
validateFleetProcessFreshnessAuditV1(pinnedProcesses);
assert.equal(advancedSourceDrift.decision, "CURRENT");
assert.equal(pinnedProcesses.decision, "RESTART_REQUIRED");

const pinned = packet(advancedSourceDrift, pinnedProcesses, PIN);
assert.equal(pinned.marker, VOID_NODE_FLEET_RUNTIME_PIN_STATUS_V1);
assert.equal(pinned.status, "HEALTHY_INTENTIONAL_PIN");
assert.equal(pinned.source_drift_decision, "CURRENT");
assert.equal(pinned.process_freshness_decision, "RESTART_REQUIRED");
assert.equal(pinned.next_gate, "preserve_pin_until_separately_authorized_rollout");
assert.deepEqual(
  pinned.nodes.map((node) => node.status),
  ["HEALTHY_INTENTIONAL_PIN", "HEALTHY_INTENTIONAL_PIN", "HEALTHY_INTENTIONAL_PIN"],
);
assert.deepEqual(pinned.nodes.map((node) => node.process_source_commit), [PIN, PIN, PIN]);
assert.deepEqual(pinned.nodes.map((node) => node.source_head), [MAIN, MAIN, MAIN]);
assert.equal(Object.isFrozen(pinned), true);
assert.equal(Object.isFrozen(pinned.nodes), true);
assert.equal(Object.isFrozen(pinned.nodes[0]), true);
assert.equal(Object.isFrozen(pinned.authority), true);
assert.throws(() => {
  pinned.nodes[0].status = "CURRENT_WITH_MAIN";
}, TypeError);

const currentDrift = driftAudit(nodeNames.map((name) => driftNode(name, MAIN)));
const currentProcesses = processAudit(
  nodeNames.map((name) =>
    processNode(name, {
      sourceHead: MAIN,
      sourceTree: MAIN_TREE,
      processCommit: MAIN,
      processTree: MAIN_TREE,
      classification: "PROCESS_SOURCE_ALIGNED",
    }),
  ),
);
const current = packet(currentDrift, currentProcesses, MAIN);
assert.equal(current.status, "CURRENT_WITH_MAIN");
assert.equal(current.process_freshness_decision, "PROCESS_FRESH");
assert.equal(current.next_gate, "no_runtime_action_required_by_this_packet");

const advancedProcess = packet(currentDrift, currentProcesses, PIN);
assert.equal(advancedProcess.status, "UNEXPECTED_RUNTIME_DRIFT");
assert.equal(
  advancedProcess.nodes.find((node) => node.name === "nimo").reason,
  "runtime_advanced_to_current_main_outside_approved_pin",
);

const otherProcesses = processAudit(
  nodeNames.map((name) =>
    processNode(name, {
      sourceHead: OTHER,
      sourceTree: OTHER_TREE,
      processCommit: OTHER,
      processTree: OTHER_TREE,
      classification: "PROCESS_SOURCE_ALIGNED",
    }),
  ),
);
const otherDrift = driftAudit(nodeNames.map((name) => driftNode(name, OTHER, MAIN)));
const unknownRuntime = packet(otherDrift, otherProcesses, PIN);
assert.equal(unknownRuntime.status, "UNEXPECTED_RUNTIME_DRIFT");
assert.equal(
  unknownRuntime.nodes.find((node) => node.name === "precision").reason,
  "runtime_process_does_not_match_approved_pin",
);

const rolledBackSource = driftAudit(nodeNames.map((name) => driftNode(name, PIN, MAIN)));
const invalidBackwardsProcesses = processAudit(
  nodeNames.map((name) =>
    processHoldNode(name, {
      sourceHead: PIN,
      sourceTree: PIN_TREE,
      processCommit: OTHER,
      processTree: OTHER_TREE,
    }),
  ),
);
const falseHealthyBlocked = packet(rolledBackSource, invalidBackwardsProcesses, PIN);
assert.equal(falseHealthyBlocked.status, "HOLD");
assert.ok(
  falseHealthyBlocked.nodes.every(
    (node) => node.reason === "upstream_process_freshness_audit_hold",
  ),
);

const movingProcesses = processAudit([
  processHoldNode("precision", {
    sourceHead: MAIN,
    sourceTree: MAIN_TREE,
    processCommit: PIN,
    processTree: PIN_TREE,
    reason: "process_changed_during_collection",
  }),
  processNode("nimo"),
  processNode("alienware"),
]);
const movementHeld = packet(advancedSourceDrift, movingProcesses, PIN);
assert.equal(movementHeld.status, "HOLD");
assert.equal(
  movementHeld.nodes.find((node) => node.name === "precision").reason,
  "upstream_process_freshness_audit_hold",
);

const mismatchedSourceProcesses = processAudit([
  processNode("precision", { sourceHead: OTHER, sourceTree: OTHER_TREE }),
  processNode("nimo"),
  processNode("alienware"),
]);
const sourceMismatchHeld = packet(advancedSourceDrift, mismatchedSourceProcesses, PIN);
assert.equal(sourceMismatchHeld.status, "HOLD");
assert.ok(sourceMismatchHeld.coherence_problems.includes("source_head_mismatch:precision"));

const missingNodeProcessAudit = processAudit([
  processNode("precision"),
  processNode("nimo"),
]);
const nodeSetHeld = packet(advancedSourceDrift, missingNodeProcessAudit, PIN);
assert.equal(nodeSetHeld.status, "HOLD");
assert.ok(nodeSetHeld.coherence_problems.includes("node_set_mismatch"));
assert.ok(nodeSetHeld.coherence_problems.includes("missing_process_node:alienware"));

const wrongTransportNodes = nodeNames.map((name) => processNode(name));
wrongTransportNodes[1] = { ...wrongTransportNodes[1], transport: "local" };
const wrongTransportAudit = processAudit(wrongTransportNodes);
const transportHeld = packet(advancedSourceDrift, wrongTransportAudit, PIN);
assert.equal(transportHeld.status, "HOLD");
assert.ok(transportHeld.coherence_problems.includes("transport_mismatch:nimo"));

const sourceHoldAudit = driftAudit([
  driftNode("precision", MAIN),
  driftHoldNode("nimo", MAIN),
  driftNode("alienware", MAIN),
]);
const sourceHeld = packet(sourceHoldAudit, pinnedProcesses, PIN);
assert.equal(sourceHeld.status, "HOLD");
assert.equal(
  sourceHeld.nodes.find((node) => node.name === "nimo").reason,
  "upstream_source_drift_audit_hold",
);

const directPinned = classifyRuntimePinNodeV1(
  driftNode("precision", MAIN),
  processNode("precision"),
  PIN,
  MAIN,
);
assert.equal(directPinned.status, "HEALTHY_INTENTIONAL_PIN");
assert.equal(directPinned.source_head, MAIN);
assert.equal(directPinned.process_source_commit, PIN);

const deterministicAgain = packet(
  structuredClone(advancedSourceDrift),
  structuredClone(pinnedProcesses),
  PIN,
);
assert.equal(deterministicAgain.status_id_sha256, pinned.status_id_sha256);
const changedProcessDigest = buildFleetRuntimePinStatusV1({
  audit: advancedSourceDrift,
  processAudit: pinnedProcesses,
  approvedRuntimeSha: PIN,
  sourceAuditFileSha256: DRIFT_FILE_SHA,
  sourceAuditMtimeEpochMs: STATIC_MTIME,
  processAuditFileSha256: "f".repeat(64),
  processAuditMtimeEpochMs: STATIC_MTIME,
  evaluatedAtEpochMs: STATIC_EVALUATED,
  evidenceOutputCreated: false,
});
assert.notEqual(changedProcessDigest.status_id_sha256, pinned.status_id_sha256);

const badDriftAuthority = structuredClone(advancedSourceDrift);
badDriftAuthority.authority.git_fetch = true;
assert.throws(() => validateFleetDriftAuditV1(badDriftAuthority), /authority\.git_fetch/);

const badProcessAuthority = structuredClone(pinnedProcesses);
badProcessAuthority.authority.service_start_or_restart = true;
assert.throws(
  () => validateFleetProcessFreshnessAuditV1(badProcessAuthority),
  /service_start_or_restart/,
);

const tamperedProcessId = structuredClone(pinnedProcesses);
tamperedProcessId.audit_id_sha256 = "0".repeat(64);
assert.throws(
  () => validateFleetProcessFreshnessAuditV1(tamperedProcessId),
  /id does not reproduce/,
);

const contradictoryTimelineNodes = structuredClone(pinnedProcesses.nodes);
contradictoryTimelineNodes[0].source_to_process_start_seconds = -14;
const contradictoryTimeline = processAudit(contradictoryTimelineNodes);
assert.throws(
  () => validateFleetProcessFreshnessAuditV1(contradictoryTimeline),
  /timeline delta does not reproduce/,
);

const falseAlignedNodes = structuredClone(currentProcesses.nodes);
falseAlignedNodes[0].head_transition_epoch = falseAlignedNodes[0].process_start_epoch + 1;
falseAlignedNodes[0].source_to_process_start_seconds = -1;
const falseAligned = processAudit(falseAlignedNodes);
assert.throws(
  () => validateFleetProcessFreshnessAuditV1(falseAligned),
  /aligned process must start after the source transition/,
);

const toolPath = resolve(
  fileURLToPath(
    new URL("../tools/void-node-fleet-runtime-pin-status-v1.mjs", import.meta.url),
  ),
);
const scratch = mkdtempSync(join(tmpdir(), "void-runtime-pin-status-proof-"));
try {
  const nowEpoch = Math.floor(Date.now() / 1000);
  const liveProcessAudit = processAudit(
    nodeNames.map((name) => processNode(name, { observedAtEpoch: nowEpoch })),
  );
  const driftPath = join(scratch, "drift.json");
  const processPath = join(scratch, "process.json");
  const outputPath = join(scratch, "status.json");
  writeFileSync(driftPath, `${JSON.stringify(advancedSourceDrift, null, 2)}\n`, {
    mode: 0o600,
  });
  writeFileSync(processPath, `${JSON.stringify(liveProcessAudit, null, 2)}\n`, {
    mode: 0o600,
  });
  chmodSync(driftPath, 0o600);
  chmodSync(processPath, 0o600);

  const cli = spawnSync(
    process.execPath,
    [
      toolPath,
      "--drift-audit",
      driftPath,
      "--process-freshness-audit",
      processPath,
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
  assert.equal(
    cliPacket.drift_audit_file_sha256,
    createHash("sha256").update(readFileSync(driftPath)).digest("hex"),
  );
  assert.equal(
    cliPacket.process_freshness_audit_file_sha256,
    createHash("sha256").update(readFileSync(processPath)).digest("hex"),
  );

  const overwrite = spawnSync(
    process.execPath,
    [
      toolPath,
      "--drift-audit",
      driftPath,
      "--process-freshness-audit",
      processPath,
      "--approved-runtime-sha",
      PIN,
      "--output",
      outputPath,
    ],
    { encoding: "utf8" },
  );
  assert.equal(overwrite.status, 1);
  assert.match(overwrite.stderr, /EEXIST|exist/i);

  const staleDriftPath = join(scratch, "stale-drift.json");
  writeFileSync(staleDriftPath, `${JSON.stringify(advancedSourceDrift)}\n`, {
    mode: 0o600,
  });
  const staleDate = new Date(Date.now() - 10 * 60 * 1000);
  utimesSync(staleDriftPath, staleDate, staleDate);
  const staleDrift = spawnSync(
    process.execPath,
    [
      toolPath,
      "--drift-audit",
      staleDriftPath,
      "--process-freshness-audit",
      processPath,
      "--approved-runtime-sha",
      PIN,
      "--max-evidence-age-seconds",
      "300",
    ],
    { encoding: "utf8" },
  );
  assert.equal(staleDrift.status, 1);
  assert.match(staleDrift.stderr, /stale/i);

  const staleProcessPath = join(scratch, "stale-process.json");
  const embeddedStale = processAudit(
    nodeNames.map((name) =>
      processNode(name, { observedAtEpoch: nowEpoch - 10 * 60 }),
    ),
  );
  writeFileSync(staleProcessPath, `${JSON.stringify(embeddedStale)}\n`, {
    mode: 0o600,
  });
  const staleProcess = spawnSync(
    process.execPath,
    [
      toolPath,
      "--drift-audit",
      driftPath,
      "--process-freshness-audit",
      staleProcessPath,
      "--approved-runtime-sha",
      PIN,
      "--max-evidence-age-seconds",
      "300",
    ],
    { encoding: "utf8" },
  );
  assert.equal(staleProcess.status, 1);
  assert.match(staleProcess.stderr, /process observation is stale/i);

  const unexpectedPath = join(scratch, "current-process.json");
  const liveCurrentProcessAudit = processAudit(
    nodeNames.map((name) =>
      processNode(name, {
        sourceHead: MAIN,
        sourceTree: MAIN_TREE,
        processCommit: MAIN,
        processTree: MAIN_TREE,
        classification: "PROCESS_SOURCE_ALIGNED",
        observedAtEpoch: nowEpoch,
      }),
    ),
  );
  writeFileSync(unexpectedPath, `${JSON.stringify(liveCurrentProcessAudit)}\n`, {
    mode: 0o600,
  });
  const drift = spawnSync(
    process.execPath,
    [
      toolPath,
      "--drift-audit",
      driftPath,
      "--process-freshness-audit",
      unexpectedPath,
      "--approved-runtime-sha",
      PIN,
    ],
    { encoding: "utf8" },
  );
  assert.equal(drift.status, 2, drift.stderr);
  assert.equal(JSON.parse(drift.stdout).status, "UNEXPECTED_RUNTIME_DRIFT");
} finally {
  rmSync(scratch, { recursive: true, force: true });
}

console.log("source_head_is_not_runtime_identity=true");
console.log("process_source_identity_required=true");
console.log("source_process_snapshot_coherence_required=true");
console.log("mismatched_node_sets_hold=true");
console.log("embedded_process_observation_freshness_required=true");
console.log("VOID_NODE_FLEET_RUNTIME_PIN_STATUS_V1_PROOF_GREEN");
