#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  EVIDENCE_MARKER,
  MARKER,
  POLICY_MARKER,
  WorkerLiveDispatchError,
  evaluateWorkerLiveDispatchV1,
  validateWorkerLiveDispatchPolicyV1,
} from "../tools/void-worker-coordination-live-dispatch-v1.mjs";

const PROOF_MARKER = "VOID_WORKER_LIVE_DISPATCH_V1_PROOF_GREEN";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const POLICY_PATH = path.join(
  ROOT,
  "ops/coordination/worker-live-dispatch-policy-v1.json",
);
const PROOF_NOW_MS = Date.now();
const EVALUATED_AT = new Date(PROOF_NOW_MS).toISOString();
const FRESH_AT = new Date(PROOF_NOW_MS - 15 * 60_000).toISOString();
const STALE_RUNNING_AT = new Date(PROOF_NOW_MS - 30 * 60_000 - 1_000).toISOString();
const FRESH_FALLBACK_AT = new Date(PROOF_NOW_MS - 20 * 60 * 60_000).toISOString();
const STALE_FALLBACK_AT = new Date(PROOF_NOW_MS - 12 * 24 * 60 * 60_000).toISOString();
const NEXT_REEVALUATION_AT = new Date(PROOF_NOW_MS + 30 * 60_000).toISOString();

function clone(value) {
  return structuredClone(value);
}

function expectRejected(operation, pattern) {
  assert.throws(
    operation,
    (error) => error instanceof WorkerLiveDispatchError && pattern.test(error.message),
  );
}

const policyRaw = JSON.parse(fs.readFileSync(POLICY_PATH, "utf8"));
const policy = validateWorkerLiveDispatchPolicyV1(policyRaw);
const expectedWorkerIds = [
  "ada",
  "curly",
  "darwin",
  "dijkstra",
  "feynman",
  "grace",
  "hopper",
  "katherine",
  "keller",
  "lamarr",
  "larry",
  "moe",
  "satoshi",
  "shannon",
  "turing",
];

assert.equal(policy.marker, POLICY_MARKER);
assert.equal(policy.version, 1);
assert.equal(policy.plan_issue, 1301);
assert.equal(policy.workers.length, 15);
assert.equal(policy.composition.expected_worker_count, 15);
assert.equal(policy.composition.base_worker_ids.length, 8);
assert.equal(policy.composition.exploration_extension_worker_ids.length, 3);
assert.equal(policy.composition.supplemental_worker_ids.length, 4);
assert.equal(policy.composition.base_worker_ids.includes("ren"), false);
assert.equal(policy.composition.supplemental_worker_ids.includes("feynman"), true);
assert.equal(policy.workers.some((worker) => worker.id === "ren"), false);
assert.equal(policy.workers.some((worker) => worker.id === "feynman"), true);
assert.equal(policy.universal_fallback.tracking_issue, 1301);
assert.deepEqual(
  policy.workers.map((worker) => worker.id).sort((a, b) => a.localeCompare(b)),
  expectedWorkerIds,
);
assert.equal(policy.reevaluation.interval_minutes, 30);
assert.equal(policy.reevaluation.execution_evidence_max_age_minutes, 30);
assert.equal(policy.reevaluation.continuous_execution_guaranteed, false);
assert.equal(policy.reevaluation.external_worker_invocation_required, true);
assert.equal(policy.reevaluation.no_unassigned_worker_when_evaluated, true);
assert.equal(policy.noise_budget.automatic_issue_or_pr_creation, false);
assert.equal(policy.noise_budget.automatic_merge_authority, false);
assert.equal(Object.isFrozen(policy), true);
assert.equal(Object.isFrozen(policy.workers), true);

for (const workerId of ["larry", "curly", "satoshi", "turing", "ada", "feynman"]) {
  assert.equal(policy.workers.find((worker) => worker.id === workerId).tracking_issue, 1301);
}

function primary(overrides = {}) {
  return {
    lane_id: "placeholder-primary-v1",
    state: "WAITING_EVENT",
    priority: "P2",
    collision: "CLEAR",
    next_action: null,
    execution_evidence_at: null,
    ...overrides,
  };
}

function fallback(overrides = {}) {
  return {
    collision: "CLEAR",
    issue_open: true,
    draft_pr_open: false,
    progress_evidence_at: FRESH_FALLBACK_AT,
    ...overrides,
  };
}

function evidence() {
  const workers = policy.workers.map((worker) => ({
    id: worker.id,
    primary: primary({ lane_id: `${worker.id}-primary-v1` }),
    fallback: fallback(),
  }));
  const byId = new Map(workers.map((worker) => [worker.id, worker]));

  byId.get("larry").primary = primary({
    lane_id: "larry-cross-cutting-repair-v1",
    state: "ACTIONABLE",
    priority: "P0",
    collision: "ADVISORY",
    next_action: "Revalidate and take the already-authorized bounded repair.",
  });
  byId.get("curly").primary = primary({
    lane_id: "curly-presale-event-v1",
    state: "WAITING_EVENT",
    priority: "P1",
  });
  byId.get("moe").primary = primary({
    lane_id: "moe-frozen-stack-v1",
    state: "FROZEN",
    priority: "P2",
  });
  byId.get("moe").fallback = fallback({ collision: "HARD_STOP" });
  byId.get("satoshi").primary = primary({
    lane_id: "satoshi-market-gate-v1",
    state: "WAITING_AUTHORITY",
    priority: "P1",
  });
  byId.get("satoshi").fallback = fallback({ progress_evidence_at: STALE_FALLBACK_AT });
  byId.get("turing").primary = primary({
    lane_id: "turing-first-contact-v1",
    state: "RUNNING",
    priority: "P1",
    next_action: "Continue the exact First Contact lane.",
    execution_evidence_at: STALE_RUNNING_AT,
  });
  byId.get("ada").primary = primary({
    lane_id: "ada-coordination-freshness-v1",
    state: "BLOCKED_RED",
    priority: "P1",
    collision: "HARD_STOP",
  });
  byId.get("grace").primary = primary({
    lane_id: null,
    state: "NONE",
    priority: null,
    collision: "CLEAR",
    next_action: null,
    execution_evidence_at: null,
  });
  byId.get("shannon").primary = primary({
    lane_id: "shannon-acceptance-v1",
    state: "PARKED",
    priority: "P0",
  });
  byId.get("hopper").primary = primary({
    lane_id: "hopper-review-v1",
    state: "WAITING_REVIEW",
    priority: "P2",
  });
  byId.get("lamarr").primary = primary({
    lane_id: "lamarr-security-audit-v1",
    state: "ACTIONABLE",
    priority: "P1",
    collision: "ADVISORY",
    next_action: "Produce the first evidence-backed defensive report.",
  });
  byId.get("darwin").primary = primary({
    lane_id: "darwin-completed-report-v1",
    state: "COMPLETE",
    priority: "P2",
  });
  byId.get("dijkstra").primary = primary({
    lane_id: null,
    state: "NONE",
    priority: null,
    collision: "CLEAR",
    next_action: null,
    execution_evidence_at: null,
  });
  byId.get("dijkstra").fallback = fallback({ progress_evidence_at: null });
  byId.get("katherine").primary = primary({
    lane_id: "katherine-invariant-audit-v1",
    state: "RUNNING",
    priority: "P1",
    next_action: "Continue the exact arithmetic invariant audit.",
    execution_evidence_at: FRESH_AT,
  });
  byId.get("keller").primary = primary({
    lane_id: "keller-usability-v1",
    state: "ACTIONABLE",
    priority: "P2",
    collision: "HARD_STOP",
    next_action: "Inspect a currently colliding public interface path.",
  });
  byId.get("feynman").primary = primary({
    lane_id: null,
    state: "NONE",
    priority: null,
    collision: "CLEAR",
    next_action: null,
    execution_evidence_at: null,
  });

  return {
    marker: EVIDENCE_MARKER,
    version: 1,
    repository: policy.repository,
    plan_issue: policy.plan_issue,
    evaluated_at: EVALUATED_AT,
    observed_main_sha: "891efe085b2157befeeeba3c5b7b7767265ad39d",
    workers,
  };
}

const result = evaluateWorkerLiveDispatchV1(policyRaw, evidence());
assert.equal(result.marker, MARKER);
assert.equal(result.version, 1);
assert.equal(result.plan_issue, 1301);
assert.equal(result.composition.base_worker_count, 8);
assert.equal(result.composition.exploration_extension_worker_count, 3);
assert.equal(result.composition.supplemental_worker_count, 4);
assert.deepEqual(result.composition.worker_ids, expectedWorkerIds);
assert.equal(result.worker_count, 15);
assert.equal(result.dispatch_count, 15);
assert.equal(result.reevaluation_interval_minutes, 30);
assert.equal(result.next_reevaluation_at, NEXT_REEVALUATION_AT);
assert.deepEqual(result.workers_without_dispatch, []);
assert.equal(result.no_unassigned_worker_when_evaluated, true);
assert.equal(result.continuous_execution_guaranteed, false);
assert.equal(result.external_worker_invocation_required, true);
assert.equal(result.source_mutation_authorized, false);
assert.equal(result.runtime_mutation_authorized, false);
assert.equal(result.automatic_issue_or_pr_creation_authorized, false);
assert.equal(result.automatic_merge_authorized, false);
assert.equal(result.authority_granted, false);
assert.match(result.evaluation_id, /^sha256:[0-9a-f]{64}$/);
assert.equal(Object.isFrozen(result), true);
assert.equal(Object.isFrozen(result.dispatches), true);
assert.deepEqual(result.dispatches.map((dispatch) => dispatch.worker_id), expectedWorkerIds);

const dispatchById = new Map(result.dispatches.map((dispatch) => [dispatch.worker_id, dispatch]));
assert.equal(dispatchById.has("ren"), false);
assert.equal(dispatchById.get("feynman").decision, "CONTINUE_BOUNDED_FALLBACK_RESEARCH");
assert.equal(dispatchById.get("feynman").fallback_used, true);
assert.equal(dispatchById.get("larry").decision, "TAKE_PRIMARY_NEXT_ACTION");
assert.equal(dispatchById.get("larry").requires_existing_authority, true);
assert.equal(dispatchById.get("curly").decision, "CONTINUE_BOUNDED_FALLBACK_RESEARCH");
assert.equal(dispatchById.get("moe").decision, "RUN_UNIVERSAL_EVIDENCE_REFRESH");
assert.equal(dispatchById.get("satoshi").decision, "REFRESH_STALE_FALLBACK_EVIDENCE");
assert.equal(dispatchById.get("turing").decision, "REFRESH_PRIMARY_EVIDENCE");
assert.equal(dispatchById.get("turing").execution_evidence_fresh, false);
assert.equal(dispatchById.get("ada").decision, "CONTINUE_BOUNDED_FALLBACK_RESEARCH");
assert.equal(dispatchById.get("grace").decision, "CONTINUE_BOUNDED_FALLBACK_RESEARCH");
assert.equal(dispatchById.get("lamarr").decision, "TAKE_PRIMARY_NEXT_ACTION");
assert.equal(dispatchById.get("dijkstra").decision, "BEGIN_BOUNDED_FALLBACK_RESEARCH");
assert.equal(dispatchById.get("katherine").decision, "CONTINUE_PRIMARY");
assert.equal(dispatchById.get("keller").decision, "CONTINUE_BOUNDED_FALLBACK_RESEARCH");

for (const dispatch of result.dispatches) {
  assert.match(dispatch.dispatch_id, /^sha256:[0-9a-f]{64}$/);
  assert.equal(dispatch.source_mutation_authorized, false);
  assert.equal(dispatch.runtime_mutation_authorized, false);
  assert.equal(dispatch.automatic_issue_or_pr_creation_authorized, false);
  assert.equal(dispatch.automatic_merge_authorized, false);
  assert.equal(dispatch.external_worker_invocation_required, true);
  assert.equal(dispatch.next_reevaluation_at, result.next_reevaluation_at);
}

const reorderedEvidence = evidence();
reorderedEvidence.workers.reverse();
const reorderedResult = evaluateWorkerLiveDispatchV1(policyRaw, reorderedEvidence);
assert.equal(reorderedResult.evaluation_id, result.evaluation_id);
assert.deepEqual(reorderedResult.dispatches, result.dispatches);

{
  const changedAction = evidence();
  const larry = changedAction.workers.find((worker) => worker.id === "larry");
  larry.primary.next_action = "Take a different separately-authorized bounded repair.";
  const changedActionResult = evaluateWorkerLiveDispatchV1(policyRaw, changedAction);
  const changedLarry = changedActionResult.dispatches.find((dispatch) => dispatch.worker_id === "larry");
  assert.notEqual(changedLarry.dispatch_id, dispatchById.get("larry").dispatch_id);
  assert.notEqual(changedActionResult.evaluation_id, result.evaluation_id);
}

{
  const bad = clone(policyRaw);
  bad.reevaluation.interval_minutes = 31;
  expectRejected(() => validateWorkerLiveDispatchPolicyV1(bad), /interval_minutes must equal 30/);
}
{
  const bad = clone(policyRaw);
  bad.reevaluation.continuous_execution_guaranteed = true;
  expectRejected(() => validateWorkerLiveDispatchPolicyV1(bad), /continuous execution must not be claimed/);
}
{
  const bad = clone(policyRaw);
  bad.reevaluation.external_worker_invocation_required = false;
  expectRejected(() => validateWorkerLiveDispatchPolicyV1(bad), /external worker invocation requirement/);
}
{
  const bad = clone(policyRaw);
  bad.noise_budget.automatic_merge_authority = true;
  expectRejected(() => validateWorkerLiveDispatchPolicyV1(bad), /automatic_merge_authority must remain false/);
}
{
  const bad = clone(policyRaw);
  bad.workers.pop();
  expectRejected(() => validateWorkerLiveDispatchPolicyV1(bad), /count does not match composition/);
}
{
  const bad = clone(policyRaw);
  bad.composition.base_worker_ids.push("ren");
  expectRejected(
    () => validateWorkerLiveDispatchPolicyV1(bad),
    /expected_worker_count mismatch|worker composition mismatch|count does not match composition/,
  );
}
{
  const bad = evidence();
  bad.workers.pop();
  expectRejected(() => evaluateWorkerLiveDispatchV1(policyRaw, bad), /missing workers/);
}
{
  const bad = evidence();
  bad.workers[1].id = bad.workers[0].id;
  expectRejected(() => evaluateWorkerLiveDispatchV1(policyRaw, bad), /duplicate evidence worker/);
}
{
  const bad = evidence();
  bad.workers[0].id = "ren";
  expectRejected(() => evaluateWorkerLiveDispatchV1(policyRaw, bad), /unknown worker/);
}
{
  const bad = evidence();
  bad.evaluated_at = "2000-01-01T00:00:00.000Z";
  expectRejected(
    () => evaluateWorkerLiveDispatchV1(policyRaw, bad),
    /evidence packet is expired relative to trusted current time/,
  );
}
{
  const bad = evidence();
  bad.evaluated_at = new Date(Date.now() + 60_000).toISOString();
  expectRejected(
    () => evaluateWorkerLiveDispatchV1(policyRaw, bad),
    /must not be in the future relative to trusted current time/,
  );
}
{
  const bad = evidence();
  bad.workers.find((worker) => worker.id === "katherine").primary.execution_evidence_at =
    new Date(PROOF_NOW_MS + 60_000).toISOString();
  expectRejected(() => evaluateWorkerLiveDispatchV1(policyRaw, bad), /must not be in the future/);
}
{
  const bad = evidence();
  const worker = bad.workers.find((item) => item.id === "curly");
  worker.primary.state = "BLOCKED_RED";
  worker.primary.collision = "CLEAR";
  expectRejected(() => evaluateWorkerLiveDispatchV1(policyRaw, bad), /BLOCKED_RED requires HARD_STOP/);
}
{
  const bad = evidence();
  const worker = bad.workers.find((item) => item.id === "grace");
  worker.fallback.issue_open = false;
  worker.fallback.draft_pr_open = true;
  expectRejected(() => evaluateWorkerLiveDispatchV1(policyRaw, bad), /draft_pr_open requires issue_open/);
}
{
  const bad = evidence();
  bad.evaluated_at = "2026-08-13 08:30:00Z";
  expectRejected(() => evaluateWorkerLiveDispatchV1(policyRaw, bad), /canonical UTC ISO timestamp/);
}

console.log(PROOF_MARKER);
console.log(`workers=${result.worker_count}`);
console.log(`dispatches=${result.dispatch_count}`);
console.log("plan_issue=1301");
console.log("scheduled_worker_ids=larry,curly,moe,satoshi,turing,ada,grace,shannon,hopper,lamarr,darwin,dijkstra,katherine,keller,feynman");
console.log("ren_scheduled=false");
console.log("feynman_scheduled=true");
console.log("workers_without_dispatch=0");
console.log("no_unassigned_worker_when_evaluated=true");
console.log("reevaluation_interval_minutes=30");
console.log("trusted_current_time_expiry_enforced=true");
console.log("actionable_next_action_bound_to_dispatch_id=true");
console.log("continuous_execution_guaranteed=false");
console.log("external_worker_invocation_required=true");
console.log("automatic_issue_or_pr_creation=false");
console.log("automatic_merge_authority=false");
console.log("source_mutation_authorized=false");
console.log("runtime_mutation_authorized=false");
console.log("authority_granted=false");
