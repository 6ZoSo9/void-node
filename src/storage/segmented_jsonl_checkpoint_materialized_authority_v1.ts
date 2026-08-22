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

  const prefixHash = crypto.createHash("sha256");
  verifySegmentedJsonlMaterializedAuthorityAtUseV1(
    root,
    materializedFile,
    currentMaterialized,
    (reader) => {
      let offset = 0;
      while (offset < previousMaterialized.total_bytes) {
        const length = Math.min(
          reader.max_read_bytes,
          previousMaterialized.total_bytes - offset,
        );
        const chunk = reader.read(offset, length);
        prefixHash.update(chunk);
        offset += chunk.length;
      }
      return null;
    },
  );
  const prefixSha256 = prefixHash.digest("hex");
  if (prefixSha256 !== previousMaterialized.materialized_sha256) {
    fail(
      "MATERIALIZED_APPEND_PREFIX_MISMATCH",
      `${previousMaterialized.materialized_sha256}:${prefixSha256}`,
    );
  }

  const core = {
    v: 1 as const,
    format: VOID_SEGMENTED_JSONL_APPEND_ONLY_CHECKPOINT_WITNESS_V1 as typeof VOID_SEGMENTED_JSONL_APPEND_ONLY_CHECKPOINT_WITNESS_V1,
    previous_checkpoint_sha256: previousAnchor.checkpoint.checkpoint_sha256,
    checkpoint_sha256: checkpoint.checkpoint_sha256,
    previous_materialized_authority_sha256: previousMaterialized.authority_sha256,
    current_materialized_authority_sha256: currentMaterialized.authority_sha256,
    previous_materialized_sha256: previousMaterialized.materialized_sha256,
    current_materialized_sha256: currentMaterialized.materialized_sha256,
    prefix_bytes: previousMaterialized.total_bytes,
    prefix_sha256: prefixSha256,
    previous_generation: previousMaterialized.store_generation,
    current_generation: currentMaterialized.store_generation,
  };
  return {
    ...core,
    witness_sha256: sha256(canonicalJson(core)),
  };
}
