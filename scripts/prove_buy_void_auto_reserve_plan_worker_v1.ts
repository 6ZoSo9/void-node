import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  listBuyVoidExecutionAttemptsV1,
  type BuyVoidExecutionAttemptPolicyV1,
} from "../src/economic/buy_void_execution_attempt_journal_v1.js";
import type {
  BuyVoidFulfillmentJournalIntentV1,
} from "../src/economic/buy_void_fulfillment_journal_v1.js";
import {
  listBuyVoidInventoryReservationsV1,
  reserveBuyVoidInventoryV1,
  type BuyVoidInventoryReservationPolicyV1,
} from "../src/economic/buy_void_inventory_reservation_journal_v1.js";
import {
  VOID_BUY_VOID_AUTO_RESERVE_PLAN_AUTHORITY_V1,
  VOID_BUY_VOID_AUTO_RESERVE_PLAN_CONFIRMATION_V1,
  VOID_BUY_VOID_AUTO_RESERVE_PLAN_WORKER_V1,
  runBuyVoidAutoReservePlanWorkerV1,
  type BuyVoidAutoReservePlanWorkerPolicyV1,
} from "../src/economic/buy_void_auto_reserve_plan_worker_v1.js";

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
  const requestId = `buyvoid_plan_request_${index}`;
  const instructionId = `voidfill1_${digit.repeat(32)}`;
  const paymentIdentity =
    `voidpay1:base:${txHash(digit)}:${index}`;

  return {
    schema: "void_buy_void_fulfillment_journal_intent_v1",
    marker: "VOID_BUY_VOID_FULFILLMENT_JOURNAL_V1",
    created_at_ms: 1_700_000_000_000 + index,
    payment_key_sha256: hash(digit),
    request_key_sha256: hash(
      String(((index + 1) % 8) + 1),
    ),
    claim: {
      schema: "void_buy_void_fulfillment_claim_v1",
      marker: "VOID_BUY_VOID_AUTO_FULFILLMENT_V1",
      canonical_payment_identity: paymentIdentity,
      canonical_payment_identity_sha256: hash(
        String(((index + 2) % 8) + 1),
      ),
      request_id: requestId,
      decision_fingerprint: hash(
        String(((index + 3) % 8) + 1),
      ),
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

function workerPolicy(
  maximum = "700",
): BuyVoidAutoReservePlanWorkerPolicyV1 {
  return {
    enabled: true,
    accepted_claim_status: "claimed",
    execution_chain_id: "2050",
    max_attempts_per_payment: 1,
    max_void_amount_units: maximum,
  };
}

function inventoryPolicy(): BuyVoidInventoryReservationPolicyV1 {
  return {
    inventory_reservation_enabled: true,
    pool_id: "void-presale-mainnet0-v1",
    inventory_policy_version: "fixed-cap-v1",
    pool_capacity_void_units: "1000",
    max_reservation_void_units: "700",
  };
}

function executionPolicy(): BuyVoidExecutionAttemptPolicyV1 {
  return {
    attempt_journal_enabled: true,
    max_attempts_per_payment: 1,
    chain_id: "2050",
    fulfillment_wallet_allowlist: [
      address("f"),
    ],
  };
}

function heldReason(
  decision: ReturnType<
    typeof runBuyVoidAutoReservePlanWorkerV1
  >,
): string {
  assert.equal(decision.ok, false);
  if (decision.ok) throw new Error("expected held decision");
  return decision.reason;
}

assert.equal(
  VOID_BUY_VOID_AUTO_RESERVE_PLAN_WORKER_V1,
  "VOID_BUY_VOID_AUTO_RESERVE_PLAN_WORKER_V1",
);
assert.equal(
  VOID_BUY_VOID_AUTO_RESERVE_PLAN_CONFIRMATION_V1,
  "buyVoidAutoReservePlan",
);
assert.deepEqual(
  VOID_BUY_VOID_AUTO_RESERVE_PLAN_AUTHORITY_V1,
  {
    one_request_per_run: true,
    disabled_by_policy_default: true,
    dry_by_default: true,
    exact_confirmation_required: true,
    server_controlled_policy: true,
    fulfillment_claim_required: true,
    aggregate_inventory_reservation_on_apply: true,
    execution_attempt_reservation_on_apply: true,
    request_journal_write: false,
    inventory_decrement: false,
    inventory_release: false,
    wallet_access: false,
    signing: false,
    transaction_broadcast: false,
    runtime_route_mount: false,
    background_loop: false,
    money_movement: false,
  },
);

const root = fs.mkdtempSync(
  path.join(os.tmpdir(), "void-buy-plan-worker-proof-"),
);

try {
  const intent = makeIntent(1);

  const disabled = runBuyVoidAutoReservePlanWorkerV1({
    root_dir: root,
    intent,
    worker_policy: {
      ...workerPolicy(),
      enabled: false,
    },
    inventory_policy: inventoryPolicy(),
    execution_policy: executionPolicy(),
  });
  assert.equal(
    heldReason(disabled),
    "auto_reserve_plan_worker_disabled",
  );

  const dry = runBuyVoidAutoReservePlanWorkerV1({
    root_dir: root,
    intent,
    worker_policy: workerPolicy(),
    inventory_policy: inventoryPolicy(),
    execution_policy: executionPolicy(),
    apply: false,
    now_ms: 1_700_000_000_100,
  });
  assert.equal(dry.ok, true);
  assert.equal(dry.status, "dry_run");
  if (!dry.ok || dry.status !== "dry_run") {
    throw new Error("dry run unexpectedly held");
  }
  assert.equal(dry.applied, false);
  assert.equal(dry.mutation_performed, false);
  assert.equal(dry.plan.inventory_reservation_committed, false);
  assert.equal(dry.plan.execution_attempt_committed, false);
  assert.equal(dry.plan.execution_chain_id, "2050");
  assert.equal(dry.plan.max_attempts_per_payment, 1);
  assert.equal(dry.plan.fulfillment_wallet_allowlist_count, 1);
  assert.equal(dry.plan.wallet_access_authorized, false);
  assert.equal(dry.plan.signing_authorized, false);
  assert.equal(dry.plan.transaction_broadcast_authorized, false);
  assert.equal(dry.plan.automatic_delivery_authorized, false);
  assert.equal(
    listBuyVoidInventoryReservationsV1({
      root_dir: root,
      pool_id: inventoryPolicy().pool_id,
    }).length,
    0,
  );
  assert.equal(listBuyVoidExecutionAttemptsV1(root).length, 0);

  const missingConfirmation =
    runBuyVoidAutoReservePlanWorkerV1({
      root_dir: root,
      intent,
      worker_policy: workerPolicy(),
      inventory_policy: inventoryPolicy(),
      execution_policy: executionPolicy(),
      apply: true,
    });
  assert.equal(
    heldReason(missingConfirmation),
    "explicit_confirmation_required",
  );
  assert.equal(
    listBuyVoidInventoryReservationsV1({
      root_dir: root,
      pool_id: inventoryPolicy().pool_id,
    }).length,
    0,
  );
  assert.equal(listBuyVoidExecutionAttemptsV1(root).length, 0);

  const applied = runBuyVoidAutoReservePlanWorkerV1({
    root_dir: root,
    intent,
    worker_policy: workerPolicy(),
    inventory_policy: inventoryPolicy(),
    execution_policy: executionPolicy(),
    apply: true,
    confirmation:
      VOID_BUY_VOID_AUTO_RESERVE_PLAN_CONFIRMATION_V1,
    now_ms: 1_700_000_000_200,
  });
  assert.equal(applied.ok, true);
  assert.equal(applied.status, "planned");
  if (!applied.ok) {
    throw new Error("applied plan unexpectedly held");
  }
  assert.equal(applied.applied, true);
  assert.equal(applied.mutation_performed, true);
  assert.equal(applied.inventory.status, "reserved");
  assert.equal(
    applied.execution_attempt.status,
    "reserved",
  );
  assert.equal(applied.plan.inventory_reservation_committed, true);
  assert.equal(applied.plan.execution_attempt_committed, true);
  assert.equal(
    applied.plan.inventory_reservation_id,
    applied.inventory.reservation.reservation_id,
  );
  assert.equal(
    applied.plan.execution_attempt_id,
    applied.execution_attempt.reservation.attempt_id,
  );
  assert.equal(applied.plan.void_amount_units, "400");
  assert.equal(applied.plan.inventory_decrement_authorized, false);
  assert.equal(applied.plan.inventory_release_authorized, false);
  assert.equal(applied.plan.money_movement_authorized, false);
  assert.equal(
    listBuyVoidInventoryReservationsV1({
      root_dir: root,
      pool_id: inventoryPolicy().pool_id,
    }).length,
    1,
  );
  assert.equal(listBuyVoidExecutionAttemptsV1(root).length, 1);

  const duplicate = runBuyVoidAutoReservePlanWorkerV1({
    root_dir: root,
    intent,
    worker_policy: workerPolicy(),
    inventory_policy: inventoryPolicy(),
    execution_policy: executionPolicy(),
    apply: true,
    confirmation:
      VOID_BUY_VOID_AUTO_RESERVE_PLAN_CONFIRMATION_V1,
    now_ms: 1_700_000_000_300,
  });
  assert.equal(duplicate.ok, true);
  assert.equal(duplicate.status, "duplicate");
  if (!duplicate.ok) {
    throw new Error("duplicate unexpectedly held");
  }
  assert.equal(duplicate.mutation_performed, false);
  assert.equal(duplicate.inventory.status, "duplicate");
  assert.equal(
    duplicate.execution_attempt.reservation.attempt_id,
    applied.execution_attempt.reservation.attempt_id,
  );
  assert.equal(duplicate.plan.plan_id, applied.plan.plan_id);

  const overCap = runBuyVoidAutoReservePlanWorkerV1({
    root_dir: root,
    intent: makeIntent(2, "701"),
    worker_policy: workerPolicy(),
    inventory_policy: inventoryPolicy(),
    execution_policy: executionPolicy(),
    apply: false,
  });
  assert.equal(
    heldReason(overCap),
    "auto_reserve_amount_exceeds_policy",
  );

  const wrongChain = runBuyVoidAutoReservePlanWorkerV1({
    root_dir: root,
    intent: makeIntent(3, "1"),
    worker_policy: workerPolicy(),
    inventory_policy: inventoryPolicy(),
    execution_policy: {
      ...executionPolicy(),
      chain_id: "2051",
    },
    apply: false,
  });
  assert.equal(
    heldReason(wrongChain),
    "execution_chain_policy_mismatch",
  );

  const crashRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), "void-buy-plan-recovery-proof-"),
  );
  try {
    const recoveryIntent = makeIntent(4, "100");
    const inventoryOnly = reserveBuyVoidInventoryV1({
      root_dir: crashRoot,
      intent: recoveryIntent,
      policy: inventoryPolicy(),
      apply: true,
      now_ms: 1_700_000_000_400,
    });
    assert.equal(inventoryOnly.ok, true);
    assert.equal(inventoryOnly.status, "reserved");

    const recovered = runBuyVoidAutoReservePlanWorkerV1({
      root_dir: crashRoot,
      intent: recoveryIntent,
      worker_policy: workerPolicy(),
      inventory_policy: inventoryPolicy(),
      execution_policy: executionPolicy(),
      apply: true,
      confirmation:
        VOID_BUY_VOID_AUTO_RESERVE_PLAN_CONFIRMATION_V1,
      now_ms: 1_700_000_000_500,
    });
    assert.equal(recovered.ok, true);
    assert.equal(recovered.status, "planned");
    if (!recovered.ok) {
      throw new Error("recovery unexpectedly held");
    }
    assert.equal(recovered.inventory.status, "duplicate");
    assert.equal(
      recovered.execution_attempt.status,
      "reserved",
    );
    assert.equal(recovered.mutation_performed, true);
    assert.equal(
      listBuyVoidInventoryReservationsV1({
        root_dir: crashRoot,
        pool_id: inventoryPolicy().pool_id,
      }).length,
      1,
    );
    assert.equal(
      listBuyVoidExecutionAttemptsV1(crashRoot).length,
      1,
    );
  } finally {
    fs.rmSync(crashRoot, { recursive: true, force: true });
  }
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}

console.log("VOID_BUY_VOID_AUTO_RESERVE_PLAN_WORKER_V1_GREEN");
