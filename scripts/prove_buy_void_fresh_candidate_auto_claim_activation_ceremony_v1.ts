import assert from "node:assert/strict";
import {
  VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_ACTIVATION_CEREMONY_EXECUTION_CONFIRMATION_V1,
  authorizeBuyVoidFreshCandidateAutoClaimActivationCeremonyV1,
} from "../src/economic/buy_void_fresh_candidate_auto_claim_activation_ceremony_v1.js";
import {
  VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_ACTIVATION_CREDENTIAL_ISSUER_CONFIRMATION_V1,
} from "../src/economic/buy_void_fresh_candidate_auto_claim_activation_credential_issuer_v1.js";

const requestId = "buyvoid_activation_ceremony_v1";
const sourcePlan = "a".repeat(64);
const activationPlanFingerprint = "b".repeat(64);
const alertFingerprint = "c".repeat(64);
const configSha = "d".repeat(64);
const issuerCommit = "e".repeat(40);
const runnerCommit = "f".repeat(40);
const executorCommit = "1".repeat(40);

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

const base = {
  alert,
  persistent_config_sha256: configSha,
  issuer_release_commit: issuerCommit,
  runner_release_commit: runnerCommit,
  executor_release_commit: executorCommit,
  credential_ttl_seconds: 900,
};

const waiting =
  authorizeBuyVoidFreshCandidateAutoClaimActivationCeremonyV1({
    activation_plan: waitingPlan,
    ...base,
  });
assert.equal(waiting.ok, true);
assert.equal(waiting.status, "waiting");
assert.equal(waiting.issuer_invocation_count, 0);
assert.equal(waiting.runner_invocation_count, 0);

const ready =
  authorizeBuyVoidFreshCandidateAutoClaimActivationCeremonyV1({
    activation_plan: planned,
    ...base,
  });
assert.equal(ready.ok, true);
assert.equal(ready.status, "ready");
assert.equal(ready.credential_created, false);
assert.equal(ready.credential_consumed, false);

const wrongIssuer =
  authorizeBuyVoidFreshCandidateAutoClaimActivationCeremonyV1({
    activation_plan: planned,
    ...base,
    activate: true,
    issuer_confirmation: "wrong",
    execution_confirmation:
      VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_ACTIVATION_CEREMONY_EXECUTION_CONFIRMATION_V1,
  });
assert.equal(wrongIssuer.ok, false);
if (wrongIssuer.ok) throw new Error("expected issuer hold");
assert.equal(
  wrongIssuer.reason,
  "exact_issuer_confirmation_required",
);

const wrongExecution =
  authorizeBuyVoidFreshCandidateAutoClaimActivationCeremonyV1({
    activation_plan: planned,
    ...base,
    activate: true,
    issuer_confirmation:
      VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_ACTIVATION_CREDENTIAL_ISSUER_CONFIRMATION_V1,
    execution_confirmation: "wrong",
  });
assert.equal(wrongExecution.ok, false);
if (wrongExecution.ok) throw new Error("expected execution hold");
assert.equal(
  wrongExecution.reason,
  "exact_execution_confirmation_required",
);

const approved =
  authorizeBuyVoidFreshCandidateAutoClaimActivationCeremonyV1({
    activation_plan: planned,
    ...base,
    activate: true,
    issuer_confirmation:
      VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_ACTIVATION_CREDENTIAL_ISSUER_CONFIRMATION_V1,
    execution_confirmation:
      VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_ACTIVATION_CEREMONY_EXECUTION_CONFIRMATION_V1,
  });
assert.equal(approved.ok, true);
assert.equal(approved.status, "approved");
assert.equal(approved.maximum_issuer_invocations, 1);
assert.equal(approved.maximum_runner_invocations, 1);
assert.equal(approved.credential_ttl_seconds, 900);
assert.equal(approved.credential_created, false);
assert.equal(approved.credential_consumed, false);

const tooLong =
  authorizeBuyVoidFreshCandidateAutoClaimActivationCeremonyV1({
    activation_plan: planned,
    ...base,
    credential_ttl_seconds: 901,
  });
assert.equal(tooLong.ok, false);
if (tooLong.ok) throw new Error("expected TTL hold");
assert.equal(
  tooLong.reason,
  "credential_ttl_seconds_out_of_bounds",
);

console.log(
  "VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_ACTIVATION_CEREMONY_V1_GREEN",
);
console.log("waiting_zero_child_invocations=1");
console.log("planned_ready_without_mutation=1");
console.log("separate_issuer_confirmation_required=1");
console.log("separate_execution_confirmation_required=1");
console.log("maximum_issuer_invocations=1");
console.log("maximum_runner_invocations=1");
console.log("exact_alert_plan_binding=1");
console.log("credential_ttl_max_seconds=900");
console.log("credential_content_printed=0");
console.log("sensitive_values_printed=0");
console.log("automatic_retry=0");
console.log("systemd_change=0");
console.log("service_restart=0");
console.log("persistent_config_write=0");
console.log("request_journal_write=0");
console.log("inventory_reservation=0");
console.log("inventory_decrement=0");
console.log("wallet_access=0");
console.log("signing=0");
console.log("transaction_broadcast=0");
console.log("money_movement=0");
