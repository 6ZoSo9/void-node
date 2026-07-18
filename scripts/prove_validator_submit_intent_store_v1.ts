import assert from "node:assert/strict";
import {
  VOID_VALIDATOR_SUBMIT_INTENT_STORE_STORAGE_V1,
  VOID_VALIDATOR_SUBMIT_INTENT_STORE_V1,
  ValidatorSubmitIntentStoreV1,
  type ValidatorSubmitIntentStoreDecisionV1,
} from "../src/validator/validator_submit_intent_store_v1.js";

const intentA = `0x${"1".repeat(64)}`;
const intentB = `0x${"2".repeat(64)}`;
const intentC = `0x${"3".repeat(64)}`;
const txA = `0x${"a".repeat(64)}`;

function ok(
  decision: ValidatorSubmitIntentStoreDecisionV1,
): Extract<ValidatorSubmitIntentStoreDecisionV1, { ok: true }> {
  if (!decision.ok) throw new Error(`unexpected hold: ${decision.reason}`);
  return decision;
}

function heldReason(decision: ValidatorSubmitIntentStoreDecisionV1): string {
  if (decision.ok) throw new Error(`expected hold, received ${decision.status}`);
  return decision.reason;
}

function recordOf(
  decision: Extract<ValidatorSubmitIntentStoreDecisionV1, { ok: true }>,
) {
  if (!decision.record) throw new Error(`missing record for ${decision.status}`);
  return decision.record;
}

assert.equal(VOID_VALIDATOR_SUBMIT_INTENT_STORE_V1, "VOID_VALIDATOR_SUBMIT_INTENT_STORE_V1");
assert.deepEqual(VOID_VALIDATOR_SUBMIT_INTENT_STORE_STORAGE_V1, {
  process_local_memory: true,
  persistent_storage: false,
  filesystem_write: false,
  multi_process_shared: false,
  survives_process_restart: false,
});
assert.throws(
  () => new ValidatorSubmitIntentStoreV1({ max_records: 0 }),
  /invalid_max_records/,
);

const store = new ValidatorSubmitIntentStoreV1({ max_records: 2 });
assert.deepEqual(store.stats, {
  marker: "VOID_VALIDATOR_SUBMIT_INTENT_STORE_V1",
  lifecycle_marker: "VOID_VALIDATOR_SUBMIT_INTENT_LIFECYCLE_V1",
  store_version: 0,
  max_records: 2,
  records_total: 0,
  pending_records: 0,
  committed_records: 0,
  released_records: 0,
  storage: VOID_VALIDATOR_SUBMIT_INTENT_STORE_STORAGE_V1,
  authority: {
    rpc_call: false,
    wallet_access: false,
    signer_access: false,
    transaction_signing: false,
    transaction_broadcast: false,
    filesystem_write: false,
    runtime_route_mount: false,
    validator_registration: false,
    validator_admission: false,
    active_validator_set_mutation: false,
    money_movement: false,
  },
});

assert.equal(
  heldReason(
    store.apply({ action: "reserve", now_ms: 1_000, submit_intent_id: intentA }),
  ),
  "expected_record_hash_required",
);
assert.equal(store.stats.records_total, 0);

const reservedA = ok(
  store.apply({
    action: "reserve",
    now_ms: 1_000,
    ttl_ms: 5_000,
    submit_intent_id: intentA.toUpperCase().replace("0X", "0x"),
    expected_record_hash: null,
  }),
);
assert.equal(reservedA.status, "reserved");
assert.equal(reservedA.store_changed, true);
assert.equal(reservedA.store_version, 1);
assert.equal(reservedA.store_size, 1);
const pendingA = recordOf(reservedA);
assert.equal(pendingA.attempt, 1);
assert.equal(pendingA.submit_intent_id, intentA);

const duplicateA = ok(
  store.apply({
    action: "reserve",
    now_ms: 1_500,
    submit_intent_id: intentA,
    expected_record_hash: pendingA.record_hash_sha256,
  }),
);
assert.equal(duplicateA.status, "duplicate_pending");
assert.equal(duplicateA.duplicate, true);
assert.equal(duplicateA.store_changed, false);
assert.equal(duplicateA.store_version, 1);

const inspectA = ok(
  store.apply({ action: "inspect", now_ms: 1_500, submit_intent_id: intentA }),
);
const inspectedRecord = recordOf(inspectA);
inspectedRecord.state = "released";
const inspectAgain = ok(
  store.apply({ action: "inspect", now_ms: 1_600, submit_intent_id: intentA }),
);
assert.equal(recordOf(inspectAgain).state, "pending");

assert.equal(
  heldReason(
    store.apply({
      action: "release",
      now_ms: 2_000,
      submit_intent_id: intentA,
      release_reason: "pre_count_read_failed",
      expected_record_hash: "0".repeat(64),
    }),
  ),
  "expected_record_hash_mismatch",
);
assert.equal(store.stats.pending_records, 1);

const releasedA = ok(
  store.apply({
    action: "release",
    now_ms: 2_000,
    submit_intent_id: intentA,
    release_reason: "pre_count_read_failed",
    expected_record_hash: pendingA.record_hash_sha256,
  }),
);
assert.equal(releasedA.status, "released");
assert.equal(store.stats.released_records, 1);
const releasedRecordA = recordOf(releasedA);

const retryA = ok(
  store.apply({
    action: "reserve",
    now_ms: 2_500,
    ttl_ms: 5_000,
    submit_intent_id: intentA,
    expected_record_hash: releasedRecordA.record_hash_sha256,
  }),
);
const retryRecordA = recordOf(retryA);
assert.equal(retryRecordA.attempt, 2);
assert.equal(store.stats.pending_records, 1);

assert.equal(
  heldReason(
    store.apply({
      action: "commit",
      now_ms: 3_000,
      submit_intent_id: intentA,
      transaction_hash: txA,
      receipt_status: 1,
      expected_record_hash: pendingA.record_hash_sha256,
    }),
  ),
  "expected_record_hash_mismatch",
);

const committedA = ok(
  store.apply({
    action: "commit",
    now_ms: 3_000,
    submit_intent_id: intentA,
    transaction_hash: txA,
    receipt_status: 1,
    expected_record_hash: retryRecordA.record_hash_sha256,
  }),
);
assert.equal(committedA.status, "committed");
assert.equal(store.stats.committed_records, 1);
const committedRecordA = recordOf(committedA);

const duplicateCommitA = ok(
  store.apply({
    action: "commit",
    now_ms: 3_500,
    submit_intent_id: intentA,
    transaction_hash: txA,
    receipt_status: 1,
    expected_record_hash: committedRecordA.record_hash_sha256,
  }),
);
assert.equal(duplicateCommitA.status, "duplicate_committed");
assert.equal(duplicateCommitA.store_changed, false);

const reservedB = ok(
  store.apply({
    action: "reserve",
    now_ms: 4_000,
    submit_intent_id: intentB,
    expected_record_hash: null,
  }),
);
assert.equal(reservedB.store_size, 2);
assert.equal(
  heldReason(
    store.apply({
      action: "reserve",
      now_ms: 4_000,
      submit_intent_id: intentC,
      expected_record_hash: null,
    }),
  ),
  "store_capacity_reached",
);
assert.equal(store.stats.records_total, 2);

const snapshot = store.snapshot();
assert.deepEqual(
  snapshot.records.map((record) => record.submit_intent_id),
  [intentA, intentB],
);
snapshot.records[0].state = "released";
assert.equal(
  recordOf(ok(store.apply({ action: "inspect", now_ms: 4_100, submit_intent_id: intentA }))).state,
  "committed",
);

assert.equal(heldReason(store.apply({
  action: "reserve",
  now_ms: 5_000,
  submit_intent_id: "bad",
  expected_record_hash: null,
})), "invalid_submit_intent_id");
assert.equal(store.stats.records_total, 2);

console.log("VOID_VALIDATOR_SUBMIT_INTENT_STORE_V1_GREEN");
