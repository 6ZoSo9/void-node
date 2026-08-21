// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025 6ZoSo9

import * as crypto from "node:crypto";

import {
  serializeSegmentedJsonlManifestV1,
  verifySegmentedJsonlV1,
  type SegmentedJsonlManifestV1,
} from "./segmented_jsonl_v1.js";

export const VOID_SEGMENTED_JSONL_SNAPSHOT_AUTHORITY_V1 =
  "VOID_SEGMENTED_JSONL_SNAPSHOT_AUTHORITY_V1";
export const VOID_SEGMENTED_JSONL_CHECKPOINT_V1 =
  "VOID_SEGMENTED_JSONL_CHECKPOINT_V1";
export const VOID_SEGMENTED_JSONL_MAX_CHECKPOINT_BYTES_V1 = 2048;

export type SegmentedJsonlSnapshotAuthorityV1 = {
  v: 1;
  format: typeof VOID_SEGMENTED_JSONL_SNAPSHOT_AUTHORITY_V1;
  manifest_sha256: string;
  sealed_root_sha256: string;
  active_sha256: string;
  generation: number;
  total_bytes: number;
  total_records: number;
  snapshot_sha256: string;
  live_tree_terminal_authority: false;
};

export type SegmentedJsonlCheckpointV1 = {
  v: 1;
  format: typeof VOID_SEGMENTED_JSONL_CHECKPOINT_V1;
  checkpoint_index: number;
  previous_checkpoint_sha256: string | null;
  snapshot_sha256: string;
  manifest_sha256: string;
  store_generation: number;
  store_total_bytes: number;
  store_total_records: number;
  cumulative_bytes: string;
  cumulative_records: string;
  checkpoint_sha256: string;
};

export type SegmentedJsonlCheckpointAnchorV1 = {
  checkpoint: SegmentedJsonlCheckpointV1;
  snapshot: SegmentedJsonlSnapshotAuthorityV1;
  trusted_checkpoint_sha256: string;
};

export type SegmentedJsonlCheckpointChainEntryV1 = {
  checkpoint: SegmentedJsonlCheckpointV1;
  snapshot: SegmentedJsonlSnapshotAuthorityV1;
};

function fail(code: string, detail: string): never {
  throw new Error(`${VOID_SEGMENTED_JSONL_SNAPSHOT_AUTHORITY_V1}:${code}:${detail}`);
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

function snapshotCore(manifest: SegmentedJsonlManifestV1) {
  const manifestBytes = serializeSegmentedJsonlManifestV1(manifest);
  return {
    v: 1 as const,
    format: VOID_SEGMENTED_JSONL_SNAPSHOT_AUTHORITY_V1 as typeof VOID_SEGMENTED_JSONL_SNAPSHOT_AUTHORITY_V1,
    manifest_sha256: sha256(manifestBytes),
    sealed_root_sha256: manifest.sealed_root_sha256,
    active_sha256: manifest.active.sha256,
    generation: manifest.generation,
    total_bytes: manifest.total_bytes,
    total_records: manifest.total_records,
    live_tree_terminal_authority: false as const,
  };
}

export function deriveSegmentedJsonlSnapshotAuthorityV1(
  manifestInput: unknown,
): SegmentedJsonlSnapshotAuthorityV1 {
  const manifestBytes = serializeSegmentedJsonlManifestV1(manifestInput);
  const manifest = JSON.parse(manifestBytes.toString("utf8")) as SegmentedJsonlManifestV1;
  const core = snapshotCore(manifest);
  return {
    ...core,
    snapshot_sha256: sha256(canonicalJson(core)),
  };
}

export function verifySegmentedJsonlSnapshotAuthorityObjectV1(
  snapshotInput: SegmentedJsonlSnapshotAuthorityV1,
): SegmentedJsonlSnapshotAuthorityV1 {
  const snapshot = snapshotInput as SegmentedJsonlSnapshotAuthorityV1;
  if (!snapshot || typeof snapshot !== "object") fail("INVALID_SNAPSHOT_AUTHORITY", "not-object");
  requireExactKeys(snapshot, [
    "v", "format", "manifest_sha256", "sealed_root_sha256", "active_sha256",
    "generation", "total_bytes", "total_records", "snapshot_sha256",
    "live_tree_terminal_authority",
  ], "INVALID_SNAPSHOT_AUTHORITY_KEYS");
  if (
    snapshot.v !== 1 ||
    snapshot.format !== VOID_SEGMENTED_JSONL_SNAPSHOT_AUTHORITY_V1 ||
    snapshot.live_tree_terminal_authority !== false ||
    !isHex64(snapshot.snapshot_sha256) ||
    !isHex64(snapshot.manifest_sha256) ||
    !isHex64(snapshot.sealed_root_sha256) ||
    !isHex64(snapshot.active_sha256) ||
    !Number.isSafeInteger(snapshot.generation) || snapshot.generation <= 0 ||
    !Number.isSafeInteger(snapshot.total_bytes) || snapshot.total_bytes < 0 ||
    !Number.isSafeInteger(snapshot.total_records) || snapshot.total_records < 0
  ) {
    fail("INVALID_SNAPSHOT_AUTHORITY", "shape");
  }
  const core = {
    v: snapshot.v,
    format: snapshot.format,
    manifest_sha256: snapshot.manifest_sha256,
    sealed_root_sha256: snapshot.sealed_root_sha256,
    active_sha256: snapshot.active_sha256,
    generation: snapshot.generation,
    total_bytes: snapshot.total_bytes,
    total_records: snapshot.total_records,
    live_tree_terminal_authority: snapshot.live_tree_terminal_authority,
  };
  if (sha256(canonicalJson(core)) !== snapshot.snapshot_sha256) {
    fail("SNAPSHOT_DIGEST_MISMATCH", snapshot.snapshot_sha256);
  }
  return snapshot;
}

export function verifySegmentedJsonlSnapshotAuthorityV1(
  root: string,
  options: { validateJson?: boolean } = {},
): {
  authority: SegmentedJsonlSnapshotAuthorityV1;
  sealed_segments_verified: number;
  total_bytes_verified: number;
  total_records_verified: number;
} {
  const verified = verifySegmentedJsonlV1(root, options);
  const authority = deriveSegmentedJsonlSnapshotAuthorityV1(verified.manifest);
  return {
    authority,
    sealed_segments_verified: verified.sealed_segments_verified,
    total_bytes_verified: verified.total_bytes_verified,
    total_records_verified: verified.total_records_verified,
  };
}

function parseDecimal(value: unknown, field: string): bigint {
  if (typeof value !== "string" || !/^(0|[1-9][0-9]*)$/.test(value)) {
    fail("INVALID_CHECKPOINT_DECIMAL", field);
  }
  return BigInt(value);
}

function checkpointCore(
  snapshot: SegmentedJsonlSnapshotAuthorityV1,
  previous: SegmentedJsonlCheckpointV1 | null,
) {
  return {
    v: 1 as const,
    format: VOID_SEGMENTED_JSONL_CHECKPOINT_V1 as typeof VOID_SEGMENTED_JSONL_CHECKPOINT_V1,
    checkpoint_index: previous ? previous.checkpoint_index + 1 : 0,
    previous_checkpoint_sha256: previous ? previous.checkpoint_sha256 : null,
    snapshot_sha256: snapshot.snapshot_sha256,
    manifest_sha256: snapshot.manifest_sha256,
    store_generation: snapshot.generation,
    store_total_bytes: snapshot.total_bytes,
    store_total_records: snapshot.total_records,
    // These fields are the authoritative logical totals *as of this snapshot*.
    // They deliberately do not add a full-store total from each generation,
    // because unchanged retained records/bytes must not be double-counted.
    cumulative_bytes: String(snapshot.total_bytes),
    cumulative_records: String(snapshot.total_records),
  };
}

function serializeCheckpointCore(core: object): Buffer {
  const body = Buffer.from(canonicalJson(core), "utf8");
  if (body.length > VOID_SEGMENTED_JSONL_MAX_CHECKPOINT_BYTES_V1) {
    fail("CHECKPOINT_TOO_LARGE", `${body.length}:${VOID_SEGMENTED_JSONL_MAX_CHECKPOINT_BYTES_V1}`);
  }
  return body;
}

function checkpointCoreFromValue(c: SegmentedJsonlCheckpointV1) {
  return {
    v: c.v,
    format: c.format,
    checkpoint_index: c.checkpoint_index,
    previous_checkpoint_sha256: c.previous_checkpoint_sha256,
    snapshot_sha256: c.snapshot_sha256,
    manifest_sha256: c.manifest_sha256,
    store_generation: c.store_generation,
    store_total_bytes: c.store_total_bytes,
    store_total_records: c.store_total_records,
    cumulative_bytes: c.cumulative_bytes,
    cumulative_records: c.cumulative_records,
  };
}

export function verifySegmentedJsonlCheckpointEncodingV1(
  checkpointInput: SegmentedJsonlCheckpointV1,
): SegmentedJsonlCheckpointV1 {
  const c = checkpointInput as SegmentedJsonlCheckpointV1;
  if (!c || typeof c !== "object") fail("INVALID_CHECKPOINT", "not-object");
  requireExactKeys(c, [
    "v", "format", "checkpoint_index", "previous_checkpoint_sha256",
    "snapshot_sha256", "manifest_sha256", "store_generation",
    "store_total_bytes", "store_total_records", "cumulative_bytes",
    "cumulative_records", "checkpoint_sha256",
  ], "INVALID_CHECKPOINT_KEYS");
  if (
    c.v !== 1 || c.format !== VOID_SEGMENTED_JSONL_CHECKPOINT_V1 ||
    !Number.isSafeInteger(c.checkpoint_index) || c.checkpoint_index < 0 ||
    !(c.previous_checkpoint_sha256 === null || isHex64(c.previous_checkpoint_sha256)) ||
    !isHex64(c.snapshot_sha256) || !isHex64(c.manifest_sha256) ||
    !Number.isSafeInteger(c.store_generation) || c.store_generation <= 0 ||
    !Number.isSafeInteger(c.store_total_bytes) || c.store_total_bytes < 0 ||
    !Number.isSafeInteger(c.store_total_records) || c.store_total_records < 0 ||
    !isHex64(c.checkpoint_sha256)
  ) {
    fail("INVALID_CHECKPOINT", "shape");
  }
  parseDecimal(c.cumulative_bytes, "cumulative_bytes");
  parseDecimal(c.cumulative_records, "cumulative_records");
  if (sha256(serializeCheckpointCore(checkpointCoreFromValue(c))) !== c.checkpoint_sha256) {
    fail("CHECKPOINT_DIGEST_MISMATCH", c.checkpoint_sha256);
  }
  return c;
}

function assertCheckpointSnapshotBindingV1(
  checkpoint: SegmentedJsonlCheckpointV1,
  snapshot: SegmentedJsonlSnapshotAuthorityV1,
): void {
  if (
    checkpoint.snapshot_sha256 !== snapshot.snapshot_sha256 ||
    checkpoint.manifest_sha256 !== snapshot.manifest_sha256 ||
    checkpoint.store_generation !== snapshot.generation ||
    checkpoint.store_total_bytes !== snapshot.total_bytes ||
    checkpoint.store_total_records !== snapshot.total_records
  ) {
    fail("CHECKPOINT_SNAPSHOT_BINDING_MISMATCH", String(checkpoint.checkpoint_index));
  }
}

function assertCheckpointLogicalTotalsV1(
  checkpoint: SegmentedJsonlCheckpointV1,
  snapshot: SegmentedJsonlSnapshotAuthorityV1,
): void {
  if (
    checkpoint.cumulative_bytes !== String(snapshot.total_bytes) ||
    checkpoint.cumulative_records !== String(snapshot.total_records)
  ) {
    fail("CHECKPOINT_CUMULATIVE_MISMATCH", String(checkpoint.checkpoint_index));
  }
}

export function verifySegmentedJsonlCheckpointAnchorV1(
  anchorInput: SegmentedJsonlCheckpointAnchorV1,
): SegmentedJsonlCheckpointAnchorV1 {
  const anchor = anchorInput as SegmentedJsonlCheckpointAnchorV1;
  if (!anchor || typeof anchor !== "object") fail("INVALID_CHECKPOINT_ANCHOR", "not-object");
  requireExactKeys(anchor, [
    "checkpoint", "snapshot", "trusted_checkpoint_sha256",
  ], "INVALID_CHECKPOINT_ANCHOR_KEYS");
  if (!isHex64(anchor.trusted_checkpoint_sha256)) {
    fail("INVALID_CHECKPOINT_ANCHOR", "trusted_checkpoint_sha256");
  }
  const checkpoint = verifySegmentedJsonlCheckpointEncodingV1(anchor.checkpoint);
  const snapshot = verifySegmentedJsonlSnapshotAuthorityObjectV1(anchor.snapshot);
  if (checkpoint.checkpoint_sha256 !== anchor.trusted_checkpoint_sha256) {
    fail("CHECKPOINT_TRUST_ANCHOR_MISMATCH", checkpoint.checkpoint_sha256);
  }
  assertCheckpointSnapshotBindingV1(checkpoint, snapshot);
  assertCheckpointLogicalTotalsV1(checkpoint, snapshot);
  return { checkpoint, snapshot, trusted_checkpoint_sha256: anchor.trusted_checkpoint_sha256 };
}

function assertCheckpointProgressionV1(
  snapshot: SegmentedJsonlSnapshotAuthorityV1,
  previous: SegmentedJsonlCheckpointAnchorV1,
): void {
  const previousCheckpoint = previous.checkpoint;
  const previousSnapshot = previous.snapshot;
  if (snapshot.snapshot_sha256 === previousCheckpoint.snapshot_sha256) {
    fail("CHECKPOINT_SNAPSHOT_REPLAY", snapshot.snapshot_sha256);
  }
  if (snapshot.manifest_sha256 === previousCheckpoint.manifest_sha256) {
    fail("CHECKPOINT_MANIFEST_REPLAY", snapshot.manifest_sha256);
  }
  if (snapshot.generation !== previousCheckpoint.store_generation + 1) {
    fail("CHECKPOINT_GENERATION_NOT_NEXT", `${previousCheckpoint.store_generation}:${snapshot.generation}`);
  }
  if (
    snapshot.total_bytes < previousSnapshot.total_bytes ||
    snapshot.total_records < previousSnapshot.total_records
  ) {
    fail(
      "CHECKPOINT_STORE_TOTAL_REGRESSION",
      `${previousSnapshot.total_bytes}:${snapshot.total_bytes}:${previousSnapshot.total_records}:${snapshot.total_records}`,
    );
  }
}

export function deriveSegmentedJsonlCheckpointV1(
  snapshotInput: SegmentedJsonlSnapshotAuthorityV1,
  previousAnchorInput: SegmentedJsonlCheckpointAnchorV1 | null = null,
): SegmentedJsonlCheckpointV1 {
  const snapshot = verifySegmentedJsonlSnapshotAuthorityObjectV1(snapshotInput);
  const previousAnchor = previousAnchorInput
    ? verifySegmentedJsonlCheckpointAnchorV1(previousAnchorInput)
    : null;
  if (previousAnchor) assertCheckpointProgressionV1(snapshot, previousAnchor);
  const core = checkpointCore(snapshot, previousAnchor?.checkpoint ?? null);
  const checkpoint_sha256 = sha256(serializeCheckpointCore(core));
  return { ...core, checkpoint_sha256 };
}

export function verifySegmentedJsonlCheckpointV1(
  checkpointInput: SegmentedJsonlCheckpointV1,
  snapshotInput: SegmentedJsonlSnapshotAuthorityV1,
  previousAnchorInput: SegmentedJsonlCheckpointAnchorV1 | null = null,
): SegmentedJsonlCheckpointV1 {
  const c = verifySegmentedJsonlCheckpointEncodingV1(checkpointInput);
  const snapshot = verifySegmentedJsonlSnapshotAuthorityObjectV1(snapshotInput);
  const previousAnchor = previousAnchorInput
    ? verifySegmentedJsonlCheckpointAnchorV1(previousAnchorInput)
    : null;
  assertCheckpointSnapshotBindingV1(c, snapshot);
  assertCheckpointLogicalTotalsV1(c, snapshot);
  if (previousAnchor === null) {
    if (c.checkpoint_index !== 0 || c.previous_checkpoint_sha256 !== null) {
      fail("CHECKPOINT_PREDECESSOR_MISMATCH", "expected-genesis");
    }
  } else {
    assertCheckpointProgressionV1(snapshot, previousAnchor);
    const previous = previousAnchor.checkpoint;
    if (
      c.checkpoint_index !== previous.checkpoint_index + 1 ||
      c.previous_checkpoint_sha256 !== previous.checkpoint_sha256
    ) {
      fail("CHECKPOINT_PREDECESSOR_MISMATCH", String(c.checkpoint_index));
    }
  }
  return c;
}

export function verifySegmentedJsonlCheckpointChainV1(
  entries: readonly SegmentedJsonlCheckpointChainEntryV1[],
  trustedGenesisCheckpointSha256: string,
): SegmentedJsonlCheckpointV1 {
  if (!Array.isArray(entries) || entries.length === 0) fail("INVALID_CHECKPOINT_CHAIN", "empty");
  if (!isHex64(trustedGenesisCheckpointSha256)) fail("INVALID_CHECKPOINT_CHAIN_TRUST_ROOT", String(trustedGenesisCheckpointSha256));
  let previousAnchor: SegmentedJsonlCheckpointAnchorV1 | null = null;
  let current: SegmentedJsonlCheckpointV1 | null = null;
  for (const [index, entry] of entries.entries()) {
    if (!entry || typeof entry !== "object") fail("INVALID_CHECKPOINT_CHAIN", `entry=${index}`);
    const snapshot = verifySegmentedJsonlSnapshotAuthorityObjectV1(entry.snapshot);
    current = verifySegmentedJsonlCheckpointV1(entry.checkpoint, snapshot, previousAnchor);
    if (index === 0 && current.checkpoint_sha256 !== trustedGenesisCheckpointSha256) {
      fail("CHECKPOINT_CHAIN_TRUST_ROOT_MISMATCH", current.checkpoint_sha256);
    }
    previousAnchor = verifySegmentedJsonlCheckpointAnchorV1({
      checkpoint: current,
      snapshot,
      trusted_checkpoint_sha256: current.checkpoint_sha256,
    });
  }
  return current!;
}
