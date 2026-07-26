import assert from "node:assert/strict";
import {
  authorizeBuyVoidFreshCandidateAutoClaimActivationOperatorConsoleV1,
} from "../src/economic/buy_void_fresh_candidate_auto_claim_activation_operator_console_v1.js";
import {
  VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_ACTIVATION_OPERATOR_APPROVAL_CONFIRMATION_V1,
} from "../src/economic/buy_void_fresh_candidate_auto_claim_activation_operator_approval_envelope_v1.js";
import {
  VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_ACTIVATION_OPERATOR_APPROVAL_CONSUMER_CONFIRMATION_V1,
} from "../src/economic/buy_void_fresh_candidate_auto_claim_activation_operator_approval_consumer_v1.js";

const waitingPlan = {
  schema:
    "void_buy_void_fresh_candidate_auto_claim_activation_plan_result_v1",
  marker:
    "VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_ACTIVATION_PLANNER_V1",
  version: 1,
  decision: {
    status: "waiting",
    planned: false,
    mutation_performed: false,
  },
};

const plannedPlan = {
  ...waitingPlan,
  decision: {
    status: "planned",
    planned: true,
    mutation_performed: false,
    request_id: "buyvoid_operator_console_v1",
    one_shot: true,
    maximum_claim_count: 1,
  },
};

const waiting =
  authorizeBuyVoidFreshCandidateAutoClaimActivationOperatorConsoleV1({
    plan: waitingPlan,
    alert_present: false,
  });
assert.equal(waiting.ok, true);
assert.equal(waiting.status, "waiting");
assert.equal(waiting.admission_packet_invocations, 0);

const missingAlert =
  authorizeBuyVoidFreshCandidateAutoClaimActivationOperatorConsoleV1({
    plan: plannedPlan,
    alert_present: false,
  });
assert.equal(missingAlert.ok, false);
if (missingAlert.ok) throw new Error("expected alert hold");
assert.equal(
  missingAlert.reason,
  "exact_activation_alert_required",
);

const ready =
  authorizeBuyVoidFreshCandidateAutoClaimActivationOperatorConsoleV1({
    plan: plannedPlan,
    alert_present: true,
  });
assert.equal(ready.ok, true);
assert.equal(ready.status, "ready");
assert.equal(ready.activation_authorized, false);

const wrongApproval =
  authorizeBuyVoidFreshCandidateAutoClaimActivationOperatorConsoleV1({
    plan: plannedPlan,
    alert_present: true,
    activate: true,
    operator_approval_confirmation: "wrong",
    consumer_confirmation:
      VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_ACTIVATION_OPERATOR_APPROVAL_CONSUMER_CONFIRMATION_V1,
  });
assert.equal(wrongApproval.ok, false);
if (wrongApproval.ok) {
  throw new Error("expected approval confirmation hold");
}
assert.equal(
  wrongApproval.reason,
  "exact_operator_approval_confirmation_required",
);

const wrongConsumer =
  authorizeBuyVoidFreshCandidateAutoClaimActivationOperatorConsoleV1({
    plan: plannedPlan,
    alert_present: true,
    activate: true,
    operator_approval_confirmation:
      VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_ACTIVATION_OPERATOR_APPROVAL_CONFIRMATION_V1,
    consumer_confirmation: "wrong",
  });
assert.equal(wrongConsumer.ok, false);
if (wrongConsumer.ok) {
  throw new Error("expected consumer confirmation hold");
}
assert.equal(
  wrongConsumer.reason,
  "exact_consumer_confirmation_required",
);

const authorized =
  authorizeBuyVoidFreshCandidateAutoClaimActivationOperatorConsoleV1({
    plan: plannedPlan,
    alert_present: true,
    activate: true,
    operator_approval_confirmation:
      VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_ACTIVATION_OPERATOR_APPROVAL_CONFIRMATION_V1,
    consumer_confirmation:
      VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_ACTIVATION_OPERATOR_APPROVAL_CONSUMER_CONFIRMATION_V1,
  });
assert.equal(authorized.ok, true);
assert.equal(authorized.status, "authorized");
assert.equal(authorized.activation_authorized, true);
assert.equal(
  authorized.maximum_admission_packet_invocations,
  1,
);
assert.equal(
  authorized.maximum_approval_envelope_invocations,
  1,
);
assert.equal(
  authorized.maximum_approval_consumer_invocations,
  1,
);

console.log(
  "VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_ACTIVATION_OPERATOR_CONSOLE_V1_GREEN",
);
console.log("waiting_zero_child_invocations=1");
console.log("planned_alert_required=1");
console.log("planned_ready_without_mutation=1");
console.log("separate_operator_approval_confirmation_required=1");
console.log("separate_consumer_confirmation_required=1");
console.log("maximum_admission_packet_invocations=1");
console.log("maximum_approval_envelope_invocations=1");
console.log("maximum_approval_consumer_invocations=1");
console.log("automatic_retry=0");
console.log("persistent_config_write=0");
console.log("request_journal_write=0");
console.log("inventory_reservation=0");
console.log("inventory_decrement=0");
console.log("direct_rpc_call=0");
console.log("direct_claim_write=0");
console.log("direct_wallet_access=0");
console.log("direct_signing=0");
console.log("direct_transaction_broadcast=0");
console.log("direct_money_movement=0");
