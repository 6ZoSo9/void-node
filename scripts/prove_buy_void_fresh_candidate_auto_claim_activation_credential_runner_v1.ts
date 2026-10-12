import assert from "node:assert/strict";
import {
  fingerprintBuyVoidActivationCredentialV1,
  runBuyVoidFreshCandidateAutoClaimActivationCredentialRunnerV1,
} from "../src/economic/buy_void_fresh_candidate_auto_claim_activation_credential_runner_v1.js";

const requestId = "buyvoid_activation_credential_runner_v1";
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

const credentialBase = {
  schema:
    "void_buy_void_fresh_candidate_auto_claim_activation_credential_v1",
  marker:
    "VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_ACTIVATION_CREDENTIAL_V1",
  version: 1,
  credential_nonce_sha256: nonce,
  request_id: requestId,
  activation_plan_fingerprint_sha256:
    activationPlanFingerprint,
  alert_fingerprint_sha256: alertFingerprint,
  executor_release_commit: releaseCommit,
  persistent_config_sha256: configSha,
  issued_at_ms: nowMs - 1_000,
  expires_at_ms: nowMs + 60_000,
  maximum_executor_invocations: 1,
  required_executor_confirmation:
    "buyVoidExecuteFreshCandidateAutoClaimOneShot",
  authority: {
    apply_authorized: true,
    claim_journal_write_authorized: true,
    rpc_read_authorized: true,
    persistent_config_write_authorized: false,
    request_journal_write_authorized: false,
    inventory_reservation_authorized: false,
    inventory_decrement_authorized: false,
    automatic_retry_authorized: false,
    systemd_change_authorized: false,
    service_restart_authorized: false,
    wallet_access_authorized: false,
    signing_authorized: false,
    transaction_broadcast_authorized: false,
    money_movement_authorized: false,
  },
};

const credential = {
  ...credentialBase,
  credential_fingerprint_sha256:
    fingerprintBuyVoidActivationCredentialV1(credentialBase),
};

let intentCalls = 0;
let executorCalls = 0;
let finalizeCalls = 0;
let allowIntent = true;

const callbacks = {
  write_consumption_intent: () => {
    intentCalls += 1;
    return allowIntent;
  },
  run_executor: () => {
    executorCalls += 1;
    return {
      ok: true,
      status: "claimed",
      mutation_performed: true,
      wallet_access: false,
      signing: false,
      transaction_broadcast: false,
      money_movement: false,
      inventory_decrement: false,
    };
  },
  finalize_consumption: () => {
    finalizeCalls += 1;
    return true;
  },
};

const waiting =
  await runBuyVoidFreshCandidateAutoClaimActivationCredentialRunnerV1({
    activation_plan: waitingPlan,
    persistent_config_sha256: configSha,
    executor_release_commit: releaseCommit,
    now_ms: nowMs,
    ...callbacks,
  });
assert.equal(waiting.ok, true);
assert.equal(waiting.status, "waiting");
assert.equal(intentCalls, 0);
assert.equal(executorCalls, 0);
assert.equal(finalizeCalls, 0);

const ready =
  await runBuyVoidFreshCandidateAutoClaimActivationCredentialRunnerV1({
    activation_plan: planned,
    alert,
    credential,
    persistent_config_sha256: configSha,
    executor_release_commit: releaseCommit,
    now_ms: nowMs,
    ...callbacks,
  });
assert.equal(ready.ok, true);
assert.equal(ready.status, "ready");
assert.equal(intentCalls, 0);
assert.equal(executorCalls, 0);
assert.equal(finalizeCalls, 0);

const claimed =
  await runBuyVoidFreshCandidateAutoClaimActivationCredentialRunnerV1({
    activation_plan: planned,
    alert,
    credential,
    persistent_config_sha256: configSha,
    executor_release_commit: releaseCommit,
    now_ms: nowMs,
    execute: true,
    ...callbacks,
  });
assert.equal(claimed.ok, true);
assert.equal(claimed.status, "claimed");
assert.equal(claimed.executor_invocation_count, 1);
assert.equal(claimed.credential_consumed, true);
assert.equal(intentCalls, 1);
assert.equal(executorCalls, 1);
assert.equal(finalizeCalls, 1);

allowIntent = false;
const duplicate =
  await runBuyVoidFreshCandidateAutoClaimActivationCredentialRunnerV1({
    activation_plan: planned,
    alert,
    credential,
    persistent_config_sha256: configSha,
    executor_release_commit: releaseCommit,
    now_ms: nowMs,
    execute: true,
    ...callbacks,
  });
assert.equal(duplicate.ok, false);
if (duplicate.ok) throw new Error("expected consumed credential hold");
assert.equal(
  duplicate.reason,
  "activation_credential_already_consumed_or_inflight",
);
assert.equal(executorCalls, 1);

const expiredCredentialBase = {
  ...credentialBase,
  issued_at_ms: nowMs - 120_000,
  expires_at_ms: nowMs - 60_000,
};
const expiredCredential = {
  ...expiredCredentialBase,
  credential_fingerprint_sha256:
    fingerprintBuyVoidActivationCredentialV1(
      expiredCredentialBase,
    ),
};
const expired =
  await runBuyVoidFreshCandidateAutoClaimActivationCredentialRunnerV1({
    activation_plan: planned,
    alert,
    credential: expiredCredential,
    persistent_config_sha256: configSha,
    executor_release_commit: releaseCommit,
    now_ms: nowMs,
    ...callbacks,
  });
assert.equal(expired.ok, false);
if (expired.ok) throw new Error("expected expired hold");
assert.equal(expired.reason, "activation_credential_not_current");

console.log(
  "VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_ACTIVATION_CREDENTIAL_RUNNER_V1_GREEN",
);
console.log("waiting_no_credential=1");
console.log("valid_credential_ready=1");
console.log("credential_fingerprint_binding=1");
console.log("exact_alert_plan_binding=1");
console.log("credential_ttl_max_ms=900000");
console.log("consumption_intent_before_execution=1");
console.log("maximum_executor_invocations=1");
console.log("credential_one_use=1");
console.log("automatic_retry=0");
console.log("persistent_config_write=0");
console.log("request_journal_write=0");
console.log("inventory_reservation=0");
console.log("inventory_decrement=0");
console.log("systemd_change=0");
console.log("service_restart=0");
console.log("wallet_access=0");
console.log("signing=0");
console.log("transaction_broadcast=0");
console.log("money_movement=0");
