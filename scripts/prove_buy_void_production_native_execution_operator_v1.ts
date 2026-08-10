import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";

import {
  VOID_BUY_VOID_PRODUCTION_NATIVE_EXECUTION_COMMAND_ROUTE_V1,
  VOID_BUY_VOID_PRODUCTION_NATIVE_EXECUTION_CONFIRMATION_V1,
  VOID_BUY_VOID_PRODUCTION_NATIVE_EXECUTION_OPERATOR_AUTHORITY_V1,
  VOID_BUY_VOID_PRODUCTION_NATIVE_EXECUTION_OPERATOR_V1,
  VOID_BUY_VOID_PRODUCTION_NATIVE_EXECUTION_PLANNER_MARKER_V1,
  VOID_BUY_VOID_PRODUCTION_NATIVE_EXECUTION_RUNTIME_MARKER_V1,
  VOID_BUY_VOID_PRODUCTION_NATIVE_EXECUTION_STATUS_ROUTE_V1,
  VOID_BUY_VOID_PRODUCTION_NATIVE_EXECUTION_WORKER_MARKER_V1,
  buyVoidProductionNativeExecutionCommandEndpointV1,
  buyVoidProductionNativeExecutionStatusEndpointV1,
  parseBuyVoidProductionNativeExecutionOperatorArgsV1,
  planBuyVoidProductionNativeExecutionV1,
  runBuyVoidProductionNativeExecutionOperatorV1,
} from "./buy_void_production_native_execution_operator_v1.js";

const ATTEMPT = "a".repeat(64);
const POLICY_FP = "b".repeat(64);
const RPC_FP = "c".repeat(64);
const BOUNDED_PLAN = "d".repeat(64);
const PLAN_FP = "7".repeat(64);
const IDEMPOTENCY = "e".repeat(64);
const TX_HASH = `0x${"f".repeat(64)}`;
const WALLET = `0x${"1".repeat(40)}`;
const DELIVERY = `0x${"2".repeat(40)}`;
const INVENTORY = "voidinvres1_synthetic_operator_proof";
const PRIVATE_ROOT = "/srv/void/private/data_a/buy_void_v1/runtime-integration-v1";
const EXPECTED_METHODS = [
  "eth_chainId",
  "eth_getTransactionCount",
  "eth_gasPrice",
  "eth_getBalance",
];

function sha256(value: string): string {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

function transactionPlanFingerprint(expectedHash = TX_HASH): string {
  return sha256(JSON.stringify({
    asset_mode: "native_void",
    attempt_id: ATTEMPT,
    calldata: "0x",
    chain_id: "2050",
    delivery_address: DELIVERY,
    expected_transaction_hash: expectedHash,
    fulfillment_unit_decimals: "6",
    gas_limit: "21000",
    max_fee_per_gas_wei: "2000000000",
    max_priority_fee_per_gas_wei: "1000000000",
    native_unit_decimals: "18",
    native_value_wei: "400000000000000",
    nonce: "7",
    type: "2",
    void_amount_units: "400",
  }));
}

function runtimeAuthority() {
  return {
    operator_loopback_only: true,
    disabled_by_default: true,
    dry_run_allowed_while_disabled: true,
    apply_allowed_while_disabled: false,
    one_request_per_command: true,
    server_controlled_root_dir: true,
    server_controlled_policy: true,
    server_controlled_rpc_url: true,
    attempt_id_only_selector: true,
    journal_reconstruction_required: true,
    exact_confirmation_required_before_apply_io: true,
    exact_policy_fingerprint_required_before_apply_planning: true,
    exact_plan_fingerprint_required_before_signing: true,
    injected_dependencies_required_before_apply_io: true,
    read_only_nonce_fee_planning: true,
    public_request_journal_write: false,
    inventory_decrement: false,
    inventory_release: false,
    raw_signed_transaction_input: false,
    raw_signed_transaction_persistence: false,
    raw_signed_transaction_output: false,
    automatic_retry: false,
    receipt_wait: false,
    background_loop: false,
    startup_execution: false,
    signing_when_confirmed_and_fully_enabled: true,
    transaction_broadcast_when_confirmed_and_fully_enabled: true,
    money_movement_when_confirmed_and_fully_enabled: true,
  };
}

function status(options: {
  enabled?: boolean;
  signer?: boolean;
  broadcaster?: boolean;
  policyFp?: string;
  rpcFp?: string;
} = {}) {
  const enabled = options.enabled === true;
  const signer = options.signer === true;
  const broadcaster = options.broadcaster === true;
  return {
    marker: VOID_BUY_VOID_PRODUCTION_NATIVE_EXECUTION_RUNTIME_MARKER_V1,
    version: 1,
    ok: true,
    enabled,
    routes: {
      status: VOID_BUY_VOID_PRODUCTION_NATIVE_EXECUTION_STATUS_ROUTE_V1,
      command: VOID_BUY_VOID_PRODUCTION_NATIVE_EXECUTION_COMMAND_ROUTE_V1,
    },
    operator_loopback_only: true,
    one_request_per_command: true,
    root_dir: PRIVATE_ROOT,
    root_dir_source: "VOID_BUY_VOID_RUNTIME_DIR",
    policy_configured: true,
    policy_fingerprint_sha256: options.policyFp || POLICY_FP,
    rpc_url_fingerprint_sha256: options.rpcFp || RPC_FP,
    signer_configured: signer,
    broadcaster_configured: broadcaster,
    apply_ready: enabled && signer && broadcaster,
    required_confirmation:
      VOID_BUY_VOID_PRODUCTION_NATIVE_EXECUTION_CONFIRMATION_V1,
    authority: runtimeAuthority(),
  };
}

function dryRuntime(options: {
  wallet?: string;
  delivery?: string;
  rpcFp?: string;
  rawMaterial?: boolean;
} = {}) {
  const wallet = options.wallet || WALLET;
  const response: Record<string, any> = {
    marker: VOID_BUY_VOID_PRODUCTION_NATIVE_EXECUTION_RUNTIME_MARKER_V1,
    version: 1,
    ok: true,
    status: "dry_run",
    attempt_id: ATTEMPT,
    reconstructed_from_server_journals: true,
    plan_fingerprint_sha256: PLAN_FP,
    runtime_policy_fingerprint_sha256: POLICY_FP,
    planner: {
      ok: true,
      marker: VOID_BUY_VOID_PRODUCTION_NATIVE_EXECUTION_PLANNER_MARKER_V1,
      version: 1,
      status: "planned",
      chain_id: "2050",
      wallet_address: wallet,
      wallet_address_fingerprint_sha256: sha256(wallet),
      rpc_url_fingerprint_sha256: options.rpcFp || RPC_FP,
      transaction_plan: {
        chain_id: "2050",
        nonce: 7,
        gas_limit: "21000",
        max_fee_per_gas_wei: "2000000000",
        max_priority_fee_per_gas_wei: "1000000000",
      },
      pending_nonce: 7,
      observed_gas_price_wei: "1000000000",
      computed_max_fee_per_gas_wei: "2000000000",
      configured_priority_fee_per_gas_wei: "1000000000",
      estimated_max_transaction_cost_wei: "442000000000000",
      observed_wallet_balance_wei: "1000000000000000",
      sufficient_balance: true,
      rpc_methods_used: [...EXPECTED_METHODS],
      mutation_performed: false,
      signing_performed: false,
      transaction_broadcast_performed: false,
    },
    worker: {
      ok: true,
      status: "dry_run",
      applied: false,
      mutation_performed: false,
      preview: {
        schema: "void_buy_void_native_execution_preview_v1",
        marker: VOID_BUY_VOID_PRODUCTION_NATIVE_EXECUTION_WORKER_MARKER_V1,
        attempt_id: ATTEMPT,
        inventory_reservation_id: INVENTORY,
        plan_id: BOUNDED_PLAN,
        chain_id: "2050",
        fulfillment_wallet_address: wallet,
        delivery_address: options.delivery || DELIVERY,
        void_amount_units: "400",
        native_value_wei: "400000000000000",
        nonce: 7,
        gas_limit: "21000",
        max_fee_per_gas_wei: "2000000000",
        max_priority_fee_per_gas_wei: "1000000000",
        public_request_journal_write_authorized: false,
        inventory_decrement_authorized: false,
        inventory_release_authorized: false,
        wallet_access_authorized: false,
        signing_authorized: false,
        transaction_broadcast_authorized: false,
        money_movement_authorized: false,
      },
      required_confirmation:
        VOID_BUY_VOID_PRODUCTION_NATIVE_EXECUTION_CONFIRMATION_V1,
      signing_performed: false,
      transaction_broadcast_performed: false,
      raw_signed_transaction_persisted: false,
      raw_signed_transaction_returned: false,
    },
    mutation_performed: false,
    signing_performed: false,
    transaction_broadcast_performed: false,
    raw_signed_transaction_persisted: false,
    raw_signed_transaction_returned: false,
  };
  if (options.rawMaterial) {
    response.raw_signed_transaction = "0xdeadbeef";
  }
  return response;
}

function acceptedRuntime() {
  return {
    marker: VOID_BUY_VOID_PRODUCTION_NATIVE_EXECUTION_RUNTIME_MARKER_V1,
    version: 1,
    ok: true,
    status: "broadcast_accepted",
    attempt_id: ATTEMPT,
    reconstructed_from_server_journals: true,
    plan_fingerprint_sha256: PLAN_FP,
    runtime_policy_fingerprint_sha256: POLICY_FP,
    worker: {
      ok: true,
      status: "broadcast_accepted",
      applied: true,
      mutation_performed: true,
      adapter_decision: {
        marker: "VOID_BUY_VOID_NATIVE_DELIVERY_SIGN_BROADCAST_ADAPTER_V1",
        version: 1,
        ok: true,
        status: "broadcast_accepted",
        attempt_id: ATTEMPT,
        expected_transaction_hash: TX_HASH,
        transaction_plan_fingerprint_sha256: transactionPlanFingerprint(),
        submission_guard_claimed: true,
        submission_guard_released: false,
        signing_performed: true,
        broadcast_call_performed: true,
        transaction_broadcast_accepted: true,
        transaction_hash: TX_HASH,
        provider_submission_id: "proof-provider/native-1",
        raw_signed_transaction_persisted: false,
        raw_signed_transaction_returned: false,
        automatic_retry_allowed: false,
      },
      signing_performed: true,
      transaction_broadcast_performed: true,
      raw_signed_transaction_persisted: false,
      raw_signed_transaction_returned: false,
      automatic_retry_allowed: false,
    },
    mutation_performed: true,
    signing_performed: true,
    transaction_broadcast_performed: true,
    raw_signed_transaction_persisted: false,
    raw_signed_transaction_returned: false,
  };
}

function heldRuntime(
  kind: "held" | "not_broadcast" | "broadcast_unknown",
) {
  const unknown = kind === "broadcast_unknown";
  const reason = unknown
    ? "broadcast_submission_unknown"
    : "broadcast_definitively_not_submitted";
  return {
    marker: VOID_BUY_VOID_PRODUCTION_NATIVE_EXECUTION_RUNTIME_MARKER_V1,
    version: 1,
    ok: false,
    status: kind,
    stage: "native_execution",
    reason,
    attempt_id: ATTEMPT,
    worker: {
      ok: false,
      status: kind,
      applied: true,
      mutation_performed: true,
      stage: "sign_broadcast",
      reason,
      attempt_id: ATTEMPT,
      expected_transaction_hash: TX_HASH,
      signing_performed: true,
      transaction_broadcast_performed: false,
      reconciliation_required: unknown,
      automatic_retry_allowed: false,
      raw_signed_transaction_persisted: false,
      raw_signed_transaction_returned: false,
    },
    mutation_performed: true,
    signing_performed: true,
    transaction_broadcast_performed: false,
    reconciliation_required: unknown,
    automatic_retry_allowed: false,
    raw_signed_transaction_persisted: false,
    raw_signed_transaction_returned: false,
  };
}

function transport(options: {
  statusValue?: any;
  dryValue?: any;
  applyValue?: any;
  throwApply?: boolean;
} = {}) {
  const gets: any[] = [];
  const posts: any[] = [];
  const get = async (input: { url: string }) => {
    gets.push(input);
    return { status: 200, json: options.statusValue || status() };
  };
  const post = async (input: { url: string; body: Readonly<Record<string, unknown>> }) => {
    posts.push(input);
    if (posts.length === 1) {
      return { status: 200, json: options.dryValue || dryRuntime() };
    }
    if (options.throwApply) throw new Error("synthetic_apply_transport_loss");
    const value = options.applyValue || acceptedRuntime();
    const httpStatus = value?.status === "broadcast_accepted" ? 200 : 409;
    return { status: httpStatus, json: value };
  };
  return { get, post, gets, posts };
}

async function observeAppliedEnvelope(envelope: Record<string, unknown>) {
  const io = transport({
    statusValue: status({ enabled: true, signer: true, broadcaster: true }),
    applyValue: envelope,
  });
  const result = await runBuyVoidProductionNativeExecutionOperatorV1({
    args: {
      attempt_id: ATTEMPT,
      apply: true,
      expected_plan_fingerprint_sha256: PLAN_FP,
      policy_fingerprint_sha256: POLICY_FP,
      confirmation: VOID_BUY_VOID_PRODUCTION_NATIVE_EXECUTION_CONFIRMATION_V1,
      submission_idempotency_key: IDEMPOTENCY,
    },
    http_get: io.get,
    http_post: io.post,
  });
  assert.equal(io.posts.length, 2);
  return result;
}

function assertAmbiguousAppliedEnvelope(
  result: Record<string, any>,
  label: string,
) {
  assert.equal(result.ok, false, label);
  assert.equal(result.status, "operator_transport_unknown", label);
  assert.equal(result.submission_may_have_occurred, true, label);
  assert.equal(result.reconciliation_required, true, label);
  assert.equal(result.mutation_performed, null, label);
  assert.equal(result.signing_performed, null, label);
  assert.equal(result.transaction_broadcast_performed, null, label);
  assert.equal(result.side_effect_state_known, false, label);
  assert.equal(result.automatic_retry_allowed, false, label);
}

function mutatePath(
  value: Record<string, any>,
  path: readonly string[],
  replacement: unknown,
) {
  let target: Record<string, any> = value;
  for (const part of path.slice(0, -1)) target = target[part];
  const final = path[path.length - 1];
  if (replacement === undefined) delete target[final];
  else target[final] = replacement;
}

assert.equal(
  buyVoidProductionNativeExecutionStatusEndpointV1({}),
  `http://127.0.0.1:4100${VOID_BUY_VOID_PRODUCTION_NATIVE_EXECUTION_STATUS_ROUTE_V1}`,
);
assert.equal(
  buyVoidProductionNativeExecutionCommandEndpointV1({}),
  `http://127.0.0.1:4100${VOID_BUY_VOID_PRODUCTION_NATIVE_EXECUTION_COMMAND_ROUTE_V1}`,
);
assert.equal(
  buyVoidProductionNativeExecutionCommandEndpointV1({
    VOID_BUY_VOID_PRODUCTION_NATIVE_EXECUTION_OPERATOR_PORT: "4177",
  }),
  `http://127.0.0.1:4177${VOID_BUY_VOID_PRODUCTION_NATIVE_EXECUTION_COMMAND_ROUTE_V1}`,
);

assert.throws(
  () => parseBuyVoidProductionNativeExecutionOperatorArgsV1(["--attempt-id", ATTEMPT, "--wallet", WALLET]),
  /unexpected_option/,
);
assert.throws(
  () => parseBuyVoidProductionNativeExecutionOperatorArgsV1([
    "--attempt-id", ATTEMPT,
    "--confirm", VOID_BUY_VOID_PRODUCTION_NATIVE_EXECUTION_CONFIRMATION_V1,
  ]),
  /apply_authority_without_apply/,
);
assert.throws(
  () => parseBuyVoidProductionNativeExecutionOperatorArgsV1(["--attempt-id", ATTEMPT.toUpperCase()]),
  /invalid_attempt_id/,
);

const dryIo = transport({ statusValue: status() });
const planned = await planBuyVoidProductionNativeExecutionV1({
  attempt_id: ATTEMPT,
  http_get: dryIo.get,
  http_post: dryIo.post,
});
assert.equal(planned.ok, true);
assert.equal(planned.status, "planned");
assert.equal(planned.apply_ready, false);
assert.equal(dryIo.gets.length, 1);
assert.equal(dryIo.posts.length, 1);
assert.deepEqual(dryIo.posts[0].body, { attempt_id: ATTEMPT, apply: false });
assert.equal(planned.mutation_performed, false);
assert.equal(planned.signing_performed, false);
assert.equal(planned.transaction_broadcast_performed, false);
assert.equal(planned.submission_may_have_occurred, false);
assert.equal(planned.runtime_policy_fingerprint_sha256, POLICY_FP);
assert.equal(planned.plan_fingerprint_sha256, PLAN_FP);
assert.equal(planned.rpc_url_fingerprint_sha256, RPC_FP);
assert.equal(planned.execution_preview.delivery_address, DELIVERY);
assert.equal(planned.execution_preview.void_amount_units, "400");
assert.equal(planned.execution_preview.wallet_address_fingerprint_sha256, sha256(WALLET));
const serializedPlan = JSON.stringify(planned);
assert.equal(serializedPlan.includes(PRIVATE_ROOT), false);
assert.equal(serializedPlan.includes(WALLET), false);
assert.equal(serializedPlan.includes("raw_signed_transaction"), true);
assert.equal(serializedPlan.includes("0xdeadbeef"), false);

const secondDryIo = transport({ statusValue: status() });
const repeated = await planBuyVoidProductionNativeExecutionV1({
  attempt_id: ATTEMPT,
  http_get: secondDryIo.get,
  http_post: secondDryIo.post,
});
assert.equal(repeated.ok, true);
assert.equal(repeated.plan_fingerprint_sha256, planned.plan_fingerprint_sha256);

const endpointHold = await planBuyVoidProductionNativeExecutionV1({
  attempt_id: ATTEMPT,
  status_endpoint: `http://localhost:4100${VOID_BUY_VOID_PRODUCTION_NATIVE_EXECUTION_STATUS_ROUTE_V1}`,
  http_get: async () => { throw new Error("must not call"); },
  http_post: async () => { throw new Error("must not call"); },
});
assert.equal(endpointHold.ok, false);
assert.equal(endpointHold.reason, "operator_endpoint_must_be_exact_loopback_runtime_route");

const invalidStatus = status();
invalidStatus.apply_ready = true;
const statusIo = transport({ statusValue: invalidStatus });
const statusHold = await planBuyVoidProductionNativeExecutionV1({
  attempt_id: ATTEMPT,
  http_get: statusIo.get,
  http_post: statusIo.post,
});
assert.equal(statusHold.ok, false);
assert.equal(statusHold.reason, "runtime_status_boundary_invalid");
assert.equal(statusIo.posts.length, 0);

const rawMaterialIo = transport({ dryValue: dryRuntime({ rawMaterial: true }) });
const rawMaterialHold = await planBuyVoidProductionNativeExecutionV1({
  attempt_id: ATTEMPT,
  http_get: rawMaterialIo.get,
  http_post: rawMaterialIo.post,
});
assert.equal(rawMaterialHold.ok, false);
assert.equal(rawMaterialHold.reason, "runtime_dry_run_boundary_invalid");

assert.equal(planned.ok, true);
const exactArgs = {
  attempt_id: ATTEMPT,
  apply: true,
  expected_plan_fingerprint_sha256: planned.plan_fingerprint_sha256,
  policy_fingerprint_sha256: POLICY_FP,
  confirmation: VOID_BUY_VOID_PRODUCTION_NATIVE_EXECUTION_CONFIRMATION_V1,
  submission_idempotency_key: IDEMPOTENCY,
};

const notReadyIo = transport({ statusValue: status() });
const notReady = await runBuyVoidProductionNativeExecutionOperatorV1({
  args: exactArgs,
  http_get: notReadyIo.get,
  http_post: notReadyIo.post,
});
assert.equal(notReady.ok, false);
assert.equal(notReady.reason, "runtime_not_apply_ready");
assert.equal(notReadyIo.posts.length, 1);

const readyStatus = status({ enabled: true, signer: true, broadcaster: true });
const mismatchIo = transport({ statusValue: readyStatus });
const mismatch = await runBuyVoidProductionNativeExecutionOperatorV1({
  args: { ...exactArgs, expected_plan_fingerprint_sha256: "9".repeat(64) },
  http_get: mismatchIo.get,
  http_post: mismatchIo.post,
});
assert.equal(mismatch.ok, false);
assert.equal(mismatch.reason, "exact_plan_fingerprint_required");
assert.equal(mismatchIo.posts.length, 1);

const policyMismatchIo = transport({ statusValue: readyStatus });
const policyMismatch = await runBuyVoidProductionNativeExecutionOperatorV1({
  args: { ...exactArgs, policy_fingerprint_sha256: "8".repeat(64) },
  http_get: policyMismatchIo.get,
  http_post: policyMismatchIo.post,
});
assert.equal(policyMismatch.ok, false);
assert.equal(policyMismatch.reason, "exact_policy_fingerprint_required");
assert.equal(policyMismatchIo.posts.length, 1);

const confirmationIo = transport({ statusValue: readyStatus });
const confirmationHold = await runBuyVoidProductionNativeExecutionOperatorV1({
  args: { ...exactArgs, confirmation: `${VOID_BUY_VOID_PRODUCTION_NATIVE_EXECUTION_CONFIRMATION_V1} ` },
  http_get: confirmationIo.get,
  http_post: confirmationIo.post,
});
assert.equal(confirmationHold.ok, false);
assert.equal(confirmationHold.reason, "exact_execution_confirmation_required");
assert.equal(confirmationIo.posts.length, 1);

const idempotencyIo = transport({ statusValue: readyStatus });
const idempotencyHold = await runBuyVoidProductionNativeExecutionOperatorV1({
  args: { ...exactArgs, submission_idempotency_key: IDEMPOTENCY.toUpperCase() },
  http_get: idempotencyIo.get,
  http_post: idempotencyIo.post,
});
assert.equal(idempotencyHold.ok, false);
assert.equal(idempotencyHold.reason, "exact_submission_idempotency_key_required");
assert.equal(idempotencyIo.posts.length, 1);

const acceptedIo = transport({ statusValue: readyStatus });
const accepted = await runBuyVoidProductionNativeExecutionOperatorV1({
  args: exactArgs,
  http_get: acceptedIo.get,
  http_post: acceptedIo.post,
});
assert.equal(accepted.ok, true);
assert.equal(accepted.status, "broadcast_accepted");
assert.equal(acceptedIo.gets.length, 1);
assert.equal(acceptedIo.posts.length, 2);
assert.deepEqual(acceptedIo.posts[1].body, {
  attempt_id: ATTEMPT,
  apply: true,
  confirmation: VOID_BUY_VOID_PRODUCTION_NATIVE_EXECUTION_CONFIRMATION_V1,
  submission_idempotency_key: IDEMPOTENCY,
  expected_plan_fingerprint_sha256: PLAN_FP,
  policy_fingerprint_sha256: POLICY_FP,
});
assert.equal(Object.keys(acceptedIo.posts[1].body).length, 6);
assert.equal(accepted.expected_transaction_hash, TX_HASH);
assert.equal(accepted.transaction_hash, TX_HASH);
assert.equal(accepted.reconciliation_required, false);
assert.equal(accepted.automatic_retry_allowed, false);
assert.equal(JSON.stringify(accepted).includes(WALLET), false);

const notBroadcastIo = transport({
  statusValue: readyStatus,
  applyValue: heldRuntime("not_broadcast"),
});
const notBroadcast = await runBuyVoidProductionNativeExecutionOperatorV1({
  args: exactArgs,
  http_get: notBroadcastIo.get,
  http_post: notBroadcastIo.post,
});
assert.equal(notBroadcast.ok, false);
assert.equal(notBroadcast.status, "not_broadcast");
assert.equal(notBroadcast.submission_may_have_occurred, false);
assert.equal(notBroadcast.reconciliation_required, false);
assert.equal(notBroadcast.automatic_retry_allowed, false);

const unknownIo = transport({
  statusValue: readyStatus,
  applyValue: heldRuntime("broadcast_unknown"),
});
const unknown = await runBuyVoidProductionNativeExecutionOperatorV1({
  args: exactArgs,
  http_get: unknownIo.get,
  http_post: unknownIo.post,
});
assert.equal(unknown.ok, false);
assert.equal(unknown.status, "broadcast_unknown");
assert.equal(unknown.submission_may_have_occurred, true);
assert.equal(unknown.reconciliation_required, true);
assert.equal(unknown.automatic_retry_allowed, false);

const exactHeld = await observeAppliedEnvelope(heldRuntime("held"));
assert.equal(exactHeld.ok, false);
assert.equal(exactHeld.status, "held");
assert.equal(exactHeld.mutation_performed, true);
assert.equal(exactHeld.signing_performed, true);
assert.equal(exactHeld.transaction_broadcast_performed, false);
assert.equal(exactHeld.reconciliation_required, false);

const nullIdentityHeldEnvelope = heldRuntime("held") as any;
nullIdentityHeldEnvelope.worker.attempt_id = null;
nullIdentityHeldEnvelope.worker.expected_transaction_hash = null;
const nullIdentityHeld = await observeAppliedEnvelope(nullIdentityHeldEnvelope);
assert.equal(nullIdentityHeld.ok, false);
assert.equal(nullIdentityHeld.status, "held");
assert.equal(nullIdentityHeld.expected_transaction_hash, null);

const malformedBooleanValues = [
  { label: "missing", value: undefined },
  { label: "null", value: null },
  { label: "string", value: "false" },
  { label: "number", value: 0 },
] as const;
const nonSuccessEnvelopeFactories = [
  { label: "held", create: () => heldRuntime("held") },
  { label: "not_broadcast", create: () => heldRuntime("not_broadcast") },
  { label: "broadcast_unknown", create: () => heldRuntime("broadcast_unknown") },
] as const;
const nonSuccessExactBooleanPaths = [
  ["mutation_performed"],
  ["signing_performed"],
  ["transaction_broadcast_performed"],
  ["reconciliation_required"],
  ["automatic_retry_allowed"],
  ["raw_signed_transaction_persisted"],
  ["raw_signed_transaction_returned"],
  ["worker", "applied"],
  ["worker", "mutation_performed"],
  ["worker", "signing_performed"],
  ["worker", "transaction_broadcast_performed"],
  ["worker", "reconciliation_required"],
  ["worker", "automatic_retry_allowed"],
  ["worker", "raw_signed_transaction_persisted"],
  ["worker", "raw_signed_transaction_returned"],
] as const;

for (const factory of nonSuccessEnvelopeFactories) {
  for (const path of nonSuccessExactBooleanPaths) {
    for (const malformed of malformedBooleanValues) {
      const envelope = factory.create() as any;
      mutatePath(envelope, path, malformed.value);
      const label = `${factory.label}:${path.join(".")}:${malformed.label}`;
      assertAmbiguousAppliedEnvelope(
        await observeAppliedEnvelope(envelope),
        label,
      );
    }
  }
}

for (const factory of nonSuccessEnvelopeFactories) {
  for (const field of [
    "mutation_performed",
    "signing_performed",
    "transaction_broadcast_performed",
    "reconciliation_required",
  ] as const) {
    const envelope = factory.create() as any;
    envelope.worker[field] = !envelope[field];
    assertAmbiguousAppliedEnvelope(
      await observeAppliedEnvelope(envelope),
      `${factory.label}:contradictory:${field}`,
    );
  }
}

for (const factory of nonSuccessEnvelopeFactories) {
  for (const path of [
    ["attempt_id"],
    ["status"],
    ["stage"],
    ["reason"],
    ["worker", "status"],
    ["worker", "stage"],
    ["worker", "reason"],
    ["worker", "attempt_id"],
    ["worker", "expected_transaction_hash"],
  ] as const) {
    const envelope = factory.create() as any;
    let target: any = envelope;
    for (const part of path) target = target[part];
    mutatePath(envelope, path, [target]);
    assertAmbiguousAppliedEnvelope(
      await observeAppliedEnvelope(envelope),
      `${factory.label}:scalar:${path.join(".")}`,
    );
  }
}

const acceptedAdapterExactBooleanFields = [
  "ok",
  "submission_guard_claimed",
  "submission_guard_released",
  "signing_performed",
  "broadcast_call_performed",
  "transaction_broadcast_accepted",
  "raw_signed_transaction_persisted",
  "raw_signed_transaction_returned",
  "automatic_retry_allowed",
] as const;
for (const field of acceptedAdapterExactBooleanFields) {
  for (const malformed of malformedBooleanValues) {
    const envelope = acceptedRuntime() as any;
    mutatePath(envelope, ["worker", "adapter_decision", field], malformed.value);
    assertAmbiguousAppliedEnvelope(
      await observeAppliedEnvelope(envelope),
      `accepted:adapter_decision.${field}:${malformed.label}`,
    );
  }
}

for (const field of [
  "marker",
  "version",
  "status",
  "attempt_id",
  "transaction_plan_fingerprint_sha256",
  "expected_transaction_hash",
  "transaction_hash",
  "provider_submission_id",
] as const) {
  const envelope = acceptedRuntime() as any;
  const prior = envelope.worker.adapter_decision[field];
  envelope.worker.adapter_decision[field] = [prior];
  assertAmbiguousAppliedEnvelope(
    await observeAppliedEnvelope(envelope),
    `accepted:adapter_scalar:${field}`,
  );
}

for (const [label, mutate] of [
  ["runtime_plan", (value: any) => { value.plan_fingerprint_sha256 = "8".repeat(64); }],
  ["runtime_policy", (value: any) => { value.runtime_policy_fingerprint_sha256 = "9".repeat(64); }],
  ["adapter_transaction_plan", (value: any) => {
    value.worker.adapter_decision.transaction_plan_fingerprint_sha256 =
      "6".repeat(64);
  }],
] as const) {
  const envelope = acceptedRuntime() as any;
  mutate(envelope);
  assertAmbiguousAppliedEnvelope(
    await observeAppliedEnvelope(envelope),
    `accepted:stale_plan_binding:${label}`,
  );
}

const transportLossIo = transport({ statusValue: readyStatus, throwApply: true });
const transportLoss = await runBuyVoidProductionNativeExecutionOperatorV1({
  args: exactArgs,
  http_get: transportLossIo.get,
  http_post: transportLossIo.post,
});
assert.equal(transportLoss.ok, false);
assert.equal(transportLoss.status, "operator_transport_unknown");
assert.equal(transportLoss.submission_may_have_occurred, true);
assert.equal(transportLoss.reconciliation_required, true);
assert.equal(transportLoss.mutation_performed, null);
assert.equal(transportLoss.signing_performed, null);
assert.equal(transportLoss.transaction_broadcast_performed, null);
assert.equal(transportLoss.side_effect_state_known, false);
assert.equal(transportLoss.automatic_retry_allowed, false);

const malformedIo = transport({ statusValue: readyStatus, applyValue: { nope: true } });
const malformed = await runBuyVoidProductionNativeExecutionOperatorV1({
  args: exactArgs,
  http_get: malformedIo.get,
  http_post: malformedIo.post,
});
assert.equal(malformed.ok, false);
assert.equal(malformed.status, "operator_transport_unknown");
assert.equal(malformed.submission_may_have_occurred, true);
assert.equal(malformed.reconciliation_required, true);
assert.equal(malformed.mutation_performed, null);
assert.equal(malformed.signing_performed, null);
assert.equal(malformed.transaction_broadcast_performed, null);
assert.equal(malformed.side_effect_state_known, false);

assert.equal(
  VOID_BUY_VOID_PRODUCTION_NATIVE_EXECUTION_OPERATOR_AUTHORITY_V1.duplicate_execution_engine,
  false,
);
assert.equal(
  VOID_BUY_VOID_PRODUCTION_NATIVE_EXECUTION_OPERATOR_AUTHORITY_V1.duplicate_nonce_fee_planner,
  false,
);
assert.equal(
  VOID_BUY_VOID_PRODUCTION_NATIVE_EXECUTION_OPERATOR_AUTHORITY_V1.submission_idempotency_key_synthesized,
  false,
);
assert.equal(
  VOID_BUY_VOID_PRODUCTION_NATIVE_EXECUTION_OPERATOR_AUTHORITY_V1.apply_transport_ambiguity_is_reconciliation_required,
  true,
);
assert.equal(
  VOID_BUY_VOID_PRODUCTION_NATIVE_EXECUTION_OPERATOR_AUTHORITY_V1.applied_runtime_exact_scalar_schema,
  true,
);
assert.equal(
  VOID_BUY_VOID_PRODUCTION_NATIVE_EXECUTION_OPERATOR_AUTHORITY_V1.applied_runtime_exact_boolean_schema,
  true,
);
assert.equal(
  VOID_BUY_VOID_PRODUCTION_NATIVE_EXECUTION_OPERATOR_AUTHORITY_V1.applied_runtime_worker_truth_binding,
  true,
);
assert.equal(
  VOID_BUY_VOID_PRODUCTION_NATIVE_EXECUTION_OPERATOR_AUTHORITY_V1.accepted_adapter_success_truth_binding,
  true,
);
assert.equal(
  VOID_BUY_VOID_PRODUCTION_NATIVE_EXECUTION_OPERATOR_AUTHORITY_V1.automatic_retry,
  false,
);

const operatorSource = fs.readFileSync(
  new URL("./buy_void_production_native_execution_operator_v1.ts", import.meta.url),
  "utf8",
);
const runtimeSource = fs.readFileSync(
  new URL("../src/economic/buy_void_native_execution_runtime_v1.ts", import.meta.url),
  "utf8",
);
const workerSource = fs.readFileSync(
  new URL("../src/economic/buy_void_native_execution_worker_v1.ts", import.meta.url),
  "utf8",
);
const guardSource = fs.readFileSync(
  new URL("../src/economic/buy_void_delivery_submission_guard_v1.ts", import.meta.url),
  "utf8",
);
const plannerSource = fs.readFileSync(
  new URL("../src/economic/buy_void_native_execution_nonce_fee_planner_v1.ts", import.meta.url),
  "utf8",
);

assert.doesNotMatch(operatorSource, /from\s+["'][^"']*buy_void_native_execution_runtime_v1/);
assert.doesNotMatch(operatorSource, /--wallet|--rpc-url|--runtime-root|--private-key|--raw-transaction|--destination|--amount/);
assert.doesNotMatch(operatorSource, /randomUUID|randomBytes|Math\.random/);
assert.match(operatorSource, /body: \{ attempt_id: attemptId, apply: false \}/);
assert.match(operatorSource, /submission_idempotency_key: input\.args\.submission_idempotency_key/);
assert.match(runtimeSource, /\/__void\/operator\/buy-void-native-execution-v1\/status/);
assert.match(runtimeSource, /\/__void\/operator\/buy-void-native-execution-v1\/command/);
assert.match(runtimeSource, /"attempt_id",\s*\n\s*"apply",\s*\n\s*"confirmation",\s*\n\s*"submission_idempotency_key",\s*\n\s*"expected_plan_fingerprint_sha256",\s*\n\s*"policy_fingerprint_sha256"/);
assert.match(runtimeSource, /native_execution_plan_fingerprint_mismatch/);
assert.match(workerSource, /buyVoidNativeExecuteReservedPlan/);
assert.match(guardSource, /if \(!HEX64\.test\(submissionKey\)\)/);
assert.match(plannerSource, /"eth_chainId"[\s\S]*"eth_getTransactionCount"[\s\S]*"eth_gasPrice"[\s\S]*"eth_getBalance"/);

process.stdout.write(`${JSON.stringify({
  marker: "VOID_BUY_VOID_PRODUCTION_NATIVE_EXECUTION_OPERATOR_V1_PROOF_GREEN",
  runtime_route_reused: true,
  exact_loopback_http_only: true,
  dry_run_allowed_while_runtime_disabled: true,
  status_precheck_before_command: true,
  replan_before_apply: true,
  deterministic_plan_fingerprint: true,
  exact_plan_fingerprint_required: true,
  exact_policy_fingerprint_required: true,
  exact_confirmation_required: true,
  exact_submission_idempotency_key_required: true,
  submission_idempotency_key_synthesized: false,
  apply_command_key_count: 6,
  runtime_plan_fingerprint_validation: true,
  runtime_policy_fingerprint_validation: true,
  applied_envelope_exact_boolean_schema: true,
  native_execution_child_truth_bound: true,
  accepted_adapter_success_truth_exact: true,
  malformed_applied_envelope_transport_unknown: true,
  ambiguous_side_effect_state_known: false,
  broadcast_unknown_reconciliation_required: true,
  apply_transport_unknown_reconciliation_required: true,
  automatic_retry: false,
  raw_signed_transaction_input: false,
  raw_signed_transaction_persisted: false,
  raw_signed_transaction_returned: false,
  real_rpc_calls: 0,
  real_credential_reads: 0,
  real_signing: 0,
  real_transaction_broadcasts: 0,
  real_money_movement: 0,
}, null, 2)}\n`);
