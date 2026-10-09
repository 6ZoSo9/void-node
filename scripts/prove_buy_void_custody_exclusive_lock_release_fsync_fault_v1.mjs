#!/usr/bin/env node
// Disposable, source-only fault-cut disclosure for the UNMOUNTED custody lock.
// No production custody files, transactions, signers, or services are opened.
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  VOID_BUY_VOID_CUSTODY_HIGH_WATER_EXCLUSIVE_LOCK_POLICY_V1 as POLICY,
  withBuyVoidCustodyHighWaterExclusiveLockV1 as withLock,
} from "../src/economic/buy_void_custody_high_water_exclusive_lock_v1.mjs";

const SOURCE = fileURLToPath(new URL(
  "../src/economic/buy_void_custody_high_water_exclusive_lock_v1.mjs",
  import.meta.url,
));
const SOURCE_GIT_BLOB = "90543eccebad8efe1d5299a318d1d894dba9cd00";
const LOCK_NAME = ".void-buy-custody-high-water-exclusive-v1.lock";
const bytes = fs.readFileSync(SOURCE);
const actualBlob = crypto.createHash("sha1")
  .update(Buffer.from("blob " + bytes.length + "\0"))
  .update(bytes).digest("hex");
assert.equal(actualBlob, SOURCE_GIT_BLOB, "owner source changed: re-review fault case");
assert.equal(process.platform, "linux");
assert.ok(typeof process.getuid === "function" && process.getuid() > 0,
  "nonroot synthetic Linux runner required");
assert.equal(POLICY.callback_failure_lock_retained, true);
assert.equal(POLICY.pre_release_failure_lock_retained, true);
assert.equal(POLICY.durable_release_success_requires_parent_fsync, true);
assert.equal(POLICY.post_rmdir_fsync_failure_lock_retention_guaranteed, false);
assert.equal(POLICY.release_failure_requires_separate_recovery_authority, true);
for (const flag of [
  "custody_high_water_writer_implemented",
  "installed_custody_service_uid_qualified",
  "production_allocation_mutation_ready",
  "funds_moved",
]) assert.equal(POLICY[flag], false, flag);

const home = fs.mkdtempSync(path.join(os.tmpdir(), "void-lock-fsync-disclosure-"));
const privateDir = path.join(home, "private");
const lockPath = path.join(privateDir, LOCK_NAME);
const originalFsync = fs.fsyncSync;
const originalRmdir = fs.rmdirSync;
const makeEio = stage => Object.assign(
  new Error("synthetic_lock_" + stage + "_EIO"), {code:"EIO"},
);
function interceptFsync(failCall) {
  let calls = 0;
  fs.fsyncSync = function (...args) {
    calls++;
    if (calls === failCall) throw makeEio("fsync_" + failCall);
    return originalFsync.apply(fs, args);
  };
  return () => calls;
}
const restore = () => {
  fs.fsyncSync = originalFsync;
  fs.rmdirSync = originalRmdir;
};
const childModule = new URL(
  "../src/economic/buy_void_custody_high_water_exclusive_lock_v1.mjs",
  import.meta.url,
).href;
const childJs = [
  'import { withBuyVoidCustodyHighWaterExclusiveLockV1 as lock } from ' +
    JSON.stringify(childModule) + ";",
  "try {",
  '  lock({private_directory:process.argv[1]}, () => "subsequent-acquire");',
  '  console.log("SUBSEQUENT_OS_PROCESS_ACQUIRED");',
  "} catch (err) {",
  "  console.error(String(err?.message || err));",
  "  process.exitCode = 31;",
  "}",
].join("\n");
function attemptChild() {
  const result = spawnSync(
    process.execPath,
    ["--input-type=module", "--eval", childJs, privateDir],
    {
      encoding:"utf8", timeout:6000, maxBuffer:16384,
      env:{PATH:"/usr/bin:/bin", HOME:"/nonexistent", LANG:"C", TZ:"UTC"},
    },
  );
  assert.equal(result.error, undefined);
  return result;
}
try {
  fs.chmodSync(home, 0o700);
  fs.mkdirSync(privateDir, {mode:0o700});
  fs.chmodSync(privateDir, 0o700);
  let callbacks = 0;

  // Control: first directory fsync fails BEFORE callback; the newly-created
  // lock directory is deliberately retained, and a child cannot take over.
  let count = interceptFsync(1);
  try {
    assert.throws(() => withLock({private_directory:privateDir}, () => {
      callbacks++;
      return "should-never-run";
    }), /synthetic_lock_fsync_1_EIO/);
  } finally { restore(); }
  assert.equal(count(), 1);
  assert.equal(callbacks, 0);
  assert.equal(fs.lstatSync(lockPath).isDirectory(), true);
  assert.equal(attemptChild().status, 31);
  fs.rmdirSync(lockPath); // disposable fixture cleanup only

  // Control: failure of rmdir itself retains the lock after callback.
  let deniedRmdir = false;
  fs.rmdirSync = function (p, ...args) {
    if (!deniedRmdir && String(p).endsWith("/"+LOCK_NAME)) {
      deniedRmdir = true;
      throw makeEio("rmdir");
    }
    return originalRmdir.call(fs, p, ...args);
  };
  try {
    assert.throws(() => withLock({private_directory:privateDir}, () => {
      callbacks++;
      return "callback-finished";
    }), /synthetic_lock_rmdir_EIO/);
  } finally { restore(); }
  assert.equal(deniedRmdir, true);
  assert.equal(callbacks, 1);
  assert.equal(fs.lstatSync(lockPath).isDirectory(), true);
  assert.equal(attemptChild().status, 31);
  fs.rmdirSync(lockPath); // disposable fixture cleanup only

  // Finding: second parent-directory fsync fails AFTER rmdir succeeds.
  // The API reports failure, but the live lock pathname is already absent.
  // A separate operating-system process can enter the critical section.
  count = interceptFsync(2);
  try {
    assert.throws(() => withLock({private_directory:privateDir}, () => {
      callbacks++;
      return "callback-already-finished";
    }), /synthetic_lock_fsync_2_EIO/);
  } finally { restore(); }
  assert.equal(count(), 2);
  assert.equal(callbacks, 2);
  assert.equal(fs.existsSync(lockPath), false,
    "reported failed release already removed the live lock");
  const afterFailedRelease = attemptChild();
  assert.equal(afterFailedRelease.status, 0,
    "second process can acquire after reported release failure");
  assert.match(afterFailedRelease.stdout, /SUBSEQUENT_OS_PROCESS_ACQUIRED/);
  assert.equal(fs.existsSync(lockPath), false);

  console.log("VOID_CUSTODY_HIGH_WATER_RELEASE_FSYNC_FAULT_DISCLOSURE_V1_REPRODUCED");
  console.log("before_callback_fsync_failure_lock_retained=true");
  console.log("failed_rmdir_lock_retained=true");
  console.log("after_rmdir_fsync_failure_reported=true");
  console.log("after_rmdir_fsync_failure_lock_retained=false");
  console.log("independent_process_acquires_after_reported_release_failure=true");
  console.log("live_power_loss_tested=false");
  console.log("production_writer_implemented=false");
  console.log("source_only_unmounted=true");
  console.log("production_allocation_mutation_ready=false");
  console.log("funds_moved=false");
} finally {
  restore();
  fs.rmSync(home, {recursive:true,force:true});
}
