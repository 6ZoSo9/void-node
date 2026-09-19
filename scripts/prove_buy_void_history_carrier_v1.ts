import assert from "node:assert/strict";
import crypto from "node:crypto";
import {
  VOID_BUY_VOID_HISTORY_CARRIER_MAX_INDEX_DEPTH_V1,
  VOID_BUY_VOID_HISTORY_CARRIER_MAX_INDEX_PAGE_READS_V1,
  VOID_BUY_VOID_HISTORY_CARRIER_MAX_LEAF_ENTRIES_V1,
  VOID_BUY_VOID_HISTORY_CARRIER_MAX_PAGE_WRITES_PER_INSERT_V1,
  VOID_BUY_VOID_HISTORY_CARRIER_MAX_UNCOMMITTED_PERSISTENT_PAGES_V1,
  VOID_BUY_VOID_HISTORY_CARRIER_PAGE_BYTES_V1,
  createEmptyBuyVoidHistoryIndexV1,
  decodeBuyVoidHistoryCarrierPageV1,
  deriveBuyVoidHistoryCarrierTxIntentV1,
  encodeBuyVoidHistoryCarrierLeafPageV1,
  insertBuyVoidHistoryIndexV1,
  lookupBuyVoidHistoryIndexV1,
  planBuyVoidHistoryCarrierCommitV1,
  verifyBuyVoidHistoryCarrierRootV1,
  verifyBuyVoidHistoryCarrierSuccessorV1,
  verifyBuyVoidHistoryCarrierTxIntentV1,
  verifyLocatedBuyVoidHistoryRecordV1,
  type BuyVoidHistoryIndexEntryV1,
} from "../src/economic/buy_void_history_carrier_v1.js";

function sha256(value: Buffer | string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function expectFailure(run: () => unknown, marker: string): void {
  let error: unknown;
  try { run(); }
  catch (caught) { error = caught; }
  if (!(error instanceof Error)) throw new Error(`expected failure containing ${marker}`);
  assert.ok(error.message.includes(marker), `expected ${marker}, got ${error.message}`);
}

function recordFor(paymentKey: string, label: string): Buffer {
  return Buffer.from(JSON.stringify({
    schema: "void_buy_void_inventory_reservation_v1",
    payment_key_sha256: paymentKey,
    reservation_id: label,
  }) + "\n", "utf8");
}

function entryFor(paymentKey: string, sequence: number): BuyVoidHistoryIndexEntryV1 {
  const record = recordFor(paymentKey, `reservation-${sequence}`);
  return {
    payment_key_sha256: paymentKey,
    locator: {
      epoch_durable_root_sha256: sha256(`epoch-${Math.floor(sequence / 1000)}`),
      segment_id: sequence % 17,
      segment_sha256: sha256(`segment-${Math.floor(sequence / 17)}`),
      byte_offset: String(sequence * 4096),
      byte_length: record.length,
      record_sha256: sha256(record),
    },
  };
}

function craftedKey(index: number): string {
  assert.ok(index >= 0 && index < 256);
  const first = (index % 16).toString(16);
  const second = Math.floor(index / 16).toString(16);
  return `${"a".repeat(62)}${first}${second}`;
}

assert.equal(VOID_BUY_VOID_HISTORY_CARRIER_MAX_INDEX_DEPTH_V1, 64);
assert.equal(VOID_BUY_VOID_HISTORY_CARRIER_MAX_INDEX_PAGE_READS_V1, 65);
assert.equal(VOID_BUY_VOID_HISTORY_CARRIER_MAX_LEAF_ENTRIES_V1, 56);
assert.equal(VOID_BUY_VOID_HISTORY_CARRIER_MAX_PAGE_WRITES_PER_INSERT_V1, 79);
assert.equal(VOID_BUY_VOID_HISTORY_CARRIER_MAX_UNCOMMITTED_PERSISTENT_PAGES_V1, 79);

const empty = createEmptyBuyVoidHistoryIndexV1();
assert.ok(empty.page.length <= VOID_BUY_VOID_HISTORY_CARRIER_PAGE_BYTES_V1);
const pageStore = new Map<string, Buffer>([[empty.root_sha256, Buffer.from(empty.page)]]);
const readPage = (digest: string): Buffer => {
  const bytes = pageStore.get(digest);
  if (!bytes) throw new Error(`missing-page:${digest}`);
  return Buffer.from(bytes);
};
const retain = (pages: Array<{ sha256: string; bytes: Buffer }>) => {
  for (const page of pages) {
    const existing = pageStore.get(page.sha256);
    if (existing) assert.deepEqual(existing, page.bytes);
    pageStore.set(page.sha256, Buffer.from(page.bytes));
  }
};

const oddPrefixEntries = [entryFor(`a0${"0".repeat(62)}`, 1), entryFor(`af${"0".repeat(62)}`, 2)];
const oddPrefixPage = encodeBuyVoidHistoryCarrierLeafPageV1(oddPrefixEntries);
const oddDecoded = decodeBuyVoidHistoryCarrierPageV1(oddPrefixPage);
assert.equal(oddDecoded.prefix_length, 1);
const malleable = Buffer.from(oddPrefixPage);
malleable[8] |= 0x01;
expectFailure(() => decodeBuyVoidHistoryCarrierPageV1(malleable), "NON_CANONICAL_PREFIX_LOW_NIBBLE");

let root = empty.root_sha256;
let lastInsertPageCount = 0;
for (let index = 0; index < 57; index += 1) {
  const mutation = insertBuyVoidHistoryIndexV1(root, entryFor(craftedKey(index), index + 10), readPage);
  assert.equal(mutation.status, "inserted");
  assert.ok(mutation.new_pages.length <= VOID_BUY_VOID_HISTORY_CARRIER_MAX_PAGE_WRITES_PER_INSERT_V1);
  lastInsertPageCount = mutation.new_pages.length;
  retain(mutation.new_pages);
  root = mutation.root_sha256;
}
assert.ok(lastInsertPageCount >= 2, "leaf overflow must materialize a split generation");
const splitRootBytes = readPage(root);
const splitRoot = decodeBuyVoidHistoryCarrierPageV1(splitRootBytes);
assert.equal(splitRoot.type, "internal");
if (splitRoot.type === "internal") assert.equal(splitRoot.children.length, 16);

const zeroDigestChildPage = Buffer.from(splitRootBytes);
zeroDigestChildPage.fill(0, 40, 72);
const zeroDigestDecoded = decodeBuyVoidHistoryCarrierPageV1(zeroDigestChildPage);
assert.equal(zeroDigestDecoded.type, "internal", "all-zero digest is data, not the absence sentinel");

for (let index = 0; index < 57; index += 1) {
  const lookup = lookupBuyVoidHistoryIndexV1(root, craftedKey(index), readPage);
  assert.equal(lookup.found, true);
  assert.ok(lookup.page_reads <= VOID_BUY_VOID_HISTORY_CARRIER_MAX_INDEX_PAGE_READS_V1);
  assert.equal(lookup.entry?.payment_key_sha256, craftedKey(index));
}
const absent = lookupBuyVoidHistoryIndexV1(root, `${"a".repeat(62)}ff`, readPage);
assert.equal(absent.found, false);
assert.ok(absent.page_reads <= VOID_BUY_VOID_HISTORY_CARRIER_MAX_INDEX_PAGE_READS_V1);

const duplicateEntry = entryFor(craftedKey(0), 10);
const duplicate = insertBuyVoidHistoryIndexV1(root, duplicateEntry, readPage);
assert.equal(duplicate.status, "duplicate");
assert.equal(duplicate.new_pages.length, 0);
const conflictingEntry = {
  ...duplicateEntry,
  locator: { ...duplicateEntry.locator, segment_sha256: sha256("different-segment") },
};
expectFailure(() => insertBuyVoidHistoryIndexV1(root, conflictingEntry, readPage), "INDEX_KEY_CONFLICT");

const directKey = sha256("direct-record-payment");
const directEntry = entryFor(directKey, 5000);
const directRecord = recordFor(directKey, "reservation-5000");
const directVerified = verifyLocatedBuyVoidHistoryRecordV1(directKey, directEntry.locator, directRecord);
assert.equal(directVerified.payment_key_sha256, directKey);
assert.equal(directVerified.record_sha256, directEntry.locator.record_sha256);
expectFailure(
  () => verifyLocatedBuyVoidHistoryRecordV1(sha256("wrong-payment"), directEntry.locator, directRecord),
  "LOCATED_RECORD_PAYMENT_KEY_MISMATCH",
);
expectFailure(
  () => verifyLocatedBuyVoidHistoryRecordV1(directKey, directEntry.locator, directRecord.subarray(0, directRecord.length - 1)),
  "LOCATED_RECORD_LENGTH_MISMATCH",
);

const payment1 = sha256("carrier-payment-1");
const plan1 = planBuyVoidHistoryCarrierCommitV1({
  previous_carrier_root: null,
  current_index_root_sha256: root,
  entry: entryFor(payment1, 6001),
  resulting_1352_durable_root_sha256: sha256("1352-root-1"),
  reserved_void_units: "2",
  read_page: readPage,
});
assert.equal(plan1.status, "planned");
if (plan1.status !== "planned") throw new Error("plan1-not-planned");
assert.equal(plan1.carrier_root.committed_void_units, "2");
assert.equal(plan1.carrier_root.reservation_count, "1");
assert.equal(plan1.tx_intent.expected_carrier_root_sha256, plan1.carrier_root.carrier_root_sha256);
assert.deepEqual(verifyBuyVoidHistoryCarrierRootV1(plan1.carrier_root), plan1.carrier_root);
assert.deepEqual(verifyBuyVoidHistoryCarrierTxIntentV1(plan1.tx_intent), plan1.tx_intent);
retain(plan1.new_pages);
root = plan1.index_root_sha256;
assert.equal(lookupBuyVoidHistoryIndexV1(root, payment1, readPage).found, true);

const payment2 = sha256("carrier-payment-2");
const plan2 = planBuyVoidHistoryCarrierCommitV1({
  previous_carrier_root: plan1.carrier_root,
  current_index_root_sha256: root,
  entry: entryFor(payment2, 6002),
  resulting_1352_durable_root_sha256: sha256("1352-root-2"),
  reserved_void_units: "4",
  read_page: readPage,
});
assert.equal(plan2.status, "planned");
if (plan2.status !== "planned") throw new Error("plan2-not-planned");
assert.equal(plan2.carrier_root.committed_void_units, "6");
assert.equal(plan2.carrier_root.reservation_count, "2");
assert.deepEqual(verifyBuyVoidHistoryCarrierSuccessorV1(plan1.carrier_root, plan2.carrier_root), plan2.carrier_root);
assert.equal(plan2.tx_intent.committing_record_locator.record_sha256, entryFor(payment2, 6002).locator.record_sha256);
assert.ok(plan2.tx_intent.new_page_digests.length <= VOID_BUY_VOID_HISTORY_CARRIER_MAX_UNCOMMITTED_PERSISTENT_PAGES_V1);

const tooManyDigests = Array.from(
  { length: VOID_BUY_VOID_HISTORY_CARRIER_MAX_PAGE_WRITES_PER_INSERT_V1 + 1 },
  (_, index) => sha256(`page-${index}`),
);
expectFailure(() => deriveBuyVoidHistoryCarrierTxIntentV1({
  predecessor_carrier_root_sha256: plan1.carrier_root.carrier_root_sha256,
  committing_payment_key_sha256: payment2,
  committing_record_locator: entryFor(payment2, 6002).locator,
  expected_1352_durable_root_sha256: plan2.carrier_root.active_1352_durable_root_sha256,
  expected_index_root_sha256: plan2.carrier_root.payment_index_root_sha256,
  expected_committed_void_units: plan2.carrier_root.committed_void_units,
  expected_reservation_count: plan2.carrier_root.reservation_count,
  expected_carrier_root_sha256: plan2.carrier_root.carrier_root_sha256,
  new_page_digests: tooManyDigests,
}), "TOO_MANY_NEW_PAGES");

console.log(JSON.stringify({
  marker: "VOID_BUY_VOID_HISTORY_CARRIER_V1_PROOF_GREEN",
  deterministic_max_index_depth: VOID_BUY_VOID_HISTORY_CARRIER_MAX_INDEX_DEPTH_V1,
  maximum_index_page_reads: VOID_BUY_VOID_HISTORY_CARRIER_MAX_INDEX_PAGE_READS_V1,
  maximum_leaf_entries: VOID_BUY_VOID_HISTORY_CARRIER_MAX_LEAF_ENTRIES_V1,
  maximum_page_writes_per_insert: VOID_BUY_VOID_HISTORY_CARRIER_MAX_PAGE_WRITES_PER_INSERT_V1,
  maximum_uncommitted_persistent_pages: VOID_BUY_VOID_HISTORY_CARRIER_MAX_UNCOMMITTED_PERSISTENT_PAGES_V1,
  split_generation_new_pages: lastInsertPageCount,
  direct_record_lookup: true,
  all_zero_digest_reserved: false,
  cap_check_complexity: "O(1)-from-authenticated-carrier-root",
  total_local_rollback_policy: "OUTSIDE_V1_LOCAL_STORAGE_THREAT_MODEL",
  blocks_1352_release: false,
  blocks_1314_consumption_until_integrated: true,
}));
