import assert from "node:assert/strict";
import {
  ValidatorSubmitIntentStoreV1,
  type ValidatorSubmitIntentStoreDecisionV1,
} from "../src/validator/validator_submit_intent_store_v1.js";

const intent = `0x${"d".repeat(64)}`;
const txHash = `0x${"e".repeat(64)}`;

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

const store = new ValidatorSubmitIntentStoreV1({ max_records: 10 });

const first = ok(store.apply({
  action: "reserve",
  now_ms: 10_000,
  ttl_ms: 1_000,
  submit_intent_id: intent,
  expected_record_hash: null,
}));
const firstRecord = recordOf(first);
assert.equal(firstRecord.attempt, 1);

const expiredInspect = ok(store.apply({
  action: "inspect",
  now_ms: 11_000,
  submit_intent_id: intent,
}));
assert.equal(expiredInspect.status, "available_after_expiry");
assert.equal(expiredInspect.store_changed, true);
assert.equal(expiredInspect.recovered_from_expired_reservation, true);
const expiredRecord = recordOf(expiredInspect);
assert.equal(expiredRecord.state, "released");
assert.equal(expiredRecord.release_reason, "reservation_expired");
assert.equal(store.stats.released_records, 1);

const stableInspect = ok(store.apply({
  action: "inspect",
  now_ms: 12_000,
  submit_intent_id: intent,
}));
assert.equal(stableInspect.status, "duplicate_released");
assert.equal(stableInspect.store_changed, false);
assert.equal(recordOf(stableInspect).record_hash_sha256, expiredRecord.record_hash_sha256);

const retryAfterExpiry = ok(store.apply({
  action: "reserve",
  now_ms: 12_500,
  ttl_ms: 5_000,
  submit_intent_id: intent,
  expected_record_hash: expiredRecord.record_hash_sha256,
}));
const retryAfterExpiryRecord = recordOf(retryAfterExpiry);
assert.equal(retryAfterExpiryRecord.attempt, 2);
assert.equal(store.stats.pending_records, 1);

const releaseCountFailure = ok(store.apply({
  action: "release",
  now_ms: 13_000,
  submit_intent_id: intent,
  release_reason: "pre_count_read_failed",
  expected_record_hash: retryAfterExpiryRecord.record_hash_sha256,
}));
const countFailureRecord = recordOf(releaseCountFailure);
assert.equal(countFailureRecord.state, "released");

const retryCountFailure = ok(store.apply({
  action: "reserve",
  now_ms: 13_500,
  ttl_ms: 5_000,
  submit_intent_id: intent,
  expected_record_hash: countFailureRecord.record_hash_sha256,
}));
const retryCountFailureRecord = recordOf(retryCountFailure);
assert.equal(retryCountFailureRecord.attempt, 3);

const releaseTxFailure = ok(store.apply({
  action: "release",
  now_ms: 14_000,
  submit_intent_id: intent,
  release_reason: "live_transaction_failed",
  expected_record_hash: retryCountFailureRecord.record_hash_sha256,
}));
const txFailureRecord = recordOf(releaseTxFailure);

const retryTxFailure = ok(store.apply({
  action: "reserve",
  now_ms: 14_500,
  ttl_ms: 5_000,
  submit_intent_id: intent,
  expected_record_hash: txFailureRecord.record_hash_sha256,
}));
const retryTxFailureRecord = recordOf(retryTxFailure);
assert.equal(retryTxFailureRecord.attempt, 4);

assert.equal(heldReason(store.apply({
  action: "commit",
  now_ms: 15_000,
  submit_intent_id: intent,
  transaction_hash: txHash,
  receipt_status: 0,
  expected_record_hash: retryTxFailureRecord.record_hash_sha256,
})), "receipt_status_not_success");
assert.equal(store.stats.pending_records, 1);
assert.equal(store.stats.store_version, 7);

assert.equal(heldReason(store.apply({
  action: "release",
  now_ms: 15_100,
  submit_intent_id: intent,
  release_reason: "operator_cancelled",
})), "expected_record_hash_required");
assert.equal(store.stats.store_version, 7);

const committed = ok(store.apply({
  action: "commit",
  now_ms: 15_500,
  submit_intent_id: intent,
  transaction_hash: txHash,
  receipt_status: 1,
  expected_record_hash: retryTxFailureRecord.record_hash_sha256,
}));
const committedRecord = recordOf(committed);
assert.equal(committedRecord.state, "committed");
assert.equal(store.stats.committed_records, 1);
assert.equal(store.stats.store_version, 8);

assert.equal(heldReason(store.apply({
  action: "release",
  now_ms: 16_000,
  submit_intent_id: intent,
  release_reason: "operator_cancelled",
  expected_record_hash: committedRecord.record_hash_sha256,
})), "committed_reservation_cannot_release");
assert.equal(store.stats.store_version, 8);

assert.equal(heldReason(store.apply({
  action: "reserve",
  now_ms: 16_500,
  submit_intent_id: intent,
  expected_record_hash: txFailureRecord.record_hash_sha256,
})), "expected_record_hash_mismatch");
assert.equal(store.stats.store_version, 8);

const duplicateCommitted = ok(store.apply({
  action: "reserve",
  now_ms: 17_000,
  submit_intent_id: intent,
  expected_record_hash: committedRecord.record_hash_sha256,
}));
assert.equal(duplicateCommitted.status, "duplicate_committed");
assert.equal(duplicateCommitted.store_changed, false);
assert.equal(store.stats.store_version, 8);

const snapshot = store.snapshot();
snapshot.records[0].record_hash_sha256 = "0".repeat(64);
const finalInspect = ok(store.apply({
  action: "inspect",
  now_ms: 18_000,
  submit_intent_id: intent,
}));
assert.equal(recordOf(finalInspect).record_hash_sha256, committedRecord.record_hash_sha256);

console.log("VOID_VALIDATOR_SUBMIT_INTENT_STORE_RECOVERY_V1_GREEN");
