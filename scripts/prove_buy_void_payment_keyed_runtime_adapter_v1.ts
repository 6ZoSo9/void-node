#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  VOID_BUY_VOID_PAYMENT_KEYED_RUNTIME_ADAPTER_AUTHORITY_V1,
  VOID_BUY_VOID_PAYMENT_KEYED_RUNTIME_ADAPTER_ENVS_V1,
  VOID_BUY_VOID_PAYMENT_KEYED_RUNTIME_ADAPTER_ROUTES_V1,
  VOID_BUY_VOID_PAYMENT_KEYED_RUNTIME_ADAPTER_V1,
  buyVoidPaymentKeyedRuntimeAdapterPolicyStateV1,
  buyVoidPaymentKeyedRuntimeAdapterStatusV1,
  handleBuyVoidPaymentKeyedRuntimeAdapterCommandV1,
} from "../src/economic/buy_void_payment_keyed_runtime_adapter_v1.js";
import {
  VOID_BUY_VOID_PAYMENT_KEYED_RUNTIME_PREFLIGHT_V1,
} from "../src/economic/buy_void_payment_keyed_runtime_preflight_v1.js";

const ATTEMPT_ID = "1".repeat(64);
const ROOT = "/tmp/void-payment-keyed-runtime-adapter-proof";
const WALLET = "0xc884f631c3881b8b672bfcbf019c856146cd7f73";
const CONTRACT = "0x3333333333333333333333333333333333333333";

function env(enabled = "1"): NodeJS.ProcessEnv {
  return {
    VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_PAYMENT_CHAIN: "base",
    VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_PAYMENT_USDC_CONTRACT:
      "0x1111111111111111111111111111111111111111",
    VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_PAYMENT_RECEIVE_ADDRESS:
      "0x2222222222222222222222222222222222222222",
    VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_PAYMENT_CURRENT_BLOCK_NUMBER: "105",
    VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_PAYMENT_MIN_CONFIRMATIONS: "3",
    VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_RATE_VOID_UNITS_NUMERATOR: "2",
    VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_RATE_VOID_UNITS_DENOMINATOR: "1",
    VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_INVENTORY_POLICY_VERSION:
      "presale-v1",
    VOID_BUY_VOID_INVENTORY_POOL_ID: "buy-void-presale-v1",
    VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_POOL_CAPACITY_VOID_UNITS:
      "10000000000000",
    VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_MAX_RESERVATION_VOID_UNITS:
      "10000000000000",
    VOID_BUY_VOID_NATIVE_DELIVERY_WALLET_ADDRESS: WALLET,
    VOID_BUY_VOID_RUNTIME_DIR: ROOT,
    [VOID_BUY_VOID_PAYMENT_KEYED_RUNTIME_ADAPTER_ENVS_V1.enabled]:
      enabled,
    [VOID_BUY_VOID_PAYMENT_KEYED_RUNTIME_ADAPTER_ENVS_V1.rpc_url]:
      "http://127.0.0.1:18545/",
    [VOID_BUY_VOID_PAYMENT_KEYED_RUNTIME_ADAPTER_ENVS_V1
      .fulfillment_contract_address]: CONTRACT,
    [VOID_BUY_VOID_PAYMENT_KEYED_RUNTIME_ADAPTER_ENVS_V1
      .gas_limit_multiplier_bps]: "12000",
    [VOID_BUY_VOID_PAYMENT_KEYED_RUNTIME_ADAPTER_ENVS_V1
      .max_gas_limit]: "300000",
    [VOID_BUY_VOID_PAYMENT_KEYED_RUNTIME_ADAPTER_ENVS_V1
      .fee_multiplier_bps]: "20000",
    [VOID_BUY_VOID_PAYMENT_KEYED_RUNTIME_ADAPTER_ENVS_V1
      .max_fee_per_gas_wei]: "5000000000",
    [VOID_BUY_VOID_PAYMENT_KEYED_RUNTIME_ADAPTER_ENVS_V1
      .max_priority_fee_per_gas_wei]: "1000000000",
  };
}

function responseHarness() {
  let sent: { status: number; body: any } | null = null;
  const res: any = {
    statusCode: 200,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    setHeader() {
      return this;
    },
    json(body: any) {
      sent = { status: this.statusCode, body };
      return this;
    },
  };
  return { res, read: () => sent };
}

async function call(
  body: unknown,
  options: Record<string, unknown>,
  remoteAddress = "127.0.0.1",
) {
  const harness = responseHarness();
  await handleBuyVoidPaymentKeyedRuntimeAdapterCommandV1(
    {
      socket: { remoteAddress },
      body,
    },
    harness.res,
    options as any,
  );
  const result = harness.read();
  assert.ok(result);
  return result!;
}

const configured = buyVoidPaymentKeyedRuntimeAdapterPolicyStateV1(env());
if (configured.configured === false) throw new Error(configured.reason);
assert.equal(configured.configured, true);
assert.equal(configured.root_dir, ROOT);
assert.equal(
  configured.server_policy.preparation_policy.fulfillment_wallet_address,
  WALLET,
);
assert.equal(
  configured.server_policy.preparation_policy.fulfillment_contract_address,
  CONTRACT,
);
assert.equal(
  configured.server_policy.max_void_amount_units,
  "10000000000000",
);
assert.match(configured.policy_fingerprint_sha256, /^[0-9a-f]{64}$/);
assert.match(
  configured.preparation_policy_fingerprint_sha256,
  /^[0-9a-f]{64}$/,
);
assert.match(configured.rpc_url_fingerprint_sha256, /^[0-9a-f]{64}$/);
assert.match(
  configured.fulfillment_wallet_fingerprint_sha256,
  /^[0-9a-f]{64}$/,
);
assert.match(
  configured.fulfillment_contract_fingerprint_sha256,
  /^[0-9a-f]{64}$/,
);

const missing = buyVoidPaymentKeyedRuntimeAdapterPolicyStateV1({});
assert.equal(missing.configured, false);

const status = buyVoidPaymentKeyedRuntimeAdapterStatusV1(env());
assert.equal(status.marker, VOID_BUY_VOID_PAYMENT_KEYED_RUNTIME_ADAPTER_V1);
assert.equal(status.enabled, true);
assert.equal(status.command_mode, "dry_run_preflight_only");
assert.equal(status.attempt_id_only_selector, true);
assert.equal(status.canonical_parent_dispatch, false);
assert.equal(status.policy_configured, true);
assert.equal(
  status.preflight_marker,
  VOID_BUY_VOID_PAYMENT_KEYED_RUNTIME_PREFLIGHT_V1,
);
assert.equal(
  Object.prototype.hasOwnProperty.call(status, "rpc_url"),
  false,
);
assert.equal(
  Object.prototype.hasOwnProperty.call(status, "fulfillment_wallet_address"),
  false,
);
assert.equal(
  Object.prototype.hasOwnProperty.call(status, "fulfillment_contract_address"),
  false,
);

let preflightCalls = 0;
const preflightArgs: any[] = [];
const runPreflight = async (input: any) => {
  preflightCalls += 1;
  preflightArgs.push(input);
  return {
    ok: true,
    status: "ready",
    marker: VOID_BUY_VOID_PAYMENT_KEYED_RUNTIME_PREFLIGHT_V1,
    version: 1,
    attempt_id: ATTEMPT_ID,
    saga_id: "voidbvfsg1_" + "a".repeat(64),
    plan_reservation_id: "b".repeat(64),
    policy_fingerprint_sha256: "c".repeat(64),
    canonical_payment_identity:
      "voidpay1:base:0x" + "d".repeat(64) + ":7",
    source_chain: "base",
    canonical_payment_key_sha256: "e".repeat(64),
    composition_marker:
      "VOID_BUY_VOID_PAYMENT_KEYED_EXECUTION_COMPOSITION_V1",
    composition_status: "dry_run",
    composition_applied: false,
    preparation_fingerprint_sha256: "1".repeat(64),
    transaction_plan_fingerprint_sha256: "2".repeat(64),
    unsigned_transaction_fingerprint_sha256: "3".repeat(64),
    request_fingerprint_sha256: "4".repeat(64),
    request_idempotency_key_sha256: "5".repeat(64),
    filesystem_write_performed: false,
    signer_access_performed: false,
    signing_performed: false,
    submission_guard_claimed: false,
    transaction_broadcast_performed: false,
    receipt_verified: false,
    saga_mutation_performed: false,
    inventory_mutation_performed: false,
    public_fulfilled_closeout_performed: false,
    money_movement_performed: false,
  } as any;
};

{
  const denied = await call(
    { attempt_id: ATTEMPT_ID },
    { env: env(), run_preflight: runPreflight },
    "203.0.113.9",
  );
  assert.equal(denied.status, 403);
  assert.equal(denied.body.error, "operator_loopback_only");
  assert.equal(preflightCalls, 0);
}

for (const forbidden of [
  "apply",
  "saga_id",
  "plan_reservation_id",
  "policy",
  "rpc_url",
  "transaction_plan",
  "raw_signed_transaction",
  "signer",
  "broadcaster",
]) {
  const blocked = await call(
    { attempt_id: ATTEMPT_ID, [forbidden]: "forbidden" },
    { env: env(), run_preflight: runPreflight },
  );
  assert.equal(blocked.status, 400, forbidden);
  assert.equal(
    blocked.body.error,
    "caller_supplied_runtime_material_forbidden",
    forbidden,
  );
  assert.deepEqual(blocked.body.allowed_keys, ["attempt_id"], forbidden);
}
assert.equal(preflightCalls, 0);

{
  const disabled = await call(
    { attempt_id: ATTEMPT_ID },
    { env: env("0"), run_preflight: runPreflight },
  );
  assert.equal(disabled.status, 503);
  assert.equal(
    disabled.body.error,
    "payment_keyed_runtime_adapter_disabled",
  );
  assert.equal(preflightCalls, 0);
}

{
  const bad = await call(
    { attempt_id: "bad" },
    { env: env(), run_preflight: runPreflight },
  );
  assert.equal(bad.status, 400);
  assert.equal(bad.body.error, "invalid_attempt_id");
  assert.equal(preflightCalls, 0);
}

{
  const unavailable = await call(
    { attempt_id: ATTEMPT_ID },
    {
      env: env(),
      policy_state: () => ({
        configured: false,
        reason: "synthetic_policy_hold",
        missing_envs: ["SYNTHETIC_MISSING"],
        invalid_envs: [],
      }),
      run_preflight: runPreflight,
    },
  );
  assert.equal(unavailable.status, 503);
  assert.equal(unavailable.body.error, "synthetic_policy_hold");
  assert.equal(preflightCalls, 0);
}

{
  const accepted = await call(
    { attempt_id: ATTEMPT_ID },
    { env: env(), run_preflight: runPreflight },
  );
  assert.equal(accepted.status, 200);
  assert.equal(accepted.body.ok, true);
  assert.equal(accepted.body.status, "ready");
  assert.equal(accepted.body.attempt_id, ATTEMPT_ID);
  assert.equal(preflightCalls, 1);
  assert.equal(preflightArgs[0].attempt_id, ATTEMPT_ID);
  assert.equal(preflightArgs[0].root_dir, ROOT);
  assert.equal(
    preflightArgs[0].server_policy.fulfillment_contract_address,
    CONTRACT,
  );
  assert.equal(
    Object.prototype.hasOwnProperty.call(preflightArgs[0], "apply"),
    false,
  );
  assert.equal(
    Object.prototype.hasOwnProperty.call(preflightArgs[0], "signer"),
    false,
  );
  assert.equal(
    Object.prototype.hasOwnProperty.call(preflightArgs[0], "broadcaster"),
    false,
  );
}

{
  const held = await call(
    { attempt_id: ATTEMPT_ID },
    {
      env: env(),
      run_preflight: async () => ({
        ok: false,
        status: "held",
        marker: VOID_BUY_VOID_PAYMENT_KEYED_RUNTIME_PREFLIGHT_V1,
        version: 1,
        stage: "attempt",
        reason: "synthetic_attempt_conflict",
        attempt_id: ATTEMPT_ID,
        saga_id: null,
        plan_reservation_id: null,
        policy_fingerprint_sha256: "a".repeat(64),
        filesystem_write_performed: false,
        signer_access_performed: false,
        signing_performed: false,
        submission_guard_claimed: false,
        transaction_broadcast_performed: false,
        receipt_verified: false,
        saga_mutation_performed: false,
        inventory_mutation_performed: false,
        public_fulfilled_closeout_performed: false,
        money_movement_performed: false,
      } as any),
    },
  );
  assert.equal(held.status, 409);
  assert.equal(held.body.reason, "synthetic_attempt_conflict");
}

const parent = fs.readFileSync(
  path.join(
    process.cwd(),
    "src/economic/buy_void_runtime_integration_v1.ts",
  ),
  "utf8",
);
assert.equal(
  parent.includes("buy_void_payment_keyed_runtime_adapter_v1"),
  false,
);
assert.equal(
  parent.includes(
    VOID_BUY_VOID_PAYMENT_KEYED_RUNTIME_ADAPTER_ROUTES_V1.command,
  ),
  false,
);

assert.deepEqual(
  VOID_BUY_VOID_PAYMENT_KEYED_RUNTIME_ADAPTER_ROUTES_V1,
  {
    status: "/__void/operator/buy-void-payment-keyed-runtime-v1/status",
    command: "/__void/operator/buy-void-payment-keyed-runtime-v1/command",
  },
);
for (const [key, expected] of Object.entries({
  operator_loopback_only: true,
  disabled_by_default: true,
  explicit_enable_required_before_rpc: true,
  dry_run_only: true,
  apply_input_forbidden: true,
  attempt_id_only_selector: true,
  canonical_parent_dispatch: false,
  filesystem_write: false,
  signer_access: false,
  credential_access: false,
  signing: false,
  durable_submission_claim: false,
  transaction_broadcast: false,
  receipt_acceptance: false,
  saga_mutation: false,
  inventory_mutation: false,
  public_fulfilled_closeout: false,
  money_movement: false,
})) {
  assert.equal(
    (VOID_BUY_VOID_PAYMENT_KEYED_RUNTIME_ADAPTER_AUTHORITY_V1 as any)[key],
    expected,
    key,
  );
}

console.log("VOID_BUY_VOID_PAYMENT_KEYED_RUNTIME_ADAPTER_V1_PROOF_GREEN");
console.log("operator_loopback_only=true");
console.log("explicit_enable_required_before_rpc=true");
console.log("attempt_id_only_selector=true");
console.log("caller_apply_forbidden=true");
console.log("caller_saga_id_forbidden=true");
console.log("caller_plan_reservation_id_forbidden=true");
console.log("caller_policy_and_rpc_material_forbidden=true");
console.log("server_policy_constructed_from_environment=true");
console.log("canonical_parent_dispatch=false");
console.log("preflight_only=true");
console.log("filesystem_write=false");
console.log("signer_access=false");
console.log("signing=false");
console.log("submission_guard_claim=false");
console.log("transaction_broadcast=false");
console.log("saga_mutation=false");
console.log("inventory_mutation=false");
console.log("public_fulfilled_closeout=false");
console.log("money_movement=false");
