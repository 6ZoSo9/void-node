#!/usr/bin/env node
import assert from "node:assert/strict";

import {
  VOID_BUY_VOID_EXECUTION_ATTEMPT_JOURNAL_V1,
  type BuyVoidExecutionAttemptStateV1,
} from "../src/economic/buy_void_execution_attempt_journal_v1.js";
import {
  VOID_BUY_VOID_SOURCE_FINALITY_EXECUTION_PREFLIGHT_V1,
} from "../src/economic/buy_void_source_finality_execution_preflight_v1.js";
import {
  VOID_BUY_VOID_PAYMENT_KEYED_RUNTIME_PREFLIGHT_AUTHORITY_V1,
  VOID_BUY_VOID_PAYMENT_KEYED_RUNTIME_PREFLIGHT_V1,
  runBuyVoidPaymentKeyedRuntimePreflightV1,
  type BuyVoidPaymentKeyedRuntimeServerPolicyV1,
} from "../src/economic/buy_void_payment_keyed_runtime_preflight_v1.js";
import type {
  BuyVoidPaymentKeyedTransactionPreparationRpcCallV1,
} from "../src/economic/buy_void_payment_keyed_transaction_preparation_v1.js";

const IDENTITY = "voidpay1:base:0x" + "a".repeat(64) + ":7";
const ATTEMPT_ID = "1".repeat(64);
const LOCAL_KEY = "2".repeat(64);
const CANONICAL_KEY =
  "a06bb682bc6225c6697d0a37a51fc1323dc657eac74a51506ddb5d7daed82c85";
const REQUEST_KEY = "7".repeat(64);
const INSTRUCTION_ID = "8".repeat(64);
const DELIVERY = "0x" + "4".repeat(40);
const CONTRACT = "0x" + "5".repeat(40);
const WALLET = "0x" + "6".repeat(40);
const RESERVATION_ID = "b".repeat(64);
const SAGA_ID = "voidbvfsg1_" + "c".repeat(64);
const ROOT = "/tmp/void-payment-keyed-runtime-preflight-proof";

function attempt(): BuyVoidExecutionAttemptStateV1 {
  return {
    reservation: {
      schema: "void_buy_void_execution_attempt_reservation_v1",
      marker: VOID_BUY_VOID_EXECUTION_ATTEMPT_JOURNAL_V1,
      attempt_id: ATTEMPT_ID,
      attempt_number: 1,
      reserved_at_ms: 1,
      payment_key_sha256: LOCAL_KEY,
      request_key_sha256: REQUEST_KEY,
      canonical_payment_identity: IDENTITY,
      request_id: "runtime-preflight-request-v1",
      instruction_id: INSTRUCTION_ID,
      intent_fingerprint: "9".repeat(64),
      max_attempts_per_payment: 1,
      unsigned_instruction: {
        schema: "void_buy_void_unsigned_fulfillment_instruction_v1",
        marker: "VOID_BUY_VOID_AUTO_FULFILLMENT_V1",
        instruction_id: INSTRUCTION_ID,
        request_id: "runtime-preflight-request-v1",
        canonical_payment_identity: IDENTITY,
        source_chain: "base",
        payment_transaction_hash: "0x" + "a".repeat(64),
        payment_log_index: "7",
        delivery_address: DELIVERY,
        payment_usdc_units: "1000000",
        void_amount_units: "2000000",
        confirmed_block_number: "123",
        confirmation_count: "12",
        signing_authorized: false,
        transaction_broadcast_authorized: false,
        automatic_execution_authorized: false,
      },
      signing_authorized_by_this_module: false,
      transaction_broadcast_authorized_by_this_module: false,
      money_movement_authorized_by_this_module: false,
    },
    prepared: null,
    broadcast: null,
    failure: null,
    postbroadcast_failure: null,
    confirmation: null,
    status: "reserved",
  };
}

const intent: any = {
  claim: {
    request_id: "runtime-preflight-request-v1",
    canonical_payment_identity: IDENTITY,
    instruction_id: INSTRUCTION_ID,
    unsigned_instruction: {
      delivery_address: DELIVERY,
      void_amount_units: "2000000",
    },
  },
  request_key_sha256: REQUEST_KEY,
  payment_key_sha256: LOCAL_KEY,
};

const inventory: any = {
  reservation_id: RESERVATION_ID,
  pool_id: "buy-void-presale-v1",
  request_id: "runtime-preflight-request-v1",
  canonical_payment_identity: IDENTITY,
  request_key_sha256: REQUEST_KEY,
  payment_key_sha256: LOCAL_KEY,
  delivery_address: DELIVERY,
  reserved_void_units: "2000000",
};

function policy(
  wallet = WALLET,
): BuyVoidPaymentKeyedRuntimeServerPolicyV1 {
  return {
    preparation_policy: {
      enabled: true,
      chain_id: "2050",
      rpc_url: "http://127.0.0.1:18545/",
      fulfillment_wallet_address: wallet,
      fulfillment_contract_address: CONTRACT,
      max_void_amount_units: "10000000000000",
      gas_limit_multiplier_bps: "12000",
      max_gas_limit: "300000",
      fee_multiplier_bps: "20000",
      max_fee_per_gas_wei: "5000000000",
      max_priority_fee_per_gas_wei: "1000000000",
    },
    fulfillment_contract_address: CONTRACT,
    max_void_amount_units: "10000000000000",
    saga_policy: {
      fingerprints: {
        combined_policy_sha256: "f".repeat(64),
      },
      execution_policy: {
        fulfillment_wallet_allowlist: [WALLET],
      },
      inventory_policy: {
        pool_id: "buy-void-presale-v1",
        max_reservation_void_units: "10000000000000",
      },
    } as any,
  };
}

function finalityReady(): any {
  return {
    ok: true,
    status: "ready",
    marker: VOID_BUY_VOID_SOURCE_FINALITY_EXECUTION_PREFLIGHT_V1,
    version: 1,
    attempt_id: ATTEMPT_ID,
    source_chain: "base",
    canonical_payment_identity: IDENTITY,
    payment_key_sha256: CANONICAL_KEY,
    process_source_identity_verified: true,
    reviewed_source_files_verified: true,
    authenticated_transport_identity_verified: true,
    total_operation_deadline_verified: true,
    source_generation_verified: true,
    deployed_artifact_generation_verified: true,
    ancestry_verified: true,
    provider_quorum_verified: true,
    production_source_finality_authority_ready: true,
    wallet_access_performed: false,
    signing_performed: false,
    transaction_broadcast_performed: false,
    money_movement_performed: false,
  };
}

function fixture(options: {
  intents?: any[];
  inventory?: any[];
  finality?: any;
  sagaId?: string;
} = {}) {
  const calls = {
    read_attempt: 0,
    list_intents: 0,
    list_inventory: 0,
    finality: 0,
    saga: 0,
    planning: [] as BuyVoidPaymentKeyedTransactionPreparationRpcCallV1[],
  };
  return {
    calls,
    dependencies: {
      read_attempt() {
        calls.read_attempt += 1;
        return attempt();
      },
      list_intents() {
        calls.list_intents += 1;
        return options.intents ?? [intent];
      },
      list_inventory() {
        calls.list_inventory += 1;
        return options.inventory ?? [inventory];
      },
      async run_source_finality() {
        calls.finality += 1;
        return options.finality ?? finalityReady();
      },
      async load_saga_module() {
        calls.saga += 1;
        return {
          validateSagaBindingV1(value: unknown) {
            return value;
          },
          computeSagaIdV1() {
            return options.sagaId ?? SAGA_ID;
          },
        };
      },
      async preparation_transport(
        call: BuyVoidPaymentKeyedTransactionPreparationRpcCallV1,
      ) {
        calls.planning.push(call);
        switch (call.method) {
          case "eth_chainId":
            return "0x802";
          case "eth_getTransactionCount":
            return "0x7";
          case "eth_gasPrice":
            return "0x3b9aca00";
          case "eth_estimateGas":
            return "0x186a0";
          case "eth_getBalance":
            return "0xde0b6b3a7640000";
        }
      },
    },
  };
}

{
  const value = fixture();
  const invalid = await runBuyVoidPaymentKeyedRuntimePreflightV1({
    root_dir: ROOT,
    attempt_id: "bad",
    server_policy: policy(),
    dependencies: value.dependencies,
  });
  assert.equal(invalid.ok, false);
  if (invalid.ok) throw new Error("invalid_attempt_unexpected_ready");
  assert.equal(invalid.stage, "input");
  assert.deepEqual(value.calls, {
    read_attempt: 0,
    list_intents: 0,
    list_inventory: 0,
    finality: 0,
    saga: 0,
    planning: [],
  });
}

{
  const value = fixture();
  const mismatch = await runBuyVoidPaymentKeyedRuntimePreflightV1({
    root_dir: ROOT,
    attempt_id: ATTEMPT_ID,
    server_policy: policy("0x" + "9".repeat(40)),
    dependencies: value.dependencies,
  });
  assert.equal(mismatch.ok, false);
  if (mismatch.ok) throw new Error("policy_mismatch_unexpected_ready");
  assert.equal(mismatch.stage, "policy");
  assert.equal(value.calls.read_attempt, 0);
}

{
  const value = fixture({ intents: [intent, { ...intent }] });
  const ambiguous = await runBuyVoidPaymentKeyedRuntimePreflightV1({
    root_dir: ROOT,
    attempt_id: ATTEMPT_ID,
    server_policy: policy(),
    dependencies: value.dependencies,
  });
  assert.equal(ambiguous.ok, false);
  if (ambiguous.ok) throw new Error("ambiguous_intent_unexpected_ready");
  assert.equal(ambiguous.stage, "intent");
  assert.equal(value.calls.finality, 0);
  assert.equal(value.calls.planning.length, 0);
}

{
  const badInventory = { ...inventory, reservation_id: "not-a-reservation" };
  const value = fixture({ inventory: [badInventory] });
  const invalid = await runBuyVoidPaymentKeyedRuntimePreflightV1({
    root_dir: ROOT,
    attempt_id: ATTEMPT_ID,
    server_policy: policy(),
    dependencies: value.dependencies,
  });
  assert.equal(invalid.ok, false);
  if (invalid.ok) throw new Error("bad_inventory_unexpected_ready");
  assert.equal(invalid.stage, "inventory");
  assert.equal(value.calls.finality, 0);
}

{
  const value = fixture({
    finality: {
      ok: false,
      status: "held",
      marker: VOID_BUY_VOID_SOURCE_FINALITY_EXECUTION_PREFLIGHT_V1,
      version: 1,
      reason: "synthetic_finality_hold",
      attempt_id: ATTEMPT_ID,
      source_chain: "base",
      process_source_identity_verified: true,
      reviewed_source_files_verified: false,
      authenticated_transport_identity_verified: false,
      total_operation_deadline_verified: false,
      source_generation_verified: false,
      deployed_artifact_generation_verified: false,
      ancestry_verified: false,
      provider_quorum_verified: false,
      production_source_finality_authority_ready: false,
      wallet_access_performed: false,
      signing_performed: false,
      transaction_broadcast_performed: false,
      money_movement_performed: false,
    },
  });
  const held = await runBuyVoidPaymentKeyedRuntimePreflightV1({
    root_dir: ROOT,
    attempt_id: ATTEMPT_ID,
    server_policy: policy(),
    dependencies: value.dependencies,
  });
  assert.equal(held.ok, false);
  if (held.ok) throw new Error("finality_hold_unexpected_ready");
  assert.equal(held.stage, "source_finality");
  assert.equal(held.reason, "synthetic_finality_hold");
  assert.equal(value.calls.planning.length, 0);
}

{
  const value = fixture();
  const ready = await runBuyVoidPaymentKeyedRuntimePreflightV1({
    root_dir: ROOT,
    attempt_id: ATTEMPT_ID,
    server_policy: policy(),
    dependencies: value.dependencies,
    saga_id: "voidbvfsg1_" + "e".repeat(64),
    plan_reservation_id: "e".repeat(64),
  } as any);
  if (ready.ok === false) throw new Error(ready.reason);
  assert.equal(ready.marker, VOID_BUY_VOID_PAYMENT_KEYED_RUNTIME_PREFLIGHT_V1);
  assert.equal(ready.status, "ready");
  assert.equal(ready.attempt_id, ATTEMPT_ID);
  assert.equal(ready.saga_id, SAGA_ID);
  assert.equal(ready.plan_reservation_id, RESERVATION_ID);
  assert.equal(ready.canonical_payment_identity, IDENTITY);
  assert.equal(ready.source_chain, "base");
  assert.equal(ready.canonical_payment_key_sha256, CANONICAL_KEY);
  assert.match(ready.policy_fingerprint_sha256, /^[0-9a-f]{64}$/);
  assert.equal(ready.composition_status, "dry_run");
  assert.equal(ready.composition_applied, false);
  assert.match(ready.preparation_fingerprint_sha256, /^[0-9a-f]{64}$/);
  assert.match(ready.transaction_plan_fingerprint_sha256, /^[0-9a-f]{64}$/);
  assert.match(ready.unsigned_transaction_fingerprint_sha256, /^[0-9a-f]{64}$/);
  assert.match(ready.request_fingerprint_sha256, /^[0-9a-f]{64}$/);
  assert.match(ready.request_idempotency_key_sha256, /^[0-9a-f]{64}$/);
  assert.equal(ready.filesystem_write_performed, false);
  assert.equal(ready.signer_access_performed, false);
  assert.equal(ready.signing_performed, false);
  assert.equal(ready.submission_guard_claimed, false);
  assert.equal(ready.transaction_broadcast_performed, false);
  assert.equal(ready.receipt_verified, false);
  assert.equal(ready.saga_mutation_performed, false);
  assert.equal(ready.inventory_mutation_performed, false);
  assert.equal(ready.public_fulfilled_closeout_performed, false);
  assert.equal(ready.money_movement_performed, false);
  assert.deepEqual(
    value.calls.planning.map((call) => call.method),
    [
      "eth_chainId",
      "eth_getTransactionCount",
      "eth_gasPrice",
      "eth_estimateGas",
      "eth_getBalance",
    ],
  );
  assert.deepEqual(
    {
      read_attempt: value.calls.read_attempt,
      list_intents: value.calls.list_intents,
      list_inventory: value.calls.list_inventory,
      finality: value.calls.finality,
      saga: value.calls.saga,
    },
    {
      read_attempt: 1,
      list_intents: 1,
      list_inventory: 1,
      finality: 1,
      saga: 1,
    },
  );
}

assert.equal(
  VOID_BUY_VOID_PAYMENT_KEYED_RUNTIME_PREFLIGHT_AUTHORITY_V1
    .attempt_id_only_future_caller_selector,
  true,
);
assert.equal(
  VOID_BUY_VOID_PAYMENT_KEYED_RUNTIME_PREFLIGHT_AUTHORITY_V1
    .production_durable_journal_readers_default,
  true,
);
assert.equal(
  VOID_BUY_VOID_PAYMENT_KEYED_RUNTIME_PREFLIGHT_AUTHORITY_V1
    .inventory_reservation_is_plan_reservation_authority,
  true,
);
assert.equal(
  VOID_BUY_VOID_PAYMENT_KEYED_RUNTIME_PREFLIGHT_AUTHORITY_V1
    .runtime_route_mount,
  false,
);
assert.equal(
  VOID_BUY_VOID_PAYMENT_KEYED_RUNTIME_PREFLIGHT_AUTHORITY_V1.signing,
  false,
);
assert.equal(
  VOID_BUY_VOID_PAYMENT_KEYED_RUNTIME_PREFLIGHT_AUTHORITY_V1
    .transaction_broadcast,
  false,
);
assert.equal(
  VOID_BUY_VOID_PAYMENT_KEYED_RUNTIME_PREFLIGHT_AUTHORITY_V1
    .saga_mutation,
  false,
);

console.log("VOID_BUY_VOID_PAYMENT_KEYED_RUNTIME_PREFLIGHT_V1_PROOF_GREEN");
console.log("future_caller_selector=attempt_id_only");
console.log("server_policy_binding_required=true");
console.log("attempt_intent_inventory_derived_server_side=true");
console.log("saga_id_derived_server_side=true");
console.log("plan_reservation_id_derived_from_inventory=true");
console.log("forged_caller_saga_and_reservation_ignored=true");
console.log("source_finality_required=true");
console.log("composition_dry_run_required=true");
console.log("filesystem_write=false");
console.log("signer_access=false");
console.log("signing=false");
console.log("submission_guard_claim=false");
console.log("transaction_broadcast=false");
console.log("saga_mutation=false");
console.log("inventory_mutation=false");
console.log("public_fulfilled_closeout=false");
console.log("money_movement=false");
