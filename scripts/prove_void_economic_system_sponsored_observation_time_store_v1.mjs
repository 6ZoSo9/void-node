#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  VOID_ECONOMIC_SYSTEM_SPONSORED_OBSERVATION_TIME_STORE_AUTHORITY_V1,
  VOID_ECONOMIC_SYSTEM_SPONSORED_OBSERVATION_TIME_STORE_V1,
  createVoidEconomicSystemSponsoredObservationTimeStoreV1,
} from "../tools/void-economic-system-sponsored-observation-time-store-v1.mjs";
import {
  verifyVoidEconomicSystemSponsoredObservationTimeReceiptV1,
} from "../tools/void-economic-system-sponsored-observation-time-v1.mjs";

const BOOT_A = "11111111-1111-1111-1111-111111111111";
const BOOT_B = "22222222-2222-2222-2222-222222222222";
const BASE_WALL = 1_800_000_000_000;
const BASE_MONO = 9_000_000_000_000n;

function sample({
  boot = BOOT_A,
  start = "123456",
  wall = BASE_WALL,
  mono = BASE_MONO,
} = {}) {
  return {
    boot_id: boot,
    process_start_ticks: start,
    wall_time_ms: wall,
    monotonic_ns: mono.toString(),
  };
}

function clockQueue(values) {
  const queue = [...values];
  let calls = 0;
  return {
    clock() {
      calls += 1;
      if (queue.length < 1) throw new Error("proof_clock_exhausted");
      return queue.shift();
    },
    calls() {
      return calls;
    },
  };
}

function fixture() {
  const root = fs.mkdtempSync(
    path.join(os.tmpdir(), "void-sponsored-time-store-"),
  );
  fs.chmodSync(root, 0o700);
  const records = path.join(root, "records");
  const queue = path.join(root, "observation-time-v1.queue");
  fs.mkdirSync(records, { mode: 0o700 });
  fs.mkdirSync(queue, { mode: 0o700 });
  return { root, records, queue };
}

function cleanup(f) {
  fs.rmSync(f.root, { recursive: true, force: true });
}

function requireOk(value) {
  assert.equal(value.ok, true, JSON.stringify(value));
  assert.equal(value.status, "source_accepted");
  assert.equal(value.observation_performed, true);
  assert.equal(value.durable_receipt_store_source_verified, true);
  assert.equal(value.live_durable_receipt_storage_proven, false);
  assert.equal(value.trusted_clock_source_proven, false);
  assert.equal(value.trusted_clock_host_binding_proven, false);
  assert.equal(value.receipt_store_rollback_resistance_proven, false);
  assert.equal(value.cross_process_restart_continuity_proven, false);
  assert.equal(value.cross_boot_restart_continuity_proven, false);
  assert.equal(value.runtime_enforcement_verified, false);
  assert.equal(value.gas_sponsorship_performed, false);
  assert.equal(value.transaction_submission, false);
  assert.equal(value.funds_movement, false);
  return value;
}

function requireHeld(value, reason = null) {
  assert.equal(value.ok, false, JSON.stringify(value));
  assert.equal(value.status, "held");
  if (reason !== null) assert.equal(value.reason, reason);
  assert.equal(value.durable_receipt_store_source_verified, true);
  assert.equal(value.live_durable_receipt_storage_proven, false);
  assert.equal(value.runtime_enforcement_verified, false);
  assert.equal(value.gas_sponsorship_performed, false);
  assert.equal(value.transaction_submission, false);
  assert.equal(value.funds_movement, false);
  return value;
}

function canonicalJson(value) {
  if (value === null) return "null";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number" && Number.isSafeInteger(value)) {
    return String(value);
  }
  if (Array.isArray(value)) {
    return "[" + value.map(canonicalJson).join(",") + "]";
  }
  if (value && typeof value === "object") {
    return (
      "{" +
      Object.keys(value)
        .sort()
        .map((key) => JSON.stringify(key) + ":" + canonicalJson(value[key]))
        .join(",") +
      "}"
    );
  }
  throw new Error("proof_noncanonical");
}

function rehash(receipt) {
  const body = { ...receipt };
  delete body.receipt_sha256;
  return {
    ...body,
    receipt_sha256:
      "sha256:" +
      crypto.createHash("sha256").update(canonicalJson(body)).digest("hex"),
  };
}

function writeReceipt(records, receipt) {
  const name =
    receipt.receipt_sha256.slice("sha256:".length) + ".json";
  fs.writeFileSync(
    path.join(records, name),
    canonicalJson(receipt) + "\n",
    { mode: 0o600, flag: "wx" },
  );
  return name;
}

for (const [key, value] of Object.entries(
  VOID_ECONOMIC_SYSTEM_SPONSORED_OBSERVATION_TIME_STORE_AUTHORITY_V1,
)) {
  const trueKeys = new Set([
    "source_only_store",
    "canonical_observation_contract_reused",
    "canonical_receipt_verifier_reused",
    "durable_receipt_store_source_verified",
    "append_only_history",
    "unique_receipt_chain_enforced",
    "serialized_observation",
    "descriptor_bound_reads",
    "create_once_publication",
    "historical_receipts_retained",
    "filesystem_read",
    "filesystem_write",
  ]);
  assert.equal(value, trueKeys.has(key), key);
}

{
  const f = fixture();
  try {
    const clock = clockQueue([
      sample(),
      sample({
        wall: BASE_WALL + 1000,
        mono: BASE_MONO + 1_000_000_000n,
      }),
    ]);
    const store =
      createVoidEconomicSystemSponsoredObservationTimeStoreV1({
        root_dir: f.root,
        trustedClock: clock.clock,
      });

    const empty = store.inspect();
    assert.equal(empty.ok, true);
    assert.equal(empty.status, "source_inspected");
    assert.equal(empty.durable_receipt_count, 0);
    assert.equal(empty.head_receipt_sha256, null);
    assert.equal(empty.mutation_performed, false);

    requireHeld(
      await store.observe({ observed_at_ms: BASE_WALL }),
      "SPONSORED_OBSERVATION_TIME_STORE_REQUEST_INPUT_FORBIDDEN",
    );
    assert.equal(clock.calls(), 0);

    const first = requireOk(await store.observe());
    assert.equal(first.generation, "0");
    assert.equal(first.durable_receipt_count, 1);
    assert.equal(clock.calls(), 1);

    const second = requireOk(await store.observe());
    assert.equal(second.generation, "1");
    assert.equal(second.durable_receipt_count, 2);
    assert.equal(clock.calls(), 2);

    const inspected = store.inspect();
    assert.equal(inspected.ok, true);
    assert.equal(inspected.durable_receipt_count, 2);
    assert.equal(inspected.head_generation, "1");
    assert.equal(inspected.head_receipt_sha256, second.head_receipt_sha256);

    const names = fs.readdirSync(f.records);
    assert.equal(names.length, 2);
    assert.equal(names.every((name) => /^[0-9a-f]{64}\.json$/u.test(name)), true);
  } finally {
    cleanup(f);
  }
}

{
  const f = fixture();
  try {
    const firstClock = clockQueue([sample()]);
    const firstStore =
      createVoidEconomicSystemSponsoredObservationTimeStoreV1({
        root_dir: f.root,
        trustedClock: firstClock.clock,
      });
    const first = requireOk(await firstStore.observe());
    assert.equal(first.generation, "0");

    const restartClock = clockQueue([
      sample({
        wall: BASE_WALL + 1000,
        mono: BASE_MONO + 1_000_000_000n,
      }),
    ]);
    const restarted =
      createVoidEconomicSystemSponsoredObservationTimeStoreV1({
        root_dir: f.root,
        trustedClock: restartClock.clock,
      });
    const next = requireOk(await restarted.observe());
    assert.equal(next.generation, "1");
    assert.equal(next.durable_receipt_count, 2);
    assert.equal(restartClock.calls(), 1);
  } finally {
    cleanup(f);
  }
}

{
  const f = fixture();
  try {
    const clock = clockQueue([
      sample(),
      sample({
        wall: BASE_WALL + 1000,
        mono: BASE_MONO + 1_000_000_000n,
      }),
    ]);
    const store =
      createVoidEconomicSystemSponsoredObservationTimeStoreV1({
        root_dir: f.root,
        trustedClock: clock.clock,
      });
    const results = await Promise.all([store.observe(), store.observe()]);
    assert.equal(results.every((value) => value.ok), true);
    const generations = results
      .map((value) => value.generation)
      .sort();
    assert.deepEqual(generations, ["0", "1"]);
    assert.equal(store.inspect().durable_receipt_count, 2);
    assert.equal(clock.calls(), 2);
  } finally {
    cleanup(f);
  }
}

{
  const f = fixture();
  try {
    const clock = clockQueue([
      sample(),
      sample({
        wall: BASE_WALL + 1000,
        mono: BASE_MONO + 1_000_000_000n,
      }),
    ]);
    const store =
      createVoidEconomicSystemSponsoredObservationTimeStoreV1({
        root_dir: f.root,
        trustedClock: clock.clock,
      });
    const first = requireOk(await store.observe());
    const finalName =
      first.head_receipt_sha256.slice("sha256:".length) + ".json";
    const tempName =
      "." + finalName + ".tmp-" + process.pid + "-aaaaaaaaaaaaaaaa";
    const tempPath = path.join(f.records, tempName);
    fs.writeFileSync(tempPath, Buffer.alloc(0), { mode: 0o600 });

    const held = requireHeld(
      store.inspect(),
      "SPONSORED_OBSERVATION_TIME_STORE_RECOVERY_REQUIRED",
    );
    assert.equal(held.mutation_performed, false);
    assert.equal(fs.existsSync(tempPath), true);

    const recovered = requireOk(await store.observe());
    assert.equal(recovered.generation, "1");
    assert.equal(recovered.mutation_performed, true);
    assert.equal(fs.existsSync(tempPath), false);
  } finally {
    cleanup(f);
  }
}

{
  const f = fixture();
  try {
    const clock = clockQueue([
      sample(),
      sample({
        wall: BASE_WALL + 1000,
        mono: BASE_MONO + 1_000_000_000n,
      }),
    ]);
    const store =
      createVoidEconomicSystemSponsoredObservationTimeStoreV1({
        root_dir: f.root,
        trustedClock: clock.clock,
      });
    const first = requireOk(await store.observe());
    const finalName =
      first.head_receipt_sha256.slice("sha256:".length) + ".json";
    const finalPath = path.join(f.records, finalName);
    const linkedTemp =
      path.join(
        f.records,
        "." + finalName + ".tmp-" + process.pid + "-bbbbbbbbbbbbbbbb",
      );
    fs.linkSync(finalPath, linkedTemp);
    requireHeld(
      store.inspect(),
      "SPONSORED_OBSERVATION_TIME_STORE_RECOVERY_REQUIRED",
    );
    assert.equal(fs.lstatSync(finalPath).nlink, 2);
    const next = requireOk(await store.observe());
    assert.equal(next.generation, "1");
    assert.equal(next.mutation_performed, true);
    assert.equal(fs.existsSync(linkedTemp), false);
    assert.equal(fs.lstatSync(finalPath).nlink, 1);
  } finally {
    cleanup(f);
  }
}

{
  const f = fixture();
  try {
    const clock = clockQueue([
      sample(),
      sample({
        wall: BASE_WALL + 1000,
        mono: BASE_MONO + 1_000_000_000n,
      }),
    ]);
    const store =
      createVoidEconomicSystemSponsoredObservationTimeStoreV1({
        root_dir: f.root,
        trustedClock: clock.clock,
      });
    const first = requireOk(await store.observe());
    requireOk(await store.observe());
    const firstFile =
      first.head_receipt_sha256.slice("sha256:".length) + ".json";
    const firstReceipt = JSON.parse(
      fs.readFileSync(path.join(f.records, firstFile), "utf8"),
    );
    const alt = rehash({
      ...firstReceipt,
      generation: "1",
      previous_receipt_sha256: firstReceipt.receipt_sha256,
      observed_at_ms: firstReceipt.observed_at_ms + 2,
      monotonic_ns: (BigInt(firstReceipt.monotonic_ns) + 2_000_000n).toString(),
    });
    writeReceipt(f.records, alt);
    requireHeld(
      store.inspect(),
      "SPONSORED_OBSERVATION_TIME_STORE_GENERATION_DISCONTINUITY",
    );
  } finally {
    cleanup(f);
  }
}

{
  const f = fixture();
  try {
    const clock = clockQueue([
      sample(),
      sample({
        wall: BASE_WALL + 1000,
        mono: BASE_MONO + 1_000_000_000n,
      }),
    ]);
    const store =
      createVoidEconomicSystemSponsoredObservationTimeStoreV1({
        root_dir: f.root,
        trustedClock: clock.clock,
      });
    const first = requireOk(await store.observe());
    const second = requireOk(await store.observe());
    const firstFile =
      first.head_receipt_sha256.slice("sha256:".length) + ".json";
    const secondFile =
      second.head_receipt_sha256.slice("sha256:".length) + ".json";
    const firstReceipt = JSON.parse(
      fs.readFileSync(path.join(f.records, firstFile), "utf8"),
    );
    const secondReceipt = JSON.parse(
      fs.readFileSync(path.join(f.records, secondFile), "utf8"),
    );
    fs.unlinkSync(path.join(f.records, secondFile));
    const changedBaseline = rehash({
      ...secondReceipt,
      baseline_wall_time_ms: firstReceipt.baseline_wall_time_ms + 1,
      baseline_monotonic_ns:
        (BigInt(firstReceipt.baseline_monotonic_ns) + 1_000_000n).toString(),
    });
    writeReceipt(f.records, changedBaseline);
    requireHeld(
      store.inspect(),
      "SPONSORED_OBSERVATION_TIME_STORE_CHAIN_IDENTITY_CHANGED",
    );
  } finally {
    cleanup(f);
  }
}

{
  const f = fixture();
  try {
    fs.writeFileSync(
      path.join(f.records, "f".repeat(64) + ".json"),
      "{}\n",
      { mode: 0o600 },
    );
    const store =
      createVoidEconomicSystemSponsoredObservationTimeStoreV1({
        root_dir: f.root,
        trustedClock: () => sample(),
      });
    const held = requireHeld(store.inspect());
    assert.match(
      held.reason,
      /SPONSORED_OBSERVATION_TIME_STORE_RECORD_/u,
    );
  } finally {
    cleanup(f);
  }
}

{
  const f = fixture();
  try {
    const foreign = path.join(f.root, "foreign.json");
    fs.writeFileSync(foreign, "{}\n", { mode: 0o600 });
    fs.symlinkSync(
      foreign,
      path.join(f.records, "e".repeat(64) + ".json"),
    );
    const store =
      createVoidEconomicSystemSponsoredObservationTimeStoreV1({
        root_dir: f.root,
        trustedClock: () => sample(),
      });
    const held = requireHeld(store.inspect());
    assert.match(held.reason, /RECORD_FILE_INVALID/u);
  } finally {
    cleanup(f);
  }
}

{
  const f = fixture();
  try {
    const firstClock = clockQueue([sample()]);
    const store =
      createVoidEconomicSystemSponsoredObservationTimeStoreV1({
        root_dir: f.root,
        trustedClock: firstClock.clock,
      });
    requireOk(await store.observe());

    const bootClock = clockQueue([
      sample({
        boot: BOOT_B,
        wall: BASE_WALL + 1000,
        mono: BASE_MONO + 1_000_000_000n,
      }),
    ]);
    const restarted =
      createVoidEconomicSystemSponsoredObservationTimeStoreV1({
        root_dir: f.root,
        trustedClock: bootClock.clock,
      });
    const held = requireHeld(
      await restarted.observe(),
      "sponsored_observation_time_boot_changed",
    );
    assert.equal(held.observation_performed, true);
    assert.equal(restarted.inspect().durable_receipt_count, 1);
  } finally {
    cleanup(f);
  }
}

{
  const f = fixture();
  try {
    const clock = clockQueue([sample()]);
    const store =
      createVoidEconomicSystemSponsoredObservationTimeStoreV1({
        root_dir: f.root,
        trustedClock: clock.clock,
      });
    const first = requireOk(await store.observe());
    const validName =
      first.head_receipt_sha256.slice("sha256:".length) + ".json";
    const validPath = path.join(f.records, validName);
    const validReceipt = JSON.parse(fs.readFileSync(validPath, "utf8"));
    const invalidReceipt = rehash({
      ...validReceipt,
      wall_monotonic_skew_allowance_ms:
        validReceipt.wall_monotonic_skew_allowance_ms + 1,
    });
    assert.throws(
      () =>
        verifyVoidEconomicSystemSponsoredObservationTimeReceiptV1(
          invalidReceipt,
        ),
      /sponsored_observation_time_prior_receipt_invalid/u,
    );
    fs.unlinkSync(validPath);
    writeReceipt(f.records, invalidReceipt);
    requireHeld(
      store.inspect(),
      "SPONSORED_OBSERVATION_TIME_STORE_RECORD_RECEIPT_INVALID",
    );
  } finally {
    cleanup(f);
  }
}

{
  const root = fs.mkdtempSync(
    path.join(os.tmpdir(), "void-sponsored-time-store-no-queue-"),
  );
  fs.chmodSync(root, 0o700);
  const records = path.join(root, "records");
  const queue = path.join(root, "observation-time-v1.queue");
  fs.mkdirSync(records, { mode: 0o700 });
  try {
    const clock = clockQueue([sample()]);
    const store =
      createVoidEconomicSystemSponsoredObservationTimeStoreV1({
        root_dir: root,
        trustedClock: clock.clock,
      });
    requireHeld(
      store.inspect(),
      "SPONSORED_OBSERVATION_TIME_STORE_LOCK_QUEUE_DIRECTORY_MISSING",
    );
    assert.equal(fs.existsSync(queue), false);
    requireHeld(
      await store.observe(),
      "SPONSORED_OBSERVATION_TIME_STORE_LOCK_QUEUE_DIRECTORY_MISSING",
    );
    assert.equal(clock.calls(), 0);
    assert.equal(fs.existsSync(queue), false);
    assert.equal(fs.lstatSync(records).mode & 0o777, 0o700);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

{
  const f = fixture();
  try {
    fs.chmodSync(f.queue, 0o755);
    const beforeMode = fs.lstatSync(f.queue).mode & 0o777;
    const clock = clockQueue([sample()]);
    const store =
      createVoidEconomicSystemSponsoredObservationTimeStoreV1({
        root_dir: f.root,
        trustedClock: clock.clock,
      });
    requireHeld(
      store.inspect(),
      "SPONSORED_OBSERVATION_TIME_STORE_LOCK_QUEUE_DIRECTORY_INVALID",
    );
    requireHeld(
      await store.observe(),
      "SPONSORED_OBSERVATION_TIME_STORE_LOCK_QUEUE_DIRECTORY_INVALID",
    );
    assert.equal(clock.calls(), 0);
    assert.equal(fs.lstatSync(f.queue).mode & 0o777, beforeMode);
  } finally {
    cleanup(f);
  }
}

{
  const missingRoot =
    path.join(os.tmpdir(), "void-sponsored-time-store-missing-" + process.pid);
  fs.rmSync(missingRoot, { recursive: true, force: true });
  const store =
    createVoidEconomicSystemSponsoredObservationTimeStoreV1({
      root_dir: missingRoot,
      trustedClock: () => sample(),
    });
  const held = requireHeld(store.inspect());
  assert.equal(
    VOID_ECONOMIC_SYSTEM_SPONSORED_OBSERVATION_TIME_STORE_AUTHORITY_V1
      .storage_bootstrap,
    false,
  );
  assert.equal(fs.existsSync(missingRoot), false);
  assert.match(
    held.reason,
    /SPONSORED_OBSERVATION_TIME_STORE_ROOT_/u,
  );
}

const source = fs.readFileSync(
  "tools/void-economic-system-sponsored-observation-time-store-v1.mjs",
  "utf8",
);
assert.match(source, /withBuyVoidFilesystemBakeryLockAsyncV1/u);
assert.match(source, /openLockQueueDirectory/u);
assert.match(source, /LOCK_QUEUE_DIRECTORY/u);
assert.match(source, /createVoidEconomicSystemSponsoredObservationTimeV1/u);
assert.match(
  source,
  /verifyVoidEconomicSystemSponsoredObservationTimeReceiptV1/u,
);
assert.match(
  source,
  /canonicalVoidEconomicSystemSponsoredObservationTimeReceiptBytesV1/u,
);
assert.match(source, /prior_receipt: before\.head\?\.receipt \|\| null/u);
assert.match(source, /args\.length !== 0/u);
assert.match(source, /O_NOFOLLOW/u);
assert.match(source, /O_DIRECTORY/u);
assert.match(source, /fs\.fsyncSync/u);
assert.doesNotMatch(source, /Date\.now\s*\(/u);
assert.doesNotMatch(source, /process\.hrtime/u);
assert.doesNotMatch(
  source,
  /eth_sendRawTransaction|eth_sendTransaction|systemctl|mount\s|chown/u,
);

console.log(
  "VOID_ECONOMIC_SYSTEM_SPONSORED_OBSERVATION_TIME_STORE_V1_PROOF_GREEN",
);
console.log("caller_prior_receipt_input=false");
console.log("caller_timestamp_input=false");
console.log("durable_head_supplies_prior_receipt=true");
console.log("canonical_parent_receipt_verifier_reused=true");
console.log("durable_receipt_store_source_verified=true");
console.log("live_durable_receipt_storage_proven=false");
console.log("canonical_receipt_verifier_reused=true");
console.log("canonical_verifier_rejection_blocks_store_history=true");
console.log("serialized_observation=true");
console.log("concurrent_observation_serialized=true");
console.log("restart_reconstructs_durable_head=true");
console.log("unique_genesis_to_head_chain_required=true");
console.log("forked_or_discontinuous_history_hold=true");
console.log("changed_chain_baseline_hold=true");
console.log("crash_temp_recovery=true");
console.log("read_only_temp_cleanup=false");
console.log("boot_change_holds=true");
console.log("preprovisioned_lock_queue_required=true");
console.log("missing_lock_queue_does_not_bootstrap=true");
console.log("unsafe_lock_queue_mode_not_repaired=true");
console.log("storage_bootstrap=false");
console.log("receipt_store_rollback_resistance_proven=false");
console.log("trusted_clock_source_proven=false");
console.log("trusted_clock_host_binding_proven=false");
console.log("cross_process_restart_continuity_proven=false");
console.log("cross_boot_restart_continuity_proven=false");
console.log("runtime_enforcement_verified=false");
console.log("gas_sponsorship_performed=false");
console.log("transaction_submission=false");
console.log("funds_movement=false");
console.log(
  "marker=" +
    VOID_ECONOMIC_SYSTEM_SPONSORED_OBSERVATION_TIME_STORE_V1,
);
