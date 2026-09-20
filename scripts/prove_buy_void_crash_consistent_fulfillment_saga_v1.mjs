#!/usr/bin/env node

import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  ACTION_CONFIRMATIONS,
  ADVANCE_CONFIRMATION,
  AUTHORITY,
  MARKER,
  assertNoSecretMaterialV1,
  buildSagaEventV1,
  buildSagaRecordV1,
  buildNextEventFromActionResultV1,
  computeBroadcastIntentIdV1,
  canonicalJsonV1,
  computeSagaIdV1,
  createFilesystemSagaStoreV1,
  deriveSagaNextActionV1,
  foldSagaEventsV1,
  runSagaSupervisorTickV1,
  validateSagaRecordV1,
} from "../tools/buy-void-crash-consistent-fulfillment-saga-v1.mjs";

const ROOT = mkdtempSync(join(tmpdir(), "void-buy-void-saga-proof-"));
chmodSync(ROOT, 0o700);

const BINDING = Object.freeze({
  request_id: "buyvoid-hard-lane-request-v1",
  canonical_payment_identity: "stripe:pi_void_hard_lane_v1",
  request_key_sha256: "1".repeat(64),
  payment_key_sha256: "2".repeat(64),
  delivery_address: `0x${"3".repeat(40)}`,
  void_amount_units: "2500000",
  chain_id: "2050",
  pool_id: "void-fixed-price-pool-v1",
});
const SAGA_ID = computeSagaIdV1(BINDING);
const SOURCE_MAIN = "b724cb1bee1418bbfa5f8ad44974bebf4cd81c9e";
const TX_HASH = `0x${"4".repeat(64)}`;
const BLOCK_HASH = `0x${"5".repeat(64)}`;
const WALLET_FINGERPRINT = "6".repeat(64);
const RESERVATION_ID = "7".repeat(64);
const CLOSEOUT_ID = "8".repeat(64);
const PROVIDER_SUBMISSION = "9".repeat(64);
const ATTEMPT_ID = "buyvoid-hard-lane-attempt-v1";
const LOCK_CLAIM_SCHEMA =
  "void_buy_void_crash_consistent_fulfillment_saga_store_lock_claim_v2";

function clone(value) {
  return structuredClone(value);
}

async function expectReject(action, pattern, label) {
  let caught = null;
  try {
    await action();
  } catch (error) {
    caught = error;
  }
  assert.ok(caught, `${label}: expected rejection`);
  assert.match(String(caught?.message || caught), pattern, `${label}: wrong error`);
}

function waitForFiles(paths, timeoutMs = 10_000) {
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve, reject) => {
    const poll = () => {
      if (paths.every((path) => existsSync(path))) {
        resolve();
        return;
      }
      if (Date.now() >= deadline) {
        reject(new Error("competing_reclaimer_ready_timeout"));
        return;
      }
      setTimeout(poll, 5);
    };
    poll();
  });
}

function spawnLeaseContender({
  module_url,
  store_root,
  saga_id,
  owner_id,
  ready_path,
  barrier_path,
  result_path,
}) {
  let stderr = "";
  const child = spawn(
    process.execPath,
    [
      "--input-type=module",
      "--eval",
      `
import { existsSync, writeFileSync } from "node:fs";
const [moduleUrl, storeRoot, sagaId, ownerId, readyPath, barrierPath, resultPath] = process.argv.slice(1);
const sleeper = new Int32Array(new SharedArrayBuffer(4));
const { createFilesystemSagaStoreV1 } = await import(moduleUrl);
writeFileSync(readyPath, "ready", { flag: "wx", mode: 0o600 });
while (!existsSync(barrierPath)) Atomics.wait(sleeper, 0, 0, 5);
let result;
try {
  result = createFilesystemSagaStoreV1(storeRoot).acquireLease({
    saga_id: sagaId,
    owner_id: ownerId,
    now_ms: 10_200,
    ttl_ms: 100,
  });
} catch (error) {
  result = { threw: true, message: String(error?.message || error) };
}
writeFileSync(resultPath, JSON.stringify(result), { flag: "wx", mode: 0o600 });
`,
      module_url,
      store_root,
      saga_id,
      owner_id,
      ready_path,
      barrier_path,
      result_path,
    ],
    { stdio: ["ignore", "ignore", "pipe"] },
  );
  child.stderr.on("data", (chunk) => {
    stderr += chunk.toString("utf8");
  });
  return new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("close", (code) => resolve({ code, stderr }));
  });
}

function findDefinitelyDeadPid() {
  for (let pid = 2_000_000; pid < 2_001_000; pid += 1) {
    try {
      process.kill(pid, 0);
    } catch (error) {
      if (error?.code === "ESRCH") return pid;
      if (error?.code === "EPERM") continue;
      throw error;
    }
  }
  throw new Error("dead_pid_not_found_for_proof");
}

function adaptersFor(outcomes) {
  return {
    claim_payment: async () => ({
      payload: {
        claim_id: "buyvoid-hard-lane-claim-v1",
        instruction_id: "buyvoid-hard-lane-instruction-v1",
      },
    }),
    reserve_inventory: async () => ({
      payload: { reservation_id: RESERVATION_ID },
    }),
    reserve_execution_attempt: async () => ({
      payload: { attempt_id: ATTEMPT_ID, attempt_number: 1 },
    }),
    prepare_transaction: async () => ({
      payload: {
        attempt_id: ATTEMPT_ID,
        transaction_hash: TX_HASH,
        nonce: 42,
        fulfillment_wallet_fingerprint_sha256: WALLET_FINGERPRINT,
        gas_limit: "21000",
        max_fee_per_gas_wei: "1000000000",
        max_priority_fee_per_gas_wei: "100000000",
      },
    }),
    execute_prepared_transaction: async ({ record, broadcast_intent_id }) => {
      assert.equal(record.state.state, "broadcast_intent_committed");
      assert.equal(record.state.broadcast_intent_id, broadcast_intent_id);
      return ({
      outcome: outcomes.execute,
      payload: outcomes.execute === "broadcast_not_attempted"
        ? {
            attempt_id: ATTEMPT_ID,
            transaction_hash: TX_HASH,
            reason_code: "provider_not_called",
            broadcast_call_performed: false,
          }
        : {
            attempt_id: ATTEMPT_ID,
            transaction_hash: TX_HASH,
            reason_code: outcomes.execute === "broadcast_unknown"
              ? "provider_timeout_after_submission"
              : "provider_accepted",
            broadcast_call_performed: true,
            provider_submission_id_sha256: PROVIDER_SUBMISSION,
          },
      });
    },
    reconcile_possible_broadcast: async () => ({
      outcome: outcomes.reconcile,
      payload: outcomes.reconcile === "broadcast_accepted"
        ? {
            attempt_id: ATTEMPT_ID,
            transaction_hash: TX_HASH,
            reason_code: "transaction_visible_in_provider",
            broadcast_call_performed: true,
            provider_submission_id_sha256: PROVIDER_SUBMISSION,
          }
        : {
            attempt_id: ATTEMPT_ID,
            transaction_hash: TX_HASH,
            block_number: "100",
            block_hash: BLOCK_HASH,
            confirmations: 12,
            receipt_status: outcomes.reconcile === "receipt_confirmed" ? 1 : 0,
          },
    }),
    closeout_confirmed_delivery: async () => ({
      payload: {
        attempt_id: ATTEMPT_ID,
        transaction_hash: TX_HASH,
        closeout_id: CLOSEOUT_ID,
        inventory_decremented: true,
        public_request_fulfilled: true,
      },
    }),
  };
}

async function advance(store, action, nowMs, recordedAt, adapters) {
  const result = await runSagaSupervisorTickV1({
    store,
    binding: BINDING,
    owner_id: "proof-worker-a",
    now_ms: nowMs,
    lease_ttl_ms: 5_000,
    recorded_at_utc: recordedAt,
    source_floor_main: SOURCE_MAIN,
    policy_id: "void-buy-void-saga-policy-v1",
    apply: true,
    confirmation: ADVANCE_CONFIRMATION,
    action_confirmation: ACTION_CONFIRMATIONS[action],
    adapters,
  });
  assert.equal(result.ok, true, `${action}: tick held`);
  assert.equal(result.status, "applied", `${action}: not applied`);
  assert.equal(result.action, action, `${action}: wrong action`);
  assert.equal(result.automatic_retry_allowed, false);
  return result;
}

async function proveExpectedExecutePredecessorV1() {
  const names = [];
  const utc = "2026-08-05T20:00:00.000Z";
  const predecessor = (record) => ({
    saga_id: record.saga_id,
    event_count: record.state.event_count,
    last_event_id: record.state.last_event_id,
  });
  async function one(name, body, stages = 4) {
    const store = createFilesystemSagaStoreV1(join(ROOT, "predecessor-" + name));
    const adapters = adaptersFor({ execute: "broadcast_not_attempted", reconcile: "receipt_confirmed" });
    const steps = ["claim_payment", "reserve_inventory", "reserve_execution_attempt", "prepare_transaction"];
    for (let i = 0; i < stages; i += 1) {
      await advance(store, steps[i], 1000 + i, utc, adapters);
    }
    const current = store.recover(SAGA_ID);
    const counts = { acquire: 0, append: 0, release: 0, adapter: 0 };
    let lease;
    const wrapped = {
      recover: (...args) => store.recover(...args),
      acquireLease(arg) {
        counts.acquire += 1;
        const value = store.acquireLease(arg);
        lease = value.lease;
        return value;
      },
      appendEvent(arg) { counts.append += 1; return store.appendEvent(arg); },
      releaseLease(arg) { counts.release += 1; return store.releaseLease(arg); },
    };
    const invoke = adapters.execute_prepared_transaction;
    const input = {
      store: wrapped, binding: BINDING, owner_id: "predecessor-proof-worker",
      now_ms: 10000, lease_ttl_ms: 5000, recorded_at_utc: utc,
      source_floor_main: SOURCE_MAIN, policy_id: "void-buy-void-saga-policy-v1",
      apply: true, confirmation: ADVANCE_CONFIRMATION,
      action_confirmation: ACTION_CONFIRMATIONS.execute_prepared_transaction,
      expected_execute_predecessor: current ? predecessor(current) : {
        saga_id: SAGA_ID, event_count: 5, last_event_id: "voidbvfsge1_" + "a".repeat(64),
      },
      adapters: { execute_prepared_transaction(arg) { counts.adapter += 1; return invoke(arg); } },
    };
    function advanceCompetingHistory() {
      const before = store.recover(SAGA_ID);
      const intent = buildSagaEventV1({
        binding: BINDING, sequence: before.state.event_count,
        previous_event_id: before.state.last_event_id, recorded_at_utc: utc,
        event_type: "broadcast_intent_committed", fencing_token: lease.fencing_token,
        payload: {
          attempt_id: ATTEMPT_ID, transaction_hash: TX_HASH,
          broadcast_intent_id: computeBroadcastIntentIdV1({
            saga_id: SAGA_ID, attempt_id: ATTEMPT_ID, transaction_hash: TX_HASH,
          }),
        },
      });
      const admitted = store.appendEvent({ event: intent, owner_id: input.owner_id,
        fencing_token: lease.fencing_token, now_ms: input.now_ms });
      const result = buildNextEventFromActionResultV1({
        record: admitted, action: "execute_prepared_transaction",
        result: { outcome: "broadcast_not_attempted", payload: {
          attempt_id: ATTEMPT_ID, transaction_hash: TX_HASH,
          reason_code: "competing_no_submission", broadcast_call_performed: false,
        } },
        fencing_token: lease.fencing_token, recorded_at_utc: utc,
      });
      return store.appendEvent({ event: result, owner_id: input.owner_id,
        fencing_token: lease.fencing_token, now_ms: input.now_ms });
    }
    await body({ store, wrapped, input, current, counts, adapters, advanceCompetingHistory });
    names.push(name);
  }
  async function rejectUnchanged(f, expression) {
    const before = canonicalJsonV1(f.store.recover(SAGA_ID));
    await assert.rejects(() => runSagaSupervisorTickV1(f.input), expression);
    assert.equal(canonicalJsonV1(f.store.recover(SAGA_ID)), before,
      "refused predecessor must not append business events");
    assert.equal(f.counts.append, 0);
    assert.equal(f.counts.adapter, 0);
    assert.equal(f.counts.release, f.counts.acquire);
  }
  for (const outcome of ["broadcast_accepted", "broadcast_unknown", "broadcast_not_attempted"]) {
    await one("matching_" + outcome, async (f) => {
      const adapter = adaptersFor({ execute: outcome, reconcile: "receipt_confirmed" }).execute_prepared_transaction;
      f.input.adapters.execute_prepared_transaction = (arg) => { f.counts.adapter += 1; return adapter(arg); };
      const result = await runSagaSupervisorTickV1(f.input);
      assert.equal(result.status, "applied");
      assert.equal(result.state.state, outcome);
      assert.equal(result.automatic_retry_allowed, false);
      assert.equal(f.counts.adapter, 1);
      assert.equal(f.counts.append, 2);
      const events = f.store.recover(SAGA_ID).events;
      assert.equal(events[5].previous_event_id, f.current.state.last_event_id);
      assert.equal(events[5].sequence, f.current.state.event_count);
    });
  }
  await one("legacy_omission", async (f) => {
    delete f.input.expected_execute_predecessor;
    assert.equal((await runSagaSupervisorTickV1(f.input)).status, "applied");
    assert.equal(f.counts.adapter, 1);
  });
  await one("dry_has_no_execution", async (f) => {
    f.input.apply = false;
    const before = canonicalJsonV1(f.current);
    const result = await runSagaSupervisorTickV1(f.input);
    assert.equal(result.status, "dry_run");
    assert.equal(canonicalJsonV1(f.store.recover(SAGA_ID)), before);
    assert.equal(f.counts.append, 0); assert.equal(f.counts.adapter, 0);
  });
  await one("confirmation_still_required", async (f) => {
    f.input.confirmation = "wrong";
    await rejectUnchanged(f, /^Error: supervisor_confirmation_required$/);
  });
  for (const refresh of [false, true]) {
    await one(refresh ? "explicit_retry_fresh_head" : "explicit_retry_old_head", async (f) => {
      await advance(f.store, "execute_prepared_transaction", 6000, utc, f.adapters);
      if (refresh) {
        f.input.expected_execute_predecessor = predecessor(f.store.recover(SAGA_ID));
        assert.equal((await runSagaSupervisorTickV1(f.input)).status, "applied");
        assert.equal(f.counts.adapter, 1);
      } else await rejectUnchanged(f, /^Error: supervisor_execute_predecessor_changed$/);
    });
  }
  await one("missing_history_not_initialized", async (f) => {
    await rejectUnchanged(f, /^Error: supervisor_execute_predecessor_changed$/);
    assert.equal(f.store.recover(SAGA_ID), null);
  }, 0);
  await one("wrong_saga", async (f) => {
    f.input.expected_execute_predecessor.saga_id = "voidbvfsg1_" + "f".repeat(64);
    await rejectUnchanged(f, /^Error: supervisor_execute_predecessor_saga_mismatch$/);
    assert.equal(f.counts.acquire, 0);
  });
  for (const field of ["event_count", "last_event_id"]) {
    await one("wrong_" + field, async (f) => {
      f.input.expected_execute_predecessor[field] = field === "event_count" ? 4 : "voidbvfsge1_" + "f".repeat(64);
      await rejectUnchanged(f, /^Error: supervisor_execute_predecessor_changed$/);
    });
  }
  await one("wrong_stage", async (f) => {
    await rejectUnchanged(f, /^Error: supervisor_execute_predecessor_stage_mismatch$/);
  }, 3);
  const invalid = [
    ["null", (f) => { f.input.expected_execute_predecessor = null; }],
    ["undefined", (f) => { f.input.expected_execute_predecessor = undefined; }],
    ["array", (f) => { f.input.expected_execute_predecessor = []; }],
    ["extra", (f) => { f.input.expected_execute_predecessor.extra = true; }],
    ["missing_field", (f) => { delete f.input.expected_execute_predecessor.last_event_id; }],
    ["symbol", (f) => { f.input.expected_execute_predecessor[Symbol("extra")] = true; }],
    ["nonenumerable", (f) => { Object.defineProperty(f.input.expected_execute_predecessor, "event_count", { enumerable: false }); }],
    ["prototype", (f) => { Object.setPrototypeOf(f.input.expected_execute_predecessor, { extra: true }); }],
    ["count_string", (f) => { f.input.expected_execute_predecessor.event_count = "5"; }],
    ["count_limit", (f) => { f.input.expected_execute_predecessor.event_count = 64; }],
    ["count_negative", (f) => { f.input.expected_execute_predecessor.event_count = -1; }],
    ["saga_newline", (f) => { f.input.expected_execute_predecessor.saga_id += "\n"; }],
    ["event_newline", (f) => { f.input.expected_execute_predecessor.last_event_id += "\n"; }],
    ["hash_shape", (f) => { f.input.expected_execute_predecessor.last_event_id = "not-an-event"; }],
  ];
  for (const [name, configure] of invalid) {
    await one("invalid_" + name, async (f) => {
      configure(f);
      await rejectUnchanged(f, /^Error: supervisor_execute_predecessor_invalid$/);
      assert.equal(f.counts.acquire, 0);
    });
  }
  for (const location of ["field", "input"]) {
    await one("accessor_" + location, async (f) => {
      let reads = 0;
      Object.defineProperty(location === "field" ? f.input.expected_execute_predecessor : f.input,
        location === "field" ? "event_count" : "expected_execute_predecessor",
        { enumerable: true, get() { reads += 1; return 5; } });
      await rejectUnchanged(f, /^Error: supervisor_execute_predecessor_invalid$/);
      assert.equal(reads, 0); assert.equal(f.counts.acquire, 0);
    });
  }
  await one("inherited_control", async (f) => {
    const value = f.input.expected_execute_predecessor;
    delete f.input.expected_execute_predecessor;
    Object.setPrototypeOf(f.input, { expected_execute_predecessor: value });
    await rejectUnchanged(f, /^Error: supervisor_execute_predecessor_invalid$/);
    assert.equal(f.counts.acquire, 0);
  });
  await one("callable_input_control_not_ignored", async (f) => {
    f.input = Object.assign(function syntheticInput() {}, f.input);
    f.input.expected_execute_predecessor.extra = true;
    await rejectUnchanged(f, /^Error: supervisor_execute_predecessor_invalid$/);
    assert.equal(f.counts.acquire, 0);
  });
  for (const mode of ["reordered", "null_prototype"]) {
    await one(mode, async (f) => {
      f.input.expected_execute_predecessor = mode === "reordered"
        ? Object.fromEntries(Object.entries(f.input.expected_execute_predecessor).reverse())
        : Object.assign(Object.create(null), f.input.expected_execute_predecessor);
      assert.equal((await runSagaSupervisorTickV1(f.input)).status, "applied");
    });
  }
  for (const mutateExpected of [false, true]) {
    await one(mutateExpected ? "captured_expected_alias" : "pinned_event_after_record_drift", async (f) => {
      const sharedRecord = f.store.recover(SAGA_ID);
      f.wrapped.recover = () => sharedRecord;
      const adapter = f.input.adapters.execute_prepared_transaction;
      let changed;
      Object.defineProperty(f.input.adapters, "execute_prepared_transaction", {
        get() {
          changed = f.advanceCompetingHistory();
          Object.assign(sharedRecord, changed);
          if (mutateExpected) Object.assign(f.input.expected_execute_predecessor, predecessor(changed));
          return adapter;
        },
      });
      await assert.rejects(() => runSagaSupervisorTickV1(f.input), /^Error: append_expected_head_mismatch$/,
        "approved predecessor must reach the actual append CAS");
      assert.ok(changed);
      assert.equal(canonicalJsonV1(f.store.recover(SAGA_ID)), canonicalJsonV1(changed));
      assert.equal(f.counts.adapter, 0); assert.equal(f.counts.append, 1); assert.equal(f.counts.release, 1);
    });
  }
  await one("drift_at_append_entry", async (f) => {
    let changed;
    f.wrapped.appendEvent = (arg) => {
      f.counts.append += 1;
      changed = f.advanceCompetingHistory();
      return f.store.appendEvent(arg);
    };
    await assert.rejects(() => runSagaSupervisorTickV1(f.input), /^Error: append_expected_head_mismatch$/);
    assert.equal(canonicalJsonV1(f.store.recover(SAGA_ID)), canonicalJsonV1(changed));
    assert.equal(f.counts.adapter, 0); assert.equal(f.counts.append, 1); assert.equal(f.counts.release, 1);
  });
  assert.equal(names.length, 36);
  assert.equal(new Set(names).size, names.length);
  console.log("VOID_BUY_VOID_SAGA_EXECUTE_PREDECESSOR_V1_GREEN");
  console.log("saga_execute_predecessor_cases=" + names.length);
  console.log("approved_predecessor_carried_to_locked_append=true");
  console.log("database_lease_execution_composition_complete=false");
}

async function proveLockedBroadcastIntentAdmissionV1() {
  const names = [];
  const utc = "2026-08-05T20:30:00.000Z";
  const actions = ["claim_payment", "reserve_inventory", "reserve_execution_attempt", "prepare_transaction"];

  async function prepared(name) {
    const root = join(ROOT, "locked-admission-" + name);
    const store = createFilesystemSagaStoreV1(root);
    const adapters = adaptersFor({
      execute: "broadcast_not_attempted",
      reconcile: "receipt_confirmed",
    });
    for (let index = 0; index < actions.length; index += 1) {
      await advance(store, actions[index], 30_000 + index, utc, adapters);
    }
    const record = store.recover(SAGA_ID);
    assert.equal(record.state.state, "transaction_prepared");
    return { root, store, adapters, record };
  }

  function executionInput(fixture, hook, store = fixture.store) {
    return {
      store,
      binding: BINDING,
      owner_id: "locked-admission-proof-worker",
      now_ms: 40_000,
      lease_ttl_ms: 5_000,
      recorded_at_utc: utc,
      source_floor_main: SOURCE_MAIN,
      policy_id: "void-buy-void-saga-policy-v1",
      apply: true,
      confirmation: ADVANCE_CONFIRMATION,
      action_confirmation: ACTION_CONFIRMATIONS.execute_prepared_transaction,
      expected_execute_predecessor: {
        saga_id: fixture.record.saga_id,
        event_count: fixture.record.state.event_count,
        last_event_id: fixture.record.state.last_event_id,
      },
      before_broadcast_intent_append: hook,
      adapters: {
        execute_prepared_transaction: fixture.adapters.execute_prepared_transaction,
      },
    };
  }

  async function unchanged(fixture, action, expression) {
    const before = canonicalJsonV1(fixture.store.recover(SAGA_ID));
    await assert.rejects(action, expression);
    assert.equal(
      canonicalJsonV1(fixture.store.recover(SAGA_ID)),
      before,
      "refused locked admission must not append broadcast intent",
    );
  }

  {
    const fixture = await prepared("admitted");
    const queue = join(fixture.root, "sagas", SAGA_ID, "append.lock.queue");
    let calls = 0;
    const input = executionInput(fixture, async () => {
      calls += 1;
      const heldBeforeAwait = readdirSync(queue).some((name) => name.startsWith("ticket-"));
      assert.equal(heldBeforeAwait, true, "append lock must be held before admission await");
      await new Promise((resolve) => setTimeout(resolve, 10));
      const heldAfterAwait = readdirSync(queue).some((name) => name.startsWith("ticket-"));
      assert.equal(heldAfterAwait, true, "append lock must remain held across admission await");
      return true;
    });
    const result = await runSagaSupervisorTickV1(input);
    assert.equal(result.status, "applied");
    assert.equal(calls, 1);
    assert.equal(fixture.store.recover(SAGA_ID).events[5].event_type, "broadcast_intent_committed");
    names.push("admitted");
  }

  {
    const fixture = await prepared("refused");
    let adapterCalls = 0;
    const input = executionInput(fixture, async () => false);
    input.adapters.execute_prepared_transaction = async (...args) => {
      adapterCalls += 1;
      return fixture.adapters.execute_prepared_transaction(...args);
    };
    await unchanged(
      fixture,
      () => runSagaSupervisorTickV1(input),
      /^Error: append_admission_refused$/,
    );
    assert.equal(adapterCalls, 0);
    names.push("refused");
  }

  {
    const fixture = await prepared("throw");
    let adapterCalls = 0;
    const input = executionInput(fixture, async () => {
      throw new Error("locked_admission_synthetic_failure");
    });
    input.adapters.execute_prepared_transaction = async (...args) => {
      adapterCalls += 1;
      return fixture.adapters.execute_prepared_transaction(...args);
    };
    await unchanged(
      fixture,
      () => runSagaSupervisorTickV1(input),
      /^Error: locked_admission_synthetic_failure$/,
    );
    assert.equal(adapterCalls, 0);
    names.push("throw");
  }

  {
    const fixture = await prepared("invalid-hook");
    const input = executionInput(fixture, async () => true);
    input.before_broadcast_intent_append = true;
    await unchanged(
      fixture,
      () => runSagaSupervisorTickV1(input),
      /^Error: supervisor_broadcast_intent_admission_invalid$/,
    );
    names.push("invalid_hook");
  }

  {
    const fixture = await prepared("missing-store-method");
    const wrapped = {
      recover: (...args) => fixture.store.recover(...args),
      acquireLease: (...args) => fixture.store.acquireLease(...args),
      releaseLease: (...args) => fixture.store.releaseLease(...args),
      appendEvent: (...args) => fixture.store.appendEvent(...args),
    };
    const input = executionInput(fixture, async () => true, wrapped);
    await unchanged(
      fixture,
      () => runSagaSupervisorTickV1(input),
      /^Error: supervisor_store_locked_admission_required$/,
    );
    names.push("missing_store_method");
  }

  assert.equal(names.length, 5);
  assert.equal(new Set(names).size, names.length);
  console.log("VOID_BUY_VOID_SAGA_LOCKED_BROADCAST_INTENT_ADMISSION_V1_GREEN");
  console.log("saga_locked_broadcast_intent_admission_cases=" + names.length);
  console.log("async_admission_runs_inside_append_lock=true");
  console.log("refused_locked_admission_writes_no_intent=true");
  console.log("legacy_append_event_path_preserved=true");
}

try {
  const predecessorDeadline = setTimeout(() => {
    console.error("SAGA_EXECUTE_PREDECESSOR_PROOF_DEADLINE"); process.exit(1);
  }, 120_000);
  try { await proveExpectedExecutePredecessorV1(); }
  finally { clearTimeout(predecessorDeadline); }
  const lockedAdmissionDeadline = setTimeout(() => {
    console.error("SAGA_LOCKED_BROADCAST_INTENT_ADMISSION_PROOF_DEADLINE"); process.exit(1);
  }, 120_000);
  try { await proveLockedBroadcastIntentAdmissionV1(); }
  finally { clearTimeout(lockedAdmissionDeadline); }
  const storeRoot = join(ROOT, "store");
  mkdirSync(storeRoot, { mode: 0o700 });
  const store = createFilesystemSagaStoreV1(storeRoot);
  const adapters = adaptersFor({
    execute: "broadcast_unknown",
    reconcile: "receipt_confirmed",
  });

  const sequence = [
    ["claim_payment", 1_000, "2026-08-05T19:20:00.000Z"],
    ["reserve_inventory", 2_000, "2026-08-05T19:20:01.000Z"],
    ["reserve_execution_attempt", 3_000, "2026-08-05T19:20:02.000Z"],
    ["prepare_transaction", 4_000, "2026-08-05T19:20:03.000Z"],
    ["execute_prepared_transaction", 5_000, "2026-08-05T19:20:04.000Z"],
  ];
  for (const [action, now, utc] of sequence) {
    await advance(store, action, now, utc, adapters);
  }

  let record = store.recover(SAGA_ID);
  assert.equal(record.state.state, "broadcast_unknown");
  assert.equal(record.state.broadcast_call_may_have_occurred, true);
  assert.equal(record.state.automatic_retry_allowed, false);
  assert.equal(record.state.next_action, "reconcile_possible_broadcast");
  assert.notEqual(record.state.next_action, "execute_prepared_transaction");

  const dryAfterRestart = await runSagaSupervisorTickV1({
    store: createFilesystemSagaStoreV1(storeRoot),
    binding: BINDING,
    owner_id: "proof-worker-restarted",
    now_ms: 6_000,
    lease_ttl_ms: 5_000,
    recorded_at_utc: "2026-08-05T19:20:05.000Z",
    source_floor_main: SOURCE_MAIN,
    policy_id: "void-buy-void-saga-policy-v1",
    apply: false,
    adapters,
  });
  assert.equal(dryAfterRestart.status, "dry_run");
  assert.equal(dryAfterRestart.action, "reconcile_possible_broadcast");
  assert.equal(dryAfterRestart.automatic_execution_allowed, false);
  assert.equal(dryAfterRestart.automatic_retry_allowed, false);

  await advance(
    createFilesystemSagaStoreV1(storeRoot),
    "reconcile_possible_broadcast",
    7_000,
    "2026-08-05T19:20:06.000Z",
    adapters,
  );
  await advance(
    createFilesystemSagaStoreV1(storeRoot),
    "closeout_confirmed_delivery",
    8_000,
    "2026-08-05T19:20:07.000Z",
    adapters,
  );

  record = createFilesystemSagaStoreV1(storeRoot).recover(SAGA_ID);
  assert.equal(record.state.state, "closed");
  assert.equal(record.state.terminal, true);
  assert.equal(record.state.event_count, 9);
  assert.equal(record.state.transaction_hash, TX_HASH);
  assert.equal(record.state.closeout_id, CLOSEOUT_ID);
  assert.equal(record.state.next_action, null);
  assert.equal(canonicalJsonV1(record.authority), canonicalJsonV1(AUTHORITY));
  validateSagaRecordV1(record);

  const crashRoot = join(ROOT, "crash-window-store");
  mkdirSync(crashRoot, { mode: 0o700 });
  const crashStore = createFilesystemSagaStoreV1(crashRoot);
  const crashBaseAdapters = adaptersFor({
    execute: "broadcast_unknown",
    reconcile: "receipt_confirmed",
  });
  for (const [action, now, utc] of [
    ["claim_payment", 20_000, "2026-08-05T19:22:00.000Z"],
    ["reserve_inventory", 21_000, "2026-08-05T19:22:01.000Z"],
    ["reserve_execution_attempt", 22_000, "2026-08-05T19:22:02.000Z"],
    ["prepare_transaction", 23_000, "2026-08-05T19:22:03.000Z"],
  ]) {
    await advance(crashStore, action, now, utc, crashBaseAdapters);
  }
  let providerCalls = 0;
  const crashAdapters = {
    ...crashBaseAdapters,
    execute_prepared_transaction: async ({ record, broadcast_intent_id }) => {
      assert.equal(record.state.state, "broadcast_intent_committed");
      assert.equal(record.state.broadcast_intent_id, broadcast_intent_id);
      providerCalls += 1;
      throw new Error("simulated_crash_after_external_effect");
    },
  };
  await expectReject(
    async () => advance(
      crashStore,
      "execute_prepared_transaction",
      24_000,
      "2026-08-05T19:22:04.000Z",
      crashAdapters,
    ),
    /simulated_crash_after_external_effect/,
    "crash after external effect",
  );
  assert.equal(providerCalls, 1);
  const durableAfterCrash = createFilesystemSagaStoreV1(crashRoot).recover(SAGA_ID);
  assert.equal(durableAfterCrash.state.state, "broadcast_intent_committed");
  assert.equal(durableAfterCrash.state.event_count, 6);
  assert.equal(durableAfterCrash.state.broadcast_call_may_have_occurred, true);
  assert.equal(durableAfterCrash.state.next_action, "reconcile_possible_broadcast");
  assert.notEqual(durableAfterCrash.state.next_action, "execute_prepared_transaction");
  const restartAfterCrash = await runSagaSupervisorTickV1({
    store: createFilesystemSagaStoreV1(crashRoot),
    binding: BINDING,
    owner_id: "proof-crash-restart",
    now_ms: 25_000,
    lease_ttl_ms: 5_000,
    recorded_at_utc: "2026-08-05T19:22:05.000Z",
    source_floor_main: SOURCE_MAIN,
    policy_id: "void-buy-void-saga-policy-v1",
    apply: false,
    adapters: crashAdapters,
  });
  assert.equal(restartAfterCrash.status, "dry_run");
  assert.equal(restartAfterCrash.action, "reconcile_possible_broadcast");
  assert.equal(restartAfterCrash.automatic_execution_allowed, false);
  assert.equal(providerCalls, 1);

  const terminalDry = await runSagaSupervisorTickV1({
    store: createFilesystemSagaStoreV1(storeRoot),
    binding: BINDING,
    owner_id: "proof-terminal-reader",
    now_ms: 9_000,
    lease_ttl_ms: 5_000,
    recorded_at_utc: "2026-08-05T19:20:08.000Z",
    source_floor_main: SOURCE_MAIN,
    policy_id: "void-buy-void-saga-policy-v1",
    apply: false,
    adapters,
  });
  assert.equal(terminalDry.status, "terminal");
  assert.equal(terminalDry.action, null);

  const events = record.events;
  const duplicateCloseout = buildSagaEventV1({
    binding: BINDING,
    sequence: events.length,
    previous_event_id: events.at(-1).event_id,
    recorded_at_utc: "2026-08-05T19:20:09.000Z",
    event_type: "closeout_committed",
    fencing_token: events.at(-1).fencing_token,
    payload: {
      attempt_id: ATTEMPT_ID,
      transaction_hash: TX_HASH,
      closeout_id: "a".repeat(64),
      inventory_decremented: true,
      public_request_fulfilled: true,
    },
  });
  await expectReject(
    async () => foldSagaEventsV1([...events, duplicateCloseout]),
    /transition_closed_to_closeout_committed_forbidden/,
    "duplicate closeout",
  );

  const unknownIndex = events.findIndex((event) => event.event_type === "broadcast_unknown");
  const conflictingReceipt = buildSagaEventV1({
    binding: BINDING,
    sequence: unknownIndex + 1,
    previous_event_id: events[unknownIndex].event_id,
    recorded_at_utc: "2026-08-05T19:20:06.000Z",
    event_type: "receipt_confirmed",
    fencing_token: events[unknownIndex].fencing_token,
    payload: {
      attempt_id: ATTEMPT_ID,
      transaction_hash: `0x${"f".repeat(64)}`,
      block_number: "100",
      block_hash: BLOCK_HASH,
      confirmations: 12,
      receipt_status: 1,
    },
  });
  await expectReject(
    async () => foldSagaEventsV1([...events.slice(0, unknownIndex + 1), conflictingReceipt]),
    /event_transaction_hash_binding_mismatch/,
    "conflicting receipt hash",
  );

  const sequenceGap = clone(events.slice(0, 2));
  sequenceGap[1].sequence = 3;
  await expectReject(
    async () => foldSagaEventsV1(sequenceGap),
    /event_id_derivation_mismatch|event_sequence_gap_or_duplicate/,
    "sequence gap",
  );

  await expectReject(
    async () => assertNoSecretMaterialV1({ private_key: "nope" }),
    /forbidden_key/,
    "secret key injection",
  );
  await expectReject(
    async () => assertNoSecretMaterialV1({ raw_signed_transaction: `0x${"ab".repeat(100)}` }),
    /forbidden_key/,
    "raw signed transaction injection",
  );

  const leaseRoot = join(ROOT, "lease-store");
  mkdirSync(leaseRoot, { mode: 0o700 });
  const leaseStore = createFilesystemSagaStoreV1(leaseRoot);
  const leaseA = leaseStore.acquireLease({
    saga_id: SAGA_ID,
    owner_id: "worker-a",
    now_ms: 10_000,
    ttl_ms: 100,
  });
  assert.equal(leaseA.ok, true);
  assert.equal(leaseA.lease.fencing_token, 1);
  const heldB = leaseStore.acquireLease({
    saga_id: SAGA_ID,
    owner_id: "worker-b",
    now_ms: 10_050,
    ttl_ms: 100,
  });
  assert.equal(heldB.ok, false);
  assert.equal(heldB.reason, "lease_held_by_another_owner");
  const leaseB = leaseStore.acquireLease({
    saga_id: SAGA_ID,
    owner_id: "worker-b",
    now_ms: 10_101,
    ttl_ms: 100,
  });
  assert.equal(leaseB.ok, true);
  assert.equal(leaseB.lease.fencing_token, 2);

  const staleEvent = buildSagaEventV1({
    binding: BINDING,
    sequence: 0,
    previous_event_id: null,
    recorded_at_utc: "2026-08-05T19:21:00.000Z",
    event_type: "saga_initialized",
    fencing_token: 1,
    payload: {
      source_floor_main: SOURCE_MAIN,
      policy_id: "void-buy-void-saga-policy-v1",
      max_attempts: 1,
    },
  });
  await expectReject(
    async () => leaseStore.appendEvent({
      event: staleEvent,
      owner_id: "worker-a",
      fencing_token: 1,
      now_ms: 10_102,
    }),
    /append_lease_not_current/,
    "stale worker fencing",
  );

  const goodInit = buildSagaEventV1({
    ...staleEvent,
    fencing_token: 2,
  });
  leaseStore.appendEvent({
    event: goodInit,
    owner_id: "worker-b",
    fencing_token: 2,
    now_ms: 10_102,
  });
  leaseStore.releaseLease({
    saga_id: SAGA_ID,
    owner_id: "worker-b",
    fencing_token: 2,
    now_ms: 10_103,
  });

  const lockQueue = join(leaseRoot, "sagas", SAGA_ID, "lease.lock.queue");
  const deadPid = findDefinitelyDeadPid();
  const deadNonce = "d".repeat(32);
  const deadCreatedAt = "2026-08-05T19:20:00.000Z";
  writeFileSync(
    join(lockQueue, `choosing-${deadPid}-${deadNonce}.json`),
    `${JSON.stringify({
      schema: LOCK_CLAIM_SCHEMA,
      pid: deadPid,
      nonce: deadNonce,
      phase: "choosing",
      ticket: null,
      created_at_utc: deadCreatedAt,
    })}\n`,
    { mode: 0o600 },
  );
  writeFileSync(
    join(lockQueue, `ticket-0000000000000001-${deadPid}-${deadNonce}.json`),
    `${JSON.stringify({
      schema: LOCK_CLAIM_SCHEMA,
      pid: deadPid,
      nonce: deadNonce,
      phase: "ticket",
      ticket: 1,
      created_at_utc: deadCreatedAt,
    })}\n`,
    { mode: 0o600 },
  );

  const contenderRoot = join(ROOT, "competing-reclaimers");
  mkdirSync(contenderRoot, { mode: 0o700 });
  const barrierPath = join(contenderRoot, "go");
  const contenderA = {
    ready: join(contenderRoot, "a.ready"),
    result: join(contenderRoot, "a.json"),
  };
  const contenderB = {
    ready: join(contenderRoot, "b.ready"),
    result: join(contenderRoot, "b.json"),
  };
  const moduleUrl = new URL(
    "../tools/buy-void-crash-consistent-fulfillment-saga-v1.mjs",
    import.meta.url,
  ).href;
  const runA = spawnLeaseContender({
    module_url: moduleUrl,
    store_root: leaseRoot,
    saga_id: SAGA_ID,
    owner_id: "worker-reclaimer-a",
    ready_path: contenderA.ready,
    barrier_path: barrierPath,
    result_path: contenderA.result,
  });
  const runB = spawnLeaseContender({
    module_url: moduleUrl,
    store_root: leaseRoot,
    saga_id: SAGA_ID,
    owner_id: "worker-reclaimer-b",
    ready_path: contenderB.ready,
    barrier_path: barrierPath,
    result_path: contenderB.result,
  });
  await waitForFiles([contenderA.ready, contenderB.ready]);
  writeFileSync(barrierPath, "go", { flag: "wx", mode: 0o600 });
  const [exitA, exitB] = await Promise.all([runA, runB]);
  assert.equal(exitA.code, 0, exitA.stderr);
  assert.equal(exitB.code, 0, exitB.stderr);
  const contenderResults = [contenderA.result, contenderB.result].map((path) =>
    JSON.parse(readFileSync(path, "utf8")),
  );
  const winners = contenderResults.filter((result) => result.ok === true);
  const held = contenderResults.filter(
    (result) => result.ok === false && result.reason === "lease_held_by_another_owner",
  );
  assert.equal(winners.length, 1, JSON.stringify(contenderResults));
  assert.equal(held.length, 1, JSON.stringify(contenderResults));
  assert.equal(winners[0].lease.fencing_token, 3);
  const winningOwner = winners[0].lease.owner_id;
  const persistedRaceLease = JSON.parse(
    readFileSync(join(leaseRoot, "sagas", SAGA_ID, "lease.json"), "utf8"),
  );
  assert.equal(persistedRaceLease.owner_id, winningOwner);
  assert.equal(persistedRaceLease.fencing_token, 3);
  assert.equal(readdirSync(lockQueue).length, 0);
  leaseStore.releaseLease({
    saga_id: SAGA_ID,
    owner_id: winningOwner,
    fencing_token: 3,
    now_ms: 10_201,
  });

  const sagaEventsDir = join(leaseRoot, "sagas", SAGA_ID, "events");
  writeFileSync(
    join(sagaEventsDir, "00000001-voidbvfsge1_" + "c".repeat(64) + ".json.tmp-999998-feedfacefeedface"),
    "partial",
    { mode: 0o600 },
  );
  assert.equal(leaseStore.recover(SAGA_ID).state.event_count, 1);

  const target = join(ROOT, "symlink-target.json");
  writeFileSync(target, "{}\n", { mode: 0o600 });

  const temporarySymlink = join(
    sagaEventsDir,
    "00000001-voidbvfsge1_" + "b".repeat(64) + ".json.tmp-999999-deadbeefdeadbeef",
  );
  symlinkSync(target, temporarySymlink);
  await expectReject(
    async () => leaseStore.recover(SAGA_ID),
    /event_temporary_entry_must_be_direct_file/,
    "temporary symlink event",
  );
  rmSync(temporarySymlink, { force: true });

  symlinkSync(target, join(sagaEventsDir, "00000001-voidbvfsge1_" + "a".repeat(64) + ".json"));
  await expectReject(
    async () => leaseStore.recover(SAGA_ID),
    /event_directory_contains_non_regular_entry/,
    "symlink event",
  );

  const fixture = JSON.parse(readFileSync(
    new URL(
      "../fixtures/economic/buy-void-crash-consistent-fulfillment-saga-v1.example.json",
      import.meta.url,
    ),
    "utf8",
  ));
  const validatedFixture = validateSagaRecordV1(fixture);
  assert.equal(validatedFixture.saga_id, SAGA_ID);
  assert.equal(validatedFixture.state.state, "closed");
  assert.equal(validatedFixture.state.event_count, 9);
  assert.equal(validatedFixture.events[5].event_type, "broadcast_intent_committed");
  assert.equal(validatedFixture.events[6].event_type, "broadcast_unknown");
  assert.equal(validatedFixture.events[7].event_type, "receipt_confirmed");
  assert.equal(validatedFixture.state.automatic_retry_allowed, false);

  const schema = JSON.parse(readFileSync(
    new URL(
      "../schemas/buy-void-crash-consistent-fulfillment-saga-v1.schema.json",
      import.meta.url,
    ),
    "utf8",
  ));
  assert.equal(schema.$schema, "https://json-schema.org/draft/2020-12/schema");
  assert.equal(schema.$id, "void://schemas/buy-void-crash-consistent-fulfillment-saga-v1");
  assert.equal(schema.additionalProperties, false);
  assert.equal(schema.properties.events.maxItems, 64);
  assert.equal(schema.properties.state.properties.automatic_retry_allowed.const, false);
  assert.equal(
    schema.properties.events.items.properties.event_type.enum.includes("broadcast_intent_committed"),
    true,
  );
  assert.equal(
    schema.properties.events.items.properties.event_type.enum.includes("broadcast_unknown"),
    true,
  );
  assert.equal(
    schema.properties.state.properties.state.enum.includes("broadcast_intent_committed"),
    true,
  );
  assert.equal(
    schema.properties.authority.properties.write_ahead_broadcast_intent_required.const,
    true,
  );
  assert.equal(
    schema.properties.events.items.properties.event_type.enum.includes("closeout_committed"),
    true,
  );

  const documentation = readFileSync(
    new URL(
      "../docs/operators/buy-void-crash-consistent-fulfillment-saga-v1.md",
      import.meta.url,
    ),
    "utf8",
  );
  for (const required of [
    MARKER,
    "Crash consistency",
    "Lease and fencing safety",
    "broadcast_intent_committed",
    "write-ahead broadcast intent",
    "stale lock",
    "broadcast_unknown",
    "reconcile_possible_broadcast",
    "fsync",
    "atomic rename",
    "No mutable summary file is trusted",
    "HTTP, HTTPS, child processes, wallet libraries, or RPC clients",
    "before_broadcast_intent_append",
    "appendEventWithAdmission",
    "admission fence",
  ]) {
    assert.equal(documentation.includes(required), true, `documentation missing ${required}`);
  }

  const workflow = readFileSync(
    new URL(
      "../.github/workflows/buy-void-crash-consistent-fulfillment-saga-v1.yml",
      import.meta.url,
    ),
    "utf8",
  );
  for (const required of [
    "actions/checkout@v6",
    "persist-credentials: false",
    "actions/setup-node@v6",
    'node-version: "24"',
    "npm ci --ignore-scripts --no-audit --no-fund",
    "prove_buy_void_crash_consistent_fulfillment_saga_v1.mjs",
    "npm run typecheck",
    `permissions:\n  contents: read`,
  ]) {
    assert.equal(workflow.includes(required), true, `workflow missing ${required}`);
  }
  assert.equal(workflow.includes("contents: write"), false);
  assert.equal(workflow.includes("workflow_dispatch"), false);

  const source = readFileSync(
    new URL("../tools/buy-void-crash-consistent-fulfillment-saga-v1.mjs", import.meta.url),
    "utf8",
  );
  for (const forbidden of [
    'from "node:http"',
    'from "node:https"',
    'from "node:child_process"',
    "fetch(",
    "eth_sendRawTransaction",
    "signTransaction(",
    "process.env",
    "sameLockFile",
    "store_lock_reclaim_race",
  ]) {
    assert.equal(source.includes(forbidden), false, `source contains forbidden ${forbidden}`);
  }
  for (const required of [
    "fsyncSync",
    "renameSync",
    "fencing_token",
    "broadcast_intent_committed",
    "write_ahead_broadcast_intent_required",
    "broadcast_unknown",
    "reconcile_possible_broadcast",
    "event_temporary_entry_must_be_direct_file",
    "LOCK_STALE_MS",
    "LOCK_CLAIM_SCHEMA",
    "LOCK_CHOOSING_FILE",
    "LOCK_TICKET_FILE",
    "store_lock_wait_timeout",
    "no_automatic_rebroadcast_after_possible_broadcast",
    "append_lease_not_current",
    "appendEventWithAdmission",
    "before_broadcast_intent_append",
    "supervisor_store_locked_admission_required",
  ]) {
    assert.equal(source.includes(required), true, `source missing ${required}`);
  }

  console.log(JSON.stringify({
    marker: MARKER,
    saga_id: SAGA_ID,
    final_state: record.state.state,
    event_count: record.state.event_count,
    hash_chain_valid: true,
    atomic_fsync_rename_store: true,
    stale_worker_fencing_rejected: true,
    restart_recovery_verified: true,
    write_ahead_broadcast_intent_verified: true,
    crash_after_external_effect_rebroadcast_forbidden: true,
    stale_lock_recovery_verified: true,
    competing_stale_lock_reclaimers_serialized: true,
    competing_reclaimers_single_lease_mutation: true,
    temporary_symlink_rejected: true,
    broadcast_unknown_rebroadcast_forbidden: true,
    receipt_required_before_closeout: true,
    duplicate_closeout_rejected: true,
    conflicting_transaction_hash_rejected: true,
    secret_material_rejected: true,
    raw_signed_transaction_rejected: true,
    committed_fixture_valid: true,
    schema_contract_valid: true,
    focused_workflow_locked: true,
    network_request_performed: false,
    credential_access_performed: false,
    wallet_access_performed: false,
    signing_performed: false,
    transaction_broadcast_performed: false,
    money_movement: false,
    status: "GREEN",
  }, null, 2));
  console.log(`${MARKER}_PROOF_GREEN`);
} finally {
  rmSync(ROOT, { recursive: true, force: true });
}
