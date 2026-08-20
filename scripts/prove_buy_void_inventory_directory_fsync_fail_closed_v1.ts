import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type {
  BuyVoidFulfillmentJournalIntentV1,
} from "../src/economic/buy_void_fulfillment_journal_v1.js";
import {
  buyVoidInventoryReservationJournalPathsV1,
  listBuyVoidInventoryReservationsV1,
  listBuyVoidPaidUnreservableObligationsV1,
  reserveBuyVoidInventoryV1,
  type BuyVoidInventoryReservationJournalPathsV1,
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
  const requestId = `buyvoid_dir_fsync_request_${index}`;
  const instructionId = `voidfill1_${digit.repeat(32)}`;
  const paymentIdentity =
    `voidpay1:base:${txHash(digit)}:${index}`;

  return {
    schema: "void_buy_void_fulfillment_journal_intent_v1",
    marker: "VOID_BUY_VOID_FULFILLMENT_JOURNAL_V1",
    created_at_ms: 1_700_100_000_000 + index,
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
        schema: "void_buy_void_unsigned_fulfillment_instruction_v1",
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

function policy(): BuyVoidInventoryReservationPolicyV1 {
  return {
    inventory_reservation_enabled: true,
    pool_id: "void-presale-mainnet0-v1",
    inventory_policy_version: "fixed-cap-v1",
    pool_capacity_void_units: "1000",
    max_reservation_void_units: "1000",
  };
}

function pendingNames(
  paths: BuyVoidInventoryReservationJournalPathsV1,
): string[] {
  if (!fs.existsSync(paths.pending_history_dir)) return [];
  return fs.readdirSync(paths.pending_history_dir)
    .filter((name) => /^[0-9a-f]{64}\.json$/.test(name))
    .sort();
}

function inventoryAuthoritySuffix(file: string): string {
  const components = path.resolve(file).split(path.sep).filter(Boolean);
  const start = components.findIndex((component) =>
    component.startsWith("buy-void-inventory-")
  );
  return start < 0 ? path.basename(file) : components.slice(start).join("/");
}

function withDirectoryFsyncFailure(
  targetDir: string,
  occurrence: number,
  body: () => void,
): void {
  const originalOpen = fs.openSync;
  const originalFsync = fs.fsyncSync;
  const originalClose = fs.closeSync;
  const directoryDescriptors = new Map<number, string>();
  const observedDirectories: string[] = [];
  let seen = 0;
  let fired = false;

  (fs as any).openSync = (
    file: fs.PathLike,
    flags: fs.OpenMode,
    mode?: fs.Mode,
  ) => {
    const descriptor = (originalOpen as any)(file, flags, mode);
    const isDirectory = typeof flags === "number"
      ? (flags & fs.constants.O_DIRECTORY) === fs.constants.O_DIRECTORY
      : String(flags) === "r";
    let openedPath = String(file);
    if (isDirectory) {
      try {
        openedPath = fs.realpathSync(`/proc/self/fd/${descriptor}`);
      } catch {
        // Keep the submitted path when descriptor rendering is unavailable.
      }
      observedDirectories.push(openedPath);
    }
    if (
      inventoryAuthoritySuffix(openedPath) ===
        inventoryAuthoritySuffix(targetDir) &&
      isDirectory
    ) {
      directoryDescriptors.set(descriptor, openedPath);
    }
    return descriptor;
  };
  (fs as any).fsyncSync = (descriptor: number) => {
    const syncedDirectory = directoryDescriptors.get(descriptor);
    if (syncedDirectory) {
      seen += 1;
      if (!fired && seen === occurrence) {
        fired = true;
        const error = new Error(
          `injected_directory_fsync_failure:${targetDir}:${occurrence}`,
        ) as NodeJS.ErrnoException;
        error.code = "EIO";
        throw error;
      }
    }
    return originalFsync(descriptor);
  };
  (fs as any).closeSync = (descriptor: number) => {
    try {
      return originalClose(descriptor);
    } finally {
      directoryDescriptors.delete(descriptor);
    }
  };

  try {
    body();
  } finally {
    (fs as any).openSync = originalOpen;
    (fs as any).fsyncSync = originalFsync;
    (fs as any).closeSync = originalClose;
  }

  assert.equal(
    fired,
    true,
    `directory fsync injection did not fire: ${targetDir} occurrence=${occurrence} observed=${observedDirectories.join(",")}`,
  );
}

type Boundary = {
  name: string;
  target: (paths: BuyVoidInventoryReservationJournalPathsV1) => string;
  occurrence: number;
};

const reservationBoundaries: Boundary[] = [
  {
    name: "pending_creation",
    target: (paths) => paths.pending_history_dir,
    occurrence: 1,
  },
  {
    name: "history_index_parent",
    target: (paths) => paths.pool_dir,
    occurrence: 1,
  },
  {
    name: "reservation_expectation_parent",
    target: (paths) => paths.reservation_expectations_dir,
    occurrence: 1,
  },
  {
    name: "reservation_record_parent",
    target: (paths) => paths.reservations_dir,
    occurrence: 1,
  },
  {
    name: "history_anchor_parent",
    target: (paths) => paths.history_anchor_pool_dir,
    occurrence: 3,
  },
  {
    name: "pending_deletion",
    target: (paths) => paths.pending_history_dir,
    occurrence: 2,
  },
];

for (let index = 0; index < reservationBoundaries.length; index += 1) {
  const boundary = reservationBoundaries[index];
  const root = fs.mkdtempSync(
    path.join(os.tmpdir(), `void-buy-dir-fsync-res-${boundary.name}-`),
  );
  try {
    const intent = makeIntent(index + 1, "400");
    const paths = buyVoidInventoryReservationJournalPathsV1(
      root,
      policy().pool_id,
    );

    let interrupted: ReturnType<typeof reserveBuyVoidInventoryV1> | null = null;
    withDirectoryFsyncFailure(
      boundary.target(paths),
      boundary.occurrence,
      () => {
        interrupted = reserveBuyVoidInventoryV1({
          root_dir: root,
          intent,
          policy: policy(),
          apply: true,
          now_ms: 1_700_100_010_000 + index,
        });
      },
    );
    assert.ok(interrupted);
    assert.equal(
      interrupted!.ok,
      false,
      `${boundary.name}: injected write must HOLD`,
    );
    if (interrupted!.ok) throw new Error("expected interrupted reservation HOLD");
    assert.equal(
      interrupted!.reason === "inventory_reservation_write_failed" ||
        interrupted!.reason.startsWith("inventory_reservation_lock_failed:"),
      true,
    );
    assert.match(
      String(interrupted!.detail?.message || interrupted!.reason),
      /injected_directory_fsync_failure/,
    );

    const retry = reserveBuyVoidInventoryV1({
      root_dir: root,
      intent,
      policy: policy(),
      apply: true,
      now_ms: 1_700_100_020_000 + index,
    });
    assert.equal(retry.ok, true, `${boundary.name}: retry must recover`);
    if (!retry.ok) throw new Error(`${boundary.name}: retry unexpectedly held`);
    assert.ok(
      retry.status === "reserved" || retry.status === "duplicate",
      `${boundary.name}: unexpected retry status ${retry.status}`,
    );

    const reservations = listBuyVoidInventoryReservationsV1({
      root_dir: root,
      pool_id: policy().pool_id,
    });
    assert.equal(reservations.length, 1, `${boundary.name}: duplicate reservation`);
    assert.equal(reservations[0].reserved_void_units, "400");
    assert.equal(
      listBuyVoidPaidUnreservableObligationsV1({
        root_dir: root,
        pool_id: policy().pool_id,
      }).length,
      0,
    );
    assert.deepEqual(pendingNames(paths), []);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

const obligationBoundaries: Boundary[] = [
  {
    name: "pending_creation",
    target: (paths) => paths.pending_history_dir,
    occurrence: 1,
  },
  {
    name: "history_index_parent",
    target: (paths) => paths.pool_dir,
    occurrence: 1,
  },
  {
    name: "obligation_expectation_parent",
    target: (paths) => paths.obligation_expectations_dir,
    occurrence: 1,
  },
  {
    name: "obligation_record_parent",
    target: (paths) => paths.holds_dir,
    occurrence: 1,
  },
  {
    name: "history_anchor_parent",
    target: (paths) => paths.history_anchor_pool_dir,
    occurrence: 3,
  },
  {
    name: "pending_deletion",
    target: (paths) => paths.pending_history_dir,
    occurrence: 2,
  },
];

for (let index = 0; index < obligationBoundaries.length; index += 1) {
  const boundary = obligationBoundaries[index];
  const root = fs.mkdtempSync(
    path.join(os.tmpdir(), `void-buy-dir-fsync-obl-${boundary.name}-`),
  );
  try {
    const fullIntent = makeIntent(1, "1000");
    const full = reserveBuyVoidInventoryV1({
      root_dir: root,
      intent: fullIntent,
      policy: policy(),
      apply: true,
      now_ms: 1_700_100_100_000 + index,
    });
    assert.equal(full.ok, true);
    if (!full.ok) throw new Error("capacity setup reservation unexpectedly held");
    assert.equal(full.aggregate.available_void_units, "0");

    const paidIntent = makeIntent(2, "1");
    const paths = buyVoidInventoryReservationJournalPathsV1(
      root,
      policy().pool_id,
    );

    let interrupted: ReturnType<typeof reserveBuyVoidInventoryV1> | null = null;
    withDirectoryFsyncFailure(
      boundary.target(paths),
      boundary.occurrence,
      () => {
        interrupted = reserveBuyVoidInventoryV1({
          root_dir: root,
          intent: paidIntent,
          policy: policy(),
          apply: true,
          now_ms: 1_700_100_110_000 + index,
        });
      },
    );
    assert.ok(interrupted);
    assert.equal(interrupted!.ok, false, `${boundary.name}: injected write must HOLD`);
    if (interrupted!.ok) throw new Error("expected interrupted obligation HOLD");
    assert.equal(
      interrupted!.reason,
      "paid_unreservable_obligation_write_failed",
    );
    assert.match(
      String(interrupted!.detail?.message || ""),
      /injected_directory_fsync_failure/,
    );

    const retry = reserveBuyVoidInventoryV1({
      root_dir: root,
      intent: paidIntent,
      policy: policy(),
      apply: true,
      now_ms: 1_700_100_120_000 + index,
    });
    assert.equal(retry.ok, false);
    if (retry.ok) throw new Error("sold-out retry unexpectedly reserved");
    assert.equal(retry.reason, "inventory_sold_out");
    assert.equal(retry.detail?.terminal_recovery_obligation_recorded, true);
    assert.equal(retry.detail?.automatic_retry, false);

    const reservations = listBuyVoidInventoryReservationsV1({
      root_dir: root,
      pool_id: policy().pool_id,
    });
    assert.equal(reservations.length, 1);
    assert.equal(reservations[0].reserved_void_units, "1000");

    const obligations = listBuyVoidPaidUnreservableObligationsV1({
      root_dir: root,
      pool_id: policy().pool_id,
    });
    assert.equal(obligations.length, 1, `${boundary.name}: duplicate obligation`);
    assert.equal(obligations[0].requested_void_units, "1");
    assert.equal(obligations[0].automatic_retry, false);
    assert.equal(obligations[0].wallet_access_authorized, false);
    assert.equal(obligations[0].signing_authorized, false);
    assert.equal(obligations[0].transaction_broadcast_authorized, false);
    assert.equal(obligations[0].money_movement_authorized, false);
    assert.deepEqual(pendingNames(paths), []);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

console.log("directory_fsync_errors_fail_closed=true");
console.log("reservation_directory_boundaries_recoverable=6");
console.log("paid_obligation_directory_boundaries_recoverable=6");
console.log("capacity_reopen_after_retry=false");
console.log("duplicate_reservation_after_retry=false");
console.log("duplicate_paid_obligation_after_retry=false");
console.log("wallet_access_authorized=false");
console.log("signing_authorized=false");
console.log("transaction_broadcast_authorized=false");
console.log("money_movement_authorized=false");
console.log("VOID_BUY_VOID_INVENTORY_DIRECTORY_FSYNC_FAIL_CLOSED_V1_PROOF_GREEN");
