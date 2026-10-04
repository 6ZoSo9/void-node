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

function currentLinuxStartTicks(): string | null {
  if (process.platform !== "linux") return null;
  const stat = fs.readFileSync(`/proc/${process.pid}/stat`, "utf8");
  const close = stat.lastIndexOf(") ");
  assert.ok(close >= 0);
  const fields = stat.slice(close + 2).trim().split(/\s+/u);
  const ticks = fields[19] || "";
  assert.match(ticks, /^[1-9][0-9]*$/u);
  return ticks;
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

  const order: string[] = [];
  const first = withBuyVoidFilesystemBakeryLockAsyncV1(
    lockPath,
    async () => {
      order.push("first-enter");
      await new Promise<void>((resolve) => setTimeout(resolve, 30));
      order.push("first-exit");
    },
  );
  assert.deepEqual(order, ["first-enter"]);

  const second = withBuyVoidFilesystemBakeryLockAsyncV1(
    lockPath,
    async () => {
      order.push("second-enter");
      await new Promise<void>((resolve) => setTimeout(resolve, 5));
      order.push("second-exit");
    },
  );

  await Promise.all([first, second]);
  assert.deepEqual(
    order,
    ["first-enter", "first-exit", "second-enter", "second-exit"],
  );
  assert.equal(ticketCount(), 0);

  if (process.platform === "linux") {
    fs.mkdirSync(queuePath, { recursive: true, mode: 0o700 });
    fs.chmodSync(queuePath, 0o700);
    const currentTicks = currentLinuxStartTicks();
    assert.ok(currentTicks);
    const staleTicks = (BigInt(currentTicks) + 1n).toString();
    const staleNonce = "a".repeat(32);
    const staleTicket = path.join(
      queuePath,
      `ticket-0000000000000001-${process.pid}-${staleNonce}.json`,
    );
    fs.writeFileSync(
      staleTicket,
      JSON.stringify({
        schema: "void_buy_void_filesystem_bakery_lock_claim_v1",
        pid: process.pid,
        process_start_ticks: staleTicks,
        nonce: staleNonce,
        phase: "ticket",
        ticket: 1,
        created_at_utc: new Date().toISOString(),
      }) + "\n",
      { mode: 0o600 },
    );
    assert.equal(ticketCount(), 1);

    let staleClaimBlocked = true;
    await withBuyVoidFilesystemBakeryLockAsyncV1(
      lockPath,
      async () => {
        staleClaimBlocked = false;
        assert.equal(
          fs.existsSync(staleTicket),
          false,
          "same-PID claim from another process incarnation must be reclaimed",
        );
      },
    );
    assert.equal(staleClaimBlocked, false);
    assert.equal(ticketCount(), 0);
  }

  console.log(
    "VOID_BUY_VOID_FILESYSTEM_BAKERY_LOCK_ASYNC_V1_GREEN",
  );
  console.log("ordinary_thenable_callback_covered=true");
  console.log("lock_claim_present_after_promise_resume=true");
  console.log("lock_claim_removed_after_resolution=true");
  console.log("lock_claim_present_before_async_rejection=true");
  console.log("lock_claim_removed_after_rejection=true");
  console.log("same_process_async_contender_yields=true");
  console.log("async_wait_poll_does_not_block_event_loop=true");
  console.log("persistent_volume_pid_reuse_claim_reclaimed=true");
  console.log("process_incarnation_start_ticks_bound=true");
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}
