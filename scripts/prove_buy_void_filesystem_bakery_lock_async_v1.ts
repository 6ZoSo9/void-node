import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  withBuyVoidFilesystemBakeryLockAsyncV1,
  withBuyVoidFilesystemBakeryLockV1,
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

async function proveInterruptedScan(
  mode: "sync" | "async",
  churn: boolean,
): Promise<void> {
  const fixtureLock = path.join(root, `${mode}-${churn ? "churn" : "transition"}`);
  const queue = `${fixtureLock}.queue`;
  fs.mkdirSync(queue, { mode: 0o700 });
  const nonce = "0".repeat(32);
  const choosing = path.join(queue, `choosing-${process.pid}-${nonce}.json`);
  const ticket = path.join(queue, `ticket-0000000000000001-${process.pid}-${nonce}.json`);
  const peer = {
    schema: "void_buy_void_filesystem_bakery_lock_claim_v1",
    pid: process.pid,
    process_start_ticks: currentLinuxStartTicks() || "1",
    nonce,
    created_at_utc: new Date().toISOString(),
  };
  const writeChoosing = () => fs.writeFileSync(
    choosing,
    JSON.stringify({ ...peer, phase: "choosing", ticket: null }) + "\n",
    { mode: 0o600 },
  );
  writeChoosing();

  const originalReaddir = fs.readdirSync;
  const originalRandomBytes = crypto.randomBytes;
  const originalNow = Date.now;
  let now = originalNow();
  let scans = 0;
  let entered = false;
  let sawPeerTicket = false;
  // Only lock nonces are fixed. Temporary-file suffixes retain their usual bytes.
  crypto.randomBytes = ((size: number) =>
    size === 16 ? Buffer.alloc(size, 0xff) : originalRandomBytes(size)
  ) as typeof crypto.randomBytes;
  if (churn) Date.now = () => now;
  fs.readdirSync = ((directory: fs.PathLike, options: unknown) => {
    if (directory !== queue) return Reflect.apply(originalReaddir, fs, [directory, options]);
    scans += 1;
    if (churn && scans > 1) writeChoosing();
    if (!churn && scans === 4) fs.unlinkSync(ticket);
    const entries = Reflect.apply(originalReaddir, fs, [directory, options]);
    if (scans === 2 || (churn && scans > 2)) {
      // Return an actual snapshot containing choosing-B, then finish B's
      // transition before A reads that pathname. Both contenders chose ticket 1.
      assert.ok(entries.some((entry: fs.Dirent) => entry.name === path.basename(choosing)));
      if (!churn) {
        fs.writeFileSync(
          ticket,
          JSON.stringify({ ...peer, phase: "ticket", ticket: 1 }) + "\n",
          { mode: 0o600 },
        );
      }
      fs.unlinkSync(choosing);
      if (churn) now += 15_000;
    }
    if (!churn && scans === 3) {
      sawPeerTicket = entries.some((entry: fs.Dirent) => entry.name === path.basename(ticket));
      assert.equal(entered, false);
    }
    return entries;
  }) as typeof fs.readdirSync;

  try {
    const operation = () => {
      entered = true;
      assert.equal(churn, false, "unstable scans must not admit a callback");
      assert.equal(scans, 4, "admission must wait for a fresh scan and peer release");
      assert.equal(sawPeerTicket, true, "retry must observe the lower equal-ticket peer");
      assert.equal(fs.existsSync(ticket), false);
      return "admitted";
    };
    const acquire = () => mode === "sync"
      ? withBuyVoidFilesystemBakeryLockV1(fixtureLock, operation)
      : withBuyVoidFilesystemBakeryLockAsyncV1(fixtureLock, operation);
    if (churn) {
      await assert.rejects(async () => acquire(), /bakery_lock_wait_timeout/u);
      assert.equal(entered, false);
      assert.equal(scans, 3, "rescan remains bounded by the existing deadline");
    } else {
      assert.equal(await acquire(), "admitted");
    }
    assert.deepEqual(originalReaddir(queue), [], "own claims must be cleaned up");
  } finally {
    fs.readdirSync = originalReaddir;
    crypto.randomBytes = originalRandomBytes;
    Date.now = originalNow;
    fs.rmSync(queue, { recursive: true, force: true });
  }
}

try {
  const objectToJsonBefore =
    Object.getOwnPropertyDescriptor(Object.prototype, "toJSON");
  let inheritedObjectToJsonCalls = 0;
  try {
    Object.defineProperty(Object.prototype, "toJSON", {
      value() {
        inheritedObjectToJsonCalls += 1;
        return {
          schema: "ambient_prototype_must_not_rewrite_bakery_claim",
        };
      },
      enumerable: false,
      writable: true,
      configurable: true,
    });
    const prototypeSafeLock = path.join(root, "prototype-tojson");
    assert.equal(
      withBuyVoidFilesystemBakeryLockV1(
        prototypeSafeLock,
        () => "prototype-safe",
      ),
      "prototype-safe",
    );
    assert.equal(
      inheritedObjectToJsonCalls,
      0,
      "ambient Object.prototype.toJSON executed during bakery lock acquire/release",
    );
    assert.deepEqual(
      fs.readdirSync(prototypeSafeLock + ".queue"),
      [],
      "prototype-safe lock claims were not cleaned up",
    );
  } finally {
    if (objectToJsonBefore) {
      Object.defineProperty(
        Object.prototype,
        "toJSON",
        objectToJsonBefore,
      );
    } else {
      delete (Object.prototype as any).toJSON;
    }
  }

  for (const mode of ["sync", "async"] as const) {
    await proveInterruptedScan(mode, false);
    await proveInterruptedScan(mode, true);
  }

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
  console.log("ambient_object_prototype_toJSON_lock_claim_authority=false");
  console.log("ordinary_thenable_callback_covered=true");
  console.log("lock_claim_present_after_promise_resume=true");
  console.log("lock_claim_removed_after_resolution=true");
  console.log("lock_claim_present_before_async_rejection=true");
  console.log("lock_claim_removed_after_rejection=true");
  console.log("same_process_async_contender_yields=true");
  console.log("async_wait_poll_does_not_block_event_loop=true");
  console.log("persistent_volume_pid_reuse_claim_reclaimed=true");
  console.log("process_incarnation_start_ticks_bound=true");
  console.log("sync_and_async_choosing_transition_snapshot_retried=true");
  console.log("equal_ticket_peer_observed_before_admission=true");
  console.log("unstable_scan_retry_preserves_wait_timeout=true");
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}
