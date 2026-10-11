#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  VOID_BUY_VOID_CROSS_UID_CAPACITY_EXCLUSIVE_LOCK_AUTHORITY_V1,
  withBuyVoidCrossUidCapacityExclusiveLockV1,
} from "../src/economic/buy_void_cross_uid_capacity_exclusive_lock_v1.mjs";

// All mutations below are confined to this process's disposable /tmp fixture.
// This script does not join any real web/custody UID group, service, or payment.
assert.equal(process.platform, "linux");
assert.equal(process.getuid() !== 0, true, "nonroot proof runner required");
const root = fs.mkdtempSync(
  path.join(os.tmpdir(), "void-crossuid-bounded-claim-"),
);
const lockPath = path.join(
  root,
  ".void-buy-void-cross-uid-capacity-exclusive-lock-v1.json",
);
const config = Object.freeze({
  shared_directory: root,
  custody_uid: process.getuid(),
  web_uid: process.getuid() + 10000,
  shared_gid: process.getgid(),
  wait_timeout_ms: 100,
  poll_interval_ms: 10,
});
const realRead = fs.readSync;
const realReadFile = fs.readFileSync;
let restoredRead = false;
let restoredReadFile = false;
try {
  fs.chmodSync(root, 0o3770);
  const positive = await withBuyVoidCrossUidCapacityExclusiveLockV1(
    config,
    async () => "positive",
  );
  assert.equal(positive.ok, true);
  assert.equal(positive.result, "positive");
  assert.equal(fs.existsSync(lockPath), false);

  // A failing callback leaves an intentional owner-bound live claim. This
  // creates a valid, committed, small lock claim without forging its JSON.
  await assert.rejects(
    () => withBuyVoidCrossUidCapacityExclusiveLockV1(
      config,
      async () => { throw new Error("synthetic_retained_claim"); },
    ),
    /cross_uid_capacity_lock_callback_failed_lock_retained/u,
  );
  const originalStat = fs.statSync(lockPath);
  assert.ok(originalStat.size >= 2 && originalStat.size <= 4096);
  const beforeBytes = fs.readFileSync(lockPath);
  const beforeText = JSON.parse(beforeBytes.toString("utf8"));
  assert.equal(beforeText.schema, "void.buy.cross_uid_capacity_lock.claim.v1");

  let grown = false;
  let allowedCallbackRuns = 0;
  let maxBufferBytes = 0;
  let readBytes = 0;
  let numericReadFileInvocations = 0;
  try {
    fs.readFileSync = function(input, ...args) {
      if (typeof input === "number") {
        numericReadFileInvocations++;
        throw new Error("unbounded_fd_read_file_forbidden");
      }
      return realReadFile.call(fs, input, ...args);
    };
    fs.readSync = function(fd, buf, offset, length, position) {
      const stat = fs.fstatSync(fd);
      if (stat.ino === originalStat.ino && stat.dev === originalStat.dev) {
        if (!grown) {
          grown = true;
          // The replacement is deliberately much larger than the verified
          // 4KiB maximum. A second implicit fstat/readFile could buffer it.
          fs.appendFileSync(lockPath, Buffer.alloc(3 * 1024 * 1024, 0x61));
        }
        maxBufferBytes = Math.max(maxBufferBytes, buf.byteLength);
        const consumed = realRead.call(fs, fd, buf, offset, length, position);
        readBytes += consumed;
        return consumed;
      }
      return realRead.call(fs, fd, buf, offset, length, position);
    };

    await assert.rejects(
      () => withBuyVoidCrossUidCapacityExclusiveLockV1(
        config,
        async () => { allowedCallbackRuns++; return "UNEXPECTED"; },
      ),
      /cross_uid_capacity_lock_claim_changed_during_read/u,
    );
  } finally {
    fs.readSync = realRead;
    restoredRead = true;
    fs.readFileSync = realReadFile;
    restoredReadFile = true;
  }
  assert.equal(grown, true, "synthetic concurrent growth must execute");
  assert.equal(allowedCallbackRuns, 0, "no critical section after changed claim");
  assert.equal(numericReadFileInvocations, 0, "lock reader must not restat by numeric fd");
  assert.equal(maxBufferBytes, originalStat.size + 1, "preflight read cap");
  assert.equal(readBytes, originalStat.size + 1, "one-byte growth sentinel");
  assert.equal(fs.statSync(lockPath).size, originalStat.size + 3 * 1024 * 1024);

  // No silent failure is masked by the actual critical-section path.
  assert.equal(
    VOID_BUY_VOID_CROSS_UID_CAPACITY_EXCLUSIVE_LOCK_AUTHORITY_V1.production_gate_ready,
    false,
  );
  assert.equal(
    VOID_BUY_VOID_CROSS_UID_CAPACITY_EXCLUSIVE_LOCK_AUTHORITY_V1.payment_event_write,
    false,
  );

  console.log("VOID_BUY_VOID_CROSS_UID_CAPACITY_BOUNDED_CLAIM_V1_GREEN");
  console.log("positive_exclusive_callback_qualified=true");
  console.log("retained_live_claim_created_in_temp_only=true");
  console.log("concurrent_claim_growth_bytes=3145728");
  console.log("read_cap_preflight_size_plus_one=true");
  console.log("numeric_fd_readFileSync_called=false");
  console.log("changed_claim_rejected_before_callback=true");
  console.log("real_service_or_payment_mutation=false");
  console.log("production_runtime_mounted=false");
  console.log("production_gate_ready=false");
  console.log("presale_activation=false");
  console.log("funds_movement=false");
} finally {
  if (!restoredRead) fs.readSync = realRead;
  if (!restoredReadFile) fs.readFileSync = realReadFile;
  fs.rmSync(root, { recursive: true, force: true });
}
