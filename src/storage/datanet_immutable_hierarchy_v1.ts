// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025 6ZoSo9

import * as crypto from "node:crypto";

export const VOID_DATANET_IMMUTABLE_LEAF_V1 = "VOID_DATANET_IMMUTABLE_LEAF_V1";
export const VOID_DATANET_HIERARCHY_MANIFEST_V1 = "VOID_DATANET_HIERARCHY_MANIFEST_V1";
export const VOID_DATANET_HIERARCHY_DEFAULT_SEGMENT_BYTES_V1 = 8 * 1024 * 1024;
export const VOID_DATANET_HIERARCHY_DEFAULT_LEAF_MAX_SEGMENTS_V1 = 31_190;
export const VOID_DATANET_HIERARCHY_DEFAULT_OBJECT_MAX_SEGMENTS_V1 = 131_072;
export const VOID_DATANET_HIERARCHY_MAX_LEAVES_V1 = 5;
export const VOID_DATANET_HIERARCHY_MAX_MANIFEST_BYTES_V1 = 8 * 1024 * 1024;

const U64_MAX = (1n << 64n) - 1n;
const SEGMENT_BYTES_TAG = "VOID-DATANET-SEGMENT-BYTES-V1";
const SEGMENT_ROWS_TAG = "VOID-DATANET-SEGMENT-ROWS-V1";
const LEAF_MANIFEST_TAG = "VOID-DATANET-LEAF-MANIFEST-V1";
const ORDERED_LEAVES_TAG = "VOID-DATANET-ORDERED-LEAVES-V1";
const TOP_MANIFEST_TAG = "VOID-DATANET-TOP-MANIFEST-V1";

export type DatanetHierarchySegmentRowV1 = {
  index: number;
  byte_length: number;
  sha256: string;
  byte_digest: string;
};

export type DatanetImmutableLeafV1 = {
  schema: typeof VOID_DATANET_IMMUTABLE_LEAF_V1;
  object_id: string;
  generation: string;
  ordinal: number;
  first_segment: number;
  first_byte_offset: number;
  segment_size: number;
  segment_count: number;
  byte_length: number;
  segments: DatanetHierarchySegmentRowV1[];
  segment_hashes_root: string;
  segment_rows_root: string;
};

export type DatanetHierarchyTopLeafRowV1 = {
  ordinal: number;
  first_segment: number;
  segment_count: number;
  first_byte_offset: number;
  byte_length: number;
  manifest_sha256: string;
  manifest_digest: string;
  segment_hashes_root: string;
};

export type DatanetHierarchyManifestV1 = {
  schema: typeof VOID_DATANET_HIERARCHY_MANIFEST_V1;
  object_id: string;
  generation: string;
  media_type: string;
  payload_length: number;
  segment_size: number;
  segment_count: number;
  payload_sha256: string;
  segment_hashes_root: string;
  leaf_count: number;
  ordered_leaf_manifest_root: string;
  leaves: DatanetHierarchyTopLeafRowV1[];
};

export type DatanetHierarchyLeafFileV1 = {
  manifest: DatanetImmutableLeafV1;
  bytes: Buffer;
  manifest_sha256: string;
  manifest_digest: string;
};

export type DatanetHierarchyStructureV1 = {
  leaves: DatanetHierarchyLeafFileV1[];
  top: DatanetHierarchyManifestV1;
  top_bytes: Buffer;
  manifest_sha256: string;
  composition_root: string;
};

export type BuildDatanetHierarchyStructureInputV1 = {
  object_id: string;
  generation: string;
  media_type: string;
  payload_length: number;
  payload_sha256: string;
  segments: DatanetHierarchySegmentRowV1[];
  segment_size?: number;
  leaf_max_segments?: number;
  max_object_segments?: number;
};

function fail(code: string, detail: string): never {
  throw new Error(`VOID_DATANET_HIERARCHY_V1:${code}:${detail}`);
}

function sha256Bytes(data: Buffer): Buffer {
  return crypto.createHash("sha256").update(data).digest();
}

function sha256Hex(data: Buffer): string {
  return sha256Bytes(data).toString("hex");
}

function assertSafeInteger(value: unknown, minimum: number, maximum: number, code: string): number {
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value < minimum ||
    value > maximum
  ) {
    fail(code, String(value));
  }
  return value;
}

function assertHex64(value: unknown, code: string): string {
  if (typeof value !== "string" || !/^[0-9a-f]{64}$/.test(value)) fail(code, String(value));
  return value;
}

function assertNoLoneSurrogates(value: string, code: string): void {
  for (let i = 0; i < value.length; i++) {
    const unit = value.charCodeAt(i);
    if (unit >= 0xd800 && unit <= 0xdbff) {
      const next = value.charCodeAt(i + 1);
      if (!(next >= 0xdc00 && next <= 0xdfff)) fail(code, `index=${i}`);
      i += 1;
      continue;
    }
    if (unit >= 0xdc00 && unit <= 0xdfff) fail(code, `index=${i}`);
  }
}

function assertObjectId(value: unknown): string {
  if (typeof value !== "string") fail("OBJECT_ID", String(value));
  assertNoLoneSurrogates(value, "OBJECT_ID_UNICODE");
  if (value.normalize("NFC") !== value) fail("OBJECT_ID_NFC", value);
  const bytes = Buffer.byteLength(value, "utf8");
  if (bytes < 1 || bytes > 128) fail("OBJECT_ID_BYTES", String(bytes));
  return value;
}

function assertGeneration(value: unknown): string {
  if (typeof value !== "string" || !/^(0|[1-9][0-9]*)$/.test(value)) fail("GENERATION", String(value));
  let parsed: bigint;
  try {
    parsed = BigInt(value);
  } catch {
    fail("GENERATION", value);
  }
  if (parsed < 0n || parsed > U64_MAX) fail("GENERATION_RANGE", value);
  return value;
}

function assertMediaType(value: unknown): string {
  if (typeof value !== "string") fail("MEDIA_TYPE", String(value));
  assertNoLoneSurrogates(value, "MEDIA_TYPE_UNICODE");
  const bytes = Buffer.byteLength(value, "utf8");
  if (bytes < 1 || bytes > 256 || /[\u0000-\u001f\u007f]/.test(value)) fail("MEDIA_TYPE", value);
  return value;
}

function u32be(value: number, code: string): Buffer {
  assertSafeInteger(value, 0, 0xffff_ffff, code);
  const out = Buffer.allocUnsafe(4);
  out.writeUInt32BE(value, 0);
  return out;
}

function u64be(value: bigint): Buffer {
  if (value < 0n || value > U64_MAX) fail("U64_RANGE", value.toString());
  const out = Buffer.allocUnsafe(8);
  out.writeBigUInt64BE(value, 0);
  return out;
}

function canonicalStringV1(value: string): string {
  assertNoLoneSurrogates(value, "CANONICAL_JSON_UNICODE");
  const encoded = JSON.stringify(value);
  if (typeof encoded !== "string") fail("CANONICAL_JSON_STRING", "unencodable");
  return encoded;
}

function canonicalJsonV1(value: unknown): string {
  if (value === null) return "null";
  if (typeof value === "string") return canonicalStringV1(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") {
    if (!Number.isFinite(value) || !Number.isSafeInteger(value)) fail("CANONICAL_JSON_NUMBER", String(value));
    const encoded = JSON.stringify(value);
    if (typeof encoded !== "string") fail("CANONICAL_JSON_NUMBER", "unencodable");
    return encoded;
  }
  if (Array.isArray(value)) return `[${value.map((entry) => canonicalJsonV1(entry)).join(",")}]`;
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    const proto = Object.getPrototypeOf(record);
    if (proto !== Object.prototype && proto !== null) fail("CANONICAL_JSON_OBJECT", "non-plain-object");
    const keys = Object.keys(record).sort();
    return `{${keys.map((key) => `${canonicalStringV1(key)}:${canonicalJsonV1(record[key])}`).join(",")}}`;
  }
  fail("CANONICAL_JSON_TYPE", typeof value);
}

export function canonicalJsonFileV1(value: unknown): Buffer {
  return Buffer.from(`${canonicalJsonV1(value)}\n`, "utf8");
}

function taggedDigestV1(tag: string, data: Buffer): string {
  if (!/^[\x20-\x7e]+$/.test(tag)) fail("TAG_ASCII", tag);
  return sha256Hex(Buffer.concat([Buffer.from(tag, "ascii"), Buffer.from([0]), u64be(BigInt(data.length)), data]));
}

function orderedRowsDigestV1(tag: string, rows: readonly unknown[]): string {
  const encoded = rows.map((row) => canonicalJsonFileV1(row));
  if (encoded.length > 0xffff_ffff) fail("ORDERED_ROWS_COUNT", String(encoded.length));
  const parts: Buffer[] = [u32be(encoded.length, "ORDERED_ROWS_COUNT")];
  for (const row of encoded) {
    if (row.length > 0xffff_ffff) fail("ORDERED_ROW_BYTES", String(row.length));
    parts.push(u32be(row.length, "ORDERED_ROW_BYTES"), row);
  }
  return taggedDigestV1(tag, Buffer.concat(parts));
}

function segmentLeafHashV1(row: DatanetHierarchySegmentRowV1): Buffer {
  return sha256Bytes(
    Buffer.concat([
      Buffer.from([0]),
      u32be(row.index, "SEGMENT_INDEX_U32"),
      u32be(row.byte_length, "SEGMENT_LENGTH_U32"),
      Buffer.from(row.sha256, "hex"),
    ]),
  );
}

function segmentMissingHashV1(index: number): Buffer {
  return sha256Bytes(Buffer.concat([Buffer.from([2]), u32be(index, "SEGMENT_INDEX_U32")]));
}

function segmentParentHashV1(left: Buffer, right: Buffer): Buffer {
  return sha256Bytes(Buffer.concat([Buffer.from([1]), left, right]));
}

export function segmentHashesRootV1(rows: readonly DatanetHierarchySegmentRowV1[], startIndex = 0): string {
  assertSafeInteger(startIndex, 0, 0xffff_ffff, "SEGMENT_START_INDEX");
  let width = 1;
  while (width < rows.length) width *= 2;
  const level: Buffer[] = [];
  for (let local = 0; local < width; local++) {
    const globalIndex = startIndex + local;
    if (!Number.isSafeInteger(globalIndex) || globalIndex > 0xffff_ffff) fail("SEGMENT_INDEX_U32", String(globalIndex));
    if (local < rows.length) {
      const row = rows[local];
      if (row.index !== globalIndex) fail("SEGMENT_INDEX_ORDER", `${row.index}!=${globalIndex}`);
      level.push(segmentLeafHashV1(row));
    } else {
      level.push(segmentMissingHashV1(globalIndex));
    }
  }
  let current = level;
  while (current.length > 1) {
    const next: Buffer[] = [];
    for (let i = 0; i < current.length; i += 2) next.push(segmentParentHashV1(current[i], current[i + 1]));
    current = next;
  }
  return current[0].toString("hex");
}

function validateSegmentRowV1(
  row: unknown,
  expectedIndex: number,
  expectedLength: number,
): DatanetHierarchySegmentRowV1 {
  if (row === null || typeof row !== "object" || Array.isArray(row)) fail("SEGMENT_ROW", String(row));
  const record = row as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  const expectedKeys = ["byte_digest", "byte_length", "index", "sha256"];
  if (keys.length !== expectedKeys.length || keys.some((key, index) => key !== expectedKeys[index])) {
    fail("SEGMENT_ROW_KEYS", keys.join(","));
  }
  const index = assertSafeInteger(record.index, 0, 0xffff_ffff, "SEGMENT_INDEX");
  const byteLength = assertSafeInteger(record.byte_length, 1, VOID_DATANET_HIERARCHY_DEFAULT_SEGMENT_BYTES_V1, "SEGMENT_BYTE_LENGTH");
  if (index !== expectedIndex) fail("SEGMENT_INDEX_ORDER", `${index}!=${expectedIndex}`);
  if (byteLength !== expectedLength) fail("SEGMENT_BYTE_LENGTH", `${byteLength}!=${expectedLength}`);
  return {
    index,
    byte_length: byteLength,
    sha256: assertHex64(record.sha256, "SEGMENT_SHA256"),
    byte_digest: assertHex64(record.byte_digest, "SEGMENT_BYTE_DIGEST"),
  };
}

export function segmentRowFromBytesV1(index: number, data: Buffer): DatanetHierarchySegmentRowV1 {
  assertSafeInteger(index, 0, 0xffff_ffff, "SEGMENT_INDEX");
  if (!Buffer.isBuffer(data) || data.length < 1 || data.length > VOID_DATANET_HIERARCHY_DEFAULT_SEGMENT_BYTES_V1) {
    fail("SEGMENT_BYTES", Buffer.isBuffer(data) ? String(data.length) : typeof data);
  }
  return {
    index,
    byte_length: data.length,
    sha256: sha256Hex(data),
    byte_digest: taggedDigestV1(SEGMENT_BYTES_TAG, data),
  };
}

function checkedProduct(a: number, b: number, code: string): number {
  const product = a * b;
  if (!Number.isSafeInteger(product)) fail(code, `${a}*${b}`);
  return product;
}

function partitionCountsV1(segmentCount: number, leafMaxSegments: number): number[] {
  if (segmentCount === 0) return [];
  const out: number[] = [];
  let remaining = segmentCount;
  while (remaining > 0) {
    const count = Math.min(leafMaxSegments, remaining);
    out.push(count);
    remaining -= count;
  }
  return out;
}

export function buildDatanetHierarchyStructureV1(input: BuildDatanetHierarchyStructureInputV1): DatanetHierarchyStructureV1 {
  if (input === null || typeof input !== "object" || Array.isArray(input)) fail("INPUT", String(input));
  const record = input as unknown as Record<string, unknown>;
  const allowed = new Set([
    "object_id",
    "generation",
    "media_type",
    "payload_length",
    "payload_sha256",
    "segments",
    "segment_size",
    "leaf_max_segments",
    "max_object_segments",
  ]);
  for (const key of Object.keys(record)) if (!allowed.has(key)) fail("INPUT_KEY", key);

  const objectId = assertObjectId(record.object_id);
  const generation = assertGeneration(record.generation);
  const mediaType = assertMediaType(record.media_type);
  const segmentSize = assertSafeInteger(
    record.segment_size ?? VOID_DATANET_HIERARCHY_DEFAULT_SEGMENT_BYTES_V1,
    1,
    VOID_DATANET_HIERARCHY_DEFAULT_SEGMENT_BYTES_V1,
    "SEGMENT_SIZE",
  );
  const leafMaxSegments = assertSafeInteger(
    record.leaf_max_segments ?? VOID_DATANET_HIERARCHY_DEFAULT_LEAF_MAX_SEGMENTS_V1,
    1,
    VOID_DATANET_HIERARCHY_DEFAULT_LEAF_MAX_SEGMENTS_V1,
    "LEAF_MAX_SEGMENTS",
  );
  const maxObjectSegments = assertSafeInteger(
    record.max_object_segments ?? VOID_DATANET_HIERARCHY_DEFAULT_OBJECT_MAX_SEGMENTS_V1,
    1,
    VOID_DATANET_HIERARCHY_DEFAULT_OBJECT_MAX_SEGMENTS_V1,
    "OBJECT_MAX_SEGMENTS",
  );
  if (Math.ceil(maxObjectSegments / leafMaxSegments) > VOID_DATANET_HIERARCHY_MAX_LEAVES_V1) {
    fail("PARAMETER_LEAF_COUNT", `${maxObjectSegments}/${leafMaxSegments}`);
  }
  const maxPayloadLength = checkedProduct(segmentSize, maxObjectSegments, "MAX_PAYLOAD_LENGTH");
  const payloadLength = assertSafeInteger(record.payload_length, 0, maxPayloadLength, "PAYLOAD_LENGTH");
  const payloadSha256 = assertHex64(record.payload_sha256, "PAYLOAD_SHA256");
  if (!Array.isArray(record.segments)) fail("SEGMENTS", typeof record.segments);

  const segmentCount = payloadLength === 0 ? 0 : Math.ceil(payloadLength / segmentSize);
  if (segmentCount > maxObjectSegments) fail("OBJECT_SEGMENT_CAP", String(segmentCount));
  if (record.segments.length !== segmentCount) fail("SEGMENT_COUNT", `${record.segments.length}!=${segmentCount}`);

  const segments: DatanetHierarchySegmentRowV1[] = [];
  for (let index = 0; index < segmentCount; index++) {
    const expectedLength = index === segmentCount - 1
      ? payloadLength - checkedProduct(segmentSize, segmentCount - 1, "FINAL_SEGMENT_OFFSET")
      : segmentSize;
    segments.push(validateSegmentRowV1(record.segments[index], index, expectedLength));
  }

  const counts = partitionCountsV1(segmentCount, leafMaxSegments);
  if (counts.length > VOID_DATANET_HIERARCHY_MAX_LEAVES_V1) fail("LEAF_COUNT", String(counts.length));
  const leaves: DatanetHierarchyLeafFileV1[] = [];
  let firstSegment = 0;
  for (let ordinal = 0; ordinal < counts.length; ordinal++) {
    const count = counts[ordinal];
    const leafSegments = segments.slice(firstSegment, firstSegment + count);
    const byteLength = leafSegments.reduce((sum, row) => sum + row.byte_length, 0);
    if (!Number.isSafeInteger(byteLength)) fail("LEAF_BYTE_LENGTH", String(byteLength));
    const leaf: DatanetImmutableLeafV1 = {
      schema: VOID_DATANET_IMMUTABLE_LEAF_V1,
      object_id: objectId,
      generation,
      ordinal,
      first_segment: firstSegment,
      first_byte_offset: checkedProduct(firstSegment, segmentSize, "LEAF_FIRST_BYTE_OFFSET"),
      segment_size: segmentSize,
      segment_count: count,
      byte_length: byteLength,
      segments: leafSegments.map((row) => ({ ...row })),
      segment_hashes_root: segmentHashesRootV1(leafSegments, firstSegment),
      segment_rows_root: orderedRowsDigestV1(SEGMENT_ROWS_TAG, leafSegments),
    };
    const bytes = canonicalJsonFileV1(leaf);
    if (bytes.length > VOID_DATANET_HIERARCHY_MAX_MANIFEST_BYTES_V1) fail("LEAF_MANIFEST_BYTES", String(bytes.length));
    leaves.push({
      manifest: leaf,
      bytes,
      manifest_sha256: sha256Hex(bytes),
      manifest_digest: taggedDigestV1(LEAF_MANIFEST_TAG, bytes),
    });
    firstSegment += count;
  }
  if (firstSegment !== segmentCount) fail("PARTITION", `${firstSegment}!=${segmentCount}`);

  const topLeaves: DatanetHierarchyTopLeafRowV1[] = leaves.map((leafFile) => ({
    ordinal: leafFile.manifest.ordinal,
    first_segment: leafFile.manifest.first_segment,
    segment_count: leafFile.manifest.segment_count,
    first_byte_offset: leafFile.manifest.first_byte_offset,
    byte_length: leafFile.manifest.byte_length,
    manifest_sha256: leafFile.manifest_sha256,
    manifest_digest: leafFile.manifest_digest,
    segment_hashes_root: leafFile.manifest.segment_hashes_root,
  }));

  const top: DatanetHierarchyManifestV1 = {
    schema: VOID_DATANET_HIERARCHY_MANIFEST_V1,
    object_id: objectId,
    generation,
    media_type: mediaType,
    payload_length: payloadLength,
    segment_size: segmentSize,
    segment_count: segmentCount,
    payload_sha256: payloadSha256,
    segment_hashes_root: segmentHashesRootV1(segments, 0),
    leaf_count: topLeaves.length,
    ordered_leaf_manifest_root: orderedRowsDigestV1(ORDERED_LEAVES_TAG, topLeaves),
    leaves: topLeaves,
  };
  const topBytes = canonicalJsonFileV1(top);
  if (topBytes.length > VOID_DATANET_HIERARCHY_MAX_MANIFEST_BYTES_V1) fail("TOP_MANIFEST_BYTES", String(topBytes.length));

  return {
    leaves,
    top,
    top_bytes: topBytes,
    manifest_sha256: sha256Hex(topBytes),
    composition_root: taggedDigestV1(TOP_MANIFEST_TAG, topBytes),
  };
}
