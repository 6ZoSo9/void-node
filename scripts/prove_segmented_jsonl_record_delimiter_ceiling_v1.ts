// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025 6ZoSo9

import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import {
  buildSegmentedJsonlV1FromFile,
  sealedSegmentInventoryV1,
} from "../src/storage/segmented_jsonl_v1.ts";

function expectVoidError(fn: () => unknown, code: string): void {
  assert.throws(fn, (error: unknown) => {
    assert(error instanceof Error);
    return error.message.includes(`VOID_SEGMENTED_JSONL_V1:${code}:`);
  });
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "void-segmented-delimiter-v1-"));
try {
  const source = path.join(tmp, "source.jsonl");
  const fullRecord = Buffer.concat([Buffer.alloc(1023, 0x61), Buffer.from("\n")]);
  const tinyRecord = Buffer.from("b\n");
  fs.writeFileSync(source, Buffer.concat([fullRecord, tinyRecord]), { mode: 0o600 });

  const store = path.join(tmp, "store");
  const manifest = buildSegmentedJsonlV1FromFile(source, store, {
    segmentTargetBytes: 1024,
    maxRecordBytes: 1023,
    generation: 1,
    validateJson: false,
  });

  assert.equal(manifest.segment_target_bytes, 1024);
  assert.equal(manifest.max_record_bytes, 1023);
  assert.equal(manifest.sealed_segments.length, 1);
  assert.equal(manifest.sealed_segments[0].bytes, 1024);
  assert.equal(manifest.active.bytes, tinyRecord.length);
  assert(manifest.sealed_segments.every((segment) => segment.bytes <= manifest.segment_target_bytes));
  assert(manifest.active.bytes <= manifest.segment_target_bytes);

  const rejectedDestination = path.join(tmp, "rejected-config");
  expectVoidError(
    () =>
      buildSegmentedJsonlV1FromFile(source, rejectedDestination, {
        segmentTargetBytes: 1024,
        maxRecordBytes: 1024,
        generation: 1,
        validateJson: false,
      }),
    "INVALID_MAX_RECORD",
  );
  assert.equal(fs.existsSync(rejectedDestination), false);

  const oversizedSealed = structuredClone(manifest);
  oversizedSealed.sealed_segments[0].bytes = 1025;
  expectVoidError(() => sealedSegmentInventoryV1(oversizedSealed), "INVALID_SEGMENT_RANGE");

  const oversizedActive = structuredClone(manifest);
  oversizedActive.active.bytes = 1025;
  expectVoidError(() => sealedSegmentInventoryV1(oversizedActive), "INVALID_ACTIVE_RANGE");

  console.log("delimiter_inclusive_record_ceiling=true");
  console.log("manifest_segment_byte_ceiling=true");
  console.log("VOID_SEGMENTED_JSONL_RECORD_DELIMITER_CEILING_V1_PROOF_GREEN");
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
