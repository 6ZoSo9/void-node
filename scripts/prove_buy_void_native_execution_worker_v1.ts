import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  Transaction,
  Wallet,
} from "ethers";
import type {
  BuyVoidFulfillmentJournalIntentV1,
} from "../src/economic/buy_void_fulfillment_journal_v1.js";
import type {
  BuyVoidExecutionAttemptPolicyV1,
} from "../src/economic/buy_void_execution_attempt_journal_v1.js";
import {
  runBuyVoidAutoReservePlanWorkerV1,
  VOID_BUY_VOID_AUTO_RESERVE_PLAN_CONFIRMATION_V1,
  type BuyVoidAutoReservePlanWorkerPolicyV1,
} from "../src/economic/buy_void_auto_reserve_plan_worker_v1.js";
import type {
  BuyVoidInventoryReservationPolicyV1,
} from "../src/economic/buy_void_inventory_reservation_journal_v1.js";
import {
  VOID_BUY_VOID_NATIVE_EXECUTION_AUTHORITY_V1,
  VOID_BUY_VOID_NATIVE_EXECUTION_CONFIRMATION_V1,
  VOID_BUY_VOID_NATIVE_EXECUTION_WORKER_V1,
  runBuyVoidNativeExecutionWorkerV1,
  type BuyVoidNativeExecutionWorkerPolicyV1,
} from "../src/economic/buy_void_native_execution_worker_v1.js";

function hash(char: string): string {
  return char.repeat(64);
}

function txHash(char: string): string {
  return `0x${char.repeat(64)}`;
}

function address(char: string): string {
  return `0x${char.repeat(40)}`;
}

function makeIntent(
  index: number,
  amount = "400",
): BuyVoidFulfillmentJournalIntentV1 {
  const digit = String((index % 8) + 1);
  const requestId = `buyvoid_native_execute_request_${index}`;
  const instructionId = `voidfill1_${digit.repeat(32)}`;
  const paymentIdentity =
    `voidpay1:base:${txHash(digit)}:${index}`;

  return {
    schema: "void_buy_void_fulfillment_journal_intent_v1",
    marker: "VOID_BUY_VOID_FULFILLMENT_JOURNAL_V1",
    created_at_ms: 1_700_000_000_000 + index,
    payment_key_sha256: hash(digit),
    request_key_sha256: hash(String(((index + 1) % 8) + 1)),
    claim: {
      schema: "void_buy_void_fulfillment_claim_v1",
      marker: "VOID_BUY_VOID_AUTO_FULFILLMENT_V1",
      canonical_payment_identity: paymentIdentity,
      canonical_payment_identity_sha256:
        hash(String(((index + 2) % 8) + 1)),
      request_id: requestId,
      decision_fingerprint:
        hash(String(((index + 3) % 8) + 1)),
      instruction_id: instructionId,
      unsigned_instruction: {
        schema:
          "void_buy_void_unsigned_fulfillment_instruction_v1",
        marker: "VOID_BUY_VOID_AUTO_FULFILLMENT_V1",
        instruction_id: instructionId,
        request_id: requestId,
        canonical_payment_identity: paymentIdentity,
        source_chain: "base",
        payment_transaction_hash: txHash(digit),
        payment_log_index: String(index),
        confirmed_block_number: "12345678",
        confirmation_count: "12",
        payment_usdc_units: "1000000",
        delivery_address: address(digit),
        void_amount_units: amount,
        signing_authorized: false,
        transaction_broadcast_authorized: false,
        automatic_execution_authorized: false,
      },
      status: "claimed",
    },
    verification_binding: {
      source_chain: "base",
      payment_transaction_hash: txHash(digit),
      payment_log_index: String(index),
      confirmed_block_number: "12345678",
      confirmation_count_at_claim: "12",
      usdc_contract: address("a"),
      payer_address: address(digit),
      receive_address: address("b"),
      delivery_address: address(digit),
      payment_usdc_units: "1000000",
      requested_usdc_units: "1000000",
      quoted_void_units: amount,
    },
    signing_authorized: false,
    transaction_broadcast_authorized: false,
    money_movement_authorized: false,
  };
}

const wallet = new Wallet(
  "0x059c6995e998f97a5a0044966f0945389dc9e86dae88c7a841f4603b6b78690d",
);
const walletAddress = wallet.address.toLowerCase();

function reserveWorkerPolicy(): BuyVoidAutoReservePlanWorkerPolicyV1 {
  return {
    enabled: true,
    accepted_claim_status: "claimed",
    execution_chain_id: "2050",
    max_attempts_per_payment: 1,
    max_void_amount_units: "700",
  };
}

function inventoryPolicy(): BuyVoidInventoryReservationPolicyV1 {
  return {
    inventory_reservation_enabled: true,
    pool_id: "void-presale-mainnet0-v1",
    inventory_policy_version: "fixed-cap-v1",
    pool_capacity_void_units: "1000000",
    max_reservation_void_units: "700",
  };
}

function executionPolicy(): BuyVoidExecutionAttemptPolicyV1 {
  return {
    attempt_journal_enabled: true,
    max_attempts_per_payment: 1,
    chain_id: "2050",
    fulfillment_wallet_allowlist: [walletAddress],
  };
}

function executionWorkerPolicy(): BuyVoidNativeExecutionWorkerPolicyV1 {
  return {
    enabled: true,
    asset_mode: "native_void",
    chain_id: "2050",
    pool_id: inventoryPolicy().pool_id,
    fulfillment_wallet_address: walletAddress,
    max_void_amount_units: "700",
    max_gas_limit: "21000",
    max_fee_per_gas_wei: "100000000000",
    max_priority_fee_per_gas_wei: "10000000000",
  };
}

function transactionPlan(nonce: number) {
  return {
    chain_id: "2050",
    nonce,
    gas_limit: "21000",
    max_fee_per_gas_wei: "2000000000",
    max_priority_fee_per_gas_wei: "1000000000",
  };
}

function createReservedPlan(root: string, index: number) {
  const intent = makeIntent(index);
  const reserved = runBuyVoidAutoReservePlanWorkerV1({
    root_dir: root,
    intent,
    worker_policy: reserveWorkerPolicy(),
    inventory_policy: inventoryPolicy(),
    execution_policy: executionPolicy(),
    apply: true,
    confirmation:
      VOID_BUY_VOID_AUTO_RESERVE_PLAN_CONFIRMATION_V1,
    now_ms: 1_700_000_010_000 + index,
  });
  assert.equal(reserved.ok, true);
  if (!reserved.ok) throw new Error("reserve plan held");
  return { intent, plan: reserved.plan };
}

function heldReason(value: Awaited<ReturnType<
  typeof runBuyVoidNativeExecutionWorkerV1
>>): string {
  assert.equal(value.ok, false);
  if (value.ok) throw new Error("expected held native execution");
  return value.reason;
}

assert.equal(
  VOID_BUY_VOID_NATIVE_EXECUTION_WORKER_V1,
  "VOID_BUY_VOID_NATIVE_EXECUTION_WORKER_V1",
);
assert.equal(
  VOID_BUY_VOID_NATIVE_EXECUTION_CONFIRMATION_V1,
  "buyVoidNativeExecuteReservedPlan",
);
assert.equal(
  VOID_BUY_VOID_NATIVE_EXECUTION_AUTHORITY_V1.one_request_per_run,
  true,
);
assert.equal(
  VOID_BUY_VOID_NATIVE_EXECUTION_AUTHORITY_V1.disabled_by_policy_default,
  true,
);
assert.equal(
  VOID_BUY_VOID_NATIVE_EXECUTION_AUTHORITY_V1.runtime_route_mount,
  false,
);
assert.equal(
  VOID_BUY_VOID_NATIVE_EXECUTION_AUTHORITY_V1.automatic_retry,
  false,
);
assert.equal(
  VOID_BUY_VOID_NATIVE_EXECUTION_AUTHORITY_V1.inventory_decrement,
  false,
);

const root = fs.mkdtempSync(
  path.join(os.tmpdir(), "void-buy-native-execute-proof-"),
);

try {
  const prepared = createReservedPlan(root, 1);
  let signerCalls = 0;
  let broadcasterCalls = 0;

  const dry = await runBuyVoidNativeExecutionWorkerV1({
    root_dir: root,
    intent: prepared.intent,
    bounded_plan: prepared.plan,
    worker_policy: executionWorkerPolicy(),
    execution_policy: executionPolicy(),
    transaction_plan: transactionPlan(7),
    apply: false,
    dependencies: {
      signer: {
        async get_address() {
          signerCalls += 1;
          return walletAddress;
        },
        async sign_transaction(transaction) {
          signerCalls += 1;
          return await wallet.signTransaction(transaction);
        },
      },
      broadcaster: {
        async broadcast_signed_transaction() {
          broadcasterCalls += 1;
          return { accepted: false };
        },
      },
    },
  });
  assert.equal(dry.ok, true);
  assert.equal(dry.status, "dry_run");
  if (!dry.ok || dry.status !== "dry_run") {
    throw new Error("dry native execution held");
  }
  assert.equal(dry.preview.native_value_wei, "400000000000000");
  assert.equal(dry.signing_performed, false);
  assert.equal(dry.transaction_broadcast_performed, false);
  assert.equal(signerCalls, 0);
  assert.equal(broadcasterCalls, 0);

  const missingConfirmation =
    await runBuyVoidNativeExecutionWorkerV1({
      root_dir: root,
      intent: prepared.intent,
      bounded_plan: prepared.plan,
      worker_policy: executionWorkerPolicy(),
      execution_policy: executionPolicy(),
      transaction_plan: transactionPlan(7),
      submission_idempotency_key: hash("9"),
      apply: true,
      dependencies: {
        signer: {
          async get_address() {
            signerCalls += 1;
            return walletAddress;
          },
          async sign_transaction(transaction) {
            signerCalls += 1;
            return await wallet.signTransaction(transaction);
          },
        },
        broadcaster: {
          async broadcast_signed_transaction() {
            broadcasterCalls += 1;
            return { accepted: false };
          },
        },
      },
    });
  assert.equal(
    heldReason(missingConfirmation),
    "explicit_confirmation_required",
  );
  assert.equal(signerCalls, 0);
  assert.equal(broadcasterCalls, 0);

  const accepted = await runBuyVoidNativeExecutionWorkerV1({
    root_dir: root,
    intent: prepared.intent,
    bounded_plan: prepared.plan,
    worker_policy: executionWorkerPolicy(),
    execution_policy: executionPolicy(),
    transaction_plan: transactionPlan(7),
    submission_idempotency_key: hash("9"),
    apply: true,
    confirmation:
      VOID_BUY_VOID_NATIVE_EXECUTION_CONFIRMATION_V1,
    now_ms: 1_700_000_020_000,
    dependencies: {
      signer: {
        async get_address() {
          signerCalls += 1;
          return walletAddress;
        },
        async sign_transaction(transaction) {
          signerCalls += 1;
          return await wallet.signTransaction(transaction);
        },
      },
      broadcaster: {
        async broadcast_signed_transaction(raw) {
          broadcasterCalls += 1;
          const transaction = Transaction.from(raw);
          return {
            accepted: true,
            transaction_hash: transaction.hash,
            provider_submission_id: "proof-provider-1",
            submission_may_have_occurred: true,
          };
        },
      },
    },
  });
  assert.equal(accepted.ok, true);
  assert.equal(accepted.status, "broadcast_accepted");
  if (!accepted.ok || accepted.status !== "broadcast_accepted") {
    throw new Error("accepted native execution held");
  }
  assert.equal(accepted.attempt.status, "broadcast");
  assert.equal(accepted.signing_performed, true);
  assert.equal(accepted.transaction_broadcast_performed, true);
  assert.equal(accepted.raw_signed_transaction_persisted, false);
  assert.equal(accepted.raw_signed_transaction_returned, false);
  assert.equal(accepted.automatic_retry_allowed, false);
  assert.equal(signerCalls, 2);
  assert.equal(broadcasterCalls, 1);

  const duplicateAfterBroadcast =
    await runBuyVoidNativeExecutionWorkerV1({
      root_dir: root,
      intent: prepared.intent,
      bounded_plan: prepared.plan,
      worker_policy: executionWorkerPolicy(),
      execution_policy: executionPolicy(),
      transaction_plan: transactionPlan(7),
      submission_idempotency_key: hash("9"),
      apply: true,
      confirmation:
        VOID_BUY_VOID_NATIVE_EXECUTION_CONFIRMATION_V1,
      dependencies: {
        signer: {
          async get_address() {
            signerCalls += 1;
            return walletAddress;
          },
          async sign_transaction(transaction) {
            signerCalls += 1;
            return await wallet.signTransaction(transaction);
          },
        },
        broadcaster: {
          async broadcast_signed_transaction() {
            broadcasterCalls += 1;
            return { accepted: true };
          },
        },
      },
    });
  assert.equal(
    heldReason(duplicateAfterBroadcast),
    "execution_attempt_not_clean_or_binding_mismatch",
  );
  assert.equal(signerCalls, 2);
  assert.equal(broadcasterCalls, 1);

  const heldRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), "void-buy-native-not-broadcast-"),
  );
  try {
    const item = createReservedPlan(heldRoot, 2);
    const notBroadcast = await runBuyVoidNativeExecutionWorkerV1({
      root_dir: heldRoot,
      intent: item.intent,
      bounded_plan: item.plan,
      worker_policy: executionWorkerPolicy(),
      execution_policy: executionPolicy(),
      transaction_plan: transactionPlan(8),
      submission_idempotency_key: hash("8"),
      apply: true,
      confirmation:
        VOID_BUY_VOID_NATIVE_EXECUTION_CONFIRMATION_V1,
      dependencies: {
        signer: {
          async get_address() {
            return walletAddress;
          },
          async sign_transaction(transaction) {
            return await wallet.signTransaction(transaction);
          },
        },
        broadcaster: {
          async broadcast_signed_transaction() {
            return {
              accepted: false,
              provider_submission_id: "proof-provider-2",
              submission_may_have_occurred: false,
            };
          },
        },
      },
    });
    assert.equal(notBroadcast.ok, false);
    assert.equal(notBroadcast.status, "not_broadcast");
    assert.equal(
      heldReason(notBroadcast),
      "broadcast_definitively_not_submitted",
    );
    assert.equal(notBroadcast.reconciliation_required, false);
    assert.equal(notBroadcast.automatic_retry_allowed, false);
  } finally {
    fs.rmSync(heldRoot, { recursive: true, force: true });
  }

  const unknownRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), "void-buy-native-unknown-"),
  );
  try {
    const item = createReservedPlan(unknownRoot, 3);
    const unknown = await runBuyVoidNativeExecutionWorkerV1({
      root_dir: unknownRoot,
      intent: item.intent,
      bounded_plan: item.plan,
      worker_policy: executionWorkerPolicy(),
      execution_policy: executionPolicy(),
      transaction_plan: transactionPlan(9),
      submission_idempotency_key: hash("7"),
      apply: true,
      confirmation:
        VOID_BUY_VOID_NATIVE_EXECUTION_CONFIRMATION_V1,
      dependencies: {
        signer: {
          async get_address() {
            return walletAddress;
          },
          async sign_transaction(transaction) {
            return await wallet.signTransaction(transaction);
          },
        },
        broadcaster: {
          async broadcast_signed_transaction() {
            throw new Error("proof_network_unknown");
          },
        },
      },
    });
    assert.equal(unknown.ok, false);
    assert.equal(unknown.status, "broadcast_unknown");
    assert.equal(
      heldReason(unknown),
      "broadcast_submission_exception_unknown",
    );
    assert.equal(unknown.reconciliation_required, true);
    assert.equal(unknown.automatic_retry_allowed, false);
  } finally {
    fs.rmSync(unknownRoot, { recursive: true, force: true });
  }

  console.log("VOID_BUY_VOID_NATIVE_EXECUTION_WORKER_V1_GREEN");
  console.log("one_request_per_run=1");
  console.log("dry_by_default=1");
  console.log("exact_confirmation_required=1");
  console.log("inventory_reservation_required=1");
  console.log("execution_attempt_reservation_required=1");
  console.log("durable_submission_guard=1");
  console.log("signing_when_applied=1");
  console.log("transaction_broadcast_when_applied=1");
  console.log("outcome_journal_recording=1");
  console.log("automatic_retry=0");
  console.log("receipt_wait=0");
  console.log("inventory_decrement=0");
  console.log("request_journal_write=0");
  console.log("runtime_route_mount=0");
  console.log("verdict=BUY_VOID_NATIVE_EXECUTION_WORKER_LOCAL_EXACT_GREEN");
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}
