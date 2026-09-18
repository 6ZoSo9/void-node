// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025 6ZoSo9

import assert from "node:assert/strict";
import * as crypto from "node:crypto";

import {
  VOID_SEGMENTED_JSONL_CHECKPOINT_V1,
  VOID_SEGMENTED_JSONL_MAX_CHECKPOINT_BYTES_V1,
  VOID_SEGMENTED_JSONL_MAX_CHECKPOINT_DECIMAL_DIGITS_V1,
  verifySegmentedJsonlCheckpointEncodingV1,
  type SegmentedJsonlCheckpointV1,
} from "../src/storage/segmented_jsonl_snapshot_authority_v1.js";

function sha256(data: Buffer | string): string {
  return crypto.createHash("sha256").update(data).digest("hex");
}

function core(checkpoint: SegmentedJsonlCheckpointV1) {
  return {
    v: checkpoint.v,
    format: checkpoint.format,
    checkpoint_index: checkpoint.checkpoint_index,
    previous_checkpoint_sha256: checkpoint.previous_checkpoint_sha256,
    snapshot_sha256: checkpoint.snapshot_sha256,
    manifest_sha256: checkpoint.manifest_sha256,
    store_generation: checkpoint.store_generation,
    store_total_bytes: checkpoint.store_total_bytes,
    store_total_records: checkpoint.store_total_records,
    cumulative_bytes: checkpoint.cumulative_bytes,
    cumulative_records: checkpoint.cumulative_records,
  };
}

function resign(checkpoint: SegmentedJsonlCheckpointV1): SegmentedJsonlCheckpointV1 {
  return {
    ...checkpoint,
    checkpoint_sha256: sha256(JSON.stringify(core(checkpoint))),
  };
}

function expectFailure(action: () => unknown, fragment: string): void {
  let seen = "";
  try {
    action();
  } catch (error) {
    seen = error instanceof Error ? error.message : String(error);
  }
  assert.ok(seen.includes(fragment), `expected ${fragment}, got ${seen}`);
}

const base: SegmentedJsonlCheckpointV1 = {
  v: 1,
  format: VOID_SEGMENTED_JSONL_CHECKPOINT_V1,
  checkpoint_index: 0,
  previous_checkpoint_sha256: null,
  snapshot_sha256: "0".repeat(64),
  manifest_sha256: "1".repeat(64),
  store_generation: 1,
  store_total_bytes: 0,
  store_total_records: 0,
  cumulative_bytes: "0",
  cumulative_records: "0",
  checkpoint_sha256: "0".repeat(64),
};

assert.equal(VOID_SEGMENTED_JSONL_MAX_CHECKPOINT_DECIMAL_DIGITS_V1, 1656);

const exactBoundary = resign({
  ...base,
  cumulative_bytes: "9".repeat(VOID_SEGMENTED_JSONL_MAX_CHECKPOINT_DECIMAL_DIGITS_V1),
});
assert.equal(
  Buffer.byteLength(JSON.stringify(core(exactBoundary)), "utf8"),
  VOID_SEGMENTED_JSONL_MAX_CHECKPOINT_BYTES_V1,
);
verifySegmentedJsonlCheckpointEncodingV1(exactBoundary);

const oneDigitOver = {
  ...base,
  cumulative_bytes: "9".repeat(VOID_SEGMENTED_JSONL_MAX_CHECKPOINT_DECIMAL_DIGITS_V1 + 1),
};
expectFailure(
  () => verifySegmentedJsonlCheckpointEncodingV1(oneDigitOver),
  "CHECKPOINT_DECIMAL_TOO_LARGE",
);

const hostileDigits = "9".repeat(4 * 1024 * 1024);
expectFailure(
  () => verifySegmentedJsonlCheckpointEncodingV1({ ...base, cumulative_bytes: hostileDigits }),
  "CHECKPOINT_DECIMAL_TOO_LARGE",
);
expectFailure(
  () => verifySegmentedJsonlCheckpointEncodingV1({ ...base, cumulative_records: hostileDigits }),
  "CHECKPOINT_DECIMAL_TOO_LARGE",
);

expectFailure(
  () => verifySegmentedJsonlCheckpointEncodingV1({ ...base, cumulative_bytes: "01" }),
  "INVALID_CHECKPOINT_DECIMAL",
);

console.log(`checkpoint_max_bytes=${VOID_SEGMENTED_JSONL_MAX_CHECKPOINT_BYTES_V1}`);
console.log(`checkpoint_decimal_max_digits=${VOID_SEGMENTED_JSONL_MAX_CHECKPOINT_DECIMAL_DIGITS_V1}`);
console.log("checkpoint_exact_admission_boundary_green=true");
console.log("checkpoint_multimegabyte_decimal_rejected_preparse=true");
console.log("VOID_SEGMENTED_JSONL_CHECKPOINT_ADMISSION_BOUND_V1_PROOF_GREEN");
