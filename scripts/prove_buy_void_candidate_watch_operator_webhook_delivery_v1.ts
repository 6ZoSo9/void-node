import assert from "node:assert/strict";
import {
  buildOperatorWebhookDeliveryHealthV1,
  defaultOperatorWebhookDeliveryStateV1,
  planOperatorWebhookDeliveryV1,
  recordOperatorWebhookDeliveryOutcomeV1,
  type CandidateNotificationSourceV1,
  type OperatorWebhookDeliveryConfigV1,
} from "../src/economic/buy_void_candidate_watch_operator_webhook_delivery_v1.js";

const sha = (value: string): string =>
  value.repeat(64).slice(0, 64);

const safeAuthority = {
  operator_notification: true,
  operator_local_state_write: true,
  network_state_write: false,
  runtime_import_mounted: false,
  apply_requested: false,
  activation_performed: false,
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

const notification = (
  id: string,
  createdAt = "2026-07-25T00:00:00.000Z",
): CandidateNotificationSourceV1 => ({
  path: `/tmp/${id}.json`,
  sha256: sha("a"),
  notification: {
    schema:
      "void_buy_void_observe_and_claim_candidate_notification_v1",
    marker:
      "VOID_BUY_VOID_OBSERVE_AND_CLAIM_CANDIDATE_NOTIFICATION_V1",
    version: 1,
    candidate_stage: "observe_and_claim",
    notification_id_sha256: id,
    alert_fingerprint_sha256: sha("b"),
    request_id: "buyvoid_test_1",
    plan_fingerprint_sha256: sha("c"),
    readiness_report_sha256: sha("d"),
    required_orchestrator_confirmation: "orchestrator",
    required_delegated_confirmation: "delegated",
    required_stage_confirmation: "stage",
    required_canary_confirmation:
      "buyVoidArmExactObserveAndClaimCanary",
    operator_action:
      "review_exact_one_candidate_for_separate_arming_lane",
    source_alert_path: "/tmp/alert.json",
    source_alert_sha256: sha("e"),
    created_at: createdAt,
    authority: safeAuthority,
  },
});

const config: OperatorWebhookDeliveryConfigV1 = {
  schema:
    "void_buy_void_candidate_operator_webhook_delivery_config_v1",
  marker:
    "VOID_BUY_VOID_CANDIDATE_OPERATOR_WEBHOOK_DELIVERY_CONFIG_V1",
  version: 1,
  enabled: true,
  endpoint_url: "https://operator.example.invalid/void/candidate",
  allowed_host: "operator.example.invalid",
  bearer_token_file: null,
  request_timeout_ms: 15000,
  maximum_payload_bytes: 16384,
};

const first = notification(sha("1"));
const second = notification(
  sha("2"),
  "2026-07-25T00:00:01.000Z",
);

const dry = planOperatorWebhookDeliveryV1({
  config,
  notifications: [second, first],
  previous_state: defaultOperatorWebhookDeliveryStateV1(),
  mode: "dry_run",
  observed_at: "2026-07-25T00:00:02.000Z",
});
assert.equal(dry.ok, true);
assert.equal(dry.status, "dry_run");
assert.equal(
  dry.selected_notification?.notification.notification_id_sha256,
  first.notification.notification_id_sha256,
);
assert.equal(dry.pending_notification_count, 2);
assert.equal(dry.payload?.authority.wallet_access, false);
assert.equal(dry.payload?.authority.signing, false);
assert.equal(dry.payload?.authority.transaction_broadcast, false);
assert.equal(dry.payload?.authority.money_movement, false);
assert.equal(dry.payload?.authority.automatic_retry, false);

const missingConfirmation = planOperatorWebhookDeliveryV1({
  config,
  notifications: [first],
  previous_state: defaultOperatorWebhookDeliveryStateV1(),
  mode: "apply",
  exact_confirmation: null,
  observed_at: "2026-07-25T00:00:02.000Z",
});
assert.equal(missingConfirmation.ok, false);
assert.equal(
  missingConfirmation.failures.includes("exact_apply_confirmation"),
  true,
);

const ready = planOperatorWebhookDeliveryV1({
  config,
  notifications: [first, second],
  previous_state: defaultOperatorWebhookDeliveryStateV1(),
  mode: "apply",
  exact_confirmation:
    "sendBuyVoidCandidateOperatorNotification",
  observed_at: "2026-07-25T00:00:02.000Z",
});
assert.equal(ready.ok, true);
assert.equal(ready.status, "ready");

const delivered = recordOperatorWebhookDeliveryOutcomeV1({
  plan: ready,
  previous_state: defaultOperatorWebhookDeliveryStateV1(),
  transport: {
    outcome: "delivered",
    http_status: 204,
    response_body_sha256: null,
    response_body_bytes: 0,
    request_bytes_submitted: true,
    failure_class: null,
  },
  attempted_at: "2026-07-25T00:00:03.000Z",
});
assert.equal(delivered.receipt.outcome, "delivered");
assert.equal(delivered.receipt.automatic_retry, false);
assert.equal(delivered.next_state.attempts.length, 1);

const next = planOperatorWebhookDeliveryV1({
  config,
  notifications: [first, second],
  previous_state: delivered.next_state,
  mode: "dry_run",
  observed_at: "2026-07-25T00:00:04.000Z",
});
assert.equal(
  next.selected_notification?.notification.notification_id_sha256,
  second.notification.notification_id_sha256,
);
assert.equal(next.pending_notification_count, 1);

const possibleReady = planOperatorWebhookDeliveryV1({
  config,
  notifications: [second],
  previous_state: defaultOperatorWebhookDeliveryStateV1(),
  mode: "apply",
  exact_confirmation:
    "sendBuyVoidCandidateOperatorNotification",
  observed_at: "2026-07-25T00:00:04.000Z",
});
const possible = recordOperatorWebhookDeliveryOutcomeV1({
  plan: possibleReady,
  previous_state: defaultOperatorWebhookDeliveryStateV1(),
  transport: {
    outcome: "possible_delivery",
    http_status: null,
    response_body_sha256: null,
    response_body_bytes: 0,
    request_bytes_submitted: true,
    failure_class: "ECONNRESET",
  },
  attempted_at: "2026-07-25T00:00:05.000Z",
});
const noRetry = planOperatorWebhookDeliveryV1({
  config,
  notifications: [second],
  previous_state: possible.next_state,
  mode: "dry_run",
  observed_at: "2026-07-25T00:00:06.000Z",
});
assert.equal(noRetry.status, "idle");
assert.equal(noRetry.pending_notification_count, 0);

const insecureConfig = planOperatorWebhookDeliveryV1({
  config: {
    ...config,
    endpoint_url: "http://operator.example.invalid/void",
  },
  notifications: [first],
  previous_state: defaultOperatorWebhookDeliveryStateV1(),
  mode: "dry_run",
  observed_at: "2026-07-25T00:00:02.000Z",
});
assert.equal(insecureConfig.ok, false);
assert.equal(
  insecureConfig.failures.includes("config_endpoint_https"),
  true,
);

const unsafeNotification = notification(sha("3"));
unsafeNotification.notification.authority.wallet_access = true;
const unsafe = planOperatorWebhookDeliveryV1({
  config,
  notifications: [unsafeNotification],
  previous_state: defaultOperatorWebhookDeliveryStateV1(),
  mode: "dry_run",
  observed_at: "2026-07-25T00:00:02.000Z",
});
assert.equal(unsafe.ok, false);
assert.equal(
  unsafe.failures.some((value) =>
    value.includes("notification_authority_wallet_access"),
  ),
  true,
);

const health = buildOperatorWebhookDeliveryHealthV1({
  config,
  notifications: [first, second],
  state: delivered.next_state,
  plan: next,
  last_outcome: "delivered",
  observed_at: "2026-07-25T00:00:07.000Z",
});
assert.equal(health.healthy, true);
assert.equal(health.pending_notification_count, 1);
assert.equal(health.automatic_retry, false);
assert.match(health.health_receipt_sha256, /^[0-9a-f]{64}$/);

console.log(
  "VOID_BUY_VOID_CANDIDATE_WATCH_OPERATOR_WEBHOOK_DELIVERY_V1_GREEN",
);
console.log("dry_run_default=1");
console.log("exact_apply_confirmation=1");
console.log("https_allowlisted_endpoint=1");
console.log("one_notification_per_run=1");
console.log("append_once_delivery_receipt=1");
console.log("possible_delivery_no_automatic_retry=1");
console.log("unsafe_authority_held=1");
console.log("runtime_import_mounted=0");
console.log("activation_performed=0");
console.log("wallet_access=0");
console.log("signing=0");
console.log("transaction_broadcast=0");
console.log("rpc_mutation=0");
console.log("money_movement=0");
