import assert from "node:assert/strict";
import {
  VOID_VALIDATOR_SUBMIT_INTENT_DEFAULT_TTL_MS,
  VOID_VALIDATOR_SUBMIT_INTENT_LIFECYCLE_AUTHORITY_V1,
  VOID_VALIDATOR_SUBMIT_INTENT_LIFECYCLE_V1,
  decideValidatorSubmitIntentLifecycleV1,
  type ValidatorSubmitIntentLifecycleDecisionV1,
  type ValidatorSubmitIntentRecordV1,
} from "../src/validator/validator_submit_intent_lifecycle_v1.js";

const intentId = `0x${"a".repeat(64)}`;
const txHash = `0x${"b".repeat(64)}`;

function ok(
  decision: ValidatorSubmitIntentLifecycleDecisionV1,
): Extract<ValidatorSubmitIntentLifecycleDecisionV1, { ok: true }> {
  if (!decision.ok) throw new Error(`unexpected hold: ${decision.reason}`);
  return decision;
}


function recordOf(
  decision: Extract<ValidatorSubmitIntentLifecycleDecisionV1, { ok: true }>,
) {
  if (!decision.record) throw new Error(`missing record for ${decision.status}`);
  return decision.record;
}

function heldReason(decision: ValidatorSubmitIntentLifecycleDecisionV1): string {
  if (decision.ok) throw new Error(`expected hold, received ${decision.status}`);
  return decision.reason;
}

assert.equal(
  VOID_VALIDATOR_SUBMIT_INTENT_LIFECYCLE_V1,
  "VOID_VALIDATOR_SUBMIT_INTENT_LIFECYCLE_V1",
);
assert.deepEqual(VOID_VALIDATOR_SUBMIT_INTENT_LIFECYCLE_AUTHORITY_V1, {
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
});

const available = ok(
  decideValidatorSubmitIntentLifecycleV1({
    action: "inspect",
    now_ms: 1_000,
    submit_intent_id: intentId,
  }),
);
assert.equal(available.status, "available");
assert.equal(available.record, null);
assert.equal(available.record_changed, false);

const reserved = ok(
  decideValidatorSubmitIntentLifecycleV1({
    action: "reserve",
    now_ms: 1_000,
    submit_intent_id: intentId.toUpperCase().replace("0X", "0x"),
  }),
);
assert.equal(reserved.status, "reserved");
assert.equal(reserved.duplicate, false);
assert.equal(reserved.record_changed, true);
assert.equal(reserved.recovered_from_expired_reservation, false);
const reservedRecord = recordOf(reserved);
assert.equal(reservedRecord.submit_intent_id, intentId);
assert.equal(reservedRecord.state, "pending");
assert.equal(reservedRecord.attempt, 1);
assert.equal(reservedRecord.reserved_at_ms, 1_000);
assert.equal(
  reservedRecord.expires_at_ms,
  1_000 + VOID_VALIDATOR_SUBMIT_INTENT_DEFAULT_TTL_MS,
);
assert.equal(reservedRecord.record_hash_sha256.length, 64);
assert.deepEqual(
  reservedRecord.authority,
  VOID_VALIDATOR_SUBMIT_INTENT_LIFECYCLE_AUTHORITY_V1,
);

const duplicatePending = ok(
  decideValidatorSubmitIntentLifecycleV1({
    action: "reserve",
    now_ms: 2_000,
    submit_intent_id: intentId,
    prior_record: reservedRecord,
  }),
);
assert.equal(duplicatePending.status, "duplicate_pending");
assert.equal(duplicatePending.duplicate, true);
assert.equal(duplicatePending.record_changed, false);
assert.deepEqual(duplicatePending.record, reserved.record);

const committed = ok(
  decideValidatorSubmitIntentLifecycleV1({
    action: "commit",
    now_ms: 3_000,
    submit_intent_id: intentId,
    transaction_hash: txHash.toUpperCase().replace("0X", "0x"),
    receipt_status: 1,
    prior_record: reservedRecord,
  }),
);
assert.equal(committed.status, "committed");
assert.equal(committed.record_changed, true);
const committedRecord = recordOf(committed);
assert.equal(committedRecord.state, "committed");
assert.equal(committedRecord.transaction_hash, txHash);
assert.equal(committedRecord.committed_at_ms, 3_000);
assert.equal(committedRecord.released_at_ms, null);

const duplicateCommit = ok(
  decideValidatorSubmitIntentLifecycleV1({
    action: "commit",
    now_ms: 4_000,
    submit_intent_id: intentId,
    transaction_hash: txHash,
    receipt_status: "1",
    prior_record: committedRecord,
  }),
);
assert.equal(duplicateCommit.status, "duplicate_committed");
assert.equal(duplicateCommit.duplicate, true);
assert.equal(duplicateCommit.record_changed, false);

const reserveAfterCommit = ok(
  decideValidatorSubmitIntentLifecycleV1({
    action: "reserve",
    now_ms: 5_000,
    submit_intent_id: intentId,
    prior_record: committedRecord,
  }),
);
assert.equal(reserveAfterCommit.status, "duplicate_committed");
assert.equal(reserveAfterCommit.duplicate, true);

const conflictingTx = decideValidatorSubmitIntentLifecycleV1({
  action: "commit",
  now_ms: 6_000,
  submit_intent_id: intentId,
  transaction_hash: `0x${"c".repeat(64)}`,
  receipt_status: 1,
  prior_record: committedRecord,
});
assert.equal(heldReason(conflictingTx), "committed_transaction_conflict");

const tampered: ValidatorSubmitIntentRecordV1 = structuredClone(committedRecord);
tampered.record_hash_sha256 = "0".repeat(64);
assert.equal(
  heldReason(
    decideValidatorSubmitIntentLifecycleV1({
      action: "inspect",
      now_ms: 7_000,
      submit_intent_id: intentId,
      prior_record: tampered,
    }),
  ),
  "prior_record_hash_mismatch",
);

console.log("VOID_VALIDATOR_SUBMIT_INTENT_LIFECYCLE_V1_GREEN");
