import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  VOID_VALIDATOR_SUBMIT_INTENT_RUNTIME_INTEGRATION_AUTHORITY_V1,
  ValidatorSubmitIntentRuntimeIntegrationV1,
  type ValidatorSubmitIntentRuntimeIntegrationDecisionV1,
} from "../src/validator/validator_submit_intent_runtime_integration_v1.js";
import { ValidatorSubmitIntentJournalFileAdapterV1 } from "../src/validator/validator_submit_intent_journal_file_adapter_v1.js";

const ZERO_HASH = "0".repeat(64);
const intentA = `0x${"1".repeat(64)}`;
const intentB = `0x${"2".repeat(64)}`;
const intentC = `0x${"3".repeat(64)}`;
const intentD = `0x${"4".repeat(64)}`;
const broadcastA = `0x${"a".repeat(64)}`;
const broadcastB = `0x${"b".repeat(64)}`;
const broadcastC = `0x${"c".repeat(64)}`;
const txA = `0x${"d".repeat(64)}`;
const txC = `0x${"e".repeat(64)}`;

function ready(
  decision: ValidatorSubmitIntentRuntimeIntegrationDecisionV1,
) {
  if (decision.ok === false) throw new Error(`unexpected hold: ${decision.reason}`);
  return decision;
}

function heldReason(
  decision: ValidatorSubmitIntentRuntimeIntegrationDecisionV1,
): string {
  if (decision.ok === true) throw new Error(`unexpected ready: ${decision.status}`);
  assert.equal(decision.automatic_rebroadcast_allowed, false);
  return decision.reason;
}

function parent(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "void-validator-runtime-intent-"));
  fs.chmodSync(dir, 0o700);
  return dir;
}

const root = parent();
try {
  const journalPath = path.join(root, "submit-intents.jsonl");
  const integration = new ValidatorSubmitIntentRuntimeIntegrationV1({
    journal_path: journalPath,
    ttl_ms: 10_000,
  });

  assert.equal(ready(integration.inspect({ now_ms: 900, submit_intent_id: intentA })).status, "available");
  const reservedA1 = ready(integration.reserve({ now_ms: 1_000, submit_intent_id: intentA }));
  assert.equal(reservedA1.status, "reserved");
  assert.equal(reservedA1.record?.attempt, 1);
  assert.equal(reservedA1.journal_entries_total, 1);
  assert.equal(heldReason(integration.reserve({ now_ms: 1_100, submit_intent_id: intentA })), "journal_state_reserved_not_broadcast");

  const releasedA1 = ready(integration.releaseBeforeBroadcast({
    now_ms: 1_200,
    submit_intent_id: intentA,
    release_reason: "pre_count_read_failed",
  }));
  assert.equal(releasedA1.status, "released");
  assert.equal(releasedA1.record?.release_reason, "pre_count_read_failed");

  const reservedA2 = ready(integration.reserve({ now_ms: 1_300, submit_intent_id: intentA }));
  assert.equal(reservedA2.record?.attempt, 2);
  const startedA = ready(integration.beginBroadcast({
    now_ms: 1_400,
    submit_intent_id: intentA,
    broadcast_id: broadcastA,
  }));
  assert.equal(startedA.status, "broadcast_started");
  assert.equal(startedA.intent_state?.crash_state, "broadcast_outcome_unknown_reconcile_only");
  assert.equal(heldReason(integration.beginBroadcast({
    now_ms: 1_450,
    submit_intent_id: intentA,
    broadcast_id: broadcastB,
  })), "broadcast_requires_live_reservation");

  const observedTxA = ready(integration.observeTransaction({
    now_ms: 1_500,
    submit_intent_id: intentA,
    broadcast_id: broadcastA,
    transaction_hash: txA,
  }));
  assert.equal(observedTxA.intent_state?.crash_state, "transaction_receipt_unknown_reconcile_only");

  const observedReceiptA = ready(integration.observeReceipt({
    now_ms: 1_600,
    submit_intent_id: intentA,
    broadcast_id: broadcastA,
    transaction_hash: txA,
    receipt_status: 1,
  }));
  assert.equal(observedReceiptA.intent_state?.crash_state, "receipt_success_commit_required");

  const committedA = ready(integration.commitSuccessfulReceipt({
    now_ms: 1_700,
    submit_intent_id: intentA,
  }));
  assert.equal(committedA.status, "committed");
  assert.equal(committedA.record?.state, "committed");
  assert.equal(committedA.record?.transaction_hash, txA);
  assert.equal(committedA.intent_state?.crash_state, "committed_terminal");
  assert.equal(committedA.journal_entries_total, 7);
  assert.equal(heldReason(integration.reserve({ now_ms: 1_800, submit_intent_id: intentA })), "journal_state_committed_terminal");

  const reservedB = ready(integration.reserve({ now_ms: 2_000, submit_intent_id: intentB }));
  assert.equal(reservedB.record?.attempt, 1);
  ready(integration.beginBroadcast({
    now_ms: 2_100,
    submit_intent_id: intentB,
    broadcast_id: broadcastB,
  }));

  const restarted = new ValidatorSubmitIntentRuntimeIntegrationV1({
    journal_path: journalPath,
    ttl_ms: 10_000,
  });
  const recoveredB = ready(restarted.inspect({ now_ms: 2_200, submit_intent_id: intentB }));
  assert.equal(recoveredB.intent_state?.crash_state, "broadcast_outcome_unknown_reconcile_only");
  assert.equal(recoveredB.intent_state?.requires_operator_reconciliation, true);
  assert.equal(recoveredB.automatic_rebroadcast_allowed, false);
  assert.equal(heldReason(restarted.reserve({ now_ms: 20_000, submit_intent_id: intentB })), "journal_state_broadcast_outcome_unknown_reconcile_only");

  ready(integration.reserve({ now_ms: 3_000, submit_intent_id: intentC }));
  ready(integration.beginBroadcast({
    now_ms: 3_100,
    submit_intent_id: intentC,
    broadcast_id: broadcastC,
  }));
  ready(integration.observeTransaction({
    now_ms: 3_200,
    submit_intent_id: intentC,
    broadcast_id: broadcastC,
    transaction_hash: txC,
  }));
  const failedReceipt = ready(integration.observeReceipt({
    now_ms: 3_300,
    submit_intent_id: intentC,
    broadcast_id: broadcastC,
    transaction_hash: txC,
    receipt_status: 0,
  }));
  assert.equal(failedReceipt.intent_state?.crash_state, "receipt_failed_release_required");
  const failedReleased = ready(integration.releaseFailedReceipt({
    now_ms: 3_400,
    submit_intent_id: intentC,
    release_reason: "live_transaction_failed",
  }));
  assert.equal(failedReleased.status, "released");
  const retryC = ready(integration.reserve({ now_ms: 3_500, submit_intent_id: intentC }));
  assert.equal(retryC.record?.attempt, 2);

  const reservedD1 = ready(integration.reserve({ now_ms: 4_000, submit_intent_id: intentD }));
  assert.equal(reservedD1.record?.attempt, 1);
  const reservedD2 = ready(integration.reserve({ now_ms: 14_001, submit_intent_id: intentD }));
  assert.equal(reservedD2.record?.attempt, 2);
  assert.equal(reservedD2.intent_state?.crash_state, "reserved_not_broadcast");

  const adapter = new ValidatorSubmitIntentJournalFileAdapterV1({ journal_path: journalPath });
  const loaded = adapter.load(4_000);
  if (loaded.ok === false) throw new Error(`unexpected adapter hold: ${loaded.reason}`);
  assert.notEqual(loaded.journal_head_hash_sha256, ZERO_HASH);
  assert.equal(loaded.replay.intent_states.every((state) => state.automatic_rebroadcast_allowed === false), true);
  assert.equal(fs.statSync(root).mode & 0o777, 0o700);
  assert.equal(fs.statSync(journalPath).mode & 0o777, 0o600);
  assert.equal(fs.existsSync(`${journalPath}.lock`), false);

  assert.equal(VOID_VALIDATOR_SUBMIT_INTENT_RUNTIME_INTEGRATION_AUTHORITY_V1.rpc_call, false);
  assert.equal(VOID_VALIDATOR_SUBMIT_INTENT_RUNTIME_INTEGRATION_AUTHORITY_V1.wallet_access, false);
  assert.equal(VOID_VALIDATOR_SUBMIT_INTENT_RUNTIME_INTEGRATION_AUTHORITY_V1.signer_access, false);
  assert.equal(VOID_VALIDATOR_SUBMIT_INTENT_RUNTIME_INTEGRATION_AUTHORITY_V1.transaction_broadcast, false);
  assert.equal(VOID_VALIDATOR_SUBMIT_INTENT_RUNTIME_INTEGRATION_AUTHORITY_V1.automatic_rebroadcast, false);
  assert.equal(VOID_VALIDATOR_SUBMIT_INTENT_RUNTIME_INTEGRATION_AUTHORITY_V1.active_validator_set_mutation, false);

  console.log("VOID_VALIDATOR_SUBMIT_INTENT_RUNTIME_INTEGRATION_V1_GREEN");
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}
