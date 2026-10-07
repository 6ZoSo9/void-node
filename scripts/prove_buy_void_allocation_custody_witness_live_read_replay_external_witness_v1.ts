#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";

import {
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_EXTERNAL_WITNESS_AUTHORITY_V1,
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_EXTERNAL_WITNESS_V1,
  classifyBuyVoidAllocationCustodyWitnessLiveReadReplayExternalWitnessV1,
  parseBuyVoidAllocationCustodyWitnessLiveReadReplayExternalWitnessJournalV1,
  planBuyVoidAllocationCustodyWitnessLiveReadReplayExternalWitnessAdvanceV1,
} from "../src/economic/buy_void_allocation_custody_witness_live_read_replay_external_witness_v1.js";
import {
  deriveBuyVoidAllocationCustodyWitnessLiveReadReplayHighWaterV1,
} from "../src/economic/buy_void_allocation_custody_witness_live_read_replay_high_water_v1.js";
import {
  planBuyVoidAllocationCustodyWitnessLiveReadChallengeIssueV1,
  planBuyVoidAllocationCustodyWitnessLiveReadChallengeTerminalV1,
} from "../src/economic/buy_void_allocation_custody_witness_live_read_replay_state_v1.js";

const sha = (hex: string): string =>
  "sha256:" + hex.repeat(64);
const requestId = (hex: string): string =>
  "voidwreq1_" + hex.repeat(64);

const identity = Object.freeze({
  source_hostname: "zoso-Precision-Tower-7810",
  source_journal_root:
    "/var/lib/void-allocation-ledger-v1/witness-live-read-replay-v1",
  source_high_water_root:
    "/var/lib/void-allocation-custody-v1/witness-live-read-replay-v1",
  source_journal_disk_wwn: "0x500a0751e9c796d8",
  source_high_water_disk_wwn:
    "eui.e8238fa6bf530001001b448b42e66c36",
  witness_hostname: "Nimo",
  witness_machine_id_sha256:
    "sha256:48a3554126d621d6460385ebacf3d41b454157337271cb7405af012158f203d4",
  witness_root_disk_serial: "50026B76873B25AB",
  witness_root_disk_wwn:
    "eui.00000000000000000026b76873b25ab5",
});

function highWater(journal: string) {
  const result =
    deriveBuyVoidAllocationCustodyWitnessLiveReadReplayHighWaterV1(
      journal,
    );
  assert.equal(result.ok, true);
  if (!result.ok) throw new Error("high-water fixture held");
  return result;
}

const journal0 = "";
const high0 = highWater(journal0);

const genesisPlan =
  planBuyVoidAllocationCustodyWitnessLiveReadReplayExternalWitnessAdvanceV1({
    witness_jsonl: "",
    current_journal_jsonl: journal0,
    current_high_water_json: high0.high_water_json,
    identity,
  });
assert.equal(genesisPlan.ok, true);
if (!genesisPlan.ok) throw new Error("external witness genesis held");
assert.equal(genesisPlan.status, "planned_genesis");
assert.equal(genesisPlan.next_event?.sequence, 1);
assert.equal(genesisPlan.next_event?.replay_sequence, 0);
assert.equal(genesisPlan.next_event?.generation, 0);
assert.equal(genesisPlan.next_event?.event_count, 0);
assert.equal(genesisPlan.next_event?.pending, false);
assert.equal(genesisPlan.next_event?.ready_for_issue, true);

const witness0 = Buffer.from(genesisPlan.next_witness_jsonl, "utf8");
const parsed0 =
  parseBuyVoidAllocationCustodyWitnessLiveReadReplayExternalWitnessJournalV1(
    witness0,
  );
assert.equal(parsed0.event_count, 1);
assert.equal(parsed0.tip.replay_sequence, 0);

const matched0 =
  classifyBuyVoidAllocationCustodyWitnessLiveReadReplayExternalWitnessV1({
    witness_jsonl: witness0,
    current_journal_jsonl: journal0,
    current_high_water_json: high0.high_water_json,
    identity,
  });
assert.equal(matched0.ok, true);
if (!matched0.ok) throw new Error("genesis match held");
assert.equal(matched0.status, "matched");
assert.equal(matched0.exact_live_match, true);

const issueA =
  planBuyVoidAllocationCustodyWitnessLiveReadChallengeIssueV1({
    journal_jsonl: journal0,
    entropy_sha256: sha("1"),
    issued_at_ms: 1_000,
    expires_at_ms: 39_000,
  });
assert.equal(issueA.ok, true);
if (!issueA.ok) throw new Error("issue A held");
const journalA1 = issueA.next_journal_jsonl;
const highA1 = highWater(journalA1);

const updateRequiredA1 =
  classifyBuyVoidAllocationCustodyWitnessLiveReadReplayExternalWitnessV1({
    witness_jsonl: witness0,
    current_journal_jsonl: journalA1,
    current_high_water_json: highA1.high_water_json,
    identity,
  });
assert.equal(updateRequiredA1.ok, true);
if (!updateRequiredA1.ok) throw new Error("update-required A1 held");
assert.equal(
  updateRequiredA1.status,
  "external_witness_update_required",
);
assert.equal(updateRequiredA1.witnessed_replay_sequence, 0);
assert.equal(updateRequiredA1.local_replay_sequence, 1);

const planA1 =
  planBuyVoidAllocationCustodyWitnessLiveReadReplayExternalWitnessAdvanceV1({
    witness_jsonl: witness0,
    current_journal_jsonl: journalA1,
    current_high_water_json: highA1.high_water_json,
    identity,
  });
assert.equal(planA1.ok, true);
if (!planA1.ok) throw new Error("witness A1 plan held");
assert.equal(planA1.status, "planned");
assert.equal(planA1.next_event?.sequence, 2);
assert.equal(planA1.next_event?.replay_sequence, 1);
assert.equal(
  planA1.next_event?.high_water_sha256,
  highA1.high_water_sha256,
);
const witnessA1 = Buffer.from(planA1.next_witness_jsonl, "utf8");

const matchedA1 =
  classifyBuyVoidAllocationCustodyWitnessLiveReadReplayExternalWitnessV1({
    witness_jsonl: witnessA1,
    current_journal_jsonl: journalA1,
    current_high_water_json: highA1.high_water_json,
    identity,
  });
assert.equal(matchedA1.ok, true);
if (!matchedA1.ok) throw new Error("A1 match held");
assert.equal(matchedA1.status, "matched");

const consumeA =
  planBuyVoidAllocationCustodyWitnessLiveReadChallengeTerminalV1({
    journal_jsonl: journalA1,
    outcome: "consumed",
    request_id: requestId("a"),
    response_sha256: sha("b"),
    terminal_at_ms: 2_000,
  });
assert.equal(consumeA.ok, true);
if (!consumeA.ok) throw new Error("consume A held");
const journalA2 = consumeA.next_journal_jsonl;
const highA2 = highWater(journalA2);

const planA2 =
  planBuyVoidAllocationCustodyWitnessLiveReadReplayExternalWitnessAdvanceV1({
    witness_jsonl: witnessA1,
    current_journal_jsonl: journalA2,
    current_high_water_json: highA2.high_water_json,
    identity,
  });
assert.equal(planA2.ok, true);
if (!planA2.ok) throw new Error("witness A2 plan held");
assert.equal(planA2.status, "planned");
assert.equal(planA2.next_event?.sequence, 3);
assert.equal(planA2.next_event?.replay_sequence, 2);
const witnessA2 = Buffer.from(planA2.next_witness_jsonl, "utf8");

const matchedA2 =
  classifyBuyVoidAllocationCustodyWitnessLiveReadReplayExternalWitnessV1({
    witness_jsonl: witnessA2,
    current_journal_jsonl: journalA2,
    current_high_water_json: highA2.high_water_json,
    identity,
  });
assert.equal(matchedA2.ok, true);
if (!matchedA2.ok) throw new Error("A2 match held");
assert.equal(matchedA2.status, "matched");

const rollback =
  classifyBuyVoidAllocationCustodyWitnessLiveReadReplayExternalWitnessV1({
    witness_jsonl: witnessA2,
    current_journal_jsonl: journal0,
    current_high_water_json: high0.high_water_json,
    identity,
  });
assert.equal(rollback.ok, false);
if (rollback.ok) throw new Error("rollback unexpectedly green");
assert.equal(
  rollback.reason,
  "witness_replay_external_witness_local_rollback_detected",
);
assert.equal(rollback.rollback_regression_detected, true);

const idempotent =
  planBuyVoidAllocationCustodyWitnessLiveReadReplayExternalWitnessAdvanceV1({
    witness_jsonl: witnessA2,
    current_journal_jsonl: journalA2,
    current_high_water_json: highA2.high_water_json,
    identity,
  });
assert.equal(idempotent.ok, true);
if (!idempotent.ok) throw new Error("idempotent plan held");
assert.equal(idempotent.status, "idempotent");
assert.equal(idempotent.next_event, null);
assert.equal(
  idempotent.next_witness_jsonl,
  witnessA2.toString("utf8"),
);

const issueB =
  planBuyVoidAllocationCustodyWitnessLiveReadChallengeIssueV1({
    journal_jsonl: journal0,
    entropy_sha256: sha("2"),
    issued_at_ms: 1_000,
    expires_at_ms: 39_000,
  });
assert.equal(issueB.ok, true);
if (!issueB.ok) throw new Error("issue B held");
const journalB1 = issueB.next_journal_jsonl;
const consumeB =
  planBuyVoidAllocationCustodyWitnessLiveReadChallengeTerminalV1({
    journal_jsonl: journalB1,
    outcome: "consumed",
    request_id: requestId("c"),
    response_sha256: sha("d"),
    terminal_at_ms: 2_000,
  });
assert.equal(consumeB.ok, true);
if (!consumeB.ok) throw new Error("consume B held");
const journalB2 = consumeB.next_journal_jsonl;
const highB2 = highWater(journalB2);

const mixed =
  classifyBuyVoidAllocationCustodyWitnessLiveReadReplayExternalWitnessV1({
    witness_jsonl: witnessA1,
    current_journal_jsonl: journalB2,
    current_high_water_json: highB2.high_water_json,
    identity,
  });
assert.equal(mixed.ok, false);
if (mixed.ok) throw new Error("mixed history unexpectedly green");
assert.equal(
  mixed.reason,
  "witness_replay_external_witness_local_history_conflict",
);

const catchup1 =
  planBuyVoidAllocationCustodyWitnessLiveReadReplayExternalWitnessAdvanceV1({
    witness_jsonl: witness0,
    current_journal_jsonl: journalA2,
    current_high_water_json: highA2.high_water_json,
    identity,
  });
assert.equal(catchup1.ok, true);
if (!catchup1.ok) throw new Error("catchup1 held");
assert.equal(catchup1.status, "planned");
assert.equal(catchup1.next_event?.replay_sequence, 1);

const catchup2 =
  planBuyVoidAllocationCustodyWitnessLiveReadReplayExternalWitnessAdvanceV1({
    witness_jsonl: catchup1.next_witness_jsonl,
    current_journal_jsonl: journalA2,
    current_high_water_json: highA2.high_water_json,
    identity,
  });
assert.equal(catchup2.ok, true);
if (!catchup2.ok) throw new Error("catchup2 held");
assert.equal(catchup2.status, "planned");
assert.equal(catchup2.next_event?.replay_sequence, 2);
assert.equal(
  Buffer.from(catchup2.next_witness_jsonl, "utf8").equals(witnessA2),
  true,
);

{
  const badIdentity = {
    ...identity,
    witness_root_disk_serial: "DIFFERENT-DISK",
  };
  const held =
    classifyBuyVoidAllocationCustodyWitnessLiveReadReplayExternalWitnessV1({
      witness_jsonl: witnessA2,
      current_journal_jsonl: journalA2,
      current_high_water_json: highA2.high_water_json,
      identity: badIdentity,
    });
  assert.equal(held.ok, false);
  if (held.ok) throw new Error("identity drift unexpectedly green");
  assert.equal(
    held.reason,
    "witness_replay_external_witness_identity_mismatch",
  );
}

{
  const parsed =
    parseBuyVoidAllocationCustodyWitnessLiveReadReplayExternalWitnessJournalV1(
      witnessA1,
    );
  const lines = witnessA1.toString("utf8").trimEnd().split("\n");
  const tampered = JSON.parse(lines[1]);
  tampered.journal_sha256 = sha("f");
  lines[1] = JSON.stringify(tampered);
  const held =
    classifyBuyVoidAllocationCustodyWitnessLiveReadReplayExternalWitnessV1({
      witness_jsonl: lines.join("\n") + "\n",
      current_journal_jsonl: journalA1,
      current_high_water_json: highA1.high_water_json,
      identity,
    });
  assert.equal(held.ok, false);
  if (held.ok) throw new Error("tampered witness unexpectedly green");
  assert.match(
    held.reason,
    /witness_replay_external_witness_event_hash_mismatch|witness_replay_external_witness_line_noncanonical/u,
  );
  assert.equal(parsed.event_count, 2);
}

{
  const truncated = witnessA2.subarray(0, witnessA2.length - 1);
  assert.throws(
    () =>
      parseBuyVoidAllocationCustodyWitnessLiveReadReplayExternalWitnessJournalV1(
        truncated,
      ),
    /witness_replay_external_witness_bytes_invalid/u,
  );
}

for (const key of [
  "external_transport_authenticated",
  "external_witness_storage_proven",
  "live_remote_read_performed",
  "live_remote_append_performed",
  "runtime_integration",
  "live_durable_storage_proven",
  "rollback_resistance_proven",
  "protected_high_water_custody_proven",
  "independent_custody_proven",
  "production_gate_ready",
  "filesystem_read",
  "filesystem_write",
  "network_access",
  "payment_acceptance",
  "wallet_or_signer_access",
  "private_key_access",
  "transaction_construction",
  "transaction_signing",
  "transaction_broadcast",
  "chain2050_write",
  "presale_activation",
  "market_activation",
  "funds_movement",
] as const) {
  assert.equal(
    VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_EXTERNAL_WITNESS_AUTHORITY_V1[
      key
    ],
    false,
    key,
  );
}

for (const key of [
  "source_contract",
  "pure_validation_and_planning",
  "canonical_replay_high_water_required",
  "exact_historical_journal_prefix_rebinding",
  "append_only_hash_chain",
  "one_witness_event_per_replay_sequence",
  "exact_next_sequence_planning",
  "rollback_regression_detection",
  "mixed_history_conflict_rejection",
  "source_storage_identity_invariant",
  "witness_host_identity_invariant",
] as const) {
  assert.equal(
    VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_EXTERNAL_WITNESS_AUTHORITY_V1[
      key
    ],
    true,
    key,
  );
}

assert.equal(
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_EXTERNAL_WITNESS_V1,
  "VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_EXTERNAL_WITNESS_V1",
);

console.log(
  "VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_EXTERNAL_WITNESS_V1_GREEN",
);
console.log("canonical_replay_high_water_required=true");
console.log("exact_historical_prefix_rebinding=true");
console.log("genesis_planning=true");
console.log("one_event_per_replay_sequence=true");
console.log("sequential_catchup=true");
console.log("mixed_history_conflict_rejected=true");
console.log("local_rollback_detected=true");
console.log("identity_drift_rejected=true");
console.log("tampered_witness_rejected=true");
console.log("external_transport_authenticated=false");
console.log("external_witness_storage_proven=false");
console.log("rollback_resistance_proven=false");
console.log("protected_high_water_custody_proven=false");
console.log("production_gate_ready=false");
console.log("funds_movement=false");
