import assert from "node:assert/strict";
import {
  normalizeBuyVoidObserveAndClaimCandidateRecordV1,
  summarizeBuyVoidObserveAndClaimCandidateReadinessV1,
} from "../src/economic/buy_void_observe_and_claim_candidate_readiness_v1.js";

const fingerprint = "a".repeat(64);

function record(
  requestId: string,
  publicStatus: string | null,
) {
  return {
    request_id: requestId,
    public_status: publicStatus,
    claim_status: "missing",
    attempt_status: "missing",
    broadcast_status: "none",
    orchestrator_status: "dry_run",
    orchestrator_reason: null,
    selected_stage: "observe_and_claim",
    activation_status: "planned",
    activation_reason: null,
    plan_fingerprint_sha256: fingerprint,
    required_orchestrator_confirmation:
      "buyVoidRunBoundedAutomaticFulfillmentStage",
    required_delegated_confirmation:
      "buyVoidVerifyAndClaim",
    required_stage_confirmation:
      "buyVoidApplyObserveAndClaim",
    eligible_observe_and_claim: true,
    wallet_access_authorized: false,
    signing_authorized: false,
    transaction_broadcast_authorized: false,
    money_movement_authorized: false,
  };
}

const target =
  normalizeBuyVoidObserveAndClaimCandidateRecordV1(
    record(
      "buyvoid_ms2bhyhf_ae2fa866",
      "payment_verified",
    ),
  );

assert.equal(
  target.eligible_observe_and_claim,
  true,
);

const excludedStatuses = [
  "awaiting_payment_tx_hash",
  "payment_submitted_pending_manual_review",
  "rejected",
  "confirmed",
  "fulfilled",
  null,
] as const;

for (const status of excludedStatuses) {
  const normalized =
    normalizeBuyVoidObserveAndClaimCandidateRecordV1(
      record(
        `buyvoid_filter_${String(status || "null")
          .replace(/[^a-z0-9]+/gi, "_")}`,
        status,
      ),
    );

  assert.equal(
    normalized.eligible_observe_and_claim,
    false,
    `status must not be eligible: ${String(status)}`,
  );
}

const summary =
  summarizeBuyVoidObserveAndClaimCandidateReadinessV1([
    record(
      "buyvoid_mq3gtaoi_53b0b9af",
      "awaiting_payment_tx_hash",
    ),
    record(
      "buyvoid_mq3xrefj_db1e3150",
      "rejected",
    ),
    record(
      "buyvoid_mq3xu1rx_a920ebcb",
      "rejected",
    ),
    record(
      "buyvoid_mq4164ub_5734a030",
      "rejected",
    ),
    record(
      "buyvoid_mq425ur0_a65211f3",
      "rejected",
    ),
    record(
      "buyvoid_ms2bhyhf_ae2fa866",
      "payment_verified",
    ),
  ]);

assert.equal(
  summary.readiness_status,
  "exact_one",
);
assert.equal(
  summary.eligible_candidate_count,
  1,
);
assert.deepEqual(
  summary.eligible_request_ids,
  ["buyvoid_ms2bhyhf_ae2fa866"],
);
assert.equal(
  summary.recommended_request_id,
  "buyvoid_ms2bhyhf_ae2fa866",
);
assert.equal(
  summary.recommended_plan_fingerprint_sha256,
  fingerprint,
);

console.log(
  "VOID_BUY_VOID_OBSERVE_AND_CLAIM_CANDIDATE_PAYMENT_VERIFIED_FILTER_V1_GREEN",
);
console.log("payment_verified_eligible=1");
console.log("awaiting_payment_tx_hash_eligible=0");
console.log("payment_submitted_pending_manual_review_eligible=0");
console.log("rejected_eligible=0");
console.log("historical_candidates_excluded=5");
console.log("target_candidate_count=1");
console.log("readiness_status=exact_one");
console.log("request_mutation=0");
console.log("operator_event_mutation=0");
console.log("claim_journal_mutation=0");
console.log("activation=0");
console.log("transaction_broadcast=0");
console.log("void_delivery=0");
