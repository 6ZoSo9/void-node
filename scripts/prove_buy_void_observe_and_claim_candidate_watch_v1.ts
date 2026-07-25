import assert from "node:assert/strict";
import {
  defaultBuyVoidObserveAndClaimCandidateWatchStateV1,
  evaluateBuyVoidObserveAndClaimCandidateWatchV1,
  type BuyVoidObserveAndClaimReadinessReportV1,
} from "../src/economic/buy_void_observe_and_claim_candidate_watch_v1.js";

const authority = {
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
};

function report(
  status: "none" | "exact_one" | "multiple",
): BuyVoidObserveAndClaimReadinessReportV1 {
  if (status === "none") {
    return {
      schema:
        "void_buy_void_observe_and_claim_candidate_readiness_v1",
      marker:
        "VOID_BUY_VOID_OBSERVE_AND_CLAIM_CANDIDATE_READINESS_V1",
      version: 1,
      candidate_stage: "observe_and_claim",
      readiness_status: "none",
      eligible_candidate_count: 0,
      eligible_request_ids: [],
      recommended_request_id: null,
      recommended_plan_fingerprint_sha256: null,
      recommended_orchestrator_confirmation: null,
      recommended_delegated_confirmation: null,
      recommended_stage_confirmation: null,
      authority,
    };
  }

  const ids = status === "exact_one"
    ? ["buyvoid_watch_candidate_v1"]
    : [
        "buyvoid_watch_candidate_a",
        "buyvoid_watch_candidate_b",
      ];

  return {
    schema:
      "void_buy_void_observe_and_claim_candidate_readiness_v1",
    marker:
      "VOID_BUY_VOID_OBSERVE_AND_CLAIM_CANDIDATE_READINESS_V1",
    version: 1,
    candidate_stage: "observe_and_claim",
    readiness_status: status,
    eligible_candidate_count: ids.length,
    eligible_request_ids: ids,
    recommended_request_id:
      status === "exact_one" ? ids[0] : null,
    recommended_plan_fingerprint_sha256:
      status === "exact_one" ? "a".repeat(64) : null,
    recommended_orchestrator_confirmation:
      status === "exact_one"
        ? "buyVoidRunBoundedAutoFulfillment"
        : null,
    recommended_delegated_confirmation:
      status === "exact_one"
        ? "verifyAndClaimExact"
        : null,
    recommended_stage_confirmation:
      status === "exact_one"
        ? "buyVoidApplyObserveAndClaim"
        : null,
    authority,
  };
}

const initial =
  defaultBuyVoidObserveAndClaimCandidateWatchStateV1();

const none =
  evaluateBuyVoidObserveAndClaimCandidateWatchV1({
    readiness_report: report("none"),
    readiness_report_sha256: "1".repeat(64),
    previous_state: initial,
    observed_at: "2026-07-25T00:00:00.000Z",
  });

assert.equal(none.status, "none");
assert.equal(none.alert_required, false);
assert.equal(none.alert, null);
assert.equal(
  none.next_state.last_readiness_report_sha256,
  "1".repeat(64),
);

const alert =
  evaluateBuyVoidObserveAndClaimCandidateWatchV1({
    readiness_report: report("exact_one"),
    readiness_report_sha256: "2".repeat(64),
    previous_state: none.next_state,
    observed_at: "2026-07-25T00:01:00.000Z",
  });

assert.equal(alert.status, "alert");
if (alert.status !== "alert") {
  throw new Error("expected exact-one alert");
}
assert.equal(alert.alert_required, true);
assert.equal(alert.alert.request_id, "buyvoid_watch_candidate_v1");
assert.equal(
  alert.alert.plan_fingerprint_sha256,
  "a".repeat(64),
);
assert.equal(
  alert.alert.required_stage_confirmation,
  "buyVoidApplyObserveAndClaim",
);
assert.equal(
  alert.alert.required_canary_confirmation,
  "buyVoidArmExactObserveAndClaimCanary",
);
assert.match(
  alert.alert.alert_fingerprint_sha256,
  /^[0-9a-f]{64}$/,
);
assert.equal(alert.alert.activation_performed, false);
assert.equal(alert.alert.authority.network_state_write, false);
assert.equal(
  alert.alert.authority.operator_local_state_write,
  true,
);
assert.equal(alert.alert.authority.wallet_access, false);
assert.equal(alert.alert.authority.signing, false);
assert.equal(
  alert.alert.authority.transaction_broadcast,
  false,
);
assert.equal(alert.alert.authority.money_movement, false);

const duplicate =
  evaluateBuyVoidObserveAndClaimCandidateWatchV1({
    readiness_report: report("exact_one"),
    readiness_report_sha256: "2".repeat(64),
    previous_state: alert.next_state,
    observed_at: "2026-07-25T00:02:00.000Z",
  });

assert.equal(duplicate.status, "duplicate");
assert.equal(duplicate.alert_required, false);
assert.equal(
  duplicate.alert?.alert_fingerprint_sha256,
  alert.alert.alert_fingerprint_sha256,
);

const multiple =
  evaluateBuyVoidObserveAndClaimCandidateWatchV1({
    readiness_report: report("multiple"),
    readiness_report_sha256: "3".repeat(64),
    previous_state: alert.next_state,
  });

assert.equal(multiple.status, "held");
if (multiple.status !== "held") {
  throw new Error("expected multiple-candidate hold");
}
assert.equal(
  multiple.reason,
  "multiple_eligible_candidates_require_operator_selection",
);

const unsafeReport = report("exact_one");
unsafeReport.authority = {
  ...unsafeReport.authority,
  wallet_access: true,
};

const unsafe =
  evaluateBuyVoidObserveAndClaimCandidateWatchV1({
    readiness_report: unsafeReport,
    readiness_report_sha256: "4".repeat(64),
  });

assert.equal(unsafe.status, "held");
if (unsafe.status !== "held") {
  throw new Error("expected unsafe-authority hold");
}
assert.equal(unsafe.reason, "read_only_authority_required");

console.log(
  "VOID_BUY_VOID_OBSERVE_AND_CLAIM_CANDIDATE_WATCH_V1_GREEN",
);
console.log("none_state=1");
console.log("exact_one_alert=1");
console.log("duplicate_alert_suppressed=1");
console.log("multiple_candidate_hold=1");
console.log("unsafe_authority_hold=1");
console.log("network_state_write=0");
console.log("operator_local_state_write=1");
console.log("runtime_import_mounted=0");
console.log("apply_requested=0");
console.log("inventory_reservation=0");
console.log("execution_attempt_reservation=0");
console.log("wallet_access=0");
console.log("signing=0");
console.log("transaction_broadcast=0");
console.log("rpc_mutation=0");
console.log("money_movement=0");
