import assert from "node:assert/strict";
import {
  VOID_VALIDATOR_SUBMIT_INTENT_JOURNAL_STORAGE_V1,
  VOID_VALIDATOR_SUBMIT_INTENT_JOURNAL_V1,
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

const intentId = `0x${"1".repeat(64)}`;
const broadcastId = `0x${"2".repeat(64)}`;
const transactionHash = `0x${"3".repeat(64)}`;

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

function replayOk(
  entries: readonly ValidatorSubmitIntentJournalEntryV1[],
  nowMs: number,
): Extract<ValidatorSubmitIntentJournalReplayV1, { ok: true }> {
  const replay = replayValidatorSubmitIntentJournalV1(entries, nowMs);
  if (replay.ok === false) throw new Error(`unexpected replay hold: ${replay.reason}`);
  return replay;
}

function stateOf(
  replay: Extract<ValidatorSubmitIntentJournalReplayV1, { ok: true }>,
) {
  const state = replay.intent_states.find((item) => item.submit_intent_id === intentId);
  if (!state) throw new Error("missing intent state");
  return state;
}

assert.equal(
  VOID_VALIDATOR_SUBMIT_INTENT_JOURNAL_V1,
  "VOID_VALIDATOR_SUBMIT_INTENT_JOURNAL_V1",
);
assert.deepEqual(VOID_VALIDATOR_SUBMIT_INTENT_JOURNAL_STORAGE_V1, {
  serializable_event_contract: true,
  hash_chained: true,
  replayable: true,
  filesystem_write: false,
  persistent_storage_implementation: false,
  rpc_call: false,
  wallet_access: false,
  signer_access: false,
  transaction_signing: false,
  transaction_broadcast: false,
  runtime_route_mount: false,
  validator_registration: false,
  validator_admission: false,
  active_validator_set_mutation: false,
  money_movement: false,
});

const store = new ValidatorSubmitIntentStoreV1({ max_records: 10 });
const reserved = storeOk(store.apply({
  action: "reserve",
  now_ms: 1_000,
  ttl_ms: 10_000,
  submit_intent_id: intentId,
  expected_record_hash: null,
}));
const pendingRecord = recordOf(reserved);

let entries: ValidatorSubmitIntentJournalEntryV1[] = [];
let appended = appendOk(entries, {
  event_kind: "record_reserved",
  record: pendingRecord,
});
entries = appended.entries;
assert.equal(entries.length, 1);
assert.equal(entries[0].sequence, 1);
assert.equal(entries[0].previous_entry_hash_sha256, "0".repeat(64));
assert.equal(entries[0].entry_hash_sha256.length, 64);
assert.equal(entries[0].record?.record_hash_sha256, pendingRecord.record_hash_sha256);

let replay = replayOk(entries, 1_100);
let state = stateOf(replay);
assert.equal(state.crash_state, "reserved_not_broadcast");
assert.equal(state.automatic_rebroadcast_allowed, false);
assert.equal(state.new_reservation_allowed_by_journal, false);
assert.equal(state.requires_operator_reconciliation, false);
assert.equal(state.requires_release_before_new_reservation, false);
assert.equal(state.requires_commit_recovery, false);
assert.equal(state.terminal, false);

appended = appendOk(entries, {
  event_kind: "broadcast_started",
  event_at_ms: 1_200,
  submit_intent_id: intentId,
  attempt: pendingRecord.attempt,
  record_hash_sha256: pendingRecord.record_hash_sha256,
  broadcast_id: broadcastId,
});
entries = appended.entries;
state = stateOf(appended.replay);
assert.equal(state.crash_state, "broadcast_outcome_unknown_reconcile_only");
assert.equal(state.automatic_rebroadcast_allowed, false);
assert.equal(state.requires_operator_reconciliation, true);

appended = appendOk(entries, {
  event_kind: "transaction_observed",
  event_at_ms: 1_300,
  submit_intent_id: intentId,
  attempt: pendingRecord.attempt,
  record_hash_sha256: pendingRecord.record_hash_sha256,
  broadcast_id: broadcastId,
  transaction_hash: transactionHash,
});
entries = appended.entries;
state = stateOf(appended.replay);
assert.equal(state.crash_state, "transaction_receipt_unknown_reconcile_only");
assert.equal(state.transaction_hash, transactionHash);
assert.equal(state.requires_operator_reconciliation, true);

appended = appendOk(entries, {
  event_kind: "receipt_observed",
  event_at_ms: 1_400,
  submit_intent_id: intentId,
  attempt: pendingRecord.attempt,
  record_hash_sha256: pendingRecord.record_hash_sha256,
  broadcast_id: broadcastId,
  transaction_hash: transactionHash,
  receipt_status: 1,
});
entries = appended.entries;
state = stateOf(appended.replay);
assert.equal(state.crash_state, "receipt_success_commit_required");
assert.equal(state.requires_operator_reconciliation, true);
assert.equal(state.requires_commit_recovery, true);
assert.equal(state.automatic_rebroadcast_allowed, false);

const committed = storeOk(store.apply({
  action: "commit",
  now_ms: 1_500,
  submit_intent_id: intentId,
  transaction_hash: transactionHash,
  receipt_status: 1,
  expected_record_hash: pendingRecord.record_hash_sha256,
}));
const committedRecord = recordOf(committed);

appended = appendOk(entries, {
  event_kind: "record_committed",
  record: committedRecord,
});
entries = appended.entries;
replay = replayOk(entries, 2_000);
state = stateOf(replay);
assert.equal(state.crash_state, "committed_terminal");
assert.equal(state.terminal, true);
assert.equal(state.automatic_rebroadcast_allowed, false);
assert.equal(state.new_reservation_allowed_by_journal, false);
assert.equal(state.record.state, "committed");
assert.equal(state.record.transaction_hash, transactionHash);
assert.deepEqual(replay.reconstructed_records, [committedRecord]);
assert.equal(replay.journal_head_hash_sha256, entries.at(-1)?.entry_hash_sha256);

for (let index = 0; index < entries.length; index += 1) {
  assert.equal(entries[index].sequence, index + 1);
  assert.equal(
    entries[index].previous_entry_hash_sha256,
    index === 0 ? "0".repeat(64) : entries[index - 1].entry_hash_sha256,
  );
  assert.equal(entries[index].entry_hash_sha256.length, 64);
}

const mutatedReplay = replayOk(entries, 2_100);
mutatedReplay.reconstructed_records[0].state = "released";
mutatedReplay.intent_states[0].record.record_hash_sha256 = "0".repeat(64);
const replayAgain = replayOk(entries, 2_200);
assert.equal(replayAgain.reconstructed_records[0].state, "committed");
assert.equal(
  replayAgain.intent_states[0].record.record_hash_sha256,
  committedRecord.record_hash_sha256,
);

console.log("VOID_VALIDATOR_SUBMIT_INTENT_JOURNAL_V1_GREEN");
