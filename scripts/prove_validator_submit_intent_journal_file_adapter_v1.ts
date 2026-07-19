import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  VOID_VALIDATOR_SUBMIT_INTENT_JOURNAL_FILE_ADAPTER_AUTHORITY_V1,
  VOID_VALIDATOR_SUBMIT_INTENT_JOURNAL_FILE_ADAPTER_STORAGE_V1,
  VOID_VALIDATOR_SUBMIT_INTENT_JOURNAL_FILE_ADAPTER_V1,
  ValidatorSubmitIntentJournalFileAdapterV1,
  type ValidatorSubmitIntentJournalFileAppendDecisionV1,
  type ValidatorSubmitIntentJournalFileLoadDecisionV1,
} from "../src/validator/validator_submit_intent_journal_file_adapter_v1.js";
import {
  ValidatorSubmitIntentStoreV1,
  type ValidatorSubmitIntentStoreDecisionV1,
} from "../src/validator/validator_submit_intent_store_v1.js";

const ZERO_HASH = "0".repeat(64);
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
  decision: ValidatorSubmitIntentJournalFileAppendDecisionV1,
): Extract<ValidatorSubmitIntentJournalFileAppendDecisionV1, { ok: true }> {
  if (decision.ok === false) throw new Error(`unexpected adapter hold: ${decision.reason}`);
  return decision;
}

function appendHeldReason(
  decision: ValidatorSubmitIntentJournalFileAppendDecisionV1,
): string {
  if (decision.ok !== false) throw new Error("expected adapter append hold");
  return decision.reason;
}

function loadOk(
  decision: ValidatorSubmitIntentJournalFileLoadDecisionV1,
): Extract<ValidatorSubmitIntentJournalFileLoadDecisionV1, { ok: true }> {
  if (decision.ok === false) throw new Error(`unexpected adapter load hold: ${decision.reason}`);
  return decision;
}

assert.equal(
  VOID_VALIDATOR_SUBMIT_INTENT_JOURNAL_FILE_ADAPTER_V1,
  "VOID_VALIDATOR_SUBMIT_INTENT_JOURNAL_FILE_ADAPTER_V1",
);
assert.equal(
  VOID_VALIDATOR_SUBMIT_INTENT_JOURNAL_FILE_ADAPTER_STORAGE_V1.append_only,
  true,
);
assert.equal(
  VOID_VALIDATOR_SUBMIT_INTENT_JOURNAL_FILE_ADAPTER_STORAGE_V1.stale_lock_auto_break,
  false,
);
assert.equal(
  VOID_VALIDATOR_SUBMIT_INTENT_JOURNAL_FILE_ADAPTER_STORAGE_V1.automatic_rebroadcast_allowed,
  false,
);
assert.equal(
  VOID_VALIDATOR_SUBMIT_INTENT_JOURNAL_FILE_ADAPTER_AUTHORITY_V1.filesystem_write,
  true,
);
assert.equal(
  VOID_VALIDATOR_SUBMIT_INTENT_JOURNAL_FILE_ADAPTER_AUTHORITY_V1.truncate_journal_file,
  false,
);
assert.equal(
  VOID_VALIDATOR_SUBMIT_INTENT_JOURNAL_FILE_ADAPTER_AUTHORITY_V1.runtime_route_mount,
  false,
);
assert.equal(
  VOID_VALIDATOR_SUBMIT_INTENT_JOURNAL_FILE_ADAPTER_AUTHORITY_V1.transaction_broadcast,
  false,
);
assert.equal(
  VOID_VALIDATOR_SUBMIT_INTENT_JOURNAL_FILE_ADAPTER_AUTHORITY_V1.active_validator_set_mutation,
  false,
);

assert.throws(
  () => new ValidatorSubmitIntentJournalFileAdapterV1({ journal_path: "relative.jsonl" }),
  /invalid_journal_path/,
);
assert.throws(
  () => new ValidatorSubmitIntentJournalFileAdapterV1({
    journal_path: path.join(os.tmpdir(), "journal.txt"),
  }),
  /invalid_journal_path/,
);

const parent = fs.mkdtempSync(path.join(os.tmpdir(), "void-validator-journal-file-v1-"));
fs.chmodSync(parent, 0o700);
const journalPath = path.join(parent, "submit-intents.jsonl");
const adapter = new ValidatorSubmitIntentJournalFileAdapterV1({
  journal_path: journalPath,
  max_file_bytes: 4 * 1024 * 1024,
  max_line_bytes: 64 * 1024,
  max_entries: 100,
});

try {
  let loaded = loadOk(adapter.load(1_000));
  assert.equal(loaded.file_exists, false);
  assert.equal(loaded.file_bytes, 0);
  assert.equal(loaded.entries_total, 0);
  assert.equal(loaded.journal_head_hash_sha256, ZERO_HASH);
  assert.equal(loaded.lock_present, false);

  const store = new ValidatorSubmitIntentStoreV1({ max_records: 10 });
  const reserved = storeOk(store.apply({
    action: "reserve",
    now_ms: 1_000,
    ttl_ms: 10_000,
    submit_intent_id: intentId,
    expected_record_hash: null,
  }));
  const pendingRecord = recordOf(reserved);

  let appended = appendOk(adapter.append({
    now_ms: 1_000,
    expected_entries_total: 0,
    expected_head_hash_sha256: ZERO_HASH,
    event: {
      event_kind: "record_reserved",
      record: pendingRecord,
    },
  }));
  assert.equal(appended.journal_file_created, true);
  assert.equal(appended.entries_total, 1);
  assert.equal(appended.previous_head_hash_sha256, ZERO_HASH);
  assert.equal(appended.current_head_hash_sha256, appended.entry.entry_hash_sha256);
  assert.equal(appended.fsync_completed, true);
  assert.equal(appended.automatic_rebroadcast_allowed, false);
  assert.equal(fs.statSync(parent).mode & 0o777, 0o700);
  assert.equal(fs.statSync(journalPath).mode & 0o777, 0o600);
  assert.equal(fs.existsSync(`${journalPath}.lock`), false);
  assert.equal(fs.readFileSync(journalPath, "utf8").endsWith("\n"), true);

  const bytesAfterReserve = fs.readFileSync(journalPath);
  assert.equal(
    appendHeldReason(adapter.append({
      now_ms: 1_200,
      expected_entries_total: 0,
      expected_head_hash_sha256: ZERO_HASH,
      event: {
        event_kind: "broadcast_started",
        event_at_ms: 1_200,
        submit_intent_id: intentId,
        attempt: pendingRecord.attempt,
        record_hash_sha256: pendingRecord.record_hash_sha256,
        broadcast_id: broadcastId,
      },
    })),
    "journal_compare_and_swap_mismatch",
  );
  assert.deepEqual(fs.readFileSync(journalPath), bytesAfterReserve);

  loaded = loadOk(adapter.load(1_100));
  appended = appendOk(adapter.append({
    now_ms: 1_200,
    expected_entries_total: loaded.entries_total,
    expected_head_hash_sha256: loaded.journal_head_hash_sha256,
    event: {
      event_kind: "broadcast_started",
      event_at_ms: 1_200,
      submit_intent_id: intentId,
      attempt: pendingRecord.attempt,
      record_hash_sha256: pendingRecord.record_hash_sha256,
      broadcast_id: broadcastId,
    },
  }));
  assert.equal(
    appended.replay.intent_states[0].crash_state,
    "broadcast_outcome_unknown_reconcile_only",
  );
  assert.equal(appended.replay.intent_states[0].automatic_rebroadcast_allowed, false);

  loaded = loadOk(adapter.load(1_250));
  appended = appendOk(adapter.append({
    now_ms: 1_300,
    expected_entries_total: loaded.entries_total,
    expected_head_hash_sha256: loaded.journal_head_hash_sha256,
    event: {
      event_kind: "transaction_observed",
      event_at_ms: 1_300,
      submit_intent_id: intentId,
      attempt: pendingRecord.attempt,
      record_hash_sha256: pendingRecord.record_hash_sha256,
      broadcast_id: broadcastId,
      transaction_hash: transactionHash,
    },
  }));
  assert.equal(
    appended.replay.intent_states[0].crash_state,
    "transaction_receipt_unknown_reconcile_only",
  );

  loaded = loadOk(adapter.load(1_350));
  appended = appendOk(adapter.append({
    now_ms: 1_400,
    expected_entries_total: loaded.entries_total,
    expected_head_hash_sha256: loaded.journal_head_hash_sha256,
    event: {
      event_kind: "receipt_observed",
      event_at_ms: 1_400,
      submit_intent_id: intentId,
      attempt: pendingRecord.attempt,
      record_hash_sha256: pendingRecord.record_hash_sha256,
      broadcast_id: broadcastId,
      transaction_hash: transactionHash,
      receipt_status: 1,
    },
  }));
  assert.equal(
    appended.replay.intent_states[0].crash_state,
    "receipt_success_commit_required",
  );

  const committed = storeOk(store.apply({
    action: "commit",
    now_ms: 1_500,
    submit_intent_id: intentId,
    transaction_hash: transactionHash,
    receipt_status: 1,
    expected_record_hash: pendingRecord.record_hash_sha256,
  }));
  const committedRecord = recordOf(committed);

  loaded = loadOk(adapter.load(1_500));
  appended = appendOk(adapter.append({
    now_ms: 1_500,
    expected_entries_total: loaded.entries_total,
    expected_head_hash_sha256: loaded.journal_head_hash_sha256,
    event: {
      event_kind: "record_committed",
      record: committedRecord,
    },
  }));
  assert.equal(appended.entries_total, 5);
  assert.equal(appended.replay.intent_states[0].crash_state, "committed_terminal");
  assert.equal(appended.replay.intent_states[0].terminal, true);
  assert.equal(appended.replay.intent_states[0].automatic_rebroadcast_allowed, false);

  const finalLoad = loadOk(adapter.load(2_000));
  assert.equal(finalLoad.entries_total, 5);
  assert.equal(finalLoad.replay.reconstructed_records[0].state, "committed");
  assert.equal(finalLoad.journal_head_hash_sha256, appended.current_head_hash_sha256);
  assert.equal(finalLoad.lock_present, false);

  finalLoad.entries[0].sequence = 999;
  finalLoad.replay.reconstructed_records[0].state = "released";
  const defensiveLoad = loadOk(adapter.load(2_100));
  assert.equal(defensiveLoad.entries[0].sequence, 1);
  assert.equal(defensiveLoad.replay.reconstructed_records[0].state, "committed");

  const lines = fs.readFileSync(journalPath, "utf8").split("\n");
  assert.equal(lines.at(-1), "");
  lines.pop();
  assert.equal(lines.length, 5);
  for (const line of lines) {
    assert.equal(JSON.stringify(JSON.parse(line)), line);
  }
} finally {
  fs.rmSync(parent, { recursive: true, force: true });
}

console.log("VOID_VALIDATOR_SUBMIT_INTENT_JOURNAL_FILE_ADAPTER_V1_GREEN");
