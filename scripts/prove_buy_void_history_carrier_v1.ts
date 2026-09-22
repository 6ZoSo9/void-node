#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  VOID_SEGMENTED_JSONL_DURABLE_ROOT_V1,
  publishSegmentedJsonlDurableRootV1,
  type SegmentedJsonlDurableRootV1,
} from "../src/storage/segmented_jsonl_durable_root_v1.js";
import {
  buildSegmentedJsonlV1FromFile,
  reconstructSegmentedJsonlV1ToFile,
} from "../src/storage/segmented_jsonl_v1.js";
import {
  deriveSegmentedJsonlCheckpointV1,
  deriveSegmentedJsonlSnapshotAuthorityV1,
} from "../src/storage/segmented_jsonl_snapshot_authority_v1.js";
import {
  deriveSegmentedJsonlMaterializedAuthorityV1,
} from "../src/storage/segmented_jsonl_materialized_authority_v1.js";
import {
  VOID_BUY_VOID_HISTORY_CARRIER_ACTIVE_SEGMENT_ID_V1,
  VOID_BUY_VOID_HISTORY_CARRIER_AUTHORITY_V1,
  VOID_BUY_VOID_HISTORY_CARRIER_MAX_INDEX_DEPTH_V1,
  VOID_BUY_VOID_HISTORY_CARRIER_MAX_INDEX_PAGE_READS_V1,
  VOID_BUY_VOID_HISTORY_CARRIER_MAX_LEAF_ENTRIES_V1,
  VOID_BUY_VOID_HISTORY_CARRIER_MAX_LOCATED_RECORD_BYTES_V1,
  VOID_BUY_VOID_HISTORY_CARRIER_MAX_PAGE_WRITES_PER_INSERT_V1,
  VOID_BUY_VOID_HISTORY_CARRIER_PAGE_BYTES_V1,
  createEmptyBuyVoidHistoryIndexV1,
  deriveBuyVoidHistoryCarrierTxIntentV1,
  insertBuyVoidHistoryIndexV1,
  lookupBuyVoidHistoryIndexV1,
  planBuyVoidHistoryCarrierCommitFromVerifiedBytesV1,
  planBuyVoidHistoryCarrierCommitV1,
  planBuyVoidHistoryCarrierRefreshV1,
  verifyBuyVoidHistoryCarrierRootV1,
  verifyBuyVoidHistoryCarrierSuccessorV1,
  verifyBuyVoidHistoryCarrierTxIntentV1,
  verifyBuyVoidHistoryCarrierTxIntentBindingV1,
  verifyLocatedBuyVoidHistoryRecordV1,
  type BuyVoidHistoryIndexEntryV1,
  type BuyVoidHistoryRecordLocatorV1,
} from "../src/economic/buy_void_history_carrier_v1.js";
import {
  projectBuyVoidPaymentHistoryV1,
} from "../src/economic/buy_void_payment_history_projection_v1.js";
import {
  claimBuyVoidFulfillmentJournalV1,
} from "../src/economic/buy_void_fulfillment_journal_v1.js";
import {
  buildBuyVoidVerifiedPaymentEventV2,
  type BuyVoidTransactionReceiptV2,
} from "../src/economic/buy_void_verified_payment_v2.js";
import type {
  BuyVoidAutoFulfillmentPolicyV1,
  BuyVoidRequestV1,
} from "../src/economic/buy_void_auto_fulfillment_v1.js";
import {
  listBuyVoidInventoryReservationsV1,
  listBuyVoidPaidUnreservableObligationsV1,
  reserveBuyVoidInventoryV1,
} from "../src/economic/buy_void_inventory_reservation_journal_v1.js";
import {
  prepareBuyVoidExecutionTransactionV1,
  recordBuyVoidExecutionBroadcastV1,
  recordBuyVoidExecutionConfirmedV1,
  reserveBuyVoidExecutionAttemptV1,
} from "../src/economic/buy_void_execution_attempt_journal_v1.js";
import {
  confirmBuyVoidFulfillmentV1,
} from "../src/economic/buy_void_fulfillment_confirmation_v1.js";
import {
  planBuyVoidConfirmedCloseoutV1,
  writeBuyVoidInventoryConsumptionV1,
} from "../src/economic/buy_void_confirmed_closeout_v1.js";

const POOL = "buy-void-presale-v1";
const ADDRESS_A =
  "0x1111111111111111111111111111111111111111";
const ADDRESS_B =
  "0x2222222222222222222222222222222222222222";
const WALLET =
  "0x8888888888888888888888888888888888888888";
const PAYMENT_A = "a".repeat(64);
const PAYMENT_B = "b".repeat(64);
const REQUEST_A = "c".repeat(64);
const REQUEST_B = "d".repeat(64);

function sha256(value: Buffer | string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function keyValueFingerprint(
  parts: Record<string, string>,
): string {
  return sha256(
    Object.keys(parts)
      .sort()
      .map((key) => key + "=" + parts[key])
      .join("\n"),
  );
}

function expectFailure(
  run: () => unknown,
  marker: string,
): void {
  let error: unknown;
  try {
    run();
  } catch (caught) {
    error = caught;
  }
  if (!(error instanceof Error)) {
    throw new Error(
      "expected failure containing " + marker,
    );
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
    materialized_sha256:
      sha256("materialized-" + generation),
    append_only_witness_sha256:
      generation === 1
        ? null
        : sha256("witness-" + generation),
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

function reservation(): any {
  return {
    schema: "void_buy_void_inventory_reservation_v1",
    marker:
      "VOID_BUY_VOID_INVENTORY_RESERVATION_JOURNAL_V1",
    reservation_id: "e".repeat(64),
    reserved_at_ms: 1_770_000_000_000,
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
    schema:
      "void_buy_void_paid_unreservable_obligation_v1",
    marker:
      "VOID_BUY_VOID_PAID_UNRESERVABLE_OBLIGATION_V1",
    obligation_id: "f".repeat(64),
    recorded_at_ms: 1_770_000_000_100,
    terminal_state: "operator_reconciliation_required",
    reservation_failure_reason: "inventory_sold_out",
    pool_id: POOL,
    inventory_policy_version: "presale-v1",
    pool_capacity_void_units: "10000000000000",
    inventory_policy_fingerprint_sha256:
      "8".repeat(64),
    available_void_units: "0",
    requested_void_units: "2000000",
    source_chain: "base",
    payment_transaction_hash:
      "0x" + "9".repeat(64),
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
  return Buffer.from(
    JSON.stringify(value, null, 2) + "\n",
    "utf8",
  );
}

function locator(
  root: SegmentedJsonlDurableRootV1,
  recordBytes: Buffer,
  sequence: number,
): BuyVoidHistoryRecordLocatorV1 {
  return {
    segmented_durable_root_sha256: root.root_sha256,
    segment_id: sequence,
    segment_sha256:
      sha256("segment-" + sequence),
    byte_offset: String(sequence * 4096),
    byte_length: recordBytes.length,
    record_sha256: sha256(recordBytes),
  };
}

function syntheticEntry(
  index: number,
  stateSuffix = "initial",
): BuyVoidHistoryIndexEntryV1 {
  const key =
    (index % 16).toString(16) +
    Math.floor(index / 16).toString(16) +
    "a".repeat(62);
  return {
    payment_key_sha256: key,
    locator: {
      segmented_durable_root_sha256:
        sha256("root-" + index),
      segment_id: index,
      segment_sha256:
        sha256("segment-" + index),
      byte_offset: String(index * 128),
      byte_length: 128,
      record_sha256: sha256("record-" + index),
    },
    primary_record_fingerprint_sha256:
      sha256("primary-record-" + index),
    payment_history_fingerprint_sha256:
      sha256(
        "payment-state-" +
          index +
          "-" +
          stateSuffix,
      ),
  };
}

assert.equal(
  VOID_BUY_VOID_HISTORY_CARRIER_PAGE_BYTES_V1,
  8192,
);
assert.equal(
  VOID_BUY_VOID_HISTORY_CARRIER_MAX_INDEX_DEPTH_V1,
  64,
);
assert.equal(
  VOID_BUY_VOID_HISTORY_CARRIER_MAX_INDEX_PAGE_READS_V1,
  65,
);
assert.equal(
  VOID_BUY_VOID_HISTORY_CARRIER_MAX_LOCATED_RECORD_BYTES_V1,
  1_048_576,
);
assert.equal(
  VOID_BUY_VOID_HISTORY_CARRIER_MAX_LEAF_ENTRIES_V1,
  39,
);
assert.equal(
  VOID_BUY_VOID_HISTORY_CARRIER_MAX_PAGE_WRITES_PER_INSERT_V1,
  79,
);

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
    pageStore.set(
      page.sha256,
      Buffer.from(page.bytes),
    );
  }
};

let splitRoot = empty.root_sha256;
let splitPageCount = 0;
for (
  let index = 0;
  index <
    VOID_BUY_VOID_HISTORY_CARRIER_MAX_LEAF_ENTRIES_V1 + 1;
  index += 1
) {
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
for (
  let index = 0;
  index <
    VOID_BUY_VOID_HISTORY_CARRIER_MAX_LEAF_ENTRIES_V1 + 1;
  index += 1
) {
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

const updateKey = syntheticEntry(0);
const updatedState = syntheticEntry(0, "updated");
const updateResult = insertBuyVoidHistoryIndexV1(
  splitRoot,
  updatedState,
  readPage,
);
assert.equal(updateResult.status, "updated");
assert.ok(updateResult.new_pages.length > 0);
retain(updateResult.new_pages);
splitRoot = updateResult.root_sha256;
const updatedLookup = lookupBuyVoidHistoryIndexV1(
  splitRoot,
  updateKey.payment_key_sha256,
  readPage,
);
assert.equal(updatedLookup.found, true);
assert.equal(
  updatedLookup.entry?.payment_history_fingerprint_sha256,
  updatedState.payment_history_fingerprint_sha256,
);
const updateReplay = insertBuyVoidHistoryIndexV1(
  splitRoot,
  updatedState,
  readPage,
);
assert.equal(updateReplay.status, "duplicate");
assert.equal(updateReplay.new_pages.length, 0);

const primaryConflict = {
  ...updatedState,
  primary_record_fingerprint_sha256:
    sha256("different-primary-record"),
};
expectFailure(
  () =>
    insertBuyVoidHistoryIndexV1(
      splitRoot,
      primaryConflict,
      readPage,
    ),
  "INDEX_PRIMARY_RECORD_CONFLICT",
);

const conflictingEntry = {
  ...updatedState,
  locator: {
    ...updatedState.locator,
    segment_sha256: sha256("different-segment"),
  },
};
expectFailure(
  () =>
    insertBuyVoidHistoryIndexV1(
      splitRoot,
      conflictingEntry,
      readPage,
    ),
  "INDEX_KEY_CONFLICT",
);

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

const carrierPages = new Map<string, Buffer>();
const carrierEmpty = createEmptyBuyVoidHistoryIndexV1();
carrierPages.set(
  carrierEmpty.root_sha256,
  Buffer.from(carrierEmpty.page),
);
const carrierReadPage = (digest: string): Buffer => {
  const value = carrierPages.get(digest);
  if (!value) {
    throw new Error("missing-carrier-page:" + digest);
  }
  return Buffer.from(value);
};
const retainCarrier = (
  pages: Array<{ sha256: string; bytes: Buffer }>,
): void => {
  for (const page of pages) {
    carrierPages.set(
      page.sha256,
      Buffer.from(page.bytes),
    );
  }
};

const plan1 =
  planBuyVoidHistoryCarrierCommitFromVerifiedBytesV1({
    previous_carrier_root: null,
    current_index_root_sha256:
      carrierEmpty.root_sha256,
    segmented_durable_root: durable1,
    pool_id: POOL,
    payment_history_fingerprint_sha256:
      sha256("history-reserved-1"),
    record: record1,
    record_locator: locator1,
    record_bytes: record1Bytes,
    read_page: carrierReadPage,
  });
assert.equal(plan1.status, "planned");
if (plan1.status !== "planned") {
  throw new Error("plan1-not-planned");
}
retainCarrier(plan1.new_pages);
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
assert.deepEqual(
  verifyBuyVoidHistoryCarrierTxIntentBindingV1(
    plan1.tx_intent,
    plan1.carrier_root,
  ).intent,
  plan1.tx_intent,
);
const semanticallyWrongIntent =
  deriveBuyVoidHistoryCarrierTxIntentV1({
    predecessor_carrier_root_sha256:
      plan1.tx_intent.predecessor_carrier_root_sha256,
    pool_id: plan1.tx_intent.pool_id,
    committing_record_kind:
      plan1.tx_intent.committing_record_kind,
    committing_payment_key_sha256:
      plan1.tx_intent.committing_payment_key_sha256,
    committing_record_locator:
      plan1.tx_intent.committing_record_locator,
    expected_segmented_durable_root_sha256:
      plan1.tx_intent.expected_segmented_durable_root_sha256,
    expected_segmented_store_generation:
      plan1.tx_intent.expected_segmented_store_generation,
    expected_payment_history_fingerprint_sha256:
      plan1.tx_intent.expected_payment_history_fingerprint_sha256,
    expected_index_root_sha256:
      plan1.tx_intent.expected_index_root_sha256,
    expected_committed_void_units:
      plan1.tx_intent.expected_committed_void_units,
    expected_reservation_count:
      String(
        BigInt(plan1.tx_intent.expected_reservation_count) + 1n,
      ),
    expected_obligation_count:
      plan1.tx_intent.expected_obligation_count,
    expected_carrier_root_sha256:
      plan1.tx_intent.expected_carrier_root_sha256,
    new_page_digests:
      plan1.tx_intent.new_page_digests,
  });
expectFailure(
  () =>
    verifyBuyVoidHistoryCarrierTxIntentBindingV1(
      semanticallyWrongIntent,
      plan1.carrier_root,
    ),
  "TX_INTENT_CARRIER_ROOT_BINDING_MISMATCH",
);

const record2 = obligation();
const record2Bytes = bytes(record2);
const durable2 = durableRoot(2, durable1);
const locator2 = locator(durable2, record2Bytes, 2);
const plan2 =
  planBuyVoidHistoryCarrierCommitFromVerifiedBytesV1({
    previous_carrier_root: plan1.carrier_root,
    current_index_root_sha256:
      plan1.index_root_sha256,
    segmented_durable_root: durable2,
    pool_id: POOL,
    payment_history_fingerprint_sha256:
      sha256("history-obligation-1"),
    record: record2,
    record_locator: locator2,
    record_bytes: record2Bytes,
    read_page: carrierReadPage,
  });
assert.equal(plan2.status, "planned");
if (plan2.status !== "planned") {
  throw new Error("plan2-not-planned");
}
retainCarrier(plan2.new_pages);
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
const successorSource = fs.readFileSync(
  path.join(
    process.cwd(),
    "src/economic/buy_void_history_carrier_v1.ts",
  ),
  "utf8",
);
assert.match(
  successorSource,
  /after\.active_segmented_store_generation\s*<\s*before\.active_segmented_store_generation/u,
);
assert.match(
  successorSource,
  /SEGMENTED_DURABLE_ROOT_SAME_GENERATION_CONFLICT/u,
);

const duplicate =
  planBuyVoidHistoryCarrierCommitFromVerifiedBytesV1({
    previous_carrier_root: plan2.carrier_root,
    current_index_root_sha256:
      plan2.index_root_sha256,
    segmented_durable_root: durable2,
    pool_id: POOL,
    payment_history_fingerprint_sha256:
      sha256("history-obligation-1"),
    record: record2,
    record_locator: locator2,
    record_bytes: record2Bytes,
    read_page: carrierReadPage,
  });
assert.equal(duplicate.status, "duplicate");

const refreshed =
  planBuyVoidHistoryCarrierCommitFromVerifiedBytesV1({
    previous_carrier_root: plan2.carrier_root,
    current_index_root_sha256:
      plan2.index_root_sha256,
    segmented_durable_root: durable2,
    pool_id: POOL,
    payment_history_fingerprint_sha256:
      sha256("history-obligation-2"),
    record: record2,
    record_locator: locator2,
    record_bytes: record2Bytes,
    read_page: carrierReadPage,
  });
assert.equal(refreshed.status, "planned");
if (refreshed.status !== "planned") {
  throw new Error("refresh-not-planned");
}
assert.equal(
  refreshed.carrier_root.committing_record_kind,
  "history_refresh",
);
assert.equal(
  refreshed.carrier_root.committing_record_void_units,
  "0",
);
assert.equal(
  refreshed.carrier_root.committed_void_units,
  plan2.carrier_root.committed_void_units,
);
assert.equal(
  refreshed.carrier_root.reservation_count,
  plan2.carrier_root.reservation_count,
);
assert.equal(
  refreshed.carrier_root.obligation_count,
  plan2.carrier_root.obligation_count,
);
assert.deepEqual(
  verifyBuyVoidHistoryCarrierSuccessorV1(
    plan2.carrier_root,
    refreshed.carrier_root,
  ),
  refreshed.carrier_root,
);
retainCarrier(refreshed.new_pages);

expectFailure(
  () =>
    planBuyVoidHistoryCarrierCommitFromVerifiedBytesV1({
      previous_carrier_root: null,
      current_index_root_sha256:
        plan1.index_root_sha256,
      segmented_durable_root: durable1,
      pool_id: POOL,
      payment_history_fingerprint_sha256:
        sha256("genesis-nonempty-index"),
      record: record1,
      record_locator: locator1,
      record_bytes: record1Bytes,
      read_page: carrierReadPage,
    }),
  "CARRIER_GENESIS_INDEX_ROOT_MISMATCH",
);

expectFailure(
  () =>
    planBuyVoidHistoryCarrierCommitFromVerifiedBytesV1({
      previous_carrier_root: plan1.carrier_root,
      current_index_root_sha256:
        plan2.index_root_sha256,
      segmented_durable_root: durable2,
      pool_id: POOL,
      payment_history_fingerprint_sha256:
        sha256("stale-predecessor"),
      record: record2,
      record_locator: locator2,
      record_bytes: record2Bytes,
      read_page: carrierReadPage,
    }),
  "CARRIER_INDEX_PREDECESSOR_MISMATCH",
);

expectFailure(
  () =>
    planBuyVoidHistoryCarrierCommitFromVerifiedBytesV1({
      previous_carrier_root: plan1.carrier_root,
      current_index_root_sha256:
        plan1.index_root_sha256,
      segmented_durable_root: {
        ...durable2,
        root_sha256: "0".repeat(64),
      },
      pool_id: POOL,
      payment_history_fingerprint_sha256:
        sha256("invalid-root"),
      record: record2,
      record_locator: locator2,
      record_bytes: record2Bytes,
      read_page: carrierReadPage,
    }),
  "SEGMENTED_DURABLE_ROOT_DIGEST_MISMATCH",
);

const atUseTmp = fs.mkdtempSync(
  path.join(
    os.tmpdir(),
    "void-buy-void-history-carrier-at-use-v1-",
  ),
);
try {
  fs.chmodSync(atUseTmp, 0o700);
  const paymentRuntimeRoot = path.join(
    atUseTmp,
    "payment-runtime",
  );
  const sourceFile = path.join(
    atUseTmp,
    "source.jsonl",
  );
  const storeRoot = path.join(atUseTmp, "store");
  const materializedFile = path.join(
    atUseTmp,
    "materialized.jsonl",
  );
  const durableRootDirectory = path.join(
    atUseTmp,
    "durable-root",
  );
  fs.mkdirSync(durableRootDirectory, {
    mode: 0o700,
  });

  const receive =
    "0x3333333333333333333333333333333333333333";
  const usdc =
    "0x4444444444444444444444444444444444444444";
  const transferTopic =
    "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
  const topic = (address: string): string =>
    "0x" + "0".repeat(24) + address.slice(2);
  const uintHex = (value: bigint): string =>
    "0x" + value.toString(16);

  function claimedIntentFixture(input: {
    request_id: string;
    tx_char: string;
    log_index: number;
    delivery_address: string;
    usdc_amount: string;
    usdc_units: bigint;
    quoted_void: string;
    now_ms: number;
  }): {
    intent: any;
    request: BuyVoidRequestV1;
  } {
    const txHash =
      "0x" + input.tx_char.repeat(64);
    const request: BuyVoidRequestV1 = {
      request_id: input.request_id,
      source_chain: "base",
      tx_hash: txHash,
      delivery_address:
        input.delivery_address,
      receive_address: receive,
      usdc_amount: input.usdc_amount,
      quoted_void: input.quoted_void,
    };
    const receipt: BuyVoidTransactionReceiptV2 = {
      status: "0x1",
      transactionHash: txHash,
      blockNumber: "0x64",
      logs: [
        {
          address: usdc,
          topics: [
            transferTopic,
            topic(input.delivery_address),
            topic(receive),
          ],
          data: uintHex(input.usdc_units),
          logIndex:
            "0x" + input.log_index.toString(16),
          transactionHash: txHash,
          blockNumber: "0x64",
          removed: false,
        },
      ],
    };
    const verified =
      buildBuyVoidVerifiedPaymentEventV2({
        request,
        receipt,
        policy: {
          allowed_chains: ["base"],
          usdc_contract_by_chain: { base: usdc },
          receive_address_by_chain: {
            base: receive,
          },
          current_block_number_by_chain: {
            base: 105,
          },
        },
      });
    if ("reason" in verified) {
      throw new Error(verified.reason);
    }

    const claimPolicy:
      BuyVoidAutoFulfillmentPolicyV1 = {
        automatic_fulfillment_enabled: true,
        allowed_chains: ["base"],
        min_confirmations_by_chain: {
          base: 3,
        },
        usdc_contract_by_chain: {
          base: usdc,
        },
        receive_address_by_chain: {
          base: receive,
        },
        rate_void_units_numerator: "2",
        rate_void_units_denominator: "1",
        pool_remaining_void_units:
          "1000000",
        exact_payment_required: true,
      };
    const claimed =
      claimBuyVoidFulfillmentJournalV1({
        root_dir: paymentRuntimeRoot,
        request,
        verified_payment_event:
          verified.event,
        policy: claimPolicy,
        now_ms: input.now_ms,
      });
    if ("reason" in claimed) {
      throw new Error(claimed.reason);
    }
    assert.equal(claimed.status, "approved");
    return {
      intent: claimed.intent,
      request,
    };
  }

  const claimedA = claimedIntentFixture({
    request_id:
      "buyvoid-history-carrier-at-use-a",
    tx_char: "6",
    log_index: 7,
    delivery_address: ADDRESS_A,
    usdc_amount: "0.375",
    usdc_units: 375_000n,
    quoted_void: "0.75",
    now_ms: 1_770_000_000_000,
  });
  const claimedB = claimedIntentFixture({
    request_id:
      "buyvoid-history-carrier-at-use-b",
    tx_char: "7",
    log_index: 8,
    delivery_address: ADDRESS_B,
    usdc_amount: "0.25",
    usdc_units: 250_000n,
    quoted_void: "0.5",
    now_ms: 1_770_000_000_100,
  });
  const atUseIntent1 = claimedA.intent;
  const atUseIntent2 = claimedB.intent;

  const inventoryPolicy = {
    inventory_reservation_enabled: true,
    pool_id: POOL,
    inventory_policy_version: "presale-v1",
    pool_capacity_void_units: "1000000",
    max_reservation_void_units: "1000000",
  };

  const reserved = reserveBuyVoidInventoryV1({
    root_dir: paymentRuntimeRoot,
    intent: atUseIntent1,
    policy: inventoryPolicy,
    apply: true,
    now_ms: 1_770_000_000_200,
  });
  if (reserved.ok === false) {
    throw new Error(reserved.reason);
  }
  assert.equal(reserved.ok, true);
  assert.equal(reserved.status, "reserved");
  assert.equal(
    reserved.reservation.reserved_void_units,
    "750000",
  );

  const stranded = reserveBuyVoidInventoryV1({
    root_dir: paymentRuntimeRoot,
    intent: atUseIntent2,
    policy: inventoryPolicy,
    apply: true,
    now_ms: 1_770_000_000_300,
  });
  assert.equal(stranded.ok, false);
  if (stranded.ok) {
    throw new Error(
      "expected paid-unreservable hold",
    );
  }
  assert.equal(
    stranded.reason,
    "insufficient_void_inventory",
  );
  assert.equal(
    stranded.detail
      ?.terminal_recovery_obligation_recorded,
    true,
  );
  assert.equal(
    stranded.detail?.automatic_retry,
    false,
  );

  const atUseReservations =
    listBuyVoidInventoryReservationsV1({
      root_dir: paymentRuntimeRoot,
      pool_id: POOL,
    });
  const atUseObligations =
    listBuyVoidPaidUnreservableObligationsV1({
      root_dir: paymentRuntimeRoot,
      pool_id: POOL,
    });
  assert.equal(atUseReservations.length, 1);
  assert.equal(atUseObligations.length, 1);
  const atUseRecord1 = atUseReservations[0];
  const atUseRecord2 = atUseObligations[0];

  const initialProjection =
    projectBuyVoidPaymentHistoryV1({
      root_dir: paymentRuntimeRoot,
      pool_id: POOL,
      payment_key_sha256:
        atUseRecord1.payment_key_sha256,
    });
  assert.equal(
    initialProjection.lifecycle_state,
    "reserved",
  );
  assert.equal(initialProjection.attempt_count, 0);
  assert.equal(initialProjection.closeout, null);

  const atUseBytes1 = Buffer.from(
    JSON.stringify(atUseRecord1) + "\n",
    "utf8",
  );
  const atUseBytes2 = Buffer.from(
    JSON.stringify(atUseRecord2) + "\n",
    "utf8",
  );
  assert.notEqual(
    initialProjection.primary_record_sha256,
    sha256(atUseBytes1),
  );
  fs.writeFileSync(
    sourceFile,
    Buffer.concat([
      atUseBytes1,
      atUseBytes2,
    ]),
    { mode: 0o600 },
  );

  const manifest = buildSegmentedJsonlV1FromFile(
    sourceFile,
    storeRoot,
    {
      segmentTargetBytes: 64 * 1024,
      maxRecordBytes: 32 * 1024,
      generation: 1,
    },
  );
  assert.equal(
    manifest.sealed_segments.length,
    0,
  );
  reconstructSegmentedJsonlV1ToFile(
    storeRoot,
    materializedFile,
  );
  const snapshot =
    deriveSegmentedJsonlSnapshotAuthorityV1(
      manifest,
    );
  const materialized =
    deriveSegmentedJsonlMaterializedAuthorityV1(
      storeRoot,
      materializedFile,
    );
  const checkpoint =
    deriveSegmentedJsonlCheckpointV1(
      snapshot,
      null,
    );
  const durable =
    publishSegmentedJsonlDurableRootV1(
      durableRootDirectory,
      {
        checkpoint,
        snapshot,
        materialized,
      },
    );

  const atUseLocator1:
    BuyVoidHistoryRecordLocatorV1 = {
      segmented_durable_root_sha256:
        durable.root_sha256,
      segment_id:
        VOID_BUY_VOID_HISTORY_CARRIER_ACTIVE_SEGMENT_ID_V1,
      segment_sha256:
        manifest.active.sha256,
      byte_offset: "0",
      byte_length: atUseBytes1.length,
      record_sha256: sha256(atUseBytes1),
    };
  const atUseLocator2:
    BuyVoidHistoryRecordLocatorV1 = {
      segmented_durable_root_sha256:
        durable.root_sha256,
      segment_id:
        VOID_BUY_VOID_HISTORY_CARRIER_ACTIVE_SEGMENT_ID_V1,
      segment_sha256:
        manifest.active.sha256,
      byte_offset:
        String(atUseBytes1.length),
      byte_length: atUseBytes2.length,
      record_sha256: sha256(atUseBytes2),
    };

  const atUseEmpty =
    createEmptyBuyVoidHistoryIndexV1();
  const atUsePages = new Map<string, Buffer>([
    [
      atUseEmpty.root_sha256,
      Buffer.from(atUseEmpty.page),
    ],
  ]);
  const atUseReadPage =
    (digest: string): Buffer => {
      const value = atUsePages.get(digest);
      if (!value) {
        throw new Error(
          "missing-at-use-page:" + digest,
        );
      }
      return Buffer.from(value);
    };
  const retainAtUse = (
    pages: Array<{
      sha256: string;
      bytes: Buffer;
    }>,
  ): void => {
    for (const page of pages) {
      atUsePages.set(
        page.sha256,
        Buffer.from(page.bytes),
      );
    }
  };

  const atUsePlan1 =
    planBuyVoidHistoryCarrierCommitV1({
      previous_carrier_root: null,
      current_index_root_sha256:
        atUseEmpty.root_sha256,
      durable_root_directory:
        durableRootDirectory,
      store_root: storeRoot,
      materialized_file: materializedFile,
      materialized_authority: materialized,
      manifest,
      trusted_segmented_durable_root_sha256:
        durable.root_sha256,
      payment_runtime_root_dir:
        paymentRuntimeRoot,
      pool_id: POOL,
      record_locator: atUseLocator1,
      read_page: atUseReadPage,
    });
  assert.equal(atUsePlan1.status, "planned");
  if (atUsePlan1.status !== "planned") {
    throw new Error("at-use-plan1-not-planned");
  }
  retainAtUse(atUsePlan1.new_pages);
  const atUseEntry1 =
    lookupBuyVoidHistoryIndexV1(
      atUsePlan1.index_root_sha256,
      atUseRecord1.payment_key_sha256,
      atUseReadPage,
    );
  assert.equal(atUseEntry1.found, true);
  assert.ok(atUseEntry1.entry);
  assert.notEqual(
    atUseEntry1.entry?.primary_record_fingerprint_sha256,
    atUseEntry1.entry?.locator.record_sha256,
  );
  assert.equal(
    atUsePlan1.carrier_root
      .committed_void_units,
    "750000",
  );

  const atUsePlan2 =
    planBuyVoidHistoryCarrierCommitV1({
      previous_carrier_root:
        atUsePlan1.carrier_root,
      current_index_root_sha256:
        atUsePlan1.index_root_sha256,
      durable_root_directory:
        durableRootDirectory,
      store_root: storeRoot,
      materialized_file: materializedFile,
      materialized_authority: materialized,
      manifest,
      trusted_segmented_durable_root_sha256:
        durable.root_sha256,
      payment_runtime_root_dir:
        paymentRuntimeRoot,
      pool_id: POOL,
      record_locator: atUseLocator2,
      read_page: atUseReadPage,
    });
  assert.equal(atUsePlan2.status, "planned");
  if (atUsePlan2.status !== "planned") {
    throw new Error("at-use-plan2-not-planned");
  }
  retainAtUse(atUsePlan2.new_pages);
  assert.equal(
    atUsePlan2.carrier_root
      .committed_void_units,
    "750000",
  );
  assert.equal(
    atUsePlan2.carrier_root
      .reservation_count,
    "1",
  );
  assert.equal(
    atUsePlan2.carrier_root
      .obligation_count,
    "1",
  );

  const executionPolicy = {
    attempt_journal_enabled: true,
    max_attempts_per_payment: 1,
    chain_id: 2050,
    fulfillment_wallet_allowlist: [WALLET],
  };
  const attempt =
    reserveBuyVoidExecutionAttemptV1({
      root_dir: paymentRuntimeRoot,
      intent: atUseIntent1,
      policy: executionPolicy,
      now_ms: 1_770_000_000_400,
    });
  if ("reason" in attempt) {
    throw new Error(attempt.reason);
  }
  assert.equal(attempt.status, "reserved");

  const attemptProjection =
    projectBuyVoidPaymentHistoryV1({
      root_dir: paymentRuntimeRoot,
      pool_id: POOL,
      payment_key_sha256:
        atUseRecord1.payment_key_sha256,
    });
  assert.equal(
    attemptProjection.lifecycle_state,
    "attempt_reserved",
  );
  assert.equal(
    attemptProjection.attempt_count,
    1,
  );

  const attemptRefresh =
    planBuyVoidHistoryCarrierRefreshV1({
      previous_carrier_root:
        atUsePlan2.carrier_root,
      durable_root_directory:
        durableRootDirectory,
      trusted_segmented_durable_root_sha256:
        durable.root_sha256,
      payment_runtime_root_dir:
        paymentRuntimeRoot,
      pool_id: POOL,
      payment_key_sha256:
        atUseRecord1.payment_key_sha256,
      read_page: atUseReadPage,
    });
  assert.equal(
    attemptRefresh.status,
    "planned",
  );
  if (attemptRefresh.status !== "planned") {
    throw new Error(
      "attempt-refresh-not-planned",
    );
  }
  retainAtUse(attemptRefresh.new_pages);
  assert.equal(
    attemptRefresh.carrier_root
      .committing_record_kind,
    "history_refresh",
  );
  assert.equal(
    attemptRefresh.carrier_root
      .committed_void_units,
    "750000",
  );
  assert.equal(
    attemptRefresh.carrier_root
      .reservation_count,
    "1",
  );
  assert.equal(
    attemptRefresh.carrier_root
      .obligation_count,
    "1",
  );

  const attemptRefreshReplay =
    planBuyVoidHistoryCarrierRefreshV1({
      previous_carrier_root:
        attemptRefresh.carrier_root,
      durable_root_directory:
        durableRootDirectory,
      trusted_segmented_durable_root_sha256:
        durable.root_sha256,
      payment_runtime_root_dir:
        paymentRuntimeRoot,
      pool_id: POOL,
      payment_key_sha256:
        atUseRecord1.payment_key_sha256,
      read_page: atUseReadPage,
    });
  assert.equal(
    attemptRefreshReplay.status,
    "duplicate",
  );

  const deliveryTx =
    "0x" + "a".repeat(64);
  const prepared =
    prepareBuyVoidExecutionTransactionV1({
      root_dir: paymentRuntimeRoot,
      attempt_id:
        attempt.attempt.reservation.attempt_id,
      intent: atUseIntent1,
      policy: executionPolicy,
      transaction: {
        chain_id: 2050,
        transaction_hash: deliveryTx,
        from_address: WALLET,
        to_address: ADDRESS_A,
        amount_units: "750000",
      },
      now_ms: 1_770_000_000_500,
    });
  if ("reason" in prepared) {
    throw new Error(prepared.reason);
  }
  const preparedProjection =
    projectBuyVoidPaymentHistoryV1({
      root_dir: paymentRuntimeRoot,
      pool_id: POOL,
      payment_key_sha256:
        atUseRecord1.payment_key_sha256,
    });
  assert.equal(
    preparedProjection.lifecycle_state,
    "prepared",
  );
  assert.equal(
    preparedProjection.attempt_count,
    1,
  );

  const broadcast =
    recordBuyVoidExecutionBroadcastV1({
      root_dir: paymentRuntimeRoot,
      attempt_id:
        attempt.attempt.reservation.attempt_id,
      transaction_hash: deliveryTx,
      provider_submission_id:
        "carrier-proof-submit-1",
      now_ms: 1_770_000_000_600,
    });
  if ("reason" in broadcast) {
    throw new Error(broadcast.reason);
  }
  const broadcastProjection =
    projectBuyVoidPaymentHistoryV1({
      root_dir: paymentRuntimeRoot,
      pool_id: POOL,
      payment_key_sha256:
        atUseRecord1.payment_key_sha256,
    });
  assert.equal(
    broadcastProjection.lifecycle_state,
    "broadcast",
  );

  const confirmed =
    confirmBuyVoidFulfillmentV1({
      intent: atUseIntent1,
      observation: {
        chain_id: 2050,
        transaction_hash: deliveryTx,
        transaction_status: 1,
        block_number: 500,
        block_hash:
          "0x" + "b".repeat(64),
        current_block_number: 505,
        from_address: WALLET,
        to_address: ADDRESS_A,
        amount_units: "750000",
      },
      policy: {
        chain_id: 2050,
        min_confirmations: 3,
        fulfillment_wallet_allowlist: [
          WALLET,
        ],
      },
    });
  if ("reason" in confirmed) {
    throw new Error(confirmed.reason);
  }
  const recordedConfirmation =
    recordBuyVoidExecutionConfirmedV1({
      root_dir: paymentRuntimeRoot,
      attempt_id:
        attempt.attempt.reservation.attempt_id,
      confirmed_record: confirmed.record,
      delivery_block_hash:
        "0x" + "b".repeat(64),
      now_ms: 1_770_000_000_700,
    });
  if ("reason" in recordedConfirmation) {
    throw new Error(
      recordedConfirmation.reason,
    );
  }
  const confirmedProjection =
    projectBuyVoidPaymentHistoryV1({
      root_dir: paymentRuntimeRoot,
      pool_id: POOL,
      payment_key_sha256:
        atUseRecord1.payment_key_sha256,
    });
  assert.equal(
    confirmedProjection.lifecycle_state,
    "confirmed_pending_closeout",
  );

  const confirmedFile = path.join(
    paymentRuntimeRoot,
    "buy-void-execution-attempts-v1",
    "attempts",
    attempt.attempt.reservation.attempt_id,
    "confirmed.json",
  );
  const modernConfirmedBytes =
    fs.readFileSync(confirmedFile);
  const legacyConfirmed = JSON.parse(
    modernConfirmedBytes.toString("utf8"),
  ) as Record<string, any>;
  delete legacyConfirmed.delivery_block_hash;
  delete legacyConfirmed.confirmed_record
    .delivery_block_hash;
  legacyConfirmed.confirmed_record
    .delivery_binding_fingerprint =
      keyValueFingerprint({
        canonical_payment_identity:
          String(
            legacyConfirmed.confirmed_record
              .canonical_payment_identity,
          ),
        request_id:
          String(
            legacyConfirmed.confirmed_record.request_id,
          ),
        instruction_id:
          String(
            legacyConfirmed.confirmed_record
              .instruction_id,
          ),
        delivery_chain_id:
          String(
            legacyConfirmed.confirmed_record
              .delivery_chain_id,
          ),
        void_delivery_tx_hash:
          String(
            legacyConfirmed.confirmed_record
              .void_delivery_tx_hash,
          ),
        delivery_block_number:
          String(
            legacyConfirmed.confirmed_record
              .delivery_block_number,
          ),
        fulfillment_wallet:
          String(
            legacyConfirmed.confirmed_record
              .fulfillment_wallet,
          ),
        delivery_address:
          String(
            legacyConfirmed.confirmed_record
              .delivery_address,
          ),
        void_amount_units:
          String(
            legacyConfirmed.confirmed_record
              .void_amount_units,
          ),
      });
  legacyConfirmed.confirmation_fingerprint =
    keyValueFingerprint({
      marker:
        String(
          legacyConfirmed.confirmed_record.marker,
        ),
      canonical_payment_identity:
        String(
          legacyConfirmed.confirmed_record
            .canonical_payment_identity,
        ),
      request_id:
        String(
          legacyConfirmed.confirmed_record.request_id,
        ),
      instruction_id:
        String(
          legacyConfirmed.confirmed_record
            .instruction_id,
        ),
      void_delivery_tx_hash:
        String(
          legacyConfirmed.confirmed_record
            .void_delivery_tx_hash,
        ),
      fulfillment_wallet:
        String(
          legacyConfirmed.confirmed_record
            .fulfillment_wallet,
        ),
      delivery_address:
        String(
          legacyConfirmed.confirmed_record
            .delivery_address,
        ),
      void_amount_units:
        String(
          legacyConfirmed.confirmed_record
            .void_amount_units,
        ),
    });
  fs.writeFileSync(
    confirmedFile,
    JSON.stringify(legacyConfirmed, null, 2) + "\n",
    "utf8",
  );

  const legacyConfirmedProjection =
    projectBuyVoidPaymentHistoryV1({
      root_dir: paymentRuntimeRoot,
      pool_id: POOL,
      payment_key_sha256:
        atUseRecord1.payment_key_sha256,
    });
  assert.equal(
    legacyConfirmedProjection.lifecycle_state,
    "confirmed_pending_closeout",
  );

  const corruptedLegacyConfirmed =
    JSON.parse(
      JSON.stringify(legacyConfirmed),
    ) as Record<string, any>;
  corruptedLegacyConfirmed.confirmation_fingerprint =
    "0".repeat(64);
  fs.writeFileSync(
    confirmedFile,
    JSON.stringify(
      corruptedLegacyConfirmed,
      null,
      2,
    ) + "\n",
    "utf8",
  );
  expectFailure(
    () =>
      projectBuyVoidPaymentHistoryV1({
        root_dir: paymentRuntimeRoot,
        pool_id: POOL,
        payment_key_sha256:
          atUseRecord1.payment_key_sha256,
      }),
    "ATTEMPT_CONFIRMATION_BINDING_INVALID",
  );

  fs.writeFileSync(
    confirmedFile,
    modernConfirmedBytes,
  );
  const restoredConfirmedProjection =
    projectBuyVoidPaymentHistoryV1({
      root_dir: paymentRuntimeRoot,
      pool_id: POOL,
      payment_key_sha256:
        atUseRecord1.payment_key_sha256,
    });
  assert.equal(
    restoredConfirmedProjection.lifecycle_state,
    "confirmed_pending_closeout",
  );

  const closeoutPlan =
    planBuyVoidConfirmedCloseoutV1({
      policy: {
        enabled: true,
        pool_id: POOL,
        request_dir: path.join(
          atUseTmp,
          "unused-public-requests",
        ),
      },
      snapshot: {
        attempt:
          recordedConfirmation.attempt as any,
        inventory_reservation:
          atUseRecord1 as any,
        request: claimedA.request as any,
        operator_events: [],
        effective_status: "payment_verified",
        existing_fulfilled_event: null,
      },
      now_ms: 1_770_000_000_800,
    });
  if (closeoutPlan.ok === false) {
    throw new Error(closeoutPlan.reason);
  }
  const consumptionWrite =
    writeBuyVoidInventoryConsumptionV1({
      root_dir: paymentRuntimeRoot,
      record:
        closeoutPlan.plan
          .inventory_consumption,
    });
  if (consumptionWrite.ok === false) {
    throw new Error(
      consumptionWrite.reason,
    );
  }

  const closedProjection =
    projectBuyVoidPaymentHistoryV1({
      root_dir: paymentRuntimeRoot,
      pool_id: POOL,
      payment_key_sha256:
        atUseRecord1.payment_key_sha256,
    });
  assert.equal(
    closedProjection.lifecycle_state,
    "inventory_consumed",
  );
  assert.ok(closedProjection.closeout);

  const closeoutRefresh =
    planBuyVoidHistoryCarrierRefreshV1({
      previous_carrier_root:
        attemptRefresh.carrier_root,
      durable_root_directory:
        durableRootDirectory,
      trusted_segmented_durable_root_sha256:
        durable.root_sha256,
      payment_runtime_root_dir:
        paymentRuntimeRoot,
      pool_id: POOL,
      payment_key_sha256:
        atUseRecord1.payment_key_sha256,
      read_page: atUseReadPage,
    });
  assert.equal(
    closeoutRefresh.status,
    "planned",
  );
  if (closeoutRefresh.status !== "planned") {
    throw new Error(
      "closeout-refresh-not-planned",
    );
  }
  retainAtUse(closeoutRefresh.new_pages);
  assert.equal(
    closeoutRefresh.carrier_root
      .committed_void_units,
    "750000",
  );
  assert.equal(
    closeoutRefresh.carrier_root
      .reservation_count,
    "1",
  );
  assert.equal(
    closeoutRefresh.carrier_root
      .obligation_count,
    "1",
  );
  const closeoutEntry =
    lookupBuyVoidHistoryIndexV1(
      closeoutRefresh.index_root_sha256,
      atUseRecord1.payment_key_sha256,
      atUseReadPage,
    );
  assert.equal(closeoutEntry.found, true);
  assert.equal(
    closeoutEntry.entry
      ?.payment_history_fingerprint_sha256,
    closedProjection
      .payment_history_fingerprint_sha256,
  );

  const closeoutReplay =
    planBuyVoidHistoryCarrierRefreshV1({
      previous_carrier_root:
        closeoutRefresh.carrier_root,
      durable_root_directory:
        durableRootDirectory,
      trusted_segmented_durable_root_sha256:
        durable.root_sha256,
      payment_runtime_root_dir:
        paymentRuntimeRoot,
      pool_id: POOL,
      payment_key_sha256:
        atUseRecord1.payment_key_sha256,
      read_page: atUseReadPage,
    });
  assert.equal(
    closeoutReplay.status,
    "duplicate",
  );

  expectFailure(
    () =>
      planBuyVoidHistoryCarrierCommitV1({
        previous_carrier_root:
          atUsePlan1.carrier_root,
        current_index_root_sha256:
          atUsePlan1.index_root_sha256,
        durable_root_directory:
          durableRootDirectory,
        store_root: storeRoot,
        materialized_file:
          materializedFile,
        materialized_authority:
          materialized,
        manifest,
        trusted_segmented_durable_root_sha256:
          durable.root_sha256,
        payment_runtime_root_dir:
          paymentRuntimeRoot,
        pool_id: POOL,
        record_locator: {
          ...atUseLocator2,
          segment_sha256:
            sha256(
              "not-the-active-segment",
            ),
        },
        read_page: atUseReadPage,
      }),
    "LOCATOR_ACTIVE_SEGMENT_DIGEST_MISMATCH",
  );

  const tamperedMaterialized = path.join(
    atUseTmp,
    "materialized-tampered.jsonl",
  );
  fs.copyFileSync(
    materializedFile,
    tamperedMaterialized,
  );
  const fd = fs.openSync(
    tamperedMaterialized,
    "r+",
  );
  try {
    fs.writeSync(
      fd,
      Buffer.from("X"),
      0,
      1,
      0,
    );
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
  expectFailure(
    () =>
      planBuyVoidHistoryCarrierCommitV1({
        previous_carrier_root: null,
        current_index_root_sha256:
          atUseEmpty.root_sha256,
        durable_root_directory:
          durableRootDirectory,
        store_root: storeRoot,
        materialized_file:
          tamperedMaterialized,
        materialized_authority:
          materialized,
        manifest,
        trusted_segmented_durable_root_sha256:
          durable.root_sha256,
        payment_runtime_root_dir:
          paymentRuntimeRoot,
        pool_id: POOL,
        record_locator: atUseLocator1,
        read_page: atUseReadPage,
      }),
    "MATERIALIZED",
  );

  console.log(
    "durable_materialized_at_use_record_read=true",
  );
  console.log(
    "bounded_per_payment_projection=true",
  );
  console.log(
    "attempt_state_refresh=true",
  );
  console.log(
    "closeout_state_refresh=true",
  );
  console.log(
    "state_refresh_counter_increment=false",
  );
  console.log(
    "state_refresh_replay_duplicate=true",
  );
} finally {
  fs.rmSync(atUseTmp, {
    recursive: true,
    force: true,
  });
}

for (const [key, expected] of Object.entries({
  current_segmented_durable_root_required: true,
  bounded_payment_history_projection_required: true,
  tx_intent_digest_verifier_separate_from_semantic_binding: true,
  tx_intent_carrier_root_semantic_binding_available: true,
  closeout_consumption_fingerprint_recomputed: true,
  exact_closeout_record_digest_bound: true,
  inventory_consumption_closeout_state_bound: true,
  public_closeout_completion_bound: false,
  saga_closed_state_bound: false,
  exact_intent_record_digest_bound: true,
  canonical_payment_identity_hash_recomputed: true,
  full_attempt_state_fingerprint_bound: true,
  prepared_delivery_identity_revalidated: true,
  confirmation_payment_delivery_identity_revalidated: true,
  bounded_attempt_event_reads: true,
  legacy_unbounded_attempt_reader_used: false,
  bounded_projection_reuses_reconciliation_identity_invariants: true,
  global_history_reconciliation_full_scan_at_use: false,
  full_history_scan: false,
  durable_reservation_or_obligation_record_required: true,
  materialized_generation_pinned_at_use: true,
  manifest_segment_locator_required: true,
  verified_bytes_helper_mount_authority: false,
  caller_supplied_record_bytes_mount_authority: false,
  caller_supplied_record_object_mount_authority: false,
  caller_supplied_history_reconciliation_mount_authority: false,
  current_journal_record_match_required: true,
  filesystem_read_at_use: true,
  filesystem_write: false,
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

const carrierSource = fs.readFileSync(
  path.join(
    process.cwd(),
    "src/economic/buy_void_history_carrier_v1.ts",
  ),
  "utf8",
);
const projectionSource = fs.readFileSync(
  path.join(
    process.cwd(),
    "src/economic/buy_void_payment_history_projection_v1.ts",
  ),
  "utf8",
);
assert.match(projectionSource, /O_NOFOLLOW/u);
assert.doesNotMatch(
  projectionSource,
  /readBuyVoidExecutionAttemptV1/u,
);
assert.match(
  projectionSource,
  /readBoundedAttemptState/u,
);
assert.match(
  projectionSource,
  /intent_record_sha256:\s*intentRead\.sha256/u,
);
assert.match(
  projectionSource,
  /attempt_state_fingerprint_sha256:\s*sha256\(stableJson\(state\)\)/u,
);
assert.match(
  projectionSource,
  /ATTEMPT_PREPARED_BINDING_INVALID/u,
);
assert.match(
  projectionSource,
  /ATTEMPT_CONFIRMATION_BINDING_INVALID/u,
);
assert.match(
  projectionSource,
  /prepared_transaction_binding_fingerprint_recomputed:\s*true/u,
);
assert.match(
  projectionSource,
  /delivery_binding_fingerprint_recomputed:\s*true/u,
);
assert.match(
  projectionSource,
  /execution_confirmation_fingerprint_recomputed:\s*true/u,
);
assert.match(
  projectionSource,
  /historical_pre_receipt_continuity_confirmation_fingerprint_supported:\s*true/u,
);
assert.match(
  projectionSource,
  /canonical_payment_identity_hash_recomputed:\s*true/u,
);
assert.match(
  projectionSource,
  /expectedConsumptionFingerprint/u,
);
assert.match(
  projectionSource,
  /closeout_record_sha256:\s*read\.sha256/u,
);
assert.match(projectionSource, /before\.mtimeNs !== after\.mtimeNs/u);
assert.match(projectionSource, /before\.ctimeNs !== after\.ctimeNs/u);

assert.doesNotMatch(
  carrierSource,
  /reconcileBuyVoidPaymentKeyedDurableHistoryV1/u,
);
assert.match(
  carrierSource,
  /bounded_projection_reuses_reconciliation_identity_invariants:\s*true/u,
);
assert.match(
  carrierSource,
  /global_history_reconciliation_full_scan_at_use:\s*false/u,
);
assert.match(
  carrierSource,
  /caller_supplied_history_reconciliation_mount_authority:\s*false/u,
);

console.log(
  "VOID_BUY_VOID_HISTORY_CARRIER_V1_PROOF_GREEN",
);
console.log("maximum_index_page_reads=65");
console.log("maximum_leaf_entries=39");
console.log("maximum_page_writes_per_insert=79");
console.log("authenticated_membership_and_absence=true");
console.log("exact_record_locator_digest_verified=true");
console.log("cross_format_primary_record_identity_bound=true");
console.log("conflicting_locator_rejected=true");
console.log("bounded_state_update=true");
console.log("attempt_history_bound=true");
console.log("closeout_history_bound=true");
console.log("legacy_pre_receipt_continuity_confirmation_supported=true");
console.log("postgres_dispatcher_is_not_history_authority=true");
console.log("coordinated_whole_host_rollback_detection=false");
console.log("chain_side_fulfillment_uniqueness_authority=false");
console.log("runtime_integration=false");
console.log("wallet_access=false");
console.log("signing=false");
console.log("transaction_broadcast=false");
console.log("money_movement=false");
