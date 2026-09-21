import crypto from "node:crypto";
import { TextDecoder } from "node:util";
import {
  VOID_SEGMENTED_JSONL_DURABLE_ROOT_V1,
  readSegmentedJsonlDurableRootV1,
  verifySegmentedJsonlDurableRootMaterializedAtUseV1,
  type SegmentedJsonlDurableRootV1,
} from "../storage/segmented_jsonl_durable_root_v1.js";
import type {
  SegmentedJsonlMaterializedAuthorityV1,
} from "../storage/segmented_jsonl_materialized_authority_v1.js";
import {
  serializeSegmentedJsonlManifestV1,
  type SegmentedJsonlManifestV1,
} from "../storage/segmented_jsonl_v1.js";
import {
  projectBuyVoidPaymentHistoryV1,
} from "./buy_void_payment_history_projection_v1.js";
import {
  VOID_BUY_VOID_INVENTORY_RESERVATION_JOURNAL_V1,
  VOID_BUY_VOID_PAID_UNRESERVABLE_OBLIGATION_V1,
  type BuyVoidInventoryReservationV1,
  type BuyVoidPaidUnreservableObligationV1,
} from "./buy_void_inventory_reservation_journal_v1.js";

export const VOID_BUY_VOID_HISTORY_CARRIER_PAGE_V1 = "VOID_BUY_VOID_HISTORY_CARRIER_PAGE_V1";
export const VOID_BUY_VOID_HISTORY_CARRIER_ROOT_V1 = "VOID_BUY_VOID_HISTORY_CARRIER_ROOT_V1";
export const VOID_BUY_VOID_HISTORY_CARRIER_TX_INTENT_V1 = "VOID_BUY_VOID_HISTORY_CARRIER_TX_INTENT_V1";

export const VOID_BUY_VOID_HISTORY_CARRIER_PAGE_BYTES_V1 = 8_192;
export const VOID_BUY_VOID_HISTORY_CARRIER_MAX_INDEX_DEPTH_V1 = 64;
export const VOID_BUY_VOID_HISTORY_CARRIER_MAX_INDEX_PAGE_READS_V1 = 65;
export const VOID_BUY_VOID_HISTORY_CARRIER_MAX_LOCATED_RECORD_BYTES_V1 = 1_048_576;
export const VOID_BUY_VOID_HISTORY_CARRIER_ACTIVE_SEGMENT_ID_V1 = 0xffff_ffff;

const PAGE_MAGIC = Buffer.from("VBP1", "ascii");
const PAGE_TYPE_INTERNAL = 0;
const PAGE_TYPE_LEAF = 1;
const PAGE_HEADER_BYTES = 40;
const DIGEST_BYTES = 32;
const KEY_BYTES = 32;
const LOCATOR_BYTES = 112;
const PAYMENT_HISTORY_DIGEST_BYTES = 32;
const LEAF_ENTRY_BYTES =
  KEY_BYTES + LOCATOR_BYTES + PAYMENT_HISTORY_DIGEST_BYTES;
const MAX_U64 = (1n << 64n) - 1n;
const HEX_64 = /^[0-9a-f]{64}$/;
const CANONICAL_UINT = /^(0|[1-9][0-9]*)$/;
const FATAL_UTF8 = new TextDecoder("utf-8", { fatal: true });

export const VOID_BUY_VOID_HISTORY_CARRIER_MAX_LEAF_ENTRIES_V1 =
  Math.floor((VOID_BUY_VOID_HISTORY_CARRIER_PAGE_BYTES_V1 - PAGE_HEADER_BYTES) / LEAF_ENTRY_BYTES);

const OVERFLOW_ENTRY_COUNT = VOID_BUY_VOID_HISTORY_CARRIER_MAX_LEAF_ENTRIES_V1 + 1;
const NIBBLES_NEEDED_FOR_OVERFLOW = Math.ceil(Math.log(OVERFLOW_ENTRY_COUNT) / Math.log(16));
const MAX_OVERFLOW_ANCESTORS = VOID_BUY_VOID_HISTORY_CARRIER_MAX_INDEX_DEPTH_V1 - NIBBLES_NEEDED_FOR_OVERFLOW;

export const VOID_BUY_VOID_HISTORY_CARRIER_MAX_PAGE_WRITES_PER_INSERT_V1 =
  MAX_OVERFLOW_ANCESTORS + 1 + 16;
export const VOID_BUY_VOID_HISTORY_CARRIER_MAX_UNCOMMITTED_PERSISTENT_PAGES_V1 =
  VOID_BUY_VOID_HISTORY_CARRIER_MAX_PAGE_WRITES_PER_INSERT_V1;

export const VOID_BUY_VOID_HISTORY_CARRIER_AUTHORITY_V1 = {
  source_only: true,
  full_domain_index_contract: true,
  bounded_lookup_contract: true,
  bounded_cap_accounting_contract: true,
  current_segmented_durable_root_required: true,
  payment_keyed_history_reconciliation_invariants_reused: true,
  bounded_projection_reuses_reconciliation_identity_invariants: true,
  global_history_reconciliation_full_scan_at_use: false,
  caller_supplied_history_reconciliation_mount_authority: false,
  bounded_payment_history_projection_required: true,
  full_history_scan: false,
  durable_reservation_or_obligation_record_required: true,
  materialized_generation_pinned_at_use: true,
  manifest_segment_locator_required: true,
  caller_supplied_record_bytes_mount_authority: false,
  caller_supplied_record_object_mount_authority: false,
  caller_supplied_payment_history_projection_mount_authority: false,
  current_journal_record_match_required: true,
  filesystem_read_at_use: true,
  filesystem_write: false,
  postgres_dispatcher_is_not_history_authority: true,
  total_local_rollback_detection: false,
  coordinated_whole_host_rollback_detection: false,
  chain_side_fulfillment_uniqueness_authority: false,
  runtime_integration: false,
  payment_confirmation_authority: false,
  fulfillment_authority: false,
  transaction_broadcast: false,
  signing: false,
  wallet_access: false,
  credential_access: false,
  rpc_call: false,
  automatic_retry: false,
  money_movement: false,
} as const;

export type BuyVoidHistoryRecordLocatorV1 = {
  segmented_durable_root_sha256: string;
  segment_id: number;
  segment_sha256: string;
  byte_offset: string;
  byte_length: number;
  record_sha256: string;
};

export type BuyVoidHistoryIndexEntryV1 = {
  payment_key_sha256: string;
  locator: BuyVoidHistoryRecordLocatorV1;
  payment_history_fingerprint_sha256: string;
};

type InternalChildV1 = { nibble: number; digest: string };

type DecodedInternalPageV1 = {
  type: "internal";
  prefix_length: number;
  prefix: Buffer;
  children: InternalChildV1[];
};

type DecodedLeafPageV1 = {
  type: "leaf";
  prefix_length: number;
  prefix: Buffer;
  entries: BuyVoidHistoryIndexEntryV1[];
};

type DecodedPageV1 = DecodedInternalPageV1 | DecodedLeafPageV1;

export type BuyVoidHistoryIndexLookupV1 = {
  found: boolean;
  page_reads: number;
  entry: BuyVoidHistoryIndexEntryV1 | null;
};

export type BuyVoidHistoryIndexInsertV1 = {
  status: "inserted" | "updated" | "duplicate";
  root_sha256: string;
  new_pages: Array<{ sha256: string; bytes: Buffer }>;
  existing_entry: BuyVoidHistoryIndexEntryV1 | null;
};

export type BuyVoidHistoryCarrierDurableRecordV1 =
  | BuyVoidInventoryReservationV1
  | BuyVoidPaidUnreservableObligationV1;

export type BuyVoidHistoryCarrierRootV1 = {
  v: 1;
  format: typeof VOID_BUY_VOID_HISTORY_CARRIER_ROOT_V1;
  carrier_generation: number;
  previous_carrier_root_sha256: string | null;
  pool_id: string;
  active_segmented_durable_root_sha256: string;
  active_segmented_store_generation: number;
  payment_history_fingerprint_sha256: string;
  payment_index_root_sha256: string;
  committed_void_units: string;
  reservation_count: string;
  obligation_count: string;
  committing_record_kind:
    | "reservation"
    | "paid_unreservable_obligation"
    | "history_refresh";
  committing_payment_key_sha256: string;
  committing_record_void_units: string;
  carrier_root_sha256: string;
};

export type BuyVoidHistoryCarrierTxIntentV1 = {
  v: 1;
  format: typeof VOID_BUY_VOID_HISTORY_CARRIER_TX_INTENT_V1;
  predecessor_carrier_root_sha256: string | null;
  pool_id: string;
  committing_record_kind:
    | "reservation"
    | "paid_unreservable_obligation"
    | "history_refresh";
  committing_payment_key_sha256: string;
  committing_record_locator: BuyVoidHistoryRecordLocatorV1;
  expected_segmented_durable_root_sha256: string;
  expected_segmented_store_generation: number;
  expected_payment_history_fingerprint_sha256: string;
  expected_index_root_sha256: string;
  expected_committed_void_units: string;
  expected_reservation_count: string;
  expected_obligation_count: string;
  expected_carrier_root_sha256: string;
  new_page_digests: string[];
  tx_intent_sha256: string;
};

export type BuyVoidHistoryCarrierCommitPlanV1 =
  | {
      status: "duplicate";
      index_root_sha256: string;
      existing_entry: BuyVoidHistoryIndexEntryV1;
    }
  | {
      status: "planned";
      index_root_sha256: string;
      new_pages: Array<{ sha256: string; bytes: Buffer }>;
      carrier_root: BuyVoidHistoryCarrierRootV1;
      tx_intent: BuyVoidHistoryCarrierTxIntentV1;
    };

function fail(code: string, detail: string): never {
  throw new Error(`${VOID_BUY_VOID_HISTORY_CARRIER_PAGE_V1}:${code}:${detail}`);
}

function sha256Bytes(data: Buffer | string): string {
  return crypto.createHash("sha256").update(data).digest("hex");
}

function requireHex64(value: unknown, code: string): string {
  const text = String(value ?? "");
  if (!HEX_64.test(text)) fail(code, text || "empty");
  return text;
}

function hex32(value: unknown, code: string): Buffer {
  return Buffer.from(requireHex64(value, code), "hex");
}

function canonicalUint(value: unknown, positive: boolean, code: string): string {
  const text = String(value ?? "");
  if (!CANONICAL_UINT.test(text)) fail(code, text || "empty");
  let parsed: bigint;
  try { parsed = BigInt(text); }
  catch { fail(code, text); }
  if (positive ? parsed <= 0n : parsed < 0n) fail(code, text);
  return text;
}

function canonicalJson(value: unknown): string {
  if (value === null) return "null";
  if (typeof value === "string" || typeof value === "boolean") return JSON.stringify(value);
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value)) fail("NON_CANONICAL_NUMBER", String(value));
    return String(value);
  }
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`).join(",")}}`;
  }
  fail("NON_CANONICAL_VALUE", typeof value);
}

function exactKeys(value: Record<string, unknown>, expected: readonly string[], code: string): void {
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (actual.length !== wanted.length || actual.some((key, index) => key !== wanted[index])) {
    fail(code, actual.join(","));
  }
}

function nibbleAt(bytes: Buffer, index: number): number {
  if (!Number.isInteger(index) || index < 0 || index >= 64) fail("INVALID_NIBBLE_INDEX", String(index));
  const byte = bytes[index >> 1];
  return (index & 1) === 0 ? (byte >> 4) & 0x0f : byte & 0x0f;
}

function canonicalPrefixFromKey(key: Buffer, length: number): Buffer {
  if (!Number.isInteger(length) || length < 0 || length > 64) fail("INVALID_PREFIX_LENGTH", String(length));
  const out = Buffer.alloc(32, 0);
  const wholeBytes = Math.floor(length / 2);
  if (wholeBytes > 0) key.copy(out, 0, 0, wholeBytes);
  if ((length & 1) === 1) out[wholeBytes] = key[wholeBytes] & 0xf0;
  return out;
}

function assertCanonicalPrefix(prefix: Buffer, length: number): void {
  if (prefix.length !== 32) fail("INVALID_PREFIX_BYTES", String(prefix.length));
  if (!Number.isInteger(length) || length < 0 || length > 64) fail("INVALID_PREFIX_LENGTH", String(length));
  const usedBytes = Math.ceil(length / 2);
  if ((length & 1) === 1 && usedBytes > 0 && (prefix[usedBytes - 1] & 0x0f) !== 0) {
    fail("NON_CANONICAL_PREFIX_LOW_NIBBLE", String(length));
  }
  for (let index = usedBytes; index < prefix.length; index += 1) {
    if (prefix[index] !== 0) fail("NON_CANONICAL_PREFIX_PADDING", `${length}:${index}`);
  }
}

function keyMatchesPrefix(key: Buffer, prefix: Buffer, length: number): boolean {
  for (let index = 0; index < length; index += 1) {
    if (nibbleAt(key, index) !== nibbleAt(prefix, index)) return false;
  }
  return true;
}

function commonPrefixLength(keys: Buffer[]): number {
  if (keys.length === 0) return 0;
  let length = 64;
  for (let index = 0; index < 64; index += 1) {
    const nibble = nibbleAt(keys[0], index);
    if (keys.some((key) => nibbleAt(key, index) !== nibble)) {
      length = index;
      break;
    }
  }
  return length;
}

function normalizedLocator(input: BuyVoidHistoryRecordLocatorV1): BuyVoidHistoryRecordLocatorV1 {
  if (!input || typeof input !== "object") fail("INVALID_LOCATOR", "not-object");
  const segmentId = Number(input.segment_id);
  if (!Number.isSafeInteger(segmentId) || segmentId < 0 || segmentId > 0xffff_ffff) {
    fail("INVALID_SEGMENT_ID", String(input.segment_id));
  }
  const byteLength = Number(input.byte_length);
  if (
    !Number.isSafeInteger(byteLength) ||
    byteLength <= 0 ||
    byteLength > VOID_BUY_VOID_HISTORY_CARRIER_MAX_LOCATED_RECORD_BYTES_V1
  ) {
    fail("INVALID_RECORD_LENGTH", String(input.byte_length));
  }
  const offsetText = canonicalUint(input.byte_offset, false, "INVALID_BYTE_OFFSET");
  const offset = BigInt(offsetText);
  if (offset > MAX_U64) fail("INVALID_BYTE_OFFSET", offsetText);
  return {
    segmented_durable_root_sha256: requireHex64(input.segmented_durable_root_sha256, "INVALID_EPOCH_ROOT"),
    segment_id: segmentId,
    segment_sha256: requireHex64(input.segment_sha256, "INVALID_SEGMENT_SHA"),
    byte_offset: offsetText,
    byte_length: byteLength,
    record_sha256: requireHex64(input.record_sha256, "INVALID_RECORD_SHA"),
  };
}

function normalizedEntry(input: BuyVoidHistoryIndexEntryV1): BuyVoidHistoryIndexEntryV1 {
  if (!input || typeof input !== "object") {
    fail("INVALID_INDEX_ENTRY", "not-object");
  }
  return {
    payment_key_sha256: requireHex64(
      input.payment_key_sha256,
      "INVALID_PAYMENT_KEY",
    ),
    locator: normalizedLocator(input.locator),
    payment_history_fingerprint_sha256: requireHex64(
      input.payment_history_fingerprint_sha256,
      "INVALID_PAYMENT_HISTORY_FINGERPRINT",
    ),
  };
}

function sameLocator(a: BuyVoidHistoryRecordLocatorV1, b: BuyVoidHistoryRecordLocatorV1): boolean {
  return a.segmented_durable_root_sha256 === b.segmented_durable_root_sha256 &&
    a.segment_id === b.segment_id &&
    a.segment_sha256 === b.segment_sha256 &&
    a.byte_offset === b.byte_offset &&
    a.byte_length === b.byte_length &&
    a.record_sha256 === b.record_sha256;
}

function encodeEntry(entryInput: BuyVoidHistoryIndexEntryV1): Buffer {
  const entry = normalizedEntry(entryInput);
  const out = Buffer.alloc(LEAF_ENTRY_BYTES, 0);
  hex32(entry.payment_key_sha256, "INVALID_PAYMENT_KEY").copy(out, 0);
  hex32(
    entry.locator.segmented_durable_root_sha256,
    "INVALID_SEGMENTED_DURABLE_ROOT",
  ).copy(out, 32);
  out.writeUInt32BE(entry.locator.segment_id, 64);
  hex32(
    entry.locator.segment_sha256,
    "INVALID_SEGMENT_SHA",
  ).copy(out, 68);
  out.writeBigUInt64BE(
    BigInt(entry.locator.byte_offset),
    100,
  );
  out.writeUInt32BE(entry.locator.byte_length, 108);
  hex32(
    entry.locator.record_sha256,
    "INVALID_RECORD_SHA",
  ).copy(out, 112);
  hex32(
    entry.payment_history_fingerprint_sha256,
    "INVALID_PAYMENT_HISTORY_FINGERPRINT",
  ).copy(out, 144);
  return out;
}

function decodeEntry(bytes: Buffer): BuyVoidHistoryIndexEntryV1 {
  if (bytes.length !== LEAF_ENTRY_BYTES) {
    fail(
      "INVALID_LEAF_ENTRY_BYTES",
      String(bytes.length),
    );
  }
  return normalizedEntry({
    payment_key_sha256:
      bytes.subarray(0, 32).toString("hex"),
    locator: {
      segmented_durable_root_sha256:
        bytes.subarray(32, 64).toString("hex"),
      segment_id: bytes.readUInt32BE(64),
      segment_sha256:
        bytes.subarray(68, 100).toString("hex"),
      byte_offset:
        bytes.readBigUInt64BE(100).toString(),
      byte_length: bytes.readUInt32BE(108),
      record_sha256:
        bytes.subarray(112, 144).toString("hex"),
    },
    payment_history_fingerprint_sha256:
      bytes.subarray(144, 176).toString("hex"),
  });
}

function pageHeader(type: number, prefixLength: number, meta: number, prefix: Buffer): Buffer {
  assertCanonicalPrefix(prefix, prefixLength);
  const header = Buffer.alloc(PAGE_HEADER_BYTES, 0);
  PAGE_MAGIC.copy(header, 0);
  header[4] = type;
  header[5] = prefixLength;
  header.writeUInt16BE(meta, 6);
  prefix.copy(header, 8);
  return header;
}

export function encodeBuyVoidHistoryCarrierLeafPageV1(
  entriesInput: BuyVoidHistoryIndexEntryV1[],
): Buffer {
  if (!Array.isArray(entriesInput)) fail("INVALID_LEAF_ENTRIES", "not-array");
  const entries = entriesInput.map(normalizedEntry).sort((a, b) => a.payment_key_sha256.localeCompare(b.payment_key_sha256));
  if (entries.length > VOID_BUY_VOID_HISTORY_CARRIER_MAX_LEAF_ENTRIES_V1) {
    fail("LEAF_CAPACITY_EXCEEDED", String(entries.length));
  }
  for (let index = 1; index < entries.length; index += 1) {
    if (entries[index - 1].payment_key_sha256 === entries[index].payment_key_sha256) {
      fail("DUPLICATE_LEAF_KEY", entries[index].payment_key_sha256);
    }
  }
  const keyBytes = entries.map((entry) => hex32(entry.payment_key_sha256, "INVALID_PAYMENT_KEY"));
  const prefixLength = commonPrefixLength(keyBytes);
  const prefix = entries.length === 0 ? Buffer.alloc(32, 0) : canonicalPrefixFromKey(keyBytes[0], prefixLength);
  const header = pageHeader(PAGE_TYPE_LEAF, prefixLength, entries.length, prefix);
  const body = Buffer.concat([header, ...entries.map(encodeEntry)]);
  if (body.length > VOID_BUY_VOID_HISTORY_CARRIER_PAGE_BYTES_V1) fail("PAGE_TOO_LARGE", String(body.length));
  return body;
}

function encodeInternalPage(prefix: Buffer, prefixLength: number, childrenInput: InternalChildV1[]): Buffer {
  if (!Number.isInteger(prefixLength) || prefixLength < 0 || prefixLength >= 64) {
    fail("INVALID_INTERNAL_PREFIX_LENGTH", String(prefixLength));
  }
  assertCanonicalPrefix(prefix, prefixLength);
  const children = [...childrenInput].sort((a, b) => a.nibble - b.nibble);
  if (children.length < 2 || children.length > 16) fail("INVALID_INTERNAL_CHILD_COUNT", String(children.length));
  let bitmap = 0;
  for (const child of children) {
    if (!Number.isInteger(child.nibble) || child.nibble < 0 || child.nibble > 15) fail("INVALID_CHILD_NIBBLE", String(child.nibble));
    if ((bitmap & (1 << child.nibble)) !== 0) fail("DUPLICATE_CHILD_NIBBLE", String(child.nibble));
    requireHex64(child.digest, "INVALID_CHILD_DIGEST");
    bitmap |= 1 << child.nibble;
  }
  const header = pageHeader(PAGE_TYPE_INTERNAL, prefixLength, bitmap, prefix);
  const body = Buffer.concat([header, ...children.map((child) => Buffer.from(child.digest, "hex"))]);
  if (body.length > VOID_BUY_VOID_HISTORY_CARRIER_PAGE_BYTES_V1) fail("PAGE_TOO_LARGE", String(body.length));
  return body;
}

export function decodeBuyVoidHistoryCarrierPageV1(bytesInput: Buffer): DecodedPageV1 {
  const bytes = Buffer.from(bytesInput);
  if (bytes.length < PAGE_HEADER_BYTES || bytes.length > VOID_BUY_VOID_HISTORY_CARRIER_PAGE_BYTES_V1) {
    fail("INVALID_PAGE_BYTES", String(bytes.length));
  }
  if (!bytes.subarray(0, 4).equals(PAGE_MAGIC)) fail("INVALID_PAGE_MAGIC", bytes.subarray(0, 4).toString("hex"));
  const type = bytes[4];
  const prefixLength = bytes[5];
  const meta = bytes.readUInt16BE(6);
  const prefix = Buffer.from(bytes.subarray(8, 40));
  assertCanonicalPrefix(prefix, prefixLength);

  if (type === PAGE_TYPE_LEAF) {
    if (meta > VOID_BUY_VOID_HISTORY_CARRIER_MAX_LEAF_ENTRIES_V1) fail("LEAF_CAPACITY_EXCEEDED", String(meta));
    const expectedLength = PAGE_HEADER_BYTES + meta * LEAF_ENTRY_BYTES;
    if (bytes.length !== expectedLength) fail("INVALID_LEAF_PAGE_LENGTH", `${bytes.length}:${expectedLength}`);
    const entries: BuyVoidHistoryIndexEntryV1[] = [];
    for (let index = 0; index < meta; index += 1) {
      const start = PAGE_HEADER_BYTES + index * LEAF_ENTRY_BYTES;
      entries.push(decodeEntry(bytes.subarray(start, start + LEAF_ENTRY_BYTES)));
    }
    for (let index = 1; index < entries.length; index += 1) {
      if (entries[index - 1].payment_key_sha256 >= entries[index].payment_key_sha256) {
        fail("NON_CANONICAL_LEAF_ORDER", String(index));
      }
    }
    if (entries.length === 0) {
      if (prefixLength !== 0 || !prefix.equals(Buffer.alloc(32, 0))) fail("INVALID_EMPTY_LEAF_PREFIX", String(prefixLength));
    } else {
      const keys = entries.map((entry) => hex32(entry.payment_key_sha256, "INVALID_PAYMENT_KEY"));
      const exactPrefixLength = commonPrefixLength(keys);
      const exactPrefix = canonicalPrefixFromKey(keys[0], exactPrefixLength);
      if (prefixLength !== exactPrefixLength || !prefix.equals(exactPrefix)) fail("NON_CANONICAL_LEAF_PREFIX", String(prefixLength));
    }
    return { type: "leaf", prefix_length: prefixLength, prefix, entries };
  }

  if (type === PAGE_TYPE_INTERNAL) {
    if (prefixLength >= 64) fail("INVALID_INTERNAL_PREFIX_LENGTH", String(prefixLength));
    const children: InternalChildV1[] = [];
    let count = 0;
    for (let nibble = 0; nibble < 16; nibble += 1) if ((meta & (1 << nibble)) !== 0) count += 1;
    if (count < 2) fail("INVALID_INTERNAL_CHILD_COUNT", String(count));
    const expectedLength = PAGE_HEADER_BYTES + count * DIGEST_BYTES;
    if (bytes.length !== expectedLength) fail("INVALID_INTERNAL_PAGE_LENGTH", `${bytes.length}:${expectedLength}`);
    let offset = PAGE_HEADER_BYTES;
    for (let nibble = 0; nibble < 16; nibble += 1) {
      if ((meta & (1 << nibble)) === 0) continue;
      children.push({ nibble, digest: bytes.subarray(offset, offset + DIGEST_BYTES).toString("hex") });
      offset += DIGEST_BYTES;
    }
    return { type: "internal", prefix_length: prefixLength, prefix, children };
  }

  fail("INVALID_PAGE_TYPE", String(type));
}

export function buyVoidHistoryCarrierPageSha256V1(bytes: Buffer): string {
  decodeBuyVoidHistoryCarrierPageV1(bytes);
  return sha256Bytes(bytes);
}

export function createEmptyBuyVoidHistoryIndexV1(): { root_sha256: string; page: Buffer } {
  const page = encodeBuyVoidHistoryCarrierLeafPageV1([]);
  return { root_sha256: buyVoidHistoryCarrierPageSha256V1(page), page };
}

function readVerifiedPage(digestInput: string, readPage: (sha256: string) => Buffer): DecodedPageV1 {
  const digest = requireHex64(digestInput, "INVALID_PAGE_DIGEST");
  const bytes = Buffer.from(readPage(digest));
  if (sha256Bytes(bytes) !== digest) fail("PAGE_DIGEST_MISMATCH", digest);
  return decodeBuyVoidHistoryCarrierPageV1(bytes);
}

function childFor(page: DecodedInternalPageV1, nibble: number): string | null {
  return page.children.find((child) => child.nibble === nibble)?.digest ?? null;
}

function assertChildRelation(parent: DecodedInternalPageV1, nibble: number, child: DecodedPageV1): void {
  if (child.prefix_length <= parent.prefix_length) fail("CHILD_PREFIX_NOT_DEEPER", String(child.prefix_length));
  if (!keyMatchesPrefix(child.prefix, parent.prefix, parent.prefix_length)) fail("CHILD_PREFIX_PARENT_MISMATCH", String(nibble));
  if (nibbleAt(child.prefix, parent.prefix_length) !== nibble) fail("CHILD_PREFIX_SLOT_MISMATCH", String(nibble));
}

export function lookupBuyVoidHistoryIndexV1(
  rootSha256: string,
  paymentKeySha256: string,
  readPage: (sha256: string) => Buffer,
): BuyVoidHistoryIndexLookupV1 {
  const key = hex32(paymentKeySha256, "INVALID_PAYMENT_KEY");
  let digest = requireHex64(rootSha256, "INVALID_PAGE_DIGEST");
  let parent: DecodedInternalPageV1 | null = null;
  let parentNibble = -1;
  let reads = 0;

  for (;;) {
    reads += 1;
    if (reads > VOID_BUY_VOID_HISTORY_CARRIER_MAX_INDEX_PAGE_READS_V1) fail("INDEX_DEPTH_EXCEEDED", String(reads));
    const page = readVerifiedPage(digest, readPage);
    if (parent) assertChildRelation(parent, parentNibble, page);
    if (!keyMatchesPrefix(key, page.prefix, page.prefix_length)) {
      return { found: false, page_reads: reads, entry: null };
    }
    if (page.type === "leaf") {
      const keyText = key.toString("hex");
      const entry = page.entries.find((candidate) => candidate.payment_key_sha256 === keyText) ?? null;
      return { found: entry !== null, page_reads: reads, entry };
    }
    const nibble = nibbleAt(key, page.prefix_length);
    const child = childFor(page, nibble);
    if (!child) return { found: false, page_reads: reads, entry: null };
    parent = page;
    parentNibble = nibble;
    digest = child;
  }
}

function addNewPage(newPages: Map<string, Buffer>, bytes: Buffer): string {
  const digest = buyVoidHistoryCarrierPageSha256V1(bytes);
  const existing = newPages.get(digest);
  if (existing && !existing.equals(bytes)) fail("PAGE_DIGEST_COLLISION", digest);
  newPages.set(digest, bytes);
  if (newPages.size > VOID_BUY_VOID_HISTORY_CARRIER_MAX_PAGE_WRITES_PER_INSERT_V1) {
    fail("INSERT_PAGE_WRITE_BOUND_EXCEEDED", String(newPages.size));
  }
  return digest;
}

function insertion(
  digest: string,
  entry: BuyVoidHistoryIndexEntryV1,
  readPage: (sha256: string) => Buffer,
  newPages: Map<string, Buffer>,
  pageReads: number,
): {
  status: "inserted" | "updated" | "duplicate";
  digest: string;
  existing: BuyVoidHistoryIndexEntryV1 | null;
} {
  if (pageReads >= VOID_BUY_VOID_HISTORY_CARRIER_MAX_INDEX_PAGE_READS_V1) fail("INDEX_DEPTH_EXCEEDED", String(pageReads));
  const page = readVerifiedPage(digest, readPage);
  const key = hex32(entry.payment_key_sha256, "INVALID_PAYMENT_KEY");

  if (page.type === "leaf") {
    const existing = page.entries.find((candidate) => candidate.payment_key_sha256 === entry.payment_key_sha256) ?? null;
    if (existing) {
      if (!sameLocator(existing.locator, entry.locator)) {
        fail("INDEX_KEY_CONFLICT", entry.payment_key_sha256);
      }
      if (
        existing.payment_history_fingerprint_sha256 ===
          entry.payment_history_fingerprint_sha256
      ) {
        return {
          status: "duplicate",
          digest,
          existing,
        };
      }
      const nextEntries = page.entries.map((candidate) =>
        candidate.payment_key_sha256 ===
          entry.payment_key_sha256
          ? entry
          : candidate
      );
      return {
        status: "updated",
        digest: addNewPage(
          newPages,
          encodeBuyVoidHistoryCarrierLeafPageV1(
            nextEntries,
          ),
        ),
        existing,
      };
    }
    const combined = [...page.entries, entry];
    if (combined.length <= VOID_BUY_VOID_HISTORY_CARRIER_MAX_LEAF_ENTRIES_V1) {
      return { status: "inserted", digest: addNewPage(newPages, encodeBuyVoidHistoryCarrierLeafPageV1(combined)), existing: null };
    }

    const keys = combined.map((candidate) => hex32(candidate.payment_key_sha256, "INVALID_PAYMENT_KEY"));
    const splitPrefixLength = commonPrefixLength(keys);
    if (splitPrefixLength >= 64) fail("UNSPLITTABLE_LEAF", entry.payment_key_sha256);
    const groups = new Map<number, BuyVoidHistoryIndexEntryV1[]>();
    for (const candidate of combined) {
      const candidateKey = hex32(candidate.payment_key_sha256, "INVALID_PAYMENT_KEY");
      const nibble = nibbleAt(candidateKey, splitPrefixLength);
      const group = groups.get(nibble) ?? [];
      group.push(candidate);
      groups.set(nibble, group);
    }
    if (groups.size < 2) fail("UNSPLITTABLE_LEAF", String(splitPrefixLength));
    const children: InternalChildV1[] = [];
    for (const [nibble, group] of [...groups.entries()].sort((a, b) => a[0] - b[0])) {
      if (group.length > VOID_BUY_VOID_HISTORY_CARRIER_MAX_LEAF_ENTRIES_V1) fail("LEAF_SPLIT_OVERFLOW", `${nibble}:${group.length}`);
      const childBytes = encodeBuyVoidHistoryCarrierLeafPageV1(group);
      children.push({ nibble, digest: addNewPage(newPages, childBytes) });
    }
    const internalPrefix = canonicalPrefixFromKey(keys[0], splitPrefixLength);
    return {
      status: "inserted",
      digest: addNewPage(newPages, encodeInternalPage(internalPrefix, splitPrefixLength, children)),
      existing: null,
    };
  }

  if (!keyMatchesPrefix(key, page.prefix, page.prefix_length)) {
    const common = (() => {
      for (let index = 0; index < page.prefix_length; index += 1) {
        if (nibbleAt(key, index) !== nibbleAt(page.prefix, index)) return index;
      }
      return page.prefix_length;
    })();
    if (common >= page.prefix_length) fail("INTERNAL_PREFIX_INSERT_STATE", String(common));
    const leafBytes = encodeBuyVoidHistoryCarrierLeafPageV1([entry]);
    const leafDigest = addNewPage(newPages, leafBytes);
    const oldNibble = nibbleAt(page.prefix, common);
    const newNibble = nibbleAt(key, common);
    if (oldNibble === newNibble) fail("INTERNAL_PREFIX_SPLIT_COLLISION", String(common));
    const parentPrefix = canonicalPrefixFromKey(key, common);
    const parentBytes = encodeInternalPage(parentPrefix, common, [
      { nibble: oldNibble, digest },
      { nibble: newNibble, digest: leafDigest },
    ]);
    return { status: "inserted", digest: addNewPage(newPages, parentBytes), existing: null };
  }

  const nibble = nibbleAt(key, page.prefix_length);
  const childDigest = childFor(page, nibble);
  if (!childDigest) {
    const leafDigest = addNewPage(newPages, encodeBuyVoidHistoryCarrierLeafPageV1([entry]));
    const nextChildren = [...page.children, { nibble, digest: leafDigest }];
    return {
      status: "inserted",
      digest: addNewPage(newPages, encodeInternalPage(page.prefix, page.prefix_length, nextChildren)),
      existing: null,
    };
  }

  const childPage = readVerifiedPage(childDigest, readPage);
  assertChildRelation(page, nibble, childPage);
  const childResult = insertion(childDigest, entry, readPage, newPages, pageReads + 1);
  if (childResult.status === "duplicate") {
    return {
      status: "duplicate",
      digest,
      existing: childResult.existing,
    };
  }
  const nextChildren = page.children.map((child) =>
    child.nibble === nibble
      ? { nibble, digest: childResult.digest }
      : child
  );
  return {
    status: childResult.status,
    digest: addNewPage(
      newPages,
      encodeInternalPage(
        page.prefix,
        page.prefix_length,
        nextChildren,
      ),
    ),
    existing: childResult.existing,
  };
}

export function insertBuyVoidHistoryIndexV1(
  rootSha256: string,
  entryInput: BuyVoidHistoryIndexEntryV1,
  readPageInput: (sha256: string) => Buffer,
): BuyVoidHistoryIndexInsertV1 {
  const root = requireHex64(rootSha256, "INVALID_PAGE_DIGEST");
  const entry = normalizedEntry(entryInput);
  const newPages = new Map<string, Buffer>();
  const readPage = (digest: string): Buffer => newPages.get(digest) ?? readPageInput(digest);
  const result = insertion(root, entry, readPage, newPages, 0);
  return {
    status: result.status,
    root_sha256: result.digest,
    new_pages: [...newPages.entries()].map(([sha256, bytes]) => ({ sha256, bytes })),
    existing_entry: result.existing,
  };
}

export function verifyLocatedBuyVoidHistoryRecordV1(
  paymentKeySha256: string,
  locatorInput: BuyVoidHistoryRecordLocatorV1,
  recordBytesInput: Buffer,
): {
  payment_key_sha256: string;
  record_sha256: string;
  byte_length: number;
  record: Record<string, unknown>;
} {
  const paymentKey = requireHex64(paymentKeySha256, "INVALID_PAYMENT_KEY");
  const locator = normalizedLocator(locatorInput);
  const recordBytes = Buffer.from(recordBytesInput);
  if (recordBytes.length !== locator.byte_length) fail("LOCATED_RECORD_LENGTH_MISMATCH", `${recordBytes.length}:${locator.byte_length}`);
  if (recordBytes.length === 0 || recordBytes[recordBytes.length - 1] !== 0x0a) fail("LOCATED_RECORD_DELIMITER_MISMATCH", String(recordBytes.length));
  const digest = sha256Bytes(recordBytes);
  if (digest !== locator.record_sha256) fail("LOCATED_RECORD_DIGEST_MISMATCH", digest);
  let parsed: unknown;
  try { parsed = JSON.parse(FATAL_UTF8.decode(recordBytes.subarray(0, recordBytes.length - 1))); }
  catch { fail("LOCATED_RECORD_JSON_INVALID", locator.record_sha256); }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) fail("LOCATED_RECORD_SHAPE_INVALID", locator.record_sha256);
  if ((parsed as Record<string, unknown>).payment_key_sha256 !== paymentKey) fail("LOCATED_RECORD_PAYMENT_KEY_MISMATCH", paymentKey);
  return {
    payment_key_sha256: paymentKey,
    record_sha256: digest,
    byte_length: recordBytes.length,
    record: parsed as Record<string, unknown>,
  };
}


type CarrierRecordSummaryV1 = {
  kind: "reservation" | "paid_unreservable_obligation";
  payment_key_sha256: string;
  request_key_sha256: string;
  canonical_payment_identity: string;
  request_id: string;
  instruction_id: string;
  delivery_address: string;
  record_void_units: string;
};

function normalizeCarrierRecord(
  record: BuyVoidHistoryCarrierDurableRecordV1 | Record<string, unknown>,
): CarrierRecordSummaryV1 {
  if (!record || typeof record !== "object" || Array.isArray(record)) {
    fail("INVALID_HISTORY_RECORD", "not-object");
  }
  const value = record as Record<string, unknown>;
  const paymentKey = requireHex64(
    value.payment_key_sha256,
    "INVALID_PAYMENT_KEY",
  );
  const requestKey = requireHex64(
    value.request_key_sha256,
    "INVALID_REQUEST_KEY",
  );
  const canonicalIdentity = String(
    value.canonical_payment_identity ?? "",
  ).trim();
  const requestId = String(value.request_id ?? "").trim();
  const instructionId = String(value.instruction_id ?? "").trim();
  const deliveryAddress = String(
    value.delivery_address ?? "",
  ).trim().toLowerCase();
  if (!canonicalIdentity) {
    fail("INVALID_CANONICAL_PAYMENT_IDENTITY", "empty");
  }
  if (!/^[A-Za-z0-9._:-]{1,160}$/.test(requestId)) {
    fail("INVALID_REQUEST_ID", requestId || "empty");
  }
  if (!/^[A-Za-z0-9._:-]{1,160}$/.test(instructionId)) {
    fail("INVALID_INSTRUCTION_ID", instructionId || "empty");
  }
  if (!/^0x[0-9a-f]{40}$/.test(deliveryAddress)) {
    fail("INVALID_DELIVERY_ADDRESS", deliveryAddress || "empty");
  }

  if (
    value.schema === "void_buy_void_inventory_reservation_v1" &&
    value.marker === VOID_BUY_VOID_INVENTORY_RESERVATION_JOURNAL_V1 &&
    value.reservation_status === "reserved"
  ) {
    return {
      kind: "reservation",
      payment_key_sha256: paymentKey,
      request_key_sha256: requestKey,
      canonical_payment_identity: canonicalIdentity,
      request_id: requestId,
      instruction_id: instructionId,
      delivery_address: deliveryAddress,
      record_void_units: canonicalUint(
        value.reserved_void_units,
        true,
        "INVALID_RESERVED_UNITS",
      ),
    };
  }

  if (
    value.schema === "void_buy_void_paid_unreservable_obligation_v1" &&
    value.marker === VOID_BUY_VOID_PAID_UNRESERVABLE_OBLIGATION_V1 &&
    value.terminal_state === "operator_reconciliation_required" &&
    value.reservation_created === false &&
    value.automatic_retry === false
  ) {
    return {
      kind: "paid_unreservable_obligation",
      payment_key_sha256: paymentKey,
      request_key_sha256: requestKey,
      canonical_payment_identity: canonicalIdentity,
      request_id: requestId,
      instruction_id: instructionId,
      delivery_address: deliveryAddress,
      record_void_units: canonicalUint(
        value.requested_void_units,
        true,
        "INVALID_OBLIGATION_UNITS",
      ),
    };
  }

  fail("INVALID_HISTORY_RECORD_KIND", String(value.schema ?? ""));
}

function normalizeSegmentedDurableRoot(
  input: SegmentedJsonlDurableRootV1,
): SegmentedJsonlDurableRootV1 {
  if (!input || typeof input !== "object") {
    fail("INVALID_SEGMENTED_DURABLE_ROOT", "not-object");
  }
  exactKeys(input as unknown as Record<string, unknown>, [
    "v",
    "format",
    "store_generation",
    "checkpoint_sha256",
    "snapshot_sha256",
    "manifest_sha256",
    "materialized_authority_sha256",
    "materialized_sha256",
    "append_only_witness_sha256",
    "previous_root_sha256",
    "total_bytes",
    "total_records",
    "root_sha256",
  ], "INVALID_SEGMENTED_DURABLE_ROOT_KEYS");
  if (
    input.v !== 1 ||
    input.format !== VOID_SEGMENTED_JSONL_DURABLE_ROOT_V1 ||
    !Number.isSafeInteger(input.store_generation) ||
    input.store_generation <= 0 ||
    !HEX_64.test(input.checkpoint_sha256) ||
    !HEX_64.test(input.snapshot_sha256) ||
    !HEX_64.test(input.manifest_sha256) ||
    !HEX_64.test(input.materialized_authority_sha256) ||
    !HEX_64.test(input.materialized_sha256) ||
    !(
      input.append_only_witness_sha256 === null ||
      HEX_64.test(input.append_only_witness_sha256)
    ) ||
    !(
      input.previous_root_sha256 === null ||
      HEX_64.test(input.previous_root_sha256)
    ) ||
    !Number.isSafeInteger(input.total_bytes) ||
    input.total_bytes < 0 ||
    !Number.isSafeInteger(input.total_records) ||
    input.total_records < 0 ||
    !HEX_64.test(input.root_sha256)
  ) {
    fail("INVALID_SEGMENTED_DURABLE_ROOT", "shape");
  }
  if (
    input.store_generation === 1
      ? (
          input.previous_root_sha256 !== null ||
          input.append_only_witness_sha256 !== null
        )
      : (
          input.previous_root_sha256 === null ||
          input.append_only_witness_sha256 === null
        )
  ) {
    fail(
      "INVALID_SEGMENTED_DURABLE_ROOT_PREDECESSOR",
      input.root_sha256,
    );
  }
  const core = {
    v: 1 as const,
    format:
      VOID_SEGMENTED_JSONL_DURABLE_ROOT_V1 as
        typeof VOID_SEGMENTED_JSONL_DURABLE_ROOT_V1,
    store_generation: input.store_generation,
    checkpoint_sha256: input.checkpoint_sha256,
    snapshot_sha256: input.snapshot_sha256,
    manifest_sha256: input.manifest_sha256,
    materialized_authority_sha256:
      input.materialized_authority_sha256,
    materialized_sha256: input.materialized_sha256,
    append_only_witness_sha256:
      input.append_only_witness_sha256,
    previous_root_sha256: input.previous_root_sha256,
    total_bytes: input.total_bytes,
    total_records: input.total_records,
  };
  if (
    sha256Bytes(JSON.stringify(core)) !== input.root_sha256
  ) {
    fail(
      "SEGMENTED_DURABLE_ROOT_DIGEST_MISMATCH",
      input.root_sha256,
    );
  }
  return input;
}

function rootCore(
  input: Omit<
    BuyVoidHistoryCarrierRootV1,
    "carrier_root_sha256"
  >,
): Omit<
  BuyVoidHistoryCarrierRootV1,
  "carrier_root_sha256"
> {
  if (
    input.v !== 1 ||
    input.format !== VOID_BUY_VOID_HISTORY_CARRIER_ROOT_V1
  ) {
    fail(
      "INVALID_CARRIER_ROOT_FORMAT",
      String(input.format),
    );
  }
  if (
    !Number.isSafeInteger(input.carrier_generation) ||
    input.carrier_generation <= 0
  ) {
    fail(
      "INVALID_CARRIER_GENERATION",
      String(input.carrier_generation),
    );
  }
  const previous =
    input.previous_carrier_root_sha256 === null
      ? null
      : requireHex64(
          input.previous_carrier_root_sha256,
          "INVALID_PREVIOUS_CARRIER_ROOT",
        );
  if (
    (input.carrier_generation === 1) !==
      (previous === null)
  ) {
    fail(
      "INVALID_CARRIER_PREDECESSOR",
      String(input.carrier_generation),
    );
  }
  const poolId = String(input.pool_id || "").trim();
  if (!/^[A-Za-z0-9._:-]{1,160}$/.test(poolId)) {
    fail("INVALID_POOL_ID", poolId || "empty");
  }
  if (
    input.committing_record_kind !== "reservation" &&
    input.committing_record_kind !==
      "paid_unreservable_obligation" &&
    input.committing_record_kind !== "history_refresh"
  ) {
    fail(
      "INVALID_COMMITTING_RECORD_KIND",
      String(input.committing_record_kind),
    );
  }
  const recordUnits = canonicalUint(
    input.committing_record_void_units,
    input.committing_record_kind !== "history_refresh",
    "INVALID_COMMITTING_RECORD_UNITS",
  );
  if (
    input.committing_record_kind === "history_refresh" &&
    recordUnits !== "0"
  ) {
    fail(
      "HISTORY_REFRESH_UNITS_MUST_BE_ZERO",
      recordUnits,
    );
  }
  return {
    v: 1,
    format: VOID_BUY_VOID_HISTORY_CARRIER_ROOT_V1,
    carrier_generation: input.carrier_generation,
    previous_carrier_root_sha256: previous,
    pool_id: poolId,
    active_segmented_durable_root_sha256:
      requireHex64(
        input.active_segmented_durable_root_sha256,
        "INVALID_SEGMENTED_DURABLE_ROOT",
      ),
    active_segmented_store_generation:
      (() => {
        if (
          !Number.isSafeInteger(
            input.active_segmented_store_generation,
          ) ||
          input.active_segmented_store_generation <= 0
        ) {
          fail(
            "INVALID_SEGMENTED_STORE_GENERATION",
            String(input.active_segmented_store_generation),
          );
        }
        return input.active_segmented_store_generation;
      })(),
    payment_history_fingerprint_sha256:
      requireHex64(
        input.payment_history_fingerprint_sha256,
        "INVALID_PAYMENT_HISTORY_FINGERPRINT",
      ),
    payment_index_root_sha256:
      requireHex64(
        input.payment_index_root_sha256,
        "INVALID_INDEX_ROOT",
      ),
    committed_void_units:
      canonicalUint(
        input.committed_void_units,
        false,
        "INVALID_COMMITTED_UNITS",
      ),
    reservation_count:
      canonicalUint(
        input.reservation_count,
        false,
        "INVALID_RESERVATION_COUNT",
      ),
    obligation_count:
      canonicalUint(
        input.obligation_count,
        false,
        "INVALID_OBLIGATION_COUNT",
      ),
    committing_record_kind: input.committing_record_kind,
    committing_payment_key_sha256:
      requireHex64(
        input.committing_payment_key_sha256,
        "INVALID_PAYMENT_KEY",
      ),
    committing_record_void_units: recordUnits,
  };
}

export function deriveBuyVoidHistoryCarrierRootV1(
  previous: BuyVoidHistoryCarrierRootV1 | null,
  input: {
    pool_id: string;
    segmented_durable_root: SegmentedJsonlDurableRootV1;
    payment_history_fingerprint_sha256: string;
    payment_index_root_sha256: string;
    committing_record_kind:
      | "reservation"
      | "paid_unreservable_obligation"
    | "history_refresh";
    committing_payment_key_sha256: string;
    committing_record_void_units: string;
  },
): BuyVoidHistoryCarrierRootV1 {
  const durableRoot =
    normalizeSegmentedDurableRoot(
      input.segmented_durable_root,
    );
  const before = previous
    ? verifyBuyVoidHistoryCarrierRootV1(previous)
    : null;
  const poolId = String(input.pool_id || "").trim();
  if (before && before.pool_id !== poolId) {
    fail("CARRIER_POOL_MISMATCH", poolId);
  }
  if (
    before &&
    durableRoot.store_generation <
      before.active_segmented_store_generation
  ) {
    fail(
      "SEGMENTED_DURABLE_ROOT_GENERATION_ROLLBACK",
      String(durableRoot.store_generation),
    );
  }
  const units = BigInt(
    canonicalUint(
      input.committing_record_void_units,
      input.committing_record_kind !== "history_refresh",
      "INVALID_COMMITTING_RECORD_UNITS",
    ),
  );
  if (
    input.committing_record_kind === "history_refresh" &&
    units !== 0n
  ) {
    fail(
      "HISTORY_REFRESH_UNITS_MUST_BE_ZERO",
      units.toString(),
    );
  }
  const generation =
    before ? before.carrier_generation + 1 : 1;
  const previousCommitted =
    before ? BigInt(before.committed_void_units) : 0n;
  const previousReservations =
    before ? BigInt(before.reservation_count) : 0n;
  const previousObligations =
    before ? BigInt(before.obligation_count) : 0n;
  const isReservation =
    input.committing_record_kind === "reservation";
  const isObligation =
    input.committing_record_kind ===
      "paid_unreservable_obligation";
  const core = rootCore({
    v: 1,
    format: VOID_BUY_VOID_HISTORY_CARRIER_ROOT_V1,
    carrier_generation: generation,
    previous_carrier_root_sha256:
      before ? before.carrier_root_sha256 : null,
    pool_id: poolId,
    active_segmented_durable_root_sha256:
      durableRoot.root_sha256,
    active_segmented_store_generation:
      durableRoot.store_generation,
    payment_history_fingerprint_sha256:
      input.payment_history_fingerprint_sha256,
    payment_index_root_sha256:
      input.payment_index_root_sha256,
    committed_void_units:
      (
        previousCommitted +
        (isReservation ? units : 0n)
      ).toString(),
    reservation_count:
      (
        previousReservations +
        (isReservation ? 1n : 0n)
      ).toString(),
    obligation_count:
      (
        previousObligations +
        (isObligation ? 1n : 0n)
      ).toString(),
    committing_record_kind:
      input.committing_record_kind,
    committing_payment_key_sha256:
      input.committing_payment_key_sha256,
    committing_record_void_units: units.toString(),
  });
  return {
    ...core,
    carrier_root_sha256:
      sha256Bytes(canonicalJson(core)),
  };
}

export function verifyBuyVoidHistoryCarrierRootV1(
  input: BuyVoidHistoryCarrierRootV1,
): BuyVoidHistoryCarrierRootV1 {
  if (!input || typeof input !== "object") {
    fail("INVALID_CARRIER_ROOT", "not-object");
  }
  exactKeys(
    input as unknown as Record<string, unknown>,
    [
      "v",
      "format",
      "carrier_generation",
      "previous_carrier_root_sha256",
      "pool_id",
      "active_segmented_durable_root_sha256",
      "active_segmented_store_generation",
      "payment_history_fingerprint_sha256",
      "payment_index_root_sha256",
      "committed_void_units",
      "reservation_count",
      "obligation_count",
      "committing_record_kind",
      "committing_payment_key_sha256",
      "committing_record_void_units",
      "carrier_root_sha256",
    ],
    "INVALID_CARRIER_ROOT_KEYS",
  );
  const {
    carrier_root_sha256: digestInput,
    ...rawCore
  } = input;
  const core = rootCore(
    rawCore as Omit<
      BuyVoidHistoryCarrierRootV1,
      "carrier_root_sha256"
    >,
  );
  const digest = requireHex64(
    digestInput,
    "INVALID_CARRIER_ROOT_DIGEST",
  );
  if (
    sha256Bytes(canonicalJson(core)) !== digest
  ) {
    fail(
      "CARRIER_ROOT_DIGEST_MISMATCH",
      digest,
    );
  }
  return {
    ...core,
    carrier_root_sha256: digest,
  };
}

export function verifyBuyVoidHistoryCarrierSuccessorV1(
  previous: BuyVoidHistoryCarrierRootV1,
  next: BuyVoidHistoryCarrierRootV1,
): BuyVoidHistoryCarrierRootV1 {
  const before =
    verifyBuyVoidHistoryCarrierRootV1(previous);
  const after =
    verifyBuyVoidHistoryCarrierRootV1(next);
  if (
    after.carrier_generation !==
      before.carrier_generation + 1
  ) {
    fail(
      "CARRIER_GENERATION_MISMATCH",
      String(after.carrier_generation),
    );
  }
  if (
    after.previous_carrier_root_sha256 !==
      before.carrier_root_sha256
  ) {
    fail(
      "CARRIER_PREDECESSOR_MISMATCH",
      after.carrier_root_sha256,
    );
  }
  if (after.pool_id !== before.pool_id) {
    fail(
      "CARRIER_POOL_MISMATCH",
      after.pool_id,
    );
  }
  const units =
    BigInt(after.committing_record_void_units);
  const isReservation =
    after.committing_record_kind === "reservation";
  const isObligation =
    after.committing_record_kind ===
      "paid_unreservable_obligation";
  if (
    after.committing_record_kind === "history_refresh" &&
    units !== 0n
  ) {
    fail(
      "HISTORY_REFRESH_UNITS_MUST_BE_ZERO",
      units.toString(),
    );
  }
  const expectedCommitted =
    BigInt(before.committed_void_units) +
    (isReservation ? units : 0n);
  const expectedReservations =
    BigInt(before.reservation_count) +
    (isReservation ? 1n : 0n);
  const expectedObligations =
    BigInt(before.obligation_count) +
    (isObligation ? 1n : 0n);
  if (
    BigInt(after.committed_void_units) !==
      expectedCommitted
  ) {
    fail(
      "CARRIER_COMMITTED_UNITS_MISMATCH",
      after.carrier_root_sha256,
    );
  }
  if (
    BigInt(after.reservation_count) !==
      expectedReservations
  ) {
    fail(
      "CARRIER_RESERVATION_COUNT_MISMATCH",
      after.carrier_root_sha256,
    );
  }
  if (
    BigInt(after.obligation_count) !==
      expectedObligations
  ) {
    fail(
      "CARRIER_OBLIGATION_COUNT_MISMATCH",
      after.carrier_root_sha256,
    );
  }
  return after;
}

export function deriveBuyVoidHistoryCarrierTxIntentV1(
  input: {
    predecessor_carrier_root_sha256: string | null;
    pool_id: string;
    committing_record_kind:
      | "reservation"
      | "paid_unreservable_obligation"
    | "history_refresh";
    committing_payment_key_sha256: string;
    committing_record_locator: BuyVoidHistoryRecordLocatorV1;
    expected_segmented_durable_root_sha256: string;
    expected_segmented_store_generation: number;
    expected_payment_history_fingerprint_sha256:
      string;
    expected_index_root_sha256: string;
    expected_committed_void_units: string;
    expected_reservation_count: string;
    expected_obligation_count: string;
    expected_carrier_root_sha256: string;
    new_page_digests: string[];
  },
): BuyVoidHistoryCarrierTxIntentV1 {
  const digests =
    [...input.new_page_digests]
      .map((value) =>
        requireHex64(
          value,
          "INVALID_NEW_PAGE_DIGEST",
        ))
      .sort();
  if (
    digests.length >
      VOID_BUY_VOID_HISTORY_CARRIER_MAX_PAGE_WRITES_PER_INSERT_V1
  ) {
    fail(
      "TOO_MANY_NEW_PAGES",
      String(digests.length),
    );
  }
  if (
    digests.some(
      (value, index) =>
        index > 0 && value === digests[index - 1],
    )
  ) {
    fail(
      "DUPLICATE_NEW_PAGE_DIGEST",
      "duplicate",
    );
  }
  const poolId = String(input.pool_id || "").trim();
  if (!/^[A-Za-z0-9._:-]{1,160}$/.test(poolId)) {
    fail("INVALID_POOL_ID", poolId || "empty");
  }
  if (
    input.committing_record_kind !== "reservation" &&
    input.committing_record_kind !==
      "paid_unreservable_obligation" &&
    input.committing_record_kind !== "history_refresh"
  ) {
    fail(
      "INVALID_COMMITTING_RECORD_KIND",
      String(input.committing_record_kind),
    );
  }
  if (
    !Number.isSafeInteger(
      input.expected_segmented_store_generation,
    ) ||
    input.expected_segmented_store_generation <= 0
  ) {
    fail(
      "INVALID_SEGMENTED_STORE_GENERATION",
      String(
        input.expected_segmented_store_generation,
      ),
    );
  }
  const core = {
    v: 1 as const,
    format:
      VOID_BUY_VOID_HISTORY_CARRIER_TX_INTENT_V1 as
        typeof VOID_BUY_VOID_HISTORY_CARRIER_TX_INTENT_V1,
    predecessor_carrier_root_sha256:
      input.predecessor_carrier_root_sha256 === null
        ? null
        : requireHex64(
            input.predecessor_carrier_root_sha256,
            "INVALID_PREVIOUS_CARRIER_ROOT",
          ),
    pool_id: poolId,
    committing_record_kind:
      input.committing_record_kind,
    committing_payment_key_sha256:
      requireHex64(
        input.committing_payment_key_sha256,
        "INVALID_PAYMENT_KEY",
      ),
    committing_record_locator:
      normalizedLocator(
        input.committing_record_locator,
      ),
    expected_segmented_durable_root_sha256:
      requireHex64(
        input.expected_segmented_durable_root_sha256,
        "INVALID_SEGMENTED_DURABLE_ROOT",
      ),
    expected_segmented_store_generation:
      input.expected_segmented_store_generation,
    expected_payment_history_fingerprint_sha256:
      requireHex64(
        input.expected_payment_history_fingerprint_sha256,
        "INVALID_PAYMENT_HISTORY_FINGERPRINT",
      ),
    expected_index_root_sha256:
      requireHex64(
        input.expected_index_root_sha256,
        "INVALID_INDEX_ROOT",
      ),
    expected_committed_void_units:
      canonicalUint(
        input.expected_committed_void_units,
        false,
        "INVALID_COMMITTED_UNITS",
      ),
    expected_reservation_count:
      canonicalUint(
        input.expected_reservation_count,
        false,
        "INVALID_RESERVATION_COUNT",
      ),
    expected_obligation_count:
      canonicalUint(
        input.expected_obligation_count,
        false,
        "INVALID_OBLIGATION_COUNT",
      ),
    expected_carrier_root_sha256:
      requireHex64(
        input.expected_carrier_root_sha256,
        "INVALID_CARRIER_ROOT_DIGEST",
      ),
    new_page_digests: digests,
  };
  return {
    ...core,
    tx_intent_sha256:
      sha256Bytes(canonicalJson(core)),
  };
}

export function verifyBuyVoidHistoryCarrierTxIntentV1(
  input: BuyVoidHistoryCarrierTxIntentV1,
): BuyVoidHistoryCarrierTxIntentV1 {
  if (!input || typeof input !== "object") {
    fail("INVALID_TX_INTENT", "not-object");
  }
  exactKeys(
    input as unknown as Record<string, unknown>,
    [
      "v",
      "format",
      "predecessor_carrier_root_sha256",
      "pool_id",
      "committing_record_kind",
      "committing_payment_key_sha256",
      "committing_record_locator",
      "expected_segmented_durable_root_sha256",
      "expected_segmented_store_generation",
      "expected_payment_history_fingerprint_sha256",
      "expected_index_root_sha256",
      "expected_committed_void_units",
      "expected_reservation_count",
      "expected_obligation_count",
      "expected_carrier_root_sha256",
      "new_page_digests",
      "tx_intent_sha256",
    ],
    "INVALID_TX_INTENT_KEYS",
  );
  const rebuilt =
    deriveBuyVoidHistoryCarrierTxIntentV1({
      predecessor_carrier_root_sha256:
        input.predecessor_carrier_root_sha256,
      pool_id: input.pool_id,
      committing_record_kind:
        input.committing_record_kind,
      committing_payment_key_sha256:
        input.committing_payment_key_sha256,
      committing_record_locator:
        input.committing_record_locator,
      expected_segmented_durable_root_sha256:
        input.expected_segmented_durable_root_sha256,
      expected_segmented_store_generation:
        input.expected_segmented_store_generation,
      expected_payment_history_fingerprint_sha256:
        input.expected_payment_history_fingerprint_sha256,
      expected_index_root_sha256:
        input.expected_index_root_sha256,
      expected_committed_void_units:
        input.expected_committed_void_units,
      expected_reservation_count:
        input.expected_reservation_count,
      expected_obligation_count:
        input.expected_obligation_count,
      expected_carrier_root_sha256:
        input.expected_carrier_root_sha256,
      new_page_digests: input.new_page_digests,
    });
  if (
    rebuilt.tx_intent_sha256 !==
      input.tx_intent_sha256
  ) {
    fail(
      "TX_INTENT_DIGEST_MISMATCH",
      String(input.tx_intent_sha256),
    );
  }
  return rebuilt;
}

export function planBuyVoidHistoryCarrierCommitFromVerifiedBytesV1(
  input: {
    previous_carrier_root:
      BuyVoidHistoryCarrierRootV1 | null;
    current_index_root_sha256: string;
    segmented_durable_root:
      SegmentedJsonlDurableRootV1;
    pool_id: string;
    payment_history_fingerprint_sha256: string;
    record: BuyVoidHistoryCarrierDurableRecordV1;
    record_locator: BuyVoidHistoryRecordLocatorV1;
    record_bytes: Buffer;
    read_page: (sha256: string) => Buffer;
  },
): BuyVoidHistoryCarrierCommitPlanV1 {
  const poolId = String(input.pool_id || "").trim();
  if (!/^[A-Za-z0-9._:-]{1,160}$/.test(poolId)) {
    fail("INVALID_POOL_ID", poolId || "empty");
  }
  const paymentHistoryFingerprint =
    requireHex64(
      input.payment_history_fingerprint_sha256,
      "INVALID_PAYMENT_HISTORY_FINGERPRINT",
    );
  const durableRoot =
    normalizeSegmentedDurableRoot(
      input.segmented_durable_root,
    );
  const previous =
    input.previous_carrier_root
      ? verifyBuyVoidHistoryCarrierRootV1(
          input.previous_carrier_root,
        )
      : null;
  const currentIndexRoot =
    requireHex64(
      input.current_index_root_sha256,
      "INVALID_INDEX_ROOT",
    );

  if (previous) {
    if (
      previous.payment_index_root_sha256 !==
        currentIndexRoot
    ) {
      fail(
        "CARRIER_INDEX_PREDECESSOR_MISMATCH",
        currentIndexRoot,
      );
    }
    if (previous.pool_id !== poolId) {
      fail("CARRIER_POOL_MISMATCH", poolId);
    }
    if (
      durableRoot.store_generation <
        previous.active_segmented_store_generation
    ) {
      fail(
        "SEGMENTED_DURABLE_ROOT_GENERATION_ROLLBACK",
        String(durableRoot.store_generation),
      );
    }
  } else {
    const empty =
      createEmptyBuyVoidHistoryIndexV1();
    if (currentIndexRoot !== empty.root_sha256) {
      fail(
        "CARRIER_GENESIS_INDEX_ROOT_MISMATCH",
        currentIndexRoot,
      );
    }
  }

  const recordSummary =
    normalizeCarrierRecord(input.record);
  const locator =
    normalizedLocator(input.record_locator);
  if (
    locator.segmented_durable_root_sha256 !==
      durableRoot.root_sha256
  ) {
    fail(
      "LOCATOR_DURABLE_ROOT_MISMATCH",
      locator.segmented_durable_root_sha256,
    );
  }
  const located =
    verifyLocatedBuyVoidHistoryRecordV1(
      recordSummary.payment_key_sha256,
      locator,
      input.record_bytes,
    );
  if (
    canonicalJson(located.record) !==
      canonicalJson(input.record)
  ) {
    fail(
      "LOCATED_RECORD_OBJECT_MISMATCH",
      located.record_sha256,
    );
  }

  const entry: BuyVoidHistoryIndexEntryV1 = {
    payment_key_sha256:
      recordSummary.payment_key_sha256,
    locator,
    payment_history_fingerprint_sha256:
      paymentHistoryFingerprint,
  };
  const mutation =
    insertBuyVoidHistoryIndexV1(
      currentIndexRoot,
      entry,
      input.read_page,
    );
  if (mutation.status === "duplicate") {
    return {
      status: "duplicate",
      index_root_sha256:
        mutation.root_sha256,
      existing_entry:
        mutation.existing_entry as
          BuyVoidHistoryIndexEntryV1,
    };
  }

  if (
    mutation.status === "updated" &&
    !previous
  ) {
    fail(
      "HISTORY_REFRESH_PREDECESSOR_REQUIRED",
      recordSummary.payment_key_sha256,
    );
  }
  const transitionKind =
    mutation.status === "updated"
      ? "history_refresh"
      : recordSummary.kind;
  const transitionUnits =
    transitionKind === "history_refresh"
      ? "0"
      : recordSummary.record_void_units;

  const carrierRoot =
    deriveBuyVoidHistoryCarrierRootV1(
      previous,
      {
        pool_id: poolId,
        segmented_durable_root: durableRoot,
        payment_history_fingerprint_sha256:
          paymentHistoryFingerprint,
        payment_index_root_sha256:
          mutation.root_sha256,
        committing_record_kind:
          transitionKind,
        committing_payment_key_sha256:
          recordSummary.payment_key_sha256,
        committing_record_void_units:
          transitionUnits,
      },
    );
  const txIntent =
    deriveBuyVoidHistoryCarrierTxIntentV1({
      predecessor_carrier_root_sha256:
        previous
          ? previous.carrier_root_sha256
          : null,
      pool_id: poolId,
      committing_record_kind:
        transitionKind,
      committing_payment_key_sha256:
        recordSummary.payment_key_sha256,
      committing_record_locator: locator,
      expected_segmented_durable_root_sha256:
        carrierRoot.active_segmented_durable_root_sha256,
      expected_segmented_store_generation:
        carrierRoot.active_segmented_store_generation,
      expected_payment_history_fingerprint_sha256:
        carrierRoot.payment_history_fingerprint_sha256,
      expected_index_root_sha256:
        carrierRoot.payment_index_root_sha256,
      expected_committed_void_units:
        carrierRoot.committed_void_units,
      expected_reservation_count:
        carrierRoot.reservation_count,
      expected_obligation_count:
        carrierRoot.obligation_count,
      expected_carrier_root_sha256:
        carrierRoot.carrier_root_sha256,
      new_page_digests:
        mutation.new_pages.map(
          (page) => page.sha256,
        ),
    });
  return {
    status: "planned",
    index_root_sha256:
      mutation.root_sha256,
    new_pages: mutation.new_pages,
    carrier_root: carrierRoot,
    tx_intent: txIntent,
  };
}

type MaterializedSegmentRangeV1 = {
  start: number;
  end: number;
  segment_sha256: string;
};

function manifestSegmentRangeV1(
  manifestInput: SegmentedJsonlManifestV1,
  locatorInput: BuyVoidHistoryRecordLocatorV1,
): {
  manifest: SegmentedJsonlManifestV1;
  manifest_sha256: string;
  range: MaterializedSegmentRangeV1;
  absolute_offset: number;
} {
  const manifestBytes =
    serializeSegmentedJsonlManifestV1(manifestInput);
  const manifest = JSON.parse(
    manifestBytes.toString("utf8"),
  ) as SegmentedJsonlManifestV1;
  const manifestSha256 = sha256Bytes(manifestBytes);
  const locator = normalizedLocator(locatorInput);

  let cursor = 0;
  let selected: MaterializedSegmentRangeV1 | null = null;
  for (const segment of manifest.sealed_segments) {
    const start = cursor;
    const end = start + segment.bytes;
    if (segment.id === locator.segment_id) {
      if (segment.sha256 !== locator.segment_sha256) {
        fail(
          "LOCATOR_SEGMENT_DIGEST_MISMATCH",
          String(locator.segment_id),
        );
      }
      selected = {
        start,
        end,
        segment_sha256: segment.sha256,
      };
    }
    cursor = end;
  }

  if (
    locator.segment_id ===
      VOID_BUY_VOID_HISTORY_CARRIER_ACTIVE_SEGMENT_ID_V1
  ) {
    if (manifest.active.sha256 !== locator.segment_sha256) {
      fail(
        "LOCATOR_ACTIVE_SEGMENT_DIGEST_MISMATCH",
        locator.segment_sha256,
      );
    }
    selected = {
      start: cursor,
      end: cursor + manifest.active.bytes,
      segment_sha256: manifest.active.sha256,
    };
  }

  if (!selected) {
    fail(
      "LOCATOR_SEGMENT_NOT_IN_MANIFEST",
      String(locator.segment_id),
    );
  }

  const absoluteOffsetBig = BigInt(locator.byte_offset);
  if (absoluteOffsetBig > BigInt(Number.MAX_SAFE_INTEGER)) {
    fail(
      "LOCATOR_BYTE_OFFSET_NOT_SAFE_INTEGER",
      locator.byte_offset,
    );
  }
  const absoluteOffset = Number(absoluteOffsetBig);
  if (
    absoluteOffset < selected.start ||
    locator.byte_length >
      selected.end - absoluteOffset
  ) {
    fail(
      "LOCATOR_RANGE_OUTSIDE_SEGMENT",
      String(absoluteOffset) + ":" +
        String(locator.byte_length) + ":" +
        String(selected.start) + ":" +
        String(selected.end),
    );
  }
  if (
    absoluteOffset >
      manifest.total_bytes - locator.byte_length
  ) {
    fail(
      "LOCATOR_RANGE_OUTSIDE_MATERIALIZED",
      String(absoluteOffset) + ":" +
        String(locator.byte_length) + ":" +
        String(manifest.total_bytes),
    );
  }

  return {
    manifest,
    manifest_sha256: manifestSha256,
    range: selected,
    absolute_offset: absoluteOffset,
  };
}

export function planBuyVoidHistoryCarrierCommitV1(
  input: {
    previous_carrier_root:
      BuyVoidHistoryCarrierRootV1 | null;
    current_index_root_sha256: string;
    durable_root_directory: string;
    store_root: string;
    materialized_file: string;
    materialized_authority:
      SegmentedJsonlMaterializedAuthorityV1;
    manifest: SegmentedJsonlManifestV1;
    trusted_segmented_durable_root_sha256: string;
    payment_runtime_root_dir: string;
    pool_id: string;
    record_locator: BuyVoidHistoryRecordLocatorV1;
    read_page: (sha256: string) => Buffer;
  },
): BuyVoidHistoryCarrierCommitPlanV1 {
  const trustedRoot = requireHex64(
    input.trusted_segmented_durable_root_sha256,
    "INVALID_SEGMENTED_DURABLE_ROOT",
  );
  const durableRoot =
    readSegmentedJsonlDurableRootV1(
      input.durable_root_directory,
    );
  if (!durableRoot) {
    fail(
      "SEGMENTED_DURABLE_ROOT_REQUIRED",
      input.durable_root_directory,
    );
  }
  normalizeSegmentedDurableRoot(durableRoot);
  if (durableRoot.root_sha256 !== trustedRoot) {
    fail(
      "SEGMENTED_DURABLE_ROOT_TRUST_MISMATCH",
      durableRoot.root_sha256 + ":" + trustedRoot,
    );
  }

  const locator =
    normalizedLocator(input.record_locator);
  if (
    locator.segmented_durable_root_sha256 !==
      durableRoot.root_sha256
  ) {
    fail(
      "LOCATOR_DURABLE_ROOT_MISMATCH",
      locator.segmented_durable_root_sha256,
    );
  }

  const segment =
    manifestSegmentRangeV1(
      input.manifest,
      locator,
    );
  if (
    segment.manifest_sha256 !==
      durableRoot.manifest_sha256 ||
    segment.manifest.generation !==
      durableRoot.store_generation ||
    segment.manifest.total_bytes !==
      durableRoot.total_bytes ||
    segment.manifest.total_records !==
      durableRoot.total_records
  ) {
    fail(
      "LOCATOR_MANIFEST_DURABLE_ROOT_MISMATCH",
      durableRoot.root_sha256,
    );
  }

  const recordBytes =
    verifySegmentedJsonlDurableRootMaterializedAtUseV1(
      input.durable_root_directory,
      input.store_root,
      input.materialized_file,
      input.materialized_authority,
      trustedRoot,
      (reader) => {
        if (
          reader.max_read_bytes <
            locator.byte_length
        ) {
          fail(
            "LOCATED_RECORD_EXCEEDS_AT_USE_READ_BOUND",
            String(locator.byte_length),
          );
        }
        return reader.read(
          segment.absolute_offset,
          locator.byte_length,
        );
      },
    );

  if (
    recordBytes.length === 0 ||
    recordBytes[recordBytes.length - 1] !== 0x0a
  ) {
    fail(
      "LOCATED_RECORD_DELIMITER_MISMATCH",
      String(recordBytes.length),
    );
  }
  let parsedRecord: Record<string, unknown>;
  try {
    const parsed = JSON.parse(
      FATAL_UTF8.decode(
        recordBytes.subarray(
          0,
          recordBytes.length - 1,
        ),
      ),
    );
    if (
      !parsed ||
      typeof parsed !== "object" ||
      Array.isArray(parsed)
    ) {
      fail(
        "LOCATED_RECORD_SHAPE_INVALID",
        locator.record_sha256,
      );
    }
    parsedRecord =
      parsed as Record<string, unknown>;
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes(
        VOID_BUY_VOID_HISTORY_CARRIER_PAGE_V1,
      )
    ) {
      throw error;
    }
    fail(
      "LOCATED_RECORD_JSON_INVALID",
      locator.record_sha256,
    );
  }
  const recordSummary =
    normalizeCarrierRecord(parsedRecord);
  verifyLocatedBuyVoidHistoryRecordV1(
    recordSummary.payment_key_sha256,
    locator,
    recordBytes,
  );

  const projection =
    projectBuyVoidPaymentHistoryV1({
      root_dir: input.payment_runtime_root_dir,
      pool_id: input.pool_id,
      payment_key_sha256:
        recordSummary.payment_key_sha256,
    });
  if (
    projection.primary_record_sha256 !==
      locator.record_sha256 ||
    canonicalJson(projection.primary_record) !==
      canonicalJson(parsedRecord)
  ) {
    fail(
      "LOCATED_RECORD_CURRENT_JOURNAL_MATCH_INVALID",
      recordSummary.payment_key_sha256,
    );
  }

  return planBuyVoidHistoryCarrierCommitFromVerifiedBytesV1({
    previous_carrier_root:
      input.previous_carrier_root,
    current_index_root_sha256:
      input.current_index_root_sha256,
    segmented_durable_root: durableRoot,
    pool_id: input.pool_id,
    payment_history_fingerprint_sha256:
      projection.payment_history_fingerprint_sha256,
    record: projection.primary_record,
    record_locator: locator,
    record_bytes: recordBytes,
    read_page: input.read_page,
  });
}


export function planBuyVoidHistoryCarrierRefreshV1(
  input: {
    previous_carrier_root: BuyVoidHistoryCarrierRootV1;
    durable_root_directory: string;
    trusted_segmented_durable_root_sha256: string;
    payment_runtime_root_dir: string;
    pool_id: string;
    payment_key_sha256: string;
    read_page: (sha256: string) => Buffer;
  },
): BuyVoidHistoryCarrierCommitPlanV1 {
  const previous =
    verifyBuyVoidHistoryCarrierRootV1(
      input.previous_carrier_root,
    );
  const poolId = String(input.pool_id || "").trim();
  if (previous.pool_id !== poolId) {
    fail("CARRIER_POOL_MISMATCH", poolId);
  }
  const paymentKey =
    requireHex64(
      input.payment_key_sha256,
      "INVALID_PAYMENT_KEY",
    );
  const trustedRoot =
    requireHex64(
      input.trusted_segmented_durable_root_sha256,
      "INVALID_SEGMENTED_DURABLE_ROOT",
    );
  const durableRoot =
    readSegmentedJsonlDurableRootV1(
      input.durable_root_directory,
    );
  if (!durableRoot) {
    fail(
      "SEGMENTED_DURABLE_ROOT_REQUIRED",
      input.durable_root_directory,
    );
  }
  normalizeSegmentedDurableRoot(durableRoot);
  if (durableRoot.root_sha256 !== trustedRoot) {
    fail(
      "SEGMENTED_DURABLE_ROOT_TRUST_MISMATCH",
      durableRoot.root_sha256 + ":" + trustedRoot,
    );
  }
  if (
    durableRoot.store_generation <
      previous.active_segmented_store_generation
  ) {
    fail(
      "SEGMENTED_DURABLE_ROOT_GENERATION_ROLLBACK",
      String(durableRoot.store_generation),
    );
  }

  const lookup =
    lookupBuyVoidHistoryIndexV1(
      previous.payment_index_root_sha256,
      paymentKey,
      input.read_page,
    );
  if (!lookup.found || !lookup.entry) {
    fail(
      "HISTORY_REFRESH_INDEX_MEMBERSHIP_REQUIRED",
      paymentKey,
    );
  }

  const projection =
    projectBuyVoidPaymentHistoryV1({
      root_dir: input.payment_runtime_root_dir,
      pool_id: poolId,
      payment_key_sha256: paymentKey,
    });
  if (
    projection.primary_record_sha256 !==
      lookup.entry.locator.record_sha256
  ) {
    fail(
      "HISTORY_REFRESH_PRIMARY_RECORD_DIGEST_MISMATCH",
      paymentKey,
    );
  }

  const mutation =
    insertBuyVoidHistoryIndexV1(
      previous.payment_index_root_sha256,
      {
        payment_key_sha256: paymentKey,
        locator: lookup.entry.locator,
        payment_history_fingerprint_sha256:
          projection.payment_history_fingerprint_sha256,
      },
      input.read_page,
    );
  if (mutation.status === "duplicate") {
    return {
      status: "duplicate",
      index_root_sha256:
        mutation.root_sha256,
      existing_entry:
        mutation.existing_entry as
          BuyVoidHistoryIndexEntryV1,
    };
  }
  if (mutation.status !== "updated") {
    fail(
      "HISTORY_REFRESH_EXISTING_KEY_REQUIRED",
      paymentKey,
    );
  }

  const carrierRoot =
    deriveBuyVoidHistoryCarrierRootV1(
      previous,
      {
        pool_id: poolId,
        segmented_durable_root: durableRoot,
        payment_history_fingerprint_sha256:
          projection.payment_history_fingerprint_sha256,
        payment_index_root_sha256:
          mutation.root_sha256,
        committing_record_kind:
          "history_refresh",
        committing_payment_key_sha256:
          paymentKey,
        committing_record_void_units: "0",
      },
    );
  const txIntent =
    deriveBuyVoidHistoryCarrierTxIntentV1({
      predecessor_carrier_root_sha256:
        previous.carrier_root_sha256,
      pool_id: poolId,
      committing_record_kind:
        "history_refresh",
      committing_payment_key_sha256:
        paymentKey,
      committing_record_locator:
        lookup.entry.locator,
      expected_segmented_durable_root_sha256:
        carrierRoot.active_segmented_durable_root_sha256,
      expected_segmented_store_generation:
        carrierRoot.active_segmented_store_generation,
      expected_payment_history_fingerprint_sha256:
        carrierRoot.payment_history_fingerprint_sha256,
      expected_index_root_sha256:
        carrierRoot.payment_index_root_sha256,
      expected_committed_void_units:
        carrierRoot.committed_void_units,
      expected_reservation_count:
        carrierRoot.reservation_count,
      expected_obligation_count:
        carrierRoot.obligation_count,
      expected_carrier_root_sha256:
        carrierRoot.carrier_root_sha256,
      new_page_digests:
        mutation.new_pages.map(
          (page) => page.sha256,
        ),
    });
  return {
    status: "planned",
    index_root_sha256:
      mutation.root_sha256,
    new_pages: mutation.new_pages,
    carrier_root: carrierRoot,
    tx_intent: txIntent,
  };
}
