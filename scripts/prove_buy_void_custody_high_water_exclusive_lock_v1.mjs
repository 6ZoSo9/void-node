#!/usr/bin/env node
// Disposable, source-only locking proof. No production custody path is used.
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  VOID_BUY_VOID_CUSTODY_HIGH_WATER_EXCLUSIVE_LOCK_POLICY_V1 as POLICY,
  withBuyVoidCustodyHighWaterExclusiveLockV1 as withLock,
} from "../src/economic/buy_void_custody_high_water_exclusive_lock_v1.mjs";

assert.equal(process.platform, "linux");
assert.ok(typeof process.getuid === "function" && process.getuid() > 0,
  "unprivileged Linux runner required; root cannot qualify custody policy");
assert.equal(POLICY.installed_custody_service_uid_qualified, false);
assert.equal(POLICY.custody_high_water_writer_implemented, false);
assert.equal(POLICY.production_allocation_mutation_ready, false);
assert.equal(POLICY.stale_lock_automatic_takeover, false);
assert.equal(POLICY.failed_transaction_lock_release, false);

const ROOT = fs.mkdtempSync(path.join(os.tmpdir(), "void-hw-lock-test-"));
const PRIVATE = path.join(ROOT, "custody-private");
const LINK = path.join(ROOT, "forged-link");
const LOCK_NAME = ".void-buy-custody-high-water-exclusive-v1.lock";
const lockPath = path.join(PRIVATE, LOCK_NAME);
const moduleUrl = pathToFileURL(path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../src/economic/buy_void_custody_high_water_exclusive_lock_v1.mjs",
)).href;
const childSource = [
  'import { withBuyVoidCustodyHighWaterExclusiveLockV1 as lock } from ' +
    JSON.stringify(moduleUrl) + ';',
  'try {',
  '  const r = lock({private_directory: process.argv[1]}, () => "child-confirmed");',
  '  if(r.result !== "child-confirmed" || r.production_allocation_mutation_ready !== false) throw Error("unqualified_child_result");',
  '  console.log("CHILD_LOCKED");',
  '} catch(e) {',
  '  console.error(String(e?.message || e));',
  '  process.exitCode = 23;',
  '}',
].join("\n");
function child() {
  const x = spawnSync(process.execPath,
    ["--input-type=module", "--eval", childSource, PRIVATE], {
      encoding: "utf8",
      timeout: 6000,
      maxBuffer: 16384,
      env: { PATH: "/usr/bin:/bin", HOME: "/nonexistent", LANG: "C", TZ: "UTC" },
    });
  assert.equal(x.error, undefined);
  return x;
}
function rootReady() {
  fs.mkdirSync(PRIVATE, {mode:0o700});
  fs.chmodSync(PRIVATE,0o700);
}
try {
  fs.chmodSync(ROOT,0o700);
  rootReady();
  let completed = false;
  const first = withLock({private_directory:PRIVATE}, () => {
    completed = true;
    assert.equal(fs.statSync(lockPath).isDirectory(), true);
    assert.equal(fs.statSync(lockPath).mode & 0o077, 0);
    // Re-entry within this process must fail under the same mkdir exclusion.
    assert.throws(() => withLock({private_directory:PRIVATE}, () => {}),
      /custody_hw_exclusive_lock_already_exists/u);
    const concurrent = child();
    assert.equal(concurrent.status, 23,"second OS process must HOLD");
    assert.match(concurrent.stderr,/custody_hw_exclusive_lock_already_exists/u);
    assert.doesNotMatch(concurrent.stdout,/CHILD_LOCKED/u);
    return "source-only-critical-section";
  });
  assert.equal(completed,true);
  assert.equal(first.result,"source-only-critical-section");
  assert.equal(first.lock_release_fsynced,true);
  assert.equal(first.custody_high_water_writer_implemented,false);
  assert.equal(first.installed_custody_service_uid_qualified,false);
  assert.equal(first.production_allocation_mutation_ready,false);
  assert.equal(first.funds_moved,false);
  assert.equal(fs.existsSync(lockPath),false);
  const afterRelease=child();
  assert.equal(afterRelease.status,0);
  assert.match(afterRelease.stdout,/CHILD_LOCKED/u);
  assert.equal(fs.existsSync(lockPath),false);

  // A locked-down path is mandatory; no public/group-readable parent.
  fs.chmodSync(PRIVATE,0o755);
  assert.throws(() => withLock({private_directory:PRIVATE}, () => {}),
    /custody_hw_exclusive_private_owner_mode_required/u);
  fs.chmodSync(PRIVATE,0o1700);
  assert.throws(() => withLock({private_directory:PRIVATE}, () => {}),
    /custody_hw_exclusive_private_owner_mode_required/u,
    "sticky/special bits are not exact private 0700");
  fs.chmodSync(PRIVATE,0o700);
  fs.symlinkSync(PRIVATE,LINK,"dir");
  assert.throws(() => withLock({private_directory:LINK},()=>{}),
    /ELOOP|ENOTDIR|custody_hw_exclusive_ancestor_symlink/u);
  fs.unlinkSync(LINK);

  // Crash-recovery safety model: a stale lock is NOT silently deleted.
  fs.mkdirSync(lockPath,{mode:0o700});
  assert.throws(() => withLock({private_directory:PRIVATE}, () => {}),
    /custody_hw_exclusive_lock_already_exists/u);
  assert.equal(fs.statSync(lockPath).isDirectory(),true);
  fs.rmdirSync(lockPath); // Test-fixture cleanup only; not a production API.

  // A callback failure can follow a partially staged write. Even a thrown
  // error must NOT auto-release the lock and allow a competing publisher.
  assert.throws(() => withLock({private_directory:PRIVATE}, () => {
    throw new Error("synthetic_partial_operation");
  }),/custody_hw_exclusive_operation_failed_lock_retained/u);
  assert.equal(fs.statSync(lockPath).isDirectory(),true);
  assert.throws(() => withLock({private_directory:PRIVATE},()=>{}),
    /custody_hw_exclusive_lock_already_exists/u);
  fs.rmdirSync(lockPath);

  // An async callback could continue after lock release. Explicitly HOLD it.
  assert.throws(() => withLock({private_directory:PRIVATE},
    () => Promise.resolve("later")),
    /custody_hw_exclusive_operation_failed_lock_retained/u);
  assert.equal(fs.statSync(lockPath).isDirectory(),true);
  fs.rmdirSync(lockPath);

  // No callback or accepted arbitrary/symlink root.
  assert.throws(() => withLock({private_directory:PRIVATE}),
    /custody_hw_exclusive_critical_section_required/u);
  assert.throws(() => withLock({private_directory:"/tmp/../tmp"},()=>{}),
    /custody_hw_exclusive_root_invalid/u);
  assert.throws(() => withLock({private_directory:"/"},()=>{}),
    /custody_hw_exclusive_root_invalid/u);
  assert.equal(fs.existsSync(lockPath),false);

  console.log("VOID_BUY_VOID_CUSTODY_HIGH_WATER_EXCLUSIVE_LOCK_V1_SYNTHETIC_GREEN");
  console.log("atomic_os_directory_exclusion_verified=true");
  console.log("real_child_process_contention_rejected=true");
  console.log("successful_release_directory_fsynced=true");
  console.log("same_uid_private_0700_required=true");
  console.log("private_mode_special_bits_rejected=true");
  console.log("symlink_private_root_rejected=true");
  console.log("stale_lock_auto_takeover=false");
  console.log("failed_callback_lock_retained=true");
  console.log("async_callback_lock_retained=true");
  console.log("no_existing_customer_or_custody_file_read=true");
  console.log("server_trusted_path_identity_verified=false");
  console.log("installed_custody_service_uid_qualified=false");
  console.log("cross_uid_ipc_authenticated=false");
  console.log("custody_high_water_writer_implemented=false");
  console.log("custody_reserve_enabled=false");
  console.log("custody_recover_enabled=false");
  console.log("production_allocation_mutation_ready=false");
  console.log("funds_moved=false");
} finally {
  fs.rmSync(ROOT,{recursive:true,force:true});
}
