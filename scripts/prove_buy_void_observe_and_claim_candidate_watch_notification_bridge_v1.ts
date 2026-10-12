import assert from "node:assert/strict";
import {
  evaluateCandidateWatchNotificationBridgeV1,
  sha256Canonical,
  type CandidateWatchAlertSourceV1,
  type CandidateWatchResultV1,
  type CandidateWatchSystemdObservationV1,
} from "../src/economic/buy_void_observe_and_claim_candidate_watch_notification_bridge_v1.js";

const shaA = "a".repeat(64);
const shaB = "b".repeat(64);
const shaC = "c".repeat(64);
const shaD = "d".repeat(64);

function systemd(
  timerSubState: "waiting" | "running" | "elapsed" = "waiting",
  nextElapse = "2min 10s",
): CandidateWatchSystemdObservationV1 {
  return {
    watch_service: {
      load_state: "loaded",
      active_state: timerSubState === "running" ? "active" : "inactive",
      sub_state: timerSubState === "running" ? "running" : "dead",
      result: "success",
      exec_main_status: "0",
    },
    watch_timer: {
      load_state: "loaded",
      enabled_state: "enabled",
      active_state: "active",
      sub_state: timerSubState,
      last_trigger: "Sat 2026-07-25 09:41:22 CDT",
      next_elapse_monotonic: nextElapse,
    },
  };
}

function alertSource(): CandidateWatchAlertSourceV1 {
  return {
    path: "/operator/alerts/" + shaA + ".json",
    sha256: shaD,
    alert: {
      schema: "void_buy_void_observe_and_claim_candidate_alert_v1",
      marker: "VOID_BUY_VOID_OBSERVE_AND_CLAIM_CANDIDATE_ALERT_V1",
      version: 1,
      candidate_stage: "observe_and_claim",
      request_id: "buyvoid_candidate_001",
      plan_fingerprint_sha256: shaB,
      readiness_report_sha256: shaC,
      required_orchestrator_confirmation: "buyVoidRunBoundedOrchestrator",
      required_delegated_confirmation: "buyVoidObserveAndClaim",
      required_stage_confirmation: "buyVoidObserveAndClaimStage",
      required_canary_confirmation: "buyVoidArmExactObserveAndClaimCanary",
      alert_fingerprint_sha256: shaA,
      operator_action: "review_exact_one_candidate_for_separate_arming_lane",
      activation_performed: false,
      authority: {
        network_state_write: false,
        operator_local_state_write: true,
        runtime_import_mounted: false,
        apply_requested: false,
        inventory_reservation: false,
        execution_attempt_reservation: false,
        wallet_access: false,
        signing: false,
        transaction_broadcast: false,
        rpc_mutation: false,
        money_movement: false,
        background_loop: false,
        startup_execution: false,
      },
    },
  };
}

function watch(
  status: CandidateWatchResultV1["watch_status"],
): CandidateWatchResultV1 {
  const source = alertSource();
  return {
    schema: "void_buy_void_observe_and_claim_candidate_watch_result_v1",
    marker: "VOID_BUY_VOID_OBSERVE_AND_CLAIM_CANDIDATE_WATCH_V1",
    version: 1,
    readiness_report_sha256: shaC,
    readiness_status: status === "none" ? "none" : "exact_one",
    eligible_candidate_count: status === "none" ? 0 : 1,
    recommended_request_id:
      status === "none" ? null : source.alert.request_id,
    watch_status: status,
    watch_reason: status === "held" ? "multiple_candidates" : "fixture",
    alert_required: status === "alert",
    alert_created: status === "alert",
    alert_path: status === "none" ? null : source.path,
    alert: status === "none" || status === "held" ? null : source.alert,
    state_path: "/operator/current-state.json",
    activation_performed: false,
    network_state_write: false,
    operator_local_state_write: status !== "held",
    runtime_import_mounted: false,
    apply_requested: false,
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
}

const none = evaluateCandidateWatchNotificationBridgeV1({
  watch_result: watch("none"),
  watch_result_sha256: shaB,
  watch_state_sha256: shaC,
  alert_sources: [],
  systemd: systemd(),
  existing_notification_receipt_count: 0,
  observed_at: "2026-07-25T15:00:00.000Z",
});
assert.equal(none.ok, true);
assert.equal(none.status, "healthy");
assert.equal(none.notifications.length, 0);
assert.equal(none.health.healthy, true);

const first = evaluateCandidateWatchNotificationBridgeV1({
  watch_result: watch("alert"),
  watch_result_sha256: shaB,
  watch_state_sha256: shaC,
  alert_sources: [alertSource()],
  systemd: systemd(),
  existing_notification_receipt_count: 0,
  observed_at: "2026-07-25T15:01:00.000Z",
});
assert.equal(first.ok, true);
assert.equal(first.status, "healthy");
assert.equal(first.notifications.length, 1);
assert.equal(first.health.new_notification_count, 1);
assert.equal(
  first.notifications[0].required_canary_confirmation,
  "buyVoidArmExactObserveAndClaimCanary",
);
assert.equal(first.notifications[0].authority.activation_performed, false);

const duplicate = evaluateCandidateWatchNotificationBridgeV1({
  watch_result: watch("duplicate"),
  watch_result_sha256: shaB,
  watch_state_sha256: shaC,
  alert_sources: [alertSource()],
  previous_state: first.next_state,
  systemd: systemd(),
  existing_notification_receipt_count: 1,
  observed_at: "2026-07-25T15:02:00.000Z",
});
assert.equal(duplicate.notifications.length, 0);
assert.equal(duplicate.health.notification_receipt_count, 1);

const transient = evaluateCandidateWatchNotificationBridgeV1({
  watch_result: watch("none"),
  watch_result_sha256: shaB,
  alert_sources: [],
  systemd: systemd("running", "infinity"),
  existing_notification_receipt_count: 0,
});
assert.equal(transient.health.healthy, true);

const elapsed = evaluateCandidateWatchNotificationBridgeV1({
  watch_result: watch("none"),
  watch_result_sha256: shaB,
  alert_sources: [],
  systemd: systemd("elapsed", "infinity"),
  existing_notification_receipt_count: 0,
});
assert.equal(elapsed.status, "degraded");
assert.equal(elapsed.health.healthy, false);
assert.ok(elapsed.health.health_reasons.includes("watch_timer_sub_state"));

const held = evaluateCandidateWatchNotificationBridgeV1({
  watch_result: watch("held"),
  watch_result_sha256: shaB,
  alert_sources: [],
  systemd: systemd(),
  existing_notification_receipt_count: 0,
});
assert.equal(held.status, "degraded");
assert.equal(held.notifications.length, 0);

const invalidWatch = watch("none");
invalidWatch.signing = true as never;
const invalid = evaluateCandidateWatchNotificationBridgeV1({
  watch_result: invalidWatch,
  watch_result_sha256: shaB,
  alert_sources: [],
  systemd: systemd(),
  existing_notification_receipt_count: 0,
});
assert.equal(invalid.ok, false);
assert.equal(invalid.status, "held");
assert.equal(invalid.notifications.length, 0);

assert.match(first.notifications[0].notification_id_sha256, /^[0-9a-f]{64}$/);
assert.equal(
  sha256Canonical({ value: 1, nested: { b: 2, a: 1 } }),
  sha256Canonical({ nested: { a: 1, b: 2 }, value: 1 }),
);

console.log("VOID_BUY_VOID_OBSERVE_AND_CLAIM_CANDIDATE_WATCH_NOTIFICATION_BRIDGE_V1_GREEN");
console.log("none_health=1");
console.log("new_alert_notification=1");
console.log("duplicate_notification_suppressed=1");
console.log("timer_running_transient_healthy=1");
console.log("timer_elapsed_degraded=1");
console.log("watch_held_degraded=1");
console.log("unsafe_authority_held=1");
console.log("network_state_write=0");
console.log("activation_performed=0");
console.log("wallet_access=0");
console.log("signing=0");
console.log("transaction_broadcast=0");
console.log("rpc_mutation=0");
console.log("money_movement=0");
