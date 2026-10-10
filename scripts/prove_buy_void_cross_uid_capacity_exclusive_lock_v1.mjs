#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";

import {
  VOID_BUY_VOID_CROSS_UID_CAPACITY_EXCLUSIVE_LOCK_AUTHORITY_V1,
  VOID_BUY_VOID_CROSS_UID_CAPACITY_EXCLUSIVE_LOCK_CONTRACT_V1,
  VOID_BUY_VOID_CROSS_UID_CAPACITY_EXCLUSIVE_LOCK_V1,
  withBuyVoidCrossUidCapacityExclusiveLockV1,
} from "../src/economic/buy_void_cross_uid_capacity_exclusive_lock_v1.mjs";

const LOCK_NAME =
  ".void-buy-void-cross-uid-capacity-exclusive-lock-v1.json";

function fixture() {
  const uid = process.getuid();
  const gid = process.getgid();
  assert.notEqual(uid, 0, "ordinary proof must run nonroot");
  const root = fs.mkdtempSync(
    path.join(os.tmpdir(), "void-cross-uid-capacity-lock-"),
  );
  fs.chmodSync(root, 0o3770);
  return Object.freeze({
    root,
    config: Object.freeze({
      shared_directory: root,
      custody_uid: uid,
      web_uid: uid + 10000,
      shared_gid: gid,
      wait_timeout_ms: 250,
      poll_interval_ms: 10,
    }),
  });
}

function cleanupFixture(f) {
  fs.rmSync(f.root, { recursive: true, force: true });
}

async function ordinaryProof() {
  assert.equal(
    VOID_BUY_VOID_CROSS_UID_CAPACITY_EXCLUSIVE_LOCK_CONTRACT_V1.marker,
    VOID_BUY_VOID_CROSS_UID_CAPACITY_EXCLUSIVE_LOCK_V1,
  );
  for (const [key, value] of Object.entries(
    VOID_BUY_VOID_CROSS_UID_CAPACITY_EXCLUSIVE_LOCK_AUTHORITY_V1,
  )) {
    const expectedFalse = new Set([
      "fairness_or_starvation_bound_proven",
      "caller_bearer_token_authority",
      "payment_event_write",
      "allocation_write",
      "production_runtime_mounted",
      "production_gate_ready",
      "presale_activation",
      "funds_movement",
    ]);
    assert.equal(value, !expectedFalse.has(key), key);
  }

  let cases = 0;

  {
    const f = fixture();
    try {
      const result = await withBuyVoidCrossUidCapacityExclusiveLockV1(
        f.config,
        async () => {
          await sleep(10);
          return "ok";
        },
      );
      assert.equal(result.ok, true);
      assert.equal(result.status, "completed");
      assert.equal(result.participant_role, "custody");
      assert.equal(result.exclusive_critical_section_completed, true);
      assert.equal(result.lock_release_fsynced, true);
      assert.equal(result.cross_uid_serialization_source_proven, true);
      assert.equal(result.payment_event_write, false);
      assert.equal(result.allocation_write, false);
      assert.equal(result.production_runtime_mounted, false);
      assert.equal(result.production_gate_ready, false);
      assert.equal(result.presale_activation, false);
      assert.equal(result.funds_movement, false);
      assert.equal(result.result, "ok");
      assert.equal(fs.existsSync(path.join(f.root, LOCK_NAME)), false);
      cases++;
    } finally {
      cleanupFixture(f);
    }
  }

  {
    const f = fixture();
    let depth = 0;
    let maximumDepth = 0;
    const order = [];
    try {
      const run = async (name) =>
        withBuyVoidCrossUidCapacityExclusiveLockV1(
          f.config,
          async () => {
            depth++;
            maximumDepth = Math.max(maximumDepth, depth);
            order.push("enter:" + name);
            await sleep(45);
            order.push("exit:" + name);
            depth--;
            return name;
          },
        );
      const results = await Promise.all([run("a"), run("b")]);
      assert.equal(maximumDepth, 1);
      assert.deepEqual(new Set(results.map((x) => x.result)), new Set(["a", "b"]));
      assert.equal(order.length, 4);
      assert.match(order[0], /^enter:/u);
      assert.match(order[1], /^exit:/u);
      assert.match(order[2], /^enter:/u);
      assert.match(order[3], /^exit:/u);
      assert.equal(fs.existsSync(path.join(f.root, LOCK_NAME)), false);
      cases++;
    } finally {
      cleanupFixture(f);
    }
  }

  {
    const f = fixture();
    try {
      await assert.rejects(
        () =>
          withBuyVoidCrossUidCapacityExclusiveLockV1(
            f.config,
            async () => {
              throw new Error("synthetic_callback_failure");
            },
          ),
        /cross_uid_capacity_lock_callback_failed_lock_retained/u,
      );
      const lock = path.join(f.root, LOCK_NAME);
      assert.equal(fs.existsSync(lock), true);
      const stat = fs.lstatSync(lock);
      assert.equal(stat.uid, process.getuid());
      assert.equal(stat.gid, process.getgid());
      assert.equal(stat.mode & 0o7777, 0o640);

      await assert.rejects(
        () =>
          withBuyVoidCrossUidCapacityExclusiveLockV1(
            f.config,
            async () => "must-not-run",
          ),
        /cross_uid_capacity_lock_wait_timeout/u,
      );

      fs.unlinkSync(lock);
      const fd = fs.openSync(f.root, fs.constants.O_RDONLY | fs.constants.O_DIRECTORY);
      try { fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
      cases++;
    } finally {
      cleanupFixture(f);
    }
  }

  {
    const f = fixture();
    const original = Object.getOwnPropertyDescriptor(
      Object.prototype,
      "toJSON",
    );
    let called = 0;
    try {
      Object.defineProperty(Object.prototype, "toJSON", {
        configurable: true,
        value() {
          called++;
          return { schema: "forged" };
        },
      });
      const result = await withBuyVoidCrossUidCapacityExclusiveLockV1(
        f.config,
        async () => "prototype-safe",
      );
      assert.equal(result.result, "prototype-safe");
      assert.equal(called, 0);
      cases++;
    } finally {
      if (original) {
        Object.defineProperty(Object.prototype, "toJSON", original);
      } else {
        delete Object.prototype.toJSON;
      }
      cleanupFixture(f);
    }
  }

  {
    const f = fixture();
    try {
      fs.chmodSync(f.root, 0o1770);
      await assert.rejects(
        () =>
          withBuyVoidCrossUidCapacityExclusiveLockV1(
            f.config,
            async () => "no",
          ),
        /cross_uid_capacity_lock_shared_directory_owner_group_mode_invalid/u,
      );
      cases++;
    } finally {
      cleanupFixture(f);
    }
  }

  {
    const base = fixture();
    const link = base.root + "-link";
    try {
      fs.symlinkSync(base.root, link);
      const config = Object.freeze({
        ...base.config,
        shared_directory: link,
      });
      await assert.rejects(
        () =>
          withBuyVoidCrossUidCapacityExclusiveLockV1(
            config,
            async () => "no",
          ),
        /cross_uid_capacity_lock_ancestor_symlink_or_non_directory/u,
      );
      cases++;
    } finally {
      try { fs.unlinkSync(link); } catch {}
      cleanupFixture(base);
    }
  }

  {
    const f = fixture();
    try {
      const proxy = new Proxy({ ...f.config }, {});
      await assert.rejects(
        () =>
          withBuyVoidCrossUidCapacityExclusiveLockV1(
            proxy,
            async () => "no",
          ),
        /cross_uid_capacity_lock_config_invalid/u,
      );
      cases++;
    } finally {
      cleanupFixture(f);
    }
  }

  console.log("VOID_BUY_VOID_CROSS_UID_CAPACITY_EXCLUSIVE_LOCK_V1_GREEN");
  console.log("ordinary_adversarial_cases=" + cases);
  console.log("create_only_kernel_lock=true");
  console.log("callback_failure_retains_lock=true");
  console.log("ambient_tojson_not_claim_authority=true");
  console.log("shared_directory_mode_03770_required=true");
  console.log("payment_event_write=false");
  console.log("allocation_write=false");
  console.log("production_runtime_mounted=false");
  console.log("production_gate_ready=false");
  console.log("presale_activation=false");
  console.log("funds_movement=false");
}

function parseWorkerArgs(argv) {
  assert.equal(argv.length, 8);
  const [
    sharedDirectory,
    custodyUidRaw,
    webUidRaw,
    sharedGidRaw,
    logPath,
    tag,
    behavior,
    timeoutRaw,
  ] = argv;
  const custodyUid = Number(custodyUidRaw);
  const webUid = Number(webUidRaw);
  const sharedGid = Number(sharedGidRaw);
  const timeout = Number(timeoutRaw);
  for (const value of [custodyUid, webUid, sharedGid, timeout]) {
    assert.equal(Number.isSafeInteger(value), true);
  }
  assert.match(tag, /^[A-Za-z0-9_.-]+$/u);
  assert.ok([
    "success",
    "fail",
    "expect-foreign-stale",
  ].includes(behavior));
  return Object.freeze({
    config: Object.freeze({
      shared_directory: sharedDirectory,
      custody_uid: custodyUid,
      web_uid: webUid,
      shared_gid: sharedGid,
      wait_timeout_ms: timeout,
      poll_interval_ms: 10,
    }),
    logPath,
    tag,
    behavior,
  });
}

async function worker(args) {
  const w = parseWorkerArgs(args);
  if (w.behavior === "expect-foreign-stale") {
    await assert.rejects(
      () =>
        withBuyVoidCrossUidCapacityExclusiveLockV1(
          w.config,
          async () => {
            throw new Error("critical_section_must_not_run");
          },
        ),
      /cross_uid_capacity_lock_foreign_stale_claim_requires_custody_recovery/u,
    );
    console.log("VOID_CROSS_UID_FOREIGN_STALE_HELD_GREEN");
    return;
  }

  if (w.behavior === "fail") {
    await assert.rejects(
      () =>
        withBuyVoidCrossUidCapacityExclusiveLockV1(
          w.config,
          async () => {
            fs.appendFileSync(w.logPath, "enter:" + w.tag + "\n");
            throw new Error("synthetic_cross_uid_callback_failure");
          },
        ),
      /cross_uid_capacity_lock_callback_failed_lock_retained/u,
    );
    console.log("VOID_CROSS_UID_RETAINED_FAILURE_GREEN");
    return;
  }

  const result = await withBuyVoidCrossUidCapacityExclusiveLockV1(
    w.config,
    async () => {
      fs.appendFileSync(w.logPath, "enter:" + w.tag + "\n");
      await sleep(180);
      fs.appendFileSync(w.logPath, "exit:" + w.tag + "\n");
      return w.tag;
    },
  );
  assert.equal(result.ok, true);
  assert.equal(result.result, w.tag);
  assert.equal(result.participant_uid, process.getuid());
  console.log("VOID_CROSS_UID_WORKER_SUCCESS_GREEN");
}

function verifyLog(file) {
  const rows = fs.readFileSync(file, "utf8").trim().split("\n").filter(Boolean);
  assert.equal(rows.length, 4, JSON.stringify(rows));
  assert.match(rows[0], /^enter:/u);
  assert.match(rows[1], /^exit:/u);
  assert.match(rows[2], /^enter:/u);
  assert.match(rows[3], /^exit:/u);
  assert.equal(rows[0].slice(6), rows[1].slice(5));
  assert.equal(rows[2].slice(6), rows[3].slice(5));
  assert.notEqual(rows[0].slice(6), rows[2].slice(6));
  console.log("VOID_CROSS_UID_TWO_PROCESS_MUTUAL_EXCLUSION_GREEN");
}

const [mode, ...rest] = process.argv.slice(2);
if (mode === "--worker") {
  await worker(rest);
} else if (mode === "--verify-log") {
  assert.equal(rest.length, 1);
  verifyLog(rest[0]);
} else if (mode === undefined) {
  await ordinaryProof();
} else {
  throw new Error("unknown proof mode");
}
