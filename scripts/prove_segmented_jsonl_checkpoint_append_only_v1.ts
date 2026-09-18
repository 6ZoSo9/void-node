// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025 6ZoSo9

import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import {
  buildSegmentedJsonlV1FromFile,
  reconstructSegmentedJsonlV1ToFile,
} from "../src/storage/segmented_jsonl_v1.js";
import {
  deriveSegmentedJsonlCheckpointV1,
  deriveSegmentedJsonlSnapshotAuthorityV1,
  verifySegmentedJsonlCheckpointAnchorV1,
} from "../src/storage/segmented_jsonl_snapshot_authority_v1.js";
import {
  deriveSegmentedJsonlMaterializedAuthorityV1,
} from "../src/storage/segmented_jsonl_materialized_authority_v1.js";
import {
  verifySegmentedJsonlCheckpointAppendOnlyAtUseV1,
} from "../src/storage/segmented_jsonl_checkpoint_materialized_authority_v1.js";

function expectFailure(fn: () => unknown, token: string): void {
  let message = "";
  try {
    fn();
  } catch (error) {
    message = error instanceof Error ? error.message : String(error);
  }
  assert.ok(message.includes(token), `expected ${token}, got ${message || "success"}`);
}

function writePrivate(file: string, body: Buffer): void {
  fs.writeFileSync(file, body, { mode: 0o600, flag: "wx" });
}

function buildGeneration(
  root: string,
  label: string,
  body: Buffer,
  generation: number,
) {
  const source = path.join(root, `${label}.jsonl`);
  const store = path.join(root, `${label}-store`);
  const materialized = path.join(root, `${label}-materialized.jsonl`);
  writePrivate(source, body);
  const manifest = buildSegmentedJsonlV1FromFile(source, store, {
    segmentTargetBytes: 1024,
    maxRecordBytes: 1,
    generation,
  });
  reconstructSegmentedJsonlV1ToFile(store, materialized);
  const snapshot = deriveSegmentedJsonlSnapshotAuthorityV1(manifest);
  const materializedAuthority = deriveSegmentedJsonlMaterializedAuthorityV1(
    store,
    materialized,
  );
  return { manifest, store, materialized, snapshot, materializedAuthority };
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "void-segmented-append-only-v1-"));
fs.chmodSync(tmp, 0o700);

try {
  // 1200 bytes crosses the 1 KiB segment boundary, so continuity covers both
  // sealed and active storage rather than only one active leaf.
  const previousBody = Buffer.from("0\n".repeat(600), "utf8");
  const previous = buildGeneration(tmp, "previous", previousBody, 1);
  assert.ok(previous.manifest.sealed_segments.length >= 1);

  const previousCheckpoint = deriveSegmentedJsonlCheckpointV1(
    previous.snapshot,
    null,
  );
  const previousAnchor = verifySegmentedJsonlCheckpointAnchorV1({
    checkpoint: previousCheckpoint,
    snapshot: previous.snapshot,
    trusted_checkpoint_sha256: previousCheckpoint.checkpoint_sha256,
  });

  const appendedBody = Buffer.concat([previousBody, Buffer.from("1\n", "utf8")]);
  const appended = buildGeneration(tmp, "appended", appendedBody, 2);
  const appendedCheckpoint = deriveSegmentedJsonlCheckpointV1(
    appended.snapshot,
    previousAnchor,
  );
  const witness = verifySegmentedJsonlCheckpointAppendOnlyAtUseV1(
    appended.store,
    appended.materialized,
    appendedCheckpoint,
    appended.snapshot,
    previousAnchor,
    previous.materializedAuthority,
    appended.materializedAuthority,
    previous.materializedAuthority.authority_sha256,
  );
  assert.equal(witness.previous_generation, 1);
  assert.equal(witness.current_generation, 2);
  assert.equal(witness.prefix_bytes, previousBody.length);
  assert.equal(witness.prefix_sha256, previous.materializedAuthority.materialized_sha256);
  assert.equal(witness.previous_materialized_sha256, previous.materializedAuthority.materialized_sha256);
  assert.equal(witness.current_materialized_sha256, appended.materializedAuthority.materialized_sha256);
  assert.match(witness.witness_sha256, /^[0-9a-f]{64}$/);

  // The snapshot-only checkpoint progression admits this same-size rewrite:
  // generation increments, snapshot/manifest identities differ, and totals do
  // not regress. Authority-grade append-only verification must reject it.
  const rewrittenSameSizeBody = Buffer.concat([
    Buffer.from("1\n", "utf8"),
    previousBody.subarray(2),
  ]);
  assert.equal(rewrittenSameSizeBody.length, previousBody.length);
  const rewrittenSameSize = buildGeneration(tmp, "rewritten-same-size", rewrittenSameSizeBody, 2);
  const rewrittenSameSizeCheckpoint = deriveSegmentedJsonlCheckpointV1(
    rewrittenSameSize.snapshot,
    previousAnchor,
  );
  assert.equal(rewrittenSameSizeCheckpoint.store_total_bytes, previousCheckpoint.store_total_bytes);
  assert.equal(rewrittenSameSizeCheckpoint.store_total_records, previousCheckpoint.store_total_records);
  expectFailure(
    () => verifySegmentedJsonlCheckpointAppendOnlyAtUseV1(
      rewrittenSameSize.store,
      rewrittenSameSize.materialized,
      rewrittenSameSizeCheckpoint,
      rewrittenSameSize.snapshot,
      previousAnchor,
      previous.materializedAuthority,
      rewrittenSameSize.materializedAuthority,
      previous.materializedAuthority.authority_sha256,
    ),
    "MATERIALIZED_APPEND_PREFIX_MISMATCH",
  );

  // Rewriting retained history and then appending fresh valid JSONL must also
  // fail even though byte/record totals grow monotonically.
  const rewrittenAndAppendedBody = Buffer.concat([
    Buffer.from("1\n", "utf8"),
    previousBody.subarray(2),
    Buffer.from("2\n", "utf8"),
  ]);
  const rewrittenAndAppended = buildGeneration(
    tmp,
    "rewritten-and-appended",
    rewrittenAndAppendedBody,
    2,
  );
  const rewrittenAndAppendedCheckpoint = deriveSegmentedJsonlCheckpointV1(
    rewrittenAndAppended.snapshot,
    previousAnchor,
  );
  assert.ok(rewrittenAndAppendedCheckpoint.store_total_bytes > previousCheckpoint.store_total_bytes);
  assert.ok(rewrittenAndAppendedCheckpoint.store_total_records > previousCheckpoint.store_total_records);
  expectFailure(
    () => verifySegmentedJsonlCheckpointAppendOnlyAtUseV1(
      rewrittenAndAppended.store,
      rewrittenAndAppended.materialized,
      rewrittenAndAppendedCheckpoint,
      rewrittenAndAppended.snapshot,
      previousAnchor,
      previous.materializedAuthority,
      rewrittenAndAppended.materializedAuthority,
      previous.materializedAuthority.authority_sha256,
    ),
    "MATERIALIZED_APPEND_PREFIX_MISMATCH",
  );

  expectFailure(
    () => verifySegmentedJsonlCheckpointAppendOnlyAtUseV1(
      appended.store,
      appended.materialized,
      appendedCheckpoint,
      appended.snapshot,
      previousAnchor,
      previous.materializedAuthority,
      appended.materializedAuthority,
      "f".repeat(64),
    ),
    "PREVIOUS_MATERIALIZED_TRUST_ROOT_MISMATCH",
  );

  console.log("append_only_prefix_continuity_bound=true");
  console.log("same_size_prefix_rewrite_rejected=true");
  console.log("prefix_rewrite_plus_append_rejected=true");
  console.log("previous_materialized_trust_root_required=true");
  console.log("VOID_SEGMENTED_JSONL_CHECKPOINT_APPEND_ONLY_V1_PROOF_GREEN=true");
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
