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
import { testOnlyCreateBuyVoidCustodyLaunchHighWaterWriterV1 as writerFactory } from
  "../src/economic/buy_void_custody_launch_high_water_writer_v1.mjs";
import { testOnlyCreateBuyVoidCustodyLockedAdvanceV1 as lockedFactory,
  VOID_BUY_VOID_CUSTODY_LOCKED_ADVANCE_AUTHORITY_V1 as AUTH } from
  "../src/economic/buy_void_custody_locked_advance_v1.mjs";

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
