import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  VOID_BUY_VOID_ALLOCATION_RESERVATION_AUTHORITY_V1,
  VOID_BUY_VOID_ALLOCATION_RESERVATION_V1,
  listBuyVoidAllocationReservationsV1,
  persistBuyVoidAllocationReservationV1,
  testOnlyBuyVoidAllocationReservationLockPathV1,
  testOnlyOpenBuyVoidAllocationChildDirectoryV1,
  testOnlyReadBuyVoidAllocationAuthorityFileV1,
} from "../src/economic/buy_void_allocation_reservation_v1.js";
import {
  writeBuyVoidOperatorEventWithCapacityAdmissionV1,
} from "../src/economic/buy_void_verified_payment_capacity_admission_v1.js";
import {
  withBuyVoidFilesystemBakeryLockV1,
} from "../src/economic/buy_void_filesystem_bakery_lock_v1.js";

const POOL_VOID = "10000000";
const SELF = fileURLToPath(import.meta.url);

function allocationLockPath(requestDir: string): string {
  return testOnlyBuyVoidAllocationReservationLockPathV1(requestDir);
}

function launchAuthority(seed: string) {
  return {
    marker: "VOID_BUY_COUPLED_REQUEST_AUTHORITY_V1",
    version: 1,
    coupled_launch_id: "sha256:" + seed.repeat(64),
    source_composition_id: "sha256:" + "a".repeat(64),
    activation_generation: "0x" + "b".repeat(64),
    generation_tip_sha256: "sha256:" + "c".repeat(64),
    activation_receipt_id: "voidbclive1_" + "d".repeat(64),
    activation_receipt_sha256: "e".repeat(64),
    expires_at_ms: 1_900_000_000_000,
  };
}

function request(
  id: string,
  quote: string,
  tx: string,
  seed = "1",
) {
  return {
    schema: "void_public_buy_void_checkout_request_v1",
    request_id: id,
    source_chain: "base",
    quoted_void: quote,
    tx_hash: tx,
    status: tx
      ? "payment_submitted_pending_manual_review"
      : "awaiting_payment_tx_hash",
    launch_authority: launchAuthority(seed),
  };
}

function verifiedEvent(
  id: string,
  tx: string,
  logIndex: string,
  quote: string,
  markedAt: number,
) {
  return {
    schema: "void_buy_void_verified_payment_event_v2",
    marker: "VOID_BUY_VOID_VERIFIED_PAYMENT_V2",
    request_id: id,
    operator_status: "payment_verified",
    payment_verified: true,
    tx_hash: tx,
    quoted_void: quote,
    marked_at_ms: markedAt,
    payment_identity_input_complete: true,
    payment_verifier: {
      chain: "base",
      transaction_hash: tx,
      log_index: logIndex,
      block_number: "100",
      confirmations: "12",
      usdc_contract: "0x" + "1".repeat(40),
      from_address: "0x" + "2".repeat(40),
      receive_address: "0x" + "3".repeat(40),
      delivery_address: "0x" + "2".repeat(40),
      amount_units: "1000000",
      requested_units: "1000000",
    },
  };
}

function writeJsonl(file: string, rows: any[]) {
  fs.writeFileSync(
    file,
    rows.length > 0
      ? rows.map((row) => JSON.stringify(row)).join("\n") + "\n"
      : "",
    { mode: 0o600 },
  );
  fs.chmodSync(file, 0o600);
}

function fixture(
  quote = "25",
  txDigit = "1",
  seed = "1",
) {
  const root = fs.mkdtempSync(
    path.join(os.tmpdir(), "void-buy-allocation-v1-"),
  );
  fs.chmodSync(root, 0o700);
  const requestDir = path.join(root, "requests");
  fs.mkdirSync(requestDir, { mode: 0o700 });
  const id = "buyvoid_alloc" + seed + "_0000000" + seed;
  const tx = "0x" + txDigit.repeat(64);
  const initial = request(id, quote, "", seed);
  const bound = request(id, quote, tx, seed);
  writeJsonl(
    path.join(requestDir, "requests.jsonl"),
    [initial, bound],
  );
  const event = verifiedEvent(id, tx, "0", quote, 1000 + Number(seed));
  writeJsonl(
    path.join(requestDir, "operator-events.jsonl"),
    [event],
  );
  return { root, requestDir, id, tx, initial, bound, event };
}

function rm(f: { root: string }) {
  fs.rmSync(f.root, { recursive: true, force: true });
}

function spawnProofChild(args: string[]) {
  const child = spawn(
    process.execPath,
    ["--import", "tsx", SELF, ...args],
    { cwd: process.cwd(), stdio: ["ignore", "pipe", "pipe"] },
  );
  let stdout = "";
  let stderr = "";
  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");
  child.stdout.on("data", (chunk) => { stdout += chunk; });
  child.stderr.on("data", (chunk) => { stderr += chunk; });
  const done = new Promise<{ code: number | null; stdout: string; stderr: string }>(
    (resolve, reject) => {
      child.once("error", reject);
      child.once("close", (code) => resolve({ code, stdout, stderr }));
    },
  );
  return { child, done };
}

async function waitForFile(file: string, timeoutMs = 5000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (!fs.existsSync(file)) {
    if (Date.now() >= deadline) {
      throw new Error("allocation_lock_holder_ready_timeout");
    }
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
}

if (process.argv[2] === "--child-hold-allocation-lock") {
  const requestDir = String(process.argv[3] || "");
  const sentinel = String(process.argv[4] || "");
  withBuyVoidFilesystemBakeryLockV1(
    allocationLockPath(requestDir),
    () => {
      fs.writeFileSync(sentinel, "locked\n", { mode: 0o600 });
      Atomics.wait(
        new Int32Array(new SharedArrayBuffer(4)),
        0,
        0,
        2500,
      );
    },
  );
  process.exit(0);
}

if (process.argv[2] === "--child-persist-allocation") {
  const result = persistBuyVoidAllocationReservationV1({
    request_dir: String(process.argv[3] || ""),
    request_id: String(process.argv[4] || ""),
  });
  process.stdout.write(JSON.stringify(result) + "\n");
  process.exit(result.ok ? 0 : 3);
}

for (const [key, value] of Object.entries(
  VOID_BUY_VOID_ALLOCATION_RESERVATION_AUTHORITY_V1,
)) {
  const truthy = new Set([
    "source_contract",
    "durable_request_history_read",
    "durable_verified_payment_history_read",
    "deterministic_allocation_record",
    "append_only_allocation_publication",
    "crash_recovery",
    "allocation_history_validation",
    "global_allocation_serialization",
    "prepublication_capacity_admission",
  ]);
  assert.equal(value, truthy.has(key), key);
}

{
  const source = fs.readFileSync(
    "src/economic/buy_void_allocation_reservation_v1.ts",
    "utf8",
  );
  assert.match(source, /withBuyVoidFilesystemBakeryLockV1/);
  assert.match(source, /canonicalRequestDirectoryForLockV1/);
  assert.match(
    source,
    /fs\.realpathSync\.native\(directory\.proc_path\)/,
  );
  assert.match(
    source,
    /buy_void_allocation_lock_request_directory_canonical_mismatch/,
  );
  assert.equal(
    (source.match(/export function persistBuyVoidAllocationReservationV1\(/gu) || []).length,
    1,
  );
  assert.equal(
    (source.match(/function persistBuyVoidAllocationReservationUnlockedV1\(/gu) || []).length,
    1,
  );
  const exportedPersistAt = source.indexOf(
    "export function persistBuyVoidAllocationReservationV1(",
  );
  const unlockedPersistAt = source.indexOf(
    "function persistBuyVoidAllocationReservationUnlockedV1(",
  );
  assert.ok(exportedPersistAt >= 0 && unlockedPersistAt > exportedPersistAt);
  const exportedPersistSource = source.slice(
    exportedPersistAt,
    unlockedPersistAt,
  );
  assert.match(
    exportedPersistSource,
    /withBuyVoidFilesystemBakeryLockV1\(/,
  );
  assert.match(
    exportedPersistSource,
    /persistBuyVoidAllocationReservationUnlockedV1\(input\)/,
  );
  assert.match(source, /buy_void_allocation_capacity_exceeded/);
  assert.match(source, /loaded\.history\.total_micro \+ capacityDelta/);
  assert.match(source, /\.allocation-reservation-v1/);
}

{
  const root = fs.mkdtempSync(
    path.join(os.tmpdir(), "void-buy-allocation-direct-cap-v1-"),
  );
  fs.chmodSync(root, 0o700);
  const requestDir = path.join(root, "requests");
  fs.mkdirSync(requestDir, { mode: 0o700 });
  const idA = "buyvoid_resa_00000001";
  const idB = "buyvoid_resb_00000002";
  const txA = "0x" + "a".repeat(64);
  const txB = "0x" + "b".repeat(64);
  const a = request(idA, "6000000", txA, "1");
  const b = request(idB, "6000000", txB, "2");
  writeJsonl(path.join(requestDir, "requests.jsonl"), [a, b]);
  writeJsonl(path.join(requestDir, "operator-events.jsonl"), [
    verifiedEvent(idA, txA, "0", "6000000", 5001),
    verifiedEvent(idB, txB, "1", "6000000", 5002),
  ]);
  try {
    const first = persistBuyVoidAllocationReservationV1({
      request_dir: requestDir,
      request_id: idA,
    });
    assert.equal(first.ok, true);
    const second = persistBuyVoidAllocationReservationV1({
      request_dir: requestDir,
      request_id: idB,
    });
    assert.equal(second.ok, false);
    if (second.ok) throw new Error("expected allocation capacity HOLD");
    assert.equal(second.reason, "buy_void_allocation_capacity_exceeded");
    const rows = listBuyVoidAllocationReservationsV1(requestDir);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].request_id, idA);
    assert.equal(
      rows.reduce(
        (total, row) => total + BigInt(row.quoted_void_micro),
        0n,
      ),
      6_000_000n * 1_000_000n,
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

{
  const f = fixture("25", "d", "1");
  try {
    const sentinel = path.join(f.root, "allocation-lock-held");
    const holder = spawnProofChild([
      "--child-hold-allocation-lock",
      f.requestDir,
      sentinel,
    ]);
    await waitForFile(sentinel);
    const started = Date.now();
    const contender = spawnProofChild([
      "--child-persist-allocation",
      f.requestDir,
      f.id,
    ]);
    const contenderResult = await contender.done;
    const elapsed = Date.now() - started;
    const holderResult = await holder.done;
    assert.equal(holderResult.code, 0, holderResult.stderr);
    assert.equal(contenderResult.code, 0, contenderResult.stderr);
    assert.ok(
      elapsed >= 1500,
      "allocation persistence must wait behind the global reservation lock",
    );
    const childDecision = JSON.parse(contenderResult.stdout.trim());
    assert.equal(childDecision.ok, true);
    assert.equal(
      listBuyVoidAllocationReservationsV1(f.requestDir).length,
      1,
    );
  } finally {
    rm(f);
  }
}

{
  const root = fs.mkdtempSync(
    path.join(os.tmpdir(), "void-buy-allocation-alias-lock-v1-"),
  );
  fs.chmodSync(root, 0o700);
  const actualParent = path.join(root, "actual");
  fs.mkdirSync(actualParent, { mode: 0o700 });
  const requestDir = path.join(actualParent, "requests");
  fs.mkdirSync(requestDir, { mode: 0o700 });
  const aliasParent = path.join(root, "alias");
  fs.symlinkSync(actualParent, aliasParent, "dir");
  const aliasRequestDir = path.join(aliasParent, "requests");

  const idA = "buyvoid_alia_00000001";
  const idB = "buyvoid_alib_00000002";
  const txA = "0x" + "c".repeat(64);
  const txB = "0x" + "d".repeat(64);
  writeJsonl(path.join(requestDir, "requests.jsonl"), [
    request(idA, "6000000", txA, "1"),
    request(idB, "6000000", txB, "2"),
  ]);
  writeJsonl(path.join(requestDir, "operator-events.jsonl"), [
    verifiedEvent(idA, txA, "0", "6000000", 5101),
    verifiedEvent(idB, txB, "1", "6000000", 5102),
  ]);

  try {
    assert.equal(
      allocationLockPath(requestDir),
      allocationLockPath(aliasRequestDir),
      "canonical and symlink-parent aliases must converge on one lock identity",
    );

    const sentinel = path.join(root, "alias-lock-held");
    const holder = spawnProofChild([
      "--child-hold-allocation-lock",
      requestDir,
      sentinel,
    ]);
    await waitForFile(sentinel);

    const started = Date.now();
    const contender = spawnProofChild([
      "--child-persist-allocation",
      aliasRequestDir,
      idA,
    ]);
    const contenderResult = await contender.done;
    const elapsed = Date.now() - started;
    const holderResult = await holder.done;

    assert.equal(holderResult.code, 0, holderResult.stderr);
    assert.equal(contenderResult.code, 0, contenderResult.stderr);
    assert.ok(
      elapsed >= 1500,
      "symlink-parent alias persistence must wait on canonical reservation lock",
    );
    const firstDecision = JSON.parse(contenderResult.stdout.trim());
    assert.equal(firstDecision.ok, true);

    const second = persistBuyVoidAllocationReservationV1({
      request_dir: requestDir,
      request_id: idB,
    });
    assert.equal(second.ok, false);
    if (second.ok) throw new Error("expected aliased allocation capacity HOLD");
    assert.equal(second.reason, "buy_void_allocation_capacity_exceeded");

    const canonicalRows = listBuyVoidAllocationReservationsV1(requestDir);
    const aliasRows = listBuyVoidAllocationReservationsV1(aliasRequestDir);
    assert.equal(canonicalRows.length, 1);
    assert.deepEqual(aliasRows, canonicalRows);
    assert.equal(
      canonicalRows.reduce(
        (total, row) => total + BigInt(row.quoted_void_micro),
        0n,
      ),
      6_000_000n * 1_000_000n,
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

{
  const f = fixture();
  try {
    // Crash-after-payment-before-allocation recovery is the normal first call:
    // payment_verified is already durable and no allocation exists yet.
    const first = persistBuyVoidAllocationReservationV1({
      request_dir: f.requestDir,
      request_id: f.id,
    });
    assert.equal(first.ok, true);
    assert.equal(first.status, "persisted");
    assert.equal(first.idempotent, false);
    assert.equal(first.capacity_obligation_created, false);
    assert.equal(first.payment_verified_event_written, false);
    assert.equal(first.funds_movement, false);
    assert.equal(first.record.marker, VOID_BUY_VOID_ALLOCATION_RESERVATION_V1);
    assert.match(first.record.allocation_id, /^voidalloc1_[0-9a-f]{64}$/u);
    assert.equal(
      first.record.canonical_payment_identity,
      "voidpay1:base:" + f.tx + ":0",
    );
    assert.equal(first.record.quoted_void_micro, "25000000");
    assert.equal(first.record.coupled_launch_id, "sha256:" + "1".repeat(64));
    assert.match(
      first.record.verified_payment_event_sha256,
      /^sha256:[0-9a-f]{64}$/u,
    );

    // Crash-after-allocation-before-response recovery: exact replay observes
    // the create-once record and must not create a second record.
    const replay = persistBuyVoidAllocationReservationV1({
      request_dir: f.requestDir,
      request_id: f.id,
    });
    assert.equal(replay.ok, true);
    assert.equal(replay.status, "duplicate");
    assert.equal(replay.idempotent, true);
    assert.equal(replay.record.allocation_id, first.record.allocation_id);

    const records = listBuyVoidAllocationReservationsV1(f.requestDir);
    assert.equal(records.length, 1);
    assert.equal(records[0].allocation_id, first.record.allocation_id);

    const allocationDirectory = path.join(
      f.requestDir,
      "allocation-reservations-v1",
    );
    const allocationName = fs.readdirSync(allocationDirectory).find(
      (name) => name.endsWith(".json"),
    );
    assert.ok(allocationName);
    const allocationBytes = fs.readFileSync(
      path.join(allocationDirectory, allocationName!),
      "utf8",
    );
    const parsedAllocation = JSON.parse(allocationBytes);
    const canonicalAllocationBytes =
      JSON.stringify(
        Object.fromEntries(
          Object.keys(parsedAllocation)
            .sort()
            .map((key) => [key, parsedAllocation[key]]),
        ),
      ) + "\n";
    assert.equal(allocationBytes, canonicalAllocationBytes);
  } finally {
    rm(f);
  }
}

{
  const f = fixture("25", "2", "2");
  try {
    // Quote drift across authoritative request revisions must HOLD.
    const rows = [
      f.initial,
      { ...f.bound, quoted_void: "26" },
    ];
    writeJsonl(path.join(f.requestDir, "requests.jsonl"), rows);
    const held = persistBuyVoidAllocationReservationV1({
      request_dir: f.requestDir,
      request_id: f.id,
    });
    assert.equal(held.ok, false);
    if (held.ok) throw new Error("expected quote drift HOLD");
    assert.equal(held.reason, "buy_void_allocation_request_revision_conflict");
  } finally {
    rm(f);
  }
}

{
  const f = fixture("25", "3", "3");
  try {
    // Same request with a different durable verified payment identity HOLDs.
    const second = verifiedEvent(
      f.id,
      "0x" + "4".repeat(64),
      "1",
      "25",
      2000,
    );
    writeJsonl(
      path.join(f.requestDir, "operator-events.jsonl"),
      [f.event, second],
    );
    const held = persistBuyVoidAllocationReservationV1({
      request_dir: f.requestDir,
      request_id: f.id,
    });
    assert.equal(held.ok, false);
    if (held.ok) throw new Error("expected duplicate request HOLD");
    assert.match(
      held.reason,
      /buy_void_allocation_(?:request_payment_lineage_mismatch|duplicate_verified_payment_history)/u,
    );
  } finally {
    rm(f);
  }
}

{
  const f = fixture("25", "5", "4");
  try {
    // Same canonical payment identity claimed by another request HOLDs.
    const otherId = "buyvoid_allocx_00000009";
    const otherBound = request(otherId, "25", f.tx, "4");
    writeJsonl(
      path.join(f.requestDir, "requests.jsonl"),
      [f.initial, f.bound, otherBound],
    );
    const conflicting = verifiedEvent(
      otherId,
      f.tx,
      "0",
      "25",
      3000,
    );
    writeJsonl(
      path.join(f.requestDir, "operator-events.jsonl"),
      [f.event, conflicting],
    );
    const held = persistBuyVoidAllocationReservationV1({
      request_dir: f.requestDir,
      request_id: f.id,
    });
    assert.equal(held.ok, false);
    if (held.ok) throw new Error("expected duplicate payment HOLD");
    assert.equal(
      held.reason,
      "buy_void_allocation_duplicate_verified_payment_history",
    );
  } finally {
    rm(f);
  }
}

{
  const f = fixture("25", "6", "5");
  try {
    const first = persistBuyVoidAllocationReservationV1({
      request_dir: f.requestDir,
      request_id: f.id,
    });
    assert.equal(first.ok, true);
    const dir = path.join(
      f.requestDir,
      "allocation-reservations-v1",
    );
    fs.writeFileSync(
      path.join(dir, "voidalloc1_" + "f".repeat(64) + ".json"),
      "{not-json}\n",
      { mode: 0o600 },
    );
    const held = persistBuyVoidAllocationReservationV1({
      request_dir: f.requestDir,
      request_id: f.id,
    });
    assert.equal(held.ok, false);
    if (held.ok) throw new Error("expected malformed history HOLD");
    assert.match(held.reason, /buy_void_allocation_record_json_invalid/u);
  } finally {
    rm(f);
  }
}

{
  const source = fixture("25", "7", "6");
  const orphan = fixture("25", "8", "7");
  try {
    const first = persistBuyVoidAllocationReservationV1({
      request_dir: source.requestDir,
      request_id: source.id,
    });
    assert.equal(first.ok, true);
    const sourceDir = path.join(
      source.requestDir,
      "allocation-reservations-v1",
    );
    const allocationFile = fs.readdirSync(sourceDir).find(
      (name) => name.endsWith(".json"),
    );
    assert.ok(allocationFile);
    const orphanDir = path.join(
      orphan.requestDir,
      "allocation-reservations-v1",
    );
    fs.mkdirSync(orphanDir, { mode: 0o700 });
    fs.copyFileSync(
      path.join(sourceDir, allocationFile!),
      path.join(orphanDir, allocationFile!),
    );
    fs.chmodSync(path.join(orphanDir, allocationFile!), 0o600);
    const held = persistBuyVoidAllocationReservationV1({
      request_dir: orphan.requestDir,
      request_id: orphan.id,
    });
    assert.equal(held.ok, false);
    if (held.ok) throw new Error("expected orphan allocation HOLD");
    assert.equal(held.reason, "buy_void_allocation_orphan_record");
  } finally {
    rm(source);
    rm(orphan);
  }
}

{
  const f = fixture("25", "9", "8");
  try {
    const ledger = path.join(f.requestDir, "requests.jsonl");
    const held = () =>
      testOnlyReadBuyVoidAllocationAuthorityFileV1(
        ledger,
        () => fs.appendFileSync(ledger, "{}\n"),
      );
    assert.throws(held, /buy_void_allocation_test_file_changed_during_read/u);
  } finally {
    rm(f);
  }
}

{
  const f = fixture("25", "a", "9");
  try {
    const ledger = path.join(f.requestDir, "requests.jsonl");
    const replacement = path.join(f.requestDir, "replacement.jsonl");
    fs.writeFileSync(replacement, fs.readFileSync(ledger), { mode: 0o600 });
    assert.throws(
      () =>
        testOnlyReadBuyVoidAllocationAuthorityFileV1(
          ledger,
          () => {
            fs.renameSync(ledger, ledger + ".old");
            fs.renameSync(replacement, ledger);
          },
        ),
      /buy_void_allocation_test_file_changed_during_read/u,
    );
  } finally {
    rm(f);
  }
}

{
  const f = fixture("25", "b", "1");
  try {
    const allocationDir = path.join(
      f.requestDir,
      "allocation-reservations-v1",
    );
    fs.mkdirSync(allocationDir, { mode: 0o700 });
    const movedRequestDir = f.requestDir + ".old";
    assert.throws(
      () =>
        testOnlyOpenBuyVoidAllocationChildDirectoryV1(
          f.requestDir,
          () => {
            fs.renameSync(f.requestDir, movedRequestDir);
            fs.mkdirSync(f.requestDir, { mode: 0o700 });
            fs.mkdirSync(
              path.join(f.requestDir, "allocation-reservations-v1"),
              { mode: 0o700 },
            );
          },
        ),
      /buy_void_allocation_test_history_directory_parent_changed/u,
    );
  } finally {
    rm(f);
  }
}

{
  const f = fixture("25", "c", "1");
  try {
    const allocationDir = path.join(
      f.requestDir,
      "allocation-reservations-v1",
    );
    fs.mkdirSync(allocationDir, { mode: 0o700 });
    assert.throws(
      () =>
        testOnlyOpenBuyVoidAllocationChildDirectoryV1(
          f.requestDir,
          () => {
            fs.renameSync(allocationDir, allocationDir + ".old");
            fs.mkdirSync(allocationDir, { mode: 0o700 });
          },
        ),
      /buy_void_allocation_test_history_directory_path_not_bound/u,
    );
  } finally {
    rm(f);
  }
}

function capacitySaleState(requestDir: string) {
  const requests = fs
    .readFileSync(path.join(requestDir, "requests.jsonl"), "utf8")
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line));
  const quotes = new Map<string, string>();
  for (const row of requests) {
    quotes.set(String(row.request_id), String(row.quoted_void));
  }
  const events = fs
    .readFileSync(path.join(requestDir, "operator-events.jsonl"), "utf8")
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line));
  const verified = new Set<string>();
  for (const event of events) {
    if (event.operator_status === "payment_verified") {
      verified.add(String(event.request_id));
    }
  }
  let verifiedMicro = 0n;
  for (const id of verified) {
    const raw = quotes.get(id) || "0";
    const [whole, fraction = ""] = raw.split(".");
    verifiedMicro +=
      BigInt(whole) * 1_000_000n +
      BigInt(fraction.padEnd(6, "0") || "0");
  }
  const poolMicro = 10_000_000n * 1_000_000n;
  const asVoid = (micro: bigint) => {
    const whole = micro / 1_000_000n;
    const fraction = (micro % 1_000_000n)
      .toString()
      .padStart(6, "0")
      .replace(/0+$/u, "");
    return fraction ? whole.toString() + "." + fraction : whole.toString();
  };
  return {
    pool_void_total: POOL_VOID,
    allocation_reserved_void: asVoid(verifiedMicro),
    verified_void_total: asVoid(verifiedMicro),
    remaining_void: asVoid(poolMicro - verifiedMicro),
  };
}

{
  const root = fs.mkdtempSync(
    path.join(os.tmpdir(), "void-buy-allocation-capacity-v1-"),
  );
  fs.chmodSync(root, 0o700);
  const requestDir = path.join(root, "requests");
  fs.mkdirSync(requestDir, { mode: 0o700 });
  const idA = "buyvoid_capa_00000001";
  const idB = "buyvoid_capb_00000002";
  const txA = "0x" + "a".repeat(64);
  const txB = "0x" + "b".repeat(64);
  const a = request(idA, "6000000", txA, "1");
  const b = request(idB, "6000000", txB, "2");
  writeJsonl(path.join(requestDir, "requests.jsonl"), [a, b]);
  writeJsonl(path.join(requestDir, "operator-events.jsonl"), []);
  const eventA = verifiedEvent(idA, txA, "0", "6000000", 4001);
  const eventB = verifiedEvent(idB, txB, "1", "6000000", 4002);

  const write = (event: any, req: any) =>
    writeBuyVoidOperatorEventWithCapacityAdmissionV1({
      event,
      request: req,
      request_dir: requestDir,
      with_launch_authority_mutation: async (_request, operation) =>
        operation(),
      read_sale_state: async () => capacitySaleState(requestDir),
    });

  try {
    const settled = await Promise.allSettled([
      write(eventA, a),
      write(eventB, b),
    ]);
    const fulfilled = settled.filter(
      (result) => result.status === "fulfilled",
    );
    const rejected = settled.filter(
      (result) => result.status === "rejected",
    );
    assert.equal(fulfilled.length, 1);
    assert.equal(rejected.length, 1);
    if (rejected[0].status === "rejected") {
      assert.match(
        String(rejected[0].reason?.message || rejected[0].reason),
        /buy_void_verified_payment_capacity_exceeded/u,
      );
    }

    const events = fs
      .readFileSync(path.join(requestDir, "operator-events.jsonl"), "utf8")
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line));
    const verifiedRows = events.filter(
      (event) => event.operator_status === "payment_verified",
    );
    assert.equal(verifiedRows.length, 1);
    const winningId = String(verifiedRows[0].request_id);
    const allocation = persistBuyVoidAllocationReservationV1({
      request_dir: requestDir,
      request_id: winningId,
    });
    assert.equal(allocation.ok, true);
    assert.equal(
      allocation.allocation_reserved_void_micro,
      "6000000000000",
    );
    assert.equal(
      listBuyVoidAllocationReservationsV1(requestDir).length,
      1,
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

console.log("VOID_BUY_VOID_ALLOCATION_RESERVATION_V1_PROOF_GREEN");
console.log("durable_payment_verified_required=true");
console.log("allocation_before_payment_verified=false");
console.log("deterministic_allocation_identity=true");
console.log("exact_replay_idempotent=true");
console.log("crash_after_payment_before_allocation_recoverable=true");
console.log("crash_after_allocation_before_response_idempotent=true");
console.log("payment_request_event_uniqueness_enforced=true");
console.log("quote_drift_hold=true");
console.log("orphan_allocation_hold=true");
console.log("descriptor_bound_authority_reads=true");
console.log("path_swap_hold=true");
console.log("allocation_parent_path_swap_hold=true");
console.log("allocation_child_path_swap_hold=true");
console.log("growth_during_read_hold=true");
console.log("near_sellout_capacity_composition_green=true");
console.log("capacity_obligation_created=false");
console.log("global_allocation_serialization=true");
console.log("exported_persistence_uses_global_lock=true");
console.log("prepublication_capacity_admission=true");
console.log("oversubscribing_record_published=false");
console.log("cross_process_lock_contention_proven=true");
console.log("symlink_parent_alias_lock_identity_converges=true");
console.log("alias_near_sellout_oversubscription_rejected=true");
console.log("allocation_history_completeness_authority=false");
console.log("external_high_water_binding=false");
console.log("rollback_detection=false");
console.log("production_gate_ready=false");
console.log("runtime_integration=false");
console.log("funds_movement=false");
