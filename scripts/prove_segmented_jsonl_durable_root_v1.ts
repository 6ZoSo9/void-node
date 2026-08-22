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
  deriveSegmentedJsonlSnapshotAuthorityV1,
  deriveSegmentedJsonlCheckpointV1,
  type SegmentedJsonlCheckpointAnchorV1,
} from "../src/storage/segmented_jsonl_snapshot_authority_v1.js";
import {
  deriveSegmentedJsonlMaterializedAuthorityV1,
  type SegmentedJsonlMaterializedAuthorityV1,
} from "../src/storage/segmented_jsonl_materialized_authority_v1.js";
import {
  verifySegmentedJsonlCheckpointAppendOnlyAtUseV1,
  type SegmentedJsonlAppendOnlyCheckpointWitnessV1,
} from "../src/storage/segmented_jsonl_checkpoint_materialized_authority_v1.js";
import {
  publishSegmentedJsonlDurableRootV1,
  readSegmentedJsonlDurableRootV1,
} from "../src/storage/segmented_jsonl_durable_root_v1.js";

function expectFailure(fn: () => unknown, fragment: string): void {
  let seen = "";
  try { fn(); } catch (error) { seen = error instanceof Error ? error.message : String(error); }
  assert.ok(seen.includes(fragment), `expected ${fragment}, got ${seen}`);
}

function sourceBytes(records: number): Buffer {
  return Buffer.from(
    Array.from({ length: records }, (_, index) => JSON.stringify({ v: 1, index, value: `row-${index}` }) + "\n").join(""),
    "utf8",
  );
}

function processStartTicks(pid: number): string {
  const stat = fs.readFileSync(`/proc/${pid}/stat`, "utf8");
  const close = stat.lastIndexOf(")");
  assert.ok(close >= 0);
  const fields = stat.slice(close + 1).trim().split(/\s+/);
  assert.match(fields[19] || "", /^[0-9]+$/);
  return fields[19];
}

function writePublishOwner(lockDir: string, pid: number, startTicks: string, token: string): void {
  fs.writeFileSync(
    path.join(lockDir, "owner.v1.json"),
    JSON.stringify({ v: 1, pid, start_ticks: startTicks, token, state: "held" }) + "\n",
    { flag: "wx", mode: 0o600 },
  );
}

function buildGeneration(
  tmp: string,
  generation: number,
): {
  root: string;
  materializedPath: string;
  snapshot: ReturnType<typeof deriveSegmentedJsonlSnapshotAuthorityV1>;
  materialized: SegmentedJsonlMaterializedAuthorityV1;
} {
  const source = path.join(tmp, `source-${generation}.jsonl`);
  const root = path.join(tmp, `store-${generation}`);
  const materializedPath = path.join(tmp, `materialized-${generation}.jsonl`);
  fs.writeFileSync(source, sourceBytes(generation + 2), { mode: 0o600 });
  const manifest = buildSegmentedJsonlV1FromFile(source, root, {
    segmentTargetBytes: 1024,
    maxRecordBytes: 256,
    generation,
  });
  reconstructSegmentedJsonlV1ToFile(root, materializedPath);
  const snapshot = deriveSegmentedJsonlSnapshotAuthorityV1(manifest);
  const materialized = deriveSegmentedJsonlMaterializedAuthorityV1(root, materializedPath);
  return {
    root,
    materializedPath,
    snapshot,
    materialized,
  };
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "void-segmented-jsonl-durable-root-v1-"));
try {
  fs.chmodSync(tmp, 0o700);
  const durableDir = path.join(tmp, "durable-root");
  fs.mkdirSync(durableDir, { mode: 0o700 });

  const publishLockDir = path.join(durableDir, ".durable-root-publish-v1.lock");
  fs.mkdirSync(publishLockDir, { mode: 0o700 });
  fs.writeFileSync(path.join(publishLockDir, "slot-stage-0.v1"), Buffer.from("{torn-stage-0", "utf8"), { mode: 0o600 });

  const g1 = buildGeneration(tmp, 1);
  const c1 = deriveSegmentedJsonlCheckpointV1(g1.snapshot, null);
  const a1: SegmentedJsonlCheckpointAnchorV1 = {
    checkpoint: c1,
    snapshot: g1.snapshot,
    trusted_checkpoint_sha256: c1.checkpoint_sha256,
  };
  const r1 = publishSegmentedJsonlDurableRootV1(durableDir, {
    checkpoint: c1,
    snapshot: g1.snapshot,
    materialized: g1.materialized,
  });
  assert.equal(r1.store_generation, 1);
  assert.equal(r1.previous_root_sha256, null);
  assert.equal(r1.append_only_witness_sha256, null);
  assert.equal(readSegmentedJsonlDurableRootV1(durableDir)?.root_sha256, r1.root_sha256);
  assert.equal(fs.existsSync(publishLockDir), true, "publication coordination directory is lifetime-bounded and retained");
  assert.equal(fs.existsSync(path.join(publishLockDir, "owner.v1.json")), false, "genesis publication owner must release");
  assert.equal(fs.existsSync(path.join(publishLockDir, "slot-stage-0.v1")), false, "genesis stage alias must be retired");
  const r1Retry = publishSegmentedJsonlDurableRootV1(durableDir, {
    checkpoint: c1,
    snapshot: g1.snapshot,
    materialized: g1.materialized,
  });
  assert.equal(r1Retry.root_sha256, r1.root_sha256, "exact genesis retry must be idempotent");

  fs.writeFileSync(path.join(publishLockDir, "slot-stage-1.v1"), Buffer.from("{torn-stage-1", "utf8"), { mode: 0o600 });

  const g2 = buildGeneration(tmp, 2);
  const c2 = deriveSegmentedJsonlCheckpointV1(g2.snapshot, a1);
  const w2 = verifySegmentedJsonlCheckpointAppendOnlyAtUseV1(
    g2.root,
    g2.materializedPath,
    c2,
    g2.snapshot,
    a1,
    g1.materialized,
    g2.materialized,
    g1.materialized.authority_sha256,
  );
  const r2 = publishSegmentedJsonlDurableRootV1(durableDir, {
    checkpoint: c2,
    snapshot: g2.snapshot,
    materialized: g2.materialized,
    previousAnchor: a1,
    previousMaterialized: g1.materialized,
    appendOnlyWitness: w2,
    trustedAppendOnlyWitnessSha256: w2.witness_sha256,
  });
  assert.equal(r2.store_generation, 2);
  assert.equal(r2.previous_root_sha256, r1.root_sha256);
  assert.equal(r2.append_only_witness_sha256, w2.witness_sha256);
  assert.equal(fs.existsSync(path.join(publishLockDir, "owner.v1.json")), false, "first peer publication owner must release");
  assert.equal(fs.existsSync(path.join(publishLockDir, "slot-stage-1.v1")), false, "first peer stage alias must be retired");
  const r2Input = {
    checkpoint: c2,
    snapshot: g2.snapshot,
    materialized: g2.materialized,
    previousAnchor: a1,
    previousMaterialized: g1.materialized,
    appendOnlyWitness: w2,
    trustedAppendOnlyWitnessSha256: w2.witness_sha256,
  };
  assert.equal(
    publishSegmentedJsonlDurableRootV1(durableDir, r2Input).root_sha256,
    r2.root_sha256,
    "exact successor retry must be idempotent",
  );

  writePublishOwner(publishLockDir, process.pid, processStartTicks(process.pid), "11".repeat(16));
  expectFailure(() => publishSegmentedJsonlDurableRootV1(durableDir, r2Input), "DURABLE_ROOT_PUBLISH_BUSY");
  fs.unlinkSync(path.join(publishLockDir, "owner.v1.json"));

  writePublishOwner(publishLockDir, 99999999, "1", "22".repeat(16));
  assert.equal(
    publishSegmentedJsonlDurableRootV1(durableDir, r2Input).root_sha256,
    r2.root_sha256,
    "stale publisher lock must be recoverable without changing committed truth",
  );
  assert.equal(fs.existsSync(path.join(publishLockDir, "owner.v1.json")), false, "stale publisher owner must be reclaimed and released");
  assert.equal(fs.existsSync(path.join(publishLockDir, "reclaim.v1")), false, "reclaim marker must not survive ownership transfer");

  const slot0 = path.join(durableDir, "durable-root-slot-0.v1.json");
  const slot1 = path.join(durableDir, "durable-root-slot-1.v1.json");
  assert.deepEqual(
    fs.readdirSync(durableDir).sort(),
    [path.basename(slot0), path.basename(slot1), path.basename(publishLockDir)].sort(),
    "durable authority remains bounded to two root slots plus one private coordination directory",
  );
  const slot0Before = fs.statSync(slot0, { bigint: true } as any);
  const slot0Identity = `${slot0Before.dev}:${slot0Before.ino}`;
  const corrupt = Buffer.alloc(8192, 0x20);
  Buffer.from("{broken\n", "utf8").copy(corrupt, 0);
  fs.writeFileSync(slot0, corrupt);
  const corruptFd = fs.openSync(slot0, "r");
  try { fs.fsyncSync(corruptFd); } finally { fs.closeSync(corruptFd); }
  expectFailure(
    () => readSegmentedJsonlDurableRootV1(durableDir),
    "DURABLE_ROOT_DEGRADED_SLOT_REQUIRES_RECOVERY",
  );

  const a2: SegmentedJsonlCheckpointAnchorV1 = {
    checkpoint: c2,
    snapshot: g2.snapshot,
    trusted_checkpoint_sha256: c2.checkpoint_sha256,
  };
  const g3 = buildGeneration(tmp, 3);
  const c3 = deriveSegmentedJsonlCheckpointV1(g3.snapshot, a2);
  const w3 = verifySegmentedJsonlCheckpointAppendOnlyAtUseV1(
    g3.root,
    g3.materializedPath,
    c3,
    g3.snapshot,
    a2,
    g2.materialized,
    g3.materialized,
    g2.materialized.authority_sha256,
  );
  const r3 = publishSegmentedJsonlDurableRootV1(durableDir, {
    checkpoint: c3,
    snapshot: g3.snapshot,
    materialized: g3.materialized,
    previousAnchor: a2,
    previousMaterialized: g2.materialized,
    appendOnlyWitness: w3,
    trustedAppendOnlyWitnessSha256: w3.witness_sha256,
  });
  const slot0After = fs.statSync(slot0, { bigint: true } as any);
  assert.equal(`${slot0After.dev}:${slot0After.ino}`, slot0Identity, "torn target slot must recover in-place on the same durable slot inode");
  assert.equal(r3.previous_root_sha256, r2.root_sha256);
  assert.equal(readSegmentedJsonlDurableRootV1(durableDir)?.root_sha256, r3.root_sha256);
  assert.equal(fs.readdirSync(durableDir).length, 3, "durable authority must remain lifetime-bounded to two slot files plus one lock directory");

  const a3: SegmentedJsonlCheckpointAnchorV1 = {
    checkpoint: c3,
    snapshot: g3.snapshot,
    trusted_checkpoint_sha256: c3.checkpoint_sha256,
  };
  const g4 = buildGeneration(tmp, 4);
  const c4 = deriveSegmentedJsonlCheckpointV1(g4.snapshot, a3);
  const w4: SegmentedJsonlAppendOnlyCheckpointWitnessV1 = verifySegmentedJsonlCheckpointAppendOnlyAtUseV1(
    g4.root,
    g4.materializedPath,
    c4,
    g4.snapshot,
    a3,
    g3.materialized,
    g4.materialized,
    g3.materialized.authority_sha256,
  );

  const savedSlot1 = `${slot1}.owned`;
  fs.renameSync(slot1, savedSlot1);
  const foreign = Buffer.alloc(8192, 0x51);
  fs.writeFileSync(slot1, foreign, { flag: "wx", mode: 0o600 });
  expectFailure(
    () => publishSegmentedJsonlDurableRootV1(durableDir, {
      checkpoint: c4,
      snapshot: g4.snapshot,
      materialized: g4.materialized,
      previousAnchor: a3,
      previousMaterialized: g3.materialized,
      appendOnlyWitness: w4,
      trustedAppendOnlyWitnessSha256: w4.witness_sha256,
    }),
    "DURABLE_ROOT_TARGET_IDENTITY_MISMATCH",
  );
  assert.deepEqual(fs.readFileSync(slot1), foreign, "foreign slot replacement must survive failed publication unchanged");
  expectFailure(
    () => readSegmentedJsonlDurableRootV1(durableDir),
    "DURABLE_ROOT_DEGRADED_SLOT_REQUIRES_RECOVERY",
  );

  console.log("durable_root_first_slot_staging_recovery=true");
  console.log("durable_root_first_peer_staging_recovery=true");
  console.log("durable_root_exact_retry_idempotent=true");
  console.log("durable_root_live_publish_lock_excludes_writer=true");
  console.log("durable_root_stale_publish_lock_recoverable=true");
  console.log("durable_root_two_slot_lifetime_bound=true");
  console.log("durable_root_torn_target_retry_converges=true");
  console.log("durable_root_degraded_slot_never_rolls_back=true");
  console.log("durable_root_foreign_replacement_preserved=true");
  console.log("durable_root_checkpoint_witness_materialized_binding=true");
  console.log("VOID_SEGMENTED_JSONL_DURABLE_ROOT_V1_PROOF_GREEN=true");
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
