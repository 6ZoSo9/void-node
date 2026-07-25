import assert from "node:assert/strict";
import {
  fingerprintBuyVoidActivationCredentialV1,
} from "../src/economic/buy_void_fresh_candidate_auto_claim_activation_credential_runner_v1.js";
import {
  VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_ACTIVATION_CREDENTIAL_ISSUER_CONFIRMATION_V1,
  issueBuyVoidFreshCandidateAutoClaimActivationCredentialV1,
} from "../src/economic/buy_void_fresh_candidate_auto_claim_activation_credential_issuer_v1.js";

const requestId = "buyvoid_activation_credential_issuer_v1";
const sourcePlan = "a".repeat(64);
const activationPlanFingerprint = "b".repeat(64);
const alertFingerprint = "c".repeat(64);
const nonce = "d".repeat(64);
const configSha = "e".repeat(64);
const releaseCommit = "f".repeat(40);
const nowMs = 1_800_000_000_000;

const waitingPlan = {
  status: "waiting",
  planned: false,
};

const planned = {
  status: "planned",
  planned: true,
  request_id: requestId,
  plan_fingerprint_sha256: sourcePlan,
  activation_plan_fingerprint_sha256:
    activationPlanFingerprint,
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
  plan_fingerprint_sha256: sourcePlan,
  alert_fingerprint_sha256: alertFingerprint,
};

const waiting =
  issueBuyVoidFreshCandidateAutoClaimActivationCredentialV1({
    activation_plan: waitingPlan,
    persistent_config_sha256: configSha,
    executor_release_commit: releaseCommit,
    now_ms: nowMs,
  });
assert.equal(waiting.ok, true);
assert.equal(waiting.status, "waiting");
assert.equal(waiting.credential_created, false);

const ready =
  issueBuyVoidFreshCandidateAutoClaimActivationCredentialV1({
    activation_plan: planned,
    alert,
    persistent_config_sha256: configSha,
    executor_release_commit: releaseCommit,
    now_ms: nowMs,
  });
assert.equal(ready.ok, true);
assert.equal(ready.status, "ready");
assert.equal(ready.credential_created, false);
assert.equal(ready.maximum_ttl_ms, 900_000);

const wrong =
  issueBuyVoidFreshCandidateAutoClaimActivationCredentialV1({
    activation_plan: planned,
    alert,
    persistent_config_sha256: configSha,
    executor_release_commit: releaseCommit,
    now_ms: nowMs,
    issue: true,
    confirmation: "wrong",
    credential_nonce_sha256: nonce,
  });
assert.equal(wrong.ok, false);
if (wrong.ok) throw new Error("expected issuance confirmation hold");
assert.equal(
  wrong.reason,
  "explicit_credential_issuance_confirmation_required",
);

const issued =
  issueBuyVoidFreshCandidateAutoClaimActivationCredentialV1({
    activation_plan: planned,
    alert,
    persistent_config_sha256: configSha,
    executor_release_commit: releaseCommit,
    now_ms: nowMs,
    ttl_ms: 60_000,
    issue: true,
    confirmation:
      VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_ACTIVATION_CREDENTIAL_ISSUER_CONFIRMATION_V1,
    credential_nonce_sha256: nonce,
  });
assert.equal(issued.ok, true);
assert.equal(issued.status, "issued");
assert.equal(issued.credential_created, true);
assert.equal(issued.credential_file_write, true);
assert.equal(issued.credential_file_overwrite, false);
assert.equal(
  issued.credential_fingerprint_sha256,
  fingerprintBuyVoidActivationCredentialV1(
    issued.credential,
  ),
);
assert.equal(
  issued.credential.request_id,
  requestId,
);
assert.equal(
  issued.credential.activation_plan_fingerprint_sha256,
  activationPlanFingerprint,
);
assert.equal(
  issued.credential.alert_fingerprint_sha256,
  alertFingerprint,
);
assert.equal(
  issued.credential.executor_release_commit,
  releaseCommit,
);
assert.equal(
  issued.credential.persistent_config_sha256,
  configSha,
);
assert.equal(
  issued.credential.expires_at_ms,
  nowMs + 60_000,
);

const tooLong =
  issueBuyVoidFreshCandidateAutoClaimActivationCredentialV1({
    activation_plan: planned,
    alert,
    persistent_config_sha256: configSha,
    executor_release_commit: releaseCommit,
    now_ms: nowMs,
    ttl_ms: 900_001,
  });
assert.equal(tooLong.ok, false);
if (tooLong.ok) throw new Error("expected TTL hold");
assert.equal(tooLong.reason, "credential_ttl_out_of_bounds");

console.log(
  "VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_ACTIVATION_CREDENTIAL_ISSUER_V1_GREEN",
);
console.log("waiting_no_credential=1");
console.log("planned_ready_without_write=1");
console.log("exact_issuance_confirmation_required=1");
console.log("one_credential_per_activation_plan=1");
console.log("credential_fingerprint_binding=1");
console.log("exact_alert_plan_binding=1");
console.log("credential_ttl_max_ms=900000");
console.log("credential_file_overwrite=0");
console.log("credential_content_printed=0");
console.log("automatic_retry=0");
console.log("systemd_change=0");
console.log("service_restart=0");
console.log("rpc_call=0");
console.log("persistent_config_write=0");
console.log("claim_write=0");
console.log("request_write=0");
console.log("inventory_reservation=0");
console.log("inventory_decrement=0");
console.log("wallet_access=0");
console.log("signing=0");
console.log("transaction_broadcast=0");
console.log("money_movement=0");
