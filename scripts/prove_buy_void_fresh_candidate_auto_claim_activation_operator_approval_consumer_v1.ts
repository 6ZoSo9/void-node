import assert from "node:assert/strict";
import {
  VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_ACTIVATION_OPERATOR_APPROVAL_CONSUMER_CONFIRMATION_V1,
  authorizeBuyVoidFreshCandidateAutoClaimActivationOperatorApprovalConsumerV1,
  computeBuyVoidActivationOperatorApprovalFingerprintV1,
} from "../src/economic/buy_void_fresh_candidate_auto_claim_activation_operator_approval_consumer_v1.js";
import {
  VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_ACTIVATION_CEREMONY_EXECUTION_CONFIRMATION_V1,
} from "../src/economic/buy_void_fresh_candidate_auto_claim_activation_ceremony_v1.js";
import {
  VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_ACTIVATION_CREDENTIAL_ISSUER_CONFIRMATION_V1,
} from "../src/economic/buy_void_fresh_candidate_auto_claim_activation_credential_issuer_v1.js";

const nowMs = 1_800_000_000_000;
const requestId = "buyvoid_operator_approval_consumer_v1";
const admissionSha = "a".repeat(64);
const planFingerprint = "b".repeat(64);
const activationFingerprint = "c".repeat(64);
const alertFingerprint = "d".repeat(64);
const configSha = "e".repeat(64);
const ceremonyCommit = "f".repeat(40);
const issuerCommit = "1".repeat(40);
const runnerCommit = "2".repeat(40);
const executorCommit = "3".repeat(40);

const approvalWithoutFingerprint = {
  schema:
    "void_buy_void_fresh_candidate_auto_claim_activation_operator_approval_envelope_v1",
  marker:
    "VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_ACTIVATION_OPERATOR_APPROVAL_ENVELOPE_V1",
  version: 1,
  request_id: requestId,
  admission_packet_sha256: admissionSha,
  plan_fingerprint_sha256: planFingerprint,
  activation_plan_fingerprint_sha256:
    activationFingerprint,
  alert_fingerprint_sha256: alertFingerprint,
  persistent_config_sha256: configSha,
  ceremony_release_commit: ceremonyCommit,
  issuer_release_commit: issuerCommit,
  runner_release_commit: runnerCommit,
  executor_release_commit: executorCommit,
  issued_at_ms: nowMs - 1_000,
  expires_at_ms: nowMs + 899_000,
  maximum_approval_ttl_seconds: 900,
  maximum_ceremony_invocations: 1,
  maximum_issuer_invocations: 1,
  maximum_runner_invocations: 1,
  required_issuer_confirmation:
    VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_ACTIVATION_CREDENTIAL_ISSUER_CONFIRMATION_V1,
  required_execution_confirmation:
    VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_ACTIVATION_CEREMONY_EXECUTION_CONFIRMATION_V1,
  operator_approved: true,
  automatic_execution: false,
  consumed: false,
};

const approval = {
  ...approvalWithoutFingerprint,
  approval_fingerprint_sha256:
    computeBuyVoidActivationOperatorApprovalFingerprintV1(
      approvalWithoutFingerprint,
    ),
};

const common = {
  now_ms: nowMs,
  current_admission_packet_sha256: admissionSha,
  current_plan_fingerprint_sha256: planFingerprint,
  current_activation_plan_fingerprint_sha256:
    activationFingerprint,
  current_alert_fingerprint_sha256: alertFingerprint,
  current_persistent_config_sha256: configSha,
  ceremony_release_commit: ceremonyCommit,
  issuer_release_commit: issuerCommit,
  runner_release_commit: runnerCommit,
  executor_release_commit: executorCommit,
};

const waiting =
  authorizeBuyVoidFreshCandidateAutoClaimActivationOperatorApprovalConsumerV1({
    ...common,
    approval: null,
  });
assert.equal(waiting.ok, true);
assert.equal(waiting.status, "waiting");

const ready =
  authorizeBuyVoidFreshCandidateAutoClaimActivationOperatorApprovalConsumerV1({
    ...common,
    approval,
  });
assert.equal(ready.ok, true);
assert.equal(ready.status, "ready");
assert.equal(ready.execute_authorized, false);
assert.equal(
  ready.required_consumer_confirmation,
  VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_ACTIVATION_OPERATOR_APPROVAL_CONSUMER_CONFIRMATION_V1,
);

const wrongConfirmation =
  authorizeBuyVoidFreshCandidateAutoClaimActivationOperatorApprovalConsumerV1({
    ...common,
    approval,
    execute: true,
    confirmation: "wrong",
  });
assert.equal(wrongConfirmation.ok, false);
if (wrongConfirmation.ok) {
  throw new Error("expected confirmation hold");
}
assert.equal(
  wrongConfirmation.reason,
  "exact_consumer_confirmation_required",
);

const authorized =
  authorizeBuyVoidFreshCandidateAutoClaimActivationOperatorApprovalConsumerV1({
    ...common,
    approval,
    execute: true,
    confirmation:
      VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_ACTIVATION_OPERATOR_APPROVAL_CONSUMER_CONFIRMATION_V1,
  });
assert.equal(authorized.ok, true);
assert.equal(authorized.status, "authorized");
assert.equal(authorized.execute_authorized, true);
assert.equal(authorized.maximum_ceremony_invocations, 1);
assert.equal(authorized.maximum_issuer_invocations, 1);
assert.equal(authorized.maximum_runner_invocations, 1);

const expired =
  authorizeBuyVoidFreshCandidateAutoClaimActivationOperatorApprovalConsumerV1({
    ...common,
    approval: {
      ...approval,
      issued_at_ms: nowMs - 901_000,
      expires_at_ms: nowMs - 1_000,
    },
  });
assert.equal(expired.ok, false);
if (expired.ok) throw new Error("expected expiry hold");
assert.equal(
  expired.reason,
  "operator_approval_fingerprint_mismatch",
);

const bindingHeld =
  authorizeBuyVoidFreshCandidateAutoClaimActivationOperatorApprovalConsumerV1({
    ...common,
    approval,
    current_alert_fingerprint_sha256: "9".repeat(64),
  });
assert.equal(bindingHeld.ok, false);
if (bindingHeld.ok) throw new Error("expected binding hold");
assert.equal(
  bindingHeld.reason,
  "exact_alert_fingerprint_binding_required",
);

console.log(
  "VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_ACTIVATION_OPERATOR_APPROVAL_CONSUMER_V1_GREEN",
);
console.log("waiting_no_approval=1");
console.log("valid_approval_ready=1");
console.log("exact_consumer_confirmation_required=1");
console.log("approval_fingerprint_binding=1");
console.log("exact_current_state_binding=1");
console.log("approval_ttl_max_ms=900000");
console.log("consumption_intent_before_ceremony=1");
console.log("maximum_ceremony_invocations=1");
console.log("maximum_issuer_invocations=1");
console.log("maximum_runner_invocations=1");
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
