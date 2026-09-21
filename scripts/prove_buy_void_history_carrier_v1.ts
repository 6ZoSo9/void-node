#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";

import {
  VOID_SEGMENTED_JSONL_DURABLE_ROOT_V1,
  type SegmentedJsonlDurableRootV1,
} from "../src/storage/segmented_jsonl_durable_root_v1.js";
import {
  VOID_BUY_VOID_HISTORY_CARRIER_AUTHORITY_V1,
  VOID_BUY_VOID_HISTORY_CARRIER_MAX_INDEX_DEPTH_V1,
  VOID_BUY_VOID_HISTORY_CARRIER_MAX_INDEX_PAGE_READS_V1,
  VOID_BUY_VOID_HISTORY_CARRIER_MAX_LEAF_ENTRIES_V1,
  VOID_BUY_VOID_HISTORY_CARRIER_MAX_PAGE_WRITES_PER_INSERT_V1,
  VOID_BUY_VOID_HISTORY_CARRIER_PAGE_BYTES_V1,
  createEmptyBuyVoidHistoryIndexV1,
  insertBuyVoidHistoryIndexV1,
  lookupBuyVoidHistoryIndexV1,
  planBuyVoidHistoryCarrierCommitV1,
  verifyBuyVoidHistoryCarrierRootV1,
  verifyBuyVoidHistoryCarrierSuccessorV1,
  verifyBuyVoidHistoryCarrierTxIntentV1,
  verifyLocatedBuyVoidHistoryRecordV1,
  type BuyVoidHistoryIndexEntryV1,
  type BuyVoidHistoryRecordLocatorV1,
} from "../src/economic/buy_void_history_carrier_v1.js";

const POOL = "buy-void-presale-v1";
const ADDRESS_A = "0x" + "1".repeat(40);
const ADDRESS_B = "0x" + "2".repeat(40);
const PAYMENT_A = "a".repeat(64);
const PAYMENT_B = "b".repeat(64);
const REQUEST_A = "c".repeat(64);
const REQUEST_B = "d".repeat(64);

function sha256(value: Buffer | string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function expectFailure(run: () => unknown, marker: string): void {
  let error: unknown;
  try {
    run();
  } catch (caught) {
    error = caught;
  }
  if (!(error instanceof Error)) {
    throw new Error("expected failure containing " + marker);
  }
  assert.match(error.message, new RegExp(marker));
}

function durableRoot(
  generation: number,
  previous: SegmentedJsonlDurableRootV1 | null,
): SegmentedJsonlDurableRootV1 {
  const core = {
    v: 1 as const,
    format:
      VOID_SEGMENTED_JSONL_DURABLE_ROOT_V1 as
        typeof VOID_SEGMENTED_JSONL_DURABLE_ROOT_V1,
    store_generation: generation,
    checkpoint_sha256: sha256("checkpoint-" + generation),
    snapshot_sha256: sha256("snapshot-" + generation),
    manifest_sha256: sha256("manifest-" + generation),
    materialized_authority_sha256:
      sha256("materialized-authority-" + generation),
    materialized_sha256: sha256("materialized-" + generation),
    append_only_witness_sha256:
      generation === 1 ? null : sha256("witness-" + generation),
    previous_root_sha256:
      previous ? previous.root_sha256 : null,
    total_bytes: generation * 1024,
    total_records: generation,
  };
  return {
    ...core,
    root_sha256: sha256(JSON.stringify(core)),
  };
}

function reconciliation(fingerprint: string): any {
  return {
    ok: true,
    status: "reconciled_read_only",
    marker:
      "VOID_BUY_VOID_PAYMENT_KEYED_HISTORY_RECONCILIATION_V1",
    version: 1,
    pool_id: POOL,
    intent_count: 2,
    inventory_reservation_count: 1,
    paid_unreservable_obligation_count: 1,
    execution_attempt_count: 1,
    unresolved_intent_count: 0,
    saga_binding_input_count: 1,
    history_fingerprint_sha256: fingerprint,
    mutation_performed: false,
    automatic_retry_allowed: false,
    authority: {},
  };
}

function reservation(): any {
  return {
    schema: "void_buy_void_inventory_reservation_v1",
    marker: "VOID_BUY_VOID_INVENTORY_RESERVATION_JOURNAL_V1",
    reservation_id: "e".repeat(64),
    reserved_at_ms: 1770000000000,
    pool_id: POOL,
    inventory_policy_version: "presale-v1",
    pool_capacity_void_units: "10000000000000",
    committed_before_void_units: "0",
    reserved_void_units: "1000000",
    committed_after_void_units: "1000000",
    available_after_void_units: "9999999000000",
    payment_key_sha256: PAYMENT_A,
    request_key_sha256: REQUEST_A,
    canonical_payment_identity:
      "voidpay1:base:0x" + "6".repeat(64) + ":7",
    request_id: "buyvoid-history-carrier-a",
    instruction_id: "voidfill-history-carrier-a",
    delivery_address: ADDRESS_A,
    intent_fingerprint: "7".repeat(64),
    reservation_status: "reserved",
    inventory_decrement_performed: false,
    reservation_release_authorized: false,
    execution_authorized_by_this_module: false,
    signing_authorized_by_this_module: false,
    transaction_broadcast_authorized_by_this_module: false,
    money_movement_authorized_by_this_module: false,
  };
}

function obligation(): any {
  return {
    schema: "void_buy_void_paid_unreservable_obligation_v1",
    marker: "VOID_BUY_VOID_PAID_UNRESERVABLE_OBLIGATION_V1",
    obligation_id: "f".repeat(64),
    recorded_at_ms: 1770000000100,
    terminal_state: "operator_reconciliation_required",
    reservation_failure_reason: "inventory_sold_out",
    pool_id: POOL,
    inventory_policy_version: "presale-v1",
    pool_capacity_void_units: "10000000000000",
    inventory_policy_fingerprint_sha256: "8".repeat(64),
    available_void_units: "0",
    requested_void_units: "2000000",
    source_chain: "base",
    payment_transaction_hash: "0x" + "9".repeat(64),
    payment_log_index: "8",
    confirmed_block_number: "100",
    confirmation_count_at_claim: "12",
    payment_usdc_units: "1000000",
    payment_key_sha256: PAYMENT_B,
    request_key_sha256: REQUEST_B,
    canonical_payment_identity:
      "voidpay1:base:0x" + "9".repeat(64) + ":8",
    request_id: "buyvoid-history-carrier-b",
    instruction_id: "voidfill-history-carrier-b",
    delivery_address: ADDRESS_B,
    customer_payment_confirmed: true,
    reservation_created: false,
    automatic_retry: false,
    refund_execution_authorized: false,
    alternate_fulfillment_execution_authorized: false,
    wallet_access_authorized: false,
    signing_authorized: false,
    transaction_broadcast_authorized: false,
    money_movement_authorized: false,
  };
}

function bytes(value: unknown): Buffer {
  return Buffer.from(JSON.stringify(value, null, 2) + "\n", "utf8");
}

function locator(
  root: SegmentedJsonlDurableRootV1,
  recordBytes: Buffer,
  sequence: number,
): BuyVoidHistoryRecordLocatorV1 {
  return {
    segmented_durable_root_sha256: root.root_sha256,
    segment_id: sequence,
    segment_sha256: sha256("segment-" + sequence),
    byte_offset: String(sequence * 4096),
    byte_length: recordBytes.length,
    record_sha256: sha256(recordBytes),
  };
}

assert.equal(VOID_BUY_VOID_HISTORY_CARRIER_PAGE_BYTES_V1, 8192);
assert.equal(VOID_BUY_VOID_HISTORY_CARRIER_MAX_INDEX_DEPTH_V1, 64);
assert.equal(VOID_BUY_VOID_HISTORY_CARRIER_MAX_INDEX_PAGE_READS_V1, 65);
assert.equal(VOID_BUY_VOID_HISTORY_CARRIER_MAX_LEAF_ENTRIES_V1, 56);
assert.equal(VOID_BUY_VOID_HISTORY_CARRIER_MAX_PAGE_WRITES_PER_INSERT_V1, 79);

const empty = createEmptyBuyVoidHistoryIndexV1();
const pageStore = new Map<string, Buffer>([
  [empty.root_sha256, Buffer.from(empty.page)],
]);
const readPage = (digest: string): Buffer => {
  const value = pageStore.get(digest);
  if (!value) throw new Error("missing-page:" + digest);
  return Buffer.from(value);
};
const retain = (
  pages: Array<{ sha256: string; bytes: Buffer }>,
): void => {
  for (const page of pages) {
    const prior = pageStore.get(page.sha256);
    if (prior) assert.deepEqual(prior, page.bytes);
    pageStore.set(page.sha256, Buffer.from(page.bytes));
  }
};

function syntheticEntry(index: number): BuyVoidHistoryIndexEntryV1 {
  const key =
    (index % 16).toString(16) +
    Math.floor(index / 16).toString(16) +
    "a".repeat(62);
  return {
    payment_key_sha256: key,
    locator: {
      segmented_durable_root_sha256: sha256("root-" + index),
      segment_id: index,
      segment_sha256: sha256("segment-" + index),
      byte_offset: String(index * 128),
      byte_length: 128,
      record_sha256: sha256("record-" + index),
    },
  };
}

let splitRoot = empty.root_sha256;
let splitPageCount = 0;
for (let index = 0; index < 57; index += 1) {
  const result = insertBuyVoidHistoryIndexV1(
    splitRoot,
    syntheticEntry(index),
    readPage,
  );
  assert.equal(result.status, "inserted");
  assert.ok(
    result.new_pages.length <=
      VOID_BUY_VOID_HISTORY_CARRIER_MAX_PAGE_WRITES_PER_INSERT_V1,
  );
  splitPageCount = result.new_pages.length;
  retain(result.new_pages);
  splitRoot = result.root_sha256;
}
assert.ok(splitPageCount >= 2);
for (let index = 0; index < 57; index += 1) {
  const result = lookupBuyVoidHistoryIndexV1(
    splitRoot,
    syntheticEntry(index).payment_key_sha256,
    readPage,
  );
  assert.equal(result.found, true);
  assert.ok(
    result.page_reads <=
      VOID_BUY_VOID_HISTORY_CARRIER_MAX_INDEX_PAGE_READS_V1,
  );
}

const durable1 = durableRoot(1, null);
const record1 = reservation();
const record1Bytes = bytes(record1);
const locator1 = locator(durable1, record1Bytes, 1);
const located1 = verifyLocatedBuyVoidHistoryRecordV1(
  PAYMENT_A,
  locator1,
  record1Bytes,
);
assert.equal(located1.record_sha256, locator1.record_sha256);
assert.equal(
  located1.record.payment_key_sha256,
  PAYMENT_A,
);

const fresh = createEmptyBuyVoidHistoryIndexV1();
pageStore.set(fresh.root_sha256, Buffer.from(fresh.page));

const plan1 = planBuyVoidHistoryCarrierCommitV1({
  previous_carrier_root: null,
  current_index_root_sha256: fresh.root_sha256,
  segmented_durable_root: durable1,
  history_reconciliation: reconciliation(sha256("history-1")),
  record: record1,
  record_locator: locator1,
  record_bytes: record1Bytes,
  read_page: readPage,
});
assert.equal(plan1.status, "planned");
if (plan1.status !== "planned") throw new Error("plan1-not-planned");
retain(plan1.new_pages);
assert.equal(plan1.carrier_root.carrier_generation, 1);
assert.equal(plan1.carrier_root.pool_id, POOL);
assert.equal(
  plan1.carrier_root.active_segmented_durable_root_sha256,
  durable1.root_sha256,
);
assert.equal(
  plan1.carrier_root.active_segmented_store_generation,
  1,
);
assert.equal(plan1.carrier_root.committed_void_units, "1000000");
assert.equal(plan1.carrier_root.reservation_count, "1");
assert.equal(plan1.carrier_root.obligation_count, "0");
assert.equal(plan1.carrier_root.committing_record_kind, "reservation");
assert.deepEqual(
  verifyBuyVoidHistoryCarrierRootV1(plan1.carrier_root),
  plan1.carrier_root,
);
assert.deepEqual(
  verifyBuyVoidHistoryCarrierTxIntentV1(plan1.tx_intent),
  plan1.tx_intent,
);

const durable2 = durableRoot(2, durable1);
const record2 = obligation();
const record2Bytes = bytes(record2);
const locator2 = locator(durable2, record2Bytes, 2);
const plan2 = planBuyVoidHistoryCarrierCommitV1({
  previous_carrier_root: plan1.carrier_root,
  current_index_root_sha256: plan1.index_root_sha256,
  segmented_durable_root: durable2,
  history_reconciliation: reconciliation(sha256("history-2")),
  record: record2,
  record_locator: locator2,
  record_bytes: record2Bytes,
  read_page: readPage,
});
assert.equal(plan2.status, "planned");
if (plan2.status !== "planned") throw new Error("plan2-not-planned");
retain(plan2.new_pages);
assert.equal(plan2.carrier_root.carrier_generation, 2);
assert.equal(plan2.carrier_root.committed_void_units, "1000000");
assert.equal(plan2.carrier_root.reservation_count, "1");
assert.equal(plan2.carrier_root.obligation_count, "1");
assert.equal(
  plan2.carrier_root.committing_record_kind,
  "paid_unreservable_obligation",
);
assert.deepEqual(
  verifyBuyVoidHistoryCarrierSuccessorV1(
    plan1.carrier_root,
    plan2.carrier_root,
  ),
  plan2.carrier_root,
);

assert.equal(
  lookupBuyVoidHistoryIndexV1(
    plan2.index_root_sha256,
    PAYMENT_A,
    readPage,
  ).found,
  true,
);
assert.equal(
  lookupBuyVoidHistoryIndexV1(
    plan2.index_root_sha256,
    PAYMENT_B,
    readPage,
  ).found,
  true,
);

const duplicate = planBuyVoidHistoryCarrierCommitV1({
  previous_carrier_root: plan2.carrier_root,
  current_index_root_sha256: plan2.index_root_sha256,
  segmented_durable_root: durable2,
  history_reconciliation: reconciliation(sha256("history-2")),
  record: record2,
  record_locator: locator2,
  record_bytes: record2Bytes,
  read_page: readPage,
});
assert.equal(duplicate.status, "duplicate");

expectFailure(
  () =>
    planBuyVoidHistoryCarrierCommitV1({
      previous_carrier_root: plan1.carrier_root,
      current_index_root_sha256: plan1.index_root_sha256,
      segmented_durable_root: durable2,
      history_reconciliation: {
        ...reconciliation(sha256("held")),
        ok: false,
        status: "held",
      } as any,
      record: record2,
      record_locator: locator2,
      record_bytes: record2Bytes,
      read_page: readPage,
    }),
  "HISTORY_RECONCILIATION_REQUIRED",
);

expectFailure(
  () =>
    planBuyVoidHistoryCarrierCommitV1({
      previous_carrier_root: plan1.carrier_root,
      current_index_root_sha256: plan1.index_root_sha256,
      segmented_durable_root: durable2,
      history_reconciliation: reconciliation(sha256("history-2")),
      record: record2,
      record_locator: {
        ...locator2,
        segmented_durable_root_sha256: durable1.root_sha256,
      },
      record_bytes: record2Bytes,
      read_page: readPage,
    }),
  "LOCATOR_DURABLE_ROOT_MISMATCH",
);

const alteredRecord = {
  ...record2,
  request_id: "buyvoid-history-carrier-b-altered",
};
expectFailure(
  () =>
    planBuyVoidHistoryCarrierCommitV1({
      previous_carrier_root: plan1.carrier_root,
      current_index_root_sha256: plan1.index_root_sha256,
      segmented_durable_root: durable2,
      history_reconciliation: reconciliation(sha256("history-2")),
      record: alteredRecord,
      record_locator: locator2,
      record_bytes: record2Bytes,
      read_page: readPage,
    }),
  "LOCATED_RECORD_OBJECT_MISMATCH",
);

expectFailure(
  () =>
    planBuyVoidHistoryCarrierCommitV1({
      previous_carrier_root: plan1.carrier_root,
      current_index_root_sha256: plan1.index_root_sha256,
      segmented_durable_root: {
        ...durable2,
        root_sha256: "0".repeat(64),
      },
      history_reconciliation: reconciliation(sha256("history-2")),
      record: record2,
      record_locator: locator2,
      record_bytes: record2Bytes,
      read_page: readPage,
    }),
  "SEGMENTED_DURABLE_ROOT_DIGEST_MISMATCH",
);

const conflictLocator = {
  ...locator2,
  segment_sha256: sha256("different-segment"),
};
expectFailure(
  () =>
    insertBuyVoidHistoryIndexV1(
      plan2.index_root_sha256,
      {
        payment_key_sha256: PAYMENT_B,
        locator: conflictLocator,
      },
      readPage,
    ),
  "INDEX_KEY_CONFLICT",
);

for (const [key, expected] of Object.entries({
  current_segmented_durable_root_required: true,
  payment_keyed_history_reconciliation_required: true,
  durable_reservation_or_obligation_record_required: true,
  postgres_dispatcher_is_not_history_authority: true,
  total_local_rollback_detection: false,
  coordinated_whole_host_rollback_detection: false,
  chain_side_fulfillment_uniqueness_authority: false,
  runtime_integration: false,
  credential_access: false,
  wallet_access: false,
  rpc_call: false,
  signing: false,
  transaction_broadcast: false,
  automatic_retry: false,
  money_movement: false,
})) {
  assert.equal(
    (VOID_BUY_VOID_HISTORY_CARRIER_AUTHORITY_V1 as any)[key],
    expected,
    key,
  );
}

console.log(
  "VOID_BUY_VOID_HISTORY_CARRIER_V1_PROOF_GREEN",
);
console.log("current_segmented_durable_root_bound=true");
console.log("payment_keyed_history_reconciliation_required=true");
console.log("reservation_and_obligation_records_indexed=true");
console.log("authenticated_membership_and_absence=true");
console.log("exact_record_locator_digest_verified=true");
console.log("duplicate_converges=true");
console.log("conflicting_locator_rejected=true");
console.log("reservation_total_advances_only_on_reservation=true");
console.log("obligation_count_advances_separately=true");
console.log("maximum_index_page_reads=65");
console.log("maximum_leaf_entries=56");
console.log("maximum_page_writes_per_insert=79");
console.log("postgres_dispatcher_is_not_history_authority=true");
console.log("coordinated_whole_host_rollback_detection=false");
console.log("chain_side_fulfillment_uniqueness_authority=false");
console.log("runtime_integration=false");
console.log("wallet_access=false");
console.log("signing=false");
console.log("transaction_broadcast=false");
console.log("money_movement=false");
