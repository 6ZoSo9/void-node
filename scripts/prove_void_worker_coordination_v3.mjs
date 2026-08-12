#!/usr/bin/env node

import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  CoordinationValidationError,
  loadCoordinationFiles,
  validateCoordinationV3,
} from "../tools/void-worker-coordination-v3.mjs";

const PROOF_MARKER = "VOID_WORKER_COORDINATION_V3_PROOF_GREEN";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ROSTER_PATH = path.join(ROOT, "ops/coordination/worker-roster-v1.json");
const STATE_PATH = path.join(ROOT, "ops/coordination/worker-coordination-state-v3.json");

function clone(value) {
  return structuredClone(value);
}

function expectRejected(roster, state, pattern) {
  assert.throws(
    () => validateCoordinationV3(roster, state),
    (error) => error instanceof CoordinationValidationError && pattern.test(error.message),
  );
}

const { roster, state } = await loadCoordinationFiles({
  rosterPath: ROSTER_PATH,
  statePath: STATE_PATH,
});

const summary = validateCoordinationV3(roster, state);
assert.equal(summary.valid, true);
assert.equal(summary.worker_count, 9);
assert.equal(summary.experimental_worker_count, 3);
assert.equal(summary.lane_count, 10);
assert.deepEqual(Object.keys(summary.experimental_assignments), ["ada", "grace", "shannon"]);
assert.deepEqual(summary.experimental_assignments.ada, ["worker-coordination-v3-experiment"]);
assert.deepEqual(summary.experimental_assignments.grace, ["ci-topology-audit-v1"]);
assert.deepEqual(summary.experimental_assignments.shannon, ["public-bootstrap-acceptance-truth-v1"]);
assert.equal(summary.source_mutation_performed, false);
assert.equal(summary.runtime_mutation_performed, false);
assert.equal(summary.authority_granted, false);

const workerById = new Map(roster.workers.map((worker) => [worker.id, worker]));
assert.equal(workerById.get("ada").primary_job.includes("Semantic dependency"), true);
assert.equal(workerById.get("grace").primary_job.includes("GitHub Actions"), true);
assert.equal(workerById.get("shannon").primary_job.includes("external-acceptance"), true);

const laneById = new Map(state.lanes.map((lane) => [lane.id, lane]));
const acceptanceLane = laneById.get("public-bootstrap-acceptance-truth-v1");
assert.equal(acceptanceLane.owner_worker_id, "shannon");
assert.equal(acceptanceLane.tracking_issues.includes(1005), true);
assert.equal(acceptanceLane.tracking_state, "open");
assert.deepEqual(acceptanceLane.required_gates, [
  "source_green",
  "merged",
  "deployed",
  "runtime_green",
  "external_accepted",
]);
assert.equal(acceptanceLane.gates.source_green, true);
assert.equal(acceptanceLane.gates.merged, true);
assert.equal(acceptanceLane.gates.deployed, false);
assert.equal(acceptanceLane.gates.runtime_green, false);
assert.equal(acceptanceLane.gates.external_accepted, false);

const collectorLane = laneById.get("udp-swarm-public-relay-introduction-collector-v1");
assert.equal(collectorLane.state, "REVIEW_REQUIRED");
assert.equal(collectorLane.invalidated_by[0].reference, "#1233");
assert.equal(
  collectorLane.semantic_dependencies[0].anchor.startsWith(
    "composeVoidP2pUdpSwarmRoutesFromAuthorizedDiscoveryV1@",
  ),
  true,
);

const stackLane = laneById.get("udp-swarm-relay-retirement-stack-v1");
assert.equal(stackLane.state, "FROZEN_STACK");
assert.deepEqual(stackLane.stack_prs, [1132, 1134, 1137, 1139, 1140, 1141, 1144, 1146]);

{
  const badRoster = clone(roster);
  badRoster.workers.push(clone(badRoster.workers[0]));
  expectRejected(badRoster, state, /duplicate worker id/);
}

{
  const badState = clone(state);
  badState.lanes[0].owner_worker_id = "unknown-worker";
  expectRejected(roster, badState, /unknown owner/);
}

{
  const badState = clone(state);
  const duplicate = clone(badState.lanes.find((lane) => lane.owner_worker_id === "ada"));
  duplicate.id = "second-ada-active-lane";
  duplicate.canonical_branch = "feat/second-ada-active-lane";
  duplicate.changed_paths = ["docs/operations/second-ada-active-lane.md"];
  badState.lanes.push(duplicate);
  expectRejected(roster, badState, /exceeds active WIP limit/);
}

{
  const badState = clone(state);
  const lane = badState.lanes.find((candidate) => candidate.id === "public-bootstrap-acceptance-truth-v1");
  lane.state = "COMPLETE";
  expectRejected(roster, badState, /terminal lane is missing required gate/);
}

{
  const badState = clone(state);
  const lane = badState.lanes.find((candidate) => candidate.id === "public-bootstrap-acceptance-truth-v1");
  lane.tracking_state = "closed";
  expectRejected(roster, badState, /tracking is closed before required gates completed/);
}

{
  const badState = clone(state);
  const lane = badState.lanes.find((candidate) => candidate.state === "REVIEW_REQUIRED");
  lane.invalidated_by = [];
  expectRejected(roster, badState, /semantic review state requires invalidated_by evidence/);
}

{
  const badState = clone(state);
  badState.lanes[0].changed_paths = ["../outside-repository"];
  expectRejected(roster, badState, /invalid path segment|repository-relative/);
}

{
  const badState = clone(state);
  const lanesWithPr = badState.lanes.filter((lane) => lane.canonical_pr !== null);
  assert.ok(lanesWithPr.length >= 2);
  lanesWithPr[1].canonical_pr = lanesWithPr[0].canonical_pr;
  expectRejected(roster, badState, /canonical PR/);
}

{
  const badRoster = clone(roster);
  badRoster.workers.find((worker) => worker.id === "grace").experimental = false;
  expectRejected(roster, state, /experiment worker must have experimental=true|experimental flag does not match experiment roster/);
}

{
  const badState = clone(state);
  const lane = badState.lanes.find((candidate) => candidate.sensitive);
  lane.authority_boundary = "too short";
  expectRejected(roster, badState, /explicit authority boundary/);
}

{
  const badState = clone(state);
  const lane = badState.lanes.find((candidate) => candidate.id === "fleet-runtime-refresh-v47");
  lane.gates.runtime_green = true;
  lane.gates.deployed = false;
  expectRejected(roster, badState, /gate order violation/);
}

console.log(PROOF_MARKER);
console.log(`workers=${summary.worker_count}`);
console.log(`experimental_workers=${summary.experimental_worker_count}`);
console.log(`lanes=${summary.lane_count}`);
console.log("experimental_worker_ids=ada,grace,shannon");
console.log("issue_1005_tracking_state=open");
console.log("capability_gate_collapse_rejected=true");
console.log("semantic_invalidation_required=true");
console.log("worker_wip_limits_enforced=true");
console.log("source_mutation_performed=false");
console.log("runtime_mutation_performed=false");
console.log("authority_granted=false");
