#!/usr/bin/env node

import assert from "node:assert/strict";
import {
  CHAIN_MARKER,
  DISPATCH_MARKER,
  EVIDENCE_MARKER,
  MARKER,
  WorkerDispatchHubGuardError,
  evaluateWorkerDispatchHubGuardV1,
} from "../tools/void-worker-dispatch-hub-guard-v1.mjs";
import {
  MARKER as UPSTREAM_CHAIN_MARKER,
} from "../tools/void-coordination-successor-chain-v1.mjs";
import {
  MARKER as UPSTREAM_DISPATCH_MARKER,
} from "../tools/void-worker-coordination-live-dispatch-v1.mjs";

const PROOF_MARKER = "VOID_WORKER_DISPATCH_HUB_GUARD_V1_PROOF_GREEN";
const EVALUATION_ID = "sha256:" + "a".repeat(64);

assert.equal(CHAIN_MARKER, UPSTREAM_CHAIN_MARKER);
assert.equal(DISPATCH_MARKER, UPSTREAM_DISPATCH_MARKER);

function chain(overrides = {}) {
  return {
    marker: CHAIN_MARKER,
    version: 1,
    repository_scope: "6ZoSo9/void-node",
    root_issue: 1507,
    current_issue: 1507,
    outcome: "CURRENT",
    chain_valid: true,
    rotation_required: false,
    dispatch_plan_issue_should_be: 1507,
    plan_issue_update_required: false,
    issue_creation_authorized: false,
    issue_close_authorized: false,
    scheduler_mutation_authorized: false,
    source_mutation_authorized: false,
    runtime_mutation_authorized: false,
    authority_granted: false,
    mutation_performed: false,
    ...overrides,
  };
}

function dispatch(overrides = {}) {
  return {
    marker: DISPATCH_MARKER,
    version: 1,
    repository: "6ZoSo9/void-node",
    plan_issue: 1507,
    evaluation_id: EVALUATION_ID,
    continuous_execution_guaranteed: false,
    external_worker_invocation_required: true,
    source_mutation_authorized: false,
    runtime_mutation_authorized: false,
    automatic_issue_or_pr_creation_authorized: false,
    automatic_merge_authorized: false,
    authority_granted: false,
    ...overrides,
  };
}

function evidence(chainValue = chain(), dispatchValue = dispatch()) {
  return {
    marker: EVIDENCE_MARKER,
    version: 1,
    chain: chainValue,
    dispatch: dispatchValue,
  };
}

function expectRejected(operation, pattern) {
  assert.throws(
    operation,
    (error) =>
      error instanceof WorkerDispatchHubGuardError
      && pattern.test(error.message),
  );
}

const current = evaluateWorkerDispatchHubGuardV1(evidence());
assert.equal(current.marker, MARKER);
assert.equal(current.version, 1);
assert.equal(current.outcome, "DISPATCH_HUB_ALIGNED");
assert.equal(current.chain_outcome, "CURRENT");
assert.equal(current.normal_dispatch_allowed, true);
assert.equal(current.read_only_evidence_only, false);
assert.equal(current.resolved_current_issue, 1507);
assert.equal(current.dispatch_plan_issue_should_be, 1507);
assert.equal(current.dispatch_plan_issue_observed, 1507);
assert.equal(current.source_mutation_authorized, false);
assert.equal(current.runtime_mutation_authorized, false);
assert.equal(current.scheduler_mutation_authorized, false);
assert.equal(current.authority_granted, false);
assert.equal(current.mutation_performed, false);
assert.match(current.guard_id, /^sha256:[0-9a-f]{64}$/u);
assert.equal(Object.isFrozen(current), true);

const rotation = evaluateWorkerDispatchHubGuardV1(
  evidence(
    chain({
      outcome: "ROTATION_REQUIRED",
      rotation_required: true,
    }),
  ),
);
assert.equal(rotation.outcome, "HOLD_ROTATION_REQUIRED");
assert.equal(rotation.normal_dispatch_allowed, false);
assert.equal(rotation.read_only_evidence_only, true);
assert.equal(rotation.dispatch_plan_issue_observed, 1507);
assert.equal(rotation.dispatch_plan_issue_should_be, 1507);

const stalePredecessor = evaluateWorkerDispatchHubGuardV1(
  evidence(
    chain({
      current_issue: 1600,
      outcome: "SUCCESSOR_RESOLVED",
      dispatch_plan_issue_should_be: 1600,
      plan_issue_update_required: true,
    }),
    dispatch({ plan_issue: 1507 }),
  ),
);
assert.equal(stalePredecessor.outcome, "HOLD_PLAN_ISSUE_MISMATCH");
assert.equal(stalePredecessor.normal_dispatch_allowed, false);
assert.equal(stalePredecessor.read_only_evidence_only, true);
assert.equal(stalePredecessor.resolved_current_issue, 1600);
assert.equal(stalePredecessor.dispatch_plan_issue_observed, 1507);

const reboundSuccessor = evaluateWorkerDispatchHubGuardV1(
  evidence(
    chain({
      current_issue: 1600,
      outcome: "SUCCESSOR_RESOLVED",
      dispatch_plan_issue_should_be: 1600,
      plan_issue_update_required: true,
    }),
    dispatch({ plan_issue: 1600 }),
  ),
);
assert.equal(reboundSuccessor.outcome, "DISPATCH_HUB_ALIGNED");
assert.equal(reboundSuccessor.normal_dispatch_allowed, true);
assert.equal(reboundSuccessor.resolved_current_issue, 1600);

const invalidChain = evaluateWorkerDispatchHubGuardV1(
  evidence(
    chain({
      outcome: "HOLD_INVALID_SUCCESSOR_CHAIN",
      chain_valid: false,
      dispatch_plan_issue_should_be: null,
      plan_issue_update_required: false,
    }),
  ),
);
assert.equal(invalidChain.outcome, "HOLD_INVALID_SUCCESSOR_CHAIN");
assert.equal(invalidChain.normal_dispatch_allowed, false);
assert.equal(invalidChain.read_only_evidence_only, true);
assert.equal(invalidChain.dispatch_plan_issue_should_be, null);

const repeated = evaluateWorkerDispatchHubGuardV1(evidence());
assert.equal(repeated.guard_id, current.guard_id);
assert.deepEqual(repeated, current);

expectRejected(
  () => evaluateWorkerDispatchHubGuardV1(
    evidence(
      chain({ repository_scope: "6ZoSo9/other" }),
    ),
  ),
  /repository mismatch/,
);

expectRejected(
  () => evaluateWorkerDispatchHubGuardV1(
    evidence(
      chain({ authority_granted: true }),
    ),
  ),
  /authority_granted must remain false/,
);

expectRejected(
  () => evaluateWorkerDispatchHubGuardV1(
    evidence(
      chain(),
      dispatch({ source_mutation_authorized: true }),
    ),
  ),
  /source_mutation_authorized must remain false/,
);

expectRejected(
  () => evaluateWorkerDispatchHubGuardV1(
    evidence(
      chain(),
      dispatch({ external_worker_invocation_required: false }),
    ),
  ),
  /must require external worker invocation/,
);

expectRejected(
  () => evaluateWorkerDispatchHubGuardV1(
    evidence(
      chain({
        outcome: "ROTATION_REQUIRED",
        rotation_required: false,
      }),
    ),
  ),
  /ROTATION_REQUIRED must set rotation_required=true/,
);

expectRejected(
  () => evaluateWorkerDispatchHubGuardV1(
    evidence(
      chain({
        current_issue: 1600,
        outcome: "SUCCESSOR_RESOLVED",
        dispatch_plan_issue_should_be: 1507,
        plan_issue_update_required: true,
      }),
    ),
  ),
  /dispatch plan issue must equal current issue/,
);

expectRejected(
  () => evaluateWorkerDispatchHubGuardV1(
    evidence(
      chain({
        outcome: "HOLD_INVALID_SUCCESSOR_CHAIN",
        chain_valid: false,
        dispatch_plan_issue_should_be: 1507,
      }),
    ),
  ),
  /must suppress dispatch plan issue/,
);

expectRejected(
  () => evaluateWorkerDispatchHubGuardV1({
    ...evidence(),
    marker: "WRONG",
  }),
  /evidence.marker mismatch/,
);

expectRejected(
  () => evaluateWorkerDispatchHubGuardV1(
    evidence(
      chain(),
      dispatch({ evaluation_id: "not-a-content-id" }),
    ),
  ),
  /evaluation_id must be sha256 content id/,
);

console.log(PROOF_MARKER);
console.log("current_hub_aligned=true");
console.log("rotation_required_holds=true");
console.log("stale_predecessor_holds=true");
console.log("resolved_successor_aligns=true");
console.log("invalid_chain_holds=true");
console.log("repository_mismatch_rejected=true");
console.log("authority_escalation_rejected=true");
console.log("guard_id_deterministic=true");
console.log("upstream_markers_bound=true");
console.log("normal_dispatch_grants_no_source_authority=true");
