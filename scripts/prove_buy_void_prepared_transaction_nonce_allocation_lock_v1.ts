import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import {
  withBuyVoidFilesystemBakeryLockV1,
} from "../src/economic/buy_void_filesystem_bakery_lock_v1.js";
import {
  listBuyVoidPreparedTransactionPlanReservationsV1,
  reserveBuyVoidPreparedTransactionPlanV1,
  type BuyVoidPreparedTransactionPlanReservationInputV1,
} from "../src/economic/buy_void_prepared_transaction_plan_reservation_v1.js";

const WALLET = "0x4444444444444444444444444444444444444444";
const DELIVERY = "0x3333333333333333333333333333333333333333";
const ATTEMPT = "a".repeat(64);
const SAGA = `voidbvfsg1_${"b".repeat(64)}`;
const ECONOMIC = "c".repeat(64);
const PREPARATION = "d".repeat(64);

function digest(value: string): string {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

function input(root: string, floor: number, attempt = ATTEMPT):
  BuyVoidPreparedTransactionPlanReservationInputV1 {
  return {
    root_dir: root,
    saga_id: attempt === ATTEMPT ? SAGA : `voidbvfsg1_${digest(attempt)}`,
    attempt_id: attempt,
    chain_id: "2050",
    wallet_address: WALLET,
    observed_pending_nonce: floor,
    delivery_address: DELIVERY,
    native_value_wei: "2500000000000000000",
    gas_limit: "21000",
    max_fee_per_gas_wei: "1100000000",
    max_priority_fee_per_gas_wei: "100000000",
    economic_policy_fingerprint_sha256: ECONOMIC,
    preparation_policy_fingerprint_sha256: PREPARATION,
    now_ms: Date.parse("2026-08-06T10:40:00.000Z") + floor,
  };
}

function walletLock(root: string): string {
  const walletKey = digest(`void-buy-wallet-v1\n2050\n${WALLET}`);
  return path.join(
    root,
    "buy-void-prepared-transaction-plan-reservation-v1",
    "wallets",
    walletKey,
    "nonce-allocation",
  );
}

function waitUntil(timestamp: number): void {
  const sleep = new Int32Array(new SharedArrayBuffer(4));
  while (Date.now() < timestamp) {
    Atomics.wait(sleep, 0, 0, Math.min(20, timestamp - Date.now()));
  }
}

async function worker(): Promise<void> {
  const mode = String(process.env.VOID_NONCE_LOCK_WORKER_MODE || "");
  const root = String(process.env.VOID_NONCE_LOCK_ROOT || "");
  const start = Number(process.env.VOID_NONCE_LOCK_START_MS || "0");
  waitUntil(start);

  if (mode === "reserve") {
    const floor = Number(process.env.VOID_NONCE_LOCK_FLOOR || "0");
    const result = reserveBuyVoidPreparedTransactionPlanV1(
      input(root, floor),
    );
    process.stdout.write(`${JSON.stringify({ floor, result })}\n`);
    return;
  }

  if (mode === "crash") {
    withBuyVoidFilesystemBakeryLockV1(walletLock(root), () => {
      fs.writeFileSync(
        path.join(root, "crash-lock-acquired.marker"),
        "acquired\n",
        { encoding: "utf8", mode: 0o600 },
      );
      process.exit(23);
    });
    return;
  }

  throw new Error("nonce_lock_worker_mode_invalid");
}

type WorkerResult = {
  floor: number;
  result: ReturnType<typeof reserveBuyVoidPreparedTransactionPlanV1>;
};

function runWorker(input: {
  root: string;
  mode: "reserve" | "crash";
  start_ms: number;
  floor?: number;
}): Promise<{
  code: number | null;
  stdout: string;
  stderr: string;
}> {
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      ["--import", "tsx", new URL(import.meta.url).pathname],
      {
        env: {
          ...process.env,
          VOID_NONCE_LOCK_WORKER_MODE: input.mode,
          VOID_NONCE_LOCK_ROOT: input.root,
          VOID_NONCE_LOCK_START_MS: String(input.start_ms),
          VOID_NONCE_LOCK_FLOOR: String(input.floor || 0),
        },
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("error", reject);
    child.on("close", (code) => resolve({ code, stdout, stderr }));
  });
}

async function main(): Promise<void> {
  if (process.env.VOID_NONCE_LOCK_WORKER_MODE) {
    await worker();
    return;
  }

  const root = fs.mkdtempSync(
    path.join(os.tmpdir(), "void-prepared-nonce-lock-"),
  );
  fs.chmodSync(root, 0o700);

  const start = Date.now() + 800;
  const [low, high] = await Promise.all([
    runWorker({ root, mode: "reserve", floor: 7, start_ms: start }),
    runWorker({ root, mode: "reserve", floor: 8, start_ms: start }),
  ]);
  assert.equal(low.code, 0, low.stderr);
  assert.equal(high.code, 0, high.stderr);
  const results = [low, high].map((value) =>
    JSON.parse(value.stdout.trim()) as WorkerResult,
  );

  const records = listBuyVoidPreparedTransactionPlanReservationsV1({
    root_dir: root,
    wallet_address: WALLET,
  });
  assert.equal(records.length, 1);
  assert.equal(records[0].attempt_id, ATTEMPT);
  assert.ok(records[0].nonce === 7 || records[0].nonce === 8);

  const successful = results.filter((value) => value.result.ok);
  assert.ok(successful.length >= 1);
  for (const value of successful) {
    if ("reason" in value.result) throw new Error(value.result.reason);
    assert.equal(value.result.reservation.reservation_id, records[0].reservation_id);
    assert.equal(value.result.reservation.nonce, records[0].nonce);
  }
  if (records[0].nonce === 7) {
    const highResult = results.find((value) => value.floor === 8)?.result;
    assert.ok(highResult && !highResult.ok);
    if (!highResult || !("reason" in highResult)) {
      throw new Error("higher_floor_must_hold_after_lower_nonce_wins");
    }
    assert.equal(highResult.reason, "prepared_plan_reservation_failed");
    assert.match(
      String(highResult.detail?.message || ""),
      /prepared_plan_reserved_nonce_below_observed_pending/,
    );
  } else {
    assert.equal(successful.length, 2);
  }

  const queue = `${walletLock(root)}.queue`;
  assert.deepEqual(fs.readdirSync(queue), []);

  const crashStart = Date.now() + 500;
  const crashed = await runWorker({
    root,
    mode: "crash",
    start_ms: crashStart,
  });
  assert.equal(crashed.code, 23);
  assert.equal(
    fs.readFileSync(
      path.join(root, "crash-lock-acquired.marker"),
      "utf8",
    ),
    "acquired\n",
  );
  assert.ok(fs.readdirSync(queue).length >= 1);

  const nextAttempt = "e".repeat(64);
  const afterCrash = reserveBuyVoidPreparedTransactionPlanV1(
    input(root, 8, nextAttempt),
  );
  assert.equal(afterCrash.ok, true);
  if ("reason" in afterCrash) throw new Error(afterCrash.reason);
  assert.ok(afterCrash.reservation.nonce > records[0].nonce);
  assert.deepEqual(fs.readdirSync(queue), []);

  const finalRecords = listBuyVoidPreparedTransactionPlanReservationsV1({
    root_dir: root,
    wallet_address: WALLET,
  });
  assert.equal(finalRecords.length, 2);
  assert.equal(new Set(finalRecords.map((value) => value.nonce)).size, 2);

  const walletKey = digest(`void-buy-wallet-v1\n2050\n${WALLET}`);
  const walletDir = path.join(
    root,
    "buy-void-prepared-transaction-plan-reservation-v1",
    "wallets",
    walletKey,
  );
  const attemptsDir = path.join(walletDir, "attempts");
  const noncesDir = path.join(walletDir, "nonces");

  fs.rmSync(attemptsDir, { recursive: true, force: true });
  const readOnlyAfterAttemptsRemoval =
    listBuyVoidPreparedTransactionPlanReservationsV1({
      root_dir: root,
      wallet_address: WALLET,
    });
  assert.equal(readOnlyAfterAttemptsRemoval.length, 2);
  assert.equal(fs.existsSync(attemptsDir), false);

  fs.chmodSync(noncesDir, 0o755);
  assert.equal(fs.lstatSync(noncesDir).mode & 0o777, 0o755);
  assert.throws(
    () => listBuyVoidPreparedTransactionPlanReservationsV1({
      root_dir: root,
      wallet_address: WALLET,
    }),
    /prepared_plan_directory_must_be_private/,
  );
  assert.equal(
    fs.lstatSync(noncesDir).mode & 0o777,
    0o755,
    "read-only listing repaired unsafe directory permissions",
  );
  fs.chmodSync(noncesDir, 0o700);

  const restoredRecords = listBuyVoidPreparedTransactionPlanReservationsV1({
    root_dir: root,
    wallet_address: WALLET,
  });
  assert.equal(restoredRecords.length, 2);
  assert.equal(fs.existsSync(attemptsDir), false);

  fs.rmSync(root, { recursive: true, force: true });
  process.stdout.write(
    "VOID_BUY_VOID_PREPARED_TRANSACTION_NONCE_ALLOCATION_LOCK_V1_PROOF_GREEN\n",
  );
  process.stdout.write("simultaneous_same_attempt_unique_nonce=true\n");
  process.stdout.write("higher_pending_floor_fail_closed=true\n");
  process.stdout.write("dead_ticket_reclaimed=true\n");
  process.stdout.write("read_only_listing_recreates_attempts=false\n");
  process.stdout.write("read_only_listing_repairs_permissions=false\n");
  process.stdout.write("canonical_nonce_release=false\n");
}

main().catch((error) => {
  process.stderr.write(`${String(error?.stack || error)}\n`);
  process.exitCode = 1;
});
