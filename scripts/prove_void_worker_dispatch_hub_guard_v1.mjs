#!/usr/bin/env node

import assert from "node:assert/strict";
import crypto from "node:crypto";
import { readFileSync } from "node:fs";
import {
  CANONICAL_GIT_URL,
  CANONICAL_MAIN_REF,
  CHAIN_MARKER,
  DISPATCH_MARKER,
  EVIDENCE_MARKER,
  LIVE_MAIN_QUERY_TIMEOUT_MS,
  MARKER,
  WorkerDispatchHubGuardError,
  assertCanonicalMainCheckoutV1,
  assertFreshLiveChainMatchesV1,
  assertFreshLiveDispatchMatchesV1,
  canonicalJson,
  evaluateWorkerDispatchHubGuardV1,
  parseCanonicalMainLsRemoteV1,
} from "../tools/void-worker-dispatch-hub-guard-v1.mjs";
import {
  MARKER as UPSTREAM_CHAIN_MARKER,
  resolveCoordinationSuccessorChainRecordsV1,
} from "../tools/void-coordination-successor-chain-v1.mjs";
import {
  EVIDENCE_MARKER as UPSTREAM_DISPATCH_EVIDENCE_MARKER,
  MARKER as UPSTREAM_DISPATCH_MARKER,
  evaluateWorkerLiveDispatchV1,
} from "../tools/void-worker-coordination-live-dispatch-v1.mjs";

const PROOF_MARKER = "VOID_WORKER_DISPATCH_HUB_GUARD_V1_PROOF_GREEN";
const PROOF_NOW_MS = Date.now();
const EVALUATED_AT = new Date(PROOF_NOW_MS - 5 * 60_000).toISOString();
const NEXT_REEVALUATION_AT =
  new Date(PROOF_NOW_MS + 25 * 60_000).toISOString();
const STALE_EVALUATED_AT =
  new Date(PROOF_NOW_MS - 31 * 60_000).toISOString();
const STALE_NEXT_REEVALUATION_AT =
  new Date(PROOF_NOW_MS - 60_000).toISOString();
const REVIEWED_MAIN_SHA = "c".repeat(40);

assert.equal(CANONICAL_GIT_URL, "https://github.com/6ZoSo9/void-node.git");
assert.equal(CANONICAL_MAIN_REF, "refs/heads/main");
assert.equal(LIVE_MAIN_QUERY_TIMEOUT_MS, 15_000);
assert.equal(CHAIN_MARKER, UPSTREAM_CHAIN_MARKER);
assert.equal(DISPATCH_MARKER, UPSTREAM_DISPATCH_MARKER);

const policyRaw = JSON.parse(
  readFileSync(
    new URL("../ops/coordination/worker-live-dispatch-policy-v1.json", import.meta.url),
    "utf8",
  ),
);

function upstreamCoordinationRecord(commentCount) {
  return {
    issue: {
      number: 1507,
      state: "open",
      comments: commentCount,
      updated_at: "2026-10-01T00:00:00Z",
    },
    comments: Array.from({ length: commentCount }, (_, index) => ({
      id: index + 1,
      body: "coordination evidence",
    })),
  };
}

function actualUpstreamDispatchEvidence() {
  const evaluatedAt = new Date().toISOString();
  return {
    marker: UPSTREAM_DISPATCH_EVIDENCE_MARKER,
    version: 1,
    repository: policyRaw.repository,
    plan_issue: policyRaw.plan_issue,
    evaluated_at: evaluatedAt,
    observed_main_sha: "b".repeat(40),
    workers: policyRaw.workers.map((worker) => ({
      id: worker.id,
      primary: {
        lane_id: null,
        state: "NONE",
        priority: null,
        collision: "CLEAR",
        next_action: null,
        execution_evidence_at: null,
      },
      fallback: {
        collision: "CLEAR",
        issue_open: true,
        draft_pr_open: false,
        progress_evidence_at: null,
      },
    })),
  };
}

function dispatchContentId(material) {
  return "sha256:" + crypto
    .createHash("sha256")
    .update(canonicalJson(material))
    .digest("hex");
}

function recontentDispatch(value, overrides = {}) {
  const { evaluation_id: _ignored, ...body } = structuredClone(value);
  const material = { ...body, ...overrides };
  return {
    ...material,
    evaluation_id: dispatchContentId(material),
  };
}

const actualCurrentChain = resolveCoordinationSuccessorChainRecordsV1({
  "1507": upstreamCoordinationRecord(248),
});
const actualRotationChain = resolveCoordinationSuccessorChainRecordsV1({
  "1507": upstreamCoordinationRecord(249),
});
const actualDispatchEvidence = actualUpstreamDispatchEvidence();
const actualDispatch = evaluateWorkerLiveDispatchV1(
  policyRaw,
  actualDispatchEvidence,
);

assert.equal(
  assertFreshLiveChainMatchesV1(actualCurrentChain, actualCurrentChain),
  true,
);
assert.equal(
  assertFreshLiveDispatchMatchesV1(actualDispatch, actualDispatch),
  true,
);
const actualAligned = evaluateWorkerDispatchHubGuardV1({
  marker: EVIDENCE_MARKER,
  version: 1,
  chain: actualCurrentChain,
  dispatch: actualDispatch,
  dispatch_evidence: actualDispatchEvidence,
}, {
  liveChain: actualCurrentChain,
  liveDispatch: actualDispatch,
  reviewedMainSha: REVIEWED_MAIN_SHA,
});
assert.equal(actualAligned.outcome, "DISPATCH_HUB_ALIGNED");
assert.equal(actualAligned.normal_dispatch_allowed, true);

const actualRotationHold = evaluateWorkerDispatchHubGuardV1({
  marker: EVIDENCE_MARKER,
  version: 1,
  chain: actualRotationChain,
  dispatch: actualDispatch,
  dispatch_evidence: actualDispatchEvidence,
}, {
  liveChain: actualRotationChain,
  liveDispatch: actualDispatch,
});
assert.equal(actualRotationHold.outcome, "HOLD_ROTATION_REQUIRED");
assert.equal(actualRotationHold.normal_dispatch_allowed, false);

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
  const {
    evaluation_id: forcedEvaluationId,
    ...materialOverrides
  } = overrides;
  const material = {
    marker: DISPATCH_MARKER,
    version: 1,
    repository: "6ZoSo9/void-node",
    plan_issue: 1507,
    evaluated_at: EVALUATED_AT,
    reevaluation_interval_minutes: 30,
    next_reevaluation_at: NEXT_REEVALUATION_AT,
    continuous_execution_guaranteed: false,
    external_worker_invocation_required: true,
    source_mutation_authorized: false,
    runtime_mutation_authorized: false,
    automatic_issue_or_pr_creation_authorized: false,
    automatic_merge_authorized: false,
    authority_granted: false,
    ...materialOverrides,
  };
  return {
    ...material,
    evaluation_id:
      forcedEvaluationId === undefined
        ? dispatchContentId(material)
        : forcedEvaluationId,
  };
}

function evidence(
  chainValue = chain(),
  dispatchValue = dispatch(),
  dispatchEvidenceValue = actualDispatchEvidence,
) {
  return {
    marker: EVIDENCE_MARKER,
    version: 1,
    chain: chainValue,
    dispatch: dispatchValue,
    dispatch_evidence: dispatchEvidenceValue,
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

assert.equal(
  parseCanonicalMainLsRemoteV1(
    REVIEWED_MAIN_SHA + "\trefs/heads/main\n",
  ),
  REVIEWED_MAIN_SHA,
);
assert.equal(
  assertCanonicalMainCheckoutV1(
    REVIEWED_MAIN_SHA,
    REVIEWED_MAIN_SHA,
  ),
  true,
);
expectRejected(
  () => parseCanonicalMainLsRemoteV1(""),
  /exactly one record/,
);
expectRejected(
  () => parseCanonicalMainLsRemoteV1(
    REVIEWED_MAIN_SHA + "\trefs/heads/main\n"
      + "d".repeat(40) + "\trefs/heads/main\n",
  ),
  /exactly one record/,
);
expectRejected(
  () => parseCanonicalMainLsRemoteV1(
    REVIEWED_MAIN_SHA + "\trefs/heads/not-main\n",
  ),
  /record is malformed/,
);
expectRejected(
  () => assertCanonicalMainCheckoutV1(
    REVIEWED_MAIN_SHA,
    "d".repeat(40),
  ),
  /does not equal live canonical main/,
);

const retainedCurrent = evaluateWorkerDispatchHubGuardV1(evidence());
assert.equal(retainedCurrent.outcome, "HOLD_CHAIN_LIVENESS_UNPROVEN");
assert.equal(retainedCurrent.normal_dispatch_allowed, false);
assert.equal(retainedCurrent.live_chain_revalidated, false);
assert.equal(retainedCurrent.requires_fresh_chain_evidence, true);

const spoofedBoolean = evaluateWorkerDispatchHubGuardV1(
  evidence(),
  { liveChainRevalidated: true },
);
assert.equal(spoofedBoolean.outcome, "HOLD_CHAIN_LIVENESS_UNPROVEN");
assert.equal(spoofedBoolean.normal_dispatch_allowed, false);

const chainOnlyFreshEvidence = evidence();
const chainOnlyFresh = evaluateWorkerDispatchHubGuardV1(
  chainOnlyFreshEvidence,
  { liveChain: chainOnlyFreshEvidence.chain },
);
assert.equal(
  chainOnlyFresh.outcome,
  "HOLD_DISPATCH_LIVENESS_UNPROVEN",
);
assert.equal(chainOnlyFresh.normal_dispatch_allowed, false);
assert.equal(chainOnlyFresh.live_dispatch_revalidated, false);
assert.equal(chainOnlyFresh.requires_fresh_dispatch_evidence, true);

const currentEvidence = evidence();
const mainUnproven = evaluateWorkerDispatchHubGuardV1(currentEvidence, {
  liveChain: currentEvidence.chain,
  liveDispatch: currentEvidence.dispatch,
});
assert.equal(mainUnproven.outcome, "HOLD_MAIN_PROVENANCE_UNPROVEN");
assert.equal(mainUnproven.normal_dispatch_allowed, false);
assert.equal(mainUnproven.live_main_revalidated, false);
assert.equal(mainUnproven.requires_live_main_evidence, true);

const current = evaluateWorkerDispatchHubGuardV1(currentEvidence, {
  liveChain: currentEvidence.chain,
  liveDispatch: currentEvidence.dispatch,
  reviewedMainSha: REVIEWED_MAIN_SHA,
});
assert.equal(current.marker, MARKER);
assert.equal(current.version, 1);
assert.equal(current.outcome, "DISPATCH_HUB_ALIGNED");
assert.equal(current.chain_outcome, "CURRENT");
assert.equal(current.dispatch_evidence_fresh, true);
assert.equal(current.live_dispatch_revalidated, true);
assert.equal(current.live_main_revalidated, true);
assert.equal(current.reviewed_main_sha, REVIEWED_MAIN_SHA);
assert.equal(current.requires_fresh_dispatch_evidence, false);
assert.equal(current.requires_live_main_evidence, false);
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

const staleDispatchEvidence = evidence(
  chain(),
  dispatch({
    evaluated_at: STALE_EVALUATED_AT,
    next_reevaluation_at: STALE_NEXT_REEVALUATION_AT,
  }),
);
const staleDispatch = evaluateWorkerDispatchHubGuardV1(
  staleDispatchEvidence,
  { liveChain: staleDispatchEvidence.chain },
);
assert.equal(staleDispatch.outcome, "HOLD_DISPATCH_EVIDENCE_EXPIRED");
assert.equal(staleDispatch.normal_dispatch_allowed, false);
assert.equal(staleDispatch.read_only_evidence_only, true);
assert.equal(staleDispatch.dispatch_evidence_fresh, false);
assert.equal(staleDispatch.requires_fresh_dispatch_evidence, true);

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

const resolvedSuccessorChain = chain({
  current_issue: 1600,
  outcome: "SUCCESSOR_RESOLVED",
  dispatch_plan_issue_should_be: 1600,
  plan_issue_update_required: true,
});
const reboundSuccessorEvidence = evidence(
  resolvedSuccessorChain,
  dispatch({ plan_issue: 1600 }),
);
const reboundSuccessor = evaluateWorkerDispatchHubGuardV1(
  reboundSuccessorEvidence,
  {
    liveChain: resolvedSuccessorChain,
    liveDispatch: reboundSuccessorEvidence.dispatch,
    reviewedMainSha: REVIEWED_MAIN_SHA,
  },
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

const repeatedEvidence = evidence();
const repeated = evaluateWorkerDispatchHubGuardV1(repeatedEvidence, {
  liveChain: repeatedEvidence.chain,
  liveDispatch: repeatedEvidence.dispatch,
  reviewedMainSha: REVIEWED_MAIN_SHA,
});
assert.equal(repeated.guard_id, current.guard_id);
assert.deepEqual(repeated, current);

expectRejected(
  () => evaluateWorkerDispatchHubGuardV1(
    evidence(
      chain({ repository_scope: "6ZoSo9/other" }),
    ),
  ),
  /canonical repository/,
);

expectRejected(
  () => evaluateWorkerDispatchHubGuardV1(
    evidence(
      chain({ repository_scope: "6ZoSo9/other" }),
      dispatch({ repository: "6ZoSo9/other" }),
    ),
  ),
  /canonical repository/,
);

{
  const contentBound = dispatch();
  expectRejected(
    () => evaluateWorkerDispatchHubGuardV1(
      evidence(
        chain(),
        {
          ...contentBound,
          plan_issue: 1600,
        },
      ),
    ),
    /evaluation_id content identity mismatch/,
  );
}

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
  () => assertFreshLiveChainMatchesV1(
    actualCurrentChain,
    actualRotationChain,
  ),
  /does not match fresh live resolution/,
);

const fabricatedSuccessorDispatch = recontentDispatch(
  actualDispatch,
  { plan_issue: 1600 },
);
expectRejected(
  () => assertFreshLiveDispatchMatchesV1(
    fabricatedSuccessorDispatch,
    actualDispatch,
  ),
  /does not match fresh live evaluation/,
);
expectRejected(
  () => evaluateWorkerDispatchHubGuardV1(
    evidence(
      resolvedSuccessorChain,
      fabricatedSuccessorDispatch,
      actualDispatchEvidence,
    ),
    {
      liveChain: resolvedSuccessorChain,
      liveDispatch: actualDispatch,
    },
  ),
  /does not match fresh live evaluation/,
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
      dispatch({
        next_reevaluation_at:
          new Date(PROOF_NOW_MS + 24 * 60_000).toISOString(),
      }),
    ),
  ),
  /reevaluation window is inconsistent/,
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
console.log("real_upstream_composition_green=true");
console.log("retained_chain_alignment_held_until_live_recheck=true");
console.log("fresh_live_chain_equality_required=true");
console.log("fresh_live_dispatch_equality_required=true");
console.log("dispatch_content_identity_rederived=true");
console.log("canonical_repository_pinned=true");
console.log("reviewed_head_dispatch_policy_reexecution=true");
console.log("fabricated_successor_dispatch_rejected=true");
console.log("canonical_live_main_parser_green=true");
console.log("stale_local_head_rejected=true");
console.log("main_provenance_required_for_alignment=true");
console.log("caller_boolean_cannot_unlock_alignment=true");
console.log("expired_dispatch_evidence_holds=true");
console.log("dispatch_reevaluation_window_bound=true");
console.log("normal_dispatch_grants_no_source_authority=true");
