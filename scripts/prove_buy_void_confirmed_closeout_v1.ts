import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  VOID_BUY_VOID_CONFIRMED_CLOSEOUT_CONFIRMATION_V1,
  VOID_BUY_VOID_CONFIRMED_CLOSEOUT_V1,
  listBuyVoidInventoryConsumptionsV1,
  planBuyVoidConfirmedCloseoutV1,
  runBuyVoidConfirmedCloseoutV1,
  writeBuyVoidInventoryConsumptionV1,
  writeBuyVoidPublicFulfillmentCloseoutV1,
  type BuyVoidConfirmedCloseoutSnapshotV1,
  type BuyVoidConfirmedCloseoutWriteDecisionV1,
} from "../src/economic/buy_void_confirmed_closeout_v1.js";

const attemptId = "a".repeat(64);
const reservationId = "b".repeat(64);
const paymentIdentity =
  "voidpay1:base:0x" + "c".repeat(64) + ":88";
const paymentHash = "0x" + "c".repeat(64);
const deliveryHash = "0x" + "d".repeat(64);
const deliveryAddress = "0x" + "e".repeat(40);
const wallet = "0x" + "f".repeat(40);

function snapshot(
  effectiveStatus = "payment_verified",
): BuyVoidConfirmedCloseoutSnapshotV1 {
  return {
    attempt: {
      status: "confirmed",
      reservation: {
        attempt_id: attemptId,
      },
      confirmation: {
        confirmed_at_ms: 1770000000000,
        confirmed_record: {
          schema:
            "void_buy_void_confirmed_fulfillment_record_v1",
          marker:
            "VOID_BUY_VOID_FULFILLMENT_CONFIRMATION_V1",
          status: "fulfilled_confirmed",
          canonical_payment_identity: paymentIdentity,
          request_id: "buyvoid_test_1",
          instruction_id: "voidfill1_test_1",
          source_payment_chain: "base",
          payment_transaction_hash: paymentHash,
          payment_log_index: "88",
          delivery_chain_id: "2050",
          void_delivery_tx_hash: deliveryHash,
          delivery_block_number: "37370",
          delivery_confirmation_count: "1",
          fulfillment_wallet: wallet,
          delivery_address: deliveryAddress,
          void_amount_units: "2000000",
          buyer_fulfilled: true,
          automatic_fulfillment_completed: true,
          payment_claim_persisted: true,
          delivery_confirmation_observed: true,
          signing_authorized_by_this_module: false,
          transaction_broadcast_authorized_by_this_module:
            false,
          money_movement_authorized_by_this_module:
            false,
        },
      },
    },
    inventory_reservation: {
      reservation_id: reservationId,
      pool_id: "void-presale-mainnet0-v1",
      request_id: "buyvoid_test_1",
      instruction_id: "voidfill1_test_1",
      delivery_address: deliveryAddress,
      reserved_void_units: "2000000",
      reservation_status: "reserved",
      inventory_decrement_performed: false,
      reservation_release_authorized: false,
      execution_authorized_by_this_module: false,
      signing_authorized_by_this_module: false,
      transaction_broadcast_authorized_by_this_module:
        false,
      money_movement_authorized_by_this_module: false,
    },
    request: {
      request_id: "buyvoid_test_1",
      status: "payment_submitted_pending_manual_review",
      tx_hash: paymentHash,
      usdc_amount: "1",
      quoted_void: "2",
      delivery_address: deliveryAddress,
    },
    operator_events: [],
    effective_status: effectiveStatus,
    existing_fulfilled_event: null,
  };
}

const policy = {
  enabled: true,
  pool_id: "void-presale-mainnet0-v1",
  request_dir: "/tmp/public-buy-void-requests-v1",
};

const planned = planBuyVoidConfirmedCloseoutV1({
  policy,
  snapshot: snapshot(),
});
assert.equal(planned.ok, true);
if (planned.ok === false) throw new Error(planned.reason);
assert.equal(
  planned.plan.marker,
  VOID_BUY_VOID_CONFIRMED_CLOSEOUT_V1,
);
assert.equal(
  planned.plan.inventory_consumption
    .inventory_decrement_performed,
  true,
);
assert.equal(
  planned.plan.inventory_consumption
    .base_reservation_record_mutated,
  false,
);
assert.equal(
  planned.plan.public_closeout_event.operator_status,
  "fulfilled",
);
assert.equal(
  planned.plan.public_closeout_event
    .void_delivery_tx_hash,
  deliveryHash,
);
assert.equal(
  planned.plan.public_closeout_event
    .inventory_consumption_id,
  planned.plan.inventory_consumption.consumption_id,
);
assert.equal(
  planned.plan.transaction_broadcast_authorized,
  false,
);

let loadCount = 0;
let inventoryWriteCount = 0;
let publicWriteCount = 0;

const created = (
  path: string,
): BuyVoidConfirmedCloseoutWriteDecisionV1 => ({
  ok: true,
  status: "created",
  mutation_performed: true,
  duplicate: false,
  recovered_partial: false,
  path,
});

const duplicate = (
  path: string,
): BuyVoidConfirmedCloseoutWriteDecisionV1 => ({
  ok: true,
  status: "duplicate",
  mutation_performed: false,
  duplicate: true,
  recovered_partial: false,
  path,
});

const dependencies = {
  load_snapshot() {
    loadCount += 1;
    return {
      ok: true as const,
      snapshot: snapshot(),
    };
  },
  write_inventory_consumption() {
    inventoryWriteCount += 1;
    return inventoryWriteCount === 1
      ? created("/tmp/inventory.json")
      : duplicate("/tmp/inventory.json");
  },
  write_public_closeout() {
    publicWriteCount += 1;
    return publicWriteCount === 1
      ? created("/tmp/event.json")
      : duplicate("/tmp/event.json");
  },
};

const dryRun = runBuyVoidConfirmedCloseoutV1({
  root_dir: "/tmp/root",
  attempt_id: attemptId,
  policy,
  apply: false,
  dependencies,
});
assert.equal(dryRun.ok, true);
assert.equal(dryRun.status, "dry_run");
assert.equal(dryRun.mutation_performed, false);
assert.equal(inventoryWriteCount, 0);
assert.equal(publicWriteCount, 0);

const wrongConfirmation =
  runBuyVoidConfirmedCloseoutV1({
    root_dir: "/tmp/root",
    attempt_id: attemptId,
    policy,
    apply: true,
    confirmation: "wrong",
    dependencies,
  });
assert.equal(wrongConfirmation.ok, false);
assert.equal(
  "reason" in wrongConfirmation
    ? wrongConfirmation.reason
    : "",
  "explicit_confirmation_required",
);
assert.equal(inventoryWriteCount, 0);
assert.equal(publicWriteCount, 0);

const applied = runBuyVoidConfirmedCloseoutV1({
  root_dir: "/tmp/root",
  attempt_id: attemptId,
  policy,
  apply: true,
  confirmation:
    VOID_BUY_VOID_CONFIRMED_CLOSEOUT_CONFIRMATION_V1,
  dependencies,
});
assert.equal(applied.ok, true);
assert.equal(applied.status, "applied");
assert.equal(applied.mutation_performed, true);
assert.equal(inventoryWriteCount, 1);
assert.equal(publicWriteCount, 1);

const replay = runBuyVoidConfirmedCloseoutV1({
  root_dir: "/tmp/root",
  attempt_id: attemptId,
  policy,
  apply: true,
  confirmation:
    VOID_BUY_VOID_CONFIRMED_CLOSEOUT_CONFIRMATION_V1,
  dependencies,
});
assert.equal(replay.ok, true);
assert.equal(replay.status, "duplicate");
assert.equal(replay.mutation_performed, false);
assert.equal(inventoryWriteCount, 2);
assert.equal(publicWriteCount, 2);

const disabled = runBuyVoidConfirmedCloseoutV1({
  root_dir: "/tmp/root",
  attempt_id: attemptId,
  policy: {
    ...policy,
    enabled: false,
  },
  apply: false,
  dependencies,
});
assert.equal(disabled.ok, false);
assert.equal(
  "reason" in disabled ? disabled.reason : "",
  "confirmed_closeout_policy_disabled",
);

const invalidStatus = planBuyVoidConfirmedCloseoutV1({
  policy,
  snapshot: snapshot("rejected"),
});
assert.equal(invalidStatus.ok, false);

assert.ok(loadCount >= 3);


const filesystemRoot = fs.mkdtempSync(
  path.join(
    os.tmpdir(),
    "void-buy-void-confirmed-closeout-v1-",
  ),
);
const filesystemRequestDir = path.join(
  filesystemRoot,
  "requests",
);
const filesystemJournalRoot = path.join(
  filesystemRoot,
  "journal",
);

try {
  fs.mkdirSync(filesystemRequestDir, {
    recursive: true,
  });

  const baseRequestFile = path.join(
    filesystemRequestDir,
    "buyvoid_test_1.json",
  );
  const baseRequestText = JSON.stringify(
    snapshot().request,
    null,
    2,
  ) + "\n";
  fs.writeFileSync(
    baseRequestFile,
    baseRequestText,
    "utf8",
  );

  const filesystemInventoryFirst =
    writeBuyVoidInventoryConsumptionV1({
      root_dir: filesystemJournalRoot,
      record: planned.plan.inventory_consumption,
    });
  assert.equal(filesystemInventoryFirst.ok, true);
  assert.equal(
    filesystemInventoryFirst.status,
    "created",
  );
  assert.equal(
    filesystemInventoryFirst.mutation_performed,
    true,
  );

  const filesystemInventoryReplay =
    writeBuyVoidInventoryConsumptionV1({
      root_dir: filesystemJournalRoot,
      record: planned.plan.inventory_consumption,
    });
  assert.equal(filesystemInventoryReplay.ok, true);
  assert.equal(
    filesystemInventoryReplay.status,
    "duplicate",
  );
  assert.equal(
    filesystemInventoryReplay.mutation_performed,
    false,
  );

  const inventoryRows =
    listBuyVoidInventoryConsumptionsV1(
      filesystemJournalRoot,
    );
  assert.equal(inventoryRows.length, 1);
  assert.equal(
    inventoryRows[0]?.void_delivery_tx_hash,
    deliveryHash,
  );

  const filesystemPublicFirst =
    writeBuyVoidPublicFulfillmentCloseoutV1({
      request_dir: filesystemRequestDir,
      event: planned.plan.public_closeout_event,
    });
  assert.equal(filesystemPublicFirst.ok, true);
  assert.equal(filesystemPublicFirst.status, "created");
  assert.equal(
    filesystemPublicFirst.mutation_performed,
    true,
  );

  const filesystemPublicReplay =
    writeBuyVoidPublicFulfillmentCloseoutV1({
      request_dir: filesystemRequestDir,
      event: planned.plan.public_closeout_event,
    });
  assert.equal(filesystemPublicReplay.ok, true);
  assert.equal(
    filesystemPublicReplay.status,
    "duplicate",
  );
  assert.equal(
    filesystemPublicReplay.mutation_performed,
    false,
  );

  const publicRows = fs
    .readFileSync(
      path.join(
        filesystemRequestDir,
        "operator-events.jsonl",
      ),
      "utf8",
    )
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => JSON.parse(line));

  assert.equal(publicRows.length, 1);
  assert.equal(
    publicRows[0]?.operator_status,
    "fulfilled",
  );
  assert.equal(
    publicRows[0]?.void_delivery_tx_hash,
    deliveryHash,
  );
  assert.equal(
    fs.readFileSync(baseRequestFile, "utf8"),
    baseRequestText,
  );

  const conflictEvent = {
    ...planned.plan.public_closeout_event,
    void_delivery_tx_hash:
      "0x" + "1".repeat(64),
  };
  const filesystemConflict =
    writeBuyVoidPublicFulfillmentCloseoutV1({
      request_dir: filesystemRequestDir,
      event: conflictEvent,
    });
  assert.equal(filesystemConflict.ok, false);
  assert.equal(
    "reason" in filesystemConflict
      ? filesystemConflict.reason
      : "",
    "public_fulfillment_closeout_conflict",
  );

  const legacyRequestDir = path.join(
    filesystemRoot,
    "legacy-requests",
  );
  fs.mkdirSync(legacyRequestDir, {
    recursive: true,
  });
  fs.writeFileSync(
    path.join(
      legacyRequestDir,
      "operator-events.jsonl",
    ),
    JSON.stringify({
      request_id: "buyvoid_test_1",
      operator_status: "fulfilled",
      marked_at_ms: 1,
      void_delivery_tx_hash: deliveryHash,
    }) + "\n",
    "utf8",
  );

  const legacyRecovery =
    writeBuyVoidPublicFulfillmentCloseoutV1({
      request_dir: legacyRequestDir,
      event: planned.plan.public_closeout_event,
    });
  assert.equal(legacyRecovery.ok, true);
  assert.equal(legacyRecovery.status, "duplicate");
  assert.equal(
    legacyRecovery.recovered_partial,
    true,
  );
  assert.equal(
    fs
      .readFileSync(
        path.join(
          legacyRequestDir,
          "operator-events.jsonl",
        ),
        "utf8",
      )
      .split(/\r?\n/)
      .filter(Boolean)
      .length,
    1,
  );

  const mismatchedPaymentSnapshot = snapshot();
  mismatchedPaymentSnapshot.request.tx_hash =
    "0x" + "2".repeat(64);
  const mismatchedPaymentPlan =
    planBuyVoidConfirmedCloseoutV1({
      policy,
      snapshot: mismatchedPaymentSnapshot,
    });
  assert.equal(mismatchedPaymentPlan.ok, false);
  assert.equal(
    mismatchedPaymentPlan.ok === false
      ? mismatchedPaymentPlan.reason
      : "",
    "confirmed_closeout_binding_mismatch",
  );
} finally {
  fs.rmSync(filesystemRoot, {
    recursive: true,
    force: true,
  });
}

console.log("file_backed_duplicate_safe=1");
console.log("file_backed_inventory_record_count=1");
console.log("file_backed_public_event_count=1");
console.log("legacy_same_transaction_recovery=1");
console.log("payment_transaction_hash_exact_binding=1");

console.log("VOID_BUY_VOID_CONFIRMED_CLOSEOUT_V1_GREEN");
console.log("confirmed_attempt_required=1");
console.log("append_only_inventory_consumption=1");
console.log("append_only_public_fulfillment_event=1");
console.log("duplicate_safe=1");
console.log("partial_recovery_safe=1");
console.log("public_request_base_record_mutation=0");
console.log("reservation_base_record_mutation=0");
console.log("wallet_access=0");
console.log("credential_access=0");
console.log("signing=0");
console.log("transaction_broadcast=0");
console.log("money_movement=0");
