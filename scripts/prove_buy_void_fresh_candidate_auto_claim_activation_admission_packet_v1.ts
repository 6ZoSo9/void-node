import assert from "node:assert/strict";
import {
  buildBuyVoidFreshCandidateAutoClaimActivationAdmissionPacketV1,
} from "../src/economic/buy_void_fresh_candidate_auto_claim_activation_admission_packet_v1.js";
import {
  VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_ACTIVATION_CEREMONY_EXECUTION_CONFIRMATION_V1,
} from "../src/economic/buy_void_fresh_candidate_auto_claim_activation_ceremony_v1.js";
import {
  VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_ACTIVATION_CREDENTIAL_ISSUER_CONFIRMATION_V1,
} from "../src/economic/buy_void_fresh_candidate_auto_claim_activation_credential_issuer_v1.js";

const requestId = "buyvoid_activation_admission_packet_v1";
const planFingerprint = "a".repeat(64);
const activationFingerprint = "b".repeat(64);
const alertFingerprint = "c".repeat(64);
const configSha = "d".repeat(64);
const ceremonyCommit = "e".repeat(40);
const issuerCommit = "f".repeat(40);
const runnerCommit = "1".repeat(40);
const executorCommit = "2".repeat(40);

const waitingPlan = {
  status: "waiting",
  planned: false,
};

const planned = {
  status: "planned",
  planned: true,
  request_id: requestId,
  plan_fingerprint_sha256: planFingerprint,
  activation_plan_fingerprint_sha256:
    activationFingerprint,
  one_shot: true,
  maximum_claim_count: 1,
  permanent_authority: {
    wallet_access: false,
    signing: false,
    transaction_broadcast: false,
    money_movement: false,
    inventory_decrement: false,
  },
  required_post_run_restore: {
    config_enabled: false,
    worker_enabled: false,
    automatic_fulfillment_enabled: false,
    apply_requested: false,
    confirmation_supplied: false,
    network_access_authorized: false,
    runtime_root_write_authorized: false,
  },
};

const alert = {
  schema: "void_buy_void_observe_and_claim_candidate_alert_v1",
  marker: "VOID_BUY_VOID_OBSERVE_AND_CLAIM_CANDIDATE_ALERT_V1",
  version: 1,
  request_id: requestId,
  plan_fingerprint_sha256: planFingerprint,
  alert_fingerprint_sha256: alertFingerprint,
};

const releases = {
  ceremony_release_commit: ceremonyCommit,
  issuer_release_commit: issuerCommit,
  runner_release_commit: runnerCommit,
  executor_release_commit: executorCommit,
};

const waiting =
  buildBuyVoidFreshCandidateAutoClaimActivationAdmissionPacketV1({
    activation_plan: waitingPlan,
    alert: null,
    persistent_config_sha256: configSha,
    persistent_config_disabled: true,
    ...releases,
  });
assert.equal(waiting.ok, true);
assert.equal(waiting.status, "waiting");
assert.equal(waiting.admitted, false);

const admitted =
  buildBuyVoidFreshCandidateAutoClaimActivationAdmissionPacketV1({
    activation_plan: planned,
    alert,
    persistent_config_sha256: configSha,
    persistent_config_disabled: true,
    ...releases,
  });
assert.equal(admitted.ok, true);
assert.equal(admitted.status, "admitted");
assert.equal(admitted.admitted, true);
assert.equal(admitted.request_id, requestId);
assert.equal(
  admitted.required_issuer_confirmation,
  VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_ACTIVATION_CREDENTIAL_ISSUER_CONFIRMATION_V1,
);
assert.equal(
  admitted.required_execution_confirmation,
  VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_ACTIVATION_CEREMONY_EXECUTION_CONFIRMATION_V1,
);
assert.equal(admitted.operator_approval_required, true);
assert.equal(admitted.automatic_execution, false);
assert.equal(admitted.maximum_credential_ttl_seconds, 900);
assert.equal(admitted.maximum_issuer_invocations, 1);
assert.equal(admitted.maximum_runner_invocations, 1);

const wrongAlert =
  buildBuyVoidFreshCandidateAutoClaimActivationAdmissionPacketV1({
    activation_plan: planned,
    alert: {
      ...alert,
      request_id: "wrong-request",
    },
    persistent_config_sha256: configSha,
    persistent_config_disabled: true,
    ...releases,
  });
assert.equal(wrongAlert.ok, false);
if (wrongAlert.ok) throw new Error("expected alert hold");
assert.equal(wrongAlert.reason, "exact_alert_binding_required");

const enabledConfig =
  buildBuyVoidFreshCandidateAutoClaimActivationAdmissionPacketV1({
    activation_plan: planned,
    alert,
    persistent_config_sha256: configSha,
    persistent_config_disabled: false,
    ...releases,
  });
assert.equal(enabledConfig.ok, false);
if (enabledConfig.ok) throw new Error("expected config hold");
assert.equal(
  enabledConfig.reason,
  "persistent_config_must_remain_disabled",
);

const wrongRelease =
  buildBuyVoidFreshCandidateAutoClaimActivationAdmissionPacketV1({
    activation_plan: planned,
    alert,
    persistent_config_sha256: configSha,
    persistent_config_disabled: true,
    ...releases,
    ceremony_release_commit: "bad",
  });
assert.equal(wrongRelease.ok, false);
if (wrongRelease.ok) throw new Error("expected release hold");
assert.equal(
  wrongRelease.reason,
  "valid_ceremony_release_commit_required",
);

console.log(
  "VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_ACTIVATION_ADMISSION_PACKET_V1_GREEN",
);
console.log("waiting_no_packet_authority=1");
console.log("exact_plan_alert_binding=1");
console.log("persistent_disabled_config_binding=1");
console.log("four_release_commit_binding=1");
console.log("operator_approval_required=1");
console.log("automatic_execution=0");
console.log("maximum_credential_ttl_seconds=900");
console.log("maximum_issuer_invocations=1");
console.log("maximum_runner_invocations=1");
console.log("process_spawn=0");
console.log("credential_created=0");
console.log("credential_consumed=0");
console.log("credential_content_printed=0");
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
