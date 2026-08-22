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
  verifySegmentedJsonlAppendOnlyCheckpointWitnessObjectV1,
  verifySegmentedJsonlCheckpointAppendOnlyAtUseV1,
  verifySegmentedJsonlCheckpointAppendOnlyBoundedV1,
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

function buildGeneration(root: string, label: string, body: Buffer, generation: number) {
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
  const materializedAuthority = deriveSegmentedJsonlMaterializedAuthorityV1(store, materialized);
  return { store, materialized, snapshot, materializedAuthority };
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "void-segmented-bounded-checkpoint-v1-"));
fs.chmodSync(tmp, 0o700);

try {
  const previousBody = Buffer.from("0\n".repeat(600), "utf8");
  const previous = buildGeneration(tmp, "previous", previousBody, 1);
  const previousCheckpoint = deriveSegmentedJsonlCheckpointV1(previous.snapshot, null);
  const previousAnchor = verifySegmentedJsonlCheckpointAnchorV1({
    checkpoint: previousCheckpoint,
    snapshot: previous.snapshot,
    trusted_checkpoint_sha256: previousCheckpoint.checkpoint_sha256,
  });

  const currentBody = Buffer.concat([previousBody, Buffer.from("1\n".repeat(16), "utf8")]);
  const current = buildGeneration(tmp, "current", currentBody, 2);
  const checkpoint = deriveSegmentedJsonlCheckpointV1(current.snapshot, previousAnchor);

  // Witness production is intentionally the expensive/offline boundary. It is
  // allowed to scan the retained prefix once and produces a content-addressed
  // witness for independently durable anchoring.
  const witness = verifySegmentedJsonlCheckpointAppendOnlyAtUseV1(
    current.store,
    current.materialized,
    checkpoint,
    current.snapshot,
    previousAnchor,
    previous.materializedAuthority,
    current.materializedAuthority,
    previous.materializedAuthority.authority_sha256,
  );
  assert.deepEqual(
    verifySegmentedJsonlAppendOnlyCheckpointWitnessObjectV1(witness),
    witness,
  );

  // The bounded online consumer deliberately has no root/materialized pathname
  // argument. Remove both current pathname sources after witness production;
  // object/root verification must still succeed without re-reading lifetime
  // materialized history.
  const detachedMaterialized = `${current.materialized}.detached`;
  const detachedStore = `${current.store}.detached`;
  fs.renameSync(current.materialized, detachedMaterialized);
  fs.renameSync(current.store, detachedStore);
  const bounded = verifySegmentedJsonlCheckpointAppendOnlyBoundedV1(
    checkpoint,
    current.snapshot,
    previousAnchor,
    previous.materializedAuthority,
    current.materializedAuthority,
    witness,
    previous.materializedAuthority.authority_sha256,
    witness.witness_sha256,
  );
  assert.deepEqual(bounded, witness);

  expectFailure(
    () => verifySegmentedJsonlCheckpointAppendOnlyBoundedV1(
      checkpoint,
      current.snapshot,
      previousAnchor,
      previous.materializedAuthority,
      current.materializedAuthority,
      witness,
      previous.materializedAuthority.authority_sha256,
      "f".repeat(64),
    ),
    "APPEND_ONLY_WITNESS_TRUST_ROOT_MISMATCH",
  );

  const tamperedWitness = {
    ...witness,
    prefix_bytes: witness.prefix_bytes + 2,
  };
  expectFailure(
    () => verifySegmentedJsonlCheckpointAppendOnlyWitnessObjectV1(tamperedWitness),
    "APPEND_ONLY_WITNESS_DIGEST_MISMATCH",
  );

  expectFailure(
    () => verifySegmentedJsonlCheckpointAppendOnlyBoundedV1(
      checkpoint,
      current.snapshot,
      previousAnchor,
      previous.materializedAuthority,
      previous.materializedAuthority,
      witness,
      previous.materializedAuthority.authority_sha256,
      witness.witness_sha256,
    ),
    "MATERIALIZED_SNAPSHOT_BINDING_MISMATCH",
  );

  console.log("append_only_witness_offline_producer_explicit=true");
  console.log("bounded_online_consumer_materialized_path_not_required=true");
  console.log("bounded_online_consumer_trusted_witness_required=true");
  console.log("bounded_online_consumer_binding_mismatch_rejected=true");
  console.log("VOID_SEGMENTED_JSONL_CHECKPOINT_BOUNDED_CONSUMER_V1_PROOF_GREEN=true");
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
