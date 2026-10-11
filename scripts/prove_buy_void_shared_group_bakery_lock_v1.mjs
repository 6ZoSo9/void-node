import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  withBuyVoidFilesystemBakeryLockAsyncExistingQueueV1,
  withBuyVoidFilesystemBakeryLockAsyncExistingSharedGroupQueueV1,
} from "../dist/economic/buy_void_filesystem_bakery_lock_v1.js";

const MARKER = "VOID_BUY_VOID_SHARED_GROUP_BAKERY_LOCK_V1";

function requiredEnv(name) {
  const value = String(process.env[name] || "").trim();
  if (!value) throw new Error(name + "_required");
  return value;
}

async function worker() {
  const queue = requiredEnv("VOID_SHARED_QUEUE");
  const sentinel = requiredEnv("VOID_SHARED_SENTINEL");
  const label = requiredEnv("VOID_SHARED_LABEL");
  const gid = Number(requiredEnv("VOID_SHARED_GID"));
  assert.ok(Number.isSafeInteger(gid) && gid > 0);

  await withBuyVoidFilesystemBakeryLockAsyncExistingSharedGroupQueueV1(
    queue,
    gid,
    async () => {
      let descriptor;
      try {
        descriptor = fs.openSync(sentinel, "wx", 0o660);
        fs.fchmodSync(descriptor, 0o660);
        fs.writeFileSync(descriptor, label + "\n", "utf8");
        fs.fsyncSync(descriptor);
      } catch (error) {
        if (error?.code === "EEXIST") {
          throw new Error("shared_group_bakery_lock_overlap_detected");
        }
        throw error;
      }
      try {
        await new Promise((resolve) => setTimeout(resolve, 300));
      } finally {
        if (descriptor !== undefined) fs.closeSync(descriptor);
        fs.unlinkSync(sentinel);
      }
    },
  );

  console.log(MARKER + "_WORKER_GREEN");
  console.log("worker=" + label);
  console.log("cross_uid_queue_joined=true");
  console.log("operation_performed=true");
  console.log("payment_acceptance=false");
  console.log("presale_activation=false");
  console.log("funds_moved=false");
}

async function selfTest() {
  const root = fs.mkdtempSync(
    path.join(os.tmpdir(), "void-shared-group-bakery-lock-v1-"),
  );
  try {
    const gid = typeof process.getgid === "function" ? process.getgid() : -1;
    assert.ok(Number.isSafeInteger(gid) && gid > 0);

    const shared = path.join(root, "shared.queue");
    fs.mkdirSync(shared, { mode: 0o770 });
    fs.chmodSync(shared, 0o2770);

    let operations = 0;
    await withBuyVoidFilesystemBakeryLockAsyncExistingSharedGroupQueueV1(
      shared,
      gid,
      async () => {
        operations += 1;
        const metadata = fs.lstatSync(shared);
        assert.equal(metadata.gid, gid);
        assert.equal(metadata.mode & 0o7777, 0o2770);
      },
    );
    assert.equal(operations, 1);
    assert.deepEqual(fs.readdirSync(shared), []);

    fs.chmodSync(shared, 0o770);
    await assert.rejects(
      () =>
        withBuyVoidFilesystemBakeryLockAsyncExistingSharedGroupQueueV1(
          shared,
          gid,
          async () => undefined,
        ),
      /bakery_lock_shared_directory_mode_invalid/u,
    );
    fs.chmodSync(shared, 0o2770);

    const differentGid =
      gid === 0x7fff_ffff ? gid - 1 : gid + 1;
    await assert.rejects(
      () =>
        withBuyVoidFilesystemBakeryLockAsyncExistingSharedGroupQueueV1(
          shared,
          differentGid,
          async () => undefined,
        ),
      /bakery_lock_shared_directory_(?:group_mismatch|group_not_granted)/u,
    );

    const symlink = path.join(root, "shared-link.queue");
    fs.symlinkSync(shared, symlink);
    await assert.rejects(
      () =>
        withBuyVoidFilesystemBakeryLockAsyncExistingSharedGroupQueueV1(
          symlink,
          gid,
          async () => undefined,
        ),
      /bakery_lock_shared_directory_must_be_direct_directory/u,
    );

    const privateQueue = path.join(root, "private.queue");
    fs.mkdirSync(privateQueue, { mode: 0o700 });
    fs.chmodSync(privateQueue, 0o700);
    let privateOperations = 0;
    await withBuyVoidFilesystemBakeryLockAsyncExistingQueueV1(
      privateQueue,
      async () => {
        privateOperations += 1;
      },
    );
    assert.equal(privateOperations, 1);
    assert.deepEqual(fs.readdirSync(privateQueue), []);

    console.log(MARKER + "_SELF_TEST_GREEN");
    console.log("existing_private_queue_preserved=true");
    console.log("shared_queue_existing_only=true");
    console.log("shared_queue_gid_bound=true");
    console.log("shared_queue_mode_2770_required=true");
    console.log("shared_claim_mode_0660_required=true");
    console.log("operation_performed=false");
    console.log("payment_acceptance=false");
    console.log("presale_activation=false");
    console.log("funds_moved=false");
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

if (process.argv[2] === "--worker") {
  await worker();
} else {
  await selfTest();
}
