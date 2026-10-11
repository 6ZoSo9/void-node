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

// Exercise the real observer, not a substitute lock implementation. Each case
// owns its own disposable directory; no production claim is inspected/deleted.
async function proveObservationRace(stage, fault) {
  const caseRoot = fs.mkdtempSync(path.join(root, "observation-"));
  fs.chmodSync(caseRoot, 0o3770);
  const caseConfig = Object.freeze({ ...config, shared_directory: caseRoot });
  const name = path.basename(lockPath);
  const caseLock = path.join(caseRoot, name);
  await assert.rejects(
    () => withBuyVoidCrossUidCapacityExclusiveLockV1(caseConfig, () => {
      throw new Error("synthetic_observed_holder");
    }),
    /cross_uid_capacity_lock_callback_failed_lock_retained/u,
  );
  const oldStat = fs.statSync(caseLock);
  const oldBytes = fs.readFileSync(caseLock);
  const oldNonce = JSON.parse(oldBytes.toString("utf8")).nonce;
  const originalLstat = fs.lstatSync;
  const originalClose = fs.closeSync;
  let observations = 0;
  let fired = false;
  let oldClosed = 0;
  let callbackRuns = 0;
  const injected = Object.assign(new Error(`synthetic_observer_${fault}`), {
    code: fault === "close" ? "EIO" : fault,
  });
  try {
    fs.lstatSync = function(filename, ...args) {
      if (!fired && typeof filename === "string" &&
          /^\/proc\/self\/fd\/[0-9]+\//u.test(filename) &&
          filename.endsWith(`/${name}`)) {
        observations++;
        if (observations === stage) {
          fired = true;
          if (fault === "release" || fault === "close") {
            // Remove the visible lock name while retaining the old inode in the
            // fixture, so inode recycling cannot inflate the close counter.
            fs.renameSync(caseLock, path.join(caseRoot, "released-claim.json"));
          } else if (fault === "replace") {
            // Retain the old inode so a recycled inode cannot satisfy the test.
            fs.renameSync(caseLock, path.join(caseRoot, "old-claim.json"));
            fs.writeFileSync(caseLock, oldBytes, { mode: 0o640, flag: "wx" });
            fs.chmodSync(caseLock, 0o640);
          } else {
            throw injected;
          }
        }
      }
      return originalLstat.call(fs, filename, ...args);
    };
    fs.closeSync = function(fd) {
      const metadata = fs.fstatSync(fd);
      const isOld = metadata.dev === oldStat.dev && metadata.ino === oldStat.ino;
      const result = originalClose.call(fs, fd);
      if (isOld) {
        oldClosed++;
        // Close for real, then report uncertainty. It must not grant a retry.
        if (fault === "close") throw injected;
      }
      return result;
    };
    const operation = () => withBuyVoidCrossUidCapacityExclusiveLockV1(
      caseConfig,
      () => {
        callbackRuns++;
        assert.equal(oldClosed, 1, "old observation must close before reacquire");
        const held = JSON.parse(realReadFile.call(fs, caseLock, "utf8"));
        assert.notEqual(held.nonce, oldNonce, "a fresh claim must win exclusion");
        return "reacquired";
      },
    );
    if (fault === "release") {
      const receipt = await operation();
      fs.closeSync = originalClose;
      assert.equal(receipt.result, "reacquired");
      assert.equal(receipt.lock_release_fsynced, true);
      assert.equal(callbackRuns, 1);
      assert.equal(fs.existsSync(caseLock), false);
    } else {
      await assert.rejects(operation, (error) => {
        if (fault !== "replace") return error === injected;
        return error.message === (stage === 1
          ? "cross_uid_capacity_lock_lock_path_fd_mismatch"
          : "cross_uid_capacity_lock_claim_changed_during_read");
      });
      fs.closeSync = originalClose;
      assert.equal(callbackRuns, 0, "non-absence errors remain HOLD");
      if (fault !== "close") {
        assert.deepEqual(realReadFile.call(fs, caseLock), oldBytes);
      }
      if (fault === "EACCES" || fault === "EIO") {
        assert.equal(fs.statSync(caseLock).ino, oldStat.ino);
      }
    }
    assert.equal(fired, true, "the requested observation cut must execute");
    assert.equal(observations, stage);
    assert.equal(oldClosed, 1, "observer descriptor closes exactly once");
  } finally {
    fs.lstatSync = originalLstat;
    fs.closeSync = originalClose;
    fs.rmSync(caseRoot, { recursive: true, force: true });
  }
}

async function proveDisappearingCompetitorDeadline() {
  const caseRoot = fs.mkdtempSync(path.join(root, "retry-deadline-"));
  fs.chmodSync(caseRoot, 0o3770);
  const caseConfig = Object.freeze({ ...config, shared_directory: caseRoot });
  const originalLink = fs.linkSync;
  const originalNow = Date.now;
  let clock = 0;
  let attempts = 0;
  let callbackRuns = 0;
  let yielded = false;
  const timer = setTimeout(() => { yielded = true; }, 0);
  try {
    Date.now = () => clock;
    fs.linkSync = function(existingPath, newPath) {
      assert.ok(newPath.endsWith(`/${path.basename(lockPath)}`));
      attempts++;
      assert.ok(attempts <= 6, "disappearing-claim retry bypassed deadline");
      clock += 25;
      // Model losing atomic creation to a competitor that has already released
      // before the next observation. Never create an alternative grant.
      throw Object.assign(new Error("synthetic_competitor_released"), { code: "EEXIST" });
    };
    await assert.rejects(
      () => withBuyVoidCrossUidCapacityExclusiveLockV1(caseConfig, () => {
        callbackRuns++;
      }),
      /cross_uid_capacity_lock_wait_timeout/u,
    );
    assert.equal(attempts, 4);
    assert.equal(callbackRuns, 0);
    assert.equal(yielded, true, "contention retries must yield instead of spin");
    assert.deepEqual(fs.readdirSync(caseRoot), [], "no failed staging claims left");
  } finally {
    fs.linkSync = originalLink;
    Date.now = originalNow;
    clearTimeout(timer);
    fs.rmSync(caseRoot, { recursive: true, force: true });
  }
}

try {
  fs.chmodSync(root, 0o3770);
  for (const stage of [1, 2]) {
    for (const fault of ["release", "EACCES", "EIO", "replace", "close"]) {
      await proveObservationRace(stage, fault);
    }
  }
  await proveDisappearingCompetitorDeadline();
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
  console.log("released_claim_before_and_after_read_retried=true");
  console.log("observer_descriptor_closed_before_reacquire=true");
  console.log("nonabsence_and_cleanup_failures_remain_hold=true");
  console.log("replacement_inode_remains_hold=true");
  console.log("disappearing_competitor_retries_deadline_bounded=true");
  console.log("disappearing_competitor_retries_yield=true");
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
