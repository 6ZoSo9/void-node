// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025 6ZoSo9

import * as crypto from "node:crypto";

import {
  verifySegmentedJsonlCheckpointAnchorV1,
  verifySegmentedJsonlCheckpointIncrementalV1,
  verifySegmentedJsonlSnapshotAuthorityObjectV1,
  type SegmentedJsonlCheckpointAnchorV1,
  type SegmentedJsonlCheckpointV1,
  type SegmentedJsonlSnapshotAuthorityV1,
} from "./segmented_jsonl_snapshot_authority_v1.js";
import {
  verifySegmentedJsonlMaterializedAuthorityAtUseV1,
  verifySegmentedJsonlMaterializedAuthorityObjectV1,
  type SegmentedJsonlMaterializedAuthorityV1,
} from "./segmented_jsonl_materialized_authority_v1.js";

export const VOID_SEGMENTED_JSONL_APPEND_ONLY_CHECKPOINT_WITNESS_V1 =
  "VOID_SEGMENTED_JSONL_APPEND_ONLY_CHECKPOINT_WITNESS_V1";

export type SegmentedJsonlAppendOnlyCheckpointWitnessV1 = {
  v: 1;
  format: typeof VOID_SEGMENTED_JSONL_APPEND_ONLY_CHECKPOINT_WITNESS_V1;
  previous_checkpoint_sha256: string;
  checkpoint_sha256: string;
  previous_materialized_authority_sha256: string;
  current_materialized_authority_sha256: string;
  previous_materialized_sha256: string;
  current_materialized_sha256: string;
  prefix_bytes: number;
  prefix_sha256: string;
  previous_generation: number;
  current_generation: number;
  witness_sha256: string;
};

type AppendOnlyBindingsV1 = {
  previousAnchor: SegmentedJsonlCheckpointAnchorV1;
  snapshot: SegmentedJsonlSnapshotAuthorityV1;
  checkpoint: SegmentedJsonlCheckpointV1;
  previousMaterialized: SegmentedJsonlMaterializedAuthorityV1;
  currentMaterialized: SegmentedJsonlMaterializedAuthorityV1;
};

function fail(code: string, detail: string): never {
  throw new Error(`${VOID_SEGMENTED_JSONL_APPEND_ONLY_CHECKPOINT_WITNESS_V1}:${code}:${detail}`);
}

function sha256(data: Buffer | string): string {
  return crypto.createHash("sha256").update(data).digest("hex");
}

function isHex64(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{64}$/.test(value);
}

function canonicalJson(value: unknown): string {
  return JSON.stringify(value);
}

function requireExactKeys(value: object, expected: readonly string[], code: string): void {
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (actual.length !== wanted.length || actual.some((key, index) => key !== wanted[index])) {
    fail(code, actual.join(","));
  }
}

function assertMaterializedSnapshotBinding(
  materialized: SegmentedJsonlMaterializedAuthorityV1,
  snapshot: SegmentedJsonlSnapshotAuthorityV1,
  label: string,
): void {
  if (
    materialized.snapshot_sha256 !== snapshot.snapshot_sha256 ||
    materialized.manifest_sha256 !== snapshot.manifest_sha256 ||
    materialized.store_generation !== snapshot.generation ||
    materialized.total_bytes !== snapshot.total_bytes ||
    materialized.total_records !== snapshot.total_records
  ) {
    fail("MATERIALIZED_SNAPSHOT_BINDING_MISMATCH", label);
  }
}

function verifyAppendOnlyBindingsV1(
  checkpointInput: SegmentedJsonlCheckpointV1,
  snapshotInput: SegmentedJsonlSnapshotAuthorityV1,
  previousAnchorInput: SegmentedJsonlCheckpointAnchorV1,
  previousMaterializedAuthorityInput: SegmentedJsonlMaterializedAuthorityV1,
  currentMaterializedAuthorityInput: SegmentedJsonlMaterializedAuthorityV1,
  trustedPreviousMaterializedAuthoritySha256: string,
): AppendOnlyBindingsV1 {
  if (!isHex64(trustedPreviousMaterializedAuthoritySha256)) {
    fail("INVALID_PREVIOUS_MATERIALIZED_TRUST_ROOT", String(trustedPreviousMaterializedAuthoritySha256));
  }

  const previousAnchor = verifySegmentedJsonlCheckpointAnchorV1(previousAnchorInput);
  const snapshot = verifySegmentedJsonlSnapshotAuthorityObjectV1(snapshotInput);
  const checkpoint = verifySegmentedJsonlCheckpointIncrementalV1(
    checkpointInput,
    snapshot,
    previousAnchor,
  );
  const previousMaterialized = verifySegmentedJsonlMaterializedAuthorityObjectV1(
    previousMaterializedAuthorityInput,
  );
  const currentMaterialized = verifySegmentedJsonlMaterializedAuthorityObjectV1(
    currentMaterializedAuthorityInput,
  );

  if (previousMaterialized.authority_sha256 !== trustedPreviousMaterializedAuthoritySha256) {
    fail(
      "PREVIOUS_MATERIALIZED_TRUST_ROOT_MISMATCH",
      `${previousMaterialized.authority_sha256}:${trustedPreviousMaterializedAuthoritySha256}`,
    );
  }
  assertMaterializedSnapshotBinding(previousMaterialized, previousAnchor.snapshot, "previous");
  assertMaterializedSnapshotBinding(currentMaterialized, snapshot, "current");

  if (checkpoint.previous_checkpoint_sha256 !== previousAnchor.checkpoint.checkpoint_sha256) {
    fail("CHECKPOINT_PREDECESSOR_MISMATCH", checkpoint.checkpoint_sha256);
  }
  if (currentMaterialized.store_generation !== previousMaterialized.store_generation + 1) {
    fail(
      "MATERIALIZED_GENERATION_NOT_NEXT",
      `${previousMaterialized.store_generation}:${currentMaterialized.store_generation}`,
    );
  }
  if (
    currentMaterialized.total_bytes < previousMaterialized.total_bytes ||
    currentMaterialized.total_records < previousMaterialized.total_records
  ) {
    fail(
      "MATERIALIZED_TOTAL_REGRESSION",
      `${previousMaterialized.total_bytes}:${currentMaterialized.total_bytes}:${previousMaterialized.total_records}:${currentMaterialized.total_records}`,
    );
  }

  return {
    previousAnchor,
    snapshot,
    checkpoint,
    previousMaterialized,
    currentMaterialized,
  };
}

export function verifySegmentedJsonlAppendOnlyCheckpointWitnessObjectV1(
  witnessInput: SegmentedJsonlAppendOnlyCheckpointWitnessV1,
): SegmentedJsonlAppendOnlyCheckpointWitnessV1 {
  const witness = witnessInput as SegmentedJsonlAppendOnlyCheckpointWitnessV1;
  if (!witness || typeof witness !== "object") {
    fail("INVALID_APPEND_ONLY_WITNESS", "not-object");
  }
  requireExactKeys(witness, [
    "v", "format", "previous_checkpoint_sha256", "checkpoint_sha256",
    "previous_materialized_authority_sha256", "current_materialized_authority_sha256",
    "previous_materialized_sha256", "current_materialized_sha256", "prefix_bytes",
    "prefix_sha256", "previous_generation", "current_generation", "witness_sha256",
  ], "INVALID_APPEND_ONLY_WITNESS_KEYS");
  if (
    witness.v !== 1 ||
    witness.format !== VOID_SEGMENTED_JSONL_APPEND_ONLY_CHECKPOINT_WITNESS_V1 ||
    !isHex64(witness.previous_checkpoint_sha256) ||
    !isHex64(witness.checkpoint_sha256) ||
    !isHex64(witness.previous_materialized_authority_sha256) ||
    !isHex64(witness.current_materialized_authority_sha256) ||
    !isHex64(witness.previous_materialized_sha256) ||
    !isHex64(witness.current_materialized_sha256) ||
    !Number.isSafeInteger(witness.prefix_bytes) || witness.prefix_bytes < 0 ||
    !isHex64(witness.prefix_sha256) ||
    !Number.isSafeInteger(witness.previous_generation) || witness.previous_generation <= 0 ||
    !Number.isSafeInteger(witness.current_generation) || witness.current_generation <= 0 ||
    !isHex64(witness.witness_sha256)
  ) {
    fail("INVALID_APPEND_ONLY_WITNESS", "shape");
  }
  if (witness.current_generation !== witness.previous_generation + 1) {
    fail(
      "APPEND_ONLY_WITNESS_GENERATION_NOT_NEXT",
      `${witness.previous_generation}:${witness.current_generation}`,
    );
  }
  if (witness.prefix_sha256 !== witness.previous_materialized_sha256) {
    fail(
      "APPEND_ONLY_WITNESS_PREFIX_ROOT_MISMATCH",
      `${witness.prefix_sha256}:${witness.previous_materialized_sha256}`,
    );
  }
  const { witness_sha256: _digest, ...core } = witness;
  if (sha256(canonicalJson(core)) !== witness.witness_sha256) {
    fail("APPEND_ONLY_WITNESS_DIGEST_MISMATCH", witness.witness_sha256);
  }
  return witness;
}

// Online consumers must not re-hash lifetime history. They verify an already
// produced append-only witness against independently trusted witness and
// predecessor roots. Producing that witness may be an offline/diagnostic scan;
// making the witness/root durable is a separate consumer-authority boundary.
export function verifySegmentedJsonlCheckpointAppendOnlyBoundedV1(
  checkpointInput: SegmentedJsonlCheckpointV1,
  snapshotInput: SegmentedJsonlSnapshotAuthorityV1,
  previousAnchorInput: SegmentedJsonlCheckpointAnchorV1,
  previousMaterializedAuthorityInput: SegmentedJsonlMaterializedAuthorityV1,
  currentMaterializedAuthorityInput: SegmentedJsonlMaterializedAuthorityV1,
  witnessInput: SegmentedJsonlAppendOnlyCheckpointWitnessV1,
  trustedPreviousMaterializedAuthoritySha256: string,
  trustedWitnessSha256: string,
): SegmentedJsonlAppendOnlyCheckpointWitnessV1 {
  if (!isHex64(trustedWitnessSha256)) {
    fail("INVALID_APPEND_ONLY_WITNESS_TRUST_ROOT", String(trustedWitnessSha256));
  }
  const bindings = verifyAppendOnlyBindingsV1(
    checkpointInput,
    snapshotInput,
    previousAnchorInput,
    previousMaterializedAuthorityInput,
    currentMaterializedAuthorityInput,
    trustedPreviousMaterializedAuthoritySha256,
  );
  const witness = verifySegmentedJsonlAppendOnlyCheckpointWitnessObjectV1(witnessInput);
  if (witness.witness_sha256 !== trustedWitnessSha256) {
    fail(
      "APPEND_ONLY_WITNESS_TRUST_ROOT_MISMATCH",
      `${witness.witness_sha256}:${trustedWitnessSha256}`,
    );
  }
  if (
    witness.previous_checkpoint_sha256 !== bindings.previousAnchor.checkpoint.checkpoint_sha256 ||
    witness.checkpoint_sha256 !== bindings.checkpoint.checkpoint_sha256 ||
    witness.previous_materialized_authority_sha256 !== bindings.previousMaterialized.authority_sha256 ||
    witness.current_materialized_authority_sha256 !== bindings.currentMaterialized.authority_sha256 ||
    witness.previous_materialized_sha256 !== bindings.previousMaterialized.materialized_sha256 ||
    witness.current_materialized_sha256 !== bindings.currentMaterialized.materialized_sha256 ||
    witness.prefix_bytes !== bindings.previousMaterialized.total_bytes ||
    witness.prefix_sha256 !== bindings.previousMaterialized.materialized_sha256 ||
    witness.previous_generation !== bindings.previousMaterialized.store_generation ||
    witness.current_generation !== bindings.currentMaterialized.store_generation
  ) {
    fail("APPEND_ONLY_WITNESS_BINDING_MISMATCH", witness.witness_sha256);
  }
  return witness;
}

// This path intentionally performs the expensive materialized-prefix scan and
// is the witness producer, not the bounded online consumer.
export function verifySegmentedJsonlCheckpointAppendOnlyAtUseV1(
  root: string,
  materializedFile: string,
  checkpointInput: SegmentedJsonlCheckpointV1,
  snapshotInput: SegmentedJsonlSnapshotAuthorityV1,
  previousAnchorInput: SegmentedJsonlCheckpointAnchorV1,
  previousMaterializedAuthorityInput: SegmentedJsonlMaterializedAuthorityV1,
  currentMaterializedAuthorityInput: SegmentedJsonlMaterializedAuthorityV1,
  trustedPreviousMaterializedAuthoritySha256: string,
): SegmentedJsonlAppendOnlyCheckpointWitnessV1 {
  const bindings = verifyAppendOnlyBindingsV1(
    checkpointInput,
    snapshotInput,
    previousAnchorInput,
    previousMaterializedAuthorityInput,
    currentMaterializedAuthorityInput,
    trustedPreviousMaterializedAuthoritySha256,
  );

  const prefixHash = crypto.createHash("sha256");
  verifySegmentedJsonlMaterializedAuthorityAtUseV1(
    root,
    materializedFile,
    bindings.currentMaterialized,
    (reader) => {
      let offset = 0;
      while (offset < bindings.previousMaterialized.total_bytes) {
        const length = Math.min(
          reader.max_read_bytes,
          bindings.previousMaterialized.total_bytes - offset,
        );
        const chunk = reader.read(offset, length);
        prefixHash.update(chunk);
        offset += chunk.length;
      }
      return null;
    },
  );
  const prefixSha256 = prefixHash.digest("hex");
  if (prefixSha256 !== bindings.previousMaterialized.materialized_sha256) {
    fail(
      "MATERIALIZED_APPEND_PREFIX_MISMATCH",
      `${bindings.previousMaterialized.materialized_sha256}:${prefixSha256}`,
    );
  }

  const core = {
    v: 1 as const,
    format: VOID_SEGMENTED_JSONL_APPEND_ONLY_CHECKPOINT_WITNESS_V1 as typeof VOID_SEGMENTED_JSONL_APPEND_ONLY_CHECKPOINT_WITNESS_V1,
    previous_checkpoint_sha256: bindings.previousAnchor.checkpoint.checkpoint_sha256,
    checkpoint_sha256: bindings.checkpoint.checkpoint_sha256,
    previous_materialized_authority_sha256: bindings.previousMaterialized.authority_sha256,
    current_materialized_authority_sha256: bindings.currentMaterialized.authority_sha256,
    previous_materialized_sha256: bindings.previousMaterialized.materialized_sha256,
    current_materialized_sha256: bindings.currentMaterialized.materialized_sha256,
    prefix_bytes: bindings.previousMaterialized.total_bytes,
    prefix_sha256: prefixSha256,
    previous_generation: bindings.previousMaterialized.store_generation,
    current_generation: bindings.currentMaterialized.store_generation,
  };
  return verifySegmentedJsonlAppendOnlyCheckpointWitnessObjectV1({
    ...core,
    witness_sha256: sha256(canonicalJson(core)),
  });
}
