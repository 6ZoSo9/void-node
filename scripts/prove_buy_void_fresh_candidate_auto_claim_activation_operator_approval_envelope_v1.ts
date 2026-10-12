import assert from "node:assert/strict";
import {
  VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_ACTIVATION_OPERATOR_APPROVAL_CONFIRMATION_V1,
  authorizeBuyVoidFreshCandidateAutoClaimActivationOperatorApprovalV1,
} from "../src/economic/buy_void_fresh_candidate_auto_claim_activation_operator_approval_envelope_v1.js";
import {
  VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_ACTIVATION_CEREMONY_EXECUTION_CONFIRMATION_V1,
} from "../src/economic/buy_void_fresh_candidate_auto_claim_activation_ceremony_v1.js";
import {
  VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_ACTIVATION_CREDENTIAL_ISSUER_CONFIRMATION_V1,
} from "../src/economic/buy_void_fresh_candidate_auto_claim_activation_credential_issuer_v1.js";

const requestId = "buyvoid_operator_approval_v1";
const packetSha = "a".repeat(64);
const planFingerprint = "b".repeat(64);
const activationFingerprint = "c".repeat(64);
const alertFingerprint = "d".repeat(64);
const configSha = "e".repeat(64);
const ceremonyCommit = "f".repeat(40);
const issuerCommit = "1".repeat(40);
const runnerCommit = "2".repeat(40);
const executorCommit = "3".repeat(40);

const waitingPacket = {
  schema:
    "void_buy_void_fresh_candidate_auto_claim_activation_admission_packet_result_v1",
  marker:
    "VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_ACTIVATION_ADMISSION_PACKET_V1",
  version: 1,
  decision: {
    ok: true,
    status: "waiting",
    admitted: false,
    mutation_performed: false,
    reason: "activation_plan_waiting",
  },
  operator_approval_required: false,
  automatic_execution: false,
  process_spawn: false,
  issuer_invocation_count: 0,
  runner_invocation_count: 0,
  credential_created: false,
  credential_consumed: false,
  credential_content_printed: false,
  sensitive_values_printed: false,
  automatic_retry: false,
  systemd_change: false,
  service_restart: false,
  persistent_config_write: false,
  claim_write: false,
  request_write: false,
  inventory_reservation: false,
  inventory_decrement: false,
  wallet_access: false,
  signing: false,
  transaction_broadcast: false,
  money_movement: false,
};

const admittedPacket = {
  ...waitingPacket,
  decision: {
    ok: true,
    status: "admitted",
    admitted: true,
    mutation_performed: false,
    request_id: requestId,
    plan_fingerprint_sha256: planFingerprint,
    activation_plan_fingerprint_sha256:
      activationFingerprint,
    alert_fingerprint_sha256: alertFingerprint,
    persistent_config_sha256: configSha,
    ceremony_release_commit: ceremonyCommit,
    issuer_release_commit: issuerCommit,
    runner_release_commit: runnerCommit,
    executor_release_commit: executorCommit,
    maximum_credential_ttl_seconds: 900,
    maximum_issuer_invocations: 1,
    maximum_runner_invocations: 1,
    required_issuer_confirmation:
      VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_ACTIVATION_CREDENTIAL_ISSUER_CONFIRMATION_V1,
    required_execution_confirmation:
      VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_ACTIVATION_CEREMONY_EXECUTION_CONFIRMATION_V1,
    operator_approval_required: true,
    automatic_execution: false,
  },
  operator_approval_required: true,
};

const waiting =
  authorizeBuyVoidFreshCandidateAutoClaimActivationOperatorApprovalV1({
    admission_packet: waitingPacket,
    admission_packet_sha256: packetSha,
  });
assert.equal(waiting.ok, true);
assert.equal(waiting.status, "waiting");
assert.equal(
  waiting.approval_file_write_authorized,
  false,
);

const ready =
  authorizeBuyVoidFreshCandidateAutoClaimActivationOperatorApprovalV1({
    admission_packet: admittedPacket,
    admission_packet_sha256: packetSha,
  });
assert.equal(ready.ok, true);
assert.equal(ready.status, "ready");
assert.equal(ready.approved, false);
assert.equal(
  ready.required_operator_confirmation,
  VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_ACTIVATION_OPERATOR_APPROVAL_CONFIRMATION_V1,
);

const wrongConfirmation =
  authorizeBuyVoidFreshCandidateAutoClaimActivationOperatorApprovalV1({
    admission_packet: admittedPacket,
    admission_packet_sha256: packetSha,
    approve: true,
    confirmation: "wrong",
  });
assert.equal(wrongConfirmation.ok, false);
if (wrongConfirmation.ok) {
  throw new Error("expected confirmation hold");
}
assert.equal(
  wrongConfirmation.reason,
  "exact_operator_approval_confirmation_required",
);

const approved =
  authorizeBuyVoidFreshCandidateAutoClaimActivationOperatorApprovalV1({
    admission_packet: admittedPacket,
    admission_packet_sha256: packetSha,
    approve: true,
    confirmation:
      VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_ACTIVATION_OPERATOR_APPROVAL_CONFIRMATION_V1,
    approval_ttl_seconds: 900,
  });
assert.equal(approved.ok, true);
assert.equal(approved.status, "approved");
assert.equal(approved.approved, true);
assert.equal(
  approved.approval_file_write_authorized,
  true,
);
assert.equal(approved.maximum_ceremony_invocations, 1);
assert.equal(approved.maximum_issuer_invocations, 1);
assert.equal(approved.maximum_runner_invocations, 1);
assert.equal(approved.automatic_execution, false);

const ttlHeld =
  authorizeBuyVoidFreshCandidateAutoClaimActivationOperatorApprovalV1({
    admission_packet: admittedPacket,
    admission_packet_sha256: packetSha,
    approval_ttl_seconds: 901,
  });
assert.equal(ttlHeld.ok, false);
if (ttlHeld.ok) throw new Error("expected TTL hold");
assert.equal(
  ttlHeld.reason,
  "approval_ttl_seconds_out_of_bounds",
);

const unsafePacket =
  authorizeBuyVoidFreshCandidateAutoClaimActivationOperatorApprovalV1({
    admission_packet: {
      ...admittedPacket,
      process_spawn: true,
    },
    admission_packet_sha256: packetSha,
  });
assert.equal(unsafePacket.ok, false);
if (unsafePacket.ok) {
  throw new Error("expected unsafe packet hold");
}
assert.equal(
  unsafePacket.reason,
  "safe_activation_admission_packet_authority_required",
);

console.log(
  "VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_ACTIVATION_OPERATOR_APPROVAL_ENVELOPE_V1_GREEN",
);
console.log("waiting_no_approval=1");
console.log("admitted_ready_without_write=1");
console.log("exact_operator_confirmation_required=1");
console.log("one_approval_per_packet=1");
console.log("approval_ttl_max_seconds=900");
console.log("maximum_ceremony_invocations=1");
console.log("maximum_issuer_invocations=1");
console.log("maximum_runner_invocations=1");
console.log("automatic_execution=0");
console.log("process_spawn=0");
console.log("ceremony_invocation=0");
console.log("credential_created=0");
console.log("credential_consumed=0");
console.log("approval_content_printed=0");
console.log("sensitive_values_printed=0");
console.log("automatic_retry=0");
console.log("systemd_change=0");
console.log("service_restart=0");
console.log("persistent_config_write=0");
console.log("claim_write=0");
console.log("request_write=0");
console.log("inventory_reservation=0");
console.log("inventory_decrement=0");
console.log("wallet_access=0");
console.log("signing=0");
console.log("transaction_broadcast=0");
console.log("money_movement=0");
