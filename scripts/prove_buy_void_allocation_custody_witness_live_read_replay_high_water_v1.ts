#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";

import {
  planBuyVoidAllocationCustodyWitnessLiveReadChallengeIssueV1,
  planBuyVoidAllocationCustodyWitnessLiveReadChallengeTerminalV1,
} from "../src/economic/buy_void_allocation_custody_witness_live_read_replay_state_v1.js";
import {
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_HIGH_WATER_AUTHORITY_V1,
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_HIGH_WATER_V1,
  classifyBuyVoidAllocationCustodyWitnessLiveReadReplayHighWaterBindingV1,
  deriveBuyVoidAllocationCustodyWitnessLiveReadReplayHighWaterV1,
  planBuyVoidAllocationCustodyWitnessLiveReadReplayHighWaterAdvanceV1,
} from "../src/economic/buy_void_allocation_custody_witness_live_read_replay_high_water_v1.js";

const sha = (hex: string): string =>
  "sha256:" + hex.repeat(64);
const requestId = (hex: string): string =>
  "voidwreq1_" + hex.repeat(64);
const sha256Id = (value: string | Buffer): string =>
  "sha256:" +
  crypto
    .createHash("sha256")
    .update(value)
    .digest("hex");

function requireOk<T extends { ok: boolean; reason?: string }>(
  value: T,
): asserts value is T & { ok: true } {
  if (value.ok !== true) {
    throw new Error(value.reason || "unexpected_hold");
  }
}

function tamperHighWater(
  canonical: string,
  mutate: (value: Record<string, unknown>) => void,
): string {
  const parsed = JSON.parse(canonical) as Record<string, unknown>;
  mutate(parsed);
  return JSON.stringify(parsed) + "\n";
}

const journal0 = "";
const genesis =
  deriveBuyVoidAllocationCustodyWitnessLiveReadReplayHighWaterV1(
    journal0,
  );
assert.equal(genesis.ok, true);
requireOk(genesis);
assert.equal(genesis.status, "derived");
assert.equal(genesis.high_water.sequence, 0);
assert.equal(genesis.high_water.generation, 0);
assert.equal(genesis.high_water.event_count, 0);
assert.equal(genesis.high_water.tip_event_sha256, null);
assert.equal(genesis.high_water.journal_bytes, 0);
assert.equal(
  genesis.high_water.journal_sha256,
  sha256Id(Buffer.alloc(0)),
);
assert.equal(genesis.high_water.pending, false);
assert.equal(genesis.high_water.pending_challenge_sha256, null);
assert.equal(genesis.high_water.pending_challenge_id, null);
assert.equal(genesis.high_water.pending_expires_at_ms, null);
assert.equal(genesis.high_water.last_terminal_state, null);
assert.equal(genesis.high_water.ready_for_issue, true);
assert.equal(
  genesis.high_water_sha256,
  sha256Id(Buffer.from(genesis.high_water_json, "utf8")),
);

const genesisBinding =
  classifyBuyVoidAllocationCustodyWitnessLiveReadReplayHighWaterBindingV1(
    {
      journal_jsonl: journal0,
      high_water_json: genesis.high_water_json,
    },
  );
assert.equal(genesisBinding.ok, true);
requireOk(genesisBinding);
assert.equal(genesisBinding.status, "bound");
assert.equal(
  genesisBinding.rollback_safe_for_presented_authoritative_high_water,
  true,
);

const issue1 =
  planBuyVoidAllocationCustodyWitnessLiveReadChallengeIssueV1({
    journal_jsonl: journal0,
    entropy_sha256: sha("1"),
    issued_at_ms: 1_000,
    expires_at_ms: 39_000,
  });
assert.equal(issue1.ok, true);
requireOk(issue1);

const issued =
  deriveBuyVoidAllocationCustodyWitnessLiveReadReplayHighWaterV1(
    issue1.next_journal_jsonl,
  );
assert.equal(issued.ok, true);
requireOk(issued);
assert.equal(issued.high_water.sequence, 1);
assert.equal(issued.high_water.generation, 1);
assert.equal(issued.high_water.event_count, 1);
assert.equal(
  issued.high_water.tip_event_sha256,
  issue1.event.event_sha256,
);
assert.equal(issued.high_water.pending, true);
assert.equal(
  issued.high_water.pending_challenge_sha256,
  issue1.challenge_sha256,
);
assert.equal(
  issued.high_water.pending_challenge_id,
  issue1.challenge_id,
);
assert.equal(issued.high_water.pending_expires_at_ms, 39_000);
assert.equal(issued.high_water.last_terminal_state, null);
assert.equal(issued.high_water.ready_for_issue, false);

const issueAdvance =
  planBuyVoidAllocationCustodyWitnessLiveReadReplayHighWaterAdvanceV1(
    {
      current_journal_jsonl: journal0,
      current_high_water_json: genesis.high_water_json,
      next_journal_jsonl: issue1.next_journal_jsonl,
    },
  );
assert.equal(issueAdvance.ok, true);
requireOk(issueAdvance);
assert.equal(issueAdvance.status, "planned");
assert.equal(issueAdvance.idempotent, false);
assert.deepEqual(issueAdvance.next_high_water, issued.high_water);
assert.equal(
  issueAdvance.next_high_water_sha256,
  issued.high_water_sha256,
);

const issueIdempotent =
  planBuyVoidAllocationCustodyWitnessLiveReadReplayHighWaterAdvanceV1(
    {
      current_journal_jsonl: issue1.next_journal_jsonl,
      current_high_water_json: issued.high_water_json,
      next_journal_jsonl: issue1.next_journal_jsonl,
    },
  );
assert.equal(issueIdempotent.ok, true);
requireOk(issueIdempotent);
assert.equal(issueIdempotent.status, "idempotent");
assert.equal(issueIdempotent.idempotent, true);

const consume1 =
  planBuyVoidAllocationCustodyWitnessLiveReadChallengeTerminalV1({
    journal_jsonl: issue1.next_journal_jsonl,
    outcome: "consumed",
    request_id: requestId("a"),
    response_sha256: sha("b"),
    terminal_at_ms: 2_000,
  });
assert.equal(consume1.ok, true);
requireOk(consume1);

const consumed =
  deriveBuyVoidAllocationCustodyWitnessLiveReadReplayHighWaterV1(
    consume1.next_journal_jsonl,
  );
assert.equal(consumed.ok, true);
requireOk(consumed);
assert.equal(consumed.high_water.sequence, 2);
assert.equal(consumed.high_water.generation, 1);
assert.equal(consumed.high_water.event_count, 2);
assert.equal(consumed.high_water.pending, false);
assert.equal(consumed.high_water.pending_challenge_sha256, null);
assert.equal(consumed.high_water.pending_challenge_id, null);
assert.equal(consumed.high_water.pending_expires_at_ms, null);
assert.equal(consumed.high_water.last_terminal_state, "consumed");
assert.equal(consumed.high_water.ready_for_issue, true);

const terminalAdvance =
  planBuyVoidAllocationCustodyWitnessLiveReadReplayHighWaterAdvanceV1(
    {
      current_journal_jsonl: issue1.next_journal_jsonl,
      current_high_water_json: issued.high_water_json,
      next_journal_jsonl: consume1.next_journal_jsonl,
    },
  );
assert.equal(terminalAdvance.ok, true);
requireOk(terminalAdvance);
assert.equal(terminalAdvance.status, "planned");
assert.equal(terminalAdvance.idempotent, false);
assert.deepEqual(
  terminalAdvance.next_high_water,
  consumed.high_water,
);

const staleHighWaterOnNewJournal =
  classifyBuyVoidAllocationCustodyWitnessLiveReadReplayHighWaterBindingV1(
    {
      journal_jsonl: consume1.next_journal_jsonl,
      high_water_json: issued.high_water_json,
    },
  );
assert.equal(staleHighWaterOnNewJournal.ok, false);
if (staleHighWaterOnNewJournal.ok) {
  throw new Error("stale high-water unexpectedly bound");
}
assert.equal(
  staleHighWaterOnNewJournal.reason,
  "witness_live_read_replay_high_water_binding_mismatch",
);

const futureHighWaterOnOldJournal =
  classifyBuyVoidAllocationCustodyWitnessLiveReadReplayHighWaterBindingV1(
    {
      journal_jsonl: issue1.next_journal_jsonl,
      high_water_json: consumed.high_water_json,
    },
  );
assert.equal(futureHighWaterOnOldJournal.ok, false);
if (futureHighWaterOnOldJournal.ok) {
  throw new Error("future high-water unexpectedly bound");
}
assert.equal(
  futureHighWaterOnOldJournal.reason,
  "witness_live_read_replay_high_water_binding_mismatch",
);

const rolledBackAdvance =
  planBuyVoidAllocationCustodyWitnessLiveReadReplayHighWaterAdvanceV1(
    {
      current_journal_jsonl: consume1.next_journal_jsonl,
      current_high_water_json: consumed.high_water_json,
      next_journal_jsonl: issue1.next_journal_jsonl,
    },
  );
assert.equal(rolledBackAdvance.ok, false);
if (rolledBackAdvance.ok) {
  throw new Error("journal rollback unexpectedly planned");
}
assert.equal(
  rolledBackAdvance.reason,
  "witness_live_read_replay_high_water_advance_not_exact_append",
);

const alternateIssue =
  planBuyVoidAllocationCustodyWitnessLiveReadChallengeIssueV1({
    journal_jsonl: journal0,
    entropy_sha256: sha("2"),
    issued_at_ms: 1_000,
    expires_at_ms: 39_000,
  });
assert.equal(alternateIssue.ok, true);
requireOk(alternateIssue);

const nonPrefixBranch =
  planBuyVoidAllocationCustodyWitnessLiveReadReplayHighWaterAdvanceV1(
    {
      current_journal_jsonl: issue1.next_journal_jsonl,
      current_high_water_json: issued.high_water_json,
      next_journal_jsonl: alternateIssue.next_journal_jsonl,
    },
  );
assert.equal(nonPrefixBranch.ok, false);
if (nonPrefixBranch.ok) {
  throw new Error("alternate same-generation branch unexpectedly planned");
}
assert.equal(
  nonPrefixBranch.reason,
  "witness_live_read_replay_high_water_advance_not_exact_append",
);

const multiEventJump =
  planBuyVoidAllocationCustodyWitnessLiveReadReplayHighWaterAdvanceV1(
    {
      current_journal_jsonl: journal0,
      current_high_water_json: genesis.high_water_json,
      next_journal_jsonl: consume1.next_journal_jsonl,
    },
  );
assert.equal(multiEventJump.ok, false);
if (multiEventJump.ok) {
  throw new Error("two-event jump unexpectedly planned");
}
assert.equal(
  multiEventJump.reason,
  "witness_live_read_replay_high_water_advance_event_invalid",
);

const tamperedPendingId = tamperHighWater(
  issued.high_water_json,
  (value) => {
    value.pending_challenge_id =
      "voidwlrc1_" + "f".repeat(64);
  },
);
const tamperedPendingBinding =
  classifyBuyVoidAllocationCustodyWitnessLiveReadReplayHighWaterBindingV1(
    {
      journal_jsonl: issue1.next_journal_jsonl,
      high_water_json: tamperedPendingId,
    },
  );
assert.equal(tamperedPendingBinding.ok, false);
if (tamperedPendingBinding.ok) {
  throw new Error("tampered pending challenge unexpectedly bound");
}
assert.equal(
  tamperedPendingBinding.reason,
  "witness_live_read_replay_high_water_binding_mismatch",
);

const tamperedDigest = tamperHighWater(
  issued.high_water_json,
  (value) => {
    value.journal_sha256 = sha("f");
  },
);
const tamperedDigestBinding =
  classifyBuyVoidAllocationCustodyWitnessLiveReadReplayHighWaterBindingV1(
    {
      journal_jsonl: issue1.next_journal_jsonl,
      high_water_json: tamperedDigest,
    },
  );
assert.equal(tamperedDigestBinding.ok, false);
if (tamperedDigestBinding.ok) {
  throw new Error("tampered journal digest unexpectedly bound");
}
assert.equal(
  tamperedDigestBinding.reason,
  "witness_live_read_replay_high_water_binding_mismatch",
);

const inconsistentPending = tamperHighWater(
  issued.high_water_json,
  (value) => {
    value.pending = false;
    value.ready_for_issue = true;
  },
);
const inconsistentPendingBinding =
  classifyBuyVoidAllocationCustodyWitnessLiveReadReplayHighWaterBindingV1(
    {
      journal_jsonl: issue1.next_journal_jsonl,
      high_water_json: inconsistentPending,
    },
  );
assert.equal(inconsistentPendingBinding.ok, false);
if (inconsistentPendingBinding.ok) {
  throw new Error("inconsistent pending fields unexpectedly bound");
}
assert.match(
  inconsistentPendingBinding.reason,
  /witness_live_read_replay_high_water_state_invalid/u,
);

const noncanonicalHighWater =
  issued.high_water_json.replace('{"schema"', '{ "schema"');
const noncanonicalBinding =
  classifyBuyVoidAllocationCustodyWitnessLiveReadReplayHighWaterBindingV1(
    {
      journal_jsonl: issue1.next_journal_jsonl,
      high_water_json: noncanonicalHighWater,
    },
  );
assert.equal(noncanonicalBinding.ok, false);
if (noncanonicalBinding.ok) {
  throw new Error("noncanonical high-water unexpectedly bound");
}
assert.equal(
  noncanonicalBinding.reason,
  "witness_live_read_replay_high_water_serialization_noncanonical",
);

const extraField = tamperHighWater(
  issued.high_water_json,
  (value) => {
    value.extra = true;
  },
);
const extraFieldBinding =
  classifyBuyVoidAllocationCustodyWitnessLiveReadReplayHighWaterBindingV1(
    {
      journal_jsonl: issue1.next_journal_jsonl,
      high_water_json: extraField,
    },
  );
assert.equal(extraFieldBinding.ok, false);
if (extraFieldBinding.ok) {
  throw new Error("extra high-water field unexpectedly accepted");
}
assert.equal(
  extraFieldBinding.reason,
  "witness_live_read_replay_high_water_shape_invalid",
);

const issue2 =
  planBuyVoidAllocationCustodyWitnessLiveReadChallengeIssueV1({
    journal_jsonl: consume1.next_journal_jsonl,
    entropy_sha256: sha("3"),
    issued_at_ms: 40_000,
    expires_at_ms: 78_000,
  });
assert.equal(issue2.ok, true);
requireOk(issue2);
const abandon2 =
  planBuyVoidAllocationCustodyWitnessLiveReadChallengeTerminalV1({
    journal_jsonl: issue2.next_journal_jsonl,
    outcome: "abandoned",
    terminal_at_ms: 78_001,
  });
assert.equal(abandon2.ok, true);
requireOk(abandon2);
const abandoned =
  deriveBuyVoidAllocationCustodyWitnessLiveReadReplayHighWaterV1(
    abandon2.next_journal_jsonl,
  );
assert.equal(abandoned.ok, true);
requireOk(abandoned);
assert.equal(abandoned.high_water.generation, 2);
assert.equal(abandoned.high_water.sequence, 4);
assert.equal(abandoned.high_water.last_terminal_state, "abandoned");
assert.equal(abandoned.high_water.ready_for_issue, true);

assert.equal(
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_HIGH_WATER_AUTHORITY_V1
    .source_contract,
  true,
);
assert.equal(
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_HIGH_WATER_AUTHORITY_V1
    .pure_high_water_binding,
  true,
);
assert.equal(
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_HIGH_WATER_AUTHORITY_V1
    .rollback_detection_with_presented_authoritative_high_water,
  true,
);
assert.equal(
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_HIGH_WATER_AUTHORITY_V1
    .content_addressed_projection,
  true,
);

for (const key of [
  "filesystem_read",
  "filesystem_write",
  "high_water_write",
  "replay_journal_write",
  "durable_persistence_proven",
  "rollback_resistance_proven",
  "protected_high_water_custody_proven",
  "independent_custody_proven",
  "trusted_verification_clock_proven",
  "challenge_entropy_proven",
  "challenge_unpredictability_proven",
  "live_evidence_origin_proven",
  "external_transport_authenticated",
  "external_witness_storage_proven",
  "live_remote_read_performed",
  "runtime_integration",
  "production_gate_ready",
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
    VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_HIGH_WATER_AUTHORITY_V1[
      key
    ],
    false,
    key + " must remain false",
  );
}

assert.equal(
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_HIGH_WATER_V1,
  "VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_HIGH_WATER_V1",
);

console.log(
  "VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_HIGH_WATER_V1_GREEN",
);
console.log("genesis_projection_bound=true");
console.log("journal_sha256_and_bytes_bound=true");
console.log("sequence_generation_tip_bound=true");
console.log("pending_challenge_identity_bound=true");
console.log("terminal_state_bound=true");
console.log("single_event_issue_advance=true");
console.log("single_event_terminal_advance=true");
console.log("exact_idempotence=true");
console.log("stale_high_water_rejected=true");
console.log("journal_rollback_rejected=true");
console.log("alternate_same_generation_branch_rejected=true");
console.log("multi_event_jump_rejected=true");
console.log("pending_identity_tamper_rejected=true");
console.log("noncanonical_high_water_rejected=true");
console.log("rollback_resistance_proven=false");
console.log("protected_high_water_custody_proven=false");
console.log("durable_persistence_proven=false");
console.log("runtime_integration=false");
console.log("production_gate_ready=false");
console.log("funds_movement=false");
