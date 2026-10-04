#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  planBuyVoidAllocationReservationV1,
} from "../src/economic/buy_void_allocation_reservation_ledger_v1.js";
import {
  classifyBuyVoidAllocationReservationHighWaterBindingV1,
  deriveBuyVoidAllocationReservationHighWaterV1,
} from "../src/economic/buy_void_allocation_reservation_high_water_v1.js";
import {
  buildBuyVoidAllocationReservationPublicationIntentV1,
} from "../src/economic/buy_void_allocation_reservation_publication_protocol_v1.js";
import {
  VOID_BUY_VOID_ALLOCATION_RESERVATION_PUBLICATION_WRITER_AUTHORITY_V1,
  VOID_BUY_VOID_ALLOCATION_RESERVATION_PUBLICATION_WRITER_V1,
  persistBuyVoidAllocationReservationPublicationWriterV1,
  recoverBuyVoidAllocationReservationPublicationWriterV1,
  testOnlyWithBuyVoidAllocationReservationPublicationWriterLocksV1,
} from "../src/economic/buy_void_allocation_reservation_publication_writer_v1.js";

const LEDGER_NAME = "allocation-reservations-v1.jsonl";
const HIGH_WATER_NAME = "allocation-reservation-high-water-v1.json";
const INTENT_NAME = "allocation-reservation-publication-intent-v1.json";
const SELF = fileURLToPath(import.meta.url);
const TSX_BIN = path.join(process.cwd(), "node_modules", ".bin", "tsx");
const CHILD_SLEEP = new Int32Array(new SharedArrayBuffer(4));

function sleepSync(ms: number): void {
  Atomics.wait(CHILD_SLEEP, 0, 0, ms);
}

if (process.argv[2] === "--dual-root-lock-child") {
  const [ledgerRoot, highWaterRoot, startedPath, enteredPath, releasePath] =
    process.argv.slice(3);
  assert.ok(ledgerRoot);
  assert.ok(highWaterRoot);
  assert.ok(startedPath);
  assert.ok(enteredPath);
  assert.ok(releasePath);
  fs.writeFileSync(startedPath, "started\n", { mode: 0o600 });
  const result =
    testOnlyWithBuyVoidAllocationReservationPublicationWriterLocksV1(
      { ledger_root: ledgerRoot, high_water_root: highWaterRoot },
      () => {
        fs.writeFileSync(enteredPath, "entered\n", { mode: 0o600 });
        if (releasePath !== "-") {
          const deadline = Date.now() + 10_000;
          while (!fs.existsSync(releasePath)) {
            if (Date.now() >= deadline) {
              throw new Error("dual_root_lock_child_release_timeout");
            }
            sleepSync(10);
          }
        }
        return "done";
      },
    );
  assert.equal(result, "done");
  process.exit(0);
}

if (process.argv[2] === "--writer-persist-child") {
  const [
    ledgerRoot,
    highWaterRoot,
    nextLedgerPath,
    startedPath,
    resultPath,
  ] = process.argv.slice(3);
  assert.ok(ledgerRoot);
  assert.ok(highWaterRoot);
  assert.ok(nextLedgerPath);
  assert.ok(startedPath);
  assert.ok(resultPath);
  fs.writeFileSync(startedPath, "started\n", { mode: 0o600 });
  const decision =
    persistBuyVoidAllocationReservationPublicationWriterV1({
      ledger_root: ledgerRoot,
      high_water_root: highWaterRoot,
      next_ledger_jsonl: fs.readFileSync(nextLedgerPath),
    });
  fs.writeFileSync(
    resultPath,
    JSON.stringify(decision) + "\n",
    { mode: 0o600 },
  );
  process.exit(decision.ok ? 0 : 2);
}

type LockChildV1 = {
  child: ReturnType<typeof spawn>;
  stdout: () => string;
  stderr: () => string;
};

function spawnLockChild(
  ledgerRoot: string,
  highWaterRoot: string,
  startedPath: string,
  enteredPath: string,
  releasePath: string,
): LockChildV1 {
  assert.equal(
    fs.existsSync(TSX_BIN),
    true,
    "tsx binary required for cross-process writer lock proof",
  );
  let stdout = "";
  let stderr = "";
  const child = spawn(
    TSX_BIN,
    [
      SELF,
      "--dual-root-lock-child",
      ledgerRoot,
      highWaterRoot,
      startedPath,
      enteredPath,
      releasePath,
    ],
    { cwd: process.cwd(), stdio: ["ignore", "pipe", "pipe"] },
  );
  child.stdout?.on("data", (chunk) => { stdout += String(chunk); });
  child.stderr?.on("data", (chunk) => { stderr += String(chunk); });
  return { child, stdout: () => stdout, stderr: () => stderr };
}

function spawnPersistChild(
  ledgerRoot: string,
  highWaterRoot: string,
  nextLedgerPath: string,
  startedPath: string,
  resultPath: string,
): LockChildV1 {
  assert.equal(
    fs.existsSync(TSX_BIN),
    true,
    "tsx binary required for cross-process writer persistence proof",
  );
  let stdout = "";
  let stderr = "";
  const child = spawn(
    TSX_BIN,
    [
      SELF,
      "--writer-persist-child",
      ledgerRoot,
      highWaterRoot,
      nextLedgerPath,
      startedPath,
      resultPath,
    ],
    { cwd: process.cwd(), stdio: ["ignore", "pipe", "pipe"] },
  );
  child.stdout?.on("data", (chunk) => { stdout += String(chunk); });
  child.stderr?.on("data", (chunk) => { stderr += String(chunk); });
  return { child, stdout: () => stdout, stderr: () => stderr };
}

async function waitForTicketCount(
  queue: string,
  minimum: number,
  child: LockChildV1,
  label: string,
  timeoutMs = 10_000,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    let count = 0;
    try {
      count = fs
        .readdirSync(queue)
        .filter((name) => name.startsWith("ticket-"))
        .length;
    } catch (error) {
      if ((error as NodeJS.ErrnoException)?.code !== "ENOENT") {
        throw error;
      }
    }
    if (count >= minimum) return;
    if (child.child.exitCode !== null) {
      throw new Error(
        label + "_child_exited:" + String(child.child.exitCode) +
        "\nstdout:\n" + child.stdout() + "\nstderr:\n" + child.stderr(),
      );
    }
    if (Date.now() >= deadline) throw new Error(label + "_timeout");
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}

async function waitForPath(
  file: string,
  child: LockChildV1,
  label: string,
  timeoutMs = 10_000,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (!fs.existsSync(file)) {
    if (child.child.exitCode !== null) {
      throw new Error(
        label + "_child_exited:" + String(child.child.exitCode) +
        "\nstdout:\n" + child.stdout() + "\nstderr:\n" + child.stderr(),
      );
    }
    if (Date.now() >= deadline) throw new Error(label + "_timeout");
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}

async function waitForChild(
  child: LockChildV1,
  label: string,
  timeoutMs = 10_000,
): Promise<void> {
  if (child.child.exitCode !== null) {
    assert.equal(
      child.child.exitCode,
      0,
      label + "\nstdout:\n" + child.stdout() + "\nstderr:\n" + child.stderr(),
    );
    return;
  }
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      child.child.kill("SIGKILL");
      reject(new Error(label + "_timeout"));
    }, timeoutMs);
    child.child.once("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.child.once("exit", (code) => {
      clearTimeout(timer);
      if (code !== 0) {
        reject(new Error(
          label + "_exit_" + String(code) +
          "\nstdout:\n" + child.stdout() + "\nstderr:\n" + child.stderr(),
        ));
        return;
      }
      resolve();
    });
  });
}

const writerSource = fs.readFileSync(
  path.join(
    process.cwd(),
    "src",
    "economic",
    "buy_void_allocation_reservation_publication_writer_v1.ts",
  ),
  "utf8",
);
assert.match(
  writerSource,
  /allocation_reservation_writer_descriptor_safety_unavailable/u,
);
assert.match(
  writerSource,
  /!fs\.existsSync\("\/proc\/self\/fd"\)/u,
);
assert.doesNotMatch(
  writerSource,
  /fs\.constants\.O_NOFOLLOW[\s\S]{0,120}: 0;/u,
);
assert.doesNotMatch(
  writerSource,
  /fs\.constants\.O_DIRECTORY[\s\S]{0,120}: 0;/u,
);
assert.match(
  writerSource,
  /allocation_reservation_writer_intent_presence_mismatch/u,
);
assert.match(
  writerSource,
  /_changed_before_replace/u,
);
assert.match(
  writerSource,
  /const orderedLocks = \[/u,
  "writer must derive a dual-root lock order",
);
assert.match(
  writerSource,
  /left\.directory\.stat\.dev[\s\S]*left\.directory\.stat\.ino/u,
  "writer lock order must bind pinned directory identity",
);
assert.match(
  writerSource,
  /withBuyVoidFilesystemBakeryLockV1\(\s*orderedLocks\[0\]\.lock_path,[\s\S]*withBuyVoidFilesystemBakeryLockV1\(\s*orderedLocks\[1\]\.lock_path,/u,
  "writer must hold both pinned-root queues",
);
assert.match(
  writerSource,
  /beforeReplace\(\);\s*fs\.renameSync/u,
  "writer must revalidate both roots immediately before authoritative rename",
);
assert.match(
  writerSource,
  /function readRedundantIntent\(/u,
  "writer must recover from either exact intent copy",
);
assert.match(
  writerSource,
  /allocation_reservation_writer_intent_copies_mismatch/u,
  "writer must reject divergent intent copies",
);
assert.match(
  writerSource,
  /createOnceIntent\(ledgerDirectory, intent\)[\s\S]*createOnceIntent\(highWaterDirectory, intent\)/u,
  "writer must publish the exact intent under both pinned roots",
);

const sha = (hex: string): string =>
  "sha256:" + hex.repeat(64);

const baseInput = {
  ledger_jsonl: "",
  request_id: "buyvoid_a_aaaaaaaa",
  source_chain: "base",
  payment_transaction_hash: "0x" + "a".repeat(64),
  payment_log_index: 7,
  launch_authority: {
    marker: "VOID_BUY_COUPLED_REQUEST_AUTHORITY_V1",
    version: 1,
    coupled_launch_id: sha("a"),
    source_composition_id: sha("b"),
    activation_generation: "0x" + "c".repeat(64),
    generation_tip_sha256: sha("d"),
    activation_receipt_id: "voidbclive1_" + "e".repeat(64),
    activation_receipt_sha256: "f".repeat(64),
    expires_at_ms: 1_800_000_300_000,
  },
  buyer_delivery_wallet: "0x" + "1".repeat(40),
  quote_void_amount: "6",
  quote_usdc_amount: "3",
  pool_void_total: "10000000",
  verified_payment_receipt_ref: sha("1"),
  payment_verified_event_sha256: sha("0"),
  duplicate_payment_guard_result: sha("2"),
  inventory_allocation_guard_result: sha("3"),
  operator_activation_record_ref: sha("4"),
  created_at_ms: 1_800_000_000_000,
  verified_payment_gate_green: true,
  duplicate_payment_guard_green: true,
  inventory_allocation_guard_green: true,
  operator_activation_record_green: true,
} as const;

const first = planBuyVoidAllocationReservationV1(baseInput);
assert.equal(first.ok, true);
if (!first.ok) throw new Error(first.reason);
assert.equal(first.status, "planned");
const ledger1 = first.next_ledger_jsonl;

const second = planBuyVoidAllocationReservationV1({
  ...baseInput,
  ledger_jsonl: ledger1,
  request_id: "buyvoid_b_bbbbbbbb",
  payment_transaction_hash: "0x" + "b".repeat(64),
  payment_log_index: 8,
  buyer_delivery_wallet: "0x" + "2".repeat(40),
  quote_void_amount: "8",
  quote_usdc_amount: "4",
  verified_payment_receipt_ref: sha("5"),
  payment_verified_event_sha256: sha("6"),
  duplicate_payment_guard_result: sha("7"),
  inventory_allocation_guard_result: sha("8"),
  operator_activation_record_ref: sha("9"),
  created_at_ms: baseInput.created_at_ms + 1,
});
assert.equal(second.ok, true);
if (!second.ok) throw new Error(second.reason);
assert.equal(second.status, "planned");
const ledger2 = second.next_ledger_jsonl;

const genesis = deriveBuyVoidAllocationReservationHighWaterV1("");
assert.equal(genesis.ok, true);
if (!genesis.ok) throw new Error(genesis.reason);
const genesisHighWater = genesis.high_water_json;

const next = deriveBuyVoidAllocationReservationHighWaterV1(ledger1);
assert.equal(next.ok, true);
if (!next.ok) throw new Error(next.reason);
const nextHighWater = next.high_water_json;

const built =
  buildBuyVoidAllocationReservationPublicationIntentV1({
    current_ledger_jsonl: "",
    current_high_water_json: genesisHighWater,
    next_ledger_jsonl: ledger1,
  });
assert.equal(built.ok, true);
if (!built.ok) throw new Error(built.reason);
const intent = built.intent_json;

type Fixture = {
  root: string;
  ledgerRoot: string;
  highWaterRoot: string;
};

function fixture(
  ledger = "",
  highWater = genesisHighWater,
): Fixture {
  const root = fs.mkdtempSync(
    path.join(os.tmpdir(), "void-allocation-writer-v1-"),
  );
  fs.chmodSync(root, 0o700);
  const ledgerRoot = path.join(root, "ledger");
  const highWaterRoot = path.join(root, "high-water");
  fs.mkdirSync(ledgerRoot, { mode: 0o700 });
  fs.mkdirSync(highWaterRoot, { mode: 0o700 });
  fs.writeFileSync(
    path.join(ledgerRoot, LEDGER_NAME),
    ledger,
    { mode: 0o600 },
  );
  fs.writeFileSync(
    path.join(highWaterRoot, HIGH_WATER_NAME),
    highWater,
    { mode: 0o600 },
  );
  return { root, ledgerRoot, highWaterRoot };
}

function writeIntent(f: Fixture): void {
  fs.writeFileSync(
    path.join(f.highWaterRoot, INTENT_NAME),
    intent,
    { mode: 0o600 },
  );
}

function cleanup(f: Fixture): void {
  fs.rmSync(f.root, { recursive: true, force: true });
}

for (const [key, value] of Object.entries(
  VOID_BUY_VOID_ALLOCATION_RESERVATION_PUBLICATION_WRITER_AUTHORITY_V1,
)) {
  const trueKeys = new Set([
    "source_contract",
    "filesystem_read",
    "filesystem_write",
    "descriptor_bound_reads",
    "same_uid_private_storage",
    "separate_storage_roots_required",
    "shared_serialization_lock",
    "dual_root_serialization_lock",
    "redundant_publication_intent",
    "publication_intent_write",
    "allocation_ledger_write",
    "high_water_write",
    "crash_recovery",
    "atomic_ledger_publication",
    "atomic_high_water_publication",
    "exact_postcheck",
  ]);
  assert.equal(value, trueKeys.has(key), key);
}

{
  const f = fixture(ledger1, genesisHighWater);
  try {
    const held =
      recoverBuyVoidAllocationReservationPublicationWriterV1({
        ledger_root: f.ledgerRoot,
        high_water_root: f.highWaterRoot,
      });
    assert.equal(held.ok, false);
    if (held.ok) {
      throw new Error(
        "expected post-publication root-swap mixed state HOLD",
      );
    }
    assert.equal(
      held.reason,
      "allocation_reservation_writer_high_water_" +
        "allocation_reservation_high_water_binding_mismatch",
    );
    assert.equal(
      VOID_BUY_VOID_ALLOCATION_RESERVATION_PUBLICATION_WRITER_AUTHORITY_V1
        .post_admission_root_path_stability_proven,
      false,
    );
    assert.equal(
      VOID_BUY_VOID_ALLOCATION_RESERVATION_PUBLICATION_WRITER_AUTHORITY_V1
        .single_root_post_publication_recovery,
      false,
    );
  } finally {
    cleanup(f);
  }
}

{
  const f = fixture();
  try {
    const written =
      persistBuyVoidAllocationReservationPublicationWriterV1({
        ledger_root: f.ledgerRoot,
        high_water_root: f.highWaterRoot,
        next_ledger_jsonl: ledger1,
      });
    assert.equal(written.ok, true);
    if (!written.ok) throw new Error(written.reason);
    assert.equal(written.status, "persisted");
    assert.equal(written.operation_performed, true);
    assert.equal(written.record_count, 1);
    assert.equal(
      written.tip_hash,
      first.record.allocation_record_hash,
    );
    assert.equal(written.publication_intent_present, false);
    assert.equal(written.runtime_integration, false);
    assert.equal(written.production_gate_ready, false);
    assert.equal(written.funds_movement, false);
    assert.equal(
      fs.readFileSync(
        path.join(f.ledgerRoot, LEDGER_NAME),
        "utf8",
      ),
      ledger1,
    );
    assert.equal(
      fs.readFileSync(
        path.join(f.highWaterRoot, HIGH_WATER_NAME),
        "utf8",
      ),
      nextHighWater,
    );
    assert.equal(
      fs.existsSync(
        path.join(f.highWaterRoot, INTENT_NAME),
      ),
      false,
    );
    assert.equal(
      fs.existsSync(
        path.join(f.ledgerRoot, INTENT_NAME),
      ),
      false,
    );

    const binding =
      classifyBuyVoidAllocationReservationHighWaterBindingV1({
        ledger_jsonl: ledger1,
        high_water_json: nextHighWater,
      });
    assert.equal(binding.ok, true);
    if (!binding.ok) throw new Error(binding.reason);

    const replay =
      persistBuyVoidAllocationReservationPublicationWriterV1({
        ledger_root: f.ledgerRoot,
        high_water_root: f.highWaterRoot,
        next_ledger_jsonl: ledger1,
      });
    assert.equal(replay.ok, true);
    if (!replay.ok) throw new Error(replay.reason);
    assert.equal(replay.status, "idempotent");
    assert.equal(replay.operation_performed, false);
  } finally {
    cleanup(f);
  }
}

{
  const f = fixture();
  try {
    writeIntent(f);
    const recovered =
      recoverBuyVoidAllocationReservationPublicationWriterV1({
        ledger_root: f.ledgerRoot,
        high_water_root: f.highWaterRoot,
      });
    assert.equal(recovered.ok, true);
    if (!recovered.ok) throw new Error(recovered.reason);
    assert.equal(recovered.status, "recovered");
    assert.equal(recovered.operation_performed, true);
    assert.equal(
      fs.readFileSync(
        path.join(f.ledgerRoot, LEDGER_NAME),
        "utf8",
      ),
      ledger1,
    );
    assert.equal(
      fs.readFileSync(
        path.join(f.highWaterRoot, HIGH_WATER_NAME),
        "utf8",
      ),
      nextHighWater,
    );
    assert.equal(
      fs.existsSync(
        path.join(f.highWaterRoot, INTENT_NAME),
      ),
      false,
    );
  } finally {
    cleanup(f);
  }
}

{
  const f = fixture();
  try {
    writeIntent(f);
    const recoveredOnly =
      persistBuyVoidAllocationReservationPublicationWriterV1({
        ledger_root: f.ledgerRoot,
        high_water_root: f.highWaterRoot,
        next_ledger_jsonl: ledger2,
      });
    assert.equal(recoveredOnly.ok, true);
    if (!recoveredOnly.ok) throw new Error(recoveredOnly.reason);
    assert.equal(recoveredOnly.status, "recovered");
    assert.equal(recoveredOnly.operation_performed, true);
    assert.equal(
      fs.readFileSync(
        path.join(f.ledgerRoot, LEDGER_NAME),
        "utf8",
      ),
      ledger1,
      "recovery must be terminal for the invocation",
    );
    assert.equal(
      fs.readFileSync(
        path.join(f.highWaterRoot, HIGH_WATER_NAME),
        "utf8",
      ),
      nextHighWater,
    );
    assert.equal(
      fs.existsSync(
        path.join(f.highWaterRoot, INTENT_NAME),
      ),
      false,
    );
  } finally {
    cleanup(f);
  }
}

{
  const f = fixture(ledger1, genesisHighWater);
  try {
    writeIntent(f);
    const recovered =
      recoverBuyVoidAllocationReservationPublicationWriterV1({
        ledger_root: f.ledgerRoot,
        high_water_root: f.highWaterRoot,
      });
    assert.equal(recovered.ok, true);
    if (!recovered.ok) throw new Error(recovered.reason);
    assert.equal(recovered.status, "recovered");
    assert.equal(
      fs.readFileSync(
        path.join(f.ledgerRoot, LEDGER_NAME),
        "utf8",
      ),
      ledger1,
    );
    assert.equal(
      fs.readFileSync(
        path.join(f.highWaterRoot, HIGH_WATER_NAME),
        "utf8",
      ),
      nextHighWater,
    );
  } finally {
    cleanup(f);
  }
}

{
  const f = fixture(ledger1, nextHighWater);
  try {
    writeIntent(f);
    const recovered =
      recoverBuyVoidAllocationReservationPublicationWriterV1({
        ledger_root: f.ledgerRoot,
        high_water_root: f.highWaterRoot,
      });
    assert.equal(recovered.ok, true);
    if (!recovered.ok) throw new Error(recovered.reason);
    assert.equal(recovered.status, "recovered");
    assert.equal(recovered.record_count, 1);
    assert.equal(
      fs.existsSync(
        path.join(f.highWaterRoot, INTENT_NAME),
      ),
      false,
    );
  } finally {
    cleanup(f);
  }
}

{
  const f = fixture("", nextHighWater);
  try {
    writeIntent(f);
    const held =
      recoverBuyVoidAllocationReservationPublicationWriterV1({
        ledger_root: f.ledgerRoot,
        high_water_root: f.highWaterRoot,
      });
    assert.equal(held.ok, false);
    if (held.ok) throw new Error("expected high-water-ahead HOLD");
    assert.match(
      held.reason,
      /allocation_reservation_publication_high_water_ahead/u,
    );
    assert.equal(
      fs.existsSync(
        path.join(f.highWaterRoot, INTENT_NAME),
      ),
      true,
    );
  } finally {
    cleanup(f);
  }
}

{
  const f = fixture();
  try {
    const held =
      persistBuyVoidAllocationReservationPublicationWriterV1({
        ledger_root: f.ledgerRoot,
        high_water_root: f.highWaterRoot,
        next_ledger_jsonl: ledger2,
      });
    assert.equal(held.ok, false);
    if (held.ok) throw new Error("expected multi-record jump HOLD");
    assert.match(
      held.reason,
      /allocation_reservation_publication_advance_/u,
    );
    assert.equal(
      fs.readFileSync(
        path.join(f.ledgerRoot, LEDGER_NAME),
        "utf8",
      ),
      "",
    );
  } finally {
    cleanup(f);
  }
}

{
  const f = fixture();
  try {
    const held =
      recoverBuyVoidAllocationReservationPublicationWriterV1({
        ledger_root: f.ledgerRoot,
        high_water_root: f.ledgerRoot,
      });
    assert.equal(held.ok, false);
    if (held.ok) throw new Error("expected same-root HOLD");
    assert.equal(
      held.reason,
      "allocation_reservation_writer_storage_roots_must_be_disjoint",
    );
  } finally {
    cleanup(f);
  }
}

{
  const root = fs.mkdtempSync(
    path.join(os.tmpdir(), "void-allocation-writer-nested-v1-"),
  );
  fs.chmodSync(root, 0o700);
  const ledgerRoot = path.join(root, "ledger");
  const highWaterRoot = path.join(ledgerRoot, "high-water");
  fs.mkdirSync(ledgerRoot, { mode: 0o700 });
  fs.mkdirSync(highWaterRoot, { mode: 0o700 });
  fs.writeFileSync(
    path.join(ledgerRoot, LEDGER_NAME),
    "",
    { mode: 0o600 },
  );
  fs.writeFileSync(
    path.join(highWaterRoot, HIGH_WATER_NAME),
    genesisHighWater,
    { mode: 0o600 },
  );
  try {
    const held =
      recoverBuyVoidAllocationReservationPublicationWriterV1({
        ledger_root: ledgerRoot,
        high_water_root: highWaterRoot,
      });
    assert.equal(held.ok, false);
    if (held.ok) throw new Error("expected nested-root HOLD");
    assert.equal(
      held.reason,
      "allocation_reservation_writer_storage_roots_must_be_disjoint",
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

{
  const f = fixture();
  const symlink = path.join(f.root, "ledger-link");
  try {
    fs.symlinkSync(f.ledgerRoot, symlink);
    const held =
      recoverBuyVoidAllocationReservationPublicationWriterV1({
        ledger_root: symlink,
        high_water_root: f.highWaterRoot,
      });
    assert.equal(held.ok, false);
    if (held.ok) throw new Error("expected symlink-root HOLD");
    assert.match(
      held.reason,
      /allocation_reservation_writer_ledger_directory_invalid/u,
    );
  } finally {
    cleanup(f);
  }
}

{
  const f = fixture();
  try {
    const foreign = path.join(f.highWaterRoot, "foreign-intent.json");
    fs.writeFileSync(foreign, "{}\n", { mode: 0o600 });
    fs.symlinkSync(foreign, path.join(f.highWaterRoot, INTENT_NAME));
    const held =
      recoverBuyVoidAllocationReservationPublicationWriterV1({
        ledger_root: f.ledgerRoot,
        high_water_root: f.highWaterRoot,
      });
    assert.equal(held.ok, false);
    if (held.ok) throw new Error("expected optional-intent symlink HOLD");
    assert.match(
      held.reason,
      /allocation_reservation_writer_intent_file_invalid/u,
    );
  } finally {
    cleanup(f);
  }
}

{
  const f = fixture();
  try {
    fs.writeFileSync(
      path.join(f.ledgerRoot, INTENT_NAME),
      intent,
      { mode: 0o600 },
    );
    fs.writeFileSync(
      path.join(f.highWaterRoot, INTENT_NAME),
      intent.replace(
        /"record_id":"[^"]+"/u,
        '"record_id":"voidalloc1_' + "9".repeat(64) + '"',
      ),
      { mode: 0o600 },
    );
    const held =
      recoverBuyVoidAllocationReservationPublicationWriterV1({
        ledger_root: f.ledgerRoot,
        high_water_root: f.highWaterRoot,
      });
    assert.equal(held.ok, false);
    if (held.ok) throw new Error("expected divergent intent copies HOLD");
    assert.equal(
      held.reason,
      "allocation_reservation_writer_intent_copies_mismatch",
    );
  } finally {
    cleanup(f);
  }
}

{
  const f = fixture();
  try {
    const tempName =
      "." +
      INTENT_NAME +
      ".tmp-" +
      String(process.pid) +
      "-0123456789abcdef";
    fs.writeFileSync(
      path.join(f.highWaterRoot, tempName),
      intent,
      { mode: 0o600 },
    );
    const clean =
      recoverBuyVoidAllocationReservationPublicationWriterV1({
        ledger_root: f.ledgerRoot,
        high_water_root: f.highWaterRoot,
      });
    assert.equal(clean.ok, true);
    if (!clean.ok) throw new Error(clean.reason);
    assert.equal(clean.status, "clean");
    assert.equal(
      fs.existsSync(path.join(f.highWaterRoot, tempName)),
      false,
    );
  } finally {
    cleanup(f);
  }
}

{
  const f = fixture();
  try {
    const written =
      persistBuyVoidAllocationReservationPublicationWriterV1({
        ledger_root: f.ledgerRoot,
        high_water_root: f.highWaterRoot,
        next_ledger_jsonl: ledger1,
      });
    assert.equal(written.ok, true);
    if (!written.ok) throw new Error(written.reason);

    fs.writeFileSync(
      path.join(f.ledgerRoot, LEDGER_NAME),
      "",
      { mode: 0o600 },
    );
    const held =
      recoverBuyVoidAllocationReservationPublicationWriterV1({
        ledger_root: f.ledgerRoot,
        high_water_root: f.highWaterRoot,
      });
    assert.equal(held.ok, false);
    if (held.ok) throw new Error("expected rollback HOLD");
    assert.match(
      held.reason,
      /allocation_reservation_high_water_binding_mismatch/u,
    );
  } finally {
    cleanup(f);
  }
}

{
  const f = fixture();
  try {
    fs.unlinkSync(path.join(f.ledgerRoot, LEDGER_NAME));
    const held =
      recoverBuyVoidAllocationReservationPublicationWriterV1({
        ledger_root: f.ledgerRoot,
        high_water_root: f.highWaterRoot,
      });
    assert.equal(held.ok, false);
  } finally {
    cleanup(f);
  }
}

function provePostRevalidationRootSwapRecovery(
  replaceRoot: "ledger" | "high-water",
): void {
  const f = fixture();
  const originalRename = fs.renameSync;
  const detached = path.join(
    f.root,
    replaceRoot === "ledger"
      ? "postcheck-ledger-detached"
      : "postcheck-high-water-detached",
  );
  let injected = false;
  try {
    (fs as any).renameSync = (
      oldPath: fs.PathLike,
      newPath: fs.PathLike,
    ) => {
      const target = path.basename(String(newPath));
      const trigger =
        replaceRoot === "high-water"
          ? target === LEDGER_NAME
          : target === HIGH_WATER_NAME;
      if (!injected && trigger) {
        injected = true;
        if (replaceRoot === "high-water") {
          originalRename(f.highWaterRoot, detached);
          fs.mkdirSync(f.highWaterRoot, { mode: 0o700 });
          fs.writeFileSync(
            path.join(f.highWaterRoot, HIGH_WATER_NAME),
            genesisHighWater,
            { mode: 0o600 },
          );
        } else {
          originalRename(f.ledgerRoot, detached);
          fs.mkdirSync(f.ledgerRoot, { mode: 0o700 });
          fs.writeFileSync(
            path.join(f.ledgerRoot, LEDGER_NAME),
            "",
            { mode: 0o600 },
          );
        }
      }
      return originalRename(oldPath, newPath);
    };

    const held =
      persistBuyVoidAllocationReservationPublicationWriterV1({
        ledger_root: f.ledgerRoot,
        high_water_root: f.highWaterRoot,
        next_ledger_jsonl: ledger1,
      });
    assert.equal(injected, true);
    assert.equal(held.ok, false);

    if (replaceRoot === "high-water") {
      assert.equal(
        fs.readFileSync(
          path.join(f.ledgerRoot, LEDGER_NAME),
          "utf8",
        ),
        ledger1,
      );
      assert.equal(
        fs.readFileSync(
          path.join(f.highWaterRoot, HIGH_WATER_NAME),
          "utf8",
        ),
        genesisHighWater,
      );
      assert.equal(
        fs.existsSync(path.join(f.ledgerRoot, INTENT_NAME)),
        true,
      );
      assert.equal(
        fs.existsSync(path.join(f.highWaterRoot, INTENT_NAME)),
        false,
      );
    } else {
      assert.equal(
        fs.readFileSync(
          path.join(f.ledgerRoot, LEDGER_NAME),
          "utf8",
        ),
        "",
      );
      assert.equal(
        fs.readFileSync(
          path.join(f.highWaterRoot, HIGH_WATER_NAME),
          "utf8",
        ),
        nextHighWater,
      );
      assert.equal(
        fs.existsSync(path.join(f.ledgerRoot, INTENT_NAME)),
        false,
      );
      assert.equal(
        fs.existsSync(path.join(f.highWaterRoot, INTENT_NAME)),
        true,
      );
    }
  } finally {
    (fs as any).renameSync = originalRename;
  }

  try {
    const recovered =
      recoverBuyVoidAllocationReservationPublicationWriterV1({
        ledger_root: f.ledgerRoot,
        high_water_root: f.highWaterRoot,
      });
    assert.equal(recovered.ok, true);
    if (!recovered.ok) throw new Error(recovered.reason);
    assert.equal(recovered.status, "recovered");
    assert.equal(
      fs.readFileSync(
        path.join(f.ledgerRoot, LEDGER_NAME),
        "utf8",
      ),
      ledger1,
    );
    assert.equal(
      fs.readFileSync(
        path.join(f.highWaterRoot, HIGH_WATER_NAME),
        "utf8",
      ),
      nextHighWater,
    );
    assert.equal(
      fs.existsSync(path.join(f.ledgerRoot, INTENT_NAME)),
      false,
    );
    assert.equal(
      fs.existsSync(path.join(f.highWaterRoot, INTENT_NAME)),
      false,
    );
  } finally {
    cleanup(f);
  }
}

provePostRevalidationRootSwapRecovery("high-water");
provePostRevalidationRootSwapRecovery("ledger");

async function proveSingleRootReplacementLock(
  replaceRoot: "ledger" | "high-water",
): Promise<void> {
  const f = fixture();
  const detached = path.join(
    f.root,
    replaceRoot === "ledger" ? "ledger-detached" : "high-water-detached",
  );
  const aStarted = path.join(f.root, replaceRoot + "-a-started");
  const aEntered = path.join(f.root, replaceRoot + "-a-entered");
  const aRelease = path.join(f.root, replaceRoot + "-a-release");
  const bStarted = path.join(f.root, replaceRoot + "-b-started");
  const bResult = path.join(f.root, replaceRoot + "-b-result.json");
  const nextLedgerPath = path.join(f.root, replaceRoot + "-next.jsonl");
  let first: LockChildV1 | null = null;
  let secondChild: LockChildV1 | null = null;
  try {
    fs.writeFileSync(nextLedgerPath, ledger1, { mode: 0o600 });
    first = spawnLockChild(
      f.ledgerRoot, f.highWaterRoot, aStarted, aEntered, aRelease,
    );
    await waitForPath(aStarted, first, replaceRoot + "_first_started");
    await waitForPath(aEntered, first, replaceRoot + "_first_entered");

    if (replaceRoot === "high-water") {
      fs.renameSync(f.highWaterRoot, detached);
      fs.mkdirSync(f.highWaterRoot, { mode: 0o700 });
      fs.writeFileSync(
        path.join(f.highWaterRoot, HIGH_WATER_NAME),
        genesisHighWater,
        { mode: 0o600 },
      );
    } else {
      fs.renameSync(f.ledgerRoot, detached);
      fs.mkdirSync(f.ledgerRoot, { mode: 0o700 });
      fs.writeFileSync(
        path.join(f.ledgerRoot, LEDGER_NAME),
        "",
        { mode: 0o600 },
      );
    }

    secondChild = spawnPersistChild(
      f.ledgerRoot,
      f.highWaterRoot,
      nextLedgerPath,
      bStarted,
      bResult,
    );
    await waitForPath(
      bStarted, secondChild, replaceRoot + "_second_started",
    );

    const sharedQueue =
      replaceRoot === "high-water"
        ? path.join(
            f.ledgerRoot,
            ".allocation-reservation-publication-v1.queue",
          )
        : path.join(
            f.highWaterRoot,
            ".allocation-reservation-publication-v1.queue",
          );
    await waitForTicketCount(
      sharedQueue,
      2,
      secondChild,
      replaceRoot + "_shared_lock_wait",
    );
    assert.equal(
      fs.existsSync(bResult),
      false,
      replaceRoot +
        " replacement must not let a valid competing publication enter",
    );
    assert.equal(
      fs.readFileSync(
        path.join(f.ledgerRoot, LEDGER_NAME),
        "utf8",
      ),
      "",
      replaceRoot + " replacement must not split ledger serialization",
    );

    fs.writeFileSync(aRelease, "release\n", { mode: 0o600 });
    await waitForChild(first, replaceRoot + "_first");
    await waitForPath(
      bResult, secondChild, replaceRoot + "_second_result",
    );
    await waitForChild(secondChild, replaceRoot + "_second");

    const decision = JSON.parse(fs.readFileSync(bResult, "utf8"));
    assert.equal(decision.ok, true);
    assert.equal(decision.status, "persisted");
    assert.equal(
      fs.readFileSync(
        path.join(f.ledgerRoot, LEDGER_NAME),
        "utf8",
      ),
      ledger1,
    );
    assert.equal(
      fs.readFileSync(
        path.join(f.highWaterRoot, HIGH_WATER_NAME),
        "utf8",
      ),
      nextHighWater,
    );
  } finally {
    for (const child of [first, secondChild]) {
      if (child && child.child.exitCode === null) child.child.kill("SIGKILL");
    }
    cleanup(f);
  }
}

await proveSingleRootReplacementLock("high-water");
await proveSingleRootReplacementLock("ledger");

console.log(
  "VOID_BUY_VOID_ALLOCATION_RESERVATION_PUBLICATION_WRITER_V1_PROOF_GREEN",
);
console.log("canonical_jsonl_authority=true");
console.log("copy_on_write_exact_single_append=true");
console.log("intent_only_recovery=true");
console.log("ledger_committed_recovery=true");
console.log("recovery_terminal_before_new_transition=true");
console.log("complete_recovery=true");
console.log("high_water_ahead_hold=true");
console.log("multi_record_jump_hold=true");
console.log("rollback_hold=true");
console.log("descriptor_bound_private_roots=true");
console.log("descriptor_safety_missing_fails_closed=true");
console.log("separate_storage_roots_required=true");
console.log("nested_storage_roots_hold=true");
console.log("optional_intent_symlink_hold=true");
console.log("pre_replace_authority_revalidation=true");
console.log("dual_root_serialization_lock=true");
console.log("high_water_root_replacement_keeps_shared_lock=true");
console.log("ledger_root_replacement_keeps_shared_lock=true");
console.log("single_root_replacement_blocks_valid_competing_publication=true");
console.log("redundant_publication_intent=true");
console.log("divergent_intent_copies_hold=true");
console.log("high_water_root_postcheck_swap_self_recovers=true");
console.log("ledger_root_postcheck_swap_self_recovers=true");
console.log("deterministic_dual_lock_order=true");
console.log("post_publication_root_swap_mixed_state_hold=true");
console.log("post_admission_root_path_stability_proven=false");
console.log("single_root_post_publication_recovery=false");
console.log("storage_bootstrap=false");
console.log("runtime_integration=false");
console.log("protected_high_water_custody_proven=false");
console.log("production_gate_ready=false");
console.log("funds_movement=false");
console.log(
  "marker=" +
    VOID_BUY_VOID_ALLOCATION_RESERVATION_PUBLICATION_WRITER_V1,
);
