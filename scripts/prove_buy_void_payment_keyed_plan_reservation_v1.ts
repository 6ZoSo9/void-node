#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

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
  VOID_BUY_VOID_PAYMENT_KEYED_PLAN_RESERVATION_AUTHORITY_V1,
  VOID_BUY_VOID_PAYMENT_KEYED_PLAN_RESERVATION_V1,
  inspectBuyVoidPaymentKeyedPlanReservationPathsV1,
  listBuyVoidPaymentKeyedPlanReservationsV1,
  reserveBuyVoidPaymentKeyedPlanV1,
} from "../src/economic/buy_void_payment_keyed_plan_reservation_v1.js";

const WALLET = "0x1111111111111111111111111111111111111111";
const CONTRACT = "0x2222222222222222222222222222222222222222";
const DELIVERY_A = "0x3333333333333333333333333333333333333333";
const DELIVERY_B = "0x4444444444444444444444444444444444444444";
const RUNTIME_POLICY = "a".repeat(64);
const PREPARATION_POLICY = "b".repeat(64);
const SAGA_A = "voidbvfsg1_" + "c".repeat(64);
const SAGA_B = "voidbvfsg1_" + "d".repeat(64);
const ATTEMPT_A = "1".repeat(64);
const ATTEMPT_B = "2".repeat(64);

function sha256(value: string): string {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

function attempt(
  attemptId: string,
  identityHash: string,
  delivery: string,
): BuyVoidExecutionAttemptStateV1 {
  const identity = "voidpay1:base:0x" + identityHash.repeat(64) + ":7";
  return {
    reservation: {
      schema: "void_buy_void_execution_attempt_reservation_v1",
      marker: VOID_BUY_VOID_EXECUTION_ATTEMPT_JOURNAL_V1,
      attempt_id: attemptId,
      attempt_number: 1,
      reserved_at_ms: 1,
      payment_key_sha256: "e".repeat(64),
      request_key_sha256: "f".repeat(64),
      canonical_payment_identity: identity,
      request_id: "payment-keyed-plan-" + attemptId.slice(0, 8),
      instruction_id: "9".repeat(64),
      intent_fingerprint: "8".repeat(64),
      max_attempts_per_payment: 1,
      unsigned_instruction: {
        schema: "void_buy_void_unsigned_fulfillment_instruction_v1",
        marker: "VOID_BUY_VOID_AUTO_FULFILLMENT_V1",
        instruction_id: "9".repeat(64),
        request_id: "payment-keyed-plan-" + attemptId.slice(0, 8),
        canonical_payment_identity: identity,
        source_chain: "base",
        payment_transaction_hash:
          "0x" + identityHash.repeat(64),
        payment_log_index: "7",
        delivery_address: delivery,
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

function fulfillmentCall(
  attemptId: string,
  identityHash: string,
  delivery: string,
) {
  const state = attempt(attemptId, identityHash, delivery);
  const identity = state.reservation.canonical_payment_identity;
  const identityBytes = Buffer.from(identity, "utf8");
  const identityLength = Buffer.alloc(4);
  identityLength.writeUInt32BE(identityBytes.length, 0);
  const paymentKey = crypto
    .createHash("sha256")
    .update(
      Buffer.concat([
        Buffer.from("VOID_BUY_VOID_FULFILLMENT_ANCHOR_V1\0", "ascii"),
        identityLength,
        identityBytes,
      ]),
    )
    .digest("hex");
  const decision = buildBuyVoidPaymentKeyedFulfillmentCallV1({
    attempt: state,
    source_finality: {
      ok: true,
      marker: VOID_BUY_VOID_SOURCE_FINALITY_EXECUTION_PREFLIGHT_V1,
      version: 1,
      status: "ready",
      attempt_id: attemptId,
      source_chain: "base",
      canonical_payment_identity: identity,
      payment_key_sha256: paymentKey,
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
  if (decision.ok === false) throw new Error(decision.reason);
  return decision;
}

const callA = fulfillmentCall(ATTEMPT_A, "a", DELIVERY_A);
const callB = fulfillmentCall(ATTEMPT_B, "b", DELIVERY_B);

function input(
  root: string,
  attemptId: string,
  sagaId: string,
  call: typeof callA,
  observedPendingNonce: number,
  overrides: Record<string, unknown> = {},
) {
  return {
    root_dir: root,
    saga_id: sagaId,
    attempt_id: attemptId,
    wallet_address: WALLET,
    observed_pending_nonce: observedPendingNonce,
    fulfillment_call: call,
    gas_limit: "120000",
    max_fee_per_gas_wei: "2000000000",
    max_priority_fee_per_gas_wei: "1000000000",
    runtime_policy_fingerprint_sha256: RUNTIME_POLICY,
    preparation_policy_fingerprint_sha256: PREPARATION_POLICY,
    ...overrides,
  } as any;
}

const root = fs.mkdtempSync(
  path.join(os.tmpdir(), "void-payment-keyed-plan-"),
);

const first = reserveBuyVoidPaymentKeyedPlanV1(
  input(root, ATTEMPT_A, SAGA_A, callA, 7, { now_ms: 1000 }),
);
if (first.ok === false) throw new Error(first.reason);
assert.equal(first.status, "reserved");
assert.equal(first.duplicate, false);
assert.equal(first.mutation_performed, true);
assert.equal(first.reservation.marker, VOID_BUY_VOID_PAYMENT_KEYED_PLAN_RESERVATION_V1);
assert.equal(first.reservation.nonce, 7);
assert.deepEqual(first.reservation.fulfillment_call, callA);
assert.equal(first.reservation.wallet_address, WALLET);
assert.equal(first.reservation.reservation_status, "reserved");
assert.equal(first.reservation.nonce_release_authorized, false);
assert.equal(first.signing_performed, false);
assert.equal(first.transaction_broadcast_performed, false);
assert.equal(first.raw_signed_transaction_persisted, false);
assert.equal(first.money_movement_performed, false);

const expectedPlanFingerprint = sha256(
  [
    "chain_id=2050",
    "nonce=7",
    "gas_limit=120000",
    "max_fee_per_gas_wei=2000000000",
    "max_priority_fee_per_gas_wei=1000000000",
  ].join("\n"),
);
assert.equal(
  first.reservation.transaction_plan_fingerprint_sha256,
  expectedPlanFingerprint,
);
assert.deepEqual(first.transaction_plan, {
  chain_id: "2050",
  nonce: 7,
  gas_limit: "120000",
  max_fee_per_gas_wei: "2000000000",
  max_priority_fee_per_gas_wei: "1000000000",
});

const duplicate = reserveBuyVoidPaymentKeyedPlanV1(
  input(root, ATTEMPT_A, SAGA_A, callA, 7),
);
if (duplicate.ok === false) throw new Error(duplicate.reason);
assert.equal(duplicate.status, "duplicate");
assert.equal(duplicate.reservation.reservation_id, first.reservation.reservation_id);
assert.equal(duplicate.reservation.nonce, 7);

const second = reserveBuyVoidPaymentKeyedPlanV1(
  input(root, ATTEMPT_B, SAGA_B, callB, 7, { now_ms: 2000 }),
);
if (second.ok === false) throw new Error(second.reason);
assert.equal(second.status, "reserved");
assert.equal(second.reservation.nonce, 8);
assert.notEqual(
  second.reservation.reservation_id,
  first.reservation.reservation_id,
);

const listed = listBuyVoidPaymentKeyedPlanReservationsV1({
  root_dir: root,
  wallet_address: WALLET,
});
assert.deepEqual(
  listed.map((record) => [record.attempt_id, record.nonce]),
  [
    [ATTEMPT_A, 7],
    [ATTEMPT_B, 8],
  ],
);

const paths = inspectBuyVoidPaymentKeyedPlanReservationPathsV1({
  root_dir: root,
  wallet_address: WALLET,
});
assert.deepEqual(paths, {
  root_exists: true,
  wallet_exists: true,
  nonces_exists: true,
  attempts_exists: true,
});

const walletKey = sha256(
  "void-buy-payment-keyed-wallet-v1\n2050\n" + WALLET,
);
const walletRoot = path.join(
  root,
  "buy-void-payment-keyed-plan-reservation-v1",
  "wallets",
  walletKey,
);
const nonce7 = path.join(walletRoot, "nonces", "0000000000000007.json");
const nonce8 = path.join(walletRoot, "nonces", "0000000000000008.json");
const indexA = path.join(walletRoot, "attempts", ATTEMPT_A + ".json");
assert.equal(fs.statSync(nonce7).mode & 0o777, 0o600);
assert.equal(fs.statSync(nonce8).mode & 0o777, 0o600);
assert.equal(fs.statSync(indexA).mode & 0o777, 0o600);

fs.unlinkSync(indexA);
const recovered = reserveBuyVoidPaymentKeyedPlanV1(
  input(root, ATTEMPT_A, SAGA_A, callA, 7),
);
if (recovered.ok === false) throw new Error(recovered.reason);
assert.equal(recovered.status, "duplicate");
assert.equal(recovered.recovered_attempt_index, true);
assert.equal(recovered.mutation_performed, true);
assert.equal(fs.existsSync(indexA), true);

const changedGas = reserveBuyVoidPaymentKeyedPlanV1(
  input(root, ATTEMPT_A, SAGA_A, callA, 7, {
    gas_limit: "120001",
  }),
);
assert.equal(changedGas.ok, false);
if (changedGas.ok) throw new Error("changed_template_unexpected_ready");
assert.equal(changedGas.reason, "payment_keyed_plan_reservation_failed");
assert.match(
  String(changedGas.detail?.message || ""),
  /payment_keyed_plan_attempt_binding_conflict/,
);

const staleFloor = reserveBuyVoidPaymentKeyedPlanV1(
  input(root, ATTEMPT_A, SAGA_A, callA, 9),
);
assert.equal(staleFloor.ok, false);
if (staleFloor.ok) throw new Error("stale_floor_unexpected_ready");
assert.match(
  String(staleFloor.detail?.message || ""),
  /payment_keyed_plan_reserved_nonce_below_observed_pending/,
);

const wrongCall = reserveBuyVoidPaymentKeyedPlanV1(
  input(root, ATTEMPT_A, SAGA_A, callB as any, 7),
);
assert.equal(wrongCall.ok, false);
if (wrongCall.ok) throw new Error("wrong_call_unexpected_ready");

const malformed = reserveBuyVoidPaymentKeyedPlanV1({
  ...input(root, ATTEMPT_A, SAGA_A, callA, 7),
  fulfillment_call: {
    ...callA,
    calldata_sha256: "0".repeat(64),
  },
});
assert.equal(malformed.ok, false);
if (malformed.ok) throw new Error("malformed_call_unexpected_ready");
assert.equal(
  malformed.reason,
  "payment_keyed_plan_fulfillment_call_invalid",
);

for (const [key, expected] of Object.entries({
  source_only_contract: true,
  one_wallet_nonce_per_reservation: true,
  wallet_scoped_nonce_allocation_lock: true,
  crash_recoverable_attempt_index: true,
  concurrent_attempt_collision_safe: true,
  observed_pending_nonce_is_floor_only: true,
  reserved_nonce_below_observed_pending_fails_closed: true,
  exact_payment_keyed_fulfillment_call_bound: true,
  fulfillment_contract_target_bound: true,
  canonical_payment_identity_bound: true,
  canonical_payment_key_bound: true,
  exact_calldata_bound: true,
  exact_recipient_and_amount_bound: true,
  canonical_transaction_plan_fingerprint: true,
  nonce_release: false,
  filesystem_read: true,
  filesystem_write: true,
  rpc_call: false,
  credential_access: false,
  wallet_access: false,
  signing: false,
  transaction_broadcast: false,
  raw_signed_transaction_input: false,
  raw_signed_transaction_persistence: false,
  runtime_route_mount: false,
  money_movement: false,
})) {
  assert.equal(
    (VOID_BUY_VOID_PAYMENT_KEYED_PLAN_RESERVATION_AUTHORITY_V1 as any)[key],
    expected,
    key,
  );
}

fs.rmSync(root, { recursive: true, force: true });

console.log("VOID_BUY_VOID_PAYMENT_KEYED_PLAN_RESERVATION_V1_PROOF_GREEN");
console.log("wallet_scoped_nonce_allocation=true");
console.log("observed_pending_nonce_is_floor_only=true");
console.log("first_attempt_nonce=7");
console.log("second_attempt_same_wallet_nonce=8");
console.log("attempt_index_crash_recovery=true");
console.log("same_attempt_changed_template_rejected=true");
console.log("reserved_nonce_below_new_pending_floor_rejected=true");
console.log("fulfillment_contract_bound=true");
console.log("canonical_payment_identity_and_key_bound=true");
console.log("exact_calldata_bound=true");
console.log("recipient_and_amount_bound=true");
console.log("canonical_transaction_plan_fingerprint=true");
console.log("nonce_release=false");
console.log("signing=false");
console.log("transaction_broadcast=false");
console.log("raw_signed_transaction_persisted=false");
console.log("runtime_route_mount=false");
console.log("money_movement=false");
