import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  withBuyVoidFilesystemBakeryLockAsyncV1,
} from "../src/economic/buy_void_filesystem_bakery_lock_v1.js";

const root = fs.mkdtempSync(
  path.join(os.tmpdir(), "void-buy-bakery-async-"),
);
const lockPath = path.join(root, "launch-authority");
const queuePath = lockPath + ".queue";

function ticketCount(): number {
  if (!fs.existsSync(queuePath)) return 0;
  return fs.readdirSync(queuePath)
    .filter((name) => name.startsWith("ticket-"))
    .length;
}

try {
  let resumedWithTicket = false;

  const result = await withBuyVoidFilesystemBakeryLockAsyncV1(
    lockPath,
    () =>
      new Promise<string>((resolve) => {
        assert.equal(ticketCount(), 1);
        setTimeout(() => {
          resumedWithTicket = ticketCount() === 1;
          resolve("settled");
        }, 25);
      }),
  );

  assert.equal(result, "settled");
  assert.equal(resumedWithTicket, true);
  assert.equal(ticketCount(), 0);

  let rejectedWithTicket = false;
  await assert.rejects(
    () =>
      withBuyVoidFilesystemBakeryLockAsyncV1(
        lockPath,
        () =>
          new Promise<void>((_resolve, reject) => {
            assert.equal(ticketCount(), 1);
            setTimeout(() => {
              rejectedWithTicket = ticketCount() === 1;
              reject(new Error("fixture_async_failure"));
            }, 25);
          }),
      ),
    /fixture_async_failure/u,
  );
  assert.equal(rejectedWithTicket, true);
  assert.equal(ticketCount(), 0);

  console.log(
    "VOID_BUY_VOID_FILESYSTEM_BAKERY_LOCK_ASYNC_V1_GREEN",
  );
  console.log("ordinary_thenable_callback_covered=true");
  console.log("lock_claim_present_after_promise_resume=true");
  console.log("lock_claim_removed_after_resolution=true");
  console.log("lock_claim_present_before_async_rejection=true");
  console.log("lock_claim_removed_after_rejection=true");
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}
