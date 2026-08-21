// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025 6ZoSo9

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";

const TARGET_BYTES = 8 * 1024 * 1024;
const RECORD_BYTES = 2;
const EXPECTED_RECORDS = TARGET_BYTES / RECORD_BYTES;
const HEAP_LIMIT_MIB = 64;

const childSource = String.raw`
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { buildSegmentedJsonlV1FromFile } from "./src/storage/segmented_jsonl_v1.ts";

const targetBytes = ${TARGET_BYTES};
const expectedRecords = ${EXPECTED_RECORDS};
const root = fs.mkdtempSync(path.join(os.tmpdir(), "void-segmented-jsonl-record-vector-v1-"));
fs.chmodSync(root, 0o700);
const source = path.join(root, "source.jsonl");
const destination = path.join(root, "store");
const fd = fs.openSync(source, "wx", 0o600);
try {
  const chunk = Buffer.alloc(64 * 1024);
  for (let i = 0; i < chunk.length; i += 2) {
    chunk[i] = 0x30;
    chunk[i + 1] = 0x0a;
  }
  let written = 0;
  while (written < targetBytes) {
    const length = Math.min(chunk.length, targetBytes - written);
    let offset = 0;
    while (offset < length) {
      const n = fs.writeSync(fd, chunk, offset, length - offset, null);
      if (n <= 0) throw new Error("source_short_write");
      offset += n;
    }
    written += length;
  }
  fs.fsyncSync(fd);
} finally {
  fs.closeSync(fd);
}

const manifest = buildSegmentedJsonlV1FromFile(source, destination, {
  segmentTargetBytes: targetBytes,
  maxRecordBytes: 1,
  validateJson: false,
});
assert.equal(manifest.sealed_segments.length, 0);
assert.equal(manifest.active.bytes, targetBytes);
assert.equal(manifest.active.records, expectedRecords);
assert.equal(manifest.total_bytes, targetBytes);
assert.equal(manifest.total_records, expectedRecords);
console.log("record_vector_target_bytes=" + targetBytes);
console.log("record_vector_records=" + expectedRecords);
console.log("record_vector_builder_completed=true");
`;

const result = spawnSync(
  process.execPath,
  [
    `--max-old-space-size=${HEAP_LIMIT_MIB}`,
    "--experimental-strip-types",
    "--input-type=module",
    "--eval",
    childSource,
  ],
  {
    cwd: process.cwd(),
    encoding: "utf8",
    timeout: 180_000,
    maxBuffer: 1024 * 1024,
  },
);

assert.equal(result.error, undefined, result.error?.message);
assert.equal(result.signal, null, `child_signal=${String(result.signal)}\nstderr=${result.stderr}`);
assert.equal(result.status, 0, `child_status=${String(result.status)}\nstdout=${result.stdout}\nstderr=${result.stderr}`);
assert.match(result.stdout, /record_vector_builder_completed=true/);
assert.match(result.stdout, new RegExp(`record_vector_records=${EXPECTED_RECORDS}`));
console.log(`heap_limit_mib=${HEAP_LIMIT_MIB}`);
console.log(`max_segment_records_exercised=${EXPECTED_RECORDS}`);
console.log("record_vector_cardinality_heap_bounded=true");
console.log("VOID_SEGMENTED_JSONL_RECORD_VECTOR_HEAP_V1_PROOF_GREEN");
