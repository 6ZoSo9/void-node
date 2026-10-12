import assert from "node:assert/strict";
import {
  VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_ACTIVATION_PLANNER_AUTHORITY_V1,
  VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_ARM_CONFIRMATION_V1,
  planBuyVoidFreshCandidateAutoClaimActivationV1,
} from "../src/economic/buy_void_fresh_candidate_auto_claim_activation_planner_v1.js";

const requestId = "buyvoid_activation_planner_v1";
const planFingerprint = "a".repeat(64);
const alertFingerprint = "b".repeat(64);

const config = {
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
  disabled_authority: {
    top_level_enabled: false,
    worker_enabled: false,
    automatic_fulfillment_enabled: false,
    systemd_exec_apply: false,
    systemd_exec_confirmation: false,
    systemd_network_access: false,
    runtime_root_write_access: false,
    wallet_access: false,
    signing: false,
    transaction_broadcast: false,
    money_movement: false,
  },
};

const health = {
  deployment_enabled: false,
  apply_requested: false,
  confirmation_supplied: false,
  network_access_authorized: false,
  runtime_root_write_authorized: false,
  claim_changes: false,
  request_changes: false,
  inventory_changes: false,
  wallet_access: false,
  signing: false,
  transaction_broadcast: false,
  money_movement: false,
};

const readinessNone = {
  schema: "void_buy_void_observe_and_claim_candidate_readiness_v1",
  marker: "VOID_BUY_VOID_OBSERVE_AND_CLAIM_CANDIDATE_READINESS_V1",
  version: 1,
  candidate_stage: "observe_and_claim",
  readiness_status: "none",
  eligible_candidate_count: 0,
  eligible_request_ids: [],
  recommended_request_id: null,
  recommended_plan_fingerprint_sha256: null,
};

const readinessExact = {
  ...readinessNone,
  readiness_status: "exact_one",
  eligible_candidate_count: 1,
  eligible_request_ids: [requestId],
  recommended_request_id: requestId,
  recommended_plan_fingerprint_sha256: planFingerprint,
  recommended_orchestrator_confirmation:
    "buyVoidRunBoundedAutomaticFulfillmentStage",
  recommended_delegated_confirmation: "buyVoidVerifyAndClaim",
  recommended_stage_confirmation: "buyVoidApplyObserveAndClaim",
};

const watch = {
  schema: "void_buy_void_observe_and_claim_candidate_watch_result_v1",
  marker: "VOID_BUY_VOID_OBSERVE_AND_CLAIM_CANDIDATE_WATCH_V1",
  version: 1,
  readiness_status: "exact_one",
  eligible_candidate_count: 1,
  recommended_request_id: requestId,
  watch_status: "alert",
  alert_path: `/tmp/${alertFingerprint}.json`,
  alert: {
    schema: "void_buy_void_observe_and_claim_candidate_alert_v1",
    marker: "VOID_BUY_VOID_OBSERVE_AND_CLAIM_CANDIDATE_ALERT_V1",
    version: 1,
    request_id: requestId,
    plan_fingerprint_sha256: planFingerprint,
    alert_fingerprint_sha256: alertFingerprint,
  },
  activation_performed: false,
  apply_requested: false,
  wallet_access: false,
  signing: false,
  transaction_broadcast: false,
  money_movement: false,
};

const waiting = planBuyVoidFreshCandidateAutoClaimActivationV1({
  config,
  readiness: readinessNone,
  watch: {
    ...watch,
    watch_status: "none",
    alert: null,
    recommended_request_id: null,
  },
  health,
});
assert.equal(waiting.ok, true);
assert.equal(waiting.status, "waiting");
assert.equal(waiting.planned, false);

const planned = planBuyVoidFreshCandidateAutoClaimActivationV1({
  config,
  readiness: readinessExact,
  watch,
  health,
});
assert.equal(planned.ok, true);
assert.equal(planned.status, "planned");
if (planned.status !== "planned") {
  throw new Error("expected planned result");
}
assert.equal(planned.one_shot, true);
assert.equal(planned.maximum_claim_count, 1);
assert.equal(
  planned.required_confirmation,
  VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_ARM_CONFIRMATION_V1,
);
assert.equal(planned.permanent_authority.wallet_access, false);
assert.equal(
  planned.permanent_authority.transaction_broadcast,
  false,
);
assert.equal(
  planned.required_post_run_restore.config_enabled,
  false,
);

const enabledConfig =
  planBuyVoidFreshCandidateAutoClaimActivationV1({
    config: {
      ...config,
      enabled: true,
    },
    readiness: readinessExact,
    watch,
    health,
  });
assert.equal(enabledConfig.ok, false);
if (enabledConfig.ok) throw new Error("expected config hold");
assert.equal(
  enabledConfig.reason,
  "all_disabled_config_gates_required",
);

const unsafeHealth =
  planBuyVoidFreshCandidateAutoClaimActivationV1({
    config,
    readiness: readinessExact,
    watch,
    health: {
      ...health,
      network_access_authorized: true,
    },
  });
assert.equal(unsafeHealth.ok, false);
if (unsafeHealth.ok) throw new Error("expected health hold");
assert.equal(
  unsafeHealth.reason,
  "disabled_runtime_health_required",
);

const staleAlert =
  planBuyVoidFreshCandidateAutoClaimActivationV1({
    config,
    readiness: readinessExact,
    watch: {
      ...watch,
      alert: {
        ...(watch.alert as Record<string, unknown>),
        plan_fingerprint_sha256: "c".repeat(64),
      },
    },
    health,
  });
assert.equal(staleAlert.ok, false);
if (staleAlert.ok) throw new Error("expected stale alert hold");
assert.equal(staleAlert.reason, "exact_alert_identity_required");

assert.equal(
  VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_ACTIVATION_PLANNER_AUTHORITY_V1
    .config_write,
  false,
);
assert.equal(
  VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_ACTIVATION_PLANNER_AUTHORITY_V1
    .service_change,
  false,
);
assert.equal(
  VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_ACTIVATION_PLANNER_AUTHORITY_V1
    .claim_write,
  false,
);

console.log(
  "VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_ACTIVATION_PLANNER_V1_GREEN",
);
console.log("waiting_no_candidate=1");
console.log("exact_one_plan=1");
console.log("maximum_claim_count=1");
console.log("config_write=0");
console.log("unit_file_write=0");
console.log("service_change=0");
console.log("apply_requested=0");
console.log("rpc_call=0");
console.log("claim_write=0");
console.log("wallet_access=0");
console.log("transaction_broadcast=0");
console.log("money_movement=0");
