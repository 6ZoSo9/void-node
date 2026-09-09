import crypto from "node:crypto";
import { TextDecoder } from "node:util";

export const VOID_BUY_VOID_HISTORY_CARRIER_PAGE_V1 = "VOID_BUY_VOID_HISTORY_CARRIER_PAGE_V1";
export const VOID_BUY_VOID_HISTORY_CARRIER_ROOT_V1 = "VOID_BUY_VOID_HISTORY_CARRIER_ROOT_V1";
export const VOID_BUY_VOID_HISTORY_CARRIER_TX_INTENT_V1 = "VOID_BUY_VOID_HISTORY_CARRIER_TX_INTENT_V1";

export const VOID_BUY_VOID_HISTORY_CARRIER_PAGE_BYTES_V1 = 8_192;
export const VOID_BUY_VOID_HISTORY_CARRIER_MAX_INDEX_DEPTH_V1 = 64;
export const VOID_BUY_VOID_HISTORY_CARRIER_MAX_INDEX_PAGE_READS_V1 = 65;
export const VOID_BUY_VOID_HISTORY_CARRIER_MAX_LOCATED_RECORD_BYTES_V1 = 1_048_577;
export const VOID_BUY_VOID_HISTORY_CARRIER_ACTIVE_SEGMENT_ID_V1 = 0xffff_ffff;

const PAGE_MAGIC = Buffer.from("VBP1", "ascii");
const PAGE_TYPE_INTERNAL = 0;
const PAGE_TYPE_LEAF = 1;
const PAGE_HEADER_BYTES = 40;
const DIGEST_BYTES = 32;
const KEY_BYTES = 32;
const LOCATOR_BYTES = 112;
const LEAF_ENTRY_BYTES = KEY_BYTES + LOCATOR_BYTES;
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
  total_local_rollback_detection: false,
  runtime_integration: false,
  payment_confirmation_authority: false,
  fulfillment_authority: false,
  transaction_broadcast: false,
  signing: false,
  wallet_access: false,
  money_movement: false,
} as const;

export type BuyVoidHistoryRecordLocatorV1 = {
  epoch_durable_root_sha256: string;
  segment_id: number;
  segment_sha256: string;
  byte_offset: string;
  byte_length: number;
  record_sha256: string;
};

export type BuyVoidHistoryIndexEntryV1 = {
  payment_key_sha256: string;
  locator: BuyVoidHistoryRecordLocatorV1;
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
  status: "inserted" | "duplicate";
  root_sha256: string;
  new_pages: Array<{ sha256: string; bytes: Buffer }>;
  existing_entry: BuyVoidHistoryIndexEntryV1 | null;
};

export type BuyVoidHistoryCarrierRootV1 = {
  v: 1;
  format: typeof VOID_BUY_VOID_HISTORY_CARRIER_ROOT_V1;
  carrier_generation: number;
  previous_carrier_root_sha256: string | null;
  active_1352_durable_root_sha256: string;
  payment_index_root_sha256: string;
  committed_void_units: string;
  reservation_count: string;
  committing_payment_key_sha256: string;
  committing_reserved_void_units: string;
  carrier_root_sha256: string;
};

export type BuyVoidHistoryCarrierTxIntentV1 = {
  v: 1;
  format: typeof VOID_BUY_VOID_HISTORY_CARRIER_TX_INTENT_V1;
  predecessor_carrier_root_sha256: string | null;
  committing_payment_key_sha256: string;
  committing_record_locator: BuyVoidHistoryRecordLocatorV1;
  expected_1352_durable_root_sha256: string;
  expected_index_root_sha256: string;
  expected_committed_void_units: string;
  expected_reservation_count: string;
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
    epoch_durable_root_sha256: requireHex64(input.epoch_durable_root_sha256, "INVALID_EPOCH_ROOT"),
    segment_id: segmentId,
    segment_sha256: requireHex64(input.segment_sha256, "INVALID_SEGMENT_SHA"),
    byte_offset: offsetText,
    byte_length: byteLength,
    record_sha256: requireHex64(input.record_sha256, "INVALID_RECORD_SHA"),
  };
}

function normalizedEntry(input: BuyVoidHistoryIndexEntryV1): BuyVoidHistoryIndexEntryV1 {
  if (!input || typeof input !== "object") fail("INVALID_INDEX_ENTRY", "not-object");
  return {
    payment_key_sha256: requireHex64(input.payment_key_sha256, "INVALID_PAYMENT_KEY"),
    locator: normalizedLocator(input.locator),
  };
}

function sameLocator(a: BuyVoidHistoryRecordLocatorV1, b: BuyVoidHistoryRecordLocatorV1): boolean {
  return a.epoch_durable_root_sha256 === b.epoch_durable_root_sha256 &&
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
  hex32(entry.locator.epoch_durable_root_sha256, "INVALID_EPOCH_ROOT").copy(out, 32);
  out.writeUInt32BE(entry.locator.segment_id, 64);
  hex32(entry.locator.segment_sha256, "INVALID_SEGMENT_SHA").copy(out, 68);
  out.writeBigUInt64BE(BigInt(entry.locator.byte_offset), 100);
  out.writeUInt32BE(entry.locator.byte_length, 108);
  hex32(entry.locator.record_sha256, "INVALID_RECORD_SHA").copy(out, 112);
  return out;
}

function decodeEntry(bytes: Buffer): BuyVoidHistoryIndexEntryV1 {
  if (bytes.length !== LEAF_ENTRY_BYTES) fail("INVALID_LEAF_ENTRY_BYTES", String(bytes.length));
  return normalizedEntry({
    payment_key_sha256: bytes.subarray(0, 32).toString("hex"),
    locator: {
      epoch_durable_root_sha256: bytes.subarray(32, 64).toString("hex"),
      segment_id: bytes.readUInt32BE(64),
      segment_sha256: bytes.subarray(68, 100).toString("hex"),
      byte_offset: bytes.readBigUInt64BE(100).toString(),
      byte_length: bytes.readUInt32BE(108),
      record_sha256: bytes.subarray(112, 144).toString("hex"),
    },
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
): { status: "inserted" | "duplicate"; digest: string; existing: BuyVoidHistoryIndexEntryV1 | null } {
  if (pageReads >= VOID_BUY_VOID_HISTORY_CARRIER_MAX_INDEX_PAGE_READS_V1) fail("INDEX_DEPTH_EXCEEDED", String(pageReads));
  const page = readVerifiedPage(digest, readPage);
  const key = hex32(entry.payment_key_sha256, "INVALID_PAYMENT_KEY");

  if (page.type === "leaf") {
    const existing = page.entries.find((candidate) => candidate.payment_key_sha256 === entry.payment_key_sha256) ?? null;
    if (existing) {
      if (!sameLocator(existing.locator, entry.locator)) fail("INDEX_KEY_CONFLICT", entry.payment_key_sha256);
      return { status: "duplicate", digest, existing };
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
  if (childResult.status === "duplicate") return { status: "duplicate", digest, existing: childResult.existing };
  const nextChildren = page.children.map((child) => child.nibble === nibble ? { nibble, digest: childResult.digest } : child);
  return {
    status: "inserted",
    digest: addNewPage(newPages, encodeInternalPage(page.prefix, page.prefix_length, nextChildren)),
    existing: null,
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
): { payment_key_sha256: string; record_sha256: string; byte_length: number } {
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
  return { payment_key_sha256: paymentKey, record_sha256: digest, byte_length: recordBytes.length };
}

function rootCore(input: Omit<BuyVoidHistoryCarrierRootV1, "carrier_root_sha256">): Omit<BuyVoidHistoryCarrierRootV1, "carrier_root_sha256"> {
  if (input.v !== 1 || input.format !== VOID_BUY_VOID_HISTORY_CARRIER_ROOT_V1) fail("INVALID_CARRIER_ROOT_FORMAT", String(input.format));
  if (!Number.isSafeInteger(input.carrier_generation) || input.carrier_generation <= 0) fail("INVALID_CARRIER_GENERATION", String(input.carrier_generation));
  const previous = input.previous_carrier_root_sha256 === null
    ? null
    : requireHex64(input.previous_carrier_root_sha256, "INVALID_PREVIOUS_CARRIER_ROOT");
  if ((input.carrier_generation === 1) !== (previous === null)) fail("INVALID_CARRIER_PREDECESSOR", String(input.carrier_generation));
  return {
    v: 1,
    format: VOID_BUY_VOID_HISTORY_CARRIER_ROOT_V1,
    carrier_generation: input.carrier_generation,
    previous_carrier_root_sha256: previous,
    active_1352_durable_root_sha256: requireHex64(input.active_1352_durable_root_sha256, "INVALID_1352_ROOT"),
    payment_index_root_sha256: requireHex64(input.payment_index_root_sha256, "INVALID_INDEX_ROOT"),
    committed_void_units: canonicalUint(input.committed_void_units, true, "INVALID_COMMITTED_UNITS"),
    reservation_count: canonicalUint(input.reservation_count, true, "INVALID_RESERVATION_COUNT"),
    committing_payment_key_sha256: requireHex64(input.committing_payment_key_sha256, "INVALID_PAYMENT_KEY"),
    committing_reserved_void_units: canonicalUint(input.committing_reserved_void_units, true, "INVALID_RESERVED_UNITS"),
  };
}

export function deriveBuyVoidHistoryCarrierRootV1(
  previous: BuyVoidHistoryCarrierRootV1 | null,
  input: {
    active_1352_durable_root_sha256: string;
    payment_index_root_sha256: string;
    committing_payment_key_sha256: string;
    committing_reserved_void_units: string;
  },
): BuyVoidHistoryCarrierRootV1 {
  const reserved = BigInt(canonicalUint(input.committing_reserved_void_units, true, "INVALID_RESERVED_UNITS"));
  const generation = previous ? previous.carrier_generation + 1 : 1;
  const previousCommitted = previous ? BigInt(previous.committed_void_units) : 0n;
  const previousCount = previous ? BigInt(previous.reservation_count) : 0n;
  const core = rootCore({
    v: 1,
    format: VOID_BUY_VOID_HISTORY_CARRIER_ROOT_V1,
    carrier_generation: generation,
    previous_carrier_root_sha256: previous ? previous.carrier_root_sha256 : null,
    active_1352_durable_root_sha256: input.active_1352_durable_root_sha256,
    payment_index_root_sha256: input.payment_index_root_sha256,
    committed_void_units: (previousCommitted + reserved).toString(),
    reservation_count: (previousCount + 1n).toString(),
    committing_payment_key_sha256: input.committing_payment_key_sha256,
    committing_reserved_void_units: reserved.toString(),
  });
  return { ...core, carrier_root_sha256: sha256Bytes(canonicalJson(core)) };
}

export function verifyBuyVoidHistoryCarrierRootV1(input: BuyVoidHistoryCarrierRootV1): BuyVoidHistoryCarrierRootV1 {
  if (!input || typeof input !== "object") fail("INVALID_CARRIER_ROOT", "not-object");
  exactKeys(input as unknown as Record<string, unknown>, [
    "v", "format", "carrier_generation", "previous_carrier_root_sha256",
    "active_1352_durable_root_sha256", "payment_index_root_sha256", "committed_void_units",
    "reservation_count", "committing_payment_key_sha256", "committing_reserved_void_units",
    "carrier_root_sha256",
  ], "INVALID_CARRIER_ROOT_KEYS");
  const { carrier_root_sha256: digestInput, ...rawCore } = input;
  const core = rootCore(rawCore as Omit<BuyVoidHistoryCarrierRootV1, "carrier_root_sha256">);
  const digest = requireHex64(digestInput, "INVALID_CARRIER_ROOT_DIGEST");
  if (sha256Bytes(canonicalJson(core)) !== digest) fail("CARRIER_ROOT_DIGEST_MISMATCH", digest);
  return { ...core, carrier_root_sha256: digest };
}

export function verifyBuyVoidHistoryCarrierSuccessorV1(
  previous: BuyVoidHistoryCarrierRootV1,
  next: BuyVoidHistoryCarrierRootV1,
): BuyVoidHistoryCarrierRootV1 {
  const before = verifyBuyVoidHistoryCarrierRootV1(previous);
  const after = verifyBuyVoidHistoryCarrierRootV1(next);
  if (after.carrier_generation !== before.carrier_generation + 1) fail("CARRIER_GENERATION_MISMATCH", String(after.carrier_generation));
  if (after.previous_carrier_root_sha256 !== before.carrier_root_sha256) fail("CARRIER_PREDECESSOR_MISMATCH", after.carrier_root_sha256);
  const expectedCommitted = BigInt(before.committed_void_units) + BigInt(after.committing_reserved_void_units);
  if (BigInt(after.committed_void_units) !== expectedCommitted) fail("CARRIER_COMMITTED_UNITS_MISMATCH", after.carrier_root_sha256);
  if (BigInt(after.reservation_count) !== BigInt(before.reservation_count) + 1n) fail("CARRIER_RESERVATION_COUNT_MISMATCH", after.carrier_root_sha256);
  return after;
}

export function deriveBuyVoidHistoryCarrierTxIntentV1(input: {
  predecessor_carrier_root_sha256: string | null;
  committing_payment_key_sha256: string;
  committing_record_locator: BuyVoidHistoryRecordLocatorV1;
  expected_1352_durable_root_sha256: string;
  expected_index_root_sha256: string;
  expected_committed_void_units: string;
  expected_reservation_count: string;
  expected_carrier_root_sha256: string;
  new_page_digests: string[];
}): BuyVoidHistoryCarrierTxIntentV1 {
  const digests = [...input.new_page_digests].map((value) => requireHex64(value, "INVALID_NEW_PAGE_DIGEST")).sort();
  if (digests.length > VOID_BUY_VOID_HISTORY_CARRIER_MAX_PAGE_WRITES_PER_INSERT_V1) fail("TOO_MANY_NEW_PAGES", String(digests.length));
  if (digests.some((value, index) => index > 0 && value === digests[index - 1])) fail("DUPLICATE_NEW_PAGE_DIGEST", "duplicate");
  const core = {
    v: 1 as const,
    format: VOID_BUY_VOID_HISTORY_CARRIER_TX_INTENT_V1 as typeof VOID_BUY_VOID_HISTORY_CARRIER_TX_INTENT_V1,
    predecessor_carrier_root_sha256: input.predecessor_carrier_root_sha256 === null
      ? null
      : requireHex64(input.predecessor_carrier_root_sha256, "INVALID_PREVIOUS_CARRIER_ROOT"),
    committing_payment_key_sha256: requireHex64(input.committing_payment_key_sha256, "INVALID_PAYMENT_KEY"),
    committing_record_locator: normalizedLocator(input.committing_record_locator),
    expected_1352_durable_root_sha256: requireHex64(input.expected_1352_durable_root_sha256, "INVALID_1352_ROOT"),
    expected_index_root_sha256: requireHex64(input.expected_index_root_sha256, "INVALID_INDEX_ROOT"),
    expected_committed_void_units: canonicalUint(input.expected_committed_void_units, true, "INVALID_COMMITTED_UNITS"),
    expected_reservation_count: canonicalUint(input.expected_reservation_count, true, "INVALID_RESERVATION_COUNT"),
    expected_carrier_root_sha256: requireHex64(input.expected_carrier_root_sha256, "INVALID_CARRIER_ROOT_DIGEST"),
    new_page_digests: digests,
  };
  return { ...core, tx_intent_sha256: sha256Bytes(canonicalJson(core)) };
}

export function verifyBuyVoidHistoryCarrierTxIntentV1(input: BuyVoidHistoryCarrierTxIntentV1): BuyVoidHistoryCarrierTxIntentV1 {
  if (!input || typeof input !== "object") fail("INVALID_TX_INTENT", "not-object");
  exactKeys(input as unknown as Record<string, unknown>, [
    "v", "format", "predecessor_carrier_root_sha256", "committing_payment_key_sha256",
    "committing_record_locator", "expected_1352_durable_root_sha256", "expected_index_root_sha256",
    "expected_committed_void_units", "expected_reservation_count", "expected_carrier_root_sha256",
    "new_page_digests", "tx_intent_sha256",
  ], "INVALID_TX_INTENT_KEYS");
  const rebuilt = deriveBuyVoidHistoryCarrierTxIntentV1({
    predecessor_carrier_root_sha256: input.predecessor_carrier_root_sha256,
    committing_payment_key_sha256: input.committing_payment_key_sha256,
    committing_record_locator: input.committing_record_locator,
    expected_1352_durable_root_sha256: input.expected_1352_durable_root_sha256,
    expected_index_root_sha256: input.expected_index_root_sha256,
    expected_committed_void_units: input.expected_committed_void_units,
    expected_reservation_count: input.expected_reservation_count,
    expected_carrier_root_sha256: input.expected_carrier_root_sha256,
    new_page_digests: input.new_page_digests,
  });
  if (rebuilt.tx_intent_sha256 !== input.tx_intent_sha256) fail("TX_INTENT_DIGEST_MISMATCH", String(input.tx_intent_sha256));
  return rebuilt;
}

export function planBuyVoidHistoryCarrierCommitV1(input: {
  previous_carrier_root: BuyVoidHistoryCarrierRootV1 | null;
  current_index_root_sha256: string;
  entry: BuyVoidHistoryIndexEntryV1;
  resulting_1352_durable_root_sha256: string;
  reserved_void_units: string;
  read_page: (sha256: string) => Buffer;
}): BuyVoidHistoryCarrierCommitPlanV1 {
  const entry = normalizedEntry(input.entry);
  const mutation = insertBuyVoidHistoryIndexV1(input.current_index_root_sha256, entry, input.read_page);
  if (mutation.status === "duplicate") {
    return {
      status: "duplicate",
      index_root_sha256: mutation.root_sha256,
      existing_entry: mutation.existing_entry as BuyVoidHistoryIndexEntryV1,
    };
  }
  const previous = input.previous_carrier_root ? verifyBuyVoidHistoryCarrierRootV1(input.previous_carrier_root) : null;
  if (previous && previous.payment_index_root_sha256 !== input.current_index_root_sha256) {
    fail("CARRIER_INDEX_PREDECESSOR_MISMATCH", input.current_index_root_sha256);
  }
  const carrierRoot = deriveBuyVoidHistoryCarrierRootV1(previous, {
    active_1352_durable_root_sha256: input.resulting_1352_durable_root_sha256,
    payment_index_root_sha256: mutation.root_sha256,
    committing_payment_key_sha256: entry.payment_key_sha256,
    committing_reserved_void_units: input.reserved_void_units,
  });
  const txIntent = deriveBuyVoidHistoryCarrierTxIntentV1({
    predecessor_carrier_root_sha256: previous ? previous.carrier_root_sha256 : null,
    committing_payment_key_sha256: entry.payment_key_sha256,
    committing_record_locator: entry.locator,
    expected_1352_durable_root_sha256: carrierRoot.active_1352_durable_root_sha256,
    expected_index_root_sha256: carrierRoot.payment_index_root_sha256,
    expected_committed_void_units: carrierRoot.committed_void_units,
    expected_reservation_count: carrierRoot.reservation_count,
    expected_carrier_root_sha256: carrierRoot.carrier_root_sha256,
    new_page_digests: mutation.new_pages.map((page) => page.sha256),
  });
  return {
    status: "planned",
    index_root_sha256: mutation.root_sha256,
    new_pages: mutation.new_pages,
    carrier_root: carrierRoot,
    tx_intent: txIntent,
  };
}
