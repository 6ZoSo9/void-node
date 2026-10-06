#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";

import {
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_AUTHORITY_V1,
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_STATE_V1,
  classifyBuyVoidAllocationCustodyWitnessLiveReadReplayStateV1,
  planBuyVoidAllocationCustodyWitnessLiveReadChallengeIssueV1,
  planBuyVoidAllocationCustodyWitnessLiveReadChallengeTerminalV1,
} from "../src/economic/buy_void_allocation_custody_witness_live_read_replay_state_v1.js";

const sha = (hex: string): string =>
  "sha256:" + hex.repeat(64);

const requestId = (hex: string): string =>
  "voidwreq1_" + hex.repeat(64);

const journal0 = "";
const state0 =
  classifyBuyVoidAllocationCustodyWitnessLiveReadReplayStateV1(
    journal0,
  );
assert.equal(state0.ok, true);
if (!state0.ok) throw new Error("genesis replay state held");
assert.equal(state0.status, "idle");
assert.equal(state0.generation, 0);
assert.equal(state0.sequence, 0);
assert.equal(state0.pending, false);
assert.equal(state0.ready_for_issue, true);
assert.equal(
  state0.journal_sha256,
  "sha256:" +
    crypto.createHash("sha256").update(Buffer.alloc(0)).digest("hex"),
);

const issue1 =
  planBuyVoidAllocationCustodyWitnessLiveReadChallengeIssueV1({
    journal_jsonl: journal0,
    entropy_sha256: sha("1"),
    issued_at_ms: 1_000,
    expires_at_ms: 39_000,
  });
assert.equal(issue1.ok, true);
if (!issue1.ok) throw new Error("challenge issue 1 held");
assert.equal(issue1.status, "challenge_issue_planned");
assert.equal(issue1.generation, 1);
assert.match(issue1.challenge_sha256, /^sha256:[0-9a-f]{64}$/u);
assert.match(issue1.challenge_id, /^voidwlrc1_[0-9a-f]{64}$/u);
assert.equal(issue1.event.state, "issued");
assert.equal(issue1.event.sequence, 1);
assert.equal(issue1.event.previous_event_sha256, null);
assert.equal(issue1.event.request_id, null);
assert.equal(issue1.event.response_sha256, null);
assert.equal(issue1.event.terminal_at_ms, null);

const stateIssued1 =
  classifyBuyVoidAllocationCustodyWitnessLiveReadReplayStateV1(
    issue1.next_journal_jsonl,
  );
assert.equal(stateIssued1.ok, true);
if (!stateIssued1.ok) throw new Error("issued replay state held");
assert.equal(stateIssued1.status, "challenge_pending");
assert.equal(stateIssued1.generation, 1);
assert.equal(
  stateIssued1.pending_challenge_sha256,
  issue1.challenge_sha256,
);
assert.equal(stateIssued1.ready_for_issue, false);

const duplicateIssue =
  planBuyVoidAllocationCustodyWitnessLiveReadChallengeIssueV1({
    journal_jsonl: issue1.next_journal_jsonl,
    entropy_sha256: sha("2"),
    issued_at_ms: 2_000,
    expires_at_ms: 40_000,
  });
assert.equal(duplicateIssue.ok, false);
if (duplicateIssue.ok) throw new Error("duplicate issue unexpectedly green");
assert.equal(
  duplicateIssue.reason,
  "witness_live_read_replay_challenge_already_pending",
);

const consume1 =
  planBuyVoidAllocationCustodyWitnessLiveReadChallengeTerminalV1({
    journal_jsonl: issue1.next_journal_jsonl,
    outcome: "consumed",
    request_id: requestId("a"),
    response_sha256: sha("b"),
    terminal_at_ms: 2_000,
  });
assert.equal(consume1.ok, true);
if (!consume1.ok) throw new Error("consume 1 held");
assert.equal(consume1.status, "challenge_consumption_planned");
assert.equal(consume1.generation, 1);
assert.equal(consume1.challenge_sha256, issue1.challenge_sha256);
assert.equal(consume1.event.state, "consumed");
assert.equal(consume1.event.sequence, 2);
assert.equal(
  consume1.event.previous_event_sha256,
  issue1.event.event_sha256,
);

const stateConsumed1 =
  classifyBuyVoidAllocationCustodyWitnessLiveReadReplayStateV1(
    consume1.next_journal_jsonl,
  );
assert.equal(stateConsumed1.ok, true);
if (!stateConsumed1.ok) throw new Error("consumed replay state held");
assert.equal(stateConsumed1.status, "idle");
assert.equal(stateConsumed1.generation, 1);
assert.equal(stateConsumed1.last_terminal_state, "consumed");
assert.equal(stateConsumed1.ready_for_issue, true);

const replayConsume =
  planBuyVoidAllocationCustodyWitnessLiveReadChallengeTerminalV1({
    journal_jsonl: consume1.next_journal_jsonl,
    outcome: "consumed",
    request_id: requestId("a"),
    response_sha256: sha("b"),
    terminal_at_ms: 2_001,
  });
assert.equal(replayConsume.ok, false);
if (replayConsume.ok) throw new Error("replay consume unexpectedly green");
assert.equal(
  replayConsume.reason,
  "witness_live_read_replay_no_pending_challenge",
);

const issue2 =
  planBuyVoidAllocationCustodyWitnessLiveReadChallengeIssueV1({
    journal_jsonl: consume1.next_journal_jsonl,
    entropy_sha256: sha("1"),
    issued_at_ms: 40_000,
    expires_at_ms: 78_000,
  });
assert.equal(issue2.ok, true);
if (!issue2.ok) throw new Error("challenge issue 2 held");
assert.equal(issue2.generation, 2);
assert.notEqual(
  issue2.challenge_sha256,
  issue1.challenge_sha256,
  "same entropy must not reproduce a challenge across generations",
);
assert.notEqual(issue2.challenge_id, issue1.challenge_id);

const lateConsume =
  planBuyVoidAllocationCustodyWitnessLiveReadChallengeTerminalV1({
    journal_jsonl: issue2.next_journal_jsonl,
    outcome: "consumed",
    request_id: requestId("c"),
    response_sha256: sha("d"),
    terminal_at_ms: 78_001,
  });
assert.equal(lateConsume.ok, false);
if (lateConsume.ok) throw new Error("expired consume unexpectedly green");
assert.equal(
  lateConsume.reason,
  "witness_live_read_replay_consume_after_expiry",
);

const abandon2 =
  planBuyVoidAllocationCustodyWitnessLiveReadChallengeTerminalV1({
    journal_jsonl: issue2.next_journal_jsonl,
    outcome: "abandoned",
    terminal_at_ms: 78_001,
  });
assert.equal(abandon2.ok, true);
if (!abandon2.ok) throw new Error("abandon 2 held");
assert.equal(abandon2.status, "challenge_abandonment_planned");
assert.equal(abandon2.event.request_id, null);
assert.equal(abandon2.event.response_sha256, null);
assert.equal(abandon2.event.state, "abandoned");

const issue3 =
  planBuyVoidAllocationCustodyWitnessLiveReadChallengeIssueV1({
    journal_jsonl: abandon2.next_journal_jsonl,
    entropy_sha256: sha("1"),
    issued_at_ms: 80_000,
    expires_at_ms: 118_000,
  });
assert.equal(issue3.ok, true);
if (!issue3.ok) throw new Error("challenge issue 3 held");
assert.equal(issue3.generation, 3);
assert.notEqual(issue3.challenge_sha256, issue2.challenge_sha256);
assert.notEqual(issue3.challenge_sha256, issue1.challenge_sha256);

const timeRegression =
  planBuyVoidAllocationCustodyWitnessLiveReadChallengeIssueV1({
    journal_jsonl: abandon2.next_journal_jsonl,
    entropy_sha256: sha("2"),
    issued_at_ms: 78_000,
    expires_at_ms: 116_000,
  });
assert.equal(timeRegression.ok, false);
if (timeRegression.ok) throw new Error("time regression unexpectedly green");
assert.equal(
  timeRegression.reason,
  "witness_live_read_replay_time_regression",
);

const tooLongTtl =
  planBuyVoidAllocationCustodyWitnessLiveReadChallengeIssueV1({
    journal_jsonl: abandon2.next_journal_jsonl,
    entropy_sha256: sha("2"),
    issued_at_ms: 80_000,
    expires_at_ms: 118_001,
  });
assert.equal(tooLongTtl.ok, false);
if (tooLongTtl.ok) throw new Error("oversized TTL unexpectedly green");
assert.equal(tooLongTtl.reason, "witness_live_read_replay_ttl_invalid");

const badRequest =
  planBuyVoidAllocationCustodyWitnessLiveReadChallengeTerminalV1({
    journal_jsonl: issue3.next_journal_jsonl,
    outcome: "consumed",
    request_id: "voidwreq1_invalid",
    response_sha256: sha("e"),
    terminal_at_ms: 81_000,
  });
assert.equal(badRequest.ok, false);
if (badRequest.ok) throw new Error("bad request id unexpectedly green");
assert.equal(
  badRequest.reason,
  "witness_live_read_replay_request_id_invalid",
);

const abandonPayload =
  planBuyVoidAllocationCustodyWitnessLiveReadChallengeTerminalV1({
    journal_jsonl: issue3.next_journal_jsonl,
    outcome: "abandoned",
    request_id: requestId("f"),
    terminal_at_ms: 81_000,
  });
assert.equal(abandonPayload.ok, false);
if (abandonPayload.ok) throw new Error("abandon payload unexpectedly green");
assert.equal(
  abandonPayload.reason,
  "witness_live_read_replay_abandon_payload_invalid",
);

const noncanonicalJournal = " " + issue1.event_jsonl_line;
const noncanonicalState =
  classifyBuyVoidAllocationCustodyWitnessLiveReadReplayStateV1(
    noncanonicalJournal,
  );
assert.equal(noncanonicalState.ok, false);
if (noncanonicalState.ok) {
  throw new Error("noncanonical journal bytes unexpectedly green");
}
assert.equal(
  noncanonicalState.reason,
  "witness_live_read_replay_event_serialization_invalid",
);

const tamperedDigestObject = JSON.parse(
  issue1.event_jsonl_line,
) as Record<string, unknown>;
tamperedDigestObject.event_sha256 = sha("f");
const tamperedDigestJournal =
  JSON.stringify(tamperedDigestObject) + "\n";
const tamperedDigestState =
  classifyBuyVoidAllocationCustodyWitnessLiveReadReplayStateV1(
    tamperedDigestJournal,
  );
assert.equal(tamperedDigestState.ok, false);
if (tamperedDigestState.ok) {
  throw new Error("tampered event digest unexpectedly green");
}
assert.equal(
  tamperedDigestState.reason,
  "witness_live_read_replay_event_digest_invalid",
);

const noFinalNewline =
  issue1.next_journal_jsonl.slice(0, -1);
const noNewlineState =
  classifyBuyVoidAllocationCustodyWitnessLiveReadReplayStateV1(
    noFinalNewline,
  );
assert.equal(noNewlineState.ok, false);
if (noNewlineState.ok) throw new Error("missing newline unexpectedly green");
assert.equal(
  noNewlineState.reason,
  "witness_live_read_replay_journal_newline_invalid",
);

const repeatedA =
  classifyBuyVoidAllocationCustodyWitnessLiveReadReplayStateV1(
    abandon2.next_journal_jsonl,
  );
const repeatedB =
  classifyBuyVoidAllocationCustodyWitnessLiveReadReplayStateV1(
    abandon2.next_journal_jsonl,
  );
assert.deepEqual(repeatedA, repeatedB);

assert.equal(
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_AUTHORITY_V1
    .source_contract,
  true,
);
assert.equal(
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_AUTHORITY_V1
    .challenge_generation_binding_proven,
  true,
);
assert.equal(
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_AUTHORITY_V1
    .single_use_terminal_transition_required,
  true,
);

for (const key of [
  "durable_persistence_proven",
  "rollback_resistance_proven",
  "protected_high_water_custody_proven",
  "trusted_verification_clock_proven",
  "challenge_entropy_proven",
  "challenge_unpredictability_proven",
  "live_evidence_origin_proven",
  "live_sshd_connection_context_proven",
  "external_transport_authenticated",
  "external_witness_storage_proven",
  "live_remote_read_performed",
  "runtime_integration",
  "independent_custody_proven",
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
    VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_AUTHORITY_V1[
      key
    ],
    false,
    key + " must remain false",
  );
}

assert.equal(
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_STATE_V1,
  "VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_STATE_V1",
);

console.log("VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_STATE_V1_GREEN");
console.log("generation_zero_genesis=true");
console.log("single_pending_challenge=true");
console.log("exact_generation_increment=true");
console.log("same_entropy_cross_generation_challenge_differs=true");
console.log("consumed_challenge_replay_rejected=true");
console.log("expired_consume_rejected=true");
console.log("abandon_then_advance=true");
console.log("time_regression_rejected=true");
console.log("ttl_bound_ms=38000");
console.log("canonical_jsonl_required=true");
console.log("event_chain_content_addressed=true");
console.log("durable_persistence_proven=false");
console.log("rollback_resistance_proven=false");
console.log("trusted_verification_clock_proven=false");
console.log("challenge_unpredictability_proven=false");
console.log("live_remote_read_performed=false");
console.log("production_gate_ready=false");
console.log("funds_movement=false");
