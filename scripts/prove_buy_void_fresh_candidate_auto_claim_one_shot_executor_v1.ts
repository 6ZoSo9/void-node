import assert from "node:assert/strict";
import {
  VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_ONE_SHOT_EXECUTOR_CONFIRMATION_V1,
  runBuyVoidFreshCandidateAutoClaimOneShotExecutorV1,
} from "../src/economic/buy_void_fresh_candidate_auto_claim_one_shot_executor_v1.js";

const requestId = "buyvoid_one_shot_executor_v1";
const planFingerprint = "a".repeat(64);
const sourcePlan = "b".repeat(64);
const alertFingerprint = "c".repeat(64);

const disabledConfig = {
  schema: "void_buy_void_fresh_candidate_auto_claim_config_v1",
  marker: "VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_CONFIG_V1",
  version: 1,
  enabled: false,
  worker_policy: {
    enabled: false,
  },
  fulfillment_policy: {
    automatic_fulfillment_enabled: false,
  },
};

const waitingPlan = {
  status: "waiting",
  planned: false,
};

const planned = {
  status: "planned",
  planned: true,
  request_id: requestId,
  plan_fingerprint_sha256: sourcePlan,
  activation_plan_fingerprint_sha256: planFingerprint,
  required_confirmation:
    "buyVoidArmFreshCandidateAutoClaimOneShot",
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

let createCalls = 0;
let claimantCalls = 0;
let deleteCalls = 0;
let originalUnchanged = true;

const callbacks = {
  create_ephemeral_enabled_config: () => {
    createCalls += 1;
    return {
      path: "/tmp/ephemeral.json",
      sha256: "d".repeat(64),
    };
  },
  run_claimant: () => {
    claimantCalls += 1;
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
  delete_ephemeral_config: () => {
    deleteCalls += 1;
    return true;
  },
  verify_original_config_unchanged: () =>
    originalUnchanged,
};

const waiting =
  await runBuyVoidFreshCandidateAutoClaimOneShotExecutorV1({
    activation_plan: waitingPlan,
    disabled_config: disabledConfig,
    ...callbacks,
  });
assert.equal(waiting.ok, true);
assert.equal(waiting.status, "waiting");
assert.equal(createCalls, 0);
assert.equal(claimantCalls, 0);
assert.equal(deleteCalls, 0);

const dry =
  await runBuyVoidFreshCandidateAutoClaimOneShotExecutorV1({
    activation_plan: planned,
    disabled_config: disabledConfig,
    alert,
    ...callbacks,
  });
assert.equal(dry.ok, true);
assert.equal(dry.status, "dry_run");
assert.equal(createCalls, 0);
assert.equal(claimantCalls, 0);
assert.equal(deleteCalls, 0);

const wrong =
  await runBuyVoidFreshCandidateAutoClaimOneShotExecutorV1({
    activation_plan: planned,
    disabled_config: disabledConfig,
    alert,
    apply: true,
    confirmation: "wrong",
    ...callbacks,
  });
assert.equal(wrong.ok, false);
if (wrong.ok) throw new Error("expected confirmation hold");
assert.equal(
  wrong.reason,
  "explicit_one_shot_executor_confirmation_required",
);
assert.equal(createCalls, 0);
assert.equal(claimantCalls, 0);
assert.equal(deleteCalls, 0);

const claimed =
  await runBuyVoidFreshCandidateAutoClaimOneShotExecutorV1({
    activation_plan: planned,
    disabled_config: disabledConfig,
    alert,
    apply: true,
    confirmation:
      VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_ONE_SHOT_EXECUTOR_CONFIRMATION_V1,
    ...callbacks,
  });
assert.equal(claimed.ok, true);
assert.equal(claimed.status, "claimed");
assert.equal(claimed.mutation_performed, true);
assert.equal(claimed.claimant_invocation_count, 1);
assert.equal(claimed.original_config_write, false);
assert.equal(claimed.ephemeral_config_write, true);
assert.equal(claimed.ephemeral_config_deleted, true);
assert.equal(createCalls, 1);
assert.equal(claimantCalls, 1);
assert.equal(deleteCalls, 1);

originalUnchanged = false;
const changed =
  await runBuyVoidFreshCandidateAutoClaimOneShotExecutorV1({
    activation_plan: planned,
    disabled_config: disabledConfig,
    alert,
    apply: true,
    confirmation:
      VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_ONE_SHOT_EXECUTOR_CONFIRMATION_V1,
    ...callbacks,
  });
assert.equal(changed.ok, false);
if (changed.ok) throw new Error("expected original config hold");
assert.equal(changed.reason, "original_config_changed");
assert.equal(changed.ephemeral_config_deleted, true);

console.log(
  "VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_ONE_SHOT_EXECUTOR_V1_GREEN",
);
console.log("waiting_no_candidate=1");
console.log("dry_run_no_write=1");
console.log("exact_confirmation_required=1");
console.log("maximum_claimant_invocations=1");
console.log("original_config_write=0");
console.log("ephemeral_config_delete_required=1");
console.log("automatic_retry=0");
console.log("systemd_change=0");
console.log("service_restart=0");
console.log("request_journal_write=0");
console.log("inventory_reservation=0");
console.log("inventory_decrement=0");
console.log("wallet_access=0");
console.log("signing=0");
console.log("transaction_broadcast=0");
console.log("money_movement=0");
