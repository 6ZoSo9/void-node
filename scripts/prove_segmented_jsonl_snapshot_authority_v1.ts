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
  verifySegmentedJsonlCheckpointV1,
  verifySegmentedJsonlSnapshotAuthorityV1,
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
  verifySegmentedJsonlCheckpointV1(checkpoint0);
  let checkpoint = checkpoint0;
  let maximumCheckpointBytes = 0;
  for (let i = 0; i < 10_000; i++) {
    checkpoint = deriveSegmentedJsonlCheckpointV1(authority, checkpoint);
    verifySegmentedJsonlCheckpointV1(checkpoint, null, false);
    maximumCheckpointBytes = Math.max(maximumCheckpointBytes, Buffer.byteLength(JSON.stringify(checkpoint), "utf8"));
  }
  assert.ok(maximumCheckpointBytes <= VOID_SEGMENTED_JSONL_MAX_CHECKPOINT_BYTES_V1);
  assert.equal(Array.isArray((checkpoint as any).sealed_segments), false);
  assert.equal(BigInt(checkpoint.cumulative_records), BigInt(manifest.total_records) * 10_001n);
  assert.equal(BigInt(checkpoint.cumulative_bytes), BigInt(manifest.total_bytes) * 10_001n);

  const checkpoint1 = deriveSegmentedJsonlCheckpointV1(authority, checkpoint0);
  verifySegmentedJsonlCheckpointV1(checkpoint1, checkpoint0);
  const badPrevious = { ...checkpoint1, previous_checkpoint_sha256: "0".repeat(64) };
  expectFailure(() => verifySegmentedJsonlCheckpointV1(badPrevious as any, checkpoint0), "CHECKPOINT_DIGEST_MISMATCH");
  const badCumulative = { ...checkpoint1, cumulative_records: String(BigInt(checkpoint1.cumulative_records) + 1n) };
  expectFailure(() => verifySegmentedJsonlCheckpointV1(badCumulative as any, checkpoint0), "CHECKPOINT_DIGEST_MISMATCH");

  // The authoritative contract is content-addressed and deliberately does not
  // claim that mutable live pathnames form one coherent terminal generation.
  // Trigger the exact behind-cursor race that defeats a finite terminal sweep:
  // segment 0 has already passed terminal revalidation when segment 1 enters
  // its terminal revalidation. The logical snapshot identity remains the
  // original manifest commitment, while a later live-tree verification rejects
  // the changed segment.
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

  console.log("content_addressed_snapshot_authority=true");
  console.log("live_tree_terminal_authority=false");
  console.log("checkpoint_metadata_lifetime_bounded=true");
  console.log(`checkpoint_max_bytes_observed=${maximumCheckpointBytes}`);
  console.log("behind_cursor_live_tree_mutation_not_promoted_to_snapshot_identity=true");
  console.log("VOID_SEGMENTED_JSONL_SNAPSHOT_AUTHORITY_V1_PROOF_GREEN");
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
