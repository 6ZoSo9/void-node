// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025 6ZoSo9

import assert from "node:assert/strict";
import * as crypto from "node:crypto";
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
  verifySegmentedJsonlDurableRootMaterializedAtUseV1,
  type SegmentedJsonlDurableRootSlotV1,
  type SegmentedJsonlDurableRootV1,
} from "../src/storage/segmented_jsonl_durable_root_v1.js";

function expectFailure(fn: () => unknown, fragment: string): void {
  let seen = "";
  try { fn(); } catch (error) { seen = error instanceof Error ? error.message : String(error); }
  assert.ok(seen.includes(fragment), `expected ${fragment}, got ${seen}`);
}

function sha256(data: Buffer | string): string {
  return crypto.createHash("sha256").update(data).digest("hex");
}

function canonicalJson(value: unknown): string {
  return JSON.stringify(value);
}

function sourceBytes(records: number): Buffer {
  return Buffer.from(
    Array.from({ length: records }, (_, index) => JSON.stringify({ v: 1, index, value: `row-${index}` }) + "\n").join(""),
    "utf8",
  );
}

function processBootId(): string {
  const bootId = fs.readFileSync("/proc/sys/kernel/random/boot_id", "utf8").trim().toLowerCase();
  assert.match(bootId, /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  return bootId;
}

function processStartTicks(pid: number): string {
  const stat = fs.readFileSync(`/proc/${pid}/stat`, "utf8");
  const close = stat.lastIndexOf(")");
  assert.ok(close >= 0);
  const fields = stat.slice(close + 1).trim().split(/\s+/);
  assert.match(fields[19] || "", /^[0-9]+$/);
  return fields[19];
}

function writePublishOwner(lockDir: string, pid: number, startTicks: string, token: string, bootId = processBootId()): void {
  fs.writeFileSync(
    path.join(lockDir, "owner.v1.json"),
    JSON.stringify({ v: 1, boot_id: bootId, pid, start_ticks: startTicks, token, state: "held" }) + "\n",
    { flag: "wx", mode: 0o600 },
  );
}

function fsyncDirectory(directory: string): void {
  const fd = fs.openSync(directory, "r");
  try { fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
}

function encodeSlotForProof(slot: SegmentedJsonlDurableRootSlotV1): Buffer {
  const json = Buffer.from(canonicalJson(slot), "utf8");
  assert.ok(json.length + 1 <= 8192);
  const body = Buffer.alloc(8192, 0x20);
  json.copy(body, 0);
  body[json.length] = 0x0a;
  return body;
}

function slotForProof(
  index: 0 | 1,
  identity: { dev: string; ino: string },
  peer: { dev: string; ino: string } | null,
  root: SegmentedJsonlDurableRootV1,
): SegmentedJsonlDurableRootSlotV1 {
  const core = {
    v: 1 as const,
    format: "VOID_SEGMENTED_JSONL_DURABLE_ROOT_SLOT_V1" as const,
    slot_index: index,
    slot_dev: identity.dev,
    slot_ino: identity.ino,
    peer_slot_dev: peer?.dev ?? null,
    peer_slot_ino: peer?.ino ?? null,
    root,
  };
  return { ...core, slot_sha256: sha256(canonicalJson(core)) };
}

function stageIntentNameForProof(
  index: 0 | 1,
  publisherToken: string,
  identity: { dev: string; ino: string },
  slot: SegmentedJsonlDurableRootSlotV1,
): string {
  const intentSha = sha256(canonicalJson({
    v: 1,
    target_slot: index,
    publisher_token: publisherToken,
    predecessor_root_sha256: slot.root.previous_root_sha256,
    candidate_root_sha256: slot.root.root_sha256,
    stage_dev: identity.dev,
    stage_ino: identity.ino,
    slot_sha256: slot.slot_sha256,
  }));
  return `slot-stage-${index}-${publisherToken}-${intentSha}.v1`;
}

function createStageIntentForProof(
  lockDir: string,
  index: 0 | 1,
  publisherToken: string,
  root: SegmentedJsonlDurableRootV1,
  peer: { dev: string; ino: string } | null,
): { path: string; identity: { dev: string; ino: string }; slot: SegmentedJsonlDurableRootSlotV1 } {
  const tempPath = path.join(lockDir, `proof-stage-${index}-${publisherToken}.tmp`);
  const fd = fs.openSync(tempPath, "wx+", 0o600);
  try {
    const stat = fs.fstatSync(fd, { bigint: true } as any);
    const identity = { dev: String(stat.dev), ino: String(stat.ino) };
    const slot = slotForProof(index, identity, peer, root);
    const body = encodeSlotForProof(slot);
    let off = 0;
    while (off < body.length) {
      const n = fs.writeSync(fd, body, off, body.length - off, off);
      assert.ok(n > 0);
      off += n;
    }
    fs.fchmodSync(fd, 0o600);
    fs.fsyncSync(fd);
    const intentName = stageIntentNameForProof(index, publisherToken, identity, slot);
    const intentPath = path.join(lockDir, intentName);
    fs.linkSync(tempPath, intentPath);
    fsyncDirectory(lockDir);
    fs.unlinkSync(tempPath);
    fsyncDirectory(lockDir);
    return { path: intentPath, identity, slot };
  } finally { fs.closeSync(fd); }
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
  const slot0 = path.join(durableDir, "durable-root-slot-0.v1.json");
  const slot1 = path.join(durableDir, "durable-root-slot-1.v1.json");
  const foreignStaticStage0 = path.join(publishLockDir, "slot-stage-0.v1");
  const foreignStaticStage0Bytes = Buffer.from("{foreign-static-stage-0", "utf8");
  fs.writeFileSync(foreignStaticStage0, foreignStaticStage0Bytes, { mode: 0o600 });
  const foreignStaticStage0Stat = fs.statSync(foreignStaticStage0, { bigint: true } as any);

  const g1 = buildGeneration(tmp, 1);
  const c1 = deriveSegmentedJsonlCheckpointV1(g1.snapshot, null);
  const a1: SegmentedJsonlCheckpointAnchorV1 = {
    checkpoint: c1,
    snapshot: g1.snapshot,
    trusted_checkpoint_sha256: c1.checkpoint_sha256,
  };
  const r1Input = {
    checkpoint: c1,
    snapshot: g1.snapshot,
    materialized: g1.materialized,
  };
  const r1 = publishSegmentedJsonlDurableRootV1(durableDir, r1Input);
  assert.equal(r1.store_generation, 1);
  assert.equal(r1.previous_root_sha256, null);
  assert.equal(r1.append_only_witness_sha256, null);
  assert.equal(readSegmentedJsonlDurableRootV1(durableDir)?.root_sha256, r1.root_sha256);
  assert.equal(fs.existsSync(publishLockDir), true, "publication coordination directory is lifetime-bounded and retained");
  assert.equal(fs.existsSync(path.join(publishLockDir, "owner.v1.json")), false, "genesis publication owner must release");
  const foreignStaticStage0After = fs.statSync(foreignStaticStage0, { bigint: true } as any);
  assert.equal(foreignStaticStage0After.dev, foreignStaticStage0Stat.dev);
  assert.equal(foreignStaticStage0After.ino, foreignStaticStage0Stat.ino);
  assert.deepEqual(fs.readFileSync(foreignStaticStage0), foreignStaticStage0Bytes, "legacy/static foreign stage must never be adopted or rewritten");

  const recoveryDir = path.join(tmp, "durable-root-intent-recovery");
  fs.mkdirSync(recoveryDir, { mode: 0o700 });
  const recoveryLockDir = path.join(recoveryDir, ".durable-root-publish-v1.lock");
  fs.mkdirSync(recoveryLockDir, { mode: 0o700 });
  const ownedRecoveryIntent = createStageIntentForProof(recoveryLockDir, 0, "aa".repeat(16), r1, null);
  assert.equal(fs.existsSync(path.join(recoveryDir, "durable-root-slot-0.v1.json")), false);
  const recoveredR1 = publishSegmentedJsonlDurableRootV1(recoveryDir, r1Input);
  assert.equal(recoveredR1.root_sha256, r1.root_sha256, "intent-bound owned stage must recover to canonical genesis");
  assert.equal(fs.existsSync(ownedRecoveryIntent.path), false, "recovered intent alias must retire");
  assert.equal(fs.statSync(path.join(recoveryDir, "durable-root-slot-0.v1.json"), { bigint: true } as any).nlink, 1n);

  const r1Retry = publishSegmentedJsonlDurableRootV1(durableDir, r1Input);
  assert.equal(r1Retry.root_sha256, r1.root_sha256, "exact genesis retry must be idempotent");

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
  const r2Input = {
    checkpoint: c2,
    snapshot: g2.snapshot,
    materialized: g2.materialized,
    previousAnchor: a1,
    previousMaterialized: g1.materialized,
    appendOnlyWitness: w2,
    trustedAppendOnlyWitnessSha256: w2.witness_sha256,
  };

  const foreignIntentToken = "bb".repeat(16);
  const foreignIntentPath = path.join(publishLockDir, `slot-stage-1-${foreignIntentToken}-${"0".repeat(64)}.v1`);
  const foreignIntentBytes = Buffer.from("{foreign-intent-stage", "utf8");
  fs.writeFileSync(foreignIntentPath, foreignIntentBytes, { flag: "wx", mode: 0o600 });
  const foreignIntentStat = fs.statSync(foreignIntentPath, { bigint: true } as any);
  expectFailure(() => publishSegmentedJsonlDurableRootV1(durableDir, r2Input), "DURABLE_ROOT_STAGE_INTENT_TORN");
  const foreignIntentAfter = fs.statSync(foreignIntentPath, { bigint: true } as any);
  assert.equal(foreignIntentAfter.dev, foreignIntentStat.dev);
  assert.equal(foreignIntentAfter.ino, foreignIntentStat.ino);
  assert.deepEqual(fs.readFileSync(foreignIntentPath), foreignIntentBytes, "foreign stage intent must survive rejection unchanged");
  fs.unlinkSync(foreignIntentPath);
  fsyncDirectory(publishLockDir);

  const slot0IdentityStat = fs.statSync(slot0, { bigint: true } as any);
  const slot0Peer = { dev: String(slot0IdentityStat.dev), ino: String(slot0IdentityStat.ino) };
  const { root_sha256: _r1Digest, ...fakeRootBase } = r1;
  const fakeRootCore = {
    ...fakeRootBase,
    store_generation: 2,
    append_only_witness_sha256: "33".repeat(32),
    previous_root_sha256: "44".repeat(32),
  };
  const wrongPredecessorRoot: SegmentedJsonlDurableRootV1 = {
    ...fakeRootCore,
    root_sha256: sha256(canonicalJson(fakeRootCore)),
  };
  const wrongPredecessorIntent = createStageIntentForProof(
    publishLockDir,
    1,
    "cc".repeat(16),
    wrongPredecessorRoot,
    slot0Peer,
  );
  const wrongPredecessorBytes = fs.readFileSync(wrongPredecessorIntent.path);
  const wrongPredecessorStat = fs.statSync(wrongPredecessorIntent.path, { bigint: true } as any);
  expectFailure(() => publishSegmentedJsonlDurableRootV1(durableDir, r2Input), "DURABLE_ROOT_STAGE_INTENT_PREDECESSOR_MISMATCH");
  const wrongPredecessorAfter = fs.statSync(wrongPredecessorIntent.path, { bigint: true } as any);
  assert.equal(wrongPredecessorAfter.dev, wrongPredecessorStat.dev);
  assert.equal(wrongPredecessorAfter.ino, wrongPredecessorStat.ino);
  assert.deepEqual(fs.readFileSync(wrongPredecessorIntent.path), wrongPredecessorBytes, "wrong-predecessor intent must survive rejection unchanged");
  fs.unlinkSync(wrongPredecessorIntent.path);
  fsyncDirectory(publishLockDir);

  const foreignStaticStage1 = path.join(publishLockDir, "slot-stage-1.v1");
  const foreignStaticStage1Bytes = Buffer.from("{foreign-static-stage-1", "utf8");
  fs.writeFileSync(foreignStaticStage1, foreignStaticStage1Bytes, { mode: 0o600 });
  const foreignStaticStage1Stat = fs.statSync(foreignStaticStage1, { bigint: true } as any);

  const r2 = publishSegmentedJsonlDurableRootV1(durableDir, r2Input);
  assert.equal(r2.store_generation, 2);
  assert.equal(r2.previous_root_sha256, r1.root_sha256);
  assert.equal(r2.append_only_witness_sha256, w2.witness_sha256);
  assert.equal(fs.existsSync(path.join(publishLockDir, "owner.v1.json")), false, "first peer publication owner must release");
  const foreignStaticStage1After = fs.statSync(foreignStaticStage1, { bigint: true } as any);
  assert.equal(foreignStaticStage1After.dev, foreignStaticStage1Stat.dev);
  assert.equal(foreignStaticStage1After.ino, foreignStaticStage1Stat.ino);
  assert.deepEqual(fs.readFileSync(foreignStaticStage1), foreignStaticStage1Bytes, "second legacy/static foreign stage must never be adopted or rewritten");
  assert.equal(
    publishSegmentedJsonlDurableRootV1(durableDir, r2Input).root_sha256,
    r2.root_sha256,
    "exact successor retry must be idempotent",
  );

  const trustedR2Bytes = verifySegmentedJsonlDurableRootMaterializedAtUseV1(
    durableDir,
    g2.root,
    g2.materializedPath,
    g2.materialized,
    r2.root_sha256,
    reader => reader.read(0, reader.total_bytes),
  );
  assert.deepEqual(
    trustedR2Bytes,
    sourceBytes(4),
    "externally trusted durable root must consume only its exact materialized bytes",
  );
  expectFailure(
    () => verifySegmentedJsonlDurableRootMaterializedAtUseV1(
      durableDir,
      g2.root,
      g2.materializedPath,
      g2.materialized,
      r1.root_sha256,
      reader => reader.read(0, reader.total_bytes),
    ),
    "DURABLE_ROOT_TRUST_ROOT_MISMATCH",
  );
  expectFailure(
    () => verifySegmentedJsonlDurableRootMaterializedAtUseV1(
      recoveryDir,
      g1.root,
      g1.materializedPath,
      g1.materialized,
      r2.root_sha256,
      reader => reader.read(0, reader.total_bytes),
    ),
    "DURABLE_ROOT_TRUST_ROOT_MISMATCH",
  );
  expectFailure(
    () => verifySegmentedJsonlDurableRootMaterializedAtUseV1(
      durableDir,
      g1.root,
      g1.materializedPath,
      g1.materialized,
      r2.root_sha256,
      reader => reader.read(0, reader.total_bytes),
    ),
    "DURABLE_ROOT_MATERIALIZED_AUTHORITY_MISMATCH",
  );

  const ownerPath = path.join(publishLockDir, "owner.v1.json");
  const reclaimPath = path.join(publishLockDir, "reclaim.v1");
  const bootId = processBootId();
  const startTicks = processStartTicks(process.pid);

  writePublishOwner(publishLockDir, process.pid, startTicks, "11".repeat(16));
  expectFailure(() => publishSegmentedJsonlDurableRootV1(durableDir, r2Input), "DURABLE_ROOT_PUBLISH_BUSY");
  fs.unlinkSync(ownerPath);

  const differentBootId = bootId === "00000000-0000-0000-0000-000000000000"
    ? "ffffffff-ffff-ffff-ffff-ffffffffffff"
    : "00000000-0000-0000-0000-000000000000";
  writePublishOwner(publishLockDir, process.pid, startTicks, "12".repeat(16), differentBootId);
  assert.equal(
    publishSegmentedJsonlDurableRootV1(durableDir, r2Input).root_sha256,
    r2.root_sha256,
    "same pid/start ticks from a different boot epoch must be stale and reclaimable",
  );
  assert.equal(fs.existsSync(ownerPath), false);
  assert.equal(fs.existsSync(reclaimPath), false);

  writePublishOwner(publishLockDir, 99999999, "1", "22".repeat(16));
  assert.equal(
    publishSegmentedJsonlDurableRootV1(durableDir, r2Input).root_sha256,
    r2.root_sha256,
    "stale publisher lock must be recoverable without changing committed truth",
  );
  assert.equal(fs.existsSync(ownerPath), false, "stale publisher owner must be reclaimed and released");
  assert.equal(fs.existsSync(reclaimPath), false, "reclaim marker must not survive ownership transfer");

  writePublishOwner(publishLockDir, 99999999, "1", "23".repeat(16));
  fs.linkSync(ownerPath, reclaimPath);
  fsyncDirectory(publishLockDir);
  assert.equal(
    publishSegmentedJsonlDurableRootV1(durableDir, r2Input).root_sha256,
    r2.root_sha256,
    "crash after exact stale-owner reclaim claim must converge",
  );
  assert.equal(fs.existsSync(ownerPath), false);
  assert.equal(fs.existsSync(reclaimPath), false);

  writePublishOwner(publishLockDir, 99999999, "1", "24".repeat(16));
  fs.linkSync(ownerPath, reclaimPath);
  fs.unlinkSync(ownerPath);
  fsyncDirectory(publishLockDir);
  assert.equal(
    publishSegmentedJsonlDurableRootV1(durableDir, r2Input).root_sha256,
    r2.root_sha256,
    "crash after claimed stale owner unlink must converge from the hard-link reclaim witness",
  );
  assert.equal(fs.existsSync(ownerPath), false);
  assert.equal(fs.existsSync(reclaimPath), false);

  writePublishOwner(publishLockDir, process.pid, startTicks, "25".repeat(16));
  fs.linkSync(ownerPath, reclaimPath);
  fsyncDirectory(publishLockDir);
  expectFailure(() => publishSegmentedJsonlDurableRootV1(durableDir, r2Input), "DURABLE_ROOT_PUBLISH_BUSY");
  const liveOwnerStat = fs.statSync(ownerPath, { bigint: true } as any);
  const liveReclaimStat = fs.statSync(reclaimPath, { bigint: true } as any);
  assert.equal(liveOwnerStat.dev, liveReclaimStat.dev);
  assert.equal(liveOwnerStat.ino, liveReclaimStat.ino, "live exact owner claim witness must never be stolen");
  fs.unlinkSync(reclaimPath);
  fs.unlinkSync(ownerPath);

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

  console.log("durable_root_owned_stage_intent_retry_converges=true");
  console.log("durable_root_foreign_static_stage_preserved=true");
  console.log("durable_root_foreign_stage_intent_preserved=true");
  console.log("durable_root_wrong_predecessor_intent_preserved=true");
  console.log("durable_root_exact_retry_idempotent=true");
  console.log("durable_root_trusted_materialized_use_exact_bytes=true");
  console.log("durable_root_external_trust_root_rejects_local_rollback=true");
  console.log("durable_root_rejects_self_consistent_foreign_materialized_authority=true");
  console.log("durable_root_live_publish_lock_excludes_writer=true");
  console.log("durable_root_boot_epoch_prevents_pid_start_alias=true");
  console.log("durable_root_stale_publish_lock_recoverable=true");
  console.log("durable_root_reclaim_marker_claim_crash_recoverable=true");
  console.log("durable_root_reclaim_marker_owner_unlink_crash_recoverable=true");
  console.log("durable_root_live_reclaim_witness_not_stolen=true");
  console.log("durable_root_two_slot_lifetime_bound=true");
  console.log("durable_root_torn_target_retry_converges=true");
  console.log("durable_root_degraded_slot_never_rolls_back=true");
  console.log("durable_root_foreign_replacement_preserved=true");
  console.log("durable_root_checkpoint_witness_materialized_binding=true");
  console.log("VOID_SEGMENTED_JSONL_DURABLE_ROOT_V1_PROOF_GREEN=true");
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
