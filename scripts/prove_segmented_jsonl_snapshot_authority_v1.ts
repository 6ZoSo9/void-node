// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025 6ZoSo9

import assert from "node:assert/strict";
import * as crypto from "node:crypto";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { createRequire, syncBuiltinESMExports } from "node:module";

import {
  buildSegmentedJsonlV1FromFile,
  serializeSegmentedJsonlManifestV1,
  verifySegmentedJsonlV1,
} from "../src/storage/segmented_jsonl_v1.js";
import {
  VOID_SEGMENTED_JSONL_MAX_CHECKPOINT_BYTES_V1,
  deriveSegmentedJsonlCheckpointV1,
  deriveSegmentedJsonlSnapshotAuthorityV1,
  verifySegmentedJsonlCheckpointAnchorV1,
  verifySegmentedJsonlCheckpointChainV1,
  verifySegmentedJsonlCheckpointEncodingV1,
  verifySegmentedJsonlCheckpointV1,
  verifySegmentedJsonlSnapshotAuthorityV1,
  type SegmentedJsonlCheckpointAnchorV1,
  type SegmentedJsonlCheckpointV1,
  type SegmentedJsonlSnapshotAuthorityV1,
} from "../src/storage/segmented_jsonl_snapshot_authority_v1.js";

function sha256(data: Buffer | string): string {
  return crypto.createHash("sha256").update(data).digest("hex");
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

function makeSource(rows: number): Buffer {
  const out: Buffer[] = [];
  for (let i = 0; i < rows; i++) {
    out.push(Buffer.from(`${JSON.stringify({ v: 1, id: i, payload: "x".repeat(700) })}\n`, "utf8"));
  }
  return Buffer.concat(out);
}

function matchesOpenedTarget(candidateInput: unknown, targetPath: string): boolean {
  if (typeof candidateInput !== "string") return false;
  const candidate = path.resolve(candidateInput);
  const target = path.resolve(targetPath);
  if (candidate === target) return true;
  if (!candidate.includes("/proc/self/fd/") || path.basename(candidate) !== path.basename(target)) return false;
  try {
    return fs.realpathSync(path.dirname(candidate)) === path.dirname(target);
  } catch {
    return false;
  }
}

function checkpointCoreForProof(checkpoint: SegmentedJsonlCheckpointV1) {
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

function resignCheckpoint(checkpoint: SegmentedJsonlCheckpointV1): SegmentedJsonlCheckpointV1 {
  return {
    ...checkpoint,
    checkpoint_sha256: sha256(JSON.stringify(checkpointCoreForProof(checkpoint))),
  };
}

function trustedAnchor(
  checkpoint: SegmentedJsonlCheckpointV1,
  snapshot: SegmentedJsonlSnapshotAuthorityV1,
): SegmentedJsonlCheckpointAnchorV1 {
  return verifySegmentedJsonlCheckpointAnchorV1({
    checkpoint,
    snapshot,
    trusted_checkpoint_sha256: checkpoint.checkpoint_sha256,
  });
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "void-segmented-snapshot-authority-v1-"));
try {
  const source = path.join(tmp, "source.jsonl");
  const store = path.join(tmp, "store");
  fs.writeFileSync(source, makeSource(6), { mode: 0o600 });
  const manifest = buildSegmentedJsonlV1FromFile(source, store, {
    segmentTargetBytes: 1024,
    maxRecordBytes: 900,
  });
  assert.ok(manifest.sealed_segments.length >= 2);

  const authority = verifySegmentedJsonlSnapshotAuthorityV1(store).authority;
  assert.equal(authority.live_tree_terminal_authority, false);
  assert.equal(authority.manifest_sha256, sha256(serializeSegmentedJsonlManifestV1(manifest)));
  assert.match(authority.snapshot_sha256, /^[0-9a-f]{64}$/);
  assert.equal(authority.total_bytes, manifest.total_bytes);
  assert.equal(authority.total_records, manifest.total_records);

  const directAuthority = deriveSegmentedJsonlSnapshotAuthorityV1(manifest);
  assert.deepEqual(directAuthority, authority);

  const checkpoint0 = deriveSegmentedJsonlCheckpointV1(authority);
  verifySegmentedJsonlCheckpointV1(checkpoint0, authority);
  const anchor0 = trustedAnchor(checkpoint0, authority);
  assert.equal(checkpoint0.cumulative_bytes, String(authority.total_bytes));
  assert.equal(checkpoint0.cumulative_records, String(authority.total_records));

  // Checkpoint progression is one unique next store generation per link.
  // Replaying the same snapshot or reusing/regressing/skipping a generation is
  // rejected before authoritative logical totals can change.
  expectFailure(
    () => deriveSegmentedJsonlCheckpointV1(authority, anchor0),
    "CHECKPOINT_SNAPSHOT_REPLAY",
  );
  const sameGenerationManifest = { ...manifest, active: { ...manifest.active, sha256: "1".repeat(64) } };
  const sameGenerationAuthority = deriveSegmentedJsonlSnapshotAuthorityV1(sameGenerationManifest);
  expectFailure(
    () => deriveSegmentedJsonlCheckpointV1(sameGenerationAuthority, anchor0),
    "CHECKPOINT_GENERATION_NOT_NEXT",
  );
  const skippedGenerationAuthority = deriveSegmentedJsonlSnapshotAuthorityV1({
    ...manifest,
    generation: manifest.generation + 2,
  });
  expectFailure(
    () => deriveSegmentedJsonlCheckpointV1(skippedGenerationAuthority, anchor0),
    "CHECKPOINT_GENERATION_NOT_NEXT",
  );

  // An unchanged full store may advance its generation without inventing
  // additional logical records/bytes. The checkpoint carries the exact current
  // store totals rather than summing complete snapshot sizes across generations.
  const nextAuthority = deriveSegmentedJsonlSnapshotAuthorityV1({
    ...manifest,
    generation: manifest.generation + 1,
  });
  const checkpoint1 = deriveSegmentedJsonlCheckpointV1(nextAuthority, anchor0);
  verifySegmentedJsonlCheckpointV1(checkpoint1, nextAuthority, anchor0);
  const anchor1 = trustedAnchor(checkpoint1, nextAuthority);
  assert.equal(checkpoint1.store_generation, checkpoint0.store_generation + 1);
  assert.equal(checkpoint1.cumulative_records, String(nextAuthority.total_records));
  assert.equal(checkpoint1.cumulative_bytes, String(nextAuthority.total_bytes));
  assert.equal(checkpoint1.cumulative_records, checkpoint0.cumulative_records);
  assert.equal(checkpoint1.cumulative_bytes, checkpoint0.cumulative_bytes);

  // Encoding-only validation deliberately is not authority-grade. A fully
  // re-signed forged current checkpoint can be self-consistent, but the strict
  // verifier rejects it because it does not bind the referenced snapshot.
  const forged = resignCheckpoint({
    ...checkpoint1,
    snapshot_sha256: "a".repeat(64),
    manifest_sha256: "b".repeat(64),
  });
  verifySegmentedJsonlCheckpointEncodingV1(forged);
  expectFailure(
    () => verifySegmentedJsonlCheckpointV1(forged, nextAuthority, anchor0),
    "CHECKPOINT_SNAPSHOT_BINDING_MISMATCH",
  );

  // A re-signed predecessor cannot inject fabricated lifetime totals even if a
  // caller presents its self-hash as the trusted checkpoint hash: the trusted
  // checkpoint must also bind an exact referenced snapshot and its logical
  // totals. A mismatched external trust hash is independently rejected.
  const forgedPrevious = resignCheckpoint({
    ...checkpoint0,
    cumulative_bytes: String(authority.total_bytes + 1),
    cumulative_records: String(authority.total_records + 1),
  });
  verifySegmentedJsonlCheckpointEncodingV1(forgedPrevious);
  expectFailure(
    () => verifySegmentedJsonlCheckpointAnchorV1({
      checkpoint: forgedPrevious,
      snapshot: authority,
      trusted_checkpoint_sha256: forgedPrevious.checkpoint_sha256,
    }),
    "CHECKPOINT_CUMULATIVE_MISMATCH",
  );
  expectFailure(
    () => verifySegmentedJsonlCheckpointAnchorV1({
      checkpoint: checkpoint0,
      snapshot: authority,
      trusted_checkpoint_sha256: "f".repeat(64),
    }),
    "CHECKPOINT_TRUST_ANCHOR_MISMATCH",
  );

  const checkpoint2Authority = deriveSegmentedJsonlSnapshotAuthorityV1({
    ...manifest,
    generation: manifest.generation + 2,
  });
  const checkpoint2 = deriveSegmentedJsonlCheckpointV1(checkpoint2Authority, anchor1);
  const forkedPredecessor = resignCheckpoint({
    ...checkpoint2,
    previous_checkpoint_sha256: checkpoint0.checkpoint_sha256,
  });
  expectFailure(
    () => verifySegmentedJsonlCheckpointChainV1([
      { checkpoint: checkpoint0, snapshot: authority },
      { checkpoint: checkpoint1, snapshot: nextAuthority },
      { checkpoint: forkedPredecessor, snapshot: checkpoint2Authority },
    ], checkpoint0.checkpoint_sha256),
    "CHECKPOINT_PREDECESSOR_MISMATCH",
  );
  expectFailure(
    () => verifySegmentedJsonlCheckpointChainV1([
      { checkpoint: checkpoint0, snapshot: authority },
      { checkpoint: checkpoint1, snapshot: nextAuthority },
    ], "e".repeat(64)),
    "CHECKPOINT_CHAIN_TRUST_ROOT_MISMATCH",
  );

  let checkpoint = checkpoint0;
  let checkpointAnchor = anchor0;
  let rollingManifest = manifest;
  let maximumCheckpointBytes = Buffer.byteLength(JSON.stringify(checkpoint0), "utf8");
  for (let i = 0; i < 10_000; i++) {
    rollingManifest = { ...rollingManifest, generation: rollingManifest.generation + 1 };
    const rollingAuthority = deriveSegmentedJsonlSnapshotAuthorityV1(rollingManifest);
    const next = deriveSegmentedJsonlCheckpointV1(rollingAuthority, checkpointAnchor);
    verifySegmentedJsonlCheckpointV1(next, rollingAuthority, checkpointAnchor);
    checkpoint = next;
    checkpointAnchor = trustedAnchor(checkpoint, rollingAuthority);
    maximumCheckpointBytes = Math.max(maximumCheckpointBytes, Buffer.byteLength(JSON.stringify(checkpoint), "utf8"));
  }
  assert.ok(maximumCheckpointBytes <= VOID_SEGMENTED_JSONL_MAX_CHECKPOINT_BYTES_V1);
  assert.equal(Array.isArray((checkpoint as any).sealed_segments), false);
  assert.equal(checkpoint.store_generation, manifest.generation + 10_000);
  assert.equal(checkpoint.cumulative_records, String(manifest.total_records));
  assert.equal(checkpoint.cumulative_bytes, String(manifest.total_bytes));

  // The current content-addressed object remains deliberately honest about the
  // unresolved live-tree terminal-generation seam. This fixture keeps that HOLD
  // visible rather than laundering a finite revalidation sweep into authority.
  const raceSource = path.join(tmp, "race-source.jsonl");
  const raceStore = path.join(tmp, "race-store");
  fs.writeFileSync(raceSource, makeSource(6), { mode: 0o600 });
  const raceManifest = buildSegmentedJsonlV1FromFile(raceSource, raceStore, {
    segmentTargetBytes: 1024,
    maxRecordBytes: 900,
  });
  assert.ok(raceManifest.sealed_segments.length >= 2);
  const segment0 = path.join(raceStore, raceManifest.sealed_segments[0].file);
  const segment1 = path.join(raceStore, raceManifest.sealed_segments[1].file);
  const replacement = `${segment0}.replacement`;
  const replacementBytes = Buffer.from(fs.readFileSync(segment0));
  const xIndex = replacementBytes.indexOf(0x78);
  assert.ok(xIndex >= 0, "fixture must contain payload byte x");
  replacementBytes[xIndex] = 0x79;
  fs.writeFileSync(replacement, replacementBytes, { mode: 0o400 });
  fs.chmodSync(replacement, 0o400);

  const require = createRequire(import.meta.url);
  const mutableFs = require("node:fs") as typeof fs;
  const originalOpenSync = (mutableFs as any).openSync;
  let segment1OpenCount = 0;
  let swappedBehindCursor = false;
  let racedAuthority: ReturnType<typeof verifySegmentedJsonlSnapshotAuthorityV1> | null = null;
  try {
    (mutableFs as any).openSync = (...args: any[]) => {
      if (matchesOpenedTarget(args[0], segment1)) {
        segment1OpenCount += 1;
        if (!swappedBehindCursor && segment1OpenCount === 2) {
          fs.renameSync(replacement, segment0);
          swappedBehindCursor = true;
        }
      }
      return originalOpenSync(...args);
    };
    syncBuiltinESMExports();
    racedAuthority = verifySegmentedJsonlSnapshotAuthorityV1(raceStore);
  } finally {
    (mutableFs as any).openSync = originalOpenSync;
    syncBuiltinESMExports();
  }
  assert.equal(swappedBehindCursor, true);
  assert.ok(racedAuthority);
  assert.equal(racedAuthority!.authority.live_tree_terminal_authority, false);
  assert.equal(
    racedAuthority!.authority.manifest_sha256,
    sha256(serializeSegmentedJsonlManifestV1(raceManifest)),
  );
  expectFailure(() => verifySegmentedJsonlV1(raceStore), "SEGMENT_HASH_MISMATCH");

  console.log("content_addressed_manifest_commitment=true");
  console.log("live_tree_terminal_authority=false");
  console.log("checkpoint_snapshot_binding_required=true");
  console.log("checkpoint_snapshot_replay_rejected=true");
  console.log("checkpoint_generation_progression_exact=true");
  console.log("checkpoint_predecessor_trust_anchor_required=true");
  console.log("checkpoint_predecessor_substitution_rejected=true");
  console.log("checkpoint_cumulative_full_store_not_double_counted=true");
  console.log("checkpoint_metadata_lifetime_bounded=true");
  console.log(`checkpoint_max_bytes_observed=${maximumCheckpointBytes}`);
  console.log("behind_cursor_live_tree_mutation_not_promoted_to_terminal_authority=true");
  console.log("VOID_SEGMENTED_JSONL_SNAPSHOT_AUTHORITY_V1_PROOF_GREEN");
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
