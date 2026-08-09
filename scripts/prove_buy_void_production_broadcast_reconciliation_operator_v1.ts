import assert from "node:assert/strict";
import fs from "node:fs";

import {
  VOID_BUY_VOID_PRODUCTION_BROADCAST_RECONCILIATION_OPERATOR_AUTHORITY_V1,
  VOID_BUY_VOID_PRODUCTION_BROADCAST_RECONCILIATION_OPERATOR_V1,
  buyVoidProductionBroadcastReconciliationCommandEndpointV1,
  buyVoidProductionBroadcastReconciliationStatusEndpointV1,
  parseBuyVoidProductionBroadcastReconciliationOperatorArgsV1,
  planBuyVoidProductionBroadcastReconciliationV1,
  runBuyVoidProductionBroadcastReconciliationV1,
} from "./buy_void_production_broadcast_reconciliation_operator_v1.js";

const PARENT_MARKER = "VOID_BUY_VOID_RUNTIME_INTEGRATION_V1";
const CHILD_MARKER = "VOID_BUY_VOID_SAGA_BROADCAST_RECONCILIATION_RUNTIME_V1";
const ACTION = "run_saga_broadcast_reconciliation";
const RUNTIME_CONFIRMATION = "buyVoidRunSagaBroadcastReconciliationRuntimeV1";
const COORDINATOR_CONFIRMATION = "buyVoidAdvanceSagaBroadcastReconciliationV1";
const STATUS_PATH = "/__void/operator/buy-void-runtime-v1/status";
const COMMAND_PATH = "/__void/operator/buy-void-runtime-v1/command";
const SAGA_ID = `voidbvfsg1_${"1".repeat(64)}`;
const ATTEMPT_ID = "2".repeat(64);
const POLICY_FP = "3".repeat(64);
const SOCKET_FP = "4".repeat(64);
const SAGA_CONFIRMATION = "advanceSagaV1";
const ACTION_CONFIRMATION = "reconcilePossibleBroadcastV1";

function authority(): Record<string, unknown> {
  return {
    operator_loopback_only: true,
    disabled_by_default: true,
    apply_disabled_by_default: true,
    server_controlled_root_dir: true,
    saga_id_only_selector: true,
    server_controlled_broadcaster_socket: true,
    broadcaster_socket_path_not_exposed: true,
    stable_policy_fingerprint_echo_required: true,
    exact_runtime_confirmation_required: true,
    exact_coordinator_confirmation_required: true,
    exact_saga_confirmation_required: true,
    exact_saga_action_confirmation_required: true,
    dry_run_available_without_broadcaster_socket: true,
    reconcile_possible_broadcast_only_when_applied: true,
    execute_prepared_transaction_mounted: false,
    submit_once_runtime_adapter: false,
    inspect_submission_runtime_adapter: true,
    external_inspection_possible_when_applied: true,
    automatic_resubmission: false,
    raw_signed_transaction_input: false,
    raw_signed_transaction_persistence: false,
    raw_signed_transaction_output: false,
    custody_handle_input: false,
    custody_handle_output: false,
    application_wallet_access: false,
    application_signing: false,
    transaction_broadcast: false,
    inventory_decrement: false,
    public_fulfilled_closeout: false,
    background_loop: false,
    startup_execution: false,
    money_movement: false,
  };
}

function statusFixture(input: {
  applyEnabled?: boolean;
  socketConfigured?: boolean;
  childEnabled?: boolean;
  socketFingerprint?: string | null;
} = {}): Record<string, unknown> {
  const applyEnabled = input.applyEnabled === true;
  const socketConfigured = input.socketConfigured === true;
  const socketFingerprint = input.socketFingerprint === undefined
    ? (socketConfigured ? SOCKET_FP : null)
    : input.socketFingerprint;
  return {
    marker: PARENT_MARKER,
    version: 1,
    ok: true,
    enabled: true,
    routes: { status: STATUS_PATH, command: COMMAND_PATH },
    supported_actions: [ACTION],
    saga_broadcast_reconciliation_runtime: {
      marker: CHILD_MARKER,
      version: 1,
      action: ACTION,
      enabled: input.childEnabled !== false,
      apply_enabled: applyEnabled,
      broadcaster_socket_configured: socketConfigured,
      broadcaster_socket_fingerprint_sha256: socketFingerprint,
      required_runtime_confirmation: RUNTIME_CONFIRMATION,
      supported_apply_action: "reconcile_possible_broadcast",
      execute_prepared_transaction_mounted: false,
      authority: authority(),
    },
  };
}

function dryFixture(input: {
  nextAction?: "execute_prepared_transaction" | "reconcile_possible_broadcast";
  policyFingerprint?: string;
  attemptId?: string;
} = {}): Record<string, unknown> {
  const nextAction = input.nextAction || "reconcile_possible_broadcast";
  const policyFp = input.policyFingerprint || POLICY_FP;
  const attemptId = input.attemptId || ATTEMPT_ID;
  return {
    marker: CHILD_MARKER,
    version: 1,
    ok: true,
    status: "dry_run",
    applied: false,
    saga_id: SAGA_ID,
    next_action: nextAction,
    required_runtime_confirmation: RUNTIME_CONFIRMATION,
    required_coordinator_confirmation: COORDINATOR_CONFIRMATION,
    required_policy_fingerprint_sha256: policyFp,
    required_saga_confirmation: SAGA_CONFIRMATION,
    required_saga_action_confirmation: ACTION_CONFIRMATION,
    execute_prepared_transaction_mounted: false,
    reconcile_possible_broadcast_apply_supported:
      nextAction === "reconcile_possible_broadcast",
    broadcaster_socket_required_for_dry_run: false,
    transaction_broadcast_performed: false,
    money_movement_performed: false,
    decision: {
      ok: true,
      status: "dry_run",
      applied: false,
      mutation_performed: false,
      saga_id: SAGA_ID,
      attempt_id: attemptId,
      next_action: nextAction,
      required_confirmation: COORDINATOR_CONFIRMATION,
      required_policy_fingerprint_sha256: policyFp,
      required_saga_confirmation: SAGA_CONFIRMATION,
      required_saga_action_confirmation: ACTION_CONFIRMATION,
      required_broadcast_confirmation: null,
      broadcaster_called: false,
      submission_call_performed: false,
      transaction_broadcast_performed: false,
      reconciliation_required: true,
      automatic_retry_allowed: false,
      signed_payload_bytes_persisted: false,
      signed_payload_bytes_returned: false,
      money_movement_performed: false,
    },
    authority: authority(),
  };
}

function appliedFixture(input: {
  outcome?: "not_submitted" | "unknown" | "accepted" | "confirmed" | "reverted";
  mutation?: boolean;
  reconciliationRequired?: boolean;
  submissionCall?: boolean;
  broadcast?: boolean;
  money?: boolean;
} = {}): Record<string, unknown> {
  const outcome = input.outcome || "unknown";
  return {
    marker: CHILD_MARKER,
    version: 1,
    ok: true,
    applied: true,
    saga_id: SAGA_ID,
    execute_prepared_transaction_mounted: false,
    submit_once_runtime_adapter: false,
    inspect_submission_runtime_adapter: true,
    transaction_broadcast_performed: false,
    money_movement_performed: false,
    decision: {
      ok: true,
      status: outcome,
      applied: true,
      mutation_performed: input.mutation !== false,
      saga_id: SAGA_ID,
      attempt_id: ATTEMPT_ID,
      action: "reconcile_possible_broadcast",
      broadcaster_called: true,
      submission_call_performed: input.submissionCall === true,
      transaction_broadcast_performed: input.broadcast === true,
      reconciliation_required:
        input.reconciliationRequired === undefined
          ? outcome === "unknown" || outcome === "accepted"
          : input.reconciliationRequired,
      automatic_retry_allowed: false,
      signed_payload_bytes_persisted: false,
      signed_payload_bytes_returned: false,
      money_movement_performed: input.money === true,
    },
    authority: authority(),
  };
}

assert.equal(
  buyVoidProductionBroadcastReconciliationStatusEndpointV1({}),
  `http://127.0.0.1:4100${STATUS_PATH}`,
);
assert.equal(
  buyVoidProductionBroadcastReconciliationCommandEndpointV1({}),
  `http://127.0.0.1:4100${COMMAND_PATH}`,
);
assert.throws(
  () => buyVoidProductionBroadcastReconciliationStatusEndpointV1({
    VOID_BUY_VOID_PRODUCTION_BROADCAST_RECONCILIATION_OPERATOR_PORT: "0",
  }),
  /invalid_operator_port/,
);

const parsed = parseBuyVoidProductionBroadcastReconciliationOperatorArgsV1([
  "--saga-id", SAGA_ID,
]);
assert.equal(parsed.saga_id, SAGA_ID);
assert.equal(parsed.apply, false);
assert.throws(
  () => parseBuyVoidProductionBroadcastReconciliationOperatorArgsV1([
    "--saga-id", SAGA_ID,
    "--confirm", RUNTIME_CONFIRMATION,
  ]),
  /apply_confirmation_without_apply/,
);
assert.throws(
  () => parseBuyVoidProductionBroadcastReconciliationOperatorArgsV1([
    "--saga-id", SAGA_ID,
    "--root-dir", "/tmp/private",
  ]),
  /unexpected_option/,
);

let statusCalls = 0;
const dryBodies: Record<string, unknown>[] = [];
const plan = await planBuyVoidProductionBroadcastReconciliationV1({
  saga_id: SAGA_ID,
  http_get: async () => {
    statusCalls += 1;
    return { status: 200, json: statusFixture() };
  },
  http_post: async ({ body }) => {
    dryBodies.push({ ...body });
    return { status: 200, json: dryFixture() };
  },
});
assert.equal(plan.ok, true);
assert.equal(plan.status, "planned");
assert.equal(statusCalls, 1);
assert.deepEqual(Object.keys(dryBodies[0]).sort(), ["action", "apply", "saga_id"]);
assert.deepEqual(dryBodies[0], { action: ACTION, saga_id: SAGA_ID, apply: false });
assert.equal(plan.attempt_id, ATTEMPT_ID);
assert.equal(plan.next_action, "reconcile_possible_broadcast");
assert.equal(plan.required_runtime_confirmation, RUNTIME_CONFIRMATION);
assert.equal(plan.required_coordinator_confirmation, COORDINATOR_CONFIRMATION);
assert.equal(plan.required_policy_fingerprint_sha256, POLICY_FP);
assert.equal(plan.reconcile_possible_broadcast_apply_supported, true);
assert.equal(plan.transaction_broadcast_performed, false);
assert.equal(plan.money_movement_performed, false);
assert.match(plan.plan_fingerprint_sha256, /^[0-9a-f]{64}$/);

const planAgain = await planBuyVoidProductionBroadcastReconciliationV1({
  saga_id: SAGA_ID,
  http_get: async () => ({ status: 200, json: statusFixture() }),
  http_post: async () => ({ status: 200, json: dryFixture() }),
});
assert.equal(planAgain.plan_fingerprint_sha256, plan.plan_fingerprint_sha256);

const childDisabled = await planBuyVoidProductionBroadcastReconciliationV1({
  saga_id: SAGA_ID,
  http_get: async () => ({ status: 200, json: statusFixture({ childEnabled: false }) }),
  http_post: async () => {
    throw new Error("must not post");
  },
});
assert.equal(childDisabled.ok, false);
assert.equal(childDisabled.reason, "operator_runtime_status_boundary_invalid");

const notApplyAction = await planBuyVoidProductionBroadcastReconciliationV1({
  saga_id: SAGA_ID,
  http_get: async () => ({ status: 200, json: statusFixture() }),
  http_post: async () => ({
    status: 200,
    json: dryFixture({ nextAction: "execute_prepared_transaction" }),
  }),
});
assert.equal(notApplyAction.ok, true);
assert.equal(notApplyAction.reconcile_possible_broadcast_apply_supported, false);

let wrongPlanPosts = 0;
const wrongPlan = await runBuyVoidProductionBroadcastReconciliationV1({
  args: {
    saga_id: SAGA_ID,
    apply: true,
    expected_plan_fingerprint_sha256: "f".repeat(64),
    confirmation: RUNTIME_CONFIRMATION,
    coordinator_confirmation: COORDINATOR_CONFIRMATION,
    policy_fingerprint_sha256: POLICY_FP,
    saga_confirmation: SAGA_CONFIRMATION,
    saga_action_confirmation: ACTION_CONFIRMATION,
  },
  http_get: async () => ({ status: 200, json: statusFixture({
    applyEnabled: true,
    socketConfigured: true,
  }) }),
  http_post: async () => {
    wrongPlanPosts += 1;
    return { status: 200, json: dryFixture() };
  },
});
assert.equal(wrongPlan.ok, false);
assert.equal(wrongPlan.reason, "exact_plan_fingerprint_required");
assert.equal(wrongPlanPosts, 1);

let notReadyStatusCalls = 0;
const notReady = await runBuyVoidProductionBroadcastReconciliationV1({
  args: {
    saga_id: SAGA_ID,
    apply: true,
    expected_plan_fingerprint_sha256: plan.plan_fingerprint_sha256,
    confirmation: RUNTIME_CONFIRMATION,
    coordinator_confirmation: COORDINATOR_CONFIRMATION,
    policy_fingerprint_sha256: POLICY_FP,
    saga_confirmation: SAGA_CONFIRMATION,
    saga_action_confirmation: ACTION_CONFIRMATION,
  },
  http_get: async () => {
    notReadyStatusCalls += 1;
    return {
      status: 200,
      json: statusFixture({
        applyEnabled: false,
        socketConfigured: false,
      }),
    };
  },
  http_post: async () => ({ status: 200, json: dryFixture() }),
});
assert.equal(notReady.ok, false);
assert.equal(notReady.reason, "operator_runtime_not_apply_ready");
assert.equal(notReadyStatusCalls, 2);

let driftDry = 0;
const drift = await runBuyVoidProductionBroadcastReconciliationV1({
  args: {
    saga_id: SAGA_ID,
    apply: true,
    expected_plan_fingerprint_sha256: plan.plan_fingerprint_sha256,
    confirmation: RUNTIME_CONFIRMATION,
    coordinator_confirmation: COORDINATOR_CONFIRMATION,
    policy_fingerprint_sha256: POLICY_FP,
    saga_confirmation: SAGA_CONFIRMATION,
    saga_action_confirmation: ACTION_CONFIRMATION,
  },
  http_get: async () => ({
    status: 200,
    json: statusFixture({ applyEnabled: true, socketConfigured: true }),
  }),
  http_post: async () => {
    driftDry += 1;
    return {
      status: 200,
      json: driftDry === 1
        ? dryFixture()
        : dryFixture({ policyFingerprint: "5".repeat(64) }),
    };
  },
});
assert.equal(drift.ok, false);
assert.equal(drift.reason, "operator_reconciliation_plan_changed");
assert.equal(driftDry, 2);

const applyBodies: Record<string, unknown>[] = [];
let postCount = 0;
const applied = await runBuyVoidProductionBroadcastReconciliationV1({
  args: {
    saga_id: SAGA_ID,
    apply: true,
    expected_plan_fingerprint_sha256: plan.plan_fingerprint_sha256,
    confirmation: RUNTIME_CONFIRMATION,
    coordinator_confirmation: COORDINATOR_CONFIRMATION,
    policy_fingerprint_sha256: POLICY_FP,
    saga_confirmation: SAGA_CONFIRMATION,
    saga_action_confirmation: ACTION_CONFIRMATION,
  },
  http_get: async () => ({
    status: 200,
    json: statusFixture({ applyEnabled: true, socketConfigured: true }),
  }),
  http_post: async ({ body }) => {
    postCount += 1;
    applyBodies.push({ ...body });
    if (postCount <= 2) return { status: 200, json: dryFixture() };
    return { status: 200, json: appliedFixture({ outcome: "unknown" }) };
  },
});
assert.equal(applied.ok, true);
assert.equal(applied.status, "reconciled");
assert.equal(applied.reconciliation_outcome, "unknown");
assert.equal(applied.reconciliation_required, true);
assert.equal(applied.automatic_retry_allowed, false);
assert.equal(applied.transaction_broadcast_performed, false);
assert.equal(applied.money_movement_performed, false);
assert.equal(postCount, 3);
const applyBody = applyBodies[2];
assert.deepEqual(Object.keys(applyBody).sort(), [
  "action",
  "apply",
  "confirmation",
  "coordinator_confirmation",
  "policy_fingerprint_sha256",
  "saga_action_confirmation",
  "saga_confirmation",
  "saga_id",
]);
assert.deepEqual(applyBody, {
  action: ACTION,
  saga_id: SAGA_ID,
  apply: true,
  confirmation: RUNTIME_CONFIRMATION,
  coordinator_confirmation: COORDINATOR_CONFIRMATION,
  policy_fingerprint_sha256: POLICY_FP,
  saga_confirmation: SAGA_CONFIRMATION,
  saga_action_confirmation: ACTION_CONFIRMATION,
});

let unknownPostCount = 0;
const transportUnknown = await runBuyVoidProductionBroadcastReconciliationV1({
  args: {
    saga_id: SAGA_ID,
    apply: true,
    expected_plan_fingerprint_sha256: plan.plan_fingerprint_sha256,
    confirmation: RUNTIME_CONFIRMATION,
    coordinator_confirmation: COORDINATOR_CONFIRMATION,
    policy_fingerprint_sha256: POLICY_FP,
    saga_confirmation: SAGA_CONFIRMATION,
    saga_action_confirmation: ACTION_CONFIRMATION,
  },
  http_get: async () => ({
    status: 200,
    json: statusFixture({ applyEnabled: true, socketConfigured: true }),
  }),
  http_post: async () => {
    unknownPostCount += 1;
    if (unknownPostCount <= 2) return { status: 200, json: dryFixture() };
    throw Object.assign(new Error("synthetic response lost"), { name: "AbortError" });
  },
});
assert.equal(transportUnknown.ok, false);
assert.equal(transportUnknown.status, "reconciliation_unknown");
assert.equal(transportUnknown.side_effect_state_known, false);
assert.equal(transportUnknown.reconciliation_required, true);
assert.equal(transportUnknown.automatic_retry_allowed, false);

let boundaryPostCount = 0;
const boundaryViolation = await runBuyVoidProductionBroadcastReconciliationV1({
  args: {
    saga_id: SAGA_ID,
    apply: true,
    expected_plan_fingerprint_sha256: plan.plan_fingerprint_sha256,
    confirmation: RUNTIME_CONFIRMATION,
    coordinator_confirmation: COORDINATOR_CONFIRMATION,
    policy_fingerprint_sha256: POLICY_FP,
    saga_confirmation: SAGA_CONFIRMATION,
    saga_action_confirmation: ACTION_CONFIRMATION,
  },
  http_get: async () => ({
    status: 200,
    json: statusFixture({ applyEnabled: true, socketConfigured: true }),
  }),
  http_post: async () => {
    boundaryPostCount += 1;
    if (boundaryPostCount <= 2) return { status: 200, json: dryFixture() };
    return {
      status: 500,
      json: appliedFixture({ submissionCall: true, broadcast: true, money: true }),
    };
  },
});
assert.equal(boundaryViolation.ok, false);
assert.equal(boundaryViolation.reason, "operator_reconciliation_authority_boundary_violation");
assert.equal(boundaryViolation.side_effect_state_known, false);
assert.equal(boundaryViolation.reconciliation_required, true);

assert.equal(
  VOID_BUY_VOID_PRODUCTION_BROADCAST_RECONCILIATION_OPERATOR_AUTHORITY_V1.submit_once_runtime_adapter,
  false,
);
assert.equal(
  VOID_BUY_VOID_PRODUCTION_BROADCAST_RECONCILIATION_OPERATOR_AUTHORITY_V1.inspect_submission_runtime_adapter,
  true,
);
assert.equal(
  VOID_BUY_VOID_PRODUCTION_BROADCAST_RECONCILIATION_OPERATOR_AUTHORITY_V1.automatic_retry,
  false,
);
assert.equal(
  VOID_BUY_VOID_PRODUCTION_BROADCAST_RECONCILIATION_OPERATOR_AUTHORITY_V1.terminal_closeout_authority,
  false,
);

const source = fs.readFileSync(
  new URL("./buy_void_production_broadcast_reconciliation_operator_v1.ts", import.meta.url),
  "utf8",
);
assert.doesNotMatch(source, /raw_signed_transaction\s*:/);
assert.doesNotMatch(source, /private_key\s*:/);
assert.doesNotMatch(source, /mnemonic\s*:/);
assert.doesNotMatch(source, /submit_once\s*\(/);
for (const forbiddenFlag of [
  "--root-dir",
  "--socket-path",
  "--wallet",
  "--signer",
  "--rpc-url",
  "--raw-transaction",
  "--terminal-closeout",
]) {
  assert.equal(source.includes(forbiddenFlag), false, forbiddenFlag);
}
assert.match(source, /127\.0\.0\.1/);
assert.match(source, /operator_reconciliation_apply_transport_unknown/);
assert.match(source, /operator_reconciliation_plan_changed/);

process.stdout.write(`${JSON.stringify({
  marker: "VOID_BUY_VOID_PRODUCTION_BROADCAST_RECONCILIATION_OPERATOR_V1_PROOF_GREEN",
  runtime_route_reused: true,
  exact_loopback_http_only: true,
  saga_id_only_selector: true,
  status_precheck_before_command: true,
  replan_before_apply: true,
  deterministic_plan_fingerprint: true,
  exact_confirmation_echoes_required: true,
  exact_apply_command_key_count: 8,
  submit_once_runtime_adapter: false,
  inspect_submission_runtime_adapter: true,
  transport_unknown_reconciliation_required: true,
  automatic_retry: false,
  terminal_closeout_authority: false,
  transaction_broadcast: false,
  money_movement: false,
}, null, 2)}\n`);
