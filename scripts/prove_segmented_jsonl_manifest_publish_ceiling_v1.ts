// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025 6ZoSo9

import assert from "node:assert/strict";
import * as crypto from "node:crypto";

import {
  VOID_SEGMENTED_JSONL_MAX_MANIFEST_BYTES_V1,
  serializeSegmentedJsonlManifestV1,
  type SegmentedJsonlManifestV1,
  type SegmentedJsonlSegmentV1,
} from "../src/storage/segmented_jsonl_v1.ts";

const HEX64_ZERO = "0".repeat(64);

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

function makeManifest(segmentCount: number): SegmentedJsonlManifestV1 {
  const segments: SegmentedJsonlSegmentV1[] = Array.from(
    { length: segmentCount },
    (_, id) => ({
      id,
      file: `segments/${String(id).padStart(12, "0")}.jsonl`,
      bytes: 2,
      records: 1,
      first_record_index: id,
      last_record_index: id,
      sha256: HEX64_ZERO,
    }),
  );
  const sealedBytes = segmentCount * 2;
  return {
    v: 1,
    format: "VOID_SEGMENTED_JSONL_V1",
    generation: 1,
    segment_target_bytes: 1024,
    max_record_bytes: 1023,
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

const accepted = makeManifest(31_190);
const rejected = makeManifest(31_191);
const acceptedBytes = rawSerializedBytes(accepted);
const rejectedBytes = rawSerializedBytes(rejected);

assert(acceptedBytes <= VOID_SEGMENTED_JSONL_MAX_MANIFEST_BYTES_V1);
assert(rejectedBytes > VOID_SEGMENTED_JSONL_MAX_MANIFEST_BYTES_V1);

const serializedAccepted = serializeSegmentedJsonlManifestV1(accepted);
assert.equal(serializedAccepted.length, acceptedBytes);
assert(serializedAccepted.length <= VOID_SEGMENTED_JSONL_MAX_MANIFEST_BYTES_V1);

expectVoidError(
  () => serializeSegmentedJsonlManifestV1(rejected),
  "MANIFEST_TOO_LARGE",
);

console.log(`accepted_manifest_bytes=${acceptedBytes}`);
console.log(`rejected_manifest_bytes=${rejectedBytes}`);
console.log(`max_manifest_bytes=${VOID_SEGMENTED_JSONL_MAX_MANIFEST_BYTES_V1}`);
console.log("writer_reader_manifest_ceiling_bound=true");
console.log("VOID_SEGMENTED_JSONL_MANIFEST_PUBLISH_CEILING_V1_PROOF_GREEN");
