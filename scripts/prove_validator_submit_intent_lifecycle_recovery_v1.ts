import assert from "node:assert/strict";
import {
  decideValidatorSubmitIntentLifecycleV1,
  type ValidatorSubmitIntentLifecycleDecisionV1,
} from "../src/validator/validator_submit_intent_lifecycle_v1.js";

const intentId = `0x${"d".repeat(64)}`;

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

const first = ok(
  decideValidatorSubmitIntentLifecycleV1({
    action: "reserve",
    now_ms: 10_000,
    ttl_ms: 5_000,
    submit_intent_id: intentId,
  }),
);
const firstRecord = recordOf(first);
assert.equal(firstRecord.attempt, 1);

const releasedPreCount = ok(
  decideValidatorSubmitIntentLifecycleV1({
    action: "release",
    now_ms: 10_500,
    submit_intent_id: intentId,
    release_reason: "pre_count_read_failed",
    prior_record: firstRecord,
  }),
);
assert.equal(releasedPreCount.status, "released");
const releasedPreCountRecord = recordOf(releasedPreCount);
assert.equal(releasedPreCountRecord.state, "released");
assert.equal(releasedPreCountRecord.release_reason, "pre_count_read_failed");

const retry = ok(
  decideValidatorSubmitIntentLifecycleV1({
    action: "reserve",
    now_ms: 11_000,
    ttl_ms: 5_000,
    submit_intent_id: intentId,
    prior_record: releasedPreCountRecord,
  }),
);
assert.equal(retry.status, "reserved");
const retryRecord = recordOf(retry);
assert.equal(retryRecord.attempt, 2);
assert.equal(retry.recovered_from_expired_reservation, false);

const releasedTxFailure = ok(
  decideValidatorSubmitIntentLifecycleV1({
    action: "release",
    now_ms: 11_500,
    submit_intent_id: intentId,
    release_reason: "live_transaction_failed",
    prior_record: retryRecord,
  }),
);
assert.equal(releasedTxFailure.status, "released");
const releasedTxFailureRecord = recordOf(releasedTxFailure);

const expiredStart = ok(
  decideValidatorSubmitIntentLifecycleV1({
    action: "reserve",
    now_ms: 20_000,
    ttl_ms: 1_000,
    submit_intent_id: intentId,
    prior_record: releasedTxFailureRecord,
  }),
);
const expiredStartRecord = recordOf(expiredStart);
assert.equal(expiredStartRecord.attempt, 3);

const expiredInspect = ok(
  decideValidatorSubmitIntentLifecycleV1({
    action: "inspect",
    now_ms: 21_000,
    submit_intent_id: intentId,
    prior_record: expiredStartRecord,
  }),
);
assert.equal(expiredInspect.status, "available_after_expiry");
assert.equal(expiredInspect.record_changed, true);
assert.equal(expiredInspect.recovered_from_expired_reservation, true);
const expiredInspectRecord = recordOf(expiredInspect);
assert.equal(expiredInspectRecord.state, "released");
assert.equal(expiredInspectRecord.release_reason, "reservation_expired");

const expiredRetry = ok(
  decideValidatorSubmitIntentLifecycleV1({
    action: "reserve",
    now_ms: 22_000,
    ttl_ms: 2_000,
    submit_intent_id: intentId,
    prior_record: expiredStartRecord,
  }),
);
assert.equal(expiredRetry.status, "reserved");
assert.equal(expiredRetry.recovered_from_expired_reservation, true);
const expiredRetryRecord = recordOf(expiredRetry);
assert.equal(expiredRetryRecord.attempt, 4);

assert.equal(
  heldReason(
    decideValidatorSubmitIntentLifecycleV1({
      action: "commit",
      now_ms: 22_500,
      submit_intent_id: intentId,
      transaction_hash: `0x${"e".repeat(64)}`,
      receipt_status: 0,
      prior_record: expiredRetryRecord,
    }),
  ),
  "receipt_status_not_success",
);

assert.equal(
  heldReason(
    decideValidatorSubmitIntentLifecycleV1({
      action: "commit",
      now_ms: 24_000,
      submit_intent_id: intentId,
      transaction_hash: `0x${"e".repeat(64)}`,
      receipt_status: 1,
      prior_record: expiredRetryRecord,
    }),
  ),
  "reservation_expired",
);

assert.equal(
  heldReason(
    decideValidatorSubmitIntentLifecycleV1({
      action: "commit",
      now_ms: 25_000,
      submit_intent_id: intentId,
      transaction_hash: `0x${"e".repeat(64)}`,
      receipt_status: 1,
      prior_record: releasedTxFailureRecord,
    }),
  ),
  "reservation_released",
);

const committedBase = ok(
  decideValidatorSubmitIntentLifecycleV1({
    action: "reserve",
    now_ms: 30_000,
    ttl_ms: 5_000,
    submit_intent_id: `0x${"f".repeat(64)}`,
  }),
);
const committedBaseRecord = recordOf(committedBase);
const committed = ok(
  decideValidatorSubmitIntentLifecycleV1({
    action: "commit",
    now_ms: 30_500,
    submit_intent_id: committedBaseRecord.submit_intent_id,
    transaction_hash: `0x${"1".repeat(64)}`,
    receipt_status: 1,
    prior_record: committedBaseRecord,
  }),
);
const committedRecord = recordOf(committed);
assert.equal(
  heldReason(
    decideValidatorSubmitIntentLifecycleV1({
      action: "release",
      now_ms: 31_000,
      submit_intent_id: committedRecord.submit_intent_id,
      release_reason: "operator_cancelled",
      prior_record: committedRecord,
    }),
  ),
  "committed_reservation_cannot_release",
);

assert.equal(
  heldReason(
    decideValidatorSubmitIntentLifecycleV1({
      action: "reserve",
      now_ms: 40_000,
      ttl_ms: 999,
      submit_intent_id: intentId,
    }),
  ),
  "invalid_ttl_ms",
);

console.log("VOID_VALIDATOR_SUBMIT_INTENT_LIFECYCLE_RECOVERY_V1_GREEN");
