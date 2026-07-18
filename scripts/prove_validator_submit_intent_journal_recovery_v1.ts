import assert from "node:assert/strict";
import {
  appendValidatorSubmitIntentJournalEntryV1,
  replayValidatorSubmitIntentJournalV1,
  type ValidatorSubmitIntentJournalAppendDecisionV1,
  type ValidatorSubmitIntentJournalAppendInputV1,
  type ValidatorSubmitIntentJournalEntryV1,
  type ValidatorSubmitIntentJournalReplayV1,
} from "../src/validator/validator_submit_intent_journal_v1.js";
import {
  ValidatorSubmitIntentStoreV1,
  type ValidatorSubmitIntentStoreDecisionV1,
} from "../src/validator/validator_submit_intent_store_v1.js";
import {
  decideValidatorSubmitIntentLifecycleV1,
  type ValidatorSubmitIntentLifecycleDecisionV1,
} from "../src/validator/validator_submit_intent_lifecycle_v1.js";

const intentA = `0x${"a".repeat(64)}`;
const intentB = `0x${"b".repeat(64)}`;
const intentC = `0x${"c".repeat(64)}`;
const broadcastB = `0x${"d".repeat(64)}`;
const broadcastC = `0x${"e".repeat(64)}`;
const txB = `0x${"f".repeat(64)}`;
const txC = `0x${"1".repeat(64)}`;

function lifecycleOk(
  decision: ValidatorSubmitIntentLifecycleDecisionV1,
): Extract<ValidatorSubmitIntentLifecycleDecisionV1, { ok: true }> {
  if (decision.ok === false) throw new Error(`unexpected lifecycle hold: ${decision.reason}`);
  return decision;
}

function storeOk(
  decision: ValidatorSubmitIntentStoreDecisionV1,
): Extract<ValidatorSubmitIntentStoreDecisionV1, { ok: true }> {
  if (decision.ok === false) throw new Error(`unexpected store hold: ${decision.reason}`);
  return decision;
}

function recordOf(
  decision: Extract<ValidatorSubmitIntentStoreDecisionV1, { ok: true }>,
) {
  if (!decision.record) throw new Error(`missing record for ${decision.status}`);
  return decision.record;
}

function appendOk(
  entries: readonly ValidatorSubmitIntentJournalEntryV1[],
  input: ValidatorSubmitIntentJournalAppendInputV1,
): Extract<ValidatorSubmitIntentJournalAppendDecisionV1, { ok: true }> {
  const decision = appendValidatorSubmitIntentJournalEntryV1(entries, input);
  if (decision.ok === false) throw new Error(`unexpected journal hold: ${decision.reason}`);
  return decision;
}

function heldReason(
  decision: ValidatorSubmitIntentJournalAppendDecisionV1,
): string {
  if (decision.ok !== false) throw new Error("expected journal hold");
  return decision.reason;
}

function replayOk(
  entries: readonly ValidatorSubmitIntentJournalEntryV1[],
  nowMs: number,
): Extract<ValidatorSubmitIntentJournalReplayV1, { ok: true }> {
  const replay = replayValidatorSubmitIntentJournalV1(entries, nowMs);
  if (replay.ok === false) throw new Error(`unexpected replay hold: ${replay.reason}`);
  return replay;
}

function replayHeldReason(
  entries: readonly ValidatorSubmitIntentJournalEntryV1[],
  nowMs: number,
): string {
  const replay = replayValidatorSubmitIntentJournalV1(entries, nowMs);
  if (replay.ok !== false) throw new Error("expected replay hold");
  return replay.reason;
}

function stateOf(
  replay: Extract<ValidatorSubmitIntentJournalReplayV1, { ok: true }>,
  intentId: string,
) {
  const state = replay.intent_states.find((item) => item.submit_intent_id === intentId);
  if (!state) throw new Error(`missing intent state: ${intentId}`);
  return state;
}

const store = new ValidatorSubmitIntentStoreV1({ max_records: 10 });
let entries: ValidatorSubmitIntentJournalEntryV1[] = [];

const reservedA = storeOk(store.apply({
  action: "reserve",
  now_ms: 10_000,
  ttl_ms: 1_000,
  submit_intent_id: intentA,
  expected_record_hash: null,
}));
const pendingA = recordOf(reservedA);
entries = appendOk(entries, { event_kind: "record_reserved", record: pendingA }).entries;

let stateA = stateOf(replayOk(entries, 10_500), intentA);
assert.equal(stateA.crash_state, "reserved_not_broadcast");
assert.equal(stateA.automatic_rebroadcast_allowed, false);
assert.equal(stateA.new_reservation_allowed_by_journal, false);

stateA = stateOf(replayOk(entries, 11_000), intentA);
assert.equal(stateA.crash_state, "reservation_expired_requires_new_reservation");
assert.equal(stateA.new_reservation_allowed_by_journal, true);
assert.equal(stateA.automatic_rebroadcast_allowed, false);

const expiredInspectA = storeOk(store.apply({
  action: "inspect",
  now_ms: 11_000,
  submit_intent_id: intentA,
}));
const expiredReleasedA = recordOf(expiredInspectA);
entries = appendOk(entries, {
  event_kind: "record_released",
  record: expiredReleasedA,
}).entries;
stateA = stateOf(replayOk(entries, 11_100), intentA);
assert.equal(stateA.crash_state, "released_requires_new_reservation");
assert.equal(stateA.new_reservation_allowed_by_journal, true);

const retryA = storeOk(store.apply({
  action: "reserve",
  now_ms: 12_000,
  ttl_ms: 5_000,
  submit_intent_id: intentA,
  expected_record_hash: expiredReleasedA.record_hash_sha256,
}));
const retryRecordA = recordOf(retryA);
assert.equal(retryRecordA.attempt, 2);
entries = appendOk(entries, { event_kind: "record_reserved", record: retryRecordA }).entries;
stateA = stateOf(replayOk(entries, 12_100), intentA);
assert.equal(stateA.crash_state, "reserved_not_broadcast");

assert.equal(
  heldReason(appendValidatorSubmitIntentJournalEntryV1(entries, {
    event_kind: "record_released",
    record: expiredReleasedA,
  })),
  "entry_time_before_prior_intent_event",
);

const reservedB = storeOk(store.apply({
  action: "reserve",
  now_ms: 20_000,
  ttl_ms: 2_000,
  submit_intent_id: intentB,
  expected_record_hash: null,
}));
const pendingB = recordOf(reservedB);
entries = appendOk(entries, { event_kind: "record_reserved", record: pendingB }).entries;
entries = appendOk(entries, {
  event_kind: "broadcast_started",
  event_at_ms: 20_100,
  submit_intent_id: intentB,
  attempt: pendingB.attempt,
  record_hash_sha256: pendingB.record_hash_sha256,
  broadcast_id: broadcastB,
}).entries;

let stateB = stateOf(replayOk(entries, 25_000), intentB);
assert.equal(stateB.crash_state, "broadcast_outcome_unknown_reconcile_only");
assert.equal(stateB.requires_operator_reconciliation, true);
assert.equal(stateB.new_reservation_allowed_by_journal, false);
assert.equal(stateB.automatic_rebroadcast_allowed, false);

assert.equal(
  heldReason(appendValidatorSubmitIntentJournalEntryV1(entries, {
    event_kind: "broadcast_started",
    event_at_ms: 20_200,
    submit_intent_id: intentB,
    attempt: pendingB.attempt,
    record_hash_sha256: pendingB.record_hash_sha256,
    broadcast_id: `0x${"9".repeat(64)}`,
  })),
  "broadcast_already_started_for_attempt",
);

const unsafeReleaseDecisionB = lifecycleOk(decideValidatorSubmitIntentLifecycleV1({
  action: "release",
  now_ms: 20_300,
  submit_intent_id: intentB,
  release_reason: "operator_cancelled",
  prior_record: pendingB,
}));
if (!unsafeReleaseDecisionB.record) throw new Error("missing unsafe release record");
const unsafeReleaseB = unsafeReleaseDecisionB.record;
assert.equal(
  heldReason(appendValidatorSubmitIntentJournalEntryV1(entries, {
    event_kind: "record_released",
    record: unsafeReleaseB,
  })),
  "release_after_broadcast_requires_failed_receipt",
);

entries = appendOk(entries, {
  event_kind: "transaction_observed",
  event_at_ms: 20_400,
  submit_intent_id: intentB,
  attempt: pendingB.attempt,
  record_hash_sha256: pendingB.record_hash_sha256,
  broadcast_id: broadcastB,
  transaction_hash: txB,
}).entries;
stateB = stateOf(replayOk(entries, 25_000), intentB);
assert.equal(stateB.crash_state, "transaction_receipt_unknown_reconcile_only");
assert.equal(stateB.requires_operator_reconciliation, true);
assert.equal(stateB.automatic_rebroadcast_allowed, false);

entries = appendOk(entries, {
  event_kind: "receipt_observed",
  event_at_ms: 20_500,
  submit_intent_id: intentB,
  attempt: pendingB.attempt,
  record_hash_sha256: pendingB.record_hash_sha256,
  broadcast_id: broadcastB,
  transaction_hash: txB,
  receipt_status: 0,
}).entries;
stateB = stateOf(replayOk(entries, 20_600), intentB);
assert.equal(stateB.crash_state, "receipt_failed_release_required");
assert.equal(stateB.requires_release_before_new_reservation, true);
assert.equal(stateB.new_reservation_allowed_by_journal, false);

const releasedB = recordOf(storeOk(store.apply({
  action: "release",
  now_ms: 20_600,
  submit_intent_id: intentB,
  release_reason: "live_transaction_failed",
  expected_record_hash: pendingB.record_hash_sha256,
})));
entries = appendOk(entries, { event_kind: "record_released", record: releasedB }).entries;
stateB = stateOf(replayOk(entries, 20_700), intentB);
assert.equal(stateB.crash_state, "released_requires_new_reservation");
assert.equal(stateB.new_reservation_allowed_by_journal, true);

const reservedC = storeOk(store.apply({
  action: "reserve",
  now_ms: 30_000,
  ttl_ms: 5_000,
  submit_intent_id: intentC,
  expected_record_hash: null,
}));
const pendingC = recordOf(reservedC);
entries = appendOk(entries, { event_kind: "record_reserved", record: pendingC }).entries;
entries = appendOk(entries, {
  event_kind: "broadcast_started",
  event_at_ms: 30_100,
  submit_intent_id: intentC,
  attempt: pendingC.attempt,
  record_hash_sha256: pendingC.record_hash_sha256,
  broadcast_id: broadcastC,
}).entries;
entries = appendOk(entries, {
  event_kind: "transaction_observed",
  event_at_ms: 30_200,
  submit_intent_id: intentC,
  attempt: pendingC.attempt,
  record_hash_sha256: pendingC.record_hash_sha256,
  broadcast_id: broadcastC,
  transaction_hash: txC,
}).entries;
entries = appendOk(entries, {
  event_kind: "receipt_observed",
  event_at_ms: 30_300,
  submit_intent_id: intentC,
  attempt: pendingC.attempt,
  record_hash_sha256: pendingC.record_hash_sha256,
  broadcast_id: broadcastC,
  transaction_hash: txC,
  receipt_status: 1,
}).entries;

let stateC = stateOf(replayOk(entries, 30_400), intentC);
assert.equal(stateC.crash_state, "receipt_success_commit_required");
assert.equal(stateC.requires_commit_recovery, true);
assert.equal(stateC.requires_operator_reconciliation, true);
assert.equal(stateC.automatic_rebroadcast_allowed, false);

const committedC = recordOf(storeOk(store.apply({
  action: "commit",
  now_ms: 30_400,
  submit_intent_id: intentC,
  transaction_hash: txC,
  receipt_status: 1,
  expected_record_hash: pendingC.record_hash_sha256,
})));
entries = appendOk(entries, { event_kind: "record_committed", record: committedC }).entries;
stateC = stateOf(replayOk(entries, 30_500), intentC);
assert.equal(stateC.crash_state, "committed_terminal");
assert.equal(stateC.terminal, true);
assert.equal(stateC.automatic_rebroadcast_allowed, false);

const tamperedPrevious = structuredClone(entries);
tamperedPrevious[1].previous_entry_hash_sha256 = "0".repeat(64);
assert.equal(replayHeldReason(tamperedPrevious, 40_000), "entry_previous_hash_mismatch");

const tamperedHash = structuredClone(entries);
tamperedHash[0].entry_hash_sha256 = "0".repeat(64);
assert.equal(replayHeldReason(tamperedHash, 40_000), "entry_hash_mismatch");

const tamperedRecord = structuredClone(entries);
const firstRecordEntry = tamperedRecord.find((entry) => entry.record !== null);
if (!firstRecordEntry?.record) throw new Error("missing record entry");
firstRecordEntry.record.attempt += 1;
assert.equal(replayHeldReason(tamperedRecord, 40_000), "entry_hash_mismatch");

console.log("VOID_VALIDATOR_SUBMIT_INTENT_JOURNAL_RECOVERY_V1_GREEN");
