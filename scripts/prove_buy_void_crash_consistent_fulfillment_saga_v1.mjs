#!/usr/bin/env node

import assert from "node:assert/strict";
import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  utimesSync,
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

try {
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


  const staleLeaseLock = join(leaseRoot, "sagas", SAGA_ID, "lease.lock");
  writeFileSync(staleLeaseLock, "", { mode: 0o600 });
  utimesSync(staleLeaseLock, new Date(0), new Date(0));
  const leaseAfterStaleLock = leaseStore.acquireLease({
    saga_id: SAGA_ID,
    owner_id: "worker-c",
    now_ms: 10_200,
    ttl_ms: 100,
  });
  assert.equal(leaseAfterStaleLock.ok, true);
  assert.equal(leaseAfterStaleLock.lease.fencing_token, 3);
  leaseStore.releaseLease({
    saga_id: SAGA_ID,
    owner_id: "worker-c",
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
    `permissions:
  contents: read`,
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
    "no_automatic_rebroadcast_after_possible_broadcast",
    "append_lease_not_current",
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
