import assert from "node:assert/strict";
import {
  VOID_BUY_VOID_OBSERVE_AND_CLAIM_CANDIDATE_READINESS_V1,
  summarizeBuyVoidObserveAndClaimCandidateReadinessV1,
} from "../src/economic/buy_void_observe_and_claim_candidate_readiness_v1.js";

const base = {
  public_status: "payment_submitted_pending_manual_review",
  claim_status: "missing",
  attempt_status: "missing",
  broadcast_status: "none",
  orchestrator_status: "dry_run",
  orchestrator_reason: null,
  selected_stage: "observe_and_claim",
  activation_status: "planned",
  activation_reason: null,
  plan_fingerprint_sha256: "a".repeat(64),
  required_orchestrator_confirmation:
    "buyVoidRunBoundedAutoFulfillment",
  required_delegated_confirmation: "verifyAndClaimExact",
  required_stage_confirmation: "buyVoidApplyObserveAndClaim",
  eligible_observe_and_claim: true,
  wallet_access_authorized: false,
  signing_authorized: false,
  transaction_broadcast_authorized: false,
  money_movement_authorized: false,
};

const none = summarizeBuyVoidObserveAndClaimCandidateReadinessV1([
  {
    ...base,
    request_id: "buyvoid_fulfilled_fixture_v1",
    orchestrator_status: "held",
    orchestrator_reason: "request_already_fulfilled",
    selected_stage: null,
    activation_status: "held",
    activation_reason: "dry_run_decision_required",
    plan_fingerprint_sha256: null,
    eligible_observe_and_claim: false,
  },
]);

assert.equal(
  none.marker,
  VOID_BUY_VOID_OBSERVE_AND_CLAIM_CANDIDATE_READINESS_V1,
);
assert.equal(none.readiness_status, "none");
assert.equal(none.request_record_count, 1);
assert.equal(none.eligible_candidate_count, 0);
assert.deepEqual(none.eligible_request_ids, []);
assert.equal(none.recommended_request_id, null);

const exact = summarizeBuyVoidObserveAndClaimCandidateReadinessV1([
  {
    ...base,
    request_id: "buyvoid_candidate_fixture_v1",
  },
]);

assert.equal(exact.readiness_status, "exact_one");
assert.equal(exact.eligible_candidate_count, 1);
assert.deepEqual(
  exact.eligible_request_ids,
  ["buyvoid_candidate_fixture_v1"],
);
assert.equal(
  exact.recommended_request_id,
  "buyvoid_candidate_fixture_v1",
);
assert.equal(
  exact.recommended_plan_fingerprint_sha256,
  "a".repeat(64),
);
assert.equal(
  exact.recommended_stage_confirmation,
  "buyVoidApplyObserveAndClaim",
);

const multiple =
  summarizeBuyVoidObserveAndClaimCandidateReadinessV1([
    {
      ...base,
      request_id: "buyvoid_candidate_fixture_b",
      plan_fingerprint_sha256: "b".repeat(64),
    },
    {
      ...base,
      request_id: "buyvoid_candidate_fixture_a",
      plan_fingerprint_sha256: "c".repeat(64),
    },
  ]);

assert.equal(multiple.readiness_status, "multiple");
assert.equal(multiple.eligible_candidate_count, 2);
assert.deepEqual(
  multiple.eligible_request_ids,
  [
    "buyvoid_candidate_fixture_a",
    "buyvoid_candidate_fixture_b",
  ],
);
assert.equal(multiple.recommended_request_id, null);

const authorityRejected =
  summarizeBuyVoidObserveAndClaimCandidateReadinessV1([
    {
      ...base,
      request_id: "buyvoid_money_authority_fixture_v1",
      wallet_access_authorized: true,
    },
  ]);

assert.equal(
  authorityRejected.readiness_status,
  "none",
);
assert.equal(
  authorityRejected.records[0].eligible_observe_and_claim,
  false,
);

const falseClaimRejected =
  summarizeBuyVoidObserveAndClaimCandidateReadinessV1([
    {
      ...base,
      request_id: "buyvoid_false_claim_fixture_v1",
      eligible_observe_and_claim: false,
    },
  ]);

assert.equal(falseClaimRejected.readiness_status, "none");

assert.deepEqual(exact.authority, {
  read_only: true,
  server_derived_snapshot_required: true,
  exact_request_id_only: true,
  runtime_import_mounted: false,
  apply_requested: false,
  filesystem_write_to_network_state: false,
  inventory_reservation: false,
  execution_attempt_reservation: false,
  wallet_access: false,
  signing: false,
  transaction_broadcast: false,
  rpc_mutation: false,
  money_movement: false,
  background_loop: false,
  startup_execution: false,
});

console.log(
  "VOID_BUY_VOID_OBSERVE_AND_CLAIM_CANDIDATE_READINESS_V1_GREEN",
);
console.log("none_state=1");
console.log("exact_one_state=1");
console.log("multiple_state=1");
console.log("money_authority_rejected=1");
console.log("read_only=1");
console.log("runtime_import_mounted=0");
console.log("apply_requested=0");
console.log("inventory_reservation=0");
console.log("execution_attempt_reservation=0");
console.log("wallet_access=0");
console.log("signing=0");
console.log("transaction_broadcast=0");
console.log("rpc_mutation=0");
console.log("money_movement=0");
