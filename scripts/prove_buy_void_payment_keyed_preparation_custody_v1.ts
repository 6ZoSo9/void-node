#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { Wallet } from "ethers";

import {
  VOID_BUY_VOID_EXECUTION_ATTEMPT_JOURNAL_V1,
  type BuyVoidExecutionAttemptStateV1,
} from "../src/economic/buy_void_execution_attempt_journal_v1.js";
import {
  VOID_BUY_VOID_SOURCE_FINALITY_EXECUTION_PREFLIGHT_V1,
} from "../src/economic/buy_void_source_finality_execution_preflight_v1.js";
import {
  buildBuyVoidPaymentKeyedFulfillmentCallV1,
} from "../src/economic/buy_void_payment_keyed_fulfillment_call_v1.js";
import {
  runBuyVoidPaymentKeyedTransactionPreparationV1,
  type BuyVoidPaymentKeyedTransactionPreparationRpcCallV1,
} from "../src/economic/buy_void_payment_keyed_transaction_preparation_v1.js";
import {
  buildBuyVoidPaymentKeyedUnsignedTransactionV1,
} from "../src/economic/buy_void_payment_keyed_unsigned_transaction_v1.js";
import {
  buildBuyVoidPaymentKeyedCustodianPrepareRequestV1,
} from "../src/economic/buy_void_payment_keyed_custodian_prepare_request_v1.js";
import {
  VOID_BUY_VOID_PAYMENT_KEYED_PREPARATION_CUSTODY_AUTHORITY_V1,
  VOID_BUY_VOID_PAYMENT_KEYED_PREPARATION_CUSTODY_CONFIRMATION_V1,
  VOID_BUY_VOID_PAYMENT_KEYED_PREPARATION_CUSTODY_V1,
  inspectBuyVoidPaymentKeyedPreparationCustodyFileV1,
  prepareBuyVoidPaymentKeyedPreparationCustodyV1,
  readBuyVoidPaymentKeyedPreparationCustodyRecordV1,
} from "../src/economic/buy_void_payment_keyed_preparation_custody_v1.js";

const IDENTITY = "voidpay1:base:0x" + "a".repeat(64) + ":7";
const ATTEMPT_ID = "1".repeat(64);
const LOCAL_KEY = "2".repeat(64);
const CANONICAL_KEY =
  "a06bb682bc6225c6697d0a37a51fc1323dc657eac74a51506ddb5d7daed82c85";
const DELIVERY = "0x" + "4".repeat(40);
const CONTRACT = "0x" + "5".repeat(40);
const SAGA_ID = "voidbvfsg1_" + "a".repeat(64);
const OTHER_SAGA_ID = "voidbvfsg1_" + "b".repeat(64);
const RESERVATION_ID = "c".repeat(64);
const wallet = new Wallet("0x" + "11".repeat(32));
const WALLET = wallet.address.toLowerCase();

function attempt(): BuyVoidExecutionAttemptStateV1 {
  return {
    reservation: {
      schema: "void_buy_void_execution_attempt_reservation_v1",
      marker: VOID_BUY_VOID_EXECUTION_ATTEMPT_JOURNAL_V1,
      attempt_id: ATTEMPT_ID,
      attempt_number: 1,
      reserved_at_ms: 1,
      payment_key_sha256: LOCAL_KEY,
      request_key_sha256: "7".repeat(64),
      canonical_payment_identity: IDENTITY,
      request_id: "payment-keyed-preparation-custody-v1",
      instruction_id: "8".repeat(64),
      intent_fingerprint: "9".repeat(64),
      max_attempts_per_payment: 1,
      unsigned_instruction: {
        schema: "void_buy_void_unsigned_fulfillment_instruction_v1",
        marker: "VOID_BUY_VOID_AUTO_FULFILLMENT_V1",
        instruction_id: "8".repeat(64),
        request_id: "payment-keyed-preparation-custody-v1",
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

const fulfillmentCall = buildBuyVoidPaymentKeyedFulfillmentCallV1({
  attempt: attempt(),
  source_finality: {
    ok: true,
    marker: VOID_BUY_VOID_SOURCE_FINALITY_EXECUTION_PREFLIGHT_V1,
    version: 1,
    status: "ready",
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
  },
  policy: {
    chain_id: "2050",
    fulfillment_contract_address: CONTRACT,
    max_void_amount_units: "10000000000000",
  },
});
if (fulfillmentCall.ok === false) throw new Error(fulfillmentCall.reason);
const readyFulfillmentCall =
  fulfillmentCall as Extract<typeof fulfillmentCall, { ok: true }>;

const policy = {
  enabled: true,
  chain_id: "2050" as const,
  rpc_url: "http://127.0.0.1:18545/",
  fulfillment_wallet_address: WALLET,
  fulfillment_contract_address: CONTRACT,
  max_void_amount_units: "10000000000000",
  gas_limit_multiplier_bps: "12000",
  max_gas_limit: "300000",
  fee_multiplier_bps: "20000",
  max_fee_per_gas_wei: "5000000000",
  max_priority_fee_per_gas_wei: "1000000000",
};

async function buildRequest(sagaId = SAGA_ID) {
  const calls: BuyVoidPaymentKeyedTransactionPreparationRpcCallV1[] = [];
  const planned = await runBuyVoidPaymentKeyedTransactionPreparationV1({
    attempt: attempt(),
    fulfillment_call: readyFulfillmentCall,
    policy,
    transport: async (call) => {
      calls.push(call);
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
  });
  if (planned.ok === false) throw new Error(planned.reason);

  const unsigned = buildBuyVoidPaymentKeyedUnsignedTransactionV1({
    attempt_id: ATTEMPT_ID,
    fulfillment_call: readyFulfillmentCall,
    plan: planned.transaction_plan,
    policy,
  });
  if (unsigned.ok === false) throw new Error(unsigned.reason);

  const prepared = buildBuyVoidPaymentKeyedCustodianPrepareRequestV1({
    saga_id: sagaId,
    attempt_id: ATTEMPT_ID,
    plan_reservation_id: RESERVATION_ID,
    fulfillment_call: readyFulfillmentCall,
    plan: planned.transaction_plan,
    unsigned_transaction: unsigned,
    policy,
  });
  if (prepared.ok === false) throw new Error(prepared.reason);

  return { request: prepared.request, calls };
}

const built = await buildRequest();
assert.deepEqual(
  built.calls.map((call) => call.method),
  [
    "eth_chainId",
    "eth_getTransactionCount",
    "eth_gasPrice",
    "eth_estimateGas",
    "eth_getBalance",
  ],
);

function signer(counter: { address: number; sign: number }) {
  return {
    async get_address() {
      counter.address += 1;
      return WALLET;
    },
    async sign_transaction(transaction: any) {
      counter.sign += 1;
      return await wallet.signTransaction({
        type: transaction.type,
        chainId: transaction.chainId,
        nonce: transaction.nonce,
        gasLimit: transaction.gasLimit,
        maxFeePerGas: transaction.maxFeePerGas,
        maxPriorityFeePerGas: transaction.maxPriorityFeePerGas,
        to: transaction.to,
        value: transaction.value,
        data: transaction.data,
      });
    },
  };
}

function noRawSignedTransactionKey(value: unknown): boolean {
  if (!value || typeof value !== "object") return true;
  if (Array.isArray(value)) return value.every(noRawSignedTransactionKey);
  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    if (key === "raw_signed_transaction") return false;
    if (!noRawSignedTransactionKey(nested)) return false;
  }
  return true;
}

{
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "void-pkc-dry-"));
  const count = { address: 0, sign: 0 };
  const dry = await prepareBuyVoidPaymentKeyedPreparationCustodyV1({
    root_dir: root,
    request: built.request,
    signer: signer(count),
    apply: false,
  });
  if (dry.ok === false) throw new Error(dry.reason);
  assert.equal(dry.status, "dry_run");
  assert.equal(dry.applied, false);
  assert.equal(dry.mutation_performed, false);
  assert.equal(dry.custody, null);
  assert.equal(count.address, 0);
  assert.equal(count.sign, 0);
  assert.equal(
    inspectBuyVoidPaymentKeyedPreparationCustodyFileV1({
      root_dir: root,
      attempt_id: ATTEMPT_ID,
    }).exists,
    false,
  );
  fs.rmSync(root, { recursive: true, force: true });
}

{
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "void-pkc-confirm-"));
  const count = { address: 0, sign: 0 };
  const held = await prepareBuyVoidPaymentKeyedPreparationCustodyV1({
    root_dir: root,
    request: built.request,
    signer: signer(count),
    apply: true,
    confirmation: "wrong",
  });
  assert.equal(held.ok, false);
  if (held.ok) throw new Error("wrong_confirmation_unexpected_ready");
  assert.equal(
    held.reason,
    "payment_keyed_preparation_custody_confirmation_required",
  );
  assert.equal(count.address, 0);
  assert.equal(count.sign, 0);
  fs.rmSync(root, { recursive: true, force: true });
}

{
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "void-pkc-crash1-"));
  const count = { address: 0, sign: 0 };
  const interrupted = await prepareBuyVoidPaymentKeyedPreparationCustodyV1({
    root_dir: root,
    request: built.request,
    signer: signer(count),
    apply: true,
    confirmation:
      VOID_BUY_VOID_PAYMENT_KEYED_PREPARATION_CUSTODY_CONFIRMATION_V1,
    fault_inject(stage) {
      if (stage === "after_first_sign_before_second_sign") {
        throw new Error("synthetic_after_first_sign");
      }
    },
  });
  assert.equal(interrupted.ok, false);
  if (interrupted.ok) throw new Error("first_crash_unexpected_ready");
  assert.equal(count.sign, 1);
  assert.equal(
    inspectBuyVoidPaymentKeyedPreparationCustodyFileV1({
      root_dir: root,
      attempt_id: ATTEMPT_ID,
    }).exists,
    false,
  );
  fs.rmSync(root, { recursive: true, force: true });
}

{
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "void-pkc-crash2-"));
  const count = { address: 0, sign: 0 };
  const interrupted = await prepareBuyVoidPaymentKeyedPreparationCustodyV1({
    root_dir: root,
    request: built.request,
    signer: signer(count),
    apply: true,
    confirmation:
      VOID_BUY_VOID_PAYMENT_KEYED_PREPARATION_CUSTODY_CONFIRMATION_V1,
    fault_inject(stage) {
      if (stage === "after_second_sign_before_record") {
        throw new Error("synthetic_after_second_sign");
      }
    },
  });
  assert.equal(interrupted.ok, false);
  if (interrupted.ok) throw new Error("second_crash_unexpected_ready");
  assert.equal(count.sign, 2);
  assert.equal(
    inspectBuyVoidPaymentKeyedPreparationCustodyFileV1({
      root_dir: root,
      attempt_id: ATTEMPT_ID,
    }).exists,
    false,
  );
  fs.rmSync(root, { recursive: true, force: true });
}

{
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "void-pkc-live-"));
  const count = { address: 0, sign: 0 };
  const first = await prepareBuyVoidPaymentKeyedPreparationCustodyV1({
    root_dir: root,
    request: built.request,
    signer: signer(count),
    apply: true,
    confirmation:
      VOID_BUY_VOID_PAYMENT_KEYED_PREPARATION_CUSTODY_CONFIRMATION_V1,
    now_ms: 123456789,
  });
  if (first.ok === false) throw new Error(first.reason);
  assert.equal(first.status, "prepared");
  assert.equal(first.applied, true);
  assert.equal(first.mutation_performed, true);
  assert.equal(count.address, 2);
  assert.equal(count.sign, 2);
  assert.equal(first.custody.marker, VOID_BUY_VOID_PAYMENT_KEYED_PREPARATION_CUSTODY_V1);
  assert.equal(first.custody.saga_id, SAGA_ID);
  assert.equal(first.custody.attempt_id, ATTEMPT_ID);
  assert.equal(first.custody.plan_reservation_id, RESERVATION_ID);
  assert.equal(first.custody.wallet_address, WALLET);
  assert.equal(first.custody.fulfillment_contract_address, CONTRACT);
  assert.equal(first.custody.delivery_address, DELIVERY);
  assert.equal(first.custody.deterministic_signing_verified, true);
  assert.match(first.custody.signed_transaction_hash, /^0x[0-9a-f]{64}$/);
  assert.match(first.custody.raw_signed_transaction_sha256, /^[0-9a-f]{64}$/);
  assert.equal(first.raw_signed_transaction_persisted, false);
  assert.equal(first.raw_signed_transaction_returned, false);
  assert.equal(first.transaction_broadcast_performed, false);
  assert.equal(first.money_movement_performed, false);
  assert.equal(noRawSignedTransactionKey(first), true);

  const file = inspectBuyVoidPaymentKeyedPreparationCustodyFileV1({
    root_dir: root,
    attempt_id: ATTEMPT_ID,
  });
  assert.equal(file.exists, true);
  assert.equal(file.direct_file, true);
  assert.equal(file.symlink, false);
  assert.equal(file.mode, 0o600);

  const record = readBuyVoidPaymentKeyedPreparationCustodyRecordV1({
    root_dir: root,
    attempt_id: ATTEMPT_ID,
  });
  assert.ok(record);
  assert.equal(record!.recorded_at_ms, 123456789);
  assert.deepEqual(record!.request, built.request);
  assert.equal(
    record!.signed_transaction_hash,
    first.custody.signed_transaction_hash,
  );
  assert.equal(
    record!.raw_signed_transaction_sha256,
    first.custody.raw_signed_transaction_sha256,
  );
  assert.equal(record!.raw_signed_transaction_persisted, false);
  assert.equal(record!.raw_signed_transaction_returned, false);
  assert.equal(noRawSignedTransactionKey(record), true);

  const recordFile = path.join(
    root,
    "buy-void-payment-keyed-preparation-custody-v1",
    "records",
    ATTEMPT_ID + ".json",
  );
  const before = fs.readFileSync(recordFile, "utf8");
  assert.equal(before.includes('"raw_signed_transaction":'), false);
  assert.equal(before.includes('"raw_signed_transaction":'), false);

  const duplicate = await prepareBuyVoidPaymentKeyedPreparationCustodyV1({
    root_dir: root,
    request: built.request,
    signer: signer(count),
    apply: true,
    confirmation:
      VOID_BUY_VOID_PAYMENT_KEYED_PREPARATION_CUSTODY_CONFIRMATION_V1,
  });
  if (duplicate.ok === false) throw new Error(duplicate.reason);
  assert.equal(duplicate.status, "duplicate");
  assert.equal(duplicate.mutation_performed, false);
  assert.equal(count.address, 3);
  assert.equal(count.sign, 3);
  assert.equal(
    duplicate.custody.signed_transaction_hash,
    first.custody.signed_transaction_hash,
  );
  assert.equal(
    duplicate.custody.raw_signed_transaction_sha256,
    first.custody.raw_signed_transaction_sha256,
  );
  assert.equal(fs.readFileSync(recordFile, "utf8"), before);

  const other = await buildRequest(OTHER_SAGA_ID);
  const conflict = await prepareBuyVoidPaymentKeyedPreparationCustodyV1({
    root_dir: root,
    request: other.request,
    signer: signer(count),
    apply: true,
    confirmation:
      VOID_BUY_VOID_PAYMENT_KEYED_PREPARATION_CUSTODY_CONFIRMATION_V1,
  });
  assert.equal(conflict.ok, false);
  if (conflict.ok) throw new Error("request_conflict_unexpected_ready");
  assert.equal(
    conflict.reason,
    "payment_keyed_preparation_custody_existing_invalid",
  );
  assert.equal(count.sign, 3);

  fs.rmSync(root, { recursive: true, force: true });
}

for (const [key, expected] of Object.entries({
  source_only_contract: true,
  exact_payment_keyed_custodian_request_required: true,
  deterministic_double_sign_before_first_persistence: true,
  recovery_resign_exact_request_required: true,
  recovery_raw_bytes_must_match_sha256: true,
  raw_signed_transaction_input: false,
  raw_signed_transaction_persistence: false,
  raw_signed_transaction_output: false,
  transaction_broadcast: false,
  saga_mutation: false,
  execution_attempt_mutation: false,
  inventory_mutation: false,
  public_fulfilled_closeout: false,
  runtime_route_mount: false,
  automatic_retry: false,
  money_movement: false,
})) {
  assert.equal(
    (VOID_BUY_VOID_PAYMENT_KEYED_PREPARATION_CUSTODY_AUTHORITY_V1 as any)[key],
    expected,
    key,
  );
}

console.log("VOID_BUY_VOID_PAYMENT_KEYED_PREPARATION_CUSTODY_V1_PROOF_GREEN");
console.log("exact_request_persisted=true");
console.log("deterministic_double_sign_before_first_persistence=true");
console.log("crash_after_first_sign_record_absent=true");
console.log("crash_after_second_sign_record_absent=true");
console.log("recovery_resigns_exact_request=true");
console.log("recovery_signed_bytes_sha256_stable=true");
console.log("private_record_mode_0600=true");
console.log("raw_signed_transaction_persisted=false");
console.log("raw_signed_transaction_returned=false");
console.log("transaction_broadcast=false");
console.log("saga_mutation=false");
console.log("execution_attempt_mutation=false");
console.log("inventory_mutation=false");
console.log("public_fulfilled_closeout=false");
console.log("runtime_route_mount=false");
console.log("money_movement=false");
