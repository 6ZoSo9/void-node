import assert from "node:assert/strict";

import {
  VOID_BUY_VOID_PRODUCTION_TERMINAL_CLOSEOUT_OPERATOR_AUTHORITY_V1,
  VOID_BUY_VOID_PRODUCTION_TERMINAL_CLOSEOUT_OPERATOR_V1,
  buyVoidProductionTerminalCloseoutCommandEndpointV1,
  buyVoidProductionTerminalCloseoutStatusEndpointV1,
  parseBuyVoidProductionTerminalCloseoutOperatorArgsV1,
  planBuyVoidProductionTerminalCloseoutV1,
  runBuyVoidProductionTerminalCloseoutV1,
} from "./buy_void_production_terminal_closeout_operator_v1.js";

const PARENT_MARKER = "VOID_BUY_VOID_RUNTIME_INTEGRATION_V1";
const CHILD_MARKER = "VOID_BUY_VOID_SAGA_TERMINAL_CLOSEOUT_RUNTIME_V1";
const TERMINAL_MARKER = "VOID_BUY_VOID_SAGA_TERMINAL_CLOSEOUT_V1";
const ACTION = "run_saga_terminal_closeout";
const RUNTIME_CONFIRMATION = "buyVoidRunSagaTerminalCloseoutRuntimeV1";
const TERMINAL_CONFIRMATION = "buyVoidAdvanceSagaTerminalCloseoutV1";
const STATUS_PATH = "/__void/operator/buy-void-runtime-v1/status";
const COMMAND_PATH = "/__void/operator/buy-void-runtime-v1/command";
const SAGA_ID = `voidbvfsg1_${"1".repeat(64)}`;
const ATTEMPT_ID = "2".repeat(64);
const CLOSEOUT_ID = "3".repeat(64);
const POLICY_FP = "a4".repeat(32);
const TERMINAL_PLAN_FP = "5".repeat(64);
const CANONICAL_ID = "6".repeat(64);
const CANONICAL_FP = "7".repeat(64);
const TX_HASH = `0x${"8".repeat(64)}`;
const SAGA_CONFIRMATION = "advanceSagaV1";
const ACTION_CONFIRMATION = "closeoutConfirmedDeliveryV1";

function runtimeAuthority(): Record<string, unknown> {
  return {
    operator_loopback_only: true,
    disabled_by_default: true,
    apply_disabled_by_default: true,
    server_controlled_root_dir: true,
    server_controlled_terminal_policy: true,
    saga_id_only_selector: true,
    exact_runtime_confirmation_required: true,
    exact_terminal_closeout_confirmation_required: true,
    exact_policy_fingerprint_echo_required: true,
    exact_terminal_plan_fingerprint_echo_required: true,
    exact_saga_confirmation_required: true,
    exact_saga_action_confirmation_required: true,
    dry_run_available_without_apply_enable: true,
    inventory_consumption_possible_when_explicitly_applied: true,
    public_fulfilled_projection_possible_when_explicitly_applied: true,
    saga_closeout_possible_when_explicitly_applied: true,
    public_request_base_record_mutation: false,
    reservation_base_record_mutation: false,
    rpc_call: false,
    credential_access: false,
    wallet_access: false,
    signing: false,
    transaction_broadcast: false,
    automatic_retry: false,
    background_loop: false,
    startup_execution: false,
    money_movement: false,
  };
}

function terminalAuthority(): Record<string, unknown> {
  return {
    source_only_contract: true,
    runtime_route_mount: false,
    background_loop: false,
    startup_execution: false,
    exact_saga_selector: true,
    exact_confirmed_state_completion_required: true,
    exact_confirmed_state_request_index_required: true,
    canonical_confirmed_state_id_binding: true,
    canonical_confirmed_state_fingerprint_binding: true,
    request_scoped_crash_recoverable_lock: true,
    deterministic_closeout_plan_persistence: true,
    exact_terminal_plan_fingerprint_required_before_mutation: true,
    terminal_plan_revalidation_inside_request_lock: true,
    shared_operator_event_writer_lock: true,
    append_only_inventory_consumption: true,
    atomic_public_operator_journal_projection: true,
    saga_closeout_committed_append: true,
    public_request_base_record_mutation: false,
    reservation_base_record_mutation: false,
    rpc_call: false,
    credential_access: false,
    wallet_access: false,
    signing: false,
    transaction_broadcast: false,
    automatic_retry: false,
    money_movement: false,
  };
}

function statusFixture(input: {
  applyEnabled?: boolean;
  childEnabled?: boolean;
  policyConfigured?: boolean;
  policyFingerprint?: string;
} = {}): Record<string, unknown> {
  const policyConfigured = input.policyConfigured !== false;
  return {
    marker: PARENT_MARKER,
    version: 1,
    ok: true,
    enabled: true,
    routes: { status: STATUS_PATH, command: COMMAND_PATH },
    supported_actions: [ACTION],
    saga_terminal_closeout_runtime: {
      marker: CHILD_MARKER,
      version: 1,
      action: ACTION,
      enabled: input.childEnabled !== false,
      apply_enabled: input.applyEnabled === true,
      terminal_policy_configured: policyConfigured,
      terminal_policy_fingerprint_sha256: policyConfigured
        ? (input.policyFingerprint || POLICY_FP)
        : null,
      terminal_policy_missing_envs: policyConfigured ? [] : ["VOID_BUY_REQUEST_DIR"],
      required_runtime_confirmation: RUNTIME_CONFIRMATION,
      required_terminal_closeout_confirmation: TERMINAL_CONFIRMATION,
      authority: runtimeAuthority(),
      terminal_closeout_authority: terminalAuthority(),
    },
  };
}

function planFixture(input: {
  policyFingerprint?: string;
  planFingerprint?: string;
  transactionHash?: string;
} = {}): Record<string, unknown> {
  const policyFp = input.policyFingerprint || POLICY_FP;
  return {
    schema: "void_buy_void_saga_terminal_closeout_plan_v1",
    marker: TERMINAL_MARKER,
    version: 1,
    closeout_id: CLOSEOUT_ID,
    plan_fingerprint_sha256: input.planFingerprint || TERMINAL_PLAN_FP,
    saga_id: SAGA_ID,
    request_id: "request-1",
    attempt_id: ATTEMPT_ID,
    reservation_id: "9".repeat(64),
    transaction_hash: input.transactionHash || TX_HASH,
    canonical_confirmed_state_id: CANONICAL_ID,
    canonical_confirmed_state_fingerprint: CANONICAL_FP,
    server_policy_fingerprint_sha256: policyFp,
    inventory_consumption: { secret_internal_object: true },
    public_closeout_event: { secret_internal_object: true },
    base_closeout_plan: { secret_internal_object: true },
    inventory_decrement_required: true,
    public_request_fulfilled_required: true,
    public_request_base_record_mutation_authorized: false,
    reservation_base_record_mutation_authorized: false,
    credential_access_authorized: false,
    wallet_access_authorized: false,
    signing_authorized: false,
    transaction_broadcast_authorized: false,
    money_movement_authorized: false,
  };
}

function dryFixture(input: {
  policyFingerprint?: string;
  planFingerprint?: string;
} = {}): Record<string, unknown> {
  const policyFp = input.policyFingerprint || POLICY_FP;
  const plan = planFixture({
    policyFingerprint: policyFp,
    planFingerprint: input.planFingerprint,
  });
  return {
    marker: CHILD_MARKER,
    version: 1,
    ok: true,
    status: "dry_run",
    applied: false,
    saga_id: SAGA_ID,
    required_runtime_confirmation: RUNTIME_CONFIRMATION,
    required_terminal_closeout_confirmation: TERMINAL_CONFIRMATION,
    required_policy_fingerprint_sha256: policyFp,
    required_terminal_plan_fingerprint_sha256:
      input.planFingerprint || TERMINAL_PLAN_FP,
    required_saga_confirmation: SAGA_CONFIRMATION,
    required_saga_action_confirmation: ACTION_CONFIRMATION,
    inventory_consumption_performed: false,
    public_request_fulfilled: false,
    saga_closeout_appended: false,
    money_movement_performed: false,
    decision: {
      ok: true,
      status: "dry_run",
      applied: false,
      mutation_performed: false,
      saga_id: SAGA_ID,
      attempt_id: ATTEMPT_ID,
      closeout_id: CLOSEOUT_ID,
      plan,
      required_confirmation: TERMINAL_CONFIRMATION,
      required_policy_fingerprint_sha256: policyFp,
      required_plan_fingerprint_sha256:
        input.planFingerprint || TERMINAL_PLAN_FP,
      required_saga_confirmation: SAGA_CONFIRMATION,
      required_saga_action_confirmation: ACTION_CONFIRMATION,
      inventory_consumption_performed: false,
      public_request_fulfilled: false,
      saga_closeout_appended: false,
      automatic_retry_allowed: false,
      money_movement_performed: false,
    },
    authority: runtimeAuthority(),
  };
}

function duplicateFixture(): Record<string, unknown> {
  return {
    marker: CHILD_MARKER,
    version: 1,
    ok: true,
    status: "duplicate",
    applied: true,
    saga_id: SAGA_ID,
    already_closed: true,
    decision: {
      ok: true,
      status: "duplicate",
      applied: true,
      mutation_performed: false,
      saga_id: SAGA_ID,
      attempt_id: ATTEMPT_ID,
      closeout_id: CLOSEOUT_ID,
      plan: planFixture(),
      saga_state: { state: "closed" },
      inventory_consumption_performed: false,
      public_request_fulfilled: true,
      saga_closeout_appended: false,
      automatic_retry_allowed: false,
      money_movement_performed: false,
    },
    inventory_consumption_performed: false,
    public_request_fulfilled: true,
    saga_closeout_appended: false,
    money_movement_performed: false,
    authority: runtimeAuthority(),
  };
}

function appliedFixture(input: {
  outcome?: "closed" | "recovered_partial" | "duplicate";
} = {}): Record<string, unknown> {
  const outcome = input.outcome || "closed";
  const duplicate = outcome === "duplicate";
  return {
    marker: CHILD_MARKER,
    version: 1,
    ok: true,
    status: outcome,
    applied: true,
    saga_id: SAGA_ID,
    decision: {
      ok: true,
      status: outcome,
      applied: true,
      mutation_performed: !duplicate,
      saga_id: SAGA_ID,
      attempt_id: ATTEMPT_ID,
      closeout_id: CLOSEOUT_ID,
      plan: planFixture(),
      saga_state: { state: "closed" },
      inventory_consumption_performed: !duplicate,
      public_request_fulfilled: true,
      saga_closeout_appended: !duplicate,
      automatic_retry_allowed: false,
      money_movement_performed: false,
    },
    mutation_performed: !duplicate,
    inventory_consumption_performed: !duplicate,
    public_request_fulfilled: true,
    saga_closeout_appended: !duplicate,
    automatic_retry_allowed: false,
    money_movement_performed: false,
    authority: runtimeAuthority(),
  };
}

function partialHeldFixture(input: {
  publicFulfilled?: boolean;
  sagaAppended?: boolean;
} = {}): Record<string, unknown> {
  const publicFulfilled = input.publicFulfilled === true;
  const sagaAppended = input.sagaAppended === true;
  return {
    marker: CHILD_MARKER,
    version: 1,
    ok: false,
    status: "held",
    applied: true,
    saga_id: SAGA_ID,
    decision: {
      ok: false,
      status: "held",
      applied: true,
      stage: sagaAppended ? "saga_append" : "public_closeout",
      reason: sagaAppended
        ? "terminal_closeout_final_saga_mismatch"
        : "synthetic_public_projection_failure",
      mutation_performed: true,
      inventory_consumption_performed: true,
      public_request_fulfilled: publicFulfilled,
      saga_closeout_appended: sagaAppended,
      automatic_retry_allowed: false,
      money_movement_performed: false,
    },
    mutation_performed: true,
    inventory_consumption_performed: true,
    public_request_fulfilled: publicFulfilled,
    saga_closeout_appended: sagaAppended,
    automatic_retry_allowed: false,
    money_movement_performed: false,
    authority: runtimeAuthority(),
  };
}

function applyArgs(planFingerprint: string): any {
  return {
    saga_id: SAGA_ID,
    apply: true,
    expected_plan_fingerprint_sha256: planFingerprint,
    confirmation: RUNTIME_CONFIRMATION,
    terminal_closeout_confirmation: TERMINAL_CONFIRMATION,
    policy_fingerprint_sha256: POLICY_FP,
    saga_confirmation: SAGA_CONFIRMATION,
    saga_action_confirmation: ACTION_CONFIRMATION,
  };
}

assert.equal(
  buyVoidProductionTerminalCloseoutStatusEndpointV1({}),
  `http://127.0.0.1:4100${STATUS_PATH}`,
);
assert.equal(
  buyVoidProductionTerminalCloseoutCommandEndpointV1({}),
  `http://127.0.0.1:4100${COMMAND_PATH}`,
);
assert.throws(
  () => buyVoidProductionTerminalCloseoutStatusEndpointV1({
    VOID_BUY_VOID_PRODUCTION_TERMINAL_CLOSEOUT_OPERATOR_PORT: "65536",
  }),
  /invalid_operator_port/,
);

const parsedArgs = parseBuyVoidProductionTerminalCloseoutOperatorArgsV1([
  "--saga-id", SAGA_ID,
]);
assert.equal(parsedArgs.saga_id, SAGA_ID);
assert.equal(parsedArgs.apply, false);
assert.throws(
  () => parseBuyVoidProductionTerminalCloseoutOperatorArgsV1([
    "--saga-id", SAGA_ID,
    "--confirm", RUNTIME_CONFIRMATION,
  ]),
  /apply_confirmation_without_apply/,
);
assert.throws(
  () => parseBuyVoidProductionTerminalCloseoutOperatorArgsV1([
    "--saga-id", SAGA_ID,
    "--root-dir", "/tmp/private",
  ]),
  /unexpected_option/,
);
assert.throws(
  () => parseBuyVoidProductionTerminalCloseoutOperatorArgsV1([
    "--saga-id", "--apply",
  ]),
  /--saga-id_value_required/,
);

let planStatusCalls = 0;
const dryBodies: Record<string, unknown>[] = [];
const plan = await planBuyVoidProductionTerminalCloseoutV1({
  saga_id: SAGA_ID,
  http_get: async () => {
    planStatusCalls += 1;
    return { status: 200, json: statusFixture() };
  },
  http_post: async ({ body }) => {
    dryBodies.push({ ...body });
    return { status: 200, json: dryFixture() };
  },
});
assert.equal(plan.ok, true);
assert.equal(plan.status, "planned");
assert.equal(planStatusCalls, 1);
assert.deepEqual(Object.keys(dryBodies[0]).sort(), ["action", "apply", "saga_id"]);
assert.deepEqual(dryBodies[0], { action: ACTION, saga_id: SAGA_ID, apply: false });
assert.equal(plan.attempt_id, ATTEMPT_ID);
assert.equal(plan.closeout_id, CLOSEOUT_ID);
assert.equal(plan.transaction_hash, TX_HASH);
assert.equal(plan.canonical_confirmed_state_id, CANONICAL_ID);
assert.equal(plan.canonical_confirmed_state_fingerprint, CANONICAL_FP);
assert.equal(plan.terminal_plan_fingerprint_sha256, TERMINAL_PLAN_FP);
assert.equal(plan.required_runtime_confirmation, RUNTIME_CONFIRMATION);
assert.equal(plan.required_terminal_closeout_confirmation, TERMINAL_CONFIRMATION);
assert.equal(plan.required_policy_fingerprint_sha256, POLICY_FP);
assert.equal(plan.transaction_broadcast_performed, false);
assert.equal(plan.money_movement_performed, false);
assert.match(plan.plan_fingerprint_sha256, /^[0-9a-f]{64}$/);

const planAgain = await planBuyVoidProductionTerminalCloseoutV1({
  saga_id: SAGA_ID,
  http_get: async () => ({ status: 200, json: statusFixture() }),
  http_post: async () => ({ status: 200, json: dryFixture() }),
});
assert.equal(planAgain.plan_fingerprint_sha256, plan.plan_fingerprint_sha256);

const duplicatePlan = await planBuyVoidProductionTerminalCloseoutV1({
  saga_id: SAGA_ID,
  http_get: async () => ({ status: 200, json: statusFixture() }),
  http_post: async () => ({ status: 200, json: duplicateFixture() }),
});
assert.equal(duplicatePlan.ok, true);
assert.equal(duplicatePlan.status, "duplicate");
assert.equal(duplicatePlan.already_closed, true);
assert.equal(duplicatePlan.public_request_fulfilled, true);
assert.equal(duplicatePlan.mutation_performed, false);

const childDisabled = await planBuyVoidProductionTerminalCloseoutV1({
  saga_id: SAGA_ID,
  http_get: async () => ({ status: 200, json: statusFixture({ childEnabled: false }) }),
  http_post: async () => {
    throw new Error("must not post");
  },
});
assert.equal(childDisabled.ok, false);
assert.equal(childDisabled.reason, "operator_runtime_status_boundary_invalid");

const policyMissing = await planBuyVoidProductionTerminalCloseoutV1({
  saga_id: SAGA_ID,
  http_get: async () => ({ status: 200, json: statusFixture({ policyConfigured: false }) }),
  http_post: async () => {
    throw new Error("must not post");
  },
});
assert.equal(policyMissing.ok, false);
assert.equal(policyMissing.reason, "operator_runtime_status_boundary_invalid");

const wrongPolicyDry = await planBuyVoidProductionTerminalCloseoutV1({
  saga_id: SAGA_ID,
  http_get: async () => ({ status: 200, json: statusFixture() }),
  http_post: async () => ({
    status: 200,
    json: dryFixture({ policyFingerprint: "a".repeat(64) }),
  }),
});
assert.equal(wrongPolicyDry.ok, false);
assert.equal(wrongPolicyDry.reason, "operator_runtime_dry_run_boundary_invalid");

let wrongPlanPosts = 0;
const wrongPlan = await runBuyVoidProductionTerminalCloseoutV1({
  args: applyArgs("f".repeat(64)),
  http_get: async () => ({ status: 200, json: statusFixture({ applyEnabled: true }) }),
  http_post: async () => {
    wrongPlanPosts += 1;
    return { status: 200, json: dryFixture() };
  },
});
assert.equal(wrongPlan.ok, false);
assert.equal(wrongPlan.reason, "exact_plan_fingerprint_required");
assert.equal(wrongPlanPosts, 1);

const paddedConfirmation = await runBuyVoidProductionTerminalCloseoutV1({
  args: {
    ...applyArgs(plan.plan_fingerprint_sha256),
    confirmation: `${RUNTIME_CONFIRMATION} `,
  },
  http_get: async () => ({ status: 200, json: statusFixture({ applyEnabled: true }) }),
  http_post: async () => ({ status: 200, json: dryFixture() }),
});
assert.equal(paddedConfirmation.ok, false);
assert.equal(paddedConfirmation.reason, "exact_closeout_confirmations_required");

const uppercaseFingerprint = await runBuyVoidProductionTerminalCloseoutV1({
  args: {
    ...applyArgs(plan.plan_fingerprint_sha256),
    policy_fingerprint_sha256: POLICY_FP.toUpperCase(),
  },
  http_get: async () => ({ status: 200, json: statusFixture({ applyEnabled: true }) }),
  http_post: async () => ({ status: 200, json: dryFixture() }),
});
assert.equal(uppercaseFingerprint.ok, false);
assert.equal(uppercaseFingerprint.reason, "exact_closeout_confirmations_required");

let notReadyStatusCalls = 0;
const notReady = await runBuyVoidProductionTerminalCloseoutV1({
  args: applyArgs(plan.plan_fingerprint_sha256),
  http_get: async () => {
    notReadyStatusCalls += 1;
    return { status: 200, json: statusFixture({ applyEnabled: false }) };
  },
  http_post: async () => ({ status: 200, json: dryFixture() }),
});
assert.equal(notReady.ok, false);
assert.equal(notReady.reason, "operator_terminal_runtime_not_apply_ready");
assert.equal(notReadyStatusCalls, 2);

let driftPosts = 0;
const drift = await runBuyVoidProductionTerminalCloseoutV1({
  args: applyArgs(plan.plan_fingerprint_sha256),
  http_get: async () => ({ status: 200, json: statusFixture({ applyEnabled: true }) }),
  http_post: async () => {
    driftPosts += 1;
    return {
      status: 200,
      json: driftPosts === 1
        ? dryFixture()
        : dryFixture({ planFingerprint: "a".repeat(64) }),
    };
  },
});
assert.equal(drift.ok, false);
assert.equal(drift.reason, "operator_terminal_closeout_plan_changed");
assert.equal(driftPosts, 2);

let successPosts = 0;
const successBodies: Record<string, unknown>[] = [];
const closed = await runBuyVoidProductionTerminalCloseoutV1({
  args: applyArgs(plan.plan_fingerprint_sha256),
  http_get: async () => ({ status: 200, json: statusFixture({ applyEnabled: true }) }),
  http_post: async ({ body }) => {
    successPosts += 1;
    successBodies.push({ ...body });
    if (successPosts <= 2) return { status: 200, json: dryFixture() };
    return { status: 200, json: appliedFixture({ outcome: "closed" }) };
  },
});
assert.equal(closed.ok, true);
assert.equal(closed.status, "closed");
assert.equal(closed.closeout_outcome, "closed");
assert.equal(closed.mutation_performed, true);
assert.equal(closed.inventory_consumption_performed, true);
assert.equal(closed.public_request_fulfilled, true);
assert.equal(closed.saga_closeout_appended, true);
assert.equal(closed.automatic_retry_allowed, false);
assert.equal(closed.transaction_broadcast_performed, false);
assert.equal(closed.money_movement_performed, false);
assert.equal(successPosts, 3);
const applyBody = successBodies[2];
assert.deepEqual(Object.keys(applyBody).sort(), [
  "action",
  "apply",
  "confirmation",
  "policy_fingerprint_sha256",
  "saga_action_confirmation",
  "saga_confirmation",
  "saga_id",
  "terminal_closeout_confirmation",
  "terminal_plan_fingerprint_sha256",
]);
assert.deepEqual(applyBody, {
  action: ACTION,
  saga_id: SAGA_ID,
  apply: true,
  confirmation: RUNTIME_CONFIRMATION,
  terminal_closeout_confirmation: TERMINAL_CONFIRMATION,
  policy_fingerprint_sha256: POLICY_FP,
  terminal_plan_fingerprint_sha256: TERMINAL_PLAN_FP,
  saga_confirmation: SAGA_CONFIRMATION,
  saga_action_confirmation: ACTION_CONFIRMATION,
});

let recoveredPosts = 0;
const recovered = await runBuyVoidProductionTerminalCloseoutV1({
  args: applyArgs(plan.plan_fingerprint_sha256),
  http_get: async () => ({ status: 200, json: statusFixture({ applyEnabled: true }) }),
  http_post: async () => {
    recoveredPosts += 1;
    return recoveredPosts <= 2
      ? { status: 200, json: dryFixture() }
      : { status: 200, json: appliedFixture({ outcome: "recovered_partial" }) };
  },
});
assert.equal(recovered.ok, true);
assert.equal(recovered.status, "closed");
assert.equal(recovered.closeout_outcome, "recovered_partial");
assert.equal(recovered.automatic_retry_allowed, false);

let partialPosts = 0;
const partial = await runBuyVoidProductionTerminalCloseoutV1({
  args: applyArgs(plan.plan_fingerprint_sha256),
  http_get: async () => ({ status: 200, json: statusFixture({ applyEnabled: true }) }),
  http_post: async () => {
    partialPosts += 1;
    return partialPosts <= 2
      ? { status: 200, json: dryFixture() }
      : { status: 500, json: partialHeldFixture() };
  },
});
assert.equal(partial.ok, false);
assert.equal(partial.status, "held");
assert.equal(partial.side_effect_state_known, true);
assert.equal(partial.recovery_required, true);
assert.equal(partial.mutation_performed, true);
assert.equal(partial.inventory_consumption_performed, true);
assert.equal(partial.public_request_fulfilled, false);
assert.equal(partial.saga_closeout_appended, false);
assert.equal(partial.automatic_retry_allowed, false);

let postAppendHeldPosts = 0;
const postAppendHeld = await runBuyVoidProductionTerminalCloseoutV1({
  args: applyArgs(plan.plan_fingerprint_sha256),
  http_get: async () => ({
    status: 200,
    json: statusFixture({ applyEnabled: true }),
  }),
  http_post: async () => {
    postAppendHeldPosts += 1;
    return postAppendHeldPosts <= 2
      ? { status: 200, json: dryFixture() }
      : {
          status: 500,
          json: partialHeldFixture({
            publicFulfilled: true,
            sagaAppended: true,
          }),
        };
  },
});
assert.equal(postAppendHeld.ok, false);
assert.equal(postAppendHeld.status, "held");
assert.equal(postAppendHeld.side_effect_state_known, true);
assert.equal(postAppendHeld.recovery_required, true);
assert.equal(postAppendHeld.mutation_performed, true);
assert.equal(postAppendHeld.inventory_consumption_performed, true);
assert.equal(postAppendHeld.public_request_fulfilled, true);
assert.equal(postAppendHeld.saga_closeout_appended, true);
assert.equal(postAppendHeld.automatic_retry_allowed, false);

let transportPosts = 0;
const transportUnknown = await runBuyVoidProductionTerminalCloseoutV1({
  args: applyArgs(plan.plan_fingerprint_sha256),
  http_get: async () => ({ status: 200, json: statusFixture({ applyEnabled: true }) }),
  http_post: async () => {
    transportPosts += 1;
    if (transportPosts <= 2) return { status: 200, json: dryFixture() };
    throw new Error("response lost after POST");
  },
});
assert.equal(transportUnknown.ok, false);
assert.equal(transportUnknown.status, "closeout_unknown");
assert.equal(transportUnknown.side_effect_state_known, false);
assert.equal(transportUnknown.recovery_required, true);
assert.equal(transportUnknown.mutation_performed, null);
assert.equal(transportUnknown.inventory_consumption_performed, null);
assert.equal(transportUnknown.public_request_fulfilled, null);
assert.equal(transportUnknown.saga_closeout_appended, null);
assert.equal(transportUnknown.automatic_retry_allowed, false);
assert.equal(transportPosts, 3);

let malformedPosts = 0;
const malformed = await runBuyVoidProductionTerminalCloseoutV1({
  args: applyArgs(plan.plan_fingerprint_sha256),
  http_get: async () => ({ status: 200, json: statusFixture({ applyEnabled: true }) }),
  http_post: async () => {
    malformedPosts += 1;
    if (malformedPosts <= 2) return { status: 200, json: dryFixture() };
    return { status: 200, json: { marker: CHILD_MARKER, ok: true, applied: true } };
  },
});
assert.equal(malformed.ok, false);
assert.equal(malformed.status, "closeout_unknown");
assert.equal(malformed.side_effect_state_known, false);
assert.equal(malformed.recovery_required, true);

const serializedClosed = JSON.stringify(closed);
assert.equal(serializedClosed.includes('"plan":'), false);
assert.equal(serializedClosed.includes("secret_internal_object"), false);
assert.equal(serializedClosed.includes('"request_dir":'), false);
assert.equal(serializedClosed.includes('"pool_id":'), false);
assert.equal(serializedClosed.includes("raw_signed_transaction"), false);
assert.equal(serializedClosed.includes("private_key"), false);

assert.equal(
  VOID_BUY_VOID_PRODUCTION_TERMINAL_CLOSEOUT_OPERATOR_AUTHORITY_V1.server_controlled_root_dir,
  true,
);
assert.equal(
  VOID_BUY_VOID_PRODUCTION_TERMINAL_CLOSEOUT_OPERATOR_AUTHORITY_V1.server_controlled_pool_id,
  true,
);
assert.equal(
  VOID_BUY_VOID_PRODUCTION_TERMINAL_CLOSEOUT_OPERATOR_AUTHORITY_V1.server_controlled_request_dir,
  true,
);
assert.equal(
  VOID_BUY_VOID_PRODUCTION_TERMINAL_CLOSEOUT_OPERATOR_AUTHORITY_V1.transaction_broadcast,
  false,
);
assert.equal(
  VOID_BUY_VOID_PRODUCTION_TERMINAL_CLOSEOUT_OPERATOR_AUTHORITY_V1.money_movement,
  false,
);

console.log(JSON.stringify({
  marker: "VOID_BUY_VOID_PRODUCTION_TERMINAL_CLOSEOUT_OPERATOR_V1_PROOF_GREEN",
  runtime_route_reused: true,
  exact_loopback_http_only: true,
  saga_id_only_selector: true,
  status_precheck_before_command: true,
  replan_before_apply: true,
  deterministic_operator_plan_fingerprint: true,
  exact_confirmation_echoes_required: true,
  exact_apply_command_key_count: 9,
  server_enforced_terminal_plan_fingerprint: true,
  canonical_confirmed_state_bound: true,
  terminal_plan_fingerprint_bound: true,
  duplicate_terminal_truth_preserved: true,
  recovered_partial_truth_preserved: true,
  partial_mutation_truth_preserved: true,
  post_append_verification_mismatch_saga_truth_preserved: true,
  applied_transport_unknown_preserved: true,
  malformed_applied_envelope_unknown: true,
  automatic_retry: false,
  transaction_broadcast: false,
  money_movement: false,
}, null, 2));
