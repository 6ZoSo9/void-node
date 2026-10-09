#!/usr/bin/env node
// Actual source writer + source lock, but ONLY disposable OS-temp fixtures.
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildBuyVoidCustodyLaunchHighWaterV2 } from
  "../src/economic/buy_void_custody_launch_authority_v2.mjs";
import { testOnlyCreateBuyVoidCustodyLaunchHighWaterWriterV1 as writerFactory,
  VOID_BUY_VOID_CUSTODY_PERMANENT_FENCE_DIRECTORY_V1 as FENCE_NAME } from
  "../src/economic/buy_void_custody_launch_high_water_writer_v1.mjs";
import { testOnlyCreateBuyVoidCustodyLockedAdvanceV1 as lockedFactory,
  VOID_BUY_VOID_CUSTODY_LOCKED_ADVANCE_AUTHORITY_V1 as AUTH,
  testOnlyCreateBuyVoidCustodyPermanentlyFencedLockedAdvanceV1 as fencedFactory } from
  "../src/economic/buy_void_custody_locked_advance_v1.mjs";
import {
  buildBuyVoidCustodyHighWaterTransitionFenceV1 as planFence,
} from "../src/economic/buy_void_custody_high_water_transition_fence_v1.mjs";
import {
  createOnlyBuyVoidCustodyHighWaterFenceRecordV1 as persistFence,
} from "../src/economic/buy_void_custody_high_water_fence_storage_v1.mjs";

const rootSource = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
function gitBlob(p) {
  const bytes = fs.readFileSync(path.join(rootSource, p));
  return crypto.createHash("sha1")
    .update(Buffer.from("blob " + bytes.length + "\0")).update(bytes).digest("hex");
}
assert.equal(gitBlob("src/economic/buy_void_custody_launch_high_water_writer_v1.mjs"),
  "cbf320e127c41e328961e6c843aadefff9326791");
assert.equal(gitBlob("src/economic/buy_void_custody_high_water_exclusive_lock_v1.mjs"),
  "90543eccebad8efe1d5299a318d1d894dba9cd00");
assert.equal(process.platform, "linux");
assert.ok(process.getuid() > 0);

const SOURCE = "sha256:" + "11".repeat(32);
const GENERATION_1 = "0x" + "22".repeat(32);
const GENERATION_2 = "0x" + "55".repeat(32);
const TIP_1 = "sha256:" + "33".repeat(32);
const TIP_2 = "sha256:" + "66".repeat(32);
const HIGH_1 = buildBuyVoidCustodyLaunchHighWaterV2({
  source_composition_id: SOURCE, sequence: 1, generation: GENERATION_1,
  tip_sha256: TIP_1, journal_prefix_sha256: "sha256:" + "44".repeat(32),
});
const HIGH_2 = buildBuyVoidCustodyLaunchHighWaterV2({
  source_composition_id: SOURCE, sequence: 3, generation: GENERATION_2,
  tip_sha256: TIP_2, journal_prefix_sha256: "sha256:" + "77".repeat(32),
});
const JOURNAL_OK = Buffer.from("synthetic-journal-generation-2\n");
const JOURNAL_BAD = Buffer.from("synthetic-journal-unapproved\n");
const RECORD = "buy-void-custody-launch-high-water-v2.json";
const LOCK = ".void-buy-custody-high-water-exclusive-v1.lock";
function sha256(b) {
  return "sha256:" + crypto.createHash("sha256").update(b).digest("hex");
}
function classifier(observed) {
  const journal = observed.generation_journal_bytes;
  const high = observed.custody_high_water_bytes;
  if (journal.equals(JOURNAL_OK) && high?.equals(HIGH_1)) {
    return Object.freeze({
      ready: false, reason: "custody_launch_high_water_advance_required",
      sequence: 3, generation: GENERATION_2, tip_sha256: TIP_2,
      high_water_matches_current: false, high_water_advance_required: true,
      candidate_high_water_json: HIGH_2.toString("utf8"),
      candidate_high_water_sha256: sha256(HIGH_2),
    });
  }
  if (journal.equals(JOURNAL_OK) && high?.equals(HIGH_2)) {
    return Object.freeze({
      ready: true, reason: null, sequence: 3, generation: GENERATION_2,
      tip_sha256: TIP_2, high_water_matches_current: true,
      high_water_advance_required: false,
      candidate_high_water_json: HIGH_2.toString("utf8"),
      candidate_high_water_sha256: sha256(HIGH_2),
    });
  }
  return Object.freeze({ ready: false, reason: "synthetic_authority_mismatch",
    high_water_matches_current: false, high_water_advance_required: false });
}
function makeFixture(name) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "void-locked-actual-" + name + "-"));
  fs.chmodSync(root, 0o700);
  const journalDir = path.join(root, "journal");
  const receiptDir = path.join(root, "receipt");
  const custody = path.join(root, "custody");
  for (const dir of [journalDir, receiptDir, custody]) {
    fs.mkdirSync(dir, { mode: 0o700 });
    fs.chmodSync(dir, 0o700);
  }
  const journal = path.join(journalDir, "generation.jsonl");
  const receipt = path.join(receiptDir, "activation.json");
  for (const [file, value] of [
    [journal, JOURNAL_OK],
    [receipt, Buffer.from("synthetic-inert-receipt\n")],
    [path.join(custody, RECORD), HIGH_1],
  ]) {
    fs.writeFileSync(file, value, { mode: 0o600 });
    fs.chmodSync(file, 0o600);
  }
  return { root, journal, custody,
    options: { generation_journal_path: journal,
      activation_receipt_path: receipt, custody_root: custody } };
}
function readHigh(f) { return fs.readFileSync(path.join(f.custody, RECORD)); }
{
  const f = makeFixture("success");
  try {
    let contenderCalls = 0, hookCalls = 0;
    const contender = lockedFactory(f.options, writerFactory(f.options, observed => {
      contenderCalls += 1; return classifier(observed);
    }));
    const actual = writerFactory(f.options, classifier, () => {
      hookCalls += 1;
      assert.equal(fs.statSync(path.join(f.custody, LOCK)).isDirectory(), true);
      const collision = contender.advance();
      assert.equal(collision.ok, false);
      assert.equal(collision.operation_performed, false);
      assert.equal(collision.exclusive_lock_release_fsynced, false);
    });
    const combined = lockedFactory(f.options, actual);
    assert.equal(combined.inspect().operation_performed, false);
    assert.deepEqual(readHigh(f), HIGH_1);
    assert.equal(fs.existsSync(path.join(f.custody, LOCK)), false);
    const next = combined.advance();
    assert.equal(next.ok, true);
    assert.equal(next.status, "advanced");
    assert.equal(next.operation_performed, true);
    assert.equal(next.exclusive_lock_release_fsynced, true);
    assert.equal(contenderCalls, 0);
    assert.equal(hookCalls, 1);
    assert.deepEqual(readHigh(f), HIGH_2);
    assert.equal(fs.existsSync(path.join(f.custody, LOCK)), false);
    const replay = combined.advance();
    assert.equal(replay.ok, true);
    assert.equal(replay.status, "current");
    assert.equal(replay.operation_performed, false);
    assert.deepEqual(readHigh(f), HIGH_2);
    console.log("actual_high_water_writer_exclusively_advanced=true");
    console.log("competing_writer_blocked_before_classification=true");
    console.log("actual_high_water_idempotent_replay=true");
  } finally { fs.rmSync(f.root, { recursive: true, force: true }); }
}
{
  const f = makeFixture("hold");
  try {
    const writer = writerFactory(f.options, classifier, () => {
      fs.writeFileSync(f.journal, JOURNAL_BAD, { mode: 0o600 });
    });
    const combined = lockedFactory(f.options, writer);
    const failed = combined.advance();
    assert.equal(failed.ok, false);
    assert.equal(failed.status, "held");
    assert.equal(failed.operation_performed, false);
    assert.equal(failed.mutation_truth_known, true);
    assert.equal(failed.exclusive_lock_release_fsynced, false);
    assert.deepEqual(readHigh(f), HIGH_1);
    assert.equal(fs.statSync(path.join(f.custody, LOCK)).isDirectory(), true);
    assert.deepEqual(fs.readdirSync(f.custody).sort(), [LOCK, RECORD].sort());
    const retry = combined.advance();
    assert.equal(retry.ok, false);
    assert.equal(retry.operation_performed, false);
    assert.deepEqual(readHigh(f), HIGH_1);
    console.log("actual_writer_precommit_hold_retains_private_lock=true");
    console.log("failed_actual_writer_does_not_rollback=true");
  } finally { fs.rmSync(f.root, { recursive: true, force: true }); }
}
assert.equal(AUTH.source_only_unmounted, true);
assert.equal(AUTH.production_allocation_mutation_ready, false);
assert.equal(AUTH.presale_activation, false);
assert.equal(AUTH.funds_movement, false);
console.log("production_authority_remains_false=true");
console.log("VOID_BUY_VOID_CUSTODY_LOCKED_ACTUAL_WRITER_V1_GREEN");


function fenceDir(f) { return path.join(f.custody, FENCE_NAME); }
function privateFence(f) {
  fs.mkdirSync(fenceDir(f), { mode: 0o700 });
  fs.chmodSync(fenceDir(f), 0o700);
}
function fenceFile(f, next = HIGH_2) {
  const plan = planFence({
    prior_high_water_bytes: HIGH_1,
    next_high_water_bytes: next,
  });
  assert.equal(plan.status, "transition");
  return {
    plan,
    file: path.join(fenceDir(f), plan.transition_slot_id + ".json"),
  };
}
// Real writer under actual exclusive lock: durable create-only fence must
// predate high-water rename, and read-only inspection must not create either.
{
  const f = makeFixture("permanent-success");
  try {
    privateFence(f);
    const slot = fenceFile(f);
    const candidate = fencedFactory(f.options, classifier, () => {
      assert.equal(fs.statSync(slot.file).isFile(), true);
      assert.deepEqual(fs.readFileSync(slot.file), slot.plan.record_bytes);
      assert.deepEqual(readHigh(f), HIGH_1, "fence must precede rename");
      assert.equal(fs.statSync(path.join(f.custody, LOCK)).isDirectory(), true);
    });
    const observed = candidate.inspect();
    assert.equal(observed.operation_performed, false);
    assert.equal(fs.existsSync(slot.file), false);
    assert.equal(fs.existsSync(path.join(f.custody, LOCK)), false);
    assert.equal(candidate.advance().status, "advanced");
    assert.deepEqual(readHigh(f), HIGH_2);
    assert.deepEqual(fs.readFileSync(slot.file), slot.plan.record_bytes);
    assert.equal(fs.statSync(slot.file).mode & 0o777, 0o600);
    const inode = fs.statSync(slot.file).ino;
    assert.equal(candidate.advance().status, "current");
    assert.equal(fs.statSync(slot.file).ino, inode);
    assert.equal(fs.readdirSync(fenceDir(f)).length, 1);
    assert.equal(fs.existsSync(path.join(f.custody, LOCK)), false);
    console.log("durable_same_prior_fence_before_actual_writer_rename=true");
    console.log("success_and_replay_do_not_overwrite_fence=true");
    console.log("read_only_inspect_creates_no_fence_or_lock=true");
  } finally { fs.rmSync(f.root, { recursive: true, force: true }); }
}
// A crash-shaped failure after fence fsync but before rename leaves BOTH the
// exact permanent next bytes and the prior high-water for qualified recovery.
{
  const f = makeFixture("permanent-interruption");
  try {
    privateFence(f);
    const slot = fenceFile(f);
    let hooks = 0;
    const interrupted = fencedFactory(f.options, classifier, () => {
      hooks += 1;
      assert.deepEqual(fs.readFileSync(slot.file), slot.plan.record_bytes);
      throw new Error("synthetic_crash_after_durable_fence");
    });
    const held = interrupted.advance();
    assert.equal(held.ok, false);
    assert.equal(held.operation_performed, false);
    assert.equal(held.mutation_truth_known, true);
    assert.equal(held.exclusive_lock_release_fsynced, false);
    assert.equal(hooks, 1);
    assert.deepEqual(readHigh(f), HIGH_1);
    assert.deepEqual(fs.readFileSync(slot.file), slot.plan.record_bytes);
    const inode = fs.statSync(slot.file).ino;
    assert.equal(fs.statSync(path.join(f.custody, LOCK)).isDirectory(), true);
    const denied = fencedFactory(f.options, classifier).advance();
    assert.equal(denied.ok, false);
    assert.equal(denied.operation_performed, false);
    // Fixture operator-recovery simulation ONLY. No automatic reaping API.
    fs.rmdirSync(path.join(f.custody, LOCK));
    const resumed = fencedFactory(f.options, classifier).advance();
    assert.equal(resumed.status, "advanced");
    assert.equal(resumed.operation_performed, true);
    assert.deepEqual(readHigh(f), HIGH_2);
    assert.equal(fs.statSync(slot.file).ino, inode);
    assert.equal(fs.readdirSync(fenceDir(f)).length, 1);
    console.log("interrupted_commit_prior_retained_with_permanent_fence=true");
    console.log("stale_private_lock_blocks_unqualified_replay=true");
    console.log("fixture_only_reviewed_lock_reconciliation_allows_exact_replay=true");
  } finally { fs.rmSync(f.root, { recursive: true, force: true }); }
}
// A conflicting next from the SAME prior shares the permanent slot. It must
// never overwrite the existing record or publish a different high-water.
{
  const f = makeFixture("permanent-conflict");
  try {
    privateFence(f);
    const alternative = buildBuyVoidCustodyLaunchHighWaterV2({
      source_composition_id: SOURCE, sequence: 3,
      generation: "0x" + "99".repeat(32),
      tip_sha256: "sha256:" + "88".repeat(32),
      journal_prefix_sha256: "sha256:" + "77".repeat(32),
    });
    const foreign = fenceFile(f, alternative);
    const ours = fenceFile(f);
    assert.equal(foreign.file, ours.file);
    assert.ok(!foreign.plan.record_bytes.equals(ours.plan.record_bytes));
    const stored = persistFence({
      configured_fence_directory: fenceDir(f),
      record_bytes: foreign.plan.record_bytes,
    });
    assert.equal(stored.status, "created");
    const inode = fs.statSync(foreign.file).ino;
    const blocked = fencedFactory(f.options, classifier).advance();
    assert.equal(blocked.ok, false);
    assert.equal(blocked.operation_performed, false);
    assert.deepEqual(readHigh(f), HIGH_1);
    assert.deepEqual(fs.readFileSync(foreign.file), foreign.plan.record_bytes);
    assert.equal(fs.statSync(foreign.file).ino, inode);
    assert.equal(fs.statSync(path.join(f.custody, LOCK)).isDirectory(), true);
    console.log("competing_successor_from_same_prior_holds_without_rollback=true");
    console.log("permanent_foreign_slot_inode_bytes_preserved=true");
  } finally { fs.rmSync(f.root, { recursive: true, force: true }); }
}
// No implicit mkdir of privileged storage; missing preprovisioned private
// fence directory must HOLD before any high-water record is replaced.
{
  const f = makeFixture("fence-unprovisioned");
  try {
    const failed = fencedFactory(f.options, classifier).advance();
    assert.equal(failed.ok, false);
    assert.equal(failed.operation_performed, false);
    assert.deepEqual(readHigh(f), HIGH_1);
    assert.equal(fs.existsSync(fenceDir(f)), false);
    console.log("preprovisioned_fence_storage_required=true");
  } finally { fs.rmSync(f.root, { recursive: true, force: true }); }
}
assert.equal(AUTH.source_only_unmounted, true);
assert.equal(AUTH.production_allocation_mutation_ready, false);
console.log("permanent_fence_writer_production_qualification=false");
console.log("VOID_BUY_VOID_CUSTODY_PERMANENT_FENCED_LOCKED_ADVANCE_V1_GREEN");
