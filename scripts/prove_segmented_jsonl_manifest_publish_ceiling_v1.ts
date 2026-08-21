// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025 6ZoSo9

import assert from "node:assert/strict";
import * as crypto from "node:crypto";

import {
  VOID_SEGMENTED_JSONL_MAX_MANIFEST_BYTES_V1,
  VOID_SEGMENTED_JSONL_MAX_SEALED_SEGMENTS_V1,
  planSegmentReplicationV1,
  sealedSegmentInventoryV1,
  serializeSegmentedJsonlManifestV1,
  type SegmentedJsonlManifestV1,
  type SegmentedJsonlSegmentV1,
  type SegmentInventoryV1,
} from "../src/storage/segmented_jsonl_v1.ts";

const HEX64_ZERO = "0".repeat(64);
const SEGMENT_BYTES = 1024;

function sealedRoot(segments: SegmentedJsonlSegmentV1[]): string {
  return crypto
    .createHash("sha256")
    .update(
      JSON.stringify(
        segments.map((segment) => ({
          id: segment.id,
          bytes: segment.bytes,
          records: segment.records,
          first_record_index: segment.first_record_index,
          last_record_index: segment.last_record_index,
          sha256: segment.sha256,
        })),
      ),
    )
    .digest("hex");
}

function makeManifest(
  segmentCount: number,
  segmentBytes = SEGMENT_BYTES,
  segmentTargetBytes = Math.max(SEGMENT_BYTES, segmentBytes),
): SegmentedJsonlManifestV1 {
  const segments: SegmentedJsonlSegmentV1[] = Array.from(
    { length: segmentCount },
    (_, id) => ({
      id,
      file: `segments/${String(id).padStart(12, "0")}.jsonl`,
      bytes: segmentBytes,
      records: 1,
      first_record_index: id,
      last_record_index: id,
      sha256: HEX64_ZERO,
    }),
  );
  const sealedBytes = segmentCount * segmentBytes;
  return {
    v: 1,
    format: "VOID_SEGMENTED_JSONL_V1",
    generation: 1,
    segment_target_bytes: segmentTargetBytes,
    max_record_bytes: Math.min(SEGMENT_BYTES - 1, segmentTargetBytes - 1),
    total_bytes: sealedBytes,
    total_records: segmentCount,
    sealed_bytes: sealedBytes,
    sealed_records: segmentCount,
    sealed_root_sha256: sealedRoot(segments),
    sealed_segments: segments,
    active: {
      file: "active.jsonl",
      bytes: 0,
      records: 0,
      first_record_index: segmentCount,
      last_record_index: null,
      sha256: HEX64_ZERO,
    },
  };
}

function rawSerializedBytes(manifest: SegmentedJsonlManifestV1): number {
  return Buffer.byteLength(`${JSON.stringify(manifest, null, 2)}\n`, "utf8");
}

function expectVoidError(fn: () => unknown, code: string): void {
  assert.throws(fn, (error: unknown) => {
    assert(error instanceof Error);
    return error.message.includes(`VOID_SEGMENTED_JSONL_V1:${code}:`);
  });
}

assert.equal(VOID_SEGMENTED_JSONL_MAX_SEALED_SEGMENTS_V1, 31_190);

const accepted = makeManifest(VOID_SEGMENTED_JSONL_MAX_SEALED_SEGMENTS_V1);
const tooMany = makeManifest(VOID_SEGMENTED_JSONL_MAX_SEALED_SEGMENTS_V1 + 1);
const oversizedWithinCount = makeManifest(
  VOID_SEGMENTED_JSONL_MAX_SEALED_SEGMENTS_V1,
  8 * 1024 * 1024,
  8 * 1024 * 1024,
);
const acceptedBytes = rawSerializedBytes(accepted);
const tooManyBytes = rawSerializedBytes(tooMany);
const oversizedWithinCountBytes = rawSerializedBytes(oversizedWithinCount);

assert(acceptedBytes <= VOID_SEGMENTED_JSONL_MAX_MANIFEST_BYTES_V1);
assert(tooManyBytes > VOID_SEGMENTED_JSONL_MAX_MANIFEST_BYTES_V1);
assert(oversizedWithinCountBytes > VOID_SEGMENTED_JSONL_MAX_MANIFEST_BYTES_V1);

const serializedAccepted = serializeSegmentedJsonlManifestV1(accepted);
assert.equal(serializedAccepted.length, acceptedBytes);
assert(serializedAccepted.length <= VOID_SEGMENTED_JSONL_MAX_MANIFEST_BYTES_V1);

expectVoidError(
  () => serializeSegmentedJsonlManifestV1(tooMany),
  "MANIFEST_SEGMENT_COUNT_EXCEEDS_BOUND",
);
expectVoidError(
  () => serializeSegmentedJsonlManifestV1(oversizedWithinCount),
  "MANIFEST_TOO_LARGE",
);

const acceptedInventory = sealedSegmentInventoryV1(accepted);
assert.equal(acceptedInventory.length, VOID_SEGMENTED_JSONL_MAX_SEALED_SEGMENTS_V1);
const acceptedPlan = planSegmentReplicationV1(accepted, []);
assert.equal(acceptedPlan.missing.length, VOID_SEGMENTED_JSONL_MAX_SEALED_SEGMENTS_V1);
assert.equal(acceptedPlan.matching.length, 0);
assert.equal(acceptedPlan.conflicting.length, 0);

expectVoidError(
  () => sealedSegmentInventoryV1(tooMany),
  "MANIFEST_SEGMENT_COUNT_EXCEEDS_BOUND",
);
expectVoidError(
  () => planSegmentReplicationV1(tooMany, []),
  "MANIFEST_SEGMENT_COUNT_EXCEEDS_BOUND",
);
expectVoidError(
  () => sealedSegmentInventoryV1(oversizedWithinCount),
  "MANIFEST_TOO_LARGE",
);
expectVoidError(
  () => planSegmentReplicationV1(oversizedWithinCount, []),
  "MANIFEST_TOO_LARGE",
);

const excessiveLocalInventory: SegmentInventoryV1[] = Array.from(
  { length: VOID_SEGMENTED_JSONL_MAX_SEALED_SEGMENTS_V1 + 1 },
  (_, id) => ({ id, bytes: 1, records: 1, sha256: HEX64_ZERO }),
);
expectVoidError(
  () => planSegmentReplicationV1(accepted, excessiveLocalInventory),
  "LOCAL_INVENTORY_TOO_LARGE",
);

console.log(`accepted_manifest_bytes=${acceptedBytes}`);
console.log(`too_many_manifest_bytes=${tooManyBytes}`);
console.log(`oversized_within_count_bytes=${oversizedWithinCountBytes}`);
console.log(`max_manifest_bytes=${VOID_SEGMENTED_JSONL_MAX_MANIFEST_BYTES_V1}`);
console.log(`max_sealed_segments=${VOID_SEGMENTED_JSONL_MAX_SEALED_SEGMENTS_V1}`);
console.log("writer_reader_manifest_ceiling_bound=true");
console.log("direct_object_manifest_ceiling_bound=true");
console.log("local_inventory_count_bound=true");
console.log("VOID_SEGMENTED_JSONL_MANIFEST_PUBLISH_CEILING_V1_PROOF_GREEN");
