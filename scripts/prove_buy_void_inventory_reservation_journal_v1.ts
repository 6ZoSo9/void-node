import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type {
  BuyVoidFulfillmentJournalIntentV1,
} from "../src/economic/buy_void_fulfillment_journal_v1.js";
import {
  VOID_BUY_VOID_INVENTORY_RESERVATION_AUTHORITY_V1,
  VOID_BUY_VOID_INVENTORY_RESERVATION_JOURNAL_V1,
  buyVoidInventoryReservationJournalPathsV1,
  listBuyVoidInventoryReservationsV1,
  listBuyVoidPaidUnreservableObligationsV1,
  reserveBuyVoidInventoryV1,
  type BuyVoidInventoryReservationPolicyV1,
} from "../src/economic/buy_void_inventory_reservation_journal_v1.js";

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
  voidAmountUnits: string,
): BuyVoidFulfillmentJournalIntentV1 {
  const digit = String((index % 8) + 1);
  const paymentKey = hash(digit);
  const requestKey = hash(String(((index + 1) % 8) + 1));
  const requestId = `buyvoid_inventory_request_${index}`;
  const instructionId = `voidfill1_${digit.repeat(32)}`;
  const paymentIdentity =
    `voidpay1:base:${txHash(digit)}:${index}`;

  return {
    schema: "void_buy_void_fulfillment_journal_intent_v1",
    marker: "VOID_BUY_VOID_FULFILLMENT_JOURNAL_V1",
    created_at_ms: 1_700_000_000_000 + index,
    payment_key_sha256: paymentKey,
    request_key_sha256: requestKey,
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
        void_amount_units: voidAmountUnits,
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
      quoted_void_units: voidAmountUnits,
    },
    signing_authorized: false,
    transaction_broadcast_authorized: false,
    money_movement_authorized: false,
  };
}

function policy(
  capacity = "1000",
  maximum = "700",
): BuyVoidInventoryReservationPolicyV1 {
  return {
    inventory_reservation_enabled: true,
    pool_id: "void-presale-mainnet0-v1",
    inventory_policy_version: "fixed-cap-v1",
    pool_capacity_void_units: capacity,
    max_reservation_void_units: maximum,
  };
}

function heldReason(
  decision: ReturnType<typeof reserveBuyVoidInventoryV1>,
): string {
  assert.equal(decision.ok, false);
  if (decision.ok) throw new Error("expected held decision");
  return decision.reason;
}

function withDirectoryFsyncFailureAt<T>(
  ordinal: number,
  operation: () => T,
): T {
  const original = fs.fsyncSync;
  let directorySyncs = 0;
  (fs as any).fsyncSync = (descriptor: number): void => {
    if (fs.fstatSync(descriptor).isDirectory()) {
      directorySyncs += 1;
      if (directorySyncs === ordinal) {
        const error = Object.assign(
          new Error(`synthetic_directory_fsync_failure_${ordinal}`),
          { code: "EIO" },
        );
        throw error;
      }
    }
    original(descriptor);
  };
  try {
    return operation();
  } finally {
    (fs as any).fsyncSync = original;
  }
}

assert.equal(
  VOID_BUY_VOID_INVENTORY_RESERVATION_JOURNAL_V1,
  "VOID_BUY_VOID_INVENTORY_RESERVATION_JOURNAL_V1",
);
assert.deepEqual(
  VOID_BUY_VOID_INVENTORY_RESERVATION_AUTHORITY_V1,
  {
    filesystem_read: true,
    filesystem_write: true,
    aggregate_inventory_reservation: true,
    duplicate_safe_reservation: true,
    global_pool_lock: true,
    paid_unreservable_terminal_obligation: true,
    obligation_automatic_retry: false,
    obligation_refund_execution_authorized: false,
    inventory_decrement: false,
    reservation_release: false,
    sold_out_closeout: false,
    request_journal_write: false,
    rpc_call: false,
    wallet_access: false,
    signing: false,
    transaction_broadcast: false,
    runtime_route_mount: false,
    money_movement: false,
  },
);

const root = fs.mkdtempSync(
  path.join(os.tmpdir(), "void-buy-inventory-proof-"),
);

try {
  const firstIntent = makeIntent(1, "400");
  const preview = reserveBuyVoidInventoryV1({
    root_dir: root,
    intent: firstIntent,
    policy: policy(),
    apply: false,
    now_ms: 1_700_000_000_100,
  });
  assert.equal(preview.ok, true);
  assert.equal(preview.status, "available");
  if (!preview.ok) throw new Error("preview unexpectedly held");
  assert.equal(preview.applied, false);
  assert.equal(preview.new_reservation, false);
  assert.equal(preview.duplicate, false);
  assert.equal(preview.aggregate.committed_void_units, "400");
  assert.equal(preview.aggregate.available_void_units, "600");
  assert.equal(
    listBuyVoidInventoryReservationsV1({
      root_dir: root,
      pool_id: policy().pool_id,
    }).length,
    0,
  );

  const first = reserveBuyVoidInventoryV1({
    root_dir: root,
    intent: firstIntent,
    policy: policy(),
    apply: true,
    now_ms: 1_700_000_000_200,
  });
  assert.equal(first.ok, true);
  assert.equal(first.status, "reserved");
  if (!first.ok) throw new Error("first reserve unexpectedly held");
  assert.equal(first.new_reservation, true);
  assert.equal(first.duplicate, false);
  assert.equal(first.reservation.reserved_void_units, "400");
  assert.equal(
    first.reservation.committed_before_void_units,
    "0",
  );
  assert.equal(
    first.reservation.committed_after_void_units,
    "400",
  );
  assert.equal(first.aggregate.available_void_units, "600");
  assert.equal(first.reservation.inventory_decrement_performed, false);
  assert.equal(first.reservation.execution_authorized_by_this_module, false);
  assert.equal(first.reservation.money_movement_authorized_by_this_module, false);

  const duplicate = reserveBuyVoidInventoryV1({
    root_dir: root,
    intent: firstIntent,
    policy: policy(),
    apply: true,
    now_ms: 1_700_000_000_300,
  });
  assert.equal(duplicate.ok, true);
  assert.equal(duplicate.status, "duplicate");
  if (!duplicate.ok) throw new Error("duplicate unexpectedly held");
  assert.equal(duplicate.new_reservation, false);
  assert.equal(duplicate.duplicate, true);
  assert.equal(
    duplicate.reservation.reservation_id,
    first.reservation.reservation_id,
  );
  assert.equal(duplicate.aggregate.committed_void_units, "400");

  const oversized = reserveBuyVoidInventoryV1({
    root_dir: root,
    intent: makeIntent(2, "701"),
    policy: policy(),
    apply: true,
  });
  assert.equal(
    heldReason(oversized),
    "inventory_reservation_amount_exceeds_policy",
  );

  const insufficient = reserveBuyVoidInventoryV1({
    root_dir: root,
    intent: makeIntent(3, "700"),
    policy: policy(),
    apply: true,
  });
  assert.equal(
    heldReason(insufficient),
    "insufficient_void_inventory",
  );

  const second = reserveBuyVoidInventoryV1({
    root_dir: root,
    intent: makeIntent(4, "600"),
    policy: policy(),
    apply: true,
    now_ms: 1_700_000_000_400,
  });
  assert.equal(second.ok, true);
  assert.equal(second.status, "reserved");
  if (!second.ok) throw new Error("second reserve unexpectedly held");
  assert.equal(second.aggregate.committed_void_units, "1000");
  assert.equal(second.aggregate.available_void_units, "0");
  assert.equal(second.aggregate.sold_out, true);
  assert.equal(second.aggregate.reservation_count, 2);

  const soldOut = reserveBuyVoidInventoryV1({
    root_dir: root,
    intent: makeIntent(5, "1"),
    policy: policy(),
    apply: true,
  });
  assert.equal(heldReason(soldOut), "inventory_sold_out");

  const changedPolicy = reserveBuyVoidInventoryV1({
    root_dir: root,
    intent: makeIntent(6, "1"),
    policy: {
      ...policy(),
      inventory_policy_version: "fixed-cap-v2",
    },
    apply: false,
  });
  assert.equal(heldReason(changedPolicy), "inventory_policy_changed");

  const conflictingIntent = makeIntent(7, "1");
  conflictingIntent.payment_key_sha256 =
    firstIntent.payment_key_sha256;
  const conflict = reserveBuyVoidInventoryV1({
    root_dir: root,
    intent: conflictingIntent,
    policy: policy(),
    apply: true,
  });
  assert.equal(
    heldReason(conflict),
    "inventory_reservation_claim_conflict",
  );

  const busyRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), "void-buy-inventory-busy-proof-"),
  );
  try {
    const paths = buyVoidInventoryReservationJournalPathsV1(
      busyRoot,
      policy().pool_id,
    );
    fs.mkdirSync(paths.lock_dir, {
      recursive: true,
      mode: 0o700,
    });
    const busy = reserveBuyVoidInventoryV1({
      root_dir: busyRoot,
      intent: makeIntent(8, "1"),
      policy: policy(),
      apply: true,
    });
    assert.equal(
      heldReason(busy),
      "inventory_reservation_busy",
    );
  } finally {
    fs.rmSync(busyRoot, { recursive: true, force: true });
  }

  const uncertainRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), "void-buy-inventory-uncertain-proof-"),
  );
  try {
    const uncertainIntent = makeIntent(20, "400");
    const uncertain = withDirectoryFsyncFailureAt(3, () =>
      reserveBuyVoidInventoryV1({
        root_dir: uncertainRoot,
        intent: uncertainIntent,
        policy: policy(),
        apply: true,
        now_ms: 1_700_000_001_000,
      }),
    );
    assert.equal(
      heldReason(uncertain),
      "inventory_reservation_durability_uncertain",
    );
    assert.equal(uncertain.ok, false);
    if (uncertain.ok) {
      throw new Error("uncertain reservation unexpectedly green");
    }
    assert.equal(
      uncertain.detail?.visible_reservation_preserved,
      true,
    );
    assert.equal(
      uncertain.detail?.conservative_capacity_counted,
      true,
    );
    assert.equal(uncertain.detail?.committed_void_units, "400");

    const visibleAfterUncertain =
      listBuyVoidInventoryReservationsV1({
        root_dir: uncertainRoot,
        pool_id: policy().pool_id,
      });
    assert.equal(visibleAfterUncertain.length, 1);
    assert.equal(
      visibleAfterUncertain[0].reserved_void_units,
      "400",
    );

    const repairedRetry = reserveBuyVoidInventoryV1({
      root_dir: uncertainRoot,
      intent: uncertainIntent,
      policy: policy(),
      apply: true,
      now_ms: 1_700_000_001_100,
    });
    assert.equal(repairedRetry.ok, true);
    assert.equal(repairedRetry.status, "duplicate");
    if (!repairedRetry.ok) {
      throw new Error("durability repair retry unexpectedly held");
    }
    assert.equal(repairedRetry.duplicate, true);
    assert.equal(
      repairedRetry.aggregate.committed_void_units,
      "400",
    );
    assert.equal(
      listBuyVoidInventoryReservationsV1({
        root_dir: uncertainRoot,
        pool_id: policy().pool_id,
      }).length,
      1,
    );
  } finally {
    fs.rmSync(uncertainRoot, { recursive: true, force: true });
  }

  const obligationRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), "void-buy-obligation-uncertain-proof-"),
  );
  try {
    const obligationPolicy = policy("100", "100");
    const fill = reserveBuyVoidInventoryV1({
      root_dir: obligationRoot,
      intent: makeIntent(30, "100"),
      policy: obligationPolicy,
      apply: true,
      now_ms: 1_700_000_002_000,
    });
    assert.equal(fill.ok, true);
    assert.equal(fill.status, "reserved");

    const strandedIntent = makeIntent(31, "1");
    const uncertainObligation = withDirectoryFsyncFailureAt(3, () =>
      reserveBuyVoidInventoryV1({
        root_dir: obligationRoot,
        intent: strandedIntent,
        policy: obligationPolicy,
        apply: true,
        now_ms: 1_700_000_002_100,
      }),
    );
    assert.equal(
      heldReason(uncertainObligation),
      "paid_unreservable_obligation_durability_uncertain",
    );
    assert.equal(uncertainObligation.ok, false);
    if (uncertainObligation.ok) {
      throw new Error("uncertain obligation unexpectedly green");
    }
    assert.equal(
      uncertainObligation.detail?.terminal_recovery_obligation_visible,
      true,
    );
    assert.equal(
      uncertainObligation.detail?.terminal_recovery_obligation_recorded,
      false,
    );
    assert.equal(uncertainObligation.detail?.automatic_retry, false);

    const visibleObligations =
      listBuyVoidPaidUnreservableObligationsV1({
        root_dir: obligationRoot,
        pool_id: obligationPolicy.pool_id,
      });
    assert.equal(visibleObligations.length, 1);
    assert.equal(
      visibleObligations[0].reservation_failure_reason,
      "inventory_sold_out",
    );

    const repairedObligation = reserveBuyVoidInventoryV1({
      root_dir: obligationRoot,
      intent: strandedIntent,
      policy: obligationPolicy,
      apply: true,
      now_ms: 1_700_000_002_200,
    });
    assert.equal(
      heldReason(repairedObligation),
      "inventory_sold_out",
    );
    assert.equal(repairedObligation.ok, false);
    if (repairedObligation.ok) {
      throw new Error("sold-out obligation retry unexpectedly green");
    }
    assert.equal(
      repairedObligation.detail?.terminal_recovery_obligation_recorded,
      true,
    );
    assert.equal(
      repairedObligation.detail?.automatic_retry,
      false,
    );
    assert.equal(
      listBuyVoidPaidUnreservableObligationsV1({
        root_dir: obligationRoot,
        pool_id: obligationPolicy.pool_id,
      }).length,
      1,
    );
  } finally {
    fs.rmSync(obligationRoot, { recursive: true, force: true });
  }

  const records = listBuyVoidInventoryReservationsV1({
    root_dir: root,
    pool_id: policy().pool_id,
  });
  assert.equal(records.length, 2);
  assert.equal(
    records.reduce(
      (total, item) =>
        total + BigInt(item.reserved_void_units),
      0n,
    ),
    1000n,
  );
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}

console.log("VOID_BUY_VOID_INVENTORY_RESERVATION_JOURNAL_V1_GREEN");
